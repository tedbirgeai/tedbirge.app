//! TEDBİRGE OS — YEREL KABUK (FAZ 3/4)
//! -----------------------------------------------------------------
//! 2. Kol: aynı çekirdek, tarayıcı olmadan. Bu ikili dosya
//!   * çekirdeğin HAL sözleşmesini (Clock / Rng / Transport) işletim
//!     sistemi sürücüleriyle doldurur,
//!   * WebOS kabuğunun `dist/` çıktısını yerel bir HTTP soketinden
//!     sunar (kiosk tarayıcı ya da gömülü görüntüleyici bu adresi açar),
//!   * UDP yayınıyla yerel ağdaki diğer düğümleri duyurur.
//!
//! Hiçbir harici crate kullanılmaz: çıplak ISO içinde yalnız libc ve
//! Rust standart kütüphanesi bulunur.

use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, UdpSocket};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tedbirge_hal_linux::serial::SerialTransport;
use tedbirge_hal_linux::storage::{block_devices, NativeStorage};
use tedbirge_hal_linux::{probe, HalReport};
use tedbirge_kernel::hal::{Clock, Platform, Rng, Transport, XorShiftRng};

/* ------------------------- HAL sürücüleri ------------------------- */

/// Monotonik saat — işletim sisteminin tek yönlü sayacı.
struct SystemClock {
    origin: Instant,
}

impl SystemClock {
    fn new() -> Self {
        Self {
            origin: Instant::now(),
        }
    }
}

impl Clock for SystemClock {
    fn now_ms(&self) -> u64 {
        self.origin.elapsed().as_millis() as u64
    }
}

/// Yerel ağ taşıyıcısı — UDP yayını (LoRa/radyo sürücüsü aynı trait'i doldurur).
struct UdpTransport {
    socket: UdpSocket,
    port: u16,
    sent: Arc<AtomicU64>,
    recv: Arc<AtomicU64>,
}

impl UdpTransport {
    fn bind(port: u16) -> std::io::Result<Self> {
        let socket = UdpSocket::bind(("0.0.0.0", port))?;
        socket.set_broadcast(true)?;
        socket.set_read_timeout(Some(Duration::from_millis(200)))?;
        Ok(Self {
            socket,
            port,
            sent: Arc::new(AtomicU64::new(0)),
            recv: Arc::new(AtomicU64::new(0)),
        })
    }
}

impl Transport for UdpTransport {
    fn send(&mut self, _peer: u32, frame: &[u8]) -> usize {
        match self.socket.send_to(frame, ("255.255.255.255", self.port)) {
            Ok(n) => {
                self.sent.fetch_add(n as u64, Ordering::Relaxed);
                n
            }
            Err(_) => 0,
        }
    }

    fn poll(&mut self, out: &mut [u8]) -> usize {
        match self.socket.recv_from(out) {
            Ok((n, _)) => {
                self.recv.fetch_add(n as u64, Ordering::Relaxed);
                n
            }
            Err(_) => 0,
        }
    }
}

fn seed_from_clock() -> u32 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() ^ d.as_secs() as u32)
        .unwrap_or(0x2545_F491)
}

/* ------------- FAZ 6 — çift taşıyıcı (UDP + seri/LoRa) ------------- */

/// Yerel ağ yoksa aynı çerçeveler seri/LoRa hattından gider. Çekirdek
/// hangi taşıyıcının çalıştığını bilmez; yalnız `Transport` görür.
enum Link {
    Udp(UdpTransport),
    Serial(SerialTransport),
}

impl Link {
    fn open(mesh_port: u16, prefer_serial: bool) -> std::io::Result<(Link, &'static str)> {
        if prefer_serial {
            let serial = SerialTransport::autodetect();
            if serial.available() {
                return Ok((Link::Serial(serial), "serial"));
            }
        }
        match UdpTransport::bind(mesh_port) {
            Ok(udp) => Ok((Link::Udp(udp), "udp")),
            Err(e) => {
                let serial = SerialTransport::autodetect();
                if serial.available() {
                    Ok((Link::Serial(serial), "serial"))
                } else {
                    Err(e)
                }
            }
        }
    }

    /// UDP kolunun paylaşılan sayaçları (seri kolda yoktur).
    fn counters(&self) -> Option<(Arc<AtomicU64>, Arc<AtomicU64>)> {
        match self {
            Link::Udp(u) => Some((u.sent.clone(), u.recv.clone())),
            Link::Serial(_) => None,
        }
    }
}

impl Transport for Link {
    fn send(&mut self, peer: u32, frame: &[u8]) -> usize {
        match self {
            Link::Udp(u) => u.send(peer, frame),
            Link::Serial(s) => s.send(peer, frame),
        }
    }

    fn poll(&mut self, out: &mut [u8]) -> usize {
        match self {
            Link::Udp(u) => u.poll(out),
            Link::Serial(s) => s.poll(out),
        }
    }
}


/* --------------------------- Kabuk sunucusu ------------------------ */

