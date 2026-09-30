#!/usr/bin/env node
/**
 * ============================================================
 *  OPENROUTER PROXY — pendamping opsional RetroSleuth
 * ------------------------------------------------------------
 *  Kenapa ada file ini?
 *  RetroSleuth adalah situs statis (GitHub Pages). Kalau browser
 *  memanggil OpenRouter langsung, API key Anda ikut terkirim dan
 *  BISA DILIHAT siapa pun yang membuka situs itu. Proxy kecil ini
 *  menyimpan key di server, sehingga browser tidak pernah melihatnya.
 *
 *  Zero dependency. Butuh Node 18+.
 *
 *  PAKAI:
 *    1) export OPENROUTER_API_KEY="sk-or-v1-xxxx"
 *       (atau simpan di file tools/.openrouter-key — sudah di-gitignore)
 *    2) node tools/openrouter-proxy.mjs
 *    3) di game: ⚙️ Settings → AI → Proxy URL = http://localhost:8787
 *       dan kosongkan field API Key.
 *
 *  ENDPOINT:
 *    POST /chat    {model, messages, temperature, max_tokens, tag}
 *    GET  /health  → {ok, detail, quota}
 *    GET  /credits → terusan ke OpenRouter /api/v1/credits
 *
 *  ENV:
 *    PORT=8787  HOST=0.0.0.0  ALLOW_ORIGIN=*
 *    DAILY_LIMIT=50  RPM_LIMIT=18  CACHE_TTL_MS=0 (0 = mati)
 * ============================================================
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";
const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 50);
const RPM_LIMIT = Number(process.env.RPM_LIMIT || 18);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 0);
const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_URL = "https://openrouter.ai/api/v1/models";
const CREDITS_URL = "https://openrouter.ai/api/v1/credits";

// ------------------------------------------------------------
//  KEY
// ------------------------------------------------------------
function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  const file = path.join(__dirname, ".openrouter-key");
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  } catch {
    /* ignore */
  }
  return "";
}

// ------------------------------------------------------------
//  KUOTA (server-side: berlaku untuk semua tab/browser)
// ------------------------------------------------------------
const quota = { date: today(), used: 0, window: [] };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function rollDay() {
  if (quota.date !== today()) {
    quota.date = today();
    quota.used = 0;
    console.log(`[proxy] 📅 Hari baru — kuota direset (limit ${DAILY_LIMIT}/hari).`);
  }
}

function canSpend() {
  rollDay();
  const cutoff = Date.now() - 60_000;
  quota.window = quota.window.filter((t) => t > cutoff);
  if (quota.used >= DAILY_LIMIT) return { ok: false, reason: `Kuota harian habis (${DAILY_LIMIT}).`, retryAfter: 3600 };
  if (quota.window.length >= RPM_LIMIT) return { ok: false, reason: `Batas ${RPM_LIMIT} request/menit tercapai.`, retryAfter: 15 };
  return { ok: true };
}

