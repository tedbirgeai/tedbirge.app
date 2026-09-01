//! FAZ 6 — SES ÇIKIŞI (ALSA, opsiyonel)
//! -----------------------------------------------------------------
//! `/dev/snd/pcmC0D0p` üzerine ham PCM yazılır. Ses kartı yoksa sürücü
//! sessiz moda düşer; çağrı yapan taraf hata görmez (zil sesi olmayan
//! bir düğüm hâlâ geçerli bir düğümdür).

use crate::sys::{Fd, O_RDWR};

const PCM_OUT: &str = "/dev/snd/pcmC0D0p";

pub struct Audio {
    dev: Option<Fd>,
    pub sample_rate: u32,
    pub channels: u16,
    written: u64,
}

impl Audio {
    pub fn open(sample_rate: u32, channels: u16) -> Self {
        Audio {
            dev: Fd::open(PCM_OUT, O_RDWR).ok(),
            sample_rate,
            channels,
            written: 0,
        }
    }

    /// Ses donanımı bulundu mu?
    pub fn available(&self) -> bool {
        self.dev.is_some()
    }

    /// 16-bit imzalı PCM çerçevesi yazar; yazılan bayt sayısını döner.
    pub fn play(&mut self, pcm: &[i16]) -> usize {
        let Some(dev) = self.dev.as_ref() else { return 0 };
        let mut bytes = Vec::with_capacity(pcm.len() * 2);
        for s in pcm {
            bytes.extend_from_slice(&s.to_le_bytes());
        }
        let n = dev.write(&bytes).unwrap_or(0);
        self.written += n as u64;
        n
    }

    pub fn bytes_written(&self) -> u64 {
        self.written
    }

    /// Basit sinüs tonu üretir (zil/uyarı sesi).
    pub fn tone(&self, hz: f32, ms: u32) -> Vec<i16> {
        let count = (self.sample_rate as f32 * ms as f32 / 1000.0) as usize;
        (0..count)
            .map(|i| {
                let t = i as f32 / self.sample_rate as f32;
                ((t * hz * std::f32::consts::TAU).sin() * 12000.0) as i16
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silent_mode_is_not_an_error() {
        let mut a = Audio::open(48_000, 2);
        let tone = a.tone(440.0, 10);
        assert_eq!(tone.len(), 480);
        if !a.available() {
            assert_eq!(a.play(&tone), 0);
        }
    }
}
