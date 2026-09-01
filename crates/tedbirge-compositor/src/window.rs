//! FAZ 7 — PENCERE YÖNETİCİSİ (kompozitör tarafı)
//! -----------------------------------------------------------------
//! Web kolundaki `src/shell/windows.ts` ile birebir aynı davranış:
//! açma, konumlandırma, odak (z-sırası) ve kapatma. Fark yalnız çizim
//! hedefinde: burada DOM değil, DRM framebuffer.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Surface {
    pub id: String,
    pub app_id: String,
    pub title: String,
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
    pub z: u32,
}

#[derive(Default)]
pub struct WindowStack {
    surfaces: Vec<Surface>,
    next_z: u32,
    seq: u32,
}

impl WindowStack {
    pub fn new() -> Self {
        WindowStack {
            surfaces: Vec::new(),
            next_z: 1,
            seq: 0,
        }
    }

    pub fn open(&mut self, app_id: &str, title: &str) -> String {
        self.seq += 1;
        let id = format!("{app_id}-{}", self.seq);
        let n = self.surfaces.len() as i32;
        self.surfaces.push(Surface {
            id: id.clone(),
            app_id: app_id.to_string(),
            title: title.to_string(),
            x: 48 + n * 28,
            y: 48 + n * 28,
            w: 720,
            h: 460,
            z: self.next_z,
        });
        self.next_z += 1;
        id
    }

    pub fn place(&mut self, id: &str, x: i32, y: i32, w: u32, h: u32) {
        if let Some(s) = self.surfaces.iter_mut().find(|s| s.id == id) {
            s.x = x;
            s.y = y;
            s.w = w.max(160);
            s.h = h.max(120);
        }
    }

    pub fn focus(&mut self, id: &str) {
        if let Some(s) = self.surfaces.iter_mut().find(|s| s.id == id) {
            s.z = self.next_z;
            self.next_z += 1;
        }
    }

    pub fn close(&mut self, id: &str) {
        self.surfaces.retain(|s| s.id != id);
    }

    /// Arkadan öne doğru çizim sırası.
    pub fn painters_order(&self) -> Vec<&Surface> {
        let mut v: Vec<&Surface> = self.surfaces.iter().collect();
        v.sort_by_key(|s| s.z);
        v
    }

    /// Verilen noktadaki en üstteki yüzey (girdi yönlendirmesi).
    pub fn hit(&self, x: i32, y: i32) -> Option<&Surface> {
        self.surfaces
            .iter()
            .filter(|s| x >= s.x && y >= s.y && x < s.x + s.w as i32 && y < s.y + s.h as i32)
            .max_by_key(|s| s.z)
    }

    pub fn len(&self) -> usize {
        self.surfaces.len()
    }

    pub fn is_empty(&self) -> bool {
        self.surfaces.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn focus_raises_surface_to_the_top() {
        let mut w = WindowStack::new();
        let a = w.open("dosyalar", "Dosyalar");
        let b = w.open("sohbet", "Sohbet");
        assert_eq!(w.painters_order().last().unwrap().id, b);
        w.focus(&a);
        assert_eq!(w.painters_order().last().unwrap().id, a);
    }

    #[test]
    fn hit_test_picks_the_topmost_overlapping_surface() {
        let mut w = WindowStack::new();
        let a = w.open("a", "A");
        let b = w.open("b", "B");
        w.place(&a, 0, 0, 200, 200);
        w.place(&b, 50, 50, 200, 200);
        assert_eq!(w.hit(60, 60).unwrap().id, b);
        assert_eq!(w.hit(10, 10).unwrap().id, a);
        assert!(w.hit(900, 900).is_none());
    }

    #[test]
    fn close_removes_the_surface() {
        let mut w = WindowStack::new();
        let a = w.open("a", "A");
        w.close(&a);
        assert!(w.is_empty());
    }
}
