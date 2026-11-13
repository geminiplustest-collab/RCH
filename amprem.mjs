import axios from "axios";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

// ─── Konfigurasi ─────────────────────────────────────────────────────────────

const BASE = "https://northxfanzzalightmotion-web.vercel.app";

// Cookie fxn_guard ditemukan di semua request DevTools
// Format: timestamp.hash — boleh generate baru atau gunakan yang di bawah
const FXN_GUARD = "1794568378.88dafb36d8be243676d7a4c98e0396d917109618b4cda960b271d73778399929";

const client = axios.create({
  baseURL: BASE,
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 14; 22120RN86G Build/UP1A.231005.007) "
      + "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.38 Mobile Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Origin": BASE,
    "Referer": BASE + "/",
    "sec-ch-ua": '"Not-A.Brand";v="99", "Android WebView";v="157", "Chromium";v="157"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "Cookie": `fxn_guard=${FXN_GUARD}`,
  },
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function log(label, data) {
  console.log(`\n${"─".repeat(55)}`);
  console.log(`📦 ${label}`);
  console.log("─".repeat(55));
  if (data !== undefined) console.log(JSON.stringify(data, null, 2));
}

/** Prompt input dari terminal */
function prompt(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

// ─── ENDPOINT 1: POST /api/visit ─────────────────────────────────────────────
async function visit(isNew = true) {
  const res = await client.post("/api/visit", { new: isNew }, {
    headers: { "content-type": "application/json" },
  });
  return res.data;
}

// ─── ENDPOINT 2: GET /api/am/stats ───────────────────────────────────────────
async function getAmStats() {
  const res = await client.get("/api/am/stats");
  return res.data;
}

// ─── ENDPOINT 3: POST /api/am/send-link ──────────────────────────────────────
async function sendLink(email) {
  if (!email) throw new Error("email wajib diisi");
  const res = await client.post("/api/am/send-link",
    { email },
    { headers: { "content-type": "application/json" } }
  );
  return res.data;
}

// ─── ENDPOINT 4: POST /api/am/verify-link ────────────────────────────────────
async function verifyLink(email, magicLink) {
  if (!email || !magicLink) throw new Error("email dan magicLink wajib diisi");
  const res = await client.post("/api/am/verify-link",
    { email, magicLink },
    {
      headers: { "content-type": "application/json" },
      validateStatus: () => true, // jangan throw untuk 4xx
    }
  );
  return { httpStatus: res.status, ...res.data };
}

// ─── FLOW LENGKAP: send + verify ─────────────────────────────────────────────
async function fullFlow(email) {
  if (!email) throw new Error("email wajib diisi");

  log("Step 1: Kirim magic link");
  const sendResult = await sendLink(email);
  log("Send Link Response", sendResult);

  if (!sendResult.ok) {
    console.error("❌ Gagal kirim link:", sendResult.message);
    return sendResult;
  }

  console.log(`\n✅ Link dikirim ke ${email}`);
  console.log("📧 Buka email → cari email dari Alight Motion / alightcreative.com");
  console.log('   Klik tombol "Activate" atau copy URL dari tombol tersebut\n');

  const magicLink = await prompt("🔗 Paste magic link dari email di sini:\n> ");

  if (!magicLink || !magicLink.startsWith("http")) {
    console.error("❌ Magic link tidak valid");
    return { ok: false };
  }

  log("Step 2: Verifikasi magic link");
  const verifyResult = await verifyLink(email, magicLink);
  log("Verify Link Response", verifyResult);

  if (verifyResult.ok) {
    const d = verifyResult.data;
    console.log("\n🎉 ===== AKTIVASI BERHASIL =====");
    console.log(`👤 Nama     : ${d.displayName}`);
    console.log(`📧 Email    : ${d.email}`);
    console.log(`💎 Status   : ${d.membershipStatus}`);
    console.log(`📦 Plan     : ${d.planName}`);
    console.log(`🔑 Order ID : ${d.orderId}`);
    console.log(`📅 Aktif s/d: ${d.validUntil}`);
    console.log(`🆔 UID      : ${d.uid}`);
  } else {
    console.log("\n❌ Verifikasi gagal:", verifyResult.message);
  }

  return verifyResult;
}

// ─── Main CLI ─────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  try {
    switch (cmd) {
      case "stats": {
        const data = await getAmStats();
        log("AM Premium Stats", data);
        break;
      }
      case "visit": {
        const isNew = args[0] !== "false";
        const data = await visit(isNew);
        log(`Visit (new=${isNew})`, data);
        break;
      }
      case "send-link": {
        const email = args[0];
        if (!email) { console.error("Pakai: node amprem.mjs send-link <email>"); process.exit(1); }
        const data = await sendLink(email);
        log("Send Link", data);
        break;
      }
      case "verify-link": {
        const email     = args[0];
        const magicLink = args[1];
        if (!email || !magicLink) {
          console.error('Pakai: node amprem.mjs verify-link <email> "<magicLink>"');
          process.exit(1);
        }
        const data = await verifyLink(email, magicLink);
        log("Verify Link", data);
        if (data.ok) {
          const d = data.data;
          console.log("\n🎉 Aktivasi berhasil!");
          console.log(`💎 ${d.membershipStatus} | ${d.validUntil} | Order: ${d.orderId}`);
        }
        break;
      }
      case "full": {
        const email = args[0];
        if (!email) { console.error("Pakai: node amprem.mjs full <email>"); process.exit(1); }
        await fullFlow(email);
        break;
      }
      default:
        console.log("Pakai: node amprem.mjs [stats|visit|send-link|verify-link|full]");
    }
  } catch (err) {
    console.error("❌ Error:", err.response?.data ?? err.message);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export { visit, getAmStats, sendLink, verifyLink, fullFlow };
