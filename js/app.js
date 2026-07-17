// app.js — controller for The Alchemist's Grimoire.
// A single-page, hash-routed static app. No build step; deploys as-is to Pages.

import { HOUSES, getHouse } from "./houses.js";
import { QUESTIONS, scoreAffinity } from "./affinity.js";
import { unlockedChapters, nextChapter, CHAPTERS } from "./chronicle.js";
import * as store from "./storage.js";
import { askArchmage, askArchmageStream, resetServerSession } from "./gemini.js";
import { MODES, MODE_IDS } from "./persona.js";
import { dissolveInk, typeQuill, createQuillStream } from "./ink.js";

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
  if (!MODE_IDS.includes(state.mode)) state.mode = "chat";

  $view.innerHTML = `
    <section class="journal fade-in">
      <header class="journal-head">
        ${sigilSvg(state.house, 40)}
        <div>
          <h2>The Echo Journal</h2>
          <p class="journal-sub">Archmage Ignatius Vale attends a scholar of
            ${esc(h.name.replace("The ", ""))}. <span class="brain-chip">${brainLabel()}</span></p>
        </div>
      </header>

      <div class="mode-bar" role="tablist" aria-label="Wizard capability">
        ${MODE_IDS.map((m) =>
          `<button class="mode ${state.mode === m ? "active" : ""}" data-mode="${m}"
             title="${esc(MODES[m].hint)}">${esc(MODES[m].label)}</button>`).join("")}
      </div>

      <div class="ink-well">
        <div class="ink-ghost" id="inkGhost" aria-hidden="true"></div>
        <textarea id="inkInput" class="ink-input" rows="4"
          placeholder="${esc(modePlaceholder(state.mode))}"
          aria-label="Write in the grimoire"></textarea>
        <div class="ink-actions">
          <span class="hint">Tip: <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to inscribe</span>
          <button class="btn primary" id="inscribeBtn">Let the page drink it</button>
        </div>
      </div>

      <div class="reply-stage" id="replyStage" hidden>
        <div class="reply-attrib">
          ${sigilSvg(state.house, 22)}<span>The Founder's Echo replies</span>
          <span class="stream-flag" id="streamFlag" hidden><i></i>streaming</span>
        </div>
        <div class="archmage" id="archmageReply"></div>
        <div class="reply-controls" id="replyControls"></div>
      </div>

      <div class="past" id="past"></div>
    </section>`;

  const input = document.getElementById("inkInput");
  const btn = document.getElementById("inscribeBtn");
  btn.onclick = () => inscribe();
  input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); inscribe(); }
  });
  $view.querySelectorAll(".mode").forEach((b) => {
    b.onclick = () => {
      if (busy) return;
      state.mode = b.dataset.mode; persist();
      $view.querySelectorAll(".mode").forEach((x) => x.classList.toggle("active", x.dataset.mode === state.mode));
      input.placeholder = modePlaceholder(state.mode);
      input.focus();
    };
  });
  input.focus();
  renderPast();
}

function modePlaceholder(mode) {
  return ({
    chat:   "Write a thought, a worry, or a question upon the page…",
    spell:  "Name what you wish to achieve — the Archmage will devise a working…",
    story:  "Ask for a tale, or write a word to continue the one unfolding…",
    trivia: "Write 'begin' for a question — or inscribe your answer to the last…"
  })[mode] || "Write upon the page…";
}

function brainLabel() {
  if ((state.serverUrl || "").trim()) return "🜂 Local model";
  if ((state.apiKey || "").trim()) return "✦ Gemini";
  return "◦ Offline Echo";
}

let busy = false;
let currentAbort = null;   // AbortController for an in-flight stream
let lastPrompt = null;     // the prompt to re-run on "Regenerate"

