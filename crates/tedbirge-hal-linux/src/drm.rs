//! FAZ 6 — DRM/KMS FRAMEBUFFER
//! -----------------------------------------------------------------
//! Kart açılır, kaynaklar sorulur, "dumb buffer" ayrılır ve doğrudan
//! belleğe çizilir. Tarayıcı, X11 ya da Wayland gerekmez.
//!
//! DRM yoksa (sanal makine, konteyner, başsız sunucu) sürücü sessizce
//! `/dev/fb0` framebuffer'ına, o da yoksa bellek içi tampona düşer;
//! kompozitör her üç durumda da aynı arayüzü görür.

use std::io;

use crate::sys::{iowr, Fd, Map, O_RDWR};

const DRM_CARD: &str = "/dev/dri/card0";
const FB_DEV: &str = "/dev/fb0";

// _IOWR('d', 0xA0, struct drm_mode_card_res)
const DRM_IOCTL_MODE_GETRESOURCES: u64 = iowr(b'd', 0xA0, 64);
// _IOWR('d', 0xB2, struct drm_mode_create_dumb)
const DRM_IOCTL_MODE_CREATE_DUMB: u64 = iowr(b'd', 0xB2, 32);
// _IOWR('d', 0xB3, struct drm_mode_map_dumb)
const DRM_IOCTL_MODE_MAP_DUMB: u64 = iowr(b'd', 0xB3, 24);

#[repr(C)]
#[derive(Default)]
struct CardRes {
    fb_id_ptr: u64,
    crtc_id_ptr: u64,
    connector_id_ptr: u64,
    encoder_id_ptr: u64,
    count_fbs: u32,
    count_crtcs: u32,
    count_connectors: u32,
    count_encoders: u32,
    min_width: u32,
    max_width: u32,
    min_height: u32,
    max_height: u32,
}

#[repr(C)]
#[derive(Default)]
struct CreateDumb {
    height: u32,
    width: u32,
    bpp: u32,
    flags: u32,
    handle: u32,
    pitch: u32,
    size: u64,
}

#[repr(C)]
#[derive(Default)]
struct MapDumb {
    handle: u32,
    pad: u32,
    offset: u64,
}

/// Çizim yüzeyi kaynağı.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Backend {
    /// Gerçek DRM/KMS dumb buffer.
    Drm,
    /// Eski `/dev/fb0` framebuffer.
    Fbdev,
    /// Donanım yok — bellek içi tampon (başsız / test).
    Memory,
}

/// Doğrudan piksel yazılabilen ekran yüzeyi.
pub struct Framebuffer {
    pub width: u32,
    pub height: u32,
    pub pitch: u32,
    pub backend: Backend,
    map: Option<Map>,
    shadow: Vec<u8>,
    _card: Option<Fd>,
}

impl Framebuffer {
    /// DRM → fbdev → bellek sırasıyla ilk çalışan yüzeyi açar.
    pub fn open() -> Self {
        Self::open_drm()
            .or_else(|_| Self::open_fbdev())
            .unwrap_or_else(|_| Self::memory(1280, 720))
    }

    fn open_drm() -> io::Result<Self> {
        let card = Fd::open(DRM_CARD, O_RDWR)?;
        let mut res = CardRes::default();
        card.ioctl(DRM_IOCTL_MODE_GETRESOURCES, &mut res)?;
        // Mod bilgisi konnektörden okunur; kaynak yoksa güvenli varsayılan.
        let width = if res.max_width == 0 { 1920 } else { res.max_width.min(1920) };
        let height = if res.max_height == 0 { 1080 } else { res.max_height.min(1080) };

        let mut create = CreateDumb {
            width,
            height,
            bpp: 32,
            ..Default::default()
        };
        card.ioctl(DRM_IOCTL_MODE_CREATE_DUMB, &mut create)?;

        let mut m = MapDumb {
            handle: create.handle,
            ..Default::default()
        };
        card.ioctl(DRM_IOCTL_MODE_MAP_DUMB, &mut m)?;
        let map = Map::shared(&card, create.size as usize, m.offset as i64)?;

        Ok(Framebuffer {
            width,
            height,
            pitch: create.pitch,
            backend: Backend::Drm,
            map: Some(map),
            shadow: Vec::new(),
            _card: Some(card),
        })
    }

