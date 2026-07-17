// archmage-server.mjs — a tiny, zero-dependency local AI server that gives the
// Grimoire's "Founder's Echo" a real brain with per-session memory and several
// wizard capabilities (Talk, Learn a Spell, Hear a Tale, Test Me / trivia).
//
// Backends (choose with the BACKEND env var):
//   ollama  (default) — talks to a local Ollama instance; models you already have.
//   openai            — any OpenAI-compatible endpoint (OpenAI, Azure OpenAI,
//                       GitHub Models, LM Studio, vLLM, …) via OPENAI_BASE_URL + key.
//
// No npm install required — Node 18+ (global fetch) and the standard library only.
//
//   node server/archmage-server.mjs
//   MODEL=glm-5.2 node server/archmage-server.mjs          # quality upgrade
//   MODEL=qwen2.5:32b node server/archmage-server.mjs
//   BACKEND=openai OPENAI_BASE_URL=https://models.github.ai/inference \
//     OPENAI_API_KEY=ghp_xxx MODEL=gpt-4o-mini node server/archmage-server.mjs

import http from "node:http";
import { systemPromptFor, MODE_IDS } from "../js/persona.js";

const PORT            = Number(process.env.PORT || 8787);
const BACKEND         = (process.env.BACKEND || "ollama").toLowerCase();
const MODEL           = process.env.MODEL || "llama3.1:8b";
const OLLAMA_URL      = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, "");
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const OPENAI_API_KEY  = process.env.OPENAI_API_KEY || "";
const TEMPERATURE     = parseFloat(process.env.TEMPERATURE || "0.9");

const MAX_HISTORY = 12;                 // user+assistant messages kept per session
const SESSION_TTL = 2 * 60 * 60 * 1000; // prune idle sessions after 2h

/** sessionId -> { messages: [{role, content}], updated: number } */
const sessions = new Map();

function getSession(id) {
  const key = id || "anon";
  let s = sessions.get(key);
  if (!s) { s = { messages: [], updated: Date.now() }; sessions.set(key, s); }
  return s;
}

// --- backend dispatch ------------------------------------------------------

async function complete(messages) {
  return BACKEND === "openai" ? completeOpenAI(messages) : completeOllama(messages);
}

async function completeOllama(messages) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: false, options: { temperature: TEMPERATURE } })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return (data.message && data.message.content || "").trim();
}

async function completeOpenAI(messages) {
  const headers = { "Content-Type": "application/json" };
  if (OPENAI_API_KEY) headers["Authorization"] = `Bearer ${OPENAI_API_KEY}`;
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: MODEL, messages, temperature: TEMPERATURE })
  });
  if (!res.ok) throw new Error(`OpenAI-compat ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
}

// --- streaming backend dispatch (token deltas via onDelta) -----------------

async function streamComplete(messages, onDelta) {
  return BACKEND === "openai" ? streamOpenAI(messages, onDelta) : streamOllama(messages, onDelta);
}

async function readLines(res, onLine) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onLine(line);
    }
  }
  const last = buf.trim();
  if (last) onLine(last);
}

async function streamOllama(messages, onDelta) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: true, options: { temperature: TEMPERATURE } })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text().catch(() => "")}`);
  let full = "";
  await readLines(res, (line) => {
    let obj; try { obj = JSON.parse(line); } catch { return; }
    const d = obj.message && obj.message.content || "";
    if (d) { full += d; onDelta(d); }
  });
  return full;
}

async function streamOpenAI(messages, onDelta) {
  const headers = { "Content-Type": "application/json" };
  if (OPENAI_API_KEY) headers["Authorization"] = `Bearer ${OPENAI_API_KEY}`;
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: MODEL, messages, temperature: TEMPERATURE, stream: true })
  });
  if (!res.ok) throw new Error(`OpenAI-compat ${res.status}: ${await res.text().catch(() => "")}`);
  let full = "";
  await readLines(res, (line) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") return;
    let obj; try { obj = JSON.parse(payload); } catch { return; }
    const d = obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content || "";
    if (d) { full += d; onDelta(d); }
  });
  return full;
}

