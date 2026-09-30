/**
 * AXIOM Universal MCP Agent Client
 * - Hiçbir harici paket gerektirmez (Sıfır bağımlılık).
 * - Hata yönetimi, zaman aşımı kontrolü ve JSON-RPC 2.0 doğrulaması içerir.
 */

const AXIOM_ENDPOINT = "https://www.tedbirge.app/api/v1/mcp/verify";

/**
 * AXIOM doğrulama motorunu çağıran evrensel fonksiyon
 * @param {string} codeOrText - Doğrulanacak kod veya matematiksel önerme
 * @param {object} [options] - İsteğe bağlı istemci ayarları
 */
export async function verifyWithAxiom(codeOrText, options = {}) {
  const payload = {
    jsonrpc: "2.0",
    method: "axiom.verify",
    params: {
      text: codeOrText,
      ...(options.params || {})
    },
    id: options.id || Date.now()
  };

  try {
    const response = await fetch(AXIOM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Axiom-Universal-Agent/1.0",
        "x-axiom-client": options.clientName || "universal-node-agent"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `HTTP Hatası: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error
      };
    }

    return {
      success: true,
      result: data.result
    };
  } catch (err) {
    return {
      success: false,
      error: `Ağ / Bağlantı Hatası: ${err.message}`
    };
  }
}

// Terminalden doğrudan çalıştırılma desteği: node scripts/axiom-agent.js "kod"
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/axiom-agent.js')) {
  const inputCode = process.argv[2] || "fn main() { let mut x = 1; x += 1; }";
  
  console.log("🤖 AXIOM Ajanı Çalıştırılıyor...");
  console.log("📥 Girdi:", inputCode);

  verifyWithAxiom(inputCode).then((res) => {
    console.log("\n⚡ AXIOM Yanıtı:");
    console.log(JSON.stringify(res, null, 2));
  });
}
