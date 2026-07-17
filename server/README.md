# 🔮 The Archmage Server — a local wizard-AI brain for the Grimoire

A tiny (**zero-dependency**) Node server that powers the Grimoire's *Founder's Echo*
with a real model, **per-session memory**, and four wizard capabilities:

| Mode | What the Archmage does |
| --- | --- |
| **Talk** | Mentors you in character, coloured by your Order |
| **Learn a Spell** | Invents an original spell (name, gesture, incantation, effect, caution) |
| **Hear a Tale** | Tells an *episodic* story of Aethelgard that continues across turns |
| **Test Me** | Runs an arcane-lore trivia quiz — asks, judges your answer, asks the next |

Because it keeps a short history per `sessionId`, the wizard **remembers the conversation**
(a continuing story, or your last trivia answer) until you start a new session.

---

## Run it (with the models you already have)

Requires **Node 18+** (for global `fetch`) and, by default, a running **[Ollama](https://ollama.com)**.

```powershell
cd C:\Users\sipatra\AlchemistsGrimoire\server
node archmage-server.mjs
# -> 🔮 Archmage server listening on http://localhost:8787
```

Then in the web app open **Settings → The Scriptorium**, set
**Local Archmage server** to `http://localhost:8787`, and save. The Journal's mode
buttons now drive a real local model.

### Choose the model

The server is **model-agnostic** — no code change, just an env var + `ollama pull`:

```powershell
# fast default (already installed)
node archmage-server.mjs

# quality upgrade for creative roleplay (pull once):
ollama pull glm-5.2
$env:MODEL="glm-5.2"; node archmage-server.mjs

# or the 32B you already have:
$env:MODEL="qwen2.5:32b"; node archmage-server.mjs
```

> **Which model?** `llama3.1:8b` is snappy and good. For richer, more in-character prose,
> `glm-5.2` and `qwen2.5:32b` are stronger (slower, more VRAM). Since a journal turn is
> short, the quality models are very usable here.

### Use a hosted / OpenAI-compatible model instead

```powershell
$env:BACKEND="openai"
$env:OPENAI_BASE_URL="https://models.github.ai/inference"   # GitHub Models
$env:OPENAI_API_KEY="ghp_your_token"
$env:MODEL="gpt-4o-mini"
node archmage-server.mjs
```

Works with OpenAI, Azure OpenAI, GitHub Models, LM Studio, vLLM — anything that speaks
`POST /chat/completions`.

---

## Configuration (env vars)

| Var | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8787` | Port to listen on |
| `BACKEND` | `ollama` | `ollama` or `openai` |
| `MODEL` | `llama3.1:8b` | Model name/tag |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama endpoint |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `OPENAI_API_KEY` | *(empty)* | Bearer token for the openai backend |
| `TEMPERATURE` | `0.9` | Creativity |

## API

- `GET  /health` → `{ ok, backend, model, endpoint, sessions, modes }`
- `POST /api/archmage` → body `{ sessionId, message, house, mode }` → `{ reply, model, mode, source }`
- `POST /api/archmage/stream` → same body; **Server-Sent Events** streaming tokens as
  `data: {"delta":"…"}` lines, ending with `data: {"done":true,"full":"…"}`. The web app uses
  this so the Archmage's quill writes in real time (first token in ~1s on a warm model).
- `POST /api/session/reset` → body `{ sessionId }` → clears that session's memory

## Notes

- **CORS is open** (`*`) so the app works from `http://localhost` *and* from the public
  GitHub Pages site (browsers permit `https://…` → `http://localhost` requests).
- The API key for the `openai` backend lives **only** in your server's environment — it is
  never sent to the browser. This is the private-by-design alternative to putting a key in
  the static site.
- Memory is in-process only; restarting the server forgets all sessions.
