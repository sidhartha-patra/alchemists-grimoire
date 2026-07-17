// storage.js — all persistence lives in the browser's localStorage.
// Nothing (including the API key) is ever sent anywhere except directly
// to Google's Gemini endpoint from the user's own browser.

const KEY = "aethelgard.grimoire.v1";

const DEFAULT_STATE = {
  onboarded: false,
  house: null,
  aura: 0,
  seenChapters: [],      // chapter ids the seeker has already been shown
  entries: [],           // { ts, prompt, reply, house } — capped, most-recent last
  apiKey: "",
  model: "gemini-2.0-flash"
};

const MAX_ENTRIES = 60;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.warn("Grimoire: failed to read saved state, starting fresh.", e);
    return { ...DEFAULT_STATE };
  }
}

export function save(state) {
  try {
    // Keep storage bounded — the journal can grow indefinitely otherwise.
    const trimmed = {
      ...state,
      entries: (state.entries || []).slice(-MAX_ENTRIES)
    };
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Grimoire: failed to save state.", e);
  }
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
  return { ...DEFAULT_STATE };
}

export function addEntry(state, prompt, reply) {
  const entries = [...(state.entries || []), { ts: Date.now(), prompt, reply, house: state.house }];
  return { ...state, entries: entries.slice(-MAX_ENTRIES) };
}
