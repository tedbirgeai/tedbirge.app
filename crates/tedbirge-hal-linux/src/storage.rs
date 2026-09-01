//! FAZ 8 — BLOK DEPOLAMA KÖPRÜSÜ
//! -----------------------------------------------------------------
//! `StorageHal`ın native karşılığı. Tarayıcı kolunda IndexedDB olan şey
//! burada gerçek bir blok aygıtı + dosya sistemidir. Üstveri şeması web
//! VFS'i ile birebir aynı olduğundan aynı uygulamalar iki kolda da
//! çalışır: `{ id, name, size, folder, created }`.
//!
//! Kalıcı düzen:
//!   /var/tedbirge/
//!     files/<id>          → ham içerik
//!     index.tsv           → üstveri (id \t name \t size \t folder \t created)

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::sys::{mount_fs, MS_NODEV, MS_NOSUID};

/// Keşfedilen blok aygıtı.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockDevice {
    pub name: String,
    pub bytes: u64,
    pub removable: bool,
    pub rotational: bool,
}

impl BlockDevice {
    pub fn path(&self) -> String {
        format!("/dev/{}", self.name)
    }
}

/// `/sys/block` üzerinden gerçek diskleri listeler (loop/ram hariç).
pub fn block_devices() -> Vec<BlockDevice> {
    let mut out = Vec::new();
    let Ok(dir) = fs::read_dir("/sys/block") else {
        return out;
    };
    for e in dir.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with("loop") || name.starts_with("ram") || name.starts_with("zram") {
            continue;
        }
        let base = e.path();
        let sectors: u64 = fs::read_to_string(base.join("size"))
            .ok()
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0);
        out.push(BlockDevice {
            bytes: sectors * 512,
            removable: fs::read_to_string(base.join("removable"))
                .map(|s| s.trim() == "1")
                .unwrap_or(false),
            rotational: fs::read_to_string(base.join("queue/rotational"))
                .map(|s| s.trim() == "1")
                .unwrap_or(false),
            name,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

/// Bölümü ext4 → f2fs sırasıyla bağlamayı dener.
pub fn mount_data(device: &str, target: &str) -> io::Result<&'static str> {
    fs::create_dir_all(target)?;
    for fstype in ["ext4", "f2fs"] {
        if mount_fs(device, target, fstype, MS_NOSUID | MS_NODEV).is_ok() {
            return Ok(fstype);
        }
    }
    Err(io::Error::other("bolum baglanamadi (ext4/f2fs)"))
}

/// Web VFS ile aynı dosya üstverisi.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileMeta {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub folder: String,
    pub created: u64,
}

impl FileMeta {
    fn to_row(&self) -> String {
        format!(
            "{}\t{}\t{}\t{}\t{}",
            self.id, self.name, self.size, self.folder, self.created
        )
    }

    fn from_row(row: &str) -> Option<Self> {
        let mut f = row.split('\t');
        Some(FileMeta {
            id: f.next()?.to_string(),
            name: f.next()?.to_string(),
            size: f.next()?.parse().ok()?,
            folder: f.next()?.to_string(),
            created: f.next()?.parse().ok()?,
        })
    }
}

/// Kalıcı dosya deposu — `StorageHal`ın native uygulaması.
pub struct NativeStorage {
    root: PathBuf,
}

impl NativeStorage {
    pub fn open(root: impl AsRef<Path>) -> io::Result<Self> {
        let root = root.as_ref().to_path_buf();
        fs::create_dir_all(root.join("files"))?;
        Ok(NativeStorage { root })
    }

    fn index_path(&self) -> PathBuf {
        self.root.join("index.tsv")
    }

    /// Kayıtlı dosyaların üstverisi (içerik okunmaz).
    pub fn list(&self) -> Vec<FileMeta> {
        fs::read_to_string(self.index_path())
            .unwrap_or_default()
            .lines()
            .filter_map(FileMeta::from_row)
            .collect()
    }

    /// Dosyayı yazar ve üstverisini indekse ekler.
    pub fn write(&self, name: &str, folder: &str, bytes: &[u8], now: u64) -> io::Result<FileMeta> {
        let id = format!("{now:x}-{:x}", fnv1a(name.as_bytes()));
        fs::write(self.root.join("files").join(&id), bytes)?;
        let meta = FileMeta {
            id,
            name: name.replace('\t', " "),
            size: bytes.len() as u64,
            folder: folder.to_string(),
            created: now,
        };
        let mut rows = self.list();
        rows.push(meta.clone());
        self.flush(&rows)?;
        Ok(meta)
    }

    pub fn read(&self, id: &str) -> io::Result<Vec<u8>> {
        fs::read(self.root.join("files").join(id))
    }

    pub fn remove(&self, id: &str) -> io::Result<()> {
        let _ = fs::remove_file(self.root.join("files").join(id));
        let rows: Vec<FileMeta> = self.list().into_iter().filter(|m| m.id != id).collect();
        self.flush(&rows)
    }

    /// (dosya sayısı, toplam bayt) — web tarafındaki `stat()` karşılığı.
    pub fn stat(&self) -> (usize, u64) {
        let rows = self.list();
        (rows.len(), rows.iter().map(|m| m.size).sum())
    }

    fn flush(&self, rows: &[FileMeta]) -> io::Result<()> {
        let body: Vec<String> = rows.iter().map(FileMeta::to_row).collect();
        fs::write(self.index_path(), body.join("\n"))
    }
}

fn fnv1a(data: &[u8]) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in data {
        h ^= *b as u64;
        h = h.wrapping_mul(0x1000_0000_01b3);
    }
    h
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(tag: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("tedbirge-store-{tag}"));
        let _ = fs::remove_dir_all(&p);
        p
    }

    #[test]
    fn write_list_read_remove_roundtrip() {
        let s = NativeStorage::open(tmp("rt")).unwrap();
        let m = s.write("not.txt", "belgeler", b"merhaba", 1).unwrap();
        assert_eq!(s.list().len(), 1);
        assert_eq!(s.read(&m.id).unwrap(), b"merhaba");
        assert_eq!(s.stat(), (1, 7));
        s.remove(&m.id).unwrap();
        assert!(s.list().is_empty());
        assert_eq!(s.stat(), (0, 0));
    }

    #[test]
    fn metadata_survives_reopen() {
        let dir = tmp("persist");
        {
            let s = NativeStorage::open(&dir).unwrap();
            s.write("a.bin", "indirilenler", &[1, 2, 3], 7).unwrap();
        }
        let again = NativeStorage::open(&dir).unwrap();
        let rows = again.list();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].name, "a.bin");
        assert_eq!(rows[0].folder, "indirilenler");
    }

    #[test]
    fn block_discovery_never_panics() {
        let _ = block_devices();
    }
}
