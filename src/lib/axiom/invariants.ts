/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * DEĞİŞMEZ (INVARIANT) EŞLEŞTİRME MOTORU
 * ------------------------------------------------------------------
 * Korunum yasaları, bilgi teorisi sınırları ve emniyet standartları
 * burada makine okunur kayıtlar olarak tutulur. Motor girdiyi bu
 * kayıtlarla eşleştirir ve üç sonuçtan birini üretir:
 *
 *   ilgili      → iddia bu değişmezin alanına giriyor
 *   çelişki     → iddia bu değişmezle çelişiyor görünüyor
 *   ilgisiz     → eşleşme yok
 *
 * Simgesel doğrulama (Z3 / Lean 4) bağlıysa mühürlü karar üretir;
 * ikili yoksa buradaki değişmezler yerel kural kapısı olarak çalışır.
 */

import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import type { ScienceId } from "@/lib/axiom/registry";

export type Verdict = "ilgili" | "celiski" | "ilgisiz";

export type Invariant = {
  id: string;
  label: string;
  /** Biçimsel ya da yarı-biçimsel ifade. */
  statement: string;
  category: ScienceId;
  /** Kaynak kayıt defteri / standart. */
  ledger: string;
  /** Alanı tetikleyen anahtarlar (küçük harf). */
  triggers: string[];
  /** Çelişki şüphesi doğuran kalıplar. */
  conflicts: RegExp[];
  /** Çelişki durumunda gösterilecek açıklama. */
  conflictNote: string;
};

