//! FAZ 6 — AĞ ARAYÜZÜ KEŞFİ (netlink / sysfs)
//! -----------------------------------------------------------------
//! Arayüzler `/sys/class/net` üzerinden okunur — netlink soketi
//! gerektirmez, konteynerde ve initramfs içinde de çalışır. Kablosuz
//! arayüzler `wireless/` dizininin varlığıyla ayırt edilir (nl80211
//! ailesiyle aynı sonuç, sıfır bağımlılık).

use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Iface {
    pub name: String,
    pub up: bool,
    pub wireless: bool,
    pub mac: String,
    pub mtu: u32,
}

fn read_trim(p: impl AsRef<Path>) -> Option<String> {
    std::fs::read_to_string(p).ok().map(|s| s.trim().to_string())
}

/// Tüm ağ arayüzlerini listeler (loopback hariç).
pub fn interfaces() -> Vec<Iface> {
    let mut out = Vec::new();
    let Ok(dir) = std::fs::read_dir("/sys/class/net") else {
        return out;
    };
    for e in dir.flatten() {
        let name = e.file_name().to_string_lossy().to_string();
        if name == "lo" {
            continue;
        }
        let base = e.path();
        out.push(Iface {
            up: read_trim(base.join("operstate")).as_deref() == Some("up"),
            wireless: base.join("wireless").exists() || base.join("phy80211").exists(),
            mac: read_trim(base.join("address")).unwrap_or_default(),
            mtu: read_trim(base.join("mtu"))
                .and_then(|s| s.parse().ok())
                .unwrap_or(1500),
            name,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

/// Mesh duyurusu için en uygun arayüz: önce ayakta olan kablosuz, sonra
/// ayakta olan herhangi biri.
pub fn preferred(ifaces: &[Iface]) -> Option<&Iface> {
    ifaces
        .iter()
        .find(|i| i.up && i.wireless)
        .or_else(|| ifaces.iter().find(|i| i.up))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn i(name: &str, up: bool, wireless: bool) -> Iface {
        Iface {
            name: name.into(),
            up,
            wireless,
            mac: "00:00:00:00:00:00".into(),
            mtu: 1500,
        }
    }

    #[test]
    fn wireless_up_wins_over_wired_up() {
        let list = vec![i("eth0", true, false), i("wlan0", true, true)];
        assert_eq!(preferred(&list).unwrap().name, "wlan0");
    }

    #[test]
    fn down_interfaces_are_never_chosen() {
        let list = vec![i("wlan0", false, true), i("eth0", true, false)];
        assert_eq!(preferred(&list).unwrap().name, "eth0");
        assert!(preferred(&[i("eth0", false, false)]).is_none());
    }
}
