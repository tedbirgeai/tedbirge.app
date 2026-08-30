//! DONANIM SOYUTLAMA KATMANI (HAL)
//! -----------------------------------------------------------------
//! Faz 2: çekirdek mantığı (yönlendirme, ayırıcı) hiçbir platform
//! API'sine dokunmaz. Zaman, rastgelelik ve taşıma üç trait ile dışarı
//! alınır:
//!   * `wasm`  → tarayıcı köprüsü bu trait'leri JS tarafından doldurur.
//!   * `bare`  → çıplak donanımda zamanlayıcı/RNG/radyo sürücüsü doldurur.
//!   * `std`   → testler için deterministik sahte uygulamalar.
//!
//! Çekirdek bu dosyada hiçbir IO yapmaz; yalnız sözleşme tanımlanır.

/// Monotonik saat (milisaniye). Duvar saati değildir.
pub trait Clock {
    fn now_ms(&self) -> u64;
}

/// Rastgelelik kaynağı (nonce/oturum kimliği üretimi).
pub trait Rng {
    fn next_u32(&mut self) -> u32;
}

/// Çerçeve taşıyıcı. Dönen değer gönderilen bayt sayısıdır; 0 = düştü.
pub trait Transport {
    fn send(&mut self, peer: u32, frame: &[u8]) -> usize;
    /// Hazır çerçeveyi tampona yazar; okunan bayt sayısını döner.
    fn poll(&mut self, out: &mut [u8]) -> usize;
}

/// Üç sürücüyü tek yerde toplayan platform tanımı.
pub struct Platform<C: Clock, R: Rng, T: Transport> {
    pub clock: C,
    pub rng: R,
    pub transport: T,
}

impl<C: Clock, R: Rng, T: Transport> Platform<C, R, T> {
    pub fn new(clock: C, rng: R, transport: T) -> Self {
        Self {
            clock,
            rng,
            transport,
        }
    }
}

/// Deterministik sahte saat/RNG — testler ve kuru çalıştırma için.
pub struct NullClock;
impl Clock for NullClock {
    fn now_ms(&self) -> u64 {
        0
    }
}

/// xorshift32 — donanım RNG yokken yedek kaynak.
pub struct XorShiftRng(pub u32);
impl Rng for XorShiftRng {
    fn next_u32(&mut self) -> u32 {
        let mut x = if self.0 == 0 { 0x2545_F491 } else { self.0 };
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        x
    }
}

/// Taşıyıcısı olmayan platform (yalnız yerel yönlendirme hesabı).
pub struct NullTransport;
impl Transport for NullTransport {
    fn send(&mut self, _peer: u32, _frame: &[u8]) -> usize {
        0
    }
    fn poll(&mut self, _out: &mut [u8]) -> usize {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rng_is_deterministic_and_nonzero() {
        let mut a = XorShiftRng(1);
        let mut b = XorShiftRng(1);
        for _ in 0..64 {
            let v = a.next_u32();
            assert_eq!(v, b.next_u32());
            assert_ne!(v, 0);
        }
    }

    #[test]
    fn null_platform_is_inert() {
        let mut p = Platform::new(NullClock, XorShiftRng(7), NullTransport);
        assert_eq!(p.clock.now_ms(), 0);
        let mut buf = [0u8; 4];
        assert_eq!(p.transport.send(1, &[1, 2, 3]), 0);
        assert_eq!(p.transport.poll(&mut buf), 0);
    }
}
