//! ÇEKİRDEK ÇAĞRI KÖPRÜSÜ (libc, harici crate yok)
//! -----------------------------------------------------------------
//! Rust `std` zaten libc'ye bağlanır; gerekli birkaç çağrıyı burada
//! kendimiz bildiriyoruz. Böylece bare-metal imajda ek bağımlılık yok.

use std::ffi::CString;
use std::io;
use std::os::unix::io::RawFd;

extern "C" {
    fn open(path: *const i8, flags: i32, ...) -> i32;
    fn close(fd: i32) -> i32;
    fn read(fd: i32, buf: *mut u8, n: usize) -> isize;
    fn write(fd: i32, buf: *const u8, n: usize) -> isize;
    fn ioctl(fd: i32, request: u64, ...) -> i32;
    fn mmap(
        addr: *mut u8,
        len: usize,
        prot: i32,
        flags: i32,
        fd: i32,
        off: i64,
    ) -> *mut u8;
    fn munmap(addr: *mut u8, len: usize) -> i32;
    fn mount(
        src: *const i8,
        target: *const i8,
        fstype: *const i8,
        flags: u64,
        data: *const u8,
    ) -> i32;
}

pub const O_RDONLY: i32 = 0;
pub const O_RDWR: i32 = 2;
pub const O_NONBLOCK: i32 = 0o4000;
pub const O_CLOEXEC: i32 = 0o2000000;

pub const PROT_READ: i32 = 1;
pub const PROT_WRITE: i32 = 2;
pub const MAP_SHARED: i32 = 1;

pub const MS_RDONLY: u64 = 1;
pub const MS_NOSUID: u64 = 2;
pub const MS_NODEV: u64 = 4;

/// Ham dosya tanıtıcısı — kapanışta otomatik `close`.
pub struct Fd(pub RawFd);

impl Fd {
    pub fn open(path: &str, flags: i32) -> io::Result<Self> {
        let c = CString::new(path).map_err(|_| io::Error::other("gecersiz yol"))?;
        let fd = unsafe { open(c.as_ptr(), flags | O_CLOEXEC) };
        if fd < 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(Fd(fd))
    }

    pub fn read(&self, buf: &mut [u8]) -> io::Result<usize> {
        let n = unsafe { read(self.0, buf.as_mut_ptr(), buf.len()) };
        if n < 0 {
            Err(io::Error::last_os_error())
        } else {
            Ok(n as usize)
        }
    }

    pub fn write(&self, buf: &[u8]) -> io::Result<usize> {
        let n = unsafe { write(self.0, buf.as_ptr(), buf.len()) };
        if n < 0 {
            Err(io::Error::last_os_error())
        } else {
            Ok(n as usize)
        }
    }

    /// `ioctl` — üçüncü argüman bir yapı işaretçisidir.
    pub fn ioctl<T>(&self, request: u64, arg: &mut T) -> io::Result<i32> {
        let r = unsafe { ioctl(self.0, request, arg as *mut T) };
        if r < 0 {
            Err(io::Error::last_os_error())
        } else {
            Ok(r)
        }
    }
}

impl Drop for Fd {
    fn drop(&mut self) {
        unsafe { close(self.0) };
    }
}

/// Paylaşımlı bellek eşlemesi (framebuffer için).
pub struct Map {
    pub ptr: *mut u8,
    pub len: usize,
}

impl Map {
    pub fn shared(fd: &Fd, len: usize, offset: i64) -> io::Result<Self> {
        let ptr = unsafe {
            mmap(
                std::ptr::null_mut(),
                len,
                PROT_READ | PROT_WRITE,
                MAP_SHARED,
                fd.0,
                offset,
            )
        };
        if ptr as isize == -1 || ptr.is_null() {
            return Err(io::Error::last_os_error());
        }
        Ok(Map { ptr, len })
    }

    /// # Safety
    /// Eşleme yaşadığı sürece geçerli bir dilim döner.
    pub fn as_mut(&mut self) -> &mut [u8] {
        unsafe { std::slice::from_raw_parts_mut(self.ptr, self.len) }
    }
}

impl Drop for Map {
    fn drop(&mut self) {
        unsafe { munmap(self.ptr, self.len) };
    }
}

/// Dosya sistemi bağlama (installer ve blok depolama köprüsü kullanır).
pub fn mount_fs(src: &str, target: &str, fstype: &str, flags: u64) -> io::Result<()> {
    let (s, t, f) = (
        CString::new(src).unwrap_or_default(),
        CString::new(target).unwrap_or_default(),
        CString::new(fstype).unwrap_or_default(),
    );
    let r = unsafe { mount(s.as_ptr(), t.as_ptr(), f.as_ptr(), flags, std::ptr::null()) };
    if r < 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

/// `_IOWR` benzeri ioctl numarası üretimi (Linux asm-generic).
pub const fn iowr(kind: u8, nr: u8, size: usize) -> u64 {
    // dir(2) | size(14) | type(8) | nr(8)
    (3u64 << 30) | ((size as u64 & 0x3fff) << 16) | ((kind as u64) << 8) | (nr as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn iowr_matches_linux_encoding() {
        // DRM_IOCTL_MODE_GETRESOURCES = _IOWR('d', 0xA0, drm_mode_card_res(64 bayt))
        assert_eq!(iowr(b'd', 0xA0, 64), 0xC040_64A0);
    }

    #[test]
    fn missing_device_is_an_error_not_a_panic() {
        assert!(Fd::open("/dev/tedbirge-yok", O_RDONLY).is_err());
    }
}
