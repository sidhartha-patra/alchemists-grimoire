// app.js — controller for The Alchemist's Grimoire.
// A single-page, hash-routed static app. No build step; deploys as-is to Pages.

import { HOUSES, getHouse } from "./houses.js";
import { QUESTIONS, scoreAffinity } from "./affinity.js";
import { unlockedChapters, nextChapter, CHAPTERS } from "./chronicle.js";
import * as store from "./storage.js";
import { askArchmage } from "./gemini.js";
import { dissolveInk, typeQuill } from "./ink.js";

const AURA_PER_ENTRY = 8;

let state = store.load();
const $view = document.getElementById("view");
const $nav = document.getElementById("nav");
const $toast = document.getElementById("toast");

// ---------------------------------------------------------------- utilities

function persist() { store.save(state); }

function applyTheme(houseId) {
  const h = getHouse(houseId);
  const root = document.documentElement;
  if (h) {
    root.style.setProperty("--house-primary", h.colors.primary);
    root.style.setProperty("--house-glow", h.colors.glow);
    root.style.setProperty("--house-ink", h.colors.ink);
    document.body.dataset.house = houseId;
  } else {
    document.body.removeAttribute("data-house");
  }
}

function sigilSvg(houseId, size = 44) {
  const h = getHouse(houseId);
  if (!h) return "";
  return `<svg class="sigil" width="${size}" height="${size}" viewBox="0 0 100 100" ` +
    `role="img" aria-label="${h.name} sigil">${h.sigil}</svg>`;
}

function toast(msg, kind = "") {
  $toast.textContent = msg;
  $toast.className = "toast show " + kind;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { $toast.className = "toast"; }, 3800);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function go(route) {
  if (location.hash !== route) location.hash = route;
  else router();
}

// ------------------------------------------------------------------- navbar

function renderNav() {
  if (!state.onboarded || !state.house) { $nav.innerHTML = ""; $nav.hidden = true; return; }
  $nav.hidden = false;
  const h = getHouse(state.house);
  const active = (location.hash || "#/journal");
  const link = (href, label) =>
    `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`;
  $nav.innerHTML = `
    <div class="nav-brand">${sigilSvg(state.house, 30)}<span>Aethelgard</span></div>
    <div class="nav-links">
      ${link("#/journal", "Journal")}
      ${link("#/chronicle", "Chronicle")}
      ${link("#/settings", "Settings")}
    </div>
    <div class="nav-aura" title="Aura earned for ${esc(h.name)}">
      <span class="aura-dot"></span>${state.aura} Aura
    </div>`;
}

// ------------------------------------------------------------------ welcome

function viewWelcome() {
  applyTheme(null);
  $view.innerHTML = `
    <section class="cover fade-in">
      <div class="cover-plate">
        <div class="cover-emblem">${bookEmblem()}</div>
        <h1 class="title">The Alchemist's Grimoire</h1>
        <p class="subtitle">A Bound Echo of the Aethelgard Academy of Arcane Arts</p>
        <p class="cover-lore">
          You have found a book that is not quite a book. Its pages drink the ink of
          whatever is written upon them, and answer in a hand five centuries old —
          the preserved echo of the Academy's founder, <em>Archmage Ignatius Vale</em>.
          But the grimoire will not teach a stranger. First, it must learn the shape
          of your heart.
        </p>
        <button class="btn primary lg" id="beginBtn">Begin the Affinity Ritual</button>
        <p class="cover-foot">An original work of interactive fiction. No API key required to play.</p>
      </div>
    </section>`;
  document.getElementById("beginBtn").onclick = () => go("#/ritual");
}

function bookEmblem() {
  return `<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">
    <defs><radialGradient id="g" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#f4d79a"/><stop offset="100%" stop-color="#b9862f"/>
    </radialGradient></defs>
    <circle cx="60" cy="60" r="52" fill="none" stroke="url(#g)" stroke-width="2.5"/>
    <path d="M60 26 L60 94 M34 40 Q60 32 86 40 L86 84 Q60 76 34 84 Z"
      fill="none" stroke="url(#g)" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="60" cy="60" r="7" fill="url(#g)"/>
  </svg>`;
}

// ------------------------------------------------------------------- ritual

