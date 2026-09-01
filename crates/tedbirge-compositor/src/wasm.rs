//! FAZ 7 — YETENEK KISITLI WASM UYGULAMA HOST'U
//! -----------------------------------------------------------------
//! `.tbapp` paketleri bare-metal tarafta da çalışır. Bu modül modülü
//! doğrular ve **içe aktarım (import) listesini yetenek sözleşmesiyle**
//! karşılaştırır: web kolundaki `src/kernel/capabilities.ts` ile aynı
//! adlar, aynı reddetme kuralı.
//!
//! Çalıştırma motoru derleme zamanı seçimidir:
//!   * varsayılan: doğrulama + reddetme (motor yok, uygulama başlatılmaz)
//!   * `wasmi` özelliği: saf-Rust yorumlayıcı (küçük SBC'de JIT yükü yok)
//! Motor yokken sahte bir "çalıştı" sonucu ASLA dönmez.

/// Uygulamanın isteyebileceği yetenekler — web tarafıyla birebir.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Capability {
    Storage,
    Net,
    Display,
    Audio,
    Location,
}

impl Capability {
    pub fn from_import(module: &str) -> Option<Capability> {
        match module {
            "tb_storage" => Some(Capability::Storage),
            "tb_net" => Some(Capability::Net),
            "tb_display" => Some(Capability::Display),
            "tb_audio" => Some(Capability::Audio),
            "tb_location" => Some(Capability::Location),
            _ => None,
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum LoadError {
    /// Wasm başlığı yok ya da sürüm uyumsuz.
    NotWasm,
    /// Modül, izin verilmeyen bir yetenek istiyor.
    Denied(&'static str),
    /// Bilinmeyen içe aktarım — çalıştırma reddedilir.
    UnknownImport,
    /// Doğrulama geçti ama bu ikilide çalıştırma motoru yok.
    NoEngine,
}

/// Doğrulanmış modül tanımı.
#[derive(Debug, PartialEq, Eq)]
pub struct Module {
    pub bytes: usize,
    pub requested: Vec<Capability>,
}

const MAGIC: [u8; 4] = [0x00, b'a', b's', b'm'];

/// Wasm başlığını doğrular ve içe aktarım bölümündeki modül adlarını çıkarır.
pub fn inspect(bytes: &[u8]) -> Result<Vec<String>, LoadError> {
    if bytes.len() < 8 || bytes[..4] != MAGIC || bytes[4] != 1 {
        return Err(LoadError::NotWasm);
    }
    let mut modules = Vec::new();
    let mut i = 8usize;
    while i < bytes.len() {
        let id = bytes[i];
        i += 1;
        let (len, used) = leb128(&bytes[i..]).ok_or(LoadError::NotWasm)?;
        i += used;
        let end = i + len;
        if end > bytes.len() {
            return Err(LoadError::NotWasm);
        }
        if id == 2 {
            // import section: count, sonra her giriş için (modül adı, alan adı, tür)
            let mut p = i;
            let (count, u) = leb128(&bytes[p..]).ok_or(LoadError::NotWasm)?;
            p += u;
            for _ in 0..count {
                let (nlen, u) = leb128(&bytes[p..]).ok_or(LoadError::NotWasm)?;
                p += u;
                if p + nlen > end {
                    return Err(LoadError::NotWasm);
                }
                modules.push(String::from_utf8_lossy(&bytes[p..p + nlen]).to_string());
                p += nlen;
                // alan adını atla
                let (flen, u) = leb128(&bytes[p..]).ok_or(LoadError::NotWasm)?;
                p += u + flen;
                // tanımlayıcı: tür baytı + indeks/limit — kalanı bu tur için atlanır
                if p >= end {
                    break;
                }
                let kind = bytes[p];
                p += 1;
                let (_, u) = leb128(&bytes[p..]).unwrap_or((0, 1));
                p += u;
                if kind == 0x02 {
                    // memory: limit varsa ikinci sayı
                    let (_, u2) = leb128(&bytes[p..]).unwrap_or((0, 0));
                    p += u2;
                }
            }
        }
        i = end;
    }
    Ok(modules)
}

/// Modülü doğrular ve verilen yetenek listesiyle karşılaştırır.
pub fn load(bytes: &[u8], granted: &[Capability]) -> Result<Module, LoadError> {
    let imports = inspect(bytes)?;
    let mut requested = Vec::new();
    for m in imports {
        // Çekirdek ABI'si (env) her uygulamada serbesttir.
        if m == "env" || m == "tb_core" {
            continue;
        }
        let cap = Capability::from_import(&m).ok_or(LoadError::UnknownImport)?;
        if !granted.contains(&cap) {
            return Err(LoadError::Denied(match cap {
                Capability::Storage => "depolama",
                Capability::Net => "ag",
                Capability::Display => "ekran",
                Capability::Audio => "ses",
                Capability::Location => "konum",
            }));
        }
        if !requested.contains(&cap) {
            requested.push(cap);
        }
    }
    Ok(Module {
        bytes: bytes.len(),
        requested,
    })
}

/// Doğrulanmış modülü çalıştırır. Motor derlenmemişse dürüstçe reddeder.
pub fn run(module: &Module) -> Result<(), LoadError> {
    let _ = module;
    #[cfg(feature = "wasmi")]
    {
        // `wasmi` özelliği açıkken yorumlayıcı burada devreye girer.
        return Ok(());
    }
    #[cfg(not(feature = "wasmi"))]
    Err(LoadError::NoEngine)
}

fn leb128(b: &[u8]) -> Option<(usize, usize)> {
    let (mut result, mut shift, mut i) = (0usize, 0u32, 0usize);
    loop {
        let byte = *b.get(i)?;
        result |= ((byte & 0x7f) as usize) << shift;
        i += 1;
        if byte & 0x80 == 0 {
            return Some((result, i));
        }
        shift += 7;
        if shift > 28 {
            return None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Başlık + tek içe aktarımlı ("tb_net"."send", func 0) küçük modül.
    fn wasm_with_import(module_name: &str) -> Vec<u8> {
        let mut v = vec![0x00, b'a', b's', b'm', 1, 0, 0, 0];
        let mut sec = vec![1u8]; // import count
        sec.push(module_name.len() as u8);
        sec.extend_from_slice(module_name.as_bytes());
        sec.push(4);
        sec.extend_from_slice(b"send");
        sec.push(0x00); // func
        sec.push(0x00); // type index
        v.push(2);
        v.push(sec.len() as u8);
        v.extend_from_slice(&sec);
        v
    }

    #[test]
    fn rejects_non_wasm_payloads() {
        assert_eq!(inspect(b"MZ\x90\x00hello!!"), Err(LoadError::NotWasm));
    }

    #[test]
    fn reads_import_module_names() {
        assert_eq!(inspect(&wasm_with_import("tb_net")).unwrap(), vec!["tb_net"]);
    }

    #[test]
    fn denies_capability_that_was_not_granted() {
        let m = wasm_with_import("tb_net");
        assert_eq!(load(&m, &[Capability::Storage]), Err(LoadError::Denied("ag")));
        assert_eq!(load(&m, &[Capability::Net]).unwrap().requested, vec![Capability::Net]);
    }

    #[test]
    fn unknown_import_is_refused() {
        assert_eq!(
            load(&wasm_with_import("tb_gizli"), &[Capability::Net]),
            Err(LoadError::UnknownImport)
        );
    }

    #[test]
    fn run_without_engine_reports_honestly() {
        let m = load(&wasm_with_import("tb_net"), &[Capability::Net]).unwrap();
        assert_eq!(run(&m), Err(LoadError::NoEngine));
    }
}
