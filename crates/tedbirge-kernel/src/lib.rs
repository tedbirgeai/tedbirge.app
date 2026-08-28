//! TEDBİRGE OS — RUST/WASM ÇEKİRDEĞİ
//! -----------------------------------------------------------------
//! Tarayıcı kabuğu bu modülü `public/kernel/tedbirge_kernel.wasm`
//! adresinden yükler. Modül bulunamaz veya ABI uyuşmazsa kabuk sessizce
//! TypeScript çekirdeğine düşer (bkz. `src/kernel/wasm-provider.ts`).
//!
//! Faz C: çekirdek `#![no_std] + alloc` üzerine taşındı ve Dijkstra
//! yönlendirme motoru (`route.rs`) çekirdeğe alındı. Özellik bayrakları:
//!   * `wasm`  (varsayılan) — tarayıcı hedefi, dahili ayırıcı
//!   * `std`   — ana makine testleri/araçları
//!   * `bare`  — çıplak donanım (statik arena)
//!
//! Hiçbir ağ/IO işlemi Rust tarafında yapılmaz; taşıma katmanı
//! tarayıcıda kalır.

#![cfg_attr(not(feature = "std"), no_std)]
#![allow(clippy::missing_safety_doc)]

extern crate alloc;

use alloc::alloc::{alloc as rust_alloc, dealloc as rust_dealloc, Layout};
use alloc::vec::Vec;

#[cfg(not(feature = "std"))]
mod heap;
mod route;

#[cfg(not(feature = "std"))]
#[global_allocator]
static ALLOCATOR: heap::FreeListAlloc = heap::FreeListAlloc;

#[cfg(all(not(feature = "std"), not(test)))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    core::abort()
}

/// Kabuğun beklediği ABI sürümü.
pub const ABI_VERSION: u32 = 1;

/// Sabit nokta ölçeği (Q16.16 yerine sade Q16).
const Q: f64 = 65536.0;

/// `no_std` altında `f64::round` yoktur — yarım yukarı yuvarlama.
fn round_half_up(v: f64) -> f64 {
    if v >= 0.0 {
        let t = (v + 0.5) as i64 as f64;
        if t - v > 0.5 {
            t - 1.0
        } else {
            t
        }
    } else {
        let t = (v - 0.5) as i64 as f64;
        if v - t > 0.5 {
            t + 1.0
        } else {
            t
        }
    }
}

#[no_mangle]
pub extern "C" fn abi_version() -> u32 {
    ABI_VERSION
}

/// FNV-1a 32 bit — kabuk tarafıyla birebir aynı karma.
fn fnv1a(mut h: u32, bytes: &[u8]) -> u32 {
    for b in bytes {
        h ^= *b as u32;
        h = h.wrapping_mul(16777619);
    }
    h
}

/// Hedef karması için beklenen atlama sayısı (1..=3).
/// k-hop yerel mesh politikası: 2 sıçramanın ötesi DHT'ye devredilir.
#[no_mangle]
pub extern "C" fn route_hops(target: u32) -> u32 {
    let h = fnv1a(2166136261, &target.to_le_bytes());
    1 + (h % 3)
}

/// Kenar ağırlığı — Q16 sabit nokta.
/// Ağırlık = (gecikme_ms / kalan_kbps) + (1 - kalite) * ceza
///
/// `quality_q8`: 0..=255 (255 = mükemmel sinyal)
/// `penalty_q8`: 0..=255 (taşıyıcı enerji/duty-cycle cezası)
#[no_mangle]
pub extern "C" fn edge_weight_q16(
    latency_ms: u32,
    free_kbps: u32,
    quality_q8: u32,
    penalty_q8: u32,
) -> u32 {
    let latency = latency_ms as f64;
    let kbps = (free_kbps.max(1)) as f64;
    let quality = (quality_q8.min(255) as f64 / 255.0).max(0.05);
    let penalty = penalty_q8.min(255) as f64 / 255.0;
    // Gecikme baz maliyeti + bant genişliği baskısı + sinyal kalitesi cezası.
    let w = (latency / 1000.0) + (8192.0 / kbps) + (1.0 - quality) * (1.0 + penalty) * 4.0;
    let scaled = round_half_up(w * Q);
    if scaled < 0.0 {
        0
    } else if scaled > u32::MAX as f64 {
        u32::MAX
    } else {
        scaled as u32
    }
}

/// Toplam parça sayısı (çok yollu taşıyıcı planlaması).
#[no_mangle]
pub extern "C" fn chunk_count(byte_len: u32, chunk_size: u32) -> u32 {
    let size = chunk_size.max(1);
    byte_len.div_ceil(size).max(1)
}

/// Parça indeksinin hangi taşıyıcı hattına düşeceği (round-robin).
#[no_mangle]
pub extern "C" fn lane_for_chunk(index: u32, lanes: u32) -> u32 {
    if lanes == 0 {
        0
    } else {
        index % lanes
    }
}

/// Paket kimliği için 32 bit özet (mükerrer paket filtresi).
#[no_mangle]
pub unsafe extern "C" fn digest32(ptr: *const u8, len: u32) -> u32 {
    if ptr.is_null() || len == 0 {
        return 0;
    }
    let slice = core::slice::from_raw_parts(ptr, len as usize);
    fnv1a(2166136261, slice)
}

