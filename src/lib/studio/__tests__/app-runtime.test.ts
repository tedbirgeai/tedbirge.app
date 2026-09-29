import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeIn, RuntimeOut } from "@/lib/studio/app-runtime-protocol";
import { startAppRuntime, WATCHDOG_MS, type AppFault, type WorkerLike } from "@/lib/studio/app-runtime";

class FakeWorker implements WorkerLike {
  onmessage: ((e: MessageEvent<RuntimeOut>) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessageerror: ((e: Event) => void) | null = null;
  terminated = false;
  constructor(private readonly behave: (m: RuntimeIn, w: FakeWorker) => void) {}
  postMessage(m: RuntimeIn) {
    queueMicrotask(() => this.behave(m, this));
  }
  emit(m: RuntimeOut) {
    this.onmessage?.({ data: m } as MessageEvent<RuntimeOut>);
  }
  terminate() {
    this.terminated = true;
  }
}

const status = () => ({ online: true, peers: 2 });

afterEach(() => vi.useRealTimers());

describe("üretilen uygulama işçisi", () => {
  it("normal çağrıyı yanıtlar", async () => {
    const w = new FakeWorker((m, self) => {
      if (m.t === "init") self.emit({ t: "ready" });
      else self.emit({ t: "result", id: m.id, value: m.args[0]! + 1 });
    });
    const rt = startAppRuntime({ appId: "uretim.a", module: "x", status, factory: () => w });
    await expect(rt.call("artir", [4])).resolves.toBe(5);
    expect(w.terminated).toBe(false);
  });

  it("1500 ms aşımında işçiyi sonlandırır", async () => {
    vi.useFakeTimers();
    const faults: AppFault[] = [];
    const w = new FakeWorker((m, self) => {
      if (m.t === "init") self.emit({ t: "ready" });
      // call: sonsuz döngü — hiç yanıt yok
    });
    const rt = startAppRuntime({ appId: "uretim.b", module: "x", status, factory: () => w, onFault: (f) => faults.push(f) });
    const p = rt.call("dongu", []);
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS + 10);
    await expect(p).rejects.toThrow(/zorla durduruldu/);
    expect(w.terminated).toBe(true);
    expect(faults[0]?.reason).toBe("timeout");
    expect(rt.dead).toBe(true);
  });

  it("çökmeyi arıza olarak bildirir", async () => {
    const faults: AppFault[] = [];
    const w = new FakeWorker((m, self) => {
      if (m.t === "init") self.emit({ t: "ready" });
      else self.emit({ t: "error", id: m.id, reason: "crash", message: "Çekirdek çöktü." });
    });
    const rt = startAppRuntime({ appId: "uretim.c", module: "x", status, factory: () => w, onFault: (f) => faults.push(f) });
    await expect(rt.call("x", [])).rejects.toThrow();
    expect(faults[0]?.reason).toBe("crash");
    expect(w.terminated).toBe(true);
  });

  it("işçi yoksa ana iş parçacığında çalıştırmaz", async () => {
    const faults: AppFault[] = [];
    const rt = startAppRuntime({ appId: "uretim.d", module: "x", status, factory: () => null, onFault: (f) => faults.push(f) });
    await expect(rt.call("x", [])).rejects.toThrow();
    expect(faults[0]?.reason).toBe("unsupported");
  });

  it("yeniden başlatma yeni işçi kurar", async () => {
    const made: FakeWorker[] = [];
    const factory = () => {
      const w = new FakeWorker((m, self) => m.t === "init" && self.emit({ t: "ready" }));
      made.push(w);
      return w;
    };
    startAppRuntime({ appId: "uretim.e", module: "x", status, factory }).dispose();
    startAppRuntime({ appId: "uretim.e", module: "x", status, factory });
    expect(made).toHaveLength(2);
    expect(made[0]!.terminated).toBe(true);
    expect(made[1]!.terminated).toBe(false);
  });
});
