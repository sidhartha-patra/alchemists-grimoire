// gemini.js — the voice of Archmage Ignatius Vale (the Founder's Echo).
//
// Backend priority, per turn:
//   1. Local Archmage server (if a server URL is set) — your own models + memory.
//   2. Google Gemini (if an API key is set) — direct from the browser.
//   3. Offline "Echo" — a self-contained in-character generator (zero setup).
//
// Every backend shares the same persona + capability modes via persona.js.

import { HOUSES } from "./houses.js";
import { systemPromptFor } from "./persona.js";
import { ensureSessionId } from "./storage.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Returns { text, source } where source is "local" | "gemini" | "echo" | "error".
export async function askArchmage(userText, state, mode = "chat") {
  const houseId = state.house || "ember";

  // 1) Local Archmage server (Ollama / OpenAI-compatible), with session memory.
  if ((state.serverUrl || "").trim()) {
    try {
      const text = await callLocalServer(userText, state, mode);
      if (text && text.trim()) return { text: text.trim(), source: "local" };
    } catch (e) {
      console.warn("Grimoire: local server failed, falling back.", e);
      return { text: offlineArchmage(userText, houseId, mode), source: "error", detail: String(e && e.message || e) };
    }
  }

  // 2) Google Gemini.
  const key = (state.apiKey || "").trim();
  if (key) {
    try {
      const text = await callGemini(userText, state, mode, key);
      if (text && text.trim()) return { text: text.trim(), source: "gemini" };
    } catch (e) {
      console.warn("Grimoire: Gemini failed, falling back to the Echo.", e);
      return { text: offlineArchmage(userText, houseId, mode), source: "error", detail: String(e && e.message || e) };
    }
  }

  // 3) Offline Echo.
  return { text: offlineArchmage(userText, houseId, mode), source: "echo" };
}

// ---- Local Archmage server ------------------------------------------------

async function callLocalServer(userText, state, mode) {
  const base = state.serverUrl.replace(/\/+$/, "");
  const sessionId = ensureSessionId(state);
  const res = await fetch(base + "/api/archmage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message: userText, house: state.house || "ember", mode })
  });
  if (!res.ok) {
    let msg = `server ${res.status}`;
    try { const e = await res.json(); if (e && e.error) msg += `: ${e.error}`; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.reply || "";
}

// Ask the local server to forget a conversation (used by "new session").
export async function resetServerSession(state) {
  if (!(state.serverUrl || "").trim() || !state.sessionId) return;
  try {
    await fetch(state.serverUrl.replace(/\/+$/, "") + "/api/session/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId })
    });
  } catch (_) { /* best effort */ }
}

// ---- Google Gemini --------------------------------------------------------

async function callGemini(userText, state, mode, key) {
  const model = state.model || "gemini-2.0-flash";
  const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const history = (state.entries || []).slice(-3).flatMap((e) => ([
    { role: "user", parts: [{ text: e.prompt }] },
    { role: "model", parts: [{ text: e.reply }] }
  ]));

  const body = {
    system_instruction: { parts: [{ text: systemPromptFor(state.house, mode) }] },
    contents: [...history, { role: "user", parts: [{ text: userText }] }],
    generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 640 }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let msg = `Gemini responded ${res.status}`;
    try { const err = await res.json(); if (err && err.error && err.error.message) msg += `: ${err.error.message}`; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }

  const data = await res.json();
  const cand = data.candidates && data.candidates[0];
  if (!cand) {
    const fb = data.promptFeedback && data.promptFeedback.blockReason;
    throw new Error(fb ? `The scrying was refused (${fb}).` : "The grimoire returned no words.");
  }
  const parts = (cand.content && cand.content.parts) || [];
  return parts.map((p) => p.text || "").join("");
}

// ---- Offline "Echo" generator (mode-aware) --------------------------------

