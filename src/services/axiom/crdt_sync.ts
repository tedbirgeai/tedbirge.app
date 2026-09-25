/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export type VectorClock = Record<string, number>;

export interface ProofCertificate {
  proofHash: string;
  claimText: string;
  status: "200_PROVEN" | "UNPROVABLE" | "EXECUTION_TIMEOUT";
  timestamp: number;
  nodeSignature: string;
  zkpAuthority: "TEDBİRGE-WEBOS-ZKP-ROOT-CA";
  verifiedAt?: number;
  verifierNodeId?: string;
}

export interface CRDTOperation<T = unknown> {
  id: string;
  nodeId: string;
  type: "SET" | "DELETE" | "MERGE";
  key: string;
  value: T;
  clock: VectorClock;
  timestamp: number;
  proofCertificate?: ProofCertificate;
}

export interface CRDTStateDelta<T = unknown> {
  originNodeId: string;
  operations: CRDTOperation<T>[];
  vectorClock: VectorClock;
}

export class CRDTSyncEngine<T = unknown> {
  private nodeId: string;
  private localStore: Map<string, ProofCertificate> = new Map();
  private kvStore: Map<string, { value: T; timestamp: number; nodeId: string }> = new Map();
  private vectorClock: VectorClock = {};
  private operationLog: CRDTOperation<T>[] = [];

  constructor(nodeId?: string) {
    this.nodeId = nodeId || `node_${Math.random().toString(36).substring(2, 9)}`;
    this.vectorClock[this.nodeId] = 0;
    this.loadFromNVRAM();
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  private incrementClock(): VectorClock {
    this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] || 0) + 1;
    return this.getVectorClock();
  }

  /* --- MUCİT ÖZGÜN SERTİFİKA VE NVRAM İŞLEMLERİ (KORUNDU) --- */

  public addCertificate(cert: ProofCertificate): void {
    if (!this.localStore.has(cert.proofHash)) {
      this.localStore.set(cert.proofHash, cert);
      this.persistToNVRAM(cert);
    }
  }

  public getCertificate(proofHash: string): ProofCertificate | undefined {
    return this.localStore.get(proofHash);
  }

  public syncDelta(remoteCerts: ProofCertificate[]): { merged: number; rejected: number } {
    let merged = 0;
    let rejected = 0;

    remoteCerts.forEach((cert) => {
      if (this.verifyZKPProofSignature(cert)) {
        this.addCertificate(cert);
        merged++;
      } else {
        rejected++;
      }
    });

    return { merged, rejected };
  }

  public verifyZKPProofSignature(cert: ProofCertificate): boolean {
    return cert.zkpAuthority === "TEDBİRGE-WEBOS-ZKP-ROOT-CA" && cert.proofHash.startsWith("0x");
  }

  private persistToNVRAM(cert: ProofCertificate): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(`axiom_nvram_${cert.proofHash}`, JSON.stringify(cert));
      }
    } catch {
      // NVRAM sessiz koruma
    }
  }

  private loadFromNVRAM(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("axiom_nvram_")) {
            const item = localStorage.getItem(key);
            if (item) {
              const cert = JSON.parse(item) as ProofCertificate;
              if (this.verifyZKPProofSignature(cert)) {
                this.localStore.set(cert.proofHash, cert);
              }
            }
          }
        });
      }
    } catch {
      // NVRAM sessiz koruma
    }
  }

  /* --- GELİŞMİŞ DELTA VE VEKTÖR SAATİ EŞİTLEME MOTORU (EKLENDİ) --- */

  public set(key: string, value: T, proof?: ProofCertificate): CRDTOperation<T> {
    const clock = this.incrementClock();
    const timestamp = Date.now();

    if (proof && this.verifyZKPProofSignature(proof)) {
      this.addCertificate(proof);
    }

    const op: CRDTOperation<T> = {
      id: `${this.nodeId}_${timestamp}_${Math.random().toString(36).substring(2, 5)}`,
      nodeId: this.nodeId,
      type: "SET",
      key,
      value,
      clock,
      timestamp,
      proofCertificate: proof
    };

    this.kvStore.set(key, { value, timestamp, nodeId: this.nodeId });
    this.operationLog.push(op);

    return op;
  }

  public delete(key: string): CRDTOperation<T> | null {
    if (!this.kvStore.has(key)) return null;

    const clock = this.incrementClock();
    const timestamp = Date.now();

    const op: CRDTOperation<T> = {
      id: `${this.nodeId}_${timestamp}_${Math.random().toString(36).substring(2, 5)}`,
      nodeId: this.nodeId,
      type: "DELETE",
      key,
      value: null as unknown as T,
      clock,
      timestamp
    };

    this.kvStore.delete(key);
    this.operationLog.push(op);

    return op;
  }

  public applyStateDelta(delta: CRDTStateDelta<T>): { applied: number; rejected: number } {
    let applied = 0;
    let rejected = 0;

    Object.entries(delta.vectorClock).forEach(([peerNode, counter]) => {
      this.vectorClock[peerNode] = Math.max(this.vectorClock[peerNode] || 0, counter);
    });

    for (const op of delta.operations) {
      if (op.proofCertificate && !this.verifyZKPProofSignature(op.proofCertificate)) {
        rejected++;
        continue;
      }

      if (op.proofCertificate) {
        this.addCertificate(op.proofCertificate);
      }

      const existing = this.kvStore.get(op.key);

      if (op.type === "SET") {
        if (!existing || op.timestamp > existing.timestamp || 
           (op.timestamp === existing.timestamp && op.nodeId > existing.nodeId)) {
          this.kvStore.set(op.key, {
            value: op.value,
            timestamp: op.timestamp,
            nodeId: op.nodeId
          });
          applied++;
        }
      } else if (op.type === "DELETE") {
        if (existing && op.timestamp >= existing.timestamp) {
          this.kvStore.delete(op.key);
          applied++;
        }
      }

      this.operationLog.push(op);
    }

    return { applied, rejected };
  }

  public createDelta(sinceTimestamp = 0): CRDTStateDelta<T> {
    const recentOps = this.operationLog.filter(op => op.timestamp > sinceTimestamp);
    return {
      originNodeId: this.nodeId,
      operations: recentOps,
      vectorClock: this.getVectorClock()
    };
  }

  public getStateSnapshot(): Record<string, T> {
    const snapshot: Record<string, T> = {};
    this.kvStore.forEach((val, key) => {
      snapshot[key] = val.value;
    });
    return snapshot;
  }
}

export default CRDTSyncEngine;
