//! FAZ 6 / FAZ 11 — EVDEV GİRDİ
//! -----------------------------------------------------------------
//! `/dev/input/event*` aygıtlarından klavye, fare ve dokunmatik olayları
//! okunur ve **tek** bir olay kanalına indirgenir. Web kolundaki
//! pointer/klavye sözleşmesiyle birebir aynı biçimdedir; kompozitör ve
//! uygulamalar girdi kaynağını bilmez.

use std::io;
use std::path::PathBuf;

use crate::sys::{Fd, O_NONBLOCK, O_RDONLY};

/// Linux `input_event` (64-bit): time(16) + type(2) + code(2) + value(4)
const EVENT_SIZE: usize = 24;

const EV_KEY: u16 = 0x01;
const EV_REL: u16 = 0x02;
const EV_ABS: u16 = 0x03;

const REL_X: u16 = 0x00;
const REL_Y: u16 = 0x01;
const ABS_X: u16 = 0x00;
const ABS_Y: u16 = 0x01;
const BTN_TOUCH: u16 = 0x14a;
const BTN_LEFT: u16 = 0x110;

/// Kaynağı ne olursa olsun tek tip girdi olayı.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputEvent {
    /// Mutlak konum (dokunmatik) ya da birikmiş göreli konum (fare).
    Pointer { x: i32, y: i32 },
    /// Basma/bırakma (dokunma ya da sol tuş).
    Press { down: bool },
    /// Tuş kodu ve durumu.
    Key { code: u16, down: bool },
}

/// Tüm girdi aygıtlarını tek kanalda toplayan okuyucu.
pub struct InputHub {
    devices: Vec<Fd>,
    x: i32,
    y: i32,
    max_x: i32,
    max_y: i32,
}

impl InputHub {
    /// `/dev/input/event*` altındaki tüm aygıtları engellemesiz açar.
    pub fn open(max_x: i32, max_y: i32) -> Self {
        let mut devices = Vec::new();
        if let Ok(dir) = std::fs::read_dir("/dev/input") {
            let mut paths: Vec<PathBuf> = dir
                .flatten()
                .map(|e| e.path())
                .filter(|p| {
                    p.file_name()
                        .and_then(|n| n.to_str())
                        .is_some_and(|n| n.starts_with("event"))
                })
                .collect();
            paths.sort();
            for p in paths {
                if let Some(s) = p.to_str() {
                    if let Ok(fd) = Fd::open(s, O_RDONLY | O_NONBLOCK) {
                        devices.push(fd);
                    }
                }
            }
        }
        InputHub {
            devices,
            x: max_x / 2,
            y: max_y / 2,
            max_x,
            max_y,
        }
    }

    /// Açık aygıt sayısı (tanılama).
    pub fn device_count(&self) -> usize {
        self.devices.len()
    }

    /// Bekleyen tüm olayları tek tip biçime çevirerek döner.
    pub fn poll(&mut self) -> Vec<InputEvent> {
        let mut out = Vec::new();
        let mut buf = [0u8; EVENT_SIZE * 32];
        // Ödünç çakışmasını önlemek için aygıtları indeksle geziyoruz.
        for i in 0..self.devices.len() {
            let n = match self.devices[i].read(&mut buf) {
                Ok(n) => n,
                Err(ref e) if e.kind() == io::ErrorKind::WouldBlock => 0,
                Err(_) => 0,
            };
            for raw in buf[..n].chunks_exact(EVENT_SIZE) {
                let kind = u16::from_ne_bytes([raw[16], raw[17]]);
                let code = u16::from_ne_bytes([raw[18], raw[19]]);
                let value = i32::from_ne_bytes([raw[20], raw[21], raw[22], raw[23]]);
                if let Some(ev) = self.translate(kind, code, value) {
                    out.push(ev);
                }
            }
        }
        out
    }

    /// Ham evdev üçlüsünü tek tip olaya çevirir (saf; birim testi buradan).
    pub fn translate(&mut self, kind: u16, code: u16, value: i32) -> Option<InputEvent> {
        match (kind, code) {
            (EV_REL, REL_X) => {
                self.x = (self.x + value).clamp(0, self.max_x);
                Some(InputEvent::Pointer { x: self.x, y: self.y })
            }
            (EV_REL, REL_Y) => {
                self.y = (self.y + value).clamp(0, self.max_y);
                Some(InputEvent::Pointer { x: self.x, y: self.y })
            }
            (EV_ABS, ABS_X) => {
                self.x = value.clamp(0, self.max_x);
                Some(InputEvent::Pointer { x: self.x, y: self.y })
            }
            (EV_ABS, ABS_Y) => {
                self.y = value.clamp(0, self.max_y);
                Some(InputEvent::Pointer { x: self.x, y: self.y })
            }
            (EV_KEY, BTN_TOUCH) | (EV_KEY, BTN_LEFT) => Some(InputEvent::Press { down: value != 0 }),
            (EV_KEY, c) => Some(InputEvent::Key { code: c, down: value != 0 }),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relative_motion_accumulates_and_clamps() {
        let mut hub = InputHub {
            devices: Vec::new(),
            x: 0,
            y: 0,
            max_x: 100,
            max_y: 100,
        };
        assert_eq!(hub.translate(EV_REL, REL_X, 40), Some(InputEvent::Pointer { x: 40, y: 0 }));
        assert_eq!(hub.translate(EV_REL, REL_X, 400), Some(InputEvent::Pointer { x: 100, y: 0 }));
        assert_eq!(hub.translate(EV_REL, REL_Y, -5), Some(InputEvent::Pointer { x: 100, y: 0 }));
    }

    #[test]
    fn touch_and_left_button_map_to_the_same_press() {
        let mut hub = InputHub::open(10, 10);
        assert_eq!(hub.translate(EV_KEY, BTN_TOUCH, 1), Some(InputEvent::Press { down: true }));
        assert_eq!(hub.translate(EV_KEY, BTN_LEFT, 0), Some(InputEvent::Press { down: false }));
    }
}