const SPELL_HINTS = [
  "spell", "cast", "charm", "enchant", "hex", "curse", "conjure", "summon",
  "ward", "potion", "brew", "ritual", "incant", "teach me", "how do i", "how to",
  "magic to", "learn", "invoke", "banish", "shield", "heal", "levitate"
];
const HARM_HINTS = [
  "kill", "bomb", "weapon", "poison someone", "hurt someone", "suicide",
  "self harm", "self-harm", "explosive", "hack ", "real gun", "make a drug"
];
const SPELL_ROOTS = [
  ["Lumen Cor", "a soft light that answers the truth of one's heart"],
  ["Aether Bind", "a tether of will that steadies a trembling hand"],
  ["Silva Whisper", "a charm that lets the leaves carry a message unseen"],
  ["Chronos Still", "a breath of borrowed patience that slows a racing moment"],
  ["Ferro Mend", "a knitting of what is broken back toward whole"],
  ["Umbra Veil", "a gentle shadow that grants a moment unlooked-at"],
  ["Ignis Kindle", "a spark coaxed from resolve, warm but never wild"],
  ["Vox Echo", "a returning voice that repeats a forgotten intention"]
];
const GESTURES = [
  "Trace a slow spiral above the palm",
  "Press two fingers to the sternum, then open the hand outward",
  "Draw a level line in the air, left to right, without haste",
  "Cup both hands as though holding still water",
  "Let the wrist fall, then rise, as a tide turning"
];
const STORY_SEEDS = [
  "In the Academy's third winter, a bell that no one had ever hung began to ring at midnight, and only the Order of the Tide could hear it.",
  "They say the eastern stair has one more step going down than coming up, and that the extra step leads to a library that was never built.",
  "A first-year once fed a stray ink-cat a drop of moonlight; by spring it had learned to read, and it has corrected the margins of every book since.",
  "When the Grey Concord besieged the gates, Vale did not raise a wall — he raised a hedge of thornlight that blooms, they say, only when the Academy is truly in danger."
];
const TRIVIA_Q = [
  "Which of the four Orders is said to read a problem before ever raising a wand — the Tide, or the Gale?",
  "By what gentler name did Archmage Vale call the echo he bound into this grimoire, in place of the dark word he despised?",
  "The Academy's library kept one impossible habit by moonlight. What did its books do?",
  "What did Vale plant upon the nameless summit before the first walls of Aethelgard ever rose?"
];

function pick(arr, seedText) {
  const i = (Math.floor(Math.random() * arr.length) + ((seedText || "").length % arr.length)) % arr.length;
  return arr[i];
}
function keyword(text) {
  const words = (String(text).match(/[a-zA-Z']{4,}/g) || []);
  return words.length ? words[Math.floor(Math.random() * words.length)].toLowerCase() : "this";
}

function offlineArchmage(userText, houseId, mode = "chat") {
  const t = (userText || "").toLowerCase();
  const h = HOUSES[houseId] || HOUSES.ember;

  if (HARM_HINTS.some((w) => t.includes(w))) {
    return "Ah — no. Even an echo has its ethics. The grimoire of Aethelgard teaches only the arts " +
      "of make-believe and the mending of the self; it will not lend its hand to true harm. Set that " +
      "weight down, seeker, and ask me instead how the " + h.element.toLowerCase() + " of your Order " +
      "might carry you through what troubles you.";
  }

  if (mode === "story") {
    return `Sit, then, and let the candle gutter low. ${pick(STORY_SEEDS, userText)} ` +
      `You spoke of "${keyword(userText)}", and so I will steer the tale that way as it unfolds… ` +
      `but the next turn of it waits upon your next word, seeker. Shall we go on?`;
  }

  if (mode === "trivia") {
    return `A test, then — and the grimoire keeps the score. ${pick(TRIVIA_Q, userText)} ` +
      `Answer when you are ready, and I shall tell you true.`;
  }

  const isSpell = mode === "spell" || SPELL_HINTS.some((w) => t.includes(w)) || t.trim().endsWith("?");
  if (isSpell) {
    const [name, effect] = pick(SPELL_ROOTS, userText);
    const gesture = pick(GESTURES, userText);
    return `Then attend, young ${h.element.toLowerCase()}-heart — a working well suited to a scholar of ` +
      `${h.name}.\nName: ${name} — ${effect}.\nGesture: ${gesture}.\n` +
      `Incantation: "${name.split(" ")[0].toLowerCase()}, adveni."\n` +
      `Hold in mind the matter of "${keyword(userText)}", for a spell without intention is merely a ` +
      `pretty noise. Caution: magic amplifies the caster's true feeling — cast it calm, or not at all.`;
  }

  const openers = {
    ember: "I feel the heat in your words, seeker.",
    tide: "You have set a still pool before me, and I will look into it a while.",
    gale: "A restless thought — good. The best ones never sit quiet.",
    stone: "You bring me something with weight to it. Let us hold it steadily."
  };
  const closers = {
    ember: "So: choose one small, brave thing and do it before the ember cools. Return and tell me.",
    tide: "So: observe it once more without judgement, then let what you see decide your step.",
    gale: "So: ask it a sharper question than the one you began with, and follow where the wind pulls.",
    stone: "So: keep one small promise to yourself today, and let that stone be the first of a wall."
  };
  return `${openers[houseId] || openers.ember} You speak of "${keyword(userText)}", and I have known ` +
    `five hundred years of seekers who carried the same. Remember what your Order teaches — ` +
    `${h.virtue.toLowerCase()} — for that is the lens the world sharpens best in you. ` +
    `${closers[houseId] || closers.ember}`;
}
