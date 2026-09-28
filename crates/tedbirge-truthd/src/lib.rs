//! AXIOM doğrulama çekirdeği (yerel, bağımlılıksız).
//! Gerçek çözücü yoktur: kapalı çelişki → 409_REFUTED, aksi → 422_UNDECIDED.
//! Hiçbir koşulda 200_PROVEN veya mühür üretilmez.

use std::time::{Duration, Instant};

pub const MAX_REQUEST_BYTES: usize = 16 * 1024;
pub const BUDGET: Duration = Duration::from_millis(500);

fn num(s: &str) -> Option<f64> {
    s.trim().parse::<f64>().ok()
}

fn norm(s: &str) -> String {
    s.to_lowercase().split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Kapalı çelişki denetimi: sayısal eşitsizlik, `p ∧ ¬p`.
pub fn contradiction(claim: &str) -> Option<&'static str> {
    let c = claim.trim();
    if let Some((l, r)) = c.split_once('=') {
        if !l.ends_with(['!', '<', '>']) && !r.starts_with('=') {
            if let (Some(a), Some(b)) = (num(l), num(r)) {
                if (a - b).abs() > f64::EPSILON {
                    return Some("sayısal eşitlik yanlış");
                }
            }
        }
    }
    for sep in ["∧", "&&", " and ", " ve "] {
        if let Some((l, r)) = c.split_once(sep) {
            let (l, r) = (norm(l), norm(r));
            for neg in ["¬", "!", "not ", "değil "] {
                if r.strip_prefix(neg).map(str::trim) == Some(l.as_str())
                    || l.strip_prefix(neg).map(str::trim) == Some(r.as_str())
                {
                    return Some("önerme ve değili birlikte");
                }
            }
        }
    }
    None
}

fn escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

/// `"claim":"..."` alanını çıkarır (kaçışlı tırnak desteğiyle).
pub fn extract_claim(line: &str) -> Option<String> {
    let i = line.find("\"claim\"")?;
    let rest = &line[i + 7..];
    let rest = rest.trim_start().strip_prefix(':')?.trim_start().strip_prefix('"')?;
    let mut out = String::new();
    let mut chars = rest.chars();
    while let Some(ch) = chars.next() {
        match ch {
            '\\' => out.push(chars.next()?),
            '"' => return Some(out),
            c => out.push(c),
        }
    }
    None
}

/// Tek NDJSON isteğini yanıtlar. Girdi metni yanıta geri yazılmaz.
pub fn handle(line: &str, started: Instant) -> String {
    if line.len() > MAX_REQUEST_BYTES {
        return r#"{"status":"413_TOO_LARGE","sealed":false}"#.to_string();
    }
    let Some(claim) = extract_claim(line) else {
        return r#"{"status":"400_BAD_REQUEST","sealed":false}"#.to_string();
    };
    let verdict = contradiction(&claim);
    if started.elapsed() > BUDGET {
        return r#"{"status":"504_TIMEOUT","sealed":false}"#.to_string();
    }
    match verdict {
        Some(why) => format!(r#"{{"status":"409_REFUTED","reason":"{}","sealed":false}}"#, escape(why)),
        None => r#"{"status":"422_UNDECIDED","reason":"çözücü yok","sealed":false}"#.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn refutes() {
        assert!(handle(r#"{"claim":"1 = 2"}"#, Instant::now()).contains("409_REFUTED"));
        assert!(handle(r#"{"claim":"p ∧ ¬p"}"#, Instant::now()).contains("409_REFUTED"));
    }
    #[test]
    fn undecided_never_proven() {
        let r = handle(r#"{"claim":"2 = 2"}"#, Instant::now());
        assert!(r.contains("422_UNDECIDED") && !r.contains("200"));
    }
    #[test]
    fn limits() {
        let big = format!(r#"{{"claim":"{}"}}"#, "a".repeat(MAX_REQUEST_BYTES));
        assert!(handle(&big, Instant::now()).contains("413"));
        let old = Instant::now() - Duration::from_millis(600);
        assert!(handle(r#"{"claim":"x"}"#, old).contains("504_TIMEOUT"));
        assert!(handle("{}", Instant::now()).contains("400"));
    }
}
