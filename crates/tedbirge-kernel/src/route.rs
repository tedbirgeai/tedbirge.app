//! ÇEKİRDEK YÖNLENDİRME (Dijkstra) — Faz C
//! -----------------------------------------------------------------
//! TypeScript motoru (`src/lib/mesh-routing.ts`) referans uygulama
//! olarak kalır; bu modül birebir aynı maliyet fonksiyonunu ve aynı
//! ikili çerçeveyi (`src/kernel/route-codec.ts`) kullanır.
//!
//! İstek düzeni (küçük-endian):
//!   u16 düğüm sayısı, N × [u16 uzunluk + UTF-8 ad],
//!   u16 kenar sayısı, E × [u16 kaynak, u16 hedef, u8 taşıyıcı, u8 kalite],
//!   u16 kaynak, u16 hedef, u8 yarıçap
//!
//! Yanıt düzeni:
//!   u8 ulaşılabilir, u32 maliyet(×1000), u16 yol uzunluğu + adlar,
//!   u16 atlama sayısı + [ad, ad, u8 taşıyıcı, u8 kalite]

use alloc::vec;
use alloc::vec::Vec;

/// Taşıyıcı tablosu — sıralama `TRANSPORTS` dizisiyle birebir aynıdır.
/// (gecikme_ms, kbps, ceza)
const TRANSPORTS: [(f64, f64, f64); 10] = [
    (10.0, 50000.0, 0.0),   // openwrt-gateway
    (60.0, 20000.0, 0.0),   // cloud-webrtc
    (15.0, 40000.0, 0.0),   // lan-ws
    (2.0, 100000.0, 0.0),   // broadcast-channel
    (25.0, 25000.0, 0.1),   // wifi-direct
    (30.0, 8000.0, 0.1),    // mdns-udp
    (120.0, 100.0, 0.3),    // ble
    (900.0, 5.0, 0.6),      // lora-serial
    (60000.0, 1.0, 0.8),    // store-forward
    (3000.0, 50.0, 0.5),    // push-relay
];

#[derive(Clone, Copy)]
struct RawEdge {
    from: u16,
    to: u16,
    transport: u8,
    quality: u8,
}

/// Kenar maliyeti — TS `edgeCost()` ile birebir aynı formül.
fn edge_cost(transport: u8, quality: u8) -> f64 {
    let idx = (transport as usize).min(TRANSPORTS.len() - 1);
    let (latency, kbps, penalty) = TRANSPORTS[idx];
    let q = (quality as f64 / 255.0).clamp(0.05, 1.0);
    (latency + 8000.0 / kbps) * (1.0 + penalty) * (1.0 / q)
}

struct Reader<'a> {
    b: &'a [u8],
    o: usize,
}

impl<'a> Reader<'a> {
    fn u8(&mut self) -> u8 {
        let v = *self.b.get(self.o).unwrap_or(&0);
        self.o += 1;
        v
    }
    fn u16(&mut self) -> u16 {
        let lo = self.u8() as u16;
        let hi = self.u8() as u16;
        lo | (hi << 8)
    }
    fn bytes(&mut self, len: usize) -> &'a [u8] {
        let end = (self.o + len).min(self.b.len());
        let start = self.o.min(end);
        self.o = end;
        &self.b[start..end]
    }
    fn str(&mut self) -> &'a [u8] {
        let len = self.u16() as usize;
        self.bytes(len)
    }
    fn ok(&self) -> bool {
        self.o <= self.b.len()
    }
}

struct Writer {
    b: Vec<u8>,
}

impl Writer {
    fn new() -> Self {
        Writer { b: Vec::new() }
    }
    fn u8(&mut self, v: u8) {
        self.b.push(v);
    }
    fn u16(&mut self, v: u16) {
        self.b.push((v & 0xff) as u8);
        self.b.push((v >> 8) as u8);
    }
    fn u32(&mut self, v: u32) {
        for i in 0..4 {
            self.b.push(((v >> (8 * i)) & 0xff) as u8);
        }
    }
    fn str(&mut self, s: &[u8]) {
        self.u16(s.len() as u16);
        self.b.extend_from_slice(s);
    }
}

/// k-hop yerel alt grafik maskesi (TS `localSubgraph` ile aynı BFS).
fn reachable_mask(node_count: usize, edges: &[RawEdge], origin: usize, radius: u8) -> Vec<bool> {
    let hops = radius.max(1) as usize;
    let mut depth: Vec<i32> = vec![-1; node_count];
    if origin >= node_count {
        return vec![true; node_count];
    }
    depth[origin] = 0;
    let mut queue: Vec<usize> = vec![origin];
    let mut head = 0usize;
    while head < queue.len() {
        let node = queue[head];
        head += 1;
        let d = depth[node];
        if d as usize >= hops {
            continue;
        }
        for e in edges {
            let (a, b) = (e.from as usize, e.to as usize);
            let next = if a == node {
                b
            } else if b == node {
                a
            } else {
                continue;
            };
            if next >= node_count || depth[next] >= 0 {
                continue;
            }
            depth[next] = d + 1;
            queue.push(next);
        }
    }
    depth.iter().map(|d| *d >= 0).collect()
}