fn mime_for(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("js") | Some("mjs") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("webmanifest") => "application/manifest+json; charset=utf-8",
        Some("wasm") => "application/wasm",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("woff2") => "font/woff2",
        _ => "application/octet-stream",
    }
}

/// `..` ve mutlak yol kaçışlarını engelleyerek istek yolunu kök altına indirger.
fn safe_join(root: &Path, request: &str) -> Option<PathBuf> {
    let trimmed = request.split('?').next().unwrap_or("/").trim_start_matches('/');
    let mut out = root.to_path_buf();
    for part in Path::new(trimmed).components() {
        match part {
            Component::Normal(p) => out.push(p),
            Component::CurDir => {}
            _ => return None,
        }
    }
    Some(out)
}

fn respond(stream: &mut TcpStream, status: &str, mime: &str, body: &[u8]) {
    let head = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {mime}\r\nContent-Length: {}\r\nCross-Origin-Opener-Policy: same-origin\r\nCross-Origin-Embedder-Policy: credentialless\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(body);
    let _ = stream.flush();
}

fn serve(stream: &mut TcpStream, root: &Path) {
    let mut buf = [0u8; 2048];
    let Ok(n) = stream.read(&mut buf) else { return };
    let head = String::from_utf8_lossy(&buf[..n]);
    let mut parts = head.split_whitespace();
    let method = parts.next().unwrap_or("GET");
    let target = parts.next().unwrap_or("/");
    if method != "GET" && method != "HEAD" {
        respond(stream, "405 Method Not Allowed", "text/plain", b"only GET");
        return;
    }

    let Some(mut path) = safe_join(root, target) else {
        respond(stream, "400 Bad Request", "text/plain", b"bad path");
        return;
    };
    if path.is_dir() {
        path.push("index.html");
    }
    // Tek sayfa kabuğu: bilinmeyen rotalar index.html'e düşer (çevrimdışı davranış web ile aynı).
    if !path.is_file() {
        path = root.join("index.html");
    }
    match fs::read(&path) {
        Ok(body) => respond(stream, "200 OK", mime_for(&path), &body),
        Err(_) => respond(
            stream,
            "404 Not Found",
            "text/plain; charset=utf-8",
            b"Kabuk paketi bulunamadi (dist/).",
        ),
    }
}

/* ------------------------------ Giris ------------------------------ */

fn arg_map() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut args = env::args().skip(1);
    while let Some(a) = args.next() {
        if let Some(key) = a.strip_prefix("--") {
            if let Some((k, v)) = key.split_once('=') {
                map.insert(k.to_string(), v.to_string());
            } else {
                map.insert(key.to_string(), args.next().unwrap_or_default());
            }
        }
    }
    map
}

/* ------------------- FAZ 10 — kaynak profilleri --------------------- */

/// Düğümün çalıştığı donanım sınıfı. Bellek ve duyuru sıklığı buradan
/// türetilir; 64 MB'lık bir SBC ile sunucu aynı ikiliyi çalıştırır.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Profile {
    /// ≤ 128 MB RAM — seyrek duyuru, küçük tampon.
    Tiny,
    /// 128 MB – 1 GB — SBC / kiosk.
    Sbc,
    /// > 1 GB — masaüstü ve sunucu.
    Server,
}

impl Profile {
    fn from_name(name: &str) -> Option<Profile> {
        match name {
            "tiny" => Some(Profile::Tiny),
            "sbc" => Some(Profile::Sbc),
            "server" => Some(Profile::Server),
            _ => None,
        }
    }

    /// `/proc/meminfo` MemTotal (kB) → profil.
    fn from_mem_kb(total_kb: u64) -> Profile {
        match total_kb {
            0..=131_072 => Profile::Tiny,
            131_073..=1_048_576 => Profile::Sbc,
            _ => Profile::Server,
        }
    }

    fn detect() -> Profile {
        let kb = fs::read_to_string("/proc/meminfo")
            .ok()
            .and_then(|s| {
                s.lines()
                    .find(|l| l.starts_with("MemTotal:"))?
                    .split_whitespace()
                    .nth(1)?
                    .parse::<u64>()
                    .ok()
            })
            .unwrap_or(2_097_152);
        Profile::from_mem_kb(kb)
    }

    fn beacon_ms(self) -> u64 {
        match self {
            Profile::Tiny => 5_000,
            Profile::Sbc => 2_000,
            Profile::Server => 1_000,
        }
    }

    fn frame_bytes(self) -> usize {
        match self {
            Profile::Tiny => 512,
            Profile::Sbc => 1_500,
            Profile::Server => 8_192,
        }
    }

    fn name(self) -> &'static str {
        match self {
            Profile::Tiny => "tiny",
            Profile::Sbc => "sbc",
            Profile::Server => "server",
        }
    }
}

/// Telemetri anlık görüntüsü — `<state>/telemetry.json` olarak yazılır.
fn telemetry_json(node_id: u32, profile: Profile, headless: bool, sent: u64, recv: u64, up_s: u64) -> String {
    format!(
        "{{\"node\":\"{node_id:08x}\",\"profile\":\"{}\",\"headless\":{},\"sent\":{sent},\"received\":{recv},\"uptime_s\":{up_s}}}",
        profile.name(),
        headless
    )
}

