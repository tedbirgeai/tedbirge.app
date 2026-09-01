//! Kompozitör paleti — kabuğun `--tb-*` token'larının XRGB8888 karşılığı.
//! Tek doğruluk kaynağı web temasıdır; buradaki değerler onun aynasıdır.

/// `--tb-bg` — Açık Kristal arka planı.
pub const BG: u32 = 0xFF_F2_F6_F7;
/// `--tb-panel-solid`
pub const PANEL: u32 = 0xFF_FF_FF_FF;
/// `--tb-bg-soft` — pencere gövdesi.
pub const SURFACE: u32 = 0xFF_E9_F1_F2;
/// `--tb-border`
pub const BORDER: u32 = 0xFF_D2_DE_E0;
/// `--tb-accent` — teal vurgusu.
pub const ACCENT: u32 = 0xFF_0E_7C_7B;
/// `--tb-text`
pub const TEXT: u32 = 0xFF_10_2A_2C;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn palette_is_fully_opaque() {
        for c in [BG, PANEL, SURFACE, BORDER, ACCENT, TEXT] {
            assert_eq!(c >> 24, 0xFF, "alfa kanali opak olmali");
        }
    }
}
