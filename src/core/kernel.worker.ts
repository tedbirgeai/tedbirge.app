/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

interface ProofCacheItem {
  key: string;
  proofData: string;
  sizeBytes: number;
  lastAccessed: number;
}

class KernelWorkerDaemon {
  private dbName = "AXIOM_V12_ROM_DB";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private proofCache: Map<string, ProofCacheItem> = new Map();
  private maxRamBytes = 50 * 1024 * 1024; // 50 MB Hard Ceiling
  private lruEvictionThreshold = 40 * 1024 * 1024; // 40 MB (%80 Limit)
  private currentRamUsageBytes = 0;
  private isPersistedStorage = false;

  constructor() {
    this.initVirtualROM();
    this.initMemoryProfiler();
    this.listenMessages();
  }

  private async initVirtualROM() {
    if (navigator.storage && navigator.storage.persist) {
      this.isPersistedStorage = await navigator.storage.persist();
    }

    const request = indexedDB.open(this.dbName, this.dbVersion);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("immutable_rom_proofs")) {
        db.createObjectStore("immutable_rom_proofs", { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      this.notifyMainThread({ type: "ROM_INITIALIZED", persisted: this.isPersistedStorage });
    };

    request.onerror = () => {
      this.notifyMainThread({ type: "ROM_ERROR", message: "IndexedDB initialization failed." });
    };
  }

  private initMemoryProfiler() {
    setInterval(() => {
      let memoryUsed = this.currentRamUsageBytes;
      
      if ("memory" in performance) {
        const perfMemory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        if (perfMemory && perfMemory.usedJSHeapSize) {
          memoryUsed = Math.max(memoryUsed, perfMemory.usedJSHeapSize);
        }
      }

      if (memoryUsed > this.lruEvictionThreshold) {
        this.runLRUEviction();
      }

      this.notifyMainThread({
        type: "MEMORY_METRICS",
        ramUsedMB: (memoryUsed / (1024 * 1024)).toFixed(2),
        ramCeilingMB: 50,
        cacheItemsCount: this.proofCache.size,
        persisted: this.isPersistedStorage,
      });
    }, 1000);
  }

  private runLRUEviction() {
    const sortedCache = Array.from(this.proofCache.values()).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );

    for (const item of sortedCache) {
      if (this.currentRamUsageBytes <= this.lruEvictionThreshold * 0.7) {
        break;
      }
      this.currentRamUsageBytes -= item.sizeBytes;
      this.proofCache.delete(item.key);
    }
  }

  private executeMockProofEngine(claimText: string) {
    const startTime = performance.now();
    const mockProven = !claimText.toLowerCase().includes("false");
    const executionLatency = performance.now() - startTime;

    return {
      status: mockProven ? "200_PROVEN" : "UNPROVABLE",
      proofHash: "0x" + Math.random().toString(16).substring(2, 10) + "8f3c2a",
      latencyMs: Number(executionLatency.toFixed(2)),
      costCreditedUsd: 0.001,
      engine: "MOCK_DETERMINISTIC_ENGINE",
    };
  }

  private listenMessages() {
    self.onmessage = (event: MessageEvent) => {
      const { type, payload, id } = event.data;

      if (type === "EXECUTE_PROOF") {
        const result = this.executeMockProofEngine(payload.claimText || "");
        
        // Sanal RAM önbelleğine ekleme
        const itemSize = JSON.stringify(result).length * 2;
        this.currentRamUsageBytes += itemSize;
        this.proofCache.set(id, {
          key: id,
          proofData: JSON.stringify(result),
          sizeBytes: itemSize,
          lastAccessed: Date.now(),
        });

        self.postMessage({ type: "PROOF_RESULT", id, result });
      }
    };
  }

  private notifyMainThread(message: unknown) {
    self.postMessage(message);
  }
}

new KernelWorkerDaemon();
export {};