let ritualAnswers = [];
let ritualIndex = 0;

function viewRitual() {
  applyTheme(null);
  ritualAnswers = [];
  ritualIndex = 0;
  renderRitualQuestion();
}

function renderRitualQuestion() {
  const q = QUESTIONS[ritualIndex];
  const total = QUESTIONS.length;
  $view.innerHTML = `
    <section class="ritual fade-in">
      <div class="ritual-progress">
        <span>The Sorting Ritual</span>
        <span>${ritualIndex + 1} / ${total}</span>
      </div>
      <div class="ritual-bar"><i style="width:${((ritualIndex) / total) * 100}%"></i></div>
      <h2 class="ritual-q">${esc(q.prompt)}</h2>
      <div class="ritual-options">
        ${q.options.map((o, i) =>
          `<button class="option" data-i="${i}">${esc(o.text)}</button>`).join("")}
      </div>
    </section>`;
  $view.querySelectorAll(".option").forEach((btn) => {
    btn.onclick = () => chooseRitual(parseInt(btn.dataset.i, 10));
  });
}

function chooseRitual(i) {
  ritualAnswers[ritualIndex] = i;
  if (ritualIndex < QUESTIONS.length - 1) {
    ritualIndex++;
    renderRitualQuestion();
  } else {
    revealHouse();
  }
}

function revealHouse() {
  const { houseId } = scoreAffinity(ritualAnswers);
  const h = getHouse(houseId);
  applyTheme(houseId);
  $view.innerHTML = `
    <section class="reveal fade-in" style="--rc:${h.colors.primary}">
      <p class="reveal-kicker">The sigils have chosen. You belong to</p>
      <div class="reveal-sigil">${sigilSvg(houseId, 120)}</div>
      <h1 class="reveal-name">${esc(h.name)}</h1>
      <p class="reveal-virtue">${esc(h.element)} &middot; ${esc(h.virtue)}</p>
      <p class="reveal-tagline">&ldquo;${esc(h.tagline)}&rdquo;</p>
      <p class="reveal-blurb">${esc(h.blurb)}</p>
      <div class="reveal-actions">
        <button class="btn ghost" id="retryBtn">Retake the Ritual</button>
        <button class="btn primary" id="enterBtn">Enter the Grimoire</button>
      </div>
    </section>`;
  document.getElementById("retryBtn").onclick = () => viewRitual();
  document.getElementById("enterBtn").onclick = () => {
    state.house = houseId;
    state.onboarded = true;
    persist();
    renderNav();
    go("#/journal");
    toast(`Welcome to ${h.name}, seeker.`, "good");
  };
}

// ------------------------------------------------------------------ journal

function viewJournal() {
  if (!state.onboarded || !state.house) return go("#/ritual");
  applyTheme(state.house);
  const h = getHouse(state.house);

  $view.innerHTML = `
    <section class="journal fade-in">
      <header class="journal-head">
        ${sigilSvg(state.house, 40)}
        <div>
          <h2>The Echo Journal</h2>
          <p class="journal-sub">Archmage Ignatius Vale attends a scholar of
            ${esc(h.name.replace("The ", ""))}.</p>
        </div>
      </header>

      <div class="ink-well">
        <div class="ink-ghost" id="inkGhost" aria-hidden="true"></div>
        <textarea id="inkInput" class="ink-input" rows="4"
          placeholder="Write a spell query, or simply a thought, upon the page…"
          aria-label="Write in the grimoire"></textarea>
        <div class="ink-actions">
          <span class="hint">Tip: <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to inscribe</span>
          <button class="btn primary" id="inscribeBtn">Let the page drink it</button>
        </div>
      </div>

      <div class="reply-stage" id="replyStage" hidden>
        <div class="reply-attrib">${sigilSvg(state.house, 22)}<span>The Founder's Echo replies</span></div>
        <div class="archmage" id="archmageReply"></div>
      </div>

      <div class="past" id="past"></div>
    </section>`;

  const input = document.getElementById("inkInput");
  const btn = document.getElementById("inscribeBtn");
  btn.onclick = () => inscribe();
  input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); inscribe(); }
  });
  input.focus();
  renderPast();
}

let busy = false;

