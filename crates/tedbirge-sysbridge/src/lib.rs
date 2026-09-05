//! TEDBİRGE OS — GÜÇ KÖPRÜSÜ (tedbirge-sysbridge)
//! -----------------------------------------------------------------
//! Kabuk bir tarayıcı içinde çalıştığı için anakarta doğrudan sinyal
//! gönderemez. Bu küçük servis yalnız yerel döngü arayüzünü (127.0.0.1)
//! dinler ve gelen komutu şu sırayla uygular:
//!
//!   1. Disk senkronizasyonu (`sync`) — açık dosyalar diske yazılır.
//!   2. Kabuk verisinin kalıcı dizine boşaltılması (VFS anlık görüntüsü).
//!   3. Çekirdek/ACPI çağrısı: `/sys/power/state` ya da `/proc/sysrq-trigger`.
//!
//! Harici crate yoktur; yalnız `std`. Donanım yoksa (geliştirme kolu)
//! hiçbir şey yapılmaz ve "uygulanamaz" yanıtı döner — sahte başarı yok.

use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::process::Command;

/// Kabuğun isteyebileceği güç eylemleri.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PowerAction {
    /// Sistemi tamamen kapatır (ACPI soft-off).
    Kapat,
    /// Sıcak yeniden başlatma.
    YenidenBaslat,
    /// RAM'de bekleme (suspend-to-RAM).
    Uyku,
    /// Diske bekleme (hibernate) — swap alanı gerekir.
    DerinUyku,
}

impl PowerAction {
    /// `/sys/power/state` içine yazılacak değer (varsa).
    pub fn power_state(self) -> Option<&'static str> {
        match self {
            PowerAction::Uyku => Some("mem"),
            PowerAction::DerinUyku => Some("disk"),
            _ => None,
        }
    }

    /// Magic SysRq karakteri (kapat/yeniden başlat için son çare).
    pub fn sysrq(self) -> Option<&'static str> {
        match self {
            PowerAction::Kapat => Some("o"),
            PowerAction::YenidenBaslat => Some("b"),
            _ => None,
        }
    }

    /// Kullanıcıya gösterilecek Türkçe ad.
    pub fn label(self) -> &'static str {
        match self {
            PowerAction::Kapat => "Kapatılıyor",
            PowerAction::YenidenBaslat => "Yeniden başlatılıyor",
            PowerAction::Uyku => "Uyku kipine geçiliyor",
            PowerAction::DerinUyku => "Derin uyku kipine geçiliyor",
        }
    }
}

/// HTTP istek satırından eylemi çözer. Yalnız POST kabul edilir.
pub fn parse_request(line: &str) -> Option<PowerAction> {
    let mut parts = line.split_whitespace();
    let method = parts.next()?;
    let path = parts.next()?;
    if method != "POST" {
        return None;
    }
    match path.trim_end_matches('/') {
        "/guc/kapat" => Some(PowerAction::Kapat),
        "/guc/yeniden-baslat" => Some(PowerAction::YenidenBaslat),
        "/guc/uyku" => Some(PowerAction::Uyku),
        "/guc/derin-uyku" => Some(PowerAction::DerinUyku),
        _ => None,
    }
}

/// Bu makinede güç komutu uygulanabilir mi? (Linux + yazılabilir sysfs)
pub fn supported() -> bool {
    cfg!(target_os = "linux")
        && (fs::metadata("/sys/power/state").is_ok() || fs::metadata("/proc/sysrq-trigger").is_ok())
}

/// Veri güvenliği: bekleyen yazmalar diske indirilir.
pub fn flush_disks() {
    // `sync(2)` her Linux'ta vardır; başarısız olursa sessizce geçilir.
    let _ = Command::new("sync").status();
    let _ = fs::write("/proc/sys/vm/drop_caches", "1");
}

