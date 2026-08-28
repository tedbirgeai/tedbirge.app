#!/usr/bin/env bash
# Tedbirge çekirdeği (Rust) → public/kernel/tedbirge_kernel.wasm
# Kullanım: bash scripts/build-kernel.sh
# Gereken: cargo + wasm32-unknown-unknown hedefi + lld
set -euo pipefail

cd "$(dirname "$0")/../crates/tedbirge-kernel"

# Faz C: varsayılan özellik `wasm` (no_std + alloc + dahili ayırıcı).
cargo build --release --target wasm32-unknown-unknown
cargo test --no-default-features --features std

cp target/wasm32-unknown-unknown/release/tedbirge_kernel.wasm \
   ../../public/kernel/tedbirge_kernel.wasm

echo "✓ public/kernel/tedbirge_kernel.wasm güncellendi"