// --- http plumbing ---------------------------------------------------------

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function send(res, code, obj) {
  cors(res);
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true, backend: BACKEND, model: MODEL,
      endpoint: BACKEND === "openai" ? OPENAI_BASE_URL : OLLAMA_URL,
      sessions: sessions.size, modes: MODE_IDS
    });
  }

  if (req.method === "POST" && url.pathname === "/api/session/reset") {
    try {
      const { sessionId } = await readJson(req);
      sessions.delete(sessionId || "anon");
      return send(res, 200, { ok: true });
    } catch { return send(res, 400, { error: "bad request" }); }
  }

  if (req.method === "POST" && url.pathname === "/api/archmage") {
    let payload;
    try { payload = await readJson(req); }
    catch { return send(res, 400, { error: "invalid JSON" }); }

    const message = (payload.message || "").toString().trim();
    if (!message) return send(res, 400, { error: "message is required" });

    const house = payload.house || "ember";
    const mode = MODE_IDS.includes(payload.mode) ? payload.mode : "chat";
    const sess = getSession(payload.sessionId);

    const messages = [
      { role: "system", content: systemPromptFor(house, mode) },
      ...sess.messages,
      { role: "user", content: message }
    ];

    try {
      const reply = await complete(messages);
      if (!reply) throw new Error("empty completion");
      // Persist the exchange (not the system prompt) for continuity.
      sess.messages.push({ role: "user", content: message }, { role: "assistant", content: reply });
      if (sess.messages.length > MAX_HISTORY) sess.messages = sess.messages.slice(-MAX_HISTORY);
      sess.updated = Date.now();
      return send(res, 200, { reply, model: MODEL, mode, source: "local", sessionId: payload.sessionId || "anon" });
    } catch (e) {
      console.error("archmage error:", e.message);
      return send(res, 502, { error: String(e.message || e) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/archmage/stream") {
    let payload;
    try { payload = await readJson(req); }
    catch { return send(res, 400, { error: "invalid JSON" }); }

    const message = (payload.message || "").toString().trim();
    if (!message) return send(res, 400, { error: "message is required" });

    const house = payload.house || "ember";
    const mode = MODE_IDS.includes(payload.mode) ? payload.mode : "chat";
    const sess = getSession(payload.sessionId);
    const messages = [
      { role: "system", content: systemPromptFor(house, mode) },
      ...sess.messages,
      { role: "user", content: message }
    ];

    cors(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    });
    const sse = (obj) => { try { res.write("data: " + JSON.stringify(obj) + "\n\n"); } catch (_) { /* client gone */ } };

    try {
      const full = await streamComplete(messages, (d) => sse({ delta: d }));
      const clean = (full || "").trim();
      if (clean) {
        sess.messages.push({ role: "user", content: message }, { role: "assistant", content: clean });
        if (sess.messages.length > MAX_HISTORY) sess.messages = sess.messages.slice(-MAX_HISTORY);
        sess.updated = Date.now();
      }
      sse({ done: true, full: clean, model: MODEL, mode });
      res.end();
    } catch (e) {
      console.error("stream error:", e.message);
      sse({ error: String(e.message || e) });
      res.end();
    }
    return;
  }

  send(res, 404, { error: "not found" });
});

// Prune idle sessions periodically so memory stays bounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, s] of sessions) if (now - s.updated > SESSION_TTL) sessions.delete(k);
}, 10 * 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`🔮 Archmage server listening on http://localhost:${PORT}`);
  console.log(`   backend=${BACKEND} model=${MODEL} ` +
    `endpoint=${BACKEND === "openai" ? OPENAI_BASE_URL : OLLAMA_URL}`);
  console.log(`   modes: ${MODE_IDS.join(", ")}`);
});