export const INVARIANTS: Invariant[] = [
  {
    id: "thermo.0",
    label: "Termodinamiğin 0. kanunu",
    statement: "A ≡ B ve B ≡ C ise A ≡ C (ısıl denge geçişlidir).",
    category: "physical",
    ledger: "BIPM / CODATA",
    triggers: ["ısıl", "denge", "sıcaklık", "temperature", "thermal"],
    conflicts: [/ısıl denge geçişli değil/i, /thermal equilibrium is not transitive/i],
    conflictNote: "Isıl dengenin geçişliliği reddediliyor.",
  },
  {
    id: "thermo.1",
    label: "Termodinamiğin 1. kanunu (enerji korunumu)",
    statement: "dU = Q − W; kapalı sistemde enerji ne yaratılır ne yok edilir.",
    category: "physical",
    ledger: "BIPM / CODATA",
    triggers: ["enerji", "energy", "iş", "ısı", "korunum", "joule", "watt", "kwh"],
    conflicts: [
      /sonsuz enerji/i,
      /bedava enerji/i,
      /enerji (yarat|üret)ır?(ken)?\s*(yoktan|hiçten)/i,
      /yoktan enerji/i,
      /perpetu[uo]m|devridaim/i,
      /free energy (device|machine)/i,
      /out of nothing/i,
    ],
    conflictNote: "Yoktan enerji üretimi / devridaim iddiası enerji korunumuyla çelişir.",
  },
  {
    id: "thermo.2",
    label: "Termodinamiğin 2. kanunu (entropi)",
    statement: "Yalıtılmış sistemde entropi azalmaz; ısı makinesi verimi η < 1.",
    category: "physical",
    ledger: "BIPM / CODATA",
    triggers: ["entropi", "entropy", "verim", "efficiency", "ısı makinesi", "soğutma"],
    conflicts: [
      /%\s*(100|1[0-9][0-9])\s*verim/i,
      /verim(i|imiz)?\s*%\s*(100|1[0-9][0-9])/i,
      /100%\s*efficien/i,
      /entropi\s*(kendiliğinden\s*)?azal/i,
      /entropy decreases/i,
    ],
    conflictNote: "%100 (veya üzeri) verim ya da kendiliğinden azalan entropi iddiası.",
  },
  {
    id: "thermo.3",
    label: "Termodinamiğin 3. kanunu",
    statement: "Sonlu işlemle mutlak sıfır (0 K) sıcaklığına ulaşılamaz.",
    category: "physical",
    ledger: "BIPM / CODATA",
    triggers: ["mutlak sıfır", "0 k", "kelvin", "absolute zero"],
    conflicts: [/mutlak sıfıra ulaş/i, /reach(es|ed)? absolute zero/i, /0\s*k'?ye\s*(iner|ulaş)/i],
    conflictNote: "Mutlak sıfıra ulaşma iddiası 3. kanunla çelişir.",
  },
  {
    id: "cons.momentum",
    label: "Momentum ve açısal momentum korunumu",
    statement: "Dış kuvvet yoksa Σp ve ΣL sabittir.",
    category: "physical",
    ledger: "NIST SRD",
    triggers: ["momentum", "impuls", "açısal", "angular", "itki", "tepki"],
    conflicts: [/tepkisiz itki/i, /reactionless (drive|thrust)/i, /momentum korunmaz/i],
    conflictNote: "Tepkisiz itki iddiası momentum korunumuyla çelişir.",
  },
  {
    id: "cons.charge",
    label: "Elektrik yükü korunumu",
    statement: "Kapalı sistemde toplam elektrik yükü değişmez.",
    category: "physical",
    ledger: "NIST SRD",
    triggers: ["yük", "charge", "elektron", "iyon", "coulomb", "volt", "amper"],
    conflicts: [/yük yoktan/i, /charge (is )?created from nothing/i],
    conflictNote: "Yükün yoktan var olduğu iddiası.",
  },
  {
    id: "rel.lightspeed",
    label: "Işık hızı sınırı",
    statement: "Bilgi ve kütleli cisim c = 299 792 458 m/s hızını aşamaz.",
    category: "physical",
    ledger: "BIPM / CODATA",
    triggers: ["ışık hızı", "c", "görelilik", "relativity", "lightspeed", "uzay"],
    conflicts: [/ışıktan (daha )?hızlı/i, /faster than light/i, /anında iletişim/i],
    conflictNote: "Işıktan hızlı bilgi aktarımı iddiası.",
  },
  {
    id: "info.shannon",
    label: "Shannon kanal kapasitesi",
    statement: "C = B · log2(1 + S/N); hiçbir kanal bu sınırın üstünde hatasız veri taşımaz.",
    category: "formal",
    ledger: "IEEE SA / Shannon 1948",
    triggers: [
      "bant",
      "bandwidth",
      "kanal",
      "channel",
      "gürültü",
      "snr",
      "bps",
      "mbps",
      "kapasite",
    ],
    conflicts: [/sınırsız bant/i, /unlimited bandwidth/i, /kapasite sınırı yok/i],
    conflictNote: "Sınırsız kanal kapasitesi iddiası Shannon sınırıyla çelişir.",
  },
  {
    id: "info.nyquist",
    label: "Nyquist-Shannon örnekleme teoremi",
    statement: "Örnekleme frekansı sinyal bant genişliğinin en az iki katı olmalıdır.",
    category: "formal",
    ledger: "IEEE SA",
    triggers: ["örnekleme", "sampling", "frekans", "hz", "khz", "aliasing"],
    conflicts: [/yarı frekansla (tam|kayıpsız)/i, /below nyquist.*perfect/i],
    conflictNote: "Nyquist sınırının altında kayıpsız yeniden kurulum iddiası.",
  },
  {
    id: "info.kolmogorov",
    label: "Kolmogorov karmaşıklığı",
    statement: "Rastgele veri, kendi uzunluğunun altına kayıpsız sıkıştırılamaz.",
    category: "formal",
    ledger: "Metamath / Bilgi teorisi",
    triggers: ["sıkıştırma", "compression", "rastgele", "entropi", "kolmogorov"],
    conflicts: [/kayıpsız.*(sonsuz|%\s*9\d).*sıkış/i, /her (veriyi|dosyayı).*kayıpsız.*yarı/i],
    conflictNote: "Sınırsız kayıpsız sıkıştırma iddiası.",
  },
  {
    id: "formal.halting",
    label: "Durma problemi",
    statement: "Genel durma problemini çözen bir algoritma yoktur (Turing 1936).",
    category: "formal",
    ledger: "Lean 4 Mathlib",
    triggers: ["durma", "halting", "algoritma", "sonsuz döngü", "karar verilebilir"],
    conflicts: [/her program(ın|ı).*durup durmadığını.*belirle/i, /solves the halting problem/i],
    conflictNote: "Genel durma problemini çözme iddiası.",
  },
  {
    id: "formal.godel",
    label: "Gödel eksiklik teoremleri",
    statement: "Tutarlı ve yeterince güçlü sistemde kanıtlanamayan doğru önermeler vardır.",
    category: "formal",
    ledger: "Metamath / Lean 4 Mathlib",
    triggers: ["gödel", "eksiklik", "tutarlı", "aksiyom", "kanıtlanabilir", "incompleteness"],
    conflicts: [/her (doğru )?önerme kanıtlanabilir/i, /complete and consistent/i],
    conflictNote: "Tam ve tutarlı biçimsel sistem iddiası eksiklik teoremiyle çelişir.",
  },
  {
    id: "safety.do178c",
    label: "DO-178C havacılık yazılım emniyeti",
    statement: "Uçuş kritik yazılım A–E emniyet seviyelerine göre izlenebilir biçimde doğrulanır.",
    category: "engineering",
    ledger: "RTCA DO-178C",
    triggers: ["uçuş", "aviyonik", "havacılık", "do-178", "flight", "avionics"],
    conflicts: [/doğrulama (gerekmez|yapılmadan).*(uç|flight)/i, /without certification.*flight/i],
    conflictNote: "Uçuş kritik yazılımın doğrulama olmadan kullanımı iddiası.",
  },
  {
    id: "safety.iso26262",
    label: "ISO 26262 otomotiv fonksiyonel emniyeti",
    statement: "Araç fonksiyonları ASIL A–D sınıflandırmasıyla risk azaltımına tabidir.",
    category: "engineering",
    ledger: "ISO 26262",
    triggers: ["araç", "otomotiv", "asil", "fren", "sürüş", "automotive", "iso 26262"],
    conflicts: [/fren.*(yedek|doğrulama) (yok|gerekmez)/i, /no redundancy.*brake/i],
    conflictNote: "Emniyet kritik araç fonksiyonunda yedeklilik/doğrulama reddi.",
  },
  {
    id: "safety.iec61508",
    label: "IEC 61508 fonksiyonel güvenlik",
    statement: "Emniyet fonksiyonları SIL 1–4 hedef hata oranlarıyla tasarlanır.",
    category: "engineering",
    ledger: "IEC 61508",
    triggers: ["sil", "emniyet", "endüstriyel", "plc", "güvenlik fonksiyonu", "61508"],
    conflicts: [/sil\s*4.*tek kanal/i, /single channel.*sil\s*[34]/i],
    conflictNote: "Yüksek SIL hedefinin tek kanallı mimariyle karşılanması iddiası.",
  },
  {
    id: "ethics.ieee7000",
    label: "IEEE 7000 etik tasarım süreci",
    statement: "Sistem tasarımında değer/etki analizi izlenebilir biçimde belgelenir.",
    category: "engineering",
    ledger: "IEEE 7000",
    triggers: ["etik", "mahremiyet", "önyargı", "şeffaflık", "ethics", "privacy", "bias"],
    conflicts: [/etik (analiz|değerlendirme) (gerekmez|yok)/i, /ignore privacy/i],
    conflictNote: "Etki/etik analizinin atlanması iddiası.",
  },
  {
    id: "sec.nist80053",
    label: "NIST SP 800-53 güvenlik denetimleri",
    statement: "Erişim denetimi, günlükleme ve kriptografik koruma zorunlu denetim aileleridir.",
    category: "engineering",
    ledger: "NIST SP 800-53",
    triggers: [
      "şifreleme",
      "erişim",
      "kimlik",
      "anahtar",
      "log",
      "denetim",
      "encryption",
      "access",
    ],
    conflicts: [
      /şifreleme (kapat|gerekmez)/i,
      /plaintext (password|şifre)/i,
      /disable encryption/i,
    ],
    conflictNote: "Şifreleme veya erişim denetiminin devre dışı bırakılması iddiası.",
  },
];

/**
 * Eşleşmede taşınan değişmez özeti. Düzenli ifadeler (conflicts) dışarı
 * verilmez: sonuç Web Worker sınırından geçtiği için yalnız yapılandırılmış
 * klonlanabilir alanlar bulunur.
 */
export type InvariantView = {
  id: string;
  label: string;
  statement: string;
  category: Invariant["category"];
  ledger: string;
};

export type InvariantMatch = {
  invariant: InvariantView;
  verdict: Verdict;
  /** Eşleşmeyi doğuran anahtarlar. */
  hits: string[];
  note: string;
};

/**
 * Ara gösterim + özgün metni değişmez kayıtlarıyla eşleştirir.
 * Sonuç önce çelişki şüphesi, sonra ilgi derecesine göre sıralanır.
 */
export function matchInvariants(ir: AxiomIr, text: string): InvariantMatch[] {
  const lower = text.toLowerCase();
  const out: InvariantMatch[] = [];

  for (const inv of INVARIANTS) {
    const hits = inv.triggers.filter(
      (t) =>
        ir.concepts.includes(t) ||
        lower.includes(t) ||
        ir.quantities.some((q) => q.unit?.toLowerCase() === t),
    );
    const conflict = inv.conflicts.some((re) => re.test(text));
    if (!hits.length && !conflict) continue;
    out.push({
      invariant: {
        id: inv.id,
        label: inv.label,
        statement: inv.statement,
        category: inv.category,
        ledger: inv.ledger,
      },
      verdict: conflict ? "celiski" : "ilgili",
      hits,
      note: conflict
        ? inv.conflictNote
        : `İddia bu değişmezin alanına giriyor (${hits.slice(0, 3).join(", ")}).`,
    });
  }

  return out.sort((a, b) => {
    if (a.verdict !== b.verdict) return a.verdict === "celiski" ? -1 : 1;
    return b.hits.length - a.hits.length;
  });
}
