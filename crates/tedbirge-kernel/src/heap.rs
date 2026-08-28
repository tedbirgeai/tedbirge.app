//! ÇEKİRDEK BELLEK YÖNETİCİSİ (`no_std` yolları için)
//! -----------------------------------------------------------------
//! `std` özelliği kapalıyken Rust'ın varsayılan ayırıcısı bulunmaz.
//! Bu modül; küçük, deterministik ve bağımlılıksız bir serbest-liste
//! (free-list) ayırıcısı sağlar.
//!
//! - `wasm` özelliği: yığın `memory.grow` ile büyütülür (tarayıcı).
//! - `bare` özelliği: sabit boyutlu statik arena kullanılır (donanım).
//!
//! Blok düzeni: `[usize boyut][usize sonraki][… veri …]` (16 bayt başlık,
//! 16 bayta hizalı) — 16 bayta kadar tüm hizalama istekleri karşılanır.

#![allow(dead_code)]

use core::alloc::{GlobalAlloc, Layout};
use core::ptr;

const HDR: usize = 16;
const ALIGN: usize = 16;

#[cfg(all(feature = "bare", not(feature = "wasm")))]
const ARENA_BYTES: usize = 256 * 1024;

#[cfg(all(feature = "bare", not(feature = "wasm")))]
static mut ARENA: [u8; ARENA_BYTES] = [0; ARENA_BYTES];

struct Heap {
    free: usize,
    top: usize,
    end: usize,
}

static mut HEAP: Heap = Heap {
    free: 0,
    top: 0,
    end: 0,
};

const fn align_up(v: usize, a: usize) -> usize {
    (v + a - 1) & !(a - 1)
}

#[cfg(feature = "wasm")]
unsafe fn grow(min_bytes: usize) -> bool {
    const PAGE: usize = 64 * 1024;
    let pages = align_up(min_bytes, PAGE) / PAGE;
    let prev = core::arch::wasm32::memory_grow(0, pages);
    if prev == usize::MAX {
        return false;
    }
    let start = prev * PAGE;
    let heap = &raw mut HEAP;
    if (*heap).end == start {
        // Bitişik büyüme: mevcut yığının sonu uzatılır.
        (*heap).end = start + pages * PAGE;
    } else {
        (*heap).top = align_up(start, ALIGN);
        (*heap).end = start + pages * PAGE;
    }
    true
}

#[cfg(all(feature = "bare", not(feature = "wasm")))]
unsafe fn grow(_min_bytes: usize) -> bool {
    let heap = &raw mut HEAP;
    if (*heap).end != 0 {
        return false; // Statik arena bir kez kurulur.
    }
    let base = (&raw const ARENA) as usize;
    (*heap).top = align_up(base, ALIGN);
    (*heap).end = base + ARENA_BYTES;
    true
}

#[cfg(not(any(feature = "wasm", feature = "bare")))]
unsafe fn grow(_min_bytes: usize) -> bool {
    false
}

pub struct FreeListAlloc;

unsafe impl GlobalAlloc for FreeListAlloc {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        if layout.align() > ALIGN {
            return ptr::null_mut();
        }
        let need = align_up(layout.size().max(ALIGN), ALIGN);
        let heap = &raw mut HEAP;

        // 1) Serbest listede ilk uyan bloğu ara.
        let mut prev: usize = 0;
        let mut cur: usize = (*heap).free;
        while cur != 0 {
            let size = *(cur as *const usize);
            let next = *((cur + 8) as *const usize);
            if size >= need {
                if prev == 0 {
                    (*heap).free = next;
                } else {
                    *((prev + 8) as *mut usize) = next;
                }
                return (cur + HDR) as *mut u8;
            }
            prev = cur;
            cur = next;
        }

        // 2) Yığından kes; gerekirse belleği büyüt.
        let total = need + HDR;
        if (*heap).top + total > (*heap).end && !grow(total) {
            return ptr::null_mut();
        }
        if (*heap).top + total > (*heap).end {
            return ptr::null_mut();
        }
        let block = (*heap).top;
        (*heap).top = block + total;
        *(block as *mut usize) = need;
        *((block + 8) as *mut usize) = 0;
        (block + HDR) as *mut u8
    }

    unsafe fn dealloc(&self, ptr: *mut u8, _layout: Layout) {
        if ptr.is_null() {
            return;
        }
        let block = (ptr as usize) - HDR;
        let heap = &raw mut HEAP;
        *((block + 8) as *mut usize) = (*heap).free;
        (*heap).free = block;
    }
}