/* --------------------- Dijkstra yönlendirme ----------------------- */

/// Rust tarafında hesaplanan rota. Girdi ve çıktı düzeni
/// `src/kernel/route-codec.ts` ile birebir aynıdır.
///
/// Dönen işaretçi `[u32 uzunluk][gövde…]` düzenindedir; çağıran taraf
/// gövdeyi okuduktan sonra `kernel_free(ptr, 4 + uzunluk)` çağırmalıdır.
#[no_mangle]
pub unsafe extern "C" fn route_solve(ptr: *const u8, len: u32) -> *mut u8 {
    let input: &[u8] = if ptr.is_null() || len == 0 {
        &[]
    } else {
        core::slice::from_raw_parts(ptr, len as usize)
    };
    let out: Vec<u8> = route::solve(input);
    let total = out.len() + 4;
    let Ok(layout) = Layout::from_size_align(total, 1) else {
        return core::ptr::null_mut();
    };
    let buf = rust_alloc(layout);
    if buf.is_null() {
        return buf;
    }
    let size = out.len() as u32;
    core::ptr::copy_nonoverlapping(size.to_le_bytes().as_ptr(), buf, 4);
    core::ptr::copy_nonoverlapping(out.as_ptr(), buf.add(4), out.len());
    buf
}

/* --------------------- IPC tampon yönetimi ------------------------ */

/// Worker'dan gelen `Transferable ArrayBuffer` için tampon ayırır.
#[no_mangle]
pub unsafe extern "C" fn kernel_alloc(len: u32) -> *mut u8 {
    if len == 0 {
        return core::ptr::null_mut();
    }
    let Ok(layout) = Layout::from_size_align(len as usize, 1) else {
        return core::ptr::null_mut();
    };
    rust_alloc(layout)
}

/// Ayrılan tamponu serbest bırakır (bellek sızıntısı olmaz).
#[no_mangle]
pub unsafe extern "C" fn kernel_free(ptr: *mut u8, len: u32) {
    if ptr.is_null() || len == 0 {
        return;
    }
    let Ok(layout) = Layout::from_size_align(len as usize, 1) else {
        return;
    };
    rust_dealloc(ptr, layout);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn abi_is_stable() {
        assert_eq!(abi_version(), 1);
    }

    #[test]
    fn hops_are_bounded() {
        for i in 0..1000u32 {
            let h = route_hops(i);
            assert!((1..=3).contains(&h));
        }
    }

    #[test]
    fn better_links_cost_less() {
        let good = edge_weight_q16(10, 50_000, 255, 0);
        let bad = edge_weight_q16(900, 5, 60, 200);
        assert!(good < bad);
    }

    #[test]
    fn chunks_and_lanes() {
        assert_eq!(chunk_count(0, 16_384), 1);
        assert_eq!(chunk_count(16_385, 16_384), 2);
        assert_eq!(lane_for_chunk(7, 5), 2);
    }

    fn u16le(v: usize, out: &mut Vec<u8>) {
        out.push((v & 0xff) as u8);
        out.push(((v >> 8) & 0xff) as u8);
    }

    fn name(s: &str, out: &mut Vec<u8>) {
        u16le(s.len(), out);
        out.extend_from_slice(s.as_bytes());
    }

    #[test]
    fn dijkstra_picks_cheapest_path() {
        // A -lora- C (pahalı) ; A -lan- B -lan- C (ucuz)
        let mut req: Vec<u8> = Vec::new();
        u16le(3, &mut req);
        name("A", &mut req);
        name("B", &mut req);
        name("C", &mut req);
        u16le(3, &mut req);
        // A->C lora-serial (indeks 7)
        u16le(0, &mut req);
        u16le(2, &mut req);
        req.push(7);
        req.push(255);
        // A->B lan-ws (indeks 2)
        u16le(0, &mut req);
        u16le(1, &mut req);
        req.push(2);
        req.push(255);
        // B->C lan-ws
        u16le(1, &mut req);
        u16le(2, &mut req);
        req.push(2);
        req.push(255);
        u16le(0, &mut req); // kaynak
        u16le(2, &mut req); // hedef
        req.push(4); // yarıçap

        let out = route::solve(&req);
        assert_eq!(out[0], 1, "ulaşılabilir olmalı");
        let hop_count = out[out.len() - 1 - 0]; // son okunacak alan değil; yol uzunluğunu kontrol et
        let _ = hop_count;
        // Yol: A, B, C
        let path_len = out[9] as usize | ((out[10] as usize) << 8);
        assert_eq!(path_len, 3);
    }

    #[test]
    fn unreachable_is_reported() {
        let mut req: Vec<u8> = Vec::new();
        u16le(2, &mut req);
        name("A", &mut req);
        name("Z", &mut req);
        u16le(0, &mut req);
        u16le(0, &mut req);
        u16le(1, &mut req);
        req.push(3);
        let out = route::solve(&req);
        assert_eq!(out[0], 0);
    }
}
