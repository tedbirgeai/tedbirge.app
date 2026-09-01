//! FAZ 6 — SERİ / LoRa TAŞIYICI
//! -----------------------------------------------------------------
//! `Transport` trait'inin ikinci uygulaması: UDP yanında seri port
//! (LoRa modülü, RS-485 köprüsü, USB-UART). Çekirdek değişmez; yalnız
//! taşıyıcı değişir.
//!
//! Çerçeve biçimi (UDP yayınıyla aynı): "TBG1" + peer(4) + gövde.

use tedbirge_kernel::hal::Transport;

use crate::sys::{Fd, O_NONBLOCK, O_RDWR};

pub struct SerialTransport {
    port: Option<Fd>,
    pub sent: u64,
    pub received: u64,
}

impl SerialTransport {
    /// Verilen aygıtı açar; yoksa taşıyıcı sessizce düşer (0 bayt).
    pub fn open(path: &str) -> Self {
        SerialTransport {
            port: Fd::open(path, O_RDWR | O_NONBLOCK).ok(),
            sent: 0,
            received: 0,
        }
    }

    /// Bilinen yollardan ilk açılanı seçer (LoRa şapkaları ve USB-UART).
    pub fn autodetect() -> Self {
        for p in [
            "/dev/ttyLORA0",
            "/dev/ttyUSB0",
            "/dev/ttyACM0",
            "/dev/serial0",
            "/dev/ttyS0",
        ] {
            let t = SerialTransport::open(p);
            if t.available() {
                return t;
            }
        }
        SerialTransport {
            port: None,
            sent: 0,
            received: 0,
        }
    }

    pub fn available(&self) -> bool {
        self.port.is_some()
    }

    /// Çerçeveyi başlıkla sarar (saf fonksiyon — test edilebilir).
    pub fn frame(peer: u32, body: &[u8]) -> Vec<u8> {
        let mut out = Vec::with_capacity(8 + body.len());
        out.extend_from_slice(b"TBG1");
        out.extend_from_slice(&peer.to_le_bytes());
        out.extend_from_slice(body);
        out
    }

    /// Gelen çerçeveyi çözer; başlık uymazsa `None`.
    pub fn parse(raw: &[u8]) -> Option<(u32, &[u8])> {
        if raw.len() < 8 || &raw[..4] != b"TBG1" {
            return None;
        }
        let peer = u32::from_le_bytes([raw[4], raw[5], raw[6], raw[7]]);
        Some((peer, &raw[8..]))
    }
}

impl Transport for SerialTransport {
    fn send(&mut self, peer: u32, frame: &[u8]) -> usize {
        let Some(port) = self.port.as_ref() else { return 0 };
        let packet = SerialTransport::frame(peer, frame);
        let n = port.write(&packet).unwrap_or(0);
        self.sent += n as u64;
        n
    }

    fn poll(&mut self, out: &mut [u8]) -> usize {
        let Some(port) = self.port.as_ref() else { return 0 };
        let n = port.read(out).unwrap_or(0);
        self.received += n as u64;
        n
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_roundtrip() {
        let f = SerialTransport::frame(0xDEAD_BEEF, b"selam");
        let (peer, body) = SerialTransport::parse(&f).expect("cozulmeli");
        assert_eq!(peer, 0xDEAD_BEEF);
        assert_eq!(body, b"selam");
    }

    #[test]
    fn foreign_frames_are_rejected() {
        assert!(SerialTransport::parse(b"XXXX1234body").is_none());
        assert!(SerialTransport::parse(b"TBG1").is_none());
    }

    #[test]
    fn absent_port_drops_silently() {
        let mut t = SerialTransport::open("/dev/tedbirge-yok");
        assert!(!t.available());
        assert_eq!(t.send(1, b"x"), 0);
        let mut buf = [0u8; 8];
        assert_eq!(t.poll(&mut buf), 0);
    }
}