async function inscribe() {
  if (busy) return;
  const input = document.getElementById("inkInput");
  const ghost = document.getElementById("inkGhost");
  const stage = document.getElementById("replyStage");
  const replyEl = document.getElementById("archmageReply");
  const btn = document.getElementById("inscribeBtn");
  const text = (input.value || "").trim();
  if (!text) { toast("The page cannot drink an empty thought."); return; }

  busy = true;
  btn.disabled = true;
  input.disabled = true;

  // 1) The page drinks the seeker's ink.
  ghost.style.display = "block";
  await dissolveInk(ghost, text);
  ghost.style.display = "none";
  input.value = "";

  // 2) The Echo stirs, then writes back in a quill hand.
  stage.hidden = false;
  replyEl.innerHTML = `<span class="stir">the ink stirs<span class="dots"></span></span>`;
  stage.scrollIntoView({ behavior: "smooth", block: "center" });

  let result;
  try {
    result = await askArchmage(text, state);
  } catch (e) {
    result = { text: "The echo wavers, and the page falls quiet a moment. Try once more.", source: "error" };
  }

  replyEl.innerHTML = "";
  const t = typeQuill(replyEl, result.text, { speed: 22 });
  await t.promise;

  if (result.source === "error") {
    toast("Could not reach Gemini — the offline Echo answered instead.", "warn");
  }

  // 3) Reward, record, and check for newly-revealed history.
  const before = state.aura;
  state.aura += AURA_PER_ENTRY;
  state = store.addEntry(state, text, result.text);
  persist();
  renderNav();
  announceUnlocks(before, state.aura);
  renderPast();

  busy = false;
  btn.disabled = false;
  input.disabled = false;
  input.focus();
}

function announceUnlocks(before, after) {
  const newly = CHAPTERS.filter((c) => before < c.auraRequired && after >= c.auraRequired);
  newly.forEach((c) => toast(`A new chapter unfurls: ${c.title.replace(/^[IVX]+\.\s*/, "")}`, "good"));
}

function renderPast() {
  const past = document.getElementById("past");
  if (!past) return;
  const entries = (state.entries || []).slice().reverse().slice(0, 12);
  if (!entries.length) { past.innerHTML = ""; return; }
  past.innerHTML = `
    <h3 class="past-title">Past Inscriptions</h3>
    <div class="past-list">
      ${entries.map((e) => `
        <article class="past-item">
          <p class="past-prompt">&ldquo;${esc(e.prompt)}&rdquo;</p>
          <p class="past-reply">${esc(e.reply)}</p>
        </article>`).join("")}
    </div>`;
}

// ----------------------------------------------------------------- chronicle

function viewChronicle() {
  if (!state.onboarded || !state.house) return go("#/ritual");
  applyTheme(state.house);
  const chapters = unlockedChapters(state.aura, state.house);
  const next = nextChapter(state.aura);
  const h = getHouse(state.house);

  $view.innerHTML = `
    <section class="chronicle fade-in">
      <header class="chronicle-head">
        <h2>The Daily Chronicle</h2>
        <p class="chronicle-sub">The hidden history of Aethelgard, revealed as your Aura grows.</p>
        <div class="aura-track">
          <div class="aura-track-bar"><i style="width:${auraPct(next)}%"></i></div>
          <span>${state.aura} Aura earned for ${esc(h.name)}</span>
        </div>
      </header>

      <div class="chapters">
        ${chapters.map((c) => `
          <article class="chapter">
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.body)}</p>
          </article>`).join("")}
        ${next ? `
          <article class="chapter locked">
            <h3>🔒 ${esc(next.title.replace(/^[IVX]+\.\s*/, "The next chapter"))}</h3>
            <p>Sealed until <strong>${next.auraRequired} Aura</strong>.
               Converse with the Echo to earn ${next.auraRequired - state.aura} more.</p>
          </article>` : `
          <article class="chapter complete">
            <h3>✶ The Chronicle is complete</h3>
            <p>You have drawn every secret from the grimoire, seeker. Yet the Echo will
               always answer — a good teacher is never truly done.</p>
          </article>`}
      </div>
    </section>`;
}

