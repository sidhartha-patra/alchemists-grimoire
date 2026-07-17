// ink.js — the signature "Ink-Drinking" effect and the Founder's quill reply.
//
// dissolveInk(): the seeker's own words break into glyphs and are drunk by the page.
// typeQuill():   the Archmage's answer is written back, character by character,
//                in a flowing script, with a blinking quill cursor.

// Split text into per-character spans and animate them fading + drifting away.
// Returns a Promise that resolves when the ink has fully vanished.
export function dissolveInk(container, text) {
  return new Promise((resolve) => {
    const clean = (text || "").trim();
    if (!clean) return resolve();

    container.innerHTML = "";
    container.classList.add("ink-source");

    const frag = document.createDocumentFragment();
    const spans = [];
    for (const ch of clean) {
      const span = document.createElement("span");
      span.className = "glyph";
      span.textContent = ch;
      if (ch === " ") span.style.whiteSpace = "pre";
      frag.appendChild(span);
      spans.push(span);
    }
    container.appendChild(frag);

    // Stagger the dissolve so ink appears to seep away, left to right.
    const perGlyph = 14;      // ms between glyph triggers
    const fadeDur = 900;      // ms each glyph takes to vanish
    spans.forEach((span, i) => {
      setTimeout(() => {
        const drift = (Math.random() * 10 + 4).toFixed(1);
        const skew = (Math.random() * 8 - 4).toFixed(1);
        span.style.transition =
          `opacity ${fadeDur}ms ease-in, transform ${fadeDur}ms ease-in, filter ${fadeDur}ms ease-in`;
        span.style.opacity = "0";
        span.style.filter = "blur(3px)";
        span.style.transform = `translateY(${drift}px) skewX(${skew}deg)`;
      }, i * perGlyph);
    });

    const total = spans.length * perGlyph + fadeDur + 120;
    setTimeout(() => {
      container.innerHTML = "";
      container.classList.remove("ink-source");
      resolve();
    }, total);
  });
}

// Type `text` into `target` in a script hand. Returns { promise, cancel }.
// A blinking quill cursor trails the writing and is removed when done.
export function typeQuill(target, text, opts = {}) {
  const speed = opts.speed || 24;          // ms per character
  const clean = (text || "").trim();
  let cancelled = false;

  target.innerHTML = "";
  const body = document.createElement("span");
  body.className = "quill-text";
  const cursor = document.createElement("span");
  cursor.className = "quill-cursor";
  cursor.setAttribute("aria-hidden", "true");
  target.appendChild(body);
  target.appendChild(cursor);

  const promise = new Promise((resolve) => {
    let i = 0;
    function step() {
      if (cancelled) { finish(); return; }
      if (i >= clean.length) { finish(); return; }
      const ch = clean[i++];
      body.appendChild(document.createTextNode(ch));
      // Small natural pauses after sentence punctuation.
      const pause = ".!?".includes(ch) ? speed * 9 : (",;:".includes(ch) ? speed * 4 : speed);
      setTimeout(step, pause);
    }
    function finish() {
      if (!cancelled) body.textContent = clean; // guarantee full text on complete
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      resolve();
    }
    step();
  });

  return {
    promise,
    cancel() { cancelled = true; if (cursor.parentNode) cursor.remove(); body.textContent = clean; }
  };
}

// A live quill for STREAMING replies: push text deltas as they arrive and they
// are typed out smoothly (decoupled from bursty network chunks), with a trailing
// quill cursor. Call end(fullText) when the stream finishes.
export function createQuillStream(target, opts = {}) {
  const speed = opts.speed || 18;
  target.innerHTML = "";
  const body = document.createElement("span");
  body.className = "quill-text";
  const cursor = document.createElement("span");
  cursor.className = "quill-cursor";
  cursor.setAttribute("aria-hidden", "true");
  target.appendChild(body);
  target.appendChild(cursor);

  let queue = [];
  let done = false;
  let pendingFull = null;
  let resolveDone;
  const finished = new Promise((r) => { resolveDone = r; });

  function tick() {
    if (queue.length) {
      const ch = queue.shift();
      body.appendChild(document.createTextNode(ch));
      const pause = ".!?".includes(ch) ? speed * 8 : (",;:".includes(ch) ? speed * 3 : speed);
      setTimeout(tick, pause);
    } else if (done) {
      // Reconcile against the authoritative final text, if provided.
      if (pendingFull != null && body.textContent !== pendingFull) body.textContent = pendingFull;
      if (cursor.parentNode) cursor.remove();
      resolveDone();
    } else {
      setTimeout(tick, 40); // idle — await more deltas
    }
  }
  setTimeout(tick, speed);

  return {
    push(text) { if (text) for (const ch of text) queue.push(ch); },
    end(fullText) { pendingFull = (typeof fullText === "string" && fullText) ? fullText : null; done = true; },
    cancel() { done = true; queue = []; if (cursor.parentNode) cursor.remove(); },
    finished,
    get text() { return body.textContent; }
  };
}
