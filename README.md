# 📜 The Alchemist's Grimoire

**A sentient magical journal — an "Echo Journal" that drinks your ink and answers in the hand of a five-hundred-year-old founder.**

Pass the **Affinity Ritual**, be sorted into one of four elemental **Orders**, and converse with **Archmage Ignatius Vale**, the bound echo of the founder of the *Aethelgard Academy of Arcane Arts*. Write a spell query or a private thought — the page *drinks the ink*, then the Archmage writes back in a flowing quill hand. Earn **Aura** to unfurl hidden chapters of the Academy's history.

> A fully **original** work of interactive fiction. Every name, house, spell and character is invented for this project — no relation to any existing book, film or game franchise.

🔮 **Live demo:** once deployed, your app will be at **https://sidhartha-patra.github.io/alchemists-grimoire/**

---

## ✨ Features

- **The Sorting Ritual** — a six-question Affinity Test assigns you to an elemental Order:
  - 🔥 **The Order of the Ember** — Courage & Passion
  - 🌊 **The Order of the Tide** — Insight & Composure
  - 🜁 **The Order of the Gale** — Curiosity & Wit
  - ⛰️ **The Order of the Stone** — Constancy & Loyalty
- **The Ink-Drinking UI** — your written words dissolve, glyph by glyph, as the page "drinks" them; the reply is then written back character-by-character in a script font with a blinking quill cursor.
- **The Founder's Echo (LLM persona)** — Archmage Ignatius Vale mentors you *in character*, adapting his tone to your Order. He invents original spells (Latin-root names, gestures, incantations, cautions) and answers personal reflections like a wise teacher.
- **Powered by Google Gemini** — supply your own free API key and the Archmage speaks with Gemini Flash. **No key? No problem** — a rich built-in *offline Echo* answers so the app is fully playable on GitHub Pages with zero setup.
- **The Daily Chronicle** — each conversation earns Aura, unlocking chapters of Aethelgard's hidden history, including an Order-specific secret.
- **100% static & private** — no backend. Your key, house, Aura and journal live only in your browser's `localStorage`. The key is sent *directly* from your browser to Google, never to any third party.

---

## 🗂️ Project structure

```
alchemists-grimoire/
├─ index.html              # single-page shell
├─ css/styles.css          # parchment + house theming, ink/quill animations
├─ js/
│  ├─ app.js               # controller, hash router, view rendering
│  ├─ houses.js            # the four elemental Orders (data + SVG sigils)
│  ├─ affinity.js          # the Sorting Ritual questions + scoring
│  ├─ chronicle.js         # unlockable history chapters
│  ├─ gemini.js            # Gemini client + offline "Echo" persona
│  ├─ ink.js               # ink-dissolve + quill-typing animations
│  └─ storage.js           # localStorage persistence
├─ .github/workflows/pages.yml   # auto-deploy to GitHub Pages
├─ .nojekyll               # serve files as-is
└─ LICENSE                 # MIT
```

Pure HTML/CSS/vanilla-JS ES modules — **no build step, no dependencies to install.**

---

## 🚀 Deploy to *your personal* GitHub + GitHub Pages

This project was built locally and is ready to publish. The `origin` remote is already
set to **`https://github.com/sidhartha-patra/alchemists-grimoire.git`**, so publishing is
two steps once you're logged into your personal account.

### Option A — GitHub CLI (fastest)

```powershell
cd C:\Users\sipatra\AlchemistsGrimoire

# 1. Log in with your PERSONAL account (sidhartha-patra) — opens a browser
gh auth login

# 2. Create the empty repo on your account, then push (origin is already configured)
gh repo create sidhartha-patra/alchemists-grimoire --public
git push -u origin main
```

### Option B — plain git + the website

```powershell
# Create an empty repo named "alchemists-grimoire" under sidhartha-patra on github.com, then:
cd C:\Users\sipatra\AlchemistsGrimoire
git push -u origin main
```

### Turn on GitHub Pages

The included workflow (`.github/workflows/pages.yml`) deploys automatically. Just enable it once:

1. Repo → **Settings → Pages**
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push (or re-run the workflow). Your site goes live at
   **https://sidhartha-patra.github.io/alchemists-grimoire/**.

> Prefer no Actions? You can instead set **Source → Deploy from a branch → `main` / root**.
> The `.nojekyll` file ensures the `js/` modules are served correctly.

---

## 🧪 Run it locally

Because it uses ES modules, open it via a tiny static server (not `file://`):

```powershell
# Python
python -m http.server 8080
# or Node
npx serve .
```

Then visit `http://localhost:8080`.

---

## 🔑 Using your own Gemini key (optional)

1. Get a free key at **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. In the app, open **Settings (The Scriptorium)** → paste the key → **Save the binding**.
3. Pick a model (default `gemini-2.0-flash`). Use **Test the connection** to verify.

The key never leaves your browser. Because Pages is a public static host, the app deliberately
**does not** bake in any key — each visitor supplies their own, or enjoys the offline Echo.

---

## ⚖️ Originality & safety

- All lore, houses, spells and the Archmage are **original creations**. There is intentionally
  **no** connection to any existing franchise, and no protected names or spells are used.
- The persona teaches only make-believe magic and gently refuses genuinely harmful real-world
  requests, both online (via system prompt) and offline (via a built-in guard).

## 📄 License

[MIT](LICENSE) © 2026 Sidhartha Patra