function auraPct(next) {
  if (!next) return 100;
  // Progress toward the next threshold from the previous one.
  const prev = [...CHAPTERS].filter((c) => c.auraRequired <= state.aura)
    .reduce((m, c) => Math.max(m, c.auraRequired), 0);
  const span = next.auraRequired - prev || 1;
  return Math.min(100, Math.round(((state.aura - prev) / span) * 100));
}

// ------------------------------------------------------------------ settings

function viewSettings() {
  applyTheme(state.house);
  const h = getHouse(state.house);
  $view.innerHTML = `
    <section class="settings fade-in">
      <h2>The Scriptorium</h2>
      <p class="settings-sub">Bind a true familiar of intellect to the grimoire — or let the
        offline Echo speak. Nothing here ever leaves your browser.</p>

      <div class="field">
        <label for="apiKey">Google Gemini API key <span class="opt">(optional)</span></label>
        <input type="password" id="apiKey" placeholder="AIza…" value="${esc(state.apiKey || "")}"
          autocomplete="off" spellcheck="false" />
        <p class="field-help">Create a free key at
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a>.
          Stored only in this browser's localStorage. Leave blank to play with the built-in Echo.</p>
      </div>

      <div class="field">
        <label for="model">Model</label>
        <select id="model">
          ${["gemini-2.0-flash","gemini-2.0-flash-lite","gemini-1.5-flash","gemini-1.5-pro"]
            .map((m) => `<option value="${m}" ${state.model === m ? "selected" : ""}>${m}</option>`).join("")}
        </select>
      </div>

      <div class="settings-actions">
        <button class="btn primary" id="saveBtn">Save the binding</button>
        <button class="btn ghost" id="testBtn">Test the connection</button>
      </div>

      <hr class="rule"/>

      <div class="settings-order">
        <div>${sigilSvg(state.house, 40)}</div>
        <div>
          <p class="settings-order-name">${h ? esc(h.name) : "No Order yet"}</p>
          <button class="btn small ghost" id="retakeBtn">Retake the Affinity Ritual</button>
        </div>
      </div>

      <hr class="rule"/>

      <div class="danger">
        <button class="btn danger" id="resetBtn">Forget everything (reset the grimoire)</button>
        <p class="field-help">Erases your Order, Aura, unlocked chapters, journal and key.</p>
      </div>
    </section>`;

  document.getElementById("saveBtn").onclick = () => {
    state.apiKey = document.getElementById("apiKey").value.trim();
    state.model = document.getElementById("model").value;
    persist();
    toast(state.apiKey ? "A familiar is bound. The Archmage's voice deepens." : "Saved. The offline Echo will speak.", "good");
  };
  document.getElementById("testBtn").onclick = testConnection;
  document.getElementById("retakeBtn").onclick = () => go("#/ritual");
  document.getElementById("resetBtn").onclick = () => {
    if (confirm("Truly forget everything and begin anew?")) {
      state = store.reset();
      applyTheme(null);
      renderNav();
      go("#/");
      toast("The grimoire is blank once more.");
    }
  };
}

async function testConnection() {
  const key = document.getElementById("apiKey").value.trim();
  if (!key) { toast("No key set — the offline Echo needs no binding.", "warn"); return; }
  toast("Reaching for the familiar…");
  const probe = { ...state, apiKey: key, model: document.getElementById("model").value, entries: [] };
  const res = await askArchmage("Greet me in a single short sentence.", probe);
  if (res.source === "gemini") toast("The familiar answers. Binding is sound.", "good");
  else toast("The familiar did not answer — check the key/model.", "warn");
}

// -------------------------------------------------------------------- router

function router() {
  const route = location.hash || "#/";
  renderNav();
  // Gate: unfinished ritual can't reach the inner rooms.
  if (!state.onboarded && route !== "#/ritual" && route !== "#/") {
    return go("#/");
  }
  switch (true) {
    case route === "#/" : state.onboarded ? go("#/journal") : viewWelcome(); break;
    case route === "#/ritual": viewRitual(); break;
    case route === "#/journal": viewJournal(); break;
    case route === "#/chronicle": viewChronicle(); break;
    case route === "#/settings": viewSettings(); break;
    default: viewWelcome();
  }
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  applyTheme(state.house);
  router();
});

// If DOMContentLoaded already fired (module loaded late), run now.
if (document.readyState !== "loading") { applyTheme(state.house); router(); }
