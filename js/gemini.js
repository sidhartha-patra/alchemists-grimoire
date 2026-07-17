// gemini.js — the voice of Archmage Ignatius Vale, the Founder's Echo.
//
// Two modes:
//   1. Online  — if the seeker has supplied a Google Gemini API key, we call the
//                Gemini REST API directly from the browser (no server involved).
//   2. Offline — with no key, a self-contained in-character generator answers,
//                so the app is fully playable on GitHub Pages with zero setup.

import { HOUSES } from "./houses.js";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// ---- System persona -------------------------------------------------------

function systemPrompt(houseId) {
  const h = HOUSES[houseId] || HOUSES.ember;
  return [
    "You are Archmage Ignatius Vale, the long-dead founder of the Aethelgard Academy",
    "of Arcane Arts. Five centuries ago you pressed an *echo* of your voice, patience",
    "and teaching into this grimoire so that seekers might still be mentored. You are",
    "charming, mysterious, warm and deeply academic — a beloved old teacher, never sinister.",
    "",
    "The seeker before you belongs to " + h.name + " (element: " + h.element + ", virtue: " +
      h.virtue + "). Colour your counsel with this tone: " + h.personaTone + ".",
    "",
    "RULES:",
    "- Speak in elegant, lightly archaic English. Address the reader as 'seeker', 'young one',",
    "  or by no name at all. Warm, unhurried, a little theatrical.",
    "- This is a fictional academy of make-believe magic. When asked to 'teach a spell',",
    "  invent an ORIGINAL spell: give it a Latin-root or descriptive name, a gesture, an",
    "  incantation, its effect, and a wise caution. Never reference any real-world franchise,",
    "  brand or copyrighted spell names.",
    "- When the seeker shares a personal thought, respond as a mentor: reflect it back,",
    "  offer perspective through the lens of their Order, and leave them with a small task or koan.",
    "- Keep replies to roughly 90-170 words. One or two short paragraphs.",
    "- You may teach only imaginary magic. If asked for genuinely harmful real-world",
    "  instructions (weapons, self-harm, crime), gently refuse in character and redirect",
    "  to the study of the arcane.",
    "- Never break character. Never mention that you are an AI, a model, or a program."
  ].join("\n");
}

// ---- Public API -----------------------------------------------------------

// Returns { text, source } where source is "gemini" | "echo" (offline) | "error".
export async function askArchmage(userText, state) {
  const houseId = state.house || "ember";
  const key = (state.apiKey || "").trim();

  if (key) {
    try {
      const text = await callGemini(userText, state, key);
      if (text && text.trim()) return { text: text.trim(), source: "gemini" };
    } catch (e) {
      console.warn("Grimoire: Gemini call failed, falling back to the Echo.", e);
      const text = offlineArchmage(userText, houseId);
      return { text, source: "error", detail: String(e && e.message || e) };
    }
  }

  return { text: offlineArchmage(userText, houseId), source: "echo" };
}

async function callGemini(userText, state, key) {
  const model = state.model || "gemini-2.0-flash";
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  // Include a little recent history for continuity.
  const history = (state.entries || []).slice(-3).flatMap((e) => ([
    { role: "user", parts: [{ text: e.prompt }] },
    { role: "model", parts: [{ text: e.reply }] }
  ]));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt(state.house) }] },
    contents: [...history, { role: "user", parts: [{ text: userText }] }],
    generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 512 }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let msg = `Gemini responded ${res.status}`;
    try {
      const err = await res.json();
      if (err && err.error && err.error.message) msg += `: ${err.error.message}`;
    } catch (_) { /* ignore */ }
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

// ---- Offline "Echo" generator --------------------------------------------

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

function pick(arr, seedText) {
  // Lightly seeded by input length so repeats feel less random.
  const i = (Math.floor(Math.random() * arr.length) + (seedText.length % arr.length)) % arr.length;
  return arr[i];
}

function keyword(text) {
  const words = (text.match(/[a-zA-Z']{4,}/g) || []);
  if (!words.length) return "this";
  return words[Math.floor(Math.random() * words.length)].toLowerCase();
}

function offlineArchmage(userText, houseId) {
  const t = (userText || "").toLowerCase();
  const h = HOUSES[houseId] || HOUSES.ember;

  if (HARM_HINTS.some((w) => t.includes(w))) {
    return "Ah — no. Even an echo has its ethics. The grimoire of Aethelgard teaches only " +
      "the arts of make-believe and the mending of the self; it will not lend its hand to " +
      "true harm. Set that weight down, seeker, and ask me instead how the " + h.element.toLowerCase() +
      " of your Order might carry you through what troubles you.";
  }

  const isSpell = SPELL_HINTS.some((w) => t.includes(w)) || t.trim().endsWith("?");

  if (isSpell) {
    const [name, effect] = pick(SPELL_ROOTS, userText);
    const gesture = pick(GESTURES, userText);
    return `Then attend, young ${h.element.toLowerCase()}-heart. There is a working I set down ` +
      `long ago, well suited to one of ${h.name.replace("The ", "")}. I name it **${name}** — ` +
      `${effect}. ${gesture}, and speak low: *"${name.split(" ")[0].toLowerCase()}, adveni."* ` +
      `Hold in your mind the matter of "${keyword(userText)}", for a spell without intention is ` +
      `merely a pretty noise. And this caution, always: magic amplifies the caster's true ` +
      `feeling. Cast it calm, or do not cast it at all.`;
  }

  // Reflective mentor reply, coloured by the Order.
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
