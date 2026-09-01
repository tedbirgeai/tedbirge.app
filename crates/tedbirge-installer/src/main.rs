//! `tedbirge-install` — TUI kurulum sihirbazı (FAZ 9)
//! Kullanım:
//!   tedbirge-install                → diskleri listeler, seçim ister
//!   tedbirge-install --dry-run      → yalnız planı yazar, diske dokunmaz
//!   tedbirge-install --device sda --yes

use std::io::{self, Write};
use std::time::{SystemTime, UNIX_EPOCH};

use tedbirge_installer::{apply, candidates, plan};

fn arg(args: &[String], key: &str) -> Option<String> {
    args.iter()
        .position(|a| a == key)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

fn main() -> io::Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let dry = args.iter().any(|a| a == "--dry-run");
    let yes = args.iter().any(|a| a == "--yes");
    let source = arg(&args, "--source").unwrap_or_else(|| "/opt/tedbirge".into());

    println!("Tedbirge® WebOS kurulumu");
    println!("------------------------");

    let disks = candidates(arg(&args, "--live").as_deref());
    if disks.is_empty() {
        eprintln!("! Uygun disk bulunamadi (en az 4 GB gerekli).");
        return Ok(());
    }
    for (i, d) in disks.iter().enumerate() {
        println!(
            "  [{i}] {:<10} {:>6} GB  {}{}",
            d.name,
            d.bytes / 1_073_741_824,
            if d.removable { "cikarilabilir " } else { "" },
            if d.rotational { "HDD" } else { "SSD/flash" }
        );
    }

    let chosen = match arg(&args, "--device") {
        Some(name) => disks.iter().find(|d| d.name == name).cloned(),
        None => {
            print!("Hedef disk numarasi: ");
            io::stdout().flush()?;
            let mut line = String::new();
            io::stdin().read_line(&mut line)?;
            line.trim().parse::<usize>().ok().and_then(|i| disks.get(i).cloned())
        }
    };
    let Some(disk) = chosen else {
        eprintln!("! Gecerli bir disk secilmedi.");
        return Ok(());
    };

    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1);
    let p = match plan(&disk, seed) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("! {e}");
            return Ok(());
        }
    };

    println!("\nPlan · {} · dugum {}", p.device, p.node_id);
    for part in &p.partitions {
        println!(
            "  {}{} {:<6} {} ({} MB'dan itibaren)",
            p.device,
            part.number,
            part.label,
            part.fstype,
            part.start_mb
        );
    }

    if !dry && !yes {
        print!("\nDIKKAT: {} uzerindeki TUM veriler silinecek. Onayliyor musunuz? (evet/hayir): ", p.device);
        io::stdout().flush()?;
        let mut c = String::new();
        io::stdin().read_line(&mut c)?;
        if c.trim().to_lowercase() != "evet" {
            println!("Vazgecildi.");
            return Ok(());
        }
    }

    match apply(&p, &source, dry) {
        Ok(steps) => {
            println!("\n{}", if dry { "Kuru calistirma adimlari:" } else { "Tamamlanan adimlar:" });
            for s in steps {
                println!("  ✓ {s}");
            }
            if !dry {
                println!("\nKurulum tamam. USB'yi cikarip yeniden baslatin.");
            }
        }
        Err(e) => eprintln!("! Kurulum durdu: {e}"),
    }
    Ok(())
}