// ------------------------------------------------------------
//  CACHE SEDERHANA (opsional)
// ------------------------------------------------------------
const cache = new Map();
function cacheKey(body) {
  const crypto = globalThis.crypto;
  const str = JSON.stringify(body);
  if (crypto?.subtle) return str.length + ":" + simpleHash(str);
  return str.length + ":" + simpleHash(str);
}
function simpleHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// ------------------------------------------------------------
//  HTTP
// ------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-RetroSleuth-Tag");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      const key = loadKey();
      const gate = canSpend();
      return send(res, 200, {
        ok: !!key,
        detail: key
          ? `Proxy aktif. Key terbaca (${key.slice(0, 8)}…). Sisa hari ini: ${Math.max(0, DAILY_LIMIT - quota.used)}/${DAILY_LIMIT}.`
          : "OPENROUTER_API_KEY belum diset di server proxy.",
        quota: { used: quota.used, limit: DAILY_LIMIT, rpm: quota.window.length, rpmLimit: RPM_LIMIT, gateOk: gate.ok },
      });
    }

    if (req.method === "GET" && url.pathname === "/credits") {
      const key = loadKey();
      if (!key) return send(res, 500, { error: "Key belum diset di proxy." });
      const up = await fetch(CREDITS_URL, { headers: { Authorization: `Bearer ${key}` } });
      const data = await up.json().catch(() => ({}));
      return send(res, up.status, data);
    }

    if (req.method === "POST" && (url.pathname === "/chat" || url.pathname === "/v1/chat/completions")) {
      const key = loadKey();
      if (!key) {
        return send(res, 500, {
          error: { message: "OPENROUTER_API_KEY belum diset. Jalankan: OPENROUTER_API_KEY=sk-or-... node tools/openrouter-proxy.mjs" },
        });
      }

      const gate = canSpend();
      if (!gate.ok) {
        res.setHeader("Retry-After", String(gate.retryAfter));
        return send(res, 429, { error: { message: gate.reason } });
      }

      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        return send(res, 400, { error: { message: "Body bukan JSON valid." } });
      }

      delete body.tag;
      const tag = req.headers["x-retrosleuth-tag"] || "chat";

      // cache (opsional)
      if (CACHE_TTL_MS > 0) {
        const ck = cacheKey(body);
        const hit = cache.get(ck);
        if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
          console.log(`[proxy] ♻️  cache hit (${tag})`);
          return send(res, 200, hit.value);
        }
      }

      quota.window.push(Date.now());
      quota.used++;

      const started = Date.now();
      const up = await fetch(UPSTREAM, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": process.env.APP_URL || "https://retrosleuth.local",
          "X-Title": "RetroSleuth Wisma (proxy)",
        },
        body: JSON.stringify(body),
      });

      const text = await up.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { error: { message: text.slice(0, 300) } };
      }

      const ms = Date.now() - started;
      console.log(
        `[proxy] ${up.ok ? "✅" : "❌"} ${up.status} ${tag} ${ms}ms — harian ${quota.used}/${DAILY_LIMIT}, menit ${quota.window.length}/${RPM_LIMIT}`
      );

      if (up.ok && CACHE_TTL_MS > 0) {
        cache.set(cacheKey(body), { value: parsed, t: Date.now() });
        if (cache.size > 200) cache.delete(cache.keys().next().value);
      }

      return send(res, up.status, parsed);
    }

    return send(res, 404, { error: { message: `Tidak ada rute ${req.method} ${url.pathname}` } });
  } catch (err) {
    console.error("[proxy] 💥", err);
    return send(res, 500, { error: { message: err.message || "Kesalahan proxy" } });
  }
});

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 4_000_000) {
        reject(new Error("Body terlalu besar"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

server.listen(PORT, HOST, () => {
  const key = loadKey();
  console.log("─".repeat(64));
  console.log("🕵️  RetroSleuth — OpenRouter Proxy");
  console.log("─".repeat(64));
  console.log(`  URL        : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(`  Key        : ${key ? `✅ terbaca (${key.slice(0, 8)}…)` : "❌ BELUM ADSET — set OPENROUTER_API_KEY"}`);
  console.log(`  Kuota      : ${DAILY_LIMIT} request/hari, ${RPM_LIMIT} request/menit (server-side)`);
  console.log(`  Cache      : ${CACHE_TTL_MS > 0 ? `${CACHE_TTL_MS} ms` : "mati"}`);
  console.log(`  CORS       : ${ALLOW_ORIGIN}`);
  console.log("");
  console.log("  Di dalam game: ⚙️ Settings → AI → Proxy URL = http://localhost:" + PORT);
  console.log("  (kosongkan field API Key di game supaya key tidak tersimpan di browser)");
  console.log("─".repeat(64));
  if (!key) {
    console.log("");
    console.log("  Contoh menjalankan dengan key:");
    console.log('    OPENROUTER_API_KEY="sk-or-v1-..." node tools/openrouter-proxy.mjs');
    console.log("");
  }
});
