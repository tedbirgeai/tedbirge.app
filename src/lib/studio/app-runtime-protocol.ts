/** Üretilen uygulama işçisi ile ana iş parçacığı arasındaki mesajlar. */

export type RuntimeStatus = { online: boolean; peers: number };

export type RuntimeIn =
  | { t: "init"; module: string; status: RuntimeStatus }
  | { t: "call"; id: number; fn: string; args: number[]; status: RuntimeStatus };

export type FaultReason = "timeout" | "crash" | "load" | "unsupported";

export type RuntimeOut =
  | { t: "ready" }
  | { t: "log"; line: string }
  | { t: "result"; id: number; value: number | null }
  | { t: "error"; id: number; reason: FaultReason; message: string };
