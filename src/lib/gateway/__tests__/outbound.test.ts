import { describe, expect, it } from "vitest";

import { classifyHost, outboundFetch } from "@/lib/gateway/outbound";
import { __resetGatewayRegistry, registerAdapter } from "@/lib/gateway/registry";

describe("outbound SSRF filtresi", () => {
  it.each([
    ["localhost"],
    ["127.0.0.1"],
    ["0.0.0.0"],
    ["0"],
    ["2130706433"], // 127.0.0.1 tamsayı
    ["0177.0.0.1"], // sekizli loopback
    ["10.0.0.1"],
    ["192.168.1.1"],
    ["169.254.169.254"],
    ["metadata.google.internal"],
    ["::1"],
    ["::ffff:127.0.0.1"],
    ["fe80::1"],
    ["100.64.0.1"],
  ])("özel/metadata hedefi reddeder: %s", (host) => {
    expect(classifyHost(host)).not.toBeNull();
  });

  it("normal ana makineyi kabul eder", () => {
    expect(classifyHost("example.com")).toBeNull();
    expect(classifyHost("8.8.8.8")).toBeNull();
  });

  it("http hedefe izin vermez", async () => {
    __resetGatewayRegistry();
    registerAdapter({ slug: "o", protocol: "rest", direction: "outbound", label: "o" });
    await expect(outboundFetch("o", "http://example.com/")).rejects.toThrow(/https/);
  });

  it("özel IP hedefine çıkışı engeller", async () => {
    __resetGatewayRegistry();
    registerAdapter({ slug: "o", protocol: "rest", direction: "outbound", label: "o" });
    await expect(outboundFetch("o", "https://127.0.0.1/")).rejects.toThrow(/reddedildi/);
  });
});