async function inscribe() {
  if (busy) return;
  const input = document.getElementById("inkInput");
  const ghost = document.getElementById("inkGhost");
  const text = (input.value || "").trim();
  if (!text) { toast("The page cannot drink an empty thought."); return; }

  // The page drinks the seeker's ink, then the Echo answers.
  input.disabled = true;
  ghost.style.display = "block";
  await dissolveInk(ghost, text);
  ghost.style.display = "none";
  input.value = "";

  await generateReply(text, false);
}

function setInputsDisabled(disabled) {
  const btn = document.getElementById("inscribeBtn");
  const input = document.getElementById("inkInput");
  if (btn) btn.disabled = disabled;
  if (input) input.disabled = disabled;
  $view.querySelectorAll(".mode").forEach((m) => { m.disabled = disabled; });
}

// Runs one Archmage turn. isRegen=true replaces the last entry (no extra Aura).
async function generateReply(text, isRegen = false) {
  if (busy) return;
  busy = true;
  lastPrompt = text;

  const stage = document.getElementById("replyStage");
  const replyEl = document.getElementById("archmageReply");
  const controls = document.getElementById("replyControls");
  const flag = document.getElementById("streamFlag");
  const input = document.getElementById("inkInput");
  setInputsDisabled(true);

  stage.hidden = false;
  replyEl.innerHTML = `<span class="stir">the ink stirs<span class="dots"></span></span>`;
  if (controls) controls.innerHTML = "";
  if (flag) flag.hidden = true;
  stage.scrollIntoView({ behavior: "smooth", block: "center" });

  let result;
  const usingServer = (state.serverUrl || "").trim();

  if (usingServer) {
    // Streaming path — tokens flow straight into a live quill as they arrive.
    let streamer = null;
    currentAbort = new AbortController();
    if (controls) {
      controls.innerHTML = `<button class="btn small ghost" id="stopBtn">&#9632; Stop writing</button>`;
      document.getElementById("stopBtn").onclick = () => { if (currentAbort) currentAbort.abort(); };
    }
    try {
      result = await askArchmageStream(text, state, state.mode, (delta) => {
        if (!streamer) {
          replyEl.innerHTML = "";
          streamer = createQuillStream(replyEl, { speed: 16 });
          if (flag) flag.hidden = false;
        }
        streamer.push(delta);
      }, currentAbort.signal);
      if (streamer) { streamer.end(result && result.text); await streamer.finished; }
      else { replyEl.innerHTML = ""; await typeQuill(replyEl, (result && result.text) || "", { speed: 22 }).promise; }
    } catch (e) {
      if (streamer) streamer.cancel();
      // Fall back to Gemini / offline without re-hitting the local server.
      result = await askArchmage(text, { ...state, serverUrl: "" }, state.mode);
      replyEl.innerHTML = "";
      await typeQuill(replyEl, result.text, { speed: 22 }).promise;
      toast("The stream faltered — the Echo finished the thought.", "warn");
    } finally {
      currentAbort = null;
      if (flag) flag.hidden = true;
    }
  } else {
    try {
      result = await askArchmage(text, state, state.mode);
    } catch (e) {
      result = { text: "The echo wavers, and the page falls quiet a moment. Try once more.", source: "error" };
    }
    replyEl.innerHTML = "";
    await typeQuill(replyEl, result.text, { speed: 22 }).promise;
  }

  if (result.source === "error") {
    toast("The bound familiar did not answer — the offline Echo spoke instead.", "warn");
  }
  if (result.aborted) toast("Stopped — the Archmage set down his quill.", "warn");

  // Record + reward (only if something was actually written).
  const stored = (result.text || "").trim();
  if (stored) {
    if (isRegen && state.entries && state.entries.length) {
      state.entries[state.entries.length - 1] = { ts: Date.now(), prompt: text, reply: stored, house: state.house };
      persist();
    } else if (!isRegen) {
      const before = state.aura;
      state.aura += AURA_PER_ENTRY;
      state = store.addEntry(state, text, stored);
      persist();
      renderNav();
      announceUnlocks(before, state.aura);
    }
    renderPast();
  }

  // Offer to regenerate the same prompt.
  if (controls) {
    controls.innerHTML = `<button class="btn small ghost" id="regenBtn">&#8635; Regenerate</button>`;
    document.getElementById("regenBtn").onclick = () => { if (!busy) generateReply(lastPrompt, true); };
  }

  busy = false;
  setInputsDisabled(false);
  if (input) input.focus();
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
      <p class="settings-sub">Give the Archmage a real mind — a private local model, or Google
        Gemini — or let the offline Echo speak. Nothing here ever leaves your browser (a local
        server's key stays on the server).</p>

      <div class="field">
        <label for="serverUrl">Local Archmage server <span class="opt">(recommended — your own models)</span></label>
        <input type="text" id="serverUrl" placeholder="http://localhost:8787" value="${esc(state.serverUrl || "")}"
          autocomplete="off" spellcheck="false" inputmode="url" />
        <p class="field-help">Run <code>node server/archmage-server.mjs</code> (see <code>server/README.md</code>)
          to power the wizard with Ollama or any OpenAI-compatible model, with real per-session memory.
          Takes priority over Gemini when set. Leave blank to use Gemini or the offline Echo.</p>
      </div>

      <div class="field">
        <label for="apiKey">Google Gemini API key <span class="opt">(optional)</span></label>
        <input type="password" id="apiKey" placeholder="AIza…" value="${esc(state.apiKey || "")}"
          autocomplete="off" spellcheck="false" />
        <p class="field-help">Create a free key at
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a>.
          Stored only in this browser's localStorage. Used when no local server is set.</p>
      </div>

      <div class="field">
        <label for="model">Gemini model</label>
        <select id="model">
          ${["gemini-2.0-flash","gemini-2.0-flash-lite","gemini-1.5-flash","gemini-1.5-pro"]
            .map((m) => `<option value="${m}" ${state.model === m ? "selected" : ""}>${m}</option>`).join("")}
        </select>
      </div>

      <div class="settings-actions">
        <button class="btn primary" id="saveBtn">Save the binding</button>
        <button class="btn ghost" id="testBtn">Test the connection</button>
        <button class="btn ghost" id="newSessionBtn">Begin a new session</button>
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
    state.serverUrl = document.getElementById("serverUrl").value.trim().replace(/\/+$/, "");
    state.apiKey = document.getElementById("apiKey").value.trim();
    state.model = document.getElementById("model").value;
    persist();
    renderNav();
    const brain = state.serverUrl ? "A local familiar answers now." :
      (state.apiKey ? "Gemini is bound. The Archmage's voice deepens." : "Saved. The offline Echo will speak.");
    toast(brain, "good");
  };
  document.getElementById("testBtn").onclick = testConnection;
  document.getElementById("newSessionBtn").onclick = async () => {
    await resetServerSession(state);
    state.sessionId = "";
    store.ensureSessionId(state);
    persist();
    toast("A new session begins — the Archmage's memory is fresh.", "good");
  };
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
  const serverUrl = document.getElementById("serverUrl").value.trim().replace(/\/+$/, "");
  const key = document.getElementById("apiKey").value.trim();
  if (!serverUrl && !key) { toast("Nothing to test — the offline Echo needs no binding.", "warn"); return; }
  toast("Reaching for the familiar…");
  const probe = { ...state, serverUrl, apiKey: key, model: document.getElementById("model").value, entries: [], sessionId: "probe-" + Date.now() };
  const res = await askArchmage("Greet me in a single short sentence.", probe, "chat");
  if (res.source === "local") toast("The local model answers. Binding is sound.", "good");
  else if (res.source === "gemini") toast("Gemini answers. Binding is sound.", "good");
  else toast("The familiar did not answer — check the URL/key. " + (res.detail ? "(" + res.detail + ")" : ""), "warn");
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
