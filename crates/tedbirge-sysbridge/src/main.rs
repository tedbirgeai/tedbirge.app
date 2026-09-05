//! Yerel güç köprüsü giriş noktası.
//! Kullanım: `tedbirge-sysbridge [--port 8378]`

use tedbirge_sysbridge::serve;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let mut port: u16 = 8378;
    let mut i = 1;
    while i < args.len() {
        if args[i] == "--port" {
            if let Some(v) = args.get(i + 1).and_then(|s| s.parse().ok()) {
                port = v;
            }
            i += 2;
            continue;
        }
        i += 1;
    }
    if let Err(e) = serve(port) {
        eprintln!("tedbirge-sysbridge baslatilamadi: {e}");
        std::process::exit(1);
    }
}