fn main() -> std::io::Result<()> {
    let args = arg_map();
    let root = PathBuf::from(args.get("root").cloned().unwrap_or_else(|| "dist".into()));
    let http_port: u16 = args
        .get("port")
        .and_then(|p| p.parse().ok())
        .unwrap_or(8377);
    let mesh_port: u16 = args
        .get("mesh-port")
        .and_then(|p| p.parse().ok())
        .unwrap_or(7946);
    // FAZ 10: görüntüleyici beklemeden röle olarak çalışma.
    let headless = args.contains_key("headless")
        || std::env::var("TEDBIRGE_MODE").as_deref() == Ok("headless");
    let state = PathBuf::from(args.get("state").cloned().unwrap_or_else(|| "/var/tedbirge".into()));
    let profile = args
        .get("profile")
        .and_then(|p| Profile::from_name(p))
        .unwrap_or_else(Profile::detect);

    let clock = SystemClock::new();
    let rng = XorShiftRng(seed_from_clock());
    let transport = UdpTransport::bind(mesh_port)?;
    let sent = transport.sent.clone();
    let recv = transport.recv.clone();
    let mut platform = Platform::new(clock, rng, transport);

    let node_id = platform.rng.next_u32();
    println!(
        "Tedbirge yerel kabuk · dugum {:08x} · ABI {} · profil {} · {} · kabuk http://127.0.0.1:{} · mesh udp/{}",
        node_id,
        tedbirge_kernel::abi_version(),
        profile.name(),
        if headless { "bassiz role" } else { "kiosk" },
        http_port,
        mesh_port
    );

    // Duyuru/dinleme dongusu — cekirdek HAL'i uzerinden.
    let beacon_ms = profile.beacon_ms();
    let frame_bytes = profile.frame_bytes();
    thread::spawn(move || {
        let mut frame = vec![0u8; frame_bytes];
        let mut beat: u32 = 0;
        loop {
            beat = beat.wrapping_add(1);
            let mut hello = Vec::with_capacity(12);
            hello.extend_from_slice(b"TBG1");
            hello.extend_from_slice(&node_id.to_le_bytes());
            hello.extend_from_slice(&beat.to_le_bytes());
            platform.transport.send(0, &hello);
            let read = platform.transport.poll(&mut frame);
            if read >= 8 && &frame[..4] == b"TBG1" {
                let peer = u32::from_le_bytes([frame[4], frame[5], frame[6], frame[7]]);
                if peer != node_id {
                    println!(
                        "es {:08x} · t={}ms · atlama={}",
                        peer,
                        platform.clock.now_ms(),
                        tedbirge_kernel::route_hops(peer)
                    );
                }
            }
            thread::sleep(Duration::from_millis(beacon_ms));
        }
    });

    // Sayaç raporu + telemetri dosyası (yerel tanılama; ağa hiçbir şey gitmez).
    let state_dir = state.clone();
    thread::spawn(move || {
        let _ = fs::create_dir_all(&state_dir);
        let start = Instant::now();
        loop {
            thread::sleep(Duration::from_secs(30));
            let (s, r) = (sent.load(Ordering::Relaxed), recv.load(Ordering::Relaxed));
            println!("tasima · gonderilen {s} bayt · alinan {r} bayt");
            let _ = fs::write(
                state_dir.join("telemetry.json"),
                telemetry_json(node_id, profile, headless, s, r, start.elapsed().as_secs()),
            );
        }
    });

    let listener = TcpListener::bind(("0.0.0.0", http_port))?;
    for stream in listener.incoming() {
        let Ok(mut stream) = stream else { continue };
        let root = root.clone();
        thread::spawn(move || serve(&mut stream, &root));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn profile_follows_available_memory() {
        assert_eq!(Profile::from_mem_kb(65_536), Profile::Tiny);
        assert_eq!(Profile::from_mem_kb(524_288), Profile::Sbc);
        assert_eq!(Profile::from_mem_kb(8_388_608), Profile::Server);
        assert!(Profile::Tiny.beacon_ms() > Profile::Server.beacon_ms());
        assert!(Profile::Tiny.frame_bytes() < Profile::Server.frame_bytes());
    }

    #[test]
    fn telemetry_is_valid_json_shape() {
        let j = telemetry_json(0x0000_00ff, Profile::Sbc, true, 10, 20, 30);
        assert!(j.starts_with('{') && j.ends_with('}'));
        assert!(j.contains("\"node\":\"000000ff\""));
        assert!(j.contains("\"profile\":\"sbc\""));
        assert!(j.contains("\"headless\":true"));
        assert!(j.contains("\"uptime_s\":30"));
    }

    #[test]
    fn path_traversal_is_blocked() {
        let root = Path::new("/opt/tedbirge/dist");
        assert!(safe_join(root, "/../../etc/passwd").is_none());
        assert_eq!(
            safe_join(root, "/kernel/tedbirge_kernel.wasm").unwrap(),
            root.join("kernel/tedbirge_kernel.wasm")
        );
    }
}

