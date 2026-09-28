use std::io::{BufRead, BufReader, Read, Write};
use std::os::unix::net::{UnixDatagram, UnixListener};
use std::time::{Duration, Instant};
use tedbirge_truthd::{handle, MAX_REQUEST_BYTES};

fn notify(msg: &str) {
    if let Ok(path) = std::env::var("NOTIFY_SOCKET") {
        if let Ok(s) = UnixDatagram::unbound() {
            let _ = s.send_to(msg.as_bytes(), path);
        }
    }
}

fn main() {
    let mut args = std::env::args().skip(1);
    let mut path = "/run/tedbirge/tedbirge_truth.sock".to_string();
    while let Some(a) = args.next() {
        if a == "--socket" {
            if let Some(p) = args.next() {
                path = p;
            }
        }
    }
    let _ = std::fs::remove_file(&path);
    let listener = UnixListener::bind(&path).expect("soket açılamadı");
    notify("READY=1");
    std::thread::spawn(|| loop {
        notify("WATCHDOG=1");
        std::thread::sleep(Duration::from_secs(4));
    });
    for stream in listener.incoming().flatten() {
        std::thread::spawn(move || {
            let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
            let mut w = match stream.try_clone() { Ok(w) => w, Err(_) => return };
            let mut r = BufReader::new(stream.take((MAX_REQUEST_BYTES as u64 + 1) * 64));
            let mut line = String::new();
            while r.read_line(&mut line).map(|n| n > 0).unwrap_or(false) {
                let out = handle(line.trim_end(), Instant::now());
                if writeln!(w, "{out}").is_err() { break; }
                line.clear();
            }
        });
    }
}
