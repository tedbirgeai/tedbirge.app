//! TEDBİRGE OS KURULUM SİHİRBAZI (FAZ 9)
//! -----------------------------------------------------------------
//! Live imajdan `tedbirge-install` ile çağrılır. Plan üretimi (saf ve
//! test edilebilir) ile uygulama (kök yetkisi ister) birbirinden
//! ayrılmıştır: `plan()` hiçbir şeye dokunmaz, `apply()` diski yazar.
//!
//! Düzen: GPT + ESP(512 MB, FAT32) + kök(ext4) + kalıcı /var/tedbirge

use std::io;
use std::process::Command;

use tedbirge_hal_linux::storage::{block_devices, BlockDevice};

pub const ESP_MB: u64 = 512;
pub const MIN_DISK_BYTES: u64 = 4 * 1024 * 1024 * 1024;

/// Kuruluma uygun diskler: yeterince büyük ve canlı ortamın kendisi değil.
pub fn candidates(live_device: Option<&str>) -> Vec<BlockDevice> {
    block_devices()
        .into_iter()
        .filter(|d| d.bytes >= MIN_DISK_BYTES && Some(d.name.as_str()) != live_device)
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Partition {
    pub number: u8,
    pub label: &'static str,
    pub fstype: &'static str,
    pub start_mb: u64,
    pub size_mb: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Plan {
    pub device: String,
    pub partitions: Vec<Partition>,
    pub node_id: String,
}

/// Disk düzenini hesaplar; hiçbir yan etkisi yoktur.
pub fn plan(device: &BlockDevice, seed: u64) -> Result<Plan, String> {
    if device.bytes < MIN_DISK_BYTES {
        return Err(format!(
            "{} cok kucuk ({} MB) — en az {} GB gerekli",
            device.name,
            device.bytes / 1_048_576,
            MIN_DISK_BYTES / 1_073_741_824
        ));
    }
    Ok(Plan {
        device: device.path(),
        partitions: vec![
            Partition {
                number: 1,
                label: "TBESP",
                fstype: "fat32",
                start_mb: 1,
                size_mb: Some(ESP_MB),
            },
            Partition {
                number: 2,
                label: "TBROOT",
                fstype: "ext4",
                start_mb: 1 + ESP_MB,
                size_mb: None, // diskin sonuna kadar
            },
        ],
        node_id: node_id(seed),
    })
}

/// İlk açılış kimliği — kabuğun TBG-XXXX biçimiyle aynı.
pub fn node_id(seed: u64) -> String {
    const A: &[u8] = b"0123456789ABCDEFGHJKLMNPRSTUVYZ";
    let mut h = seed ^ 0x9E37_79B9_7F4A_7C15;
    let mut s = String::from("TBG-");
    for _ in 0..4 {
        h = h.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        s.push(A[(h >> 33) as usize % A.len()] as char);
    }
    s
}

/// Planı diske uygular. Kök yetkisi ve `sgdisk`/`mkfs` araçları ister.
pub fn apply(plan: &Plan, source_root: &str, dry_run: bool) -> io::Result<Vec<String>> {
    let mut steps = Vec::new();
    let mut run = |desc: String, cmd: Vec<&str>| -> io::Result<()> {
        steps.push(desc);
        if dry_run {
            return Ok(());
        }
        let status = Command::new(cmd[0]).args(&cmd[1..]).status()?;
        if !status.success() {
            return Err(io::Error::other(format!("adim basarisiz: {:?}", cmd)));
        }
        Ok(())
    };

    let dev = plan.device.as_str();
    run(format!("{dev}: GPT tablosu"), vec!["sgdisk", "--zap-all", dev])?;
    run(
        format!("{dev}1: ESP {ESP_MB} MB"),
        vec!["sgdisk", "-n", "1:1MiB:+512MiB", "-t", "1:ef00", dev],
    )?;
    run(
        format!("{dev}2: kok (kalan alan)"),
        vec!["sgdisk", "-n", "2:0:0", "-t", "2:8300", dev],
    )?;
    run(
        format!("{dev}1: FAT32 bicimlendirme"),
        vec!["mkfs.vfat", "-n", "TBESP", &format!("{dev}1")],
    )?;
    run(
        format!("{dev}2: ext4 bicimlendirme"),
        vec!["mkfs.ext4", "-F", "-L", "TBROOT", &format!("{dev}2")],
    )?;
    run(
        "kok agac kopyalama".into(),
        vec!["cp", "-a", source_root, "/mnt/tedbirge-target"],
    )?;
    run(
        "UEFI yukleyici yazimi".into(),
        vec![
            "grub-install",
            "--target=x86_64-efi",
            "--efi-directory=/mnt/tedbirge-target/boot/efi",
            "--removable",
        ],
    )?;
    steps.push(format!("dugum kimligi: {}", plan.node_id));
    Ok(steps)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn disk(name: &str, gb: u64) -> BlockDevice {
        BlockDevice {
            name: name.into(),
            bytes: gb * 1_073_741_824,
            removable: false,
            rotational: false,
        }
    }

    #[test]
    fn plan_lays_out_esp_and_root() {
        let p = plan(&disk("nvme0n1", 64), 42).unwrap();
        assert_eq!(p.device, "/dev/nvme0n1");
        assert_eq!(p.partitions[0].fstype, "fat32");
        assert_eq!(p.partitions[0].size_mb, Some(ESP_MB));
        assert_eq!(p.partitions[1].fstype, "ext4");
        assert_eq!(p.partitions[1].size_mb, None);
        assert_eq!(p.partitions[1].start_mb, 1 + ESP_MB);
    }

    #[test]
    fn small_disks_are_rejected() {
        assert!(plan(&disk("sdb", 2), 1).is_err());
    }

    #[test]
    fn node_id_is_stable_and_well_formed() {
        let a = node_id(99);
        assert_eq!(a, node_id(99));
        assert!(a.starts_with("TBG-"));
        assert_eq!(a.len(), 8);
    }

    #[test]
    fn dry_run_touches_nothing_and_lists_every_step() {
        let p = plan(&disk("sda", 16), 7).unwrap();
        let steps = apply(&p, "/opt/tedbirge", true).unwrap();
        assert!(steps.len() >= 7);
        assert!(steps.last().unwrap().contains("TBG-"));
    }
}