    fn open_fbdev() -> io::Result<Self> {
        let fd = Fd::open(FB_DEV, O_RDWR)?;
        // Çözünürlük /sys üzerinden okunur (ioctl yapısı sürücüye göre değişir).
        let (w, h) = std::fs::read_to_string("/sys/class/graphics/fb0/virtual_size")
            .ok()
            .and_then(|s| {
                let mut it = s.trim().split(',');
                Some((it.next()?.parse().ok()?, it.next()?.parse().ok()?))
            })
            .unwrap_or((1280u32, 720u32));
        let len = (w * h * 4) as usize;
        let map = Map::shared(&fd, len, 0)?;
        Ok(Framebuffer {
            width: w,
            height: h,
            pitch: w * 4,
            backend: Backend::Fbdev,
            map: Some(map),
            shadow: Vec::new(),
            _card: Some(fd),
        })
    }

    /// Donanımsız yüzey — testler ve başsız düğüm.
    pub fn memory(width: u32, height: u32) -> Self {
        Framebuffer {
            width,
            height,
            pitch: width * 4,
            backend: Backend::Memory,
            map: None,
            shadow: vec![0; (width * height * 4) as usize],
            _card: None,
        }
    }

    fn bytes(&mut self) -> &mut [u8] {
        match self.map.as_mut() {
            Some(m) => m.as_mut(),
            None => &mut self.shadow,
        }
    }

    /// Tüm yüzeyi tek renge boyar (XRGB8888).
    pub fn clear(&mut self, argb: u32) {
        let px = argb.to_le_bytes();
        for chunk in self.bytes().chunks_exact_mut(4) {
            chunk.copy_from_slice(&px);
        }
    }

    /// Dikdörtgen doldurur; yüzey dışına taşan kısım kırpılır.
    pub fn fill_rect(&mut self, x: i32, y: i32, w: u32, h: u32, argb: u32) {
        let (fw, fh, pitch) = (self.width as i32, self.height as i32, self.pitch as usize);
        let px = argb.to_le_bytes();
        let buf = self.bytes();
        for row in y.max(0)..(y + h as i32).min(fh) {
            for col in x.max(0)..(x + w as i32).min(fw) {
                let off = row as usize * pitch + col as usize * 4;
                if off + 4 <= buf.len() {
                    buf[off..off + 4].copy_from_slice(&px);
                }
            }
        }
    }

    /// Ham piksel dilimi (test ve anlık görüntü için).
    pub fn pixels(&self) -> &[u8] {
        match self.map.as_ref() {
            Some(m) => unsafe { std::slice::from_raw_parts(m.ptr, m.len) },
            None => &self.shadow,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn memory_surface_fills_and_clips() {
        let mut fb = Framebuffer::memory(8, 4);
        assert_eq!(fb.backend, Backend::Memory);
        fb.clear(0xFF00_0000);
        fb.fill_rect(-2, -2, 4, 4, 0xFFAA_BBCC);
        // (0,0) boyandı, sağ alt köşe temiz kaldı.
        assert_eq!(&fb.pixels()[0..4], &0xFFAA_BBCCu32.to_le_bytes());
        let last = fb.pixels().len() - 4;
        assert_eq!(&fb.pixels()[last..], &0xFF00_0000u32.to_le_bytes());
    }

    #[test]
    fn open_never_panics_without_hardware() {
        let fb = Framebuffer::open();
        assert!(fb.width > 0 && fb.height > 0);
    }
}
