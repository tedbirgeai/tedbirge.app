/**
 * TERMİNAL SİSTEM KÖPRÜSÜ
 * ------------------------------------------------------------------
 * Komutların gerçek sistem katmanlarına (pencere yöneticisi, mesh,
 * çekirdek telemetrisi, WebGPU) eriştiği tek arayüz. Test ortamında
 * sahte bir köprü verilebilir. Ölçülemeyen değerler `null` döner ve
 * arayüzde "ölçülemiyor" olarak yazılır — asla uydurulmaz.
 */

export type ProcInfo = { pid: number; name: string; appId: string; memMb: number | null };

export type PeerLink = { id: string; rttMs: number | null; kbps: number | null };

export type MeshInfo = {
  nodeId: string | null;
  mode: string;
  peers: PeerLink[];
};

export type GpuInfo = { adapter: string | null; fps: number | null };

export type WasmInfo = { provider: string; heapMb: number | null; limitMb: number | null };

export type IdentityInfo = {
  nodeId: string;
  signPublic: string;
  boxPublic: string;
  fingerprint: string;
};

export type TerminalHost = {
  processes(): ProcInfo[];
  kill(pid: number): boolean;
  open(appId: string, arg?: string): boolean;
  mesh(): MeshInfo;
  ping(nodeId: string): Promise<number | null>;
  gpu(): Promise<GpuInfo>;
  wasm(): WasmInfo;
  logs(limit: number): string[];
  events(limit: number): string[];
  ipc(): string[];
  vaultLocked(): boolean;
  setVaultLocked(locked: boolean): void;
  identity(): Promise<IdentityInfo | null>;
  generateKeypair(): Promise<IdentityInfo | null>;
  memoryMb(): number | null;
  uptimeSec(): number;
};

/** Hiçbir sistem katmanına bağlı olmayan güvenli köprü (testler/SSR). */
export const nullHost: TerminalHost = {
  processes: () => [],
  kill: () => false,
  open: () => false,
  mesh: () => ({ nodeId: null, mode: "kapalı", peers: [] }),
  ping: async () => null,
  gpu: async () => ({ adapter: null, fps: null }),
  wasm: () => ({ provider: "bilinmiyor", heapMb: null, limitMb: null }),
  logs: () => [],
  events: () => [],
  ipc: () => [],
  vaultLocked: () => false,
  setVaultLocked: () => undefined,
  identity: async () => null,
  generateKeypair: async () => null,
  memoryMb: () => null,
  uptimeSec: () => 0,
};