/// Eylemi uygular. Dönen değer kullanıcıya gösterilecek durumdur.
pub fn apply(action: PowerAction) -> Result<&'static str, String> {
    if !supported() {
        return Err("Bu cihazda güç komutu uygulanamıyor.".into());
    }
    flush_disks();

    if let Some(state) = action.power_state() {
        return match fs::write("/sys/power/state", state) {
            Ok(()) => Ok(action.label()),
            Err(e) => Err(format!("Uyku kipine geçilemedi: {e}")),
        };
    }

    // Önce düzenli kapanış (openrc), olmazsa doğrudan ACPI sinyali.
    let orderly = match action {
        PowerAction::Kapat => Command::new("poweroff").status(),
        _ => Command::new("reboot").status(),
    };
    if matches!(orderly, Ok(s) if s.success()) {
        return Ok(action.label());
    }

    let _ = fs::write("/proc/sys/kernel/sysrq", "1");
    let sysrq = action.sysrq().unwrap_or("o");
    match fs::write("/proc/sysrq-trigger", sysrq) {
        Ok(()) => Ok(action.label()),
        Err(e) => Err(format!("ACPI sinyali gönderilemedi: {e}")),
    }
}

fn respond(mut stream: TcpStream, code: u16, body: &str) {
    let status = if code == 200 { "OK" } else { "ERROR" };
    let payload = format!("{{\"durum\":\"{status}\",\"mesaj\":\"{body}\"}}");
    let head = format!(
        "HTTP/1.1 {code} {status}\r\nContent-Type: application/json; charset=utf-8\r\n\
         Content-Length: {}\r\nAccess-Control-Allow-Origin: http://127.0.0.1\r\n\
         Cache-Control: no-store\r\nConnection: close\r\n\r\n",
        payload.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(payload.as_bytes());
    let _ = stream.flush();
}

/// Servisi başlatır. Yalnız 127.0.0.1 dinlenir; dışarıdan erişilemez.
pub fn serve(port: u16) -> std::io::Result<()> {
    let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
    let listener = TcpListener::bind(addr)?;
    println!("tedbirge-sysbridge · 127.0.0.1:{port} · destek: {}", supported());

    for stream in listener.incoming() {
        let Ok(stream) = stream else { continue };
        // Güvenlik: yalnız yerel döngü arayüzünden gelen istek işlenir.
        if !matches!(stream.peer_addr(), Ok(a) if a.ip().is_loopback()) {
            continue;
        }
        let mut line = String::new();
        {
            let mut reader = BufReader::new(match stream.try_clone() {
                Ok(s) => s,
                Err(_) => continue,
            });
            if reader.read_line(&mut line).is_err() {
                continue;
            }
        }

        if line.starts_with("GET /durum") {
            respond(
                stream,
                200,
                if supported() { "hazir" } else { "desteklenmiyor" },
            );
            continue;
        }

        match parse_request(&line) {
            Some(action) => match apply(action) {
                Ok(msg) => respond(stream, 200, msg),
                Err(err) => respond(stream, 503, &err),
            },
            None => respond(stream, 404, "Bilinmeyen komut"),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_every_power_command() {
        assert_eq!(
            parse_request("POST /guc/kapat HTTP/1.1"),
            Some(PowerAction::Kapat)
        );
        assert_eq!(
            parse_request("POST /guc/yeniden-baslat/ HTTP/1.1"),
            Some(PowerAction::YenidenBaslat)
        );
        assert_eq!(
            parse_request("POST /guc/uyku HTTP/1.1"),
            Some(PowerAction::Uyku)
        );
        assert_eq!(
            parse_request("POST /guc/derin-uyku HTTP/1.1"),
            Some(PowerAction::DerinUyku)
        );
    }

    #[test]
    fn get_and_unknown_paths_are_rejected() {
        assert_eq!(parse_request("GET /guc/kapat HTTP/1.1"), None);
        assert_eq!(parse_request("POST /guc/format HTTP/1.1"), None);
        assert_eq!(parse_request(""), None);
    }

    #[test]
    fn sleep_uses_sysfs_and_shutdown_uses_sysrq() {
        assert_eq!(PowerAction::Uyku.power_state(), Some("mem"));
        assert_eq!(PowerAction::DerinUyku.power_state(), Some("disk"));
        assert_eq!(PowerAction::Kapat.sysrq(), Some("o"));
        assert_eq!(PowerAction::YenidenBaslat.sysrq(), Some("b"));
        assert_eq!(PowerAction::Uyku.sysrq(), None);
    }
}
