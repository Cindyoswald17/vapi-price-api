// vAPI Price API — gratis, x402 v2, USDC di Base
// Endpoint berbayar: GET /price?symbol=BTC  -> $0.01 per call
// Payout wallet (Geral, owner vAPI): 0x954089b82ce0fd89f2bc46bdf43ca81de693fb4c
// USDC Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bd029029 (6 desimal, $0.01 = 10000)
// Facilitator publik x402 (gratis, tanpa API key): https://x402.org/facilitator
// Jalankan: npm install && npm start   (PORT default 3000)
const express = require("express");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PAY_TO = "0x954089b82ce0fd89f2bc46bdf43ca81de693fb4c";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bd029029";
const PRICE_USD = "0.01";
const AMOUNT = "10000"; // 0.01 USDC, 6 desimal
const FACILITATOR = "https://x402.org/facilitator";

const SYMBOLS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin",
  XRP: "ripple", DOGE: "dogecoin", ADA: "cardano", USDT: "tether", USDC: "usd-coin",
};

function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function x402Offer(req) {
  const resource = `${baseUrl(req)}${req.originalUrl}`;
  return {
    x402Version: 2,
    error: "Payment Required",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        amount: AMOUNT,
        asset: USDC_BASE,
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        extra: {
          name: "USD Coin",
          version: "2",
          description: "Crypto price for one symbol. Takes symbol, e.g. BTC. For historical prices, use a historical price API instead.",
        },
      },
    ],
    resource,
  };
}

function paymentRequiredHeader(offer) {
  return Buffer.from(JSON.stringify(offer)).toString("base64");
}

// ---- Halaman info (gratis, tanpa bayar) ----
app.get("/", (req, res) => {
  res.json({
    name: "vAPI Price API",
    description: "Returns the USD price for one crypto symbol. Takes symbol, e.g. BTC. For historical prices, use a historical price API instead.",
    price: "$0.01 per call, USDC on Base",
    payTo: PAY_TO,
    endpoint: "GET /price?symbol=BTC",
    openapi: "/openapi.json",
    x402: "/.well-known/x402",
  });
});

// ---- OpenAPI (gratis) ----
app.get("/openapi.json", (req, res) => {
  res.json({
    openapi: "3.1.0",
    info: {
      title: "vAPI Price API",
      version: "1.0.0",
      description: "Returns the USD price for one crypto symbol. Takes symbol, e.g. BTC. For historical prices, use a historical price API instead.",
    },
    servers: [{ url: baseUrl(req) }],
    paths: {
      "/price": {
        get: {
          summary: "Get crypto price in USD",
          operationId: "getPrice",
          "x-payment-info": { price: PRICE_USD, network: "base", asset: USDC_BASE, payTo: PAY_TO },
          parameters: [
            { name: "symbol", in: "query", required: true, schema: { type: "string", enum: Object.keys(SYMBOLS) }, example: "BTC" },
          ],
          responses: {
            200: {
              description: "Price in USD",
              content: { "application/json": { schema: { type: "object", properties: { symbol: { type: "string" }, price_usd: { type: "number" }, source: { type: "string" } } } } },
            },
            402: { description: "Payment Required (x402 v2)" },
          },
        },
      },
    },
  });
});

// ---- Discovery x402 (gratis) ----
app.get("/.well-known/x402", (req, res) => {
  res.json({
    x402Version: 2,
    baseUrl: baseUrl(req),
    endpoints: [{ path: "/price", method: "GET", price: PRICE_USD, network: "base", asset: USDC_BASE, payTo: PAY_TO }],
    openapi: "/openapi.json",
  });
});

// ---- Endpoint berbayar: GET /price ----
app.get("/price", async (req, res) => {
  const symbol = String(req.query.symbol || "BTC").toUpperCase();
  const coinId = SYMBOLS[symbol];
  if (!coinId) {
    return res.status(400).json({ error: "Unknown symbol", supported: Object.keys(SYMBOLS) });
  }

  // 1) Tanpa header pembayaran -> jawab 402 dengan penawaran x402 v2
  const payment = req.header("X-PAYMENT") || req.header("x-payment");
  if (!payment) {
    const offer = x402Offer(req);
    res.set("PAYMENT-REQUIRED", paymentRequiredHeader(offer));
    return res.status(402).json(offer);
  }

  // 2) Ada pembayaran -> verifikasi ke facilitator publik
  try {
    const offer = x402Offer(req);
    const verifyRes = await fetch(`${FACILITATOR}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x402Version: 2, paymentPayload: JSON.parse(Buffer.from(payment, "base64").toString("utf8")), paymentRequirements: offer.accepts[0] }),
    });
    const verify = await verifyRes.json();
    if (!verify.isValid) {
      return res.status(402).json({ error: "Payment invalid", details: verify.invalidReason || verify });
    }

    // 3) Settle pembayaran
    const settleRes = await fetch(`${FACILITATOR}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x402Version: 2, paymentPayload: JSON.parse(Buffer.from(payment, "base64").toString("utf8")), paymentRequirements: offer.accepts[0] }),
    });
    const settle = await settleRes.json();
    if (!settle.success) {
      return res.status(402).json({ error: "Payment settlement failed", details: settle });
    }

    // 4) Pembayaran lunas -> ambil harga dari CoinGecko (gratis, tanpa key)
    const cg = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
    const data = await cg.json();
    const price = data[coinId] && data[coinId].usd;
    if (price == null) return res.status(502).json({ error: "Price source unavailable" });
    res.set("X-PAYMENT-RESPONSE", Buffer.from(JSON.stringify(settle)).toString("base64"));
    return res.json({ symbol, price_usd: price, source: "CoinGecko" });
  } catch (e) {
    return res.status(502).json({ error: "Payment verification failed", details: String(e && e.message || e) });
  }
});

app.listen(PORT, () => console.log(`vAPI Price API listening on :${PORT} — GET /price?symbol=BTC ($0.01, USDC Base, payTo ${PAY_TO})`));
