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

    let clock = SystemClock::new();
    let rng = XorShiftRng(seed_from_clock());
    let transport = UdpTransport::bind(mesh_port)?;
    let sent = transport.sent.clone();
    let recv = transport.recv.clone();
    let mut platform = Platform::new(clock, rng, transport);

    let node_id = platform.rng.next_u32();
    println!(
        "Tedbirge yerel kabuk · dugum {:08x} · ABI {} · kabuk http://127.0.0.1:{} · mesh udp/{}",
        node_id,
        tedbirge_kernel::abi_version(),
        http_port,
        mesh_port
    );

    // Duyuru/dinleme dongusu — cekirdek HAL'i uzerinden.
    thread::spawn(move || {
        let mut frame = [0u8; 1500];
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
            thread::sleep(Duration::from_millis(1000));
        }
    });

    // Sayaç raporu (tanılama).
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(30));
        println!(
            "tasima · gonderilen {} bayt · alinan {} bayt",
            sent.load(Ordering::Relaxed),
            recv.load(Ordering::Relaxed)
        );
    });

    let listener = TcpListener::bind(("0.0.0.0", http_port))?;
    for stream in listener.incoming() {
        let Ok(mut stream) = stream else { continue };
        let root = root.clone();
        thread::spawn(move || serve(&mut stream, &root));
    }
    Ok(())
}
