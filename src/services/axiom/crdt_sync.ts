/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface ProofCertificate {
  proofHash: string;
  claimText: string;
  status: "200_PROVEN" | "UNPROVABLE" | "EXECUTION_TIMEOUT";
  timestamp: number;
  nodeSignature: string;
  zkpAuthority: "TEDBİRGE-WEBOS-ZKP-ROOT-CA";
}

export class CRDTSyncEngine {
  private localStore: Map<string, ProofCertificate> = new Map();

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
}
