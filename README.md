# vAPI Price API — Deploy Gratis

API harga crypto sederhana untuk quest **List your API on vAPI (500 pts)**.
Harga: **$0.01 per call**, dibayar USDC di Base, ke wallet payout Geral:
`0x954089b82ce0fd89f2bc46bdf43ca81de693fb4c`

Endpoint berbayar: `GET /price?symbol=BTC` (juga ETH, SOL, BNB, XRP, DOGE, ADA, USDT, USDC).
Tanpa bayar, endpoint menjawab HTTP 402 dengan penawaran x402 v2.
Gratis: `/`, `/openapi.json`, `/.well-known/x402`.

## 1. Deploy gratis di Render (tanpa kartu, free tier)

1. Buat repo GitHub baru (misal `vapi-price-api`), upload 3 file ini: `server.js`, `package.json`, `render.yaml`.
2. Buka https://render.com — daftar / login dengan GitHub.
3. **New + → Web Service → pilih repo itu.**
4. Isi: Name `vapi-price-api`, Runtime `Node`, Build Command `npm install`, Start Command `npm start`, Instance Type **Free**.
5. Klik **Create Web Service**. Tunggu sampai status **Live**.
6. Catat URL-nya, misal `https://vapi-price-api.onrender.com`.

Catatan: free tier Render tidur setelah tidak dipakai ~15 menit, dan bangun lagi ~30 detik saat ada request. Probe vAPI biasanya tetap lolos setelah bangun, tapi kalau probe gagal karena tidur, buka dulu URL itu di browser sekali (supaya bangun), lalu klik **Check endpoint** lagi di vAPI.

## 2. Cek sendiri (gratis, tanpa bayar)

Di laptop, di folder project ini:

npm install
npm start

Lalu di browser / CMD lain:

curl http://localhost:3000/price?symbol=BTC

Harus menjawab **402** dengan `x402Version: 2`, `network: eip155:8453`, `asset` USDC Base, `payTo` wallet di atas, `amount: 10000`.

Cek juga dengan vAPI CLI (gratis, tanpa bayar):

vapi check https://vapi-price-api.onrender.com/price?symbol=BTC

Harus lolos: status 402, version 2, scheme exact, asset USDC Base, payTo benar.

## 3. List di vAPI

1. Buka https://api.vapinetwork.ai — **Call → My APIs → Add an API**.
2. Isi Origin / endpoint: `https://vapi-price-api.onrender.com/price?symbol=BTC` (ganti dengan URL Render-mu).
3. Klik **Check endpoint**, ikuti langkah Describe → Payout.
4. Payout wallet: `0x954089b82ce0fd89f2bc46bdf43ca81de693fb4c` — wallet ini yang harus menandatangani pesan payout di langkah Publish (`vapi publish`).
5. Setelah live, quest **List your API (500 pts)** tercentang otomatis.

## File

- `server.js` — server Express, x402 v2 manual (tanpa library berbayar, facilitator publik gratis https://x402.org/facilitator).
- `package.json` — hanya butuh `express`.
- `render.yaml` — config deploy Render free.
- `README.md` — file ini.
