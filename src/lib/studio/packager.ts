/**
 * Wasm + tbapp.json → imzalı .tbapp paketi.
 */

import { parseTbApp, type TbAppManifest } from "@/apps/tbapp";
import { packageTrust, signPackage, type SignedTbApp } from "@/apps/package";
import type { StudioManifest } from "@/lib/studio/project";

export function wasmToDataUrl(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:application/wasm;base64,${btoa(bin)}`;
}

export function buildManifest(m: StudioManifest, wasm: Uint8Array): TbAppManifest {
  const pkg: TbAppManifest = {
    id: m.id,
    name: m.name,
    version: m.version,
    capabilities: m.capabilities,
    module: wasmToDataUrl(wasm),
    description: m.description ?? "AxiomStudio ile yerelde derlendi.",
  };
  // Aynı doğrulayıcıdan geçirilir: kurulumda reddedilecek paket burada durur.
  return parseTbApp(JSON.stringify(pkg));
}

export type Signer = (m: TbAppManifest) => Promise<SignedTbApp>;

/** Cihaz kimliğiyle imzalar. */
export async function deviceSigner(): Promise<Signer> {
  const { getBrowserNodeId } = await import("@/lib/browser-node");
  const { ensureIdentity } = await import("@/lib/crypto/identity");
  const nodeId = getBrowserNodeId();
  const id = await ensureIdentity(nodeId);
  return (m) => signPackage(nodeId, m, id.signPublic);
}

export async function packageProject(m: StudioManifest, wasm: Uint8Array, signer: Signer) {
  const signed = await signer(buildManifest(m, wasm));
  const trust = packageTrust(signed);
  return { pkg: signed, trust, text: `${JSON.stringify(signed, null, 2)}\n` };
}
