//! TEDBİRGE OS — LINUX NATIVE HAL (FAZ 6 + FAZ 8)
//! -----------------------------------------------------------------
//! Web kolundaki `src/hal/*` sözleşmesinin donanım karşılığı:
//!
//! | Sözleşme       | Web kolu            | Bu crate                    |
//! | -------------- | ------------------- | --------------------------- |
//! | DisplayHal     | DOM pencere yön.    | `drm::Framebuffer`          |
//! | Girdi          | pointer/klavye      | `input::InputHub`           |
//! | NetHal         | WebRTC çekirdeği    | `net` + `serial`            |
//! | StorageHal     | IndexedDB VFS       | `storage::NativeStorage`    |
//! | Ses            | WebAudio            | `audio::Audio`              |
//!
//! Harici crate yoktur; yalnız `std` ve doğrudan libc çağrıları. Donanım
//! bulunmadığında her sürücü zararsız bir yedeğe düşer — aynı ikili hem
//! sunucuda hem SBC'de çalışır.

pub mod audio;
pub mod drm;
pub mod input;
pub mod net;
pub mod serial;
pub mod storage;
pub mod sys;

use std::time::Instant;

use tedbirge_kernel::hal::Clock;

/// Monotonik saat — çekirdeğin `Clock` sözleşmesi.
pub struct SystemClock {
    origin: Instant,
}

impl Default for SystemClock {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemClock {
    pub fn new() -> Self {
        SystemClock {
            origin: Instant::now(),
        }
    }
}

impl Clock for SystemClock {
    fn now_ms(&self) -> u64 {
        self.origin.elapsed().as_millis() as u64
    }
}

/// Tanılama özeti — kabuk açılışta bunu yazar.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HalReport {
    pub display: &'static str,
    pub width: u32,
    pub height: u32,
    pub input_devices: usize,
    pub interfaces: usize,
    pub disks: usize,
    pub audio: bool,
    pub serial: bool,
}

/// Donanımı tarar ve tek satırlık bir rapor üretir.
pub fn probe() -> HalReport {
    let fb = drm::Framebuffer::open();
    HalReport {
        display: match fb.backend {
            drm::Backend::Drm => "drm/kms",
            drm::Backend::Fbdev => "fbdev",
            drm::Backend::Memory => "bellek",
        },
        width: fb.width,
        height: fb.height,
        input_devices: input::InputHub::open(fb.width as i32, fb.height as i32).device_count(),
        interfaces: net::interfaces().len(),
        disks: storage::block_devices().len(),
        audio: audio::Audio::open(48_000, 2).available(),
        serial: serial::SerialTransport::autodetect().available(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn probe_reports_a_usable_surface_everywhere() {
        let r = probe();
        assert!(r.width > 0 && r.height > 0);
        assert!(["drm/kms", "fbdev", "bellek"].contains(&r.display));
    }

    #[test]
    fn clock_is_monotonic() {
        let c = SystemClock::new();
        let a = c.now_ms();
        assert!(c.now_ms() >= a);
    }
}
