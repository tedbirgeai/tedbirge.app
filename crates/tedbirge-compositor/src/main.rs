//! `tedbirge-compositor` — tarayıcısız kiosk girişi (FAZ 7)
//! Kullanım: tedbirge-compositor [--probe] [--shell http://127.0.0.1:8377/]

use tedbirge_compositor::Compositor;
use tedbirge_hal_linux::drm::Framebuffer;
use tedbirge_hal_linux::input::InputHub;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let report = tedbirge_hal_linux::probe();
    println!(
        "Tedbirge kompozitor · ekran {} {}x{} · girdi {} aygit · ag {} · disk {} · ses {} · seri {}",
        report.display,
        report.width,
        report.height,
        report.input_devices,
        report.interfaces,
        report.disks,
        if report.audio { "var" } else { "yok" },
        if report.serial { "var" } else { "yok" },
    );
    if args.iter().any(|a| a == "--probe") {
        return;
    }

    let fb = Framebuffer::open();
    let mut hub = InputHub::open(fb.width as i32, fb.height as i32);
    let mut c = Compositor::new(fb);
    c.stack.open("tedbirge", "Tedbirge® WebOS");
    c.run(&mut hub);
}
