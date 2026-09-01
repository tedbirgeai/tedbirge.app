//! TEDBİRGE OS — KİOSK KOMPOZİTÖRÜ (FAZ 7)
//! -----------------------------------------------------------------
//! Tarayıcı gerekmez: DRM framebuffer üzerine doğrudan çizilir, girdi
//! evdev'den okunur, uygulamalar yetenek kısıtlı Wasm modülleridir.
//! Renkler kabuğun `--tb-*` paletiyle aynı değerlerden türetilir.

pub mod theme;
pub mod wasm;
pub mod window;

use tedbirge_hal_linux::drm::Framebuffer;
use tedbirge_hal_linux::input::{InputEvent, InputHub};

use crate::window::WindowStack;

/// Kompozitör durumu — çizim ve girdi tek döngüde birleşir.
pub struct Compositor {
    pub fb: Framebuffer,
    pub stack: WindowStack,
    pointer: (i32, i32),
}

impl Compositor {
    pub fn new(fb: Framebuffer) -> Self {
        let pointer = (fb.width as i32 / 2, fb.height as i32 / 2);
        Compositor {
            fb,
            stack: WindowStack::new(),
            pointer,
        }
    }

    /// Tek kare çizer: arka plan, üst çubuk, pencereler, imleç.
    pub fn paint(&mut self) {
        let (w, h) = (self.fb.width, self.fb.height);
        self.fb.clear(theme::BG);
        self.fb.fill_rect(0, 0, w, 34, theme::PANEL);

        let frames: Vec<(i32, i32, u32, u32)> = self
            .stack
            .painters_order()
            .iter()
            .map(|s| (s.x, s.y, s.w, s.h))
            .collect();
        for (i, (x, y, sw, sh)) in frames.iter().enumerate() {
            let top = i + 1 == frames.len();
            self.fb.fill_rect(*x, *y, *sw, *sh, theme::SURFACE);
            self.fb.fill_rect(
                *x,
                *y,
                *sw,
                30,
                if top { theme::ACCENT } else { theme::BORDER },
            );
        }
        let _ = h;
        self.fb
            .fill_rect(self.pointer.0, self.pointer.1, 10, 14, theme::TEXT);
    }

    /// Girdiyi uygular: imleç konumu ve odak yönlendirmesi.
    pub fn handle(&mut self, ev: InputEvent) {
        match ev {
            InputEvent::Pointer { x, y } => self.pointer = (x, y),
            InputEvent::Press { down: true } => {
                if let Some(id) = self
                    .stack
                    .hit(self.pointer.0, self.pointer.1)
                    .map(|s| s.id.clone())
                {
                    self.stack.focus(&id);
                }
            }
            _ => {}
        }
    }

    pub fn pointer(&self) -> (i32, i32) {
        self.pointer
    }

    /// Kesintisiz kiosk döngüsü (bin tarafından çağrılır).
    pub fn run(&mut self, hub: &mut InputHub) -> ! {
        loop {
            for ev in hub.poll() {
                self.handle(ev);
            }
            self.paint();
            std::thread::sleep(std::time::Duration::from_millis(16));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn click_focuses_the_surface_under_the_pointer() {
        let mut c = Compositor::new(Framebuffer::memory(640, 480));
        let a = c.stack.open("a", "A");
        let b = c.stack.open("b", "B");
        c.stack.place(&a, 0, 0, 300, 300);
        c.stack.place(&b, 320, 0, 300, 300);
        c.handle(InputEvent::Pointer { x: 20, y: 40 });
        c.handle(InputEvent::Press { down: true });
        assert_eq!(c.stack.painters_order().last().unwrap().id, a);
    }

    #[test]
    fn paint_writes_pixels_without_hardware() {
        let mut c = Compositor::new(Framebuffer::memory(64, 48));
        c.stack.open("a", "A");
        c.paint();
        assert!(c.fb.pixels().iter().any(|b| *b != 0));
        assert_eq!(c.pointer(), (32, 24));
    }
}