/// İkili istek tamponunu çözer, Dijkstra çalıştırır ve yanıt tamponu üretir.
pub fn solve(input: &[u8]) -> Vec<u8> {
    let mut r = Reader { b: input, o: 0 };
    let node_count = r.u16() as usize;
    let mut names: Vec<&[u8]> = Vec::with_capacity(node_count);
    for _ in 0..node_count {
        names.push(r.str());
    }
    let edge_count = r.u16() as usize;
    let mut edges: Vec<RawEdge> = Vec::with_capacity(edge_count);
    for _ in 0..edge_count {
        let from = r.u16();
        let to = r.u16();
        let transport = r.u8();
        let quality = r.u8();
        if (from as usize) < node_count && (to as usize) < node_count {
            edges.push(RawEdge {
                from,
                to,
                transport,
                quality,
            });
        }
    }
    let src = r.u16() as usize;
    let dst = r.u16() as usize;
    let radius = r.u8();

    if !r.ok() || src >= node_count || dst >= node_count {
        return unreachable_result();
    }

    // k-hop kapsam: hedef yarıçap dışındaysa tüm grafiğe düşülür.
    let mask = reachable_mask(node_count, &edges, src, radius);
    let scoped: Vec<RawEdge> = if mask.get(dst).copied().unwrap_or(false) {
        edges
            .iter()
            .copied()
            .filter(|e| mask[e.from as usize] && mask[e.to as usize])
            .collect()
    } else {
        edges.clone()
    };

    // Komşuluk listesi (taşıyıcılar çift yönlüdür).
    let mut adj: Vec<Vec<(usize, usize, bool)>> = vec![Vec::new(); node_count];
    for (i, e) in scoped.iter().enumerate() {
        adj[e.from as usize].push((e.to as usize, i, false));
        adj[e.to as usize].push((e.from as usize, i, true));
    }

    let inf = f64::INFINITY;
    let mut dist: Vec<f64> = vec![inf; node_count];
    let mut prev: Vec<Option<(usize, bool, usize)>> = vec![None; node_count]; // (edge idx, ters mi, önceki düğüm)
    let mut visited: Vec<bool> = vec![false; node_count];
    dist[src] = 0.0;

    loop {
        let mut current: Option<usize> = None;
        let mut best = inf;
        for n in 0..node_count {
            if visited[n] {
                continue;
            }
            if dist[n] < best {
                best = dist[n];
                current = Some(n);
            }
        }
        let Some(node) = current else { break };
        if node == dst {
            break;
        }
        visited[node] = true;
        for (next, ei, reversed) in adj[node].iter().copied() {
            if visited[next] {
                continue;
            }
            let e = scoped[ei];
            let cost = best + edge_cost(e.transport, e.quality);
            if cost < dist[next] {
                dist[next] = cost;
                prev[next] = Some((ei, reversed, node));
            }
        }
    }

    let total = dist[dst];
    if !total.is_finite() {
        return unreachable_result();
    }

    // Yolu geri sar.
    let mut chain: Vec<(usize, bool, usize)> = Vec::new();
    let mut cursor = dst;
    while cursor != src {
        let Some(step) = prev[cursor] else {
            return unreachable_result();
        };
        chain.push(step);
        cursor = step.2;
        if chain.len() > node_count {
            return unreachable_result();
        }
    }
    chain.reverse();

    let mut w = Writer::new();
    w.u8(1);
    let scaled = (total * 1000.0).round();
    w.u32(if scaled >= u32::MAX as f64 {
        u32::MAX - 1
    } else {
        scaled as u32
    });
    w.u16((chain.len() + 1) as u16);
    w.str(names[src]);
    for (ei, reversed, from_node) in chain.iter().copied() {
        let e = scoped[ei];
        let to_node = if reversed {
            e.from as usize
        } else {
            e.to as usize
        };
        let _ = from_node;
        w.str(names[to_node]);
    }
    w.u16(chain.len() as u16);
    for (ei, reversed, from_node) in chain.iter().copied() {
        let e = scoped[ei];
        let to_node = if reversed {
            e.from as usize
        } else {
            e.to as usize
        };
        w.str(names[from_node]);
        w.str(names[to_node]);
        w.u8(e.transport);
        w.u8(e.quality);
    }
    w.b
}

fn unreachable_result() -> Vec<u8> {
    let mut w = Writer::new();
    w.u8(0);
    w.u32(0xffff_ffff);
    w.u16(0);
    w.u16(0);
    w.b
}
