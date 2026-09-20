/* ============================================================================
   app.js — JAWAD HAMZA / Deployment Register

   Preloader · Lenis-style inertia scroll · custom lerp cursor · GSAP
   ScrollTrigger pinned horizontal showcase and field log · sticky time
   stack · parallax · hover-peek index · command palette · drawer · lightbox.
   Everything is derived from PROJECTS in data.js.
   ========================================================================= */
(() => {
"use strict";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE  = matchMedia("(pointer: coarse)").matches;
const HAS_GSAP = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);

const byId = Object.fromEntries(PROJECTS.map(p => [p.id, p]));
/* the systems that get a full row in the index; everything else is mentioned
   as a chip below them */
const HEADLINE = ["bloodbank", "lims", "hmis", "vendora", "rms", "listen", "nexus", "futurespace"];

/* ============================================================ SMOOTH SCROLL
   Lenis-style: intercept the wheel, lerp toward a target, and drive the REAL
   window scroll. Because it is real scroll, `position: sticky` and
   ScrollTrigger keep working — unlike transform-based smooth-scroll libraries.
   ========================================================================= */
const smoother = (() => {
  const on = !REDUCED && !COARSE;
  let target = 0, cur = 0, running = false;
  const maxY = () => document.documentElement.scrollHeight - innerHeight;

  function loop() {
    cur += (target - cur) * 0.105;
    if (Math.abs(target - cur) < 0.4) cur = target;
    window.scrollTo(0, cur);
    if (cur !== target) requestAnimationFrame(loop);
    else running = false;
  }
  function start() { if (!running) { running = true; requestAnimationFrame(loop); } }

  function init() {
    target = cur = window.scrollY;
    if (!on) return;
    addEventListener("wheel", ev => {
      if (ev.ctrlKey) return;
      if (isOverlayOpen()) return;
      /* let inner scrollers (drawer body, screenshot strip) keep native wheel */
      if (ev.target.closest && ev.target.closest(".drawer__body, .shots, .palette__list")) return;
      ev.preventDefault();
      target = clamp(target + ev.deltaY, 0, maxY());
      start();
    }, { passive: false });

    /* Anything that scrolls us by other means (scrollbar drag, keyboard,
       find-in-page) resyncs the target so we never fight the browser. */
    addEventListener("scroll", () => {
      if (Math.abs(window.scrollY - cur) > 3) { target = cur = window.scrollY; }
    }, { passive: true });
    addEventListener("resize", () => { target = cur = window.scrollY; });
  }
  function to(y) {
    y = clamp(y, 0, maxY());
    if (!on) { window.scrollTo({ top: y, behavior: REDUCED ? "auto" : "smooth" }); return; }
    target = y; start();
  }
  return { init, to, get target() { return target; } };
})();

const isOverlayOpen = () =>
  drawer.open || palette.open || lb.open || $("#help")?.classList.contains("is-on");

/* ================================================================== THEME */
const rootEl = document.documentElement;
const currentTheme = () => rootEl.getAttribute("data-theme") ||
  (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
function syncToggle() {
  const el = $("#theme");
  if (el) el.setAttribute("aria-checked", String(currentTheme() === "dark"));
}
function setTheme(t) {
  rootEl.setAttribute("data-theme", t);
  try { localStorage.setItem("jh-theme", t); } catch (e) {}
  syncToggle();
  requestAnimationFrame(readTokens);
}
try {
  const s = localStorage.getItem("jh-theme");
  if (s === "light" || s === "dark") rootEl.setAttribute("data-theme", s);
} catch (e) {}

/* ============================================================ CUSTOM CURSOR */
const cursor = (() => {
  if (COARSE) return { setLabel(){}, };
  const ring = $("#cursor"), dot = $("#cursorDot"), label = $("#cursorLabel");
  let rx = innerWidth / 2, ry = innerHeight / 2, mx = rx, my = ry;

  addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    const t = e.target.closest("[data-cursor]");
    setLabel(t ? t.dataset.cursor : "");
  }, { passive: true });
  addEventListener("mouseleave", () => { ring.classList.add("is-hide"); dot.classList.add("is-hide"); });
  addEventListener("mouseenter", () => { ring.classList.remove("is-hide"); dot.classList.remove("is-hide"); });

  function setLabel(text) {
    if (text) { label.textContent = text; ring.classList.add("is-label"); dot.classList.add("is-label"); }
    else { ring.classList.remove("is-label"); dot.classList.remove("is-label"); }
  }
  (function frame() {
    rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(frame);
  })();
  return { setLabel };
})();

/* ================================================================== CLOCK */
function tickClock() {
  const el = $("#clock"); if (!el) return;
  el.textContent = new Date().toLocaleTimeString("en-GB",
    { timeZone: "Asia/Karachi", hour12: false }) + " PKT";
}

/* ============================================================== PRELOADER */
function runLoader(done) {
  const el = $("#loader");
  if (!el || REDUCED) { el && el.remove(); done(); return; }
  const num = $("#loadNum"), bar = $("#loadBar");
  let n = 0;
  const step = () => {
    n = Math.min(100, n + Math.random() * 9 + 3);
    num.firstChild.nodeValue = String(Math.floor(n)).padStart(2, "0");
    bar.style.width = n + "%";
    if (n < 100) setTimeout(step, 55 + Math.random() * 70);
    else setTimeout(() => {
      el.classList.add("is-done");
      document.body.classList.remove("is-locked");
      done();
      setTimeout(() => el.remove(), 1200);
    }, 260);
  };
  setTimeout(step, 180);
}

/* =========================================================== TYPE REVEALS */
function splitWords(el) {
  if (el.dataset.split) return;
  el.dataset.split = "1";
  el.innerHTML = el.textContent.trim().split(/\s+/)
    .map(w => `<span class="word"><i>${esc(w)}</i></span>`).join(" ");
}
function animateIn() {
  if (!HAS_GSAP || REDUCED) {
    $$(".reveal-line > i, .word > i").forEach(i => (i.style.transform = "none"));
    return;
  }
  gsap.to("#hero .reveal-line > i",
    { y: "0%", duration: 1.15, ease: "expo.out", stagger: 0.085, delay: 0.12 });
  gsap.from("#hero .hero__top, #hero .hero__foot",
    { y: 26, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1, delay: 0.5 });

  /* every other headline reveals as it arrives */
  $$("[data-split]").forEach(el => {
    gsap.to(el.querySelectorAll(".word > i"), {
      y: "0%", duration: 1, ease: "expo.out", stagger: 0.045,
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });
  /* generic fade-ups */
  $$("[data-up]").forEach(el => {
    gsap.from(el, {
      y: 34, opacity: 0, duration: 0.95, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
    });
  });
}

const stampHTML = p => {
  const s = STATUS[p.status];
  return `<span class="stamp stamp--${s.tone}">${s.label}</span>`;
};

/* ============================================================== THE OFFER
   Four things that can be commissioned. Each one closes with the register
   entries that already prove it — counted from PROJECTS, so the number under
   a service can never drift away from what the index below actually holds.
   ========================================================================= */
function buildServices() {
  const host = $("#offer"); if (!host) return;

  host.innerHTML = SERVICES.map((s, i) => {
    const built = s.systems.map(id => byId[id]).filter(Boolean);
    const live = built.filter(p => p.status === "production").length;
    const proof = live
      ? `${built.length} on the register · ${live} in production`
      : `${built.length} on the register`;
    return `
    <article class="svc" data-up>
      <div class="svc__h">
        <span class="svc__n">${String(i + 1).padStart(2, "0")}</span>
        <h3>${s.name}</h3>
      </div>
      <p class="svc__line">${s.line}</p>
      <ul class="svc__gets">${s.gets.map(g => `<li>${g}</li>`).join("")}</ul>
      <div class="svc__proof">
        <span class="svc__proofk">${esc(proof)}</span>
        <div class="svc__sys">${built.map(p => `
          <button class="syschip" data-open="${p.id}" data-cursor="Open"
                  aria-label="Open ${esc(p.name)}">
            <i class="syschip__d tone--${STATUS[p.status].tone}" aria-hidden="true"></i>
            ${esc(p.name)}
          </button>`).join("")}</div>
      </div>
    </article>`;
  }).join("");
}

/* ============================================================== INDEX LIST */
const ALL_INTRO = "Five registers, filtered in place. Pick one to read what it covers.";

function buildIndex() {
  const host = $("#idx");
  const head = new Set(HEADLINE);
  const lead = HEADLINE.map(id => byId[id]).filter(Boolean);
  const rest = PROJECTS.filter(p => !head.has(p.id));

  const rows = lead.map((p, i) => `
      <button class="row" data-open="${p.id}" data-peek="${p.id}" data-cursor="Open">
        <span class="row__n">${String(i + 1).padStart(2, "0")}</span>
        <span class="row__name">${p.name}</span>
        <span class="row__meta">${esc(p.stack.slice(0, 2).join(" · "))}</span>
        ${stampHTML(p)}
      </button>`).join("");

  const regs = ["A", "B", "C", "D", "E"].filter(k => rest.some(p => p.reg === k));
  const filters = `<button aria-pressed="true" data-reg="">All<b>${rest.length}</b></button>` +
    regs.map(k => `<button aria-pressed="false" data-reg="${k}">${esc(REGISTERS[k].title)}<b>${
      rest.filter(p => p.reg === k).length}</b></button>`).join("");

  /* Ruled index entries rather than 24 identical pills. Each one carries the
     hover preview the headline rows use, so the picture still arrives without
     the layout having to hold room for it. */
  const chips = rest.map((p, i) => `
      <button class="ridx__i" data-open="${p.id}" data-peek="${p.id}" data-reg="${p.reg}"
              data-cursor="Open" aria-label="${esc(p.name)} — ${esc(p.tag)}">
        <span class="ridx__n2">${String(i + 1).padStart(2, "0")}</span>
        <span class="ridx__name">${p.name}</span>
        <i class="ridx__lead" aria-hidden="true"></i>
        <span class="ridx__tail">
          <span class="ridx__reg">${esc(p.reg)}</span>
          <span class="ridx__dot tone--${STATUS[p.status].tone}"
                title="${esc(STATUS[p.status].label)}"></span>
        </span>
      </button>`).join("");

  host.innerHTML = rows + `
    <div class="also">
      <div class="also__head">
        <div>
          <span class="also__k">Also on the record · ${rest.length} more</span>
          <div class="also__t">Smaller builds, <em>same care.</em></div>
        </div>
        <div class="filt" id="alsoFilt" role="group" aria-label="Filter by register">${filters}</div>
      </div>
      <p class="also__intro" id="alsoIntro" aria-live="polite">${esc(ALL_INTRO)}</p>
      <div class="ridx" id="alsoGrid">${chips}</div>
      <div class="ridx__legend" aria-hidden="true">
        <span><i style="background:var(--live)"></i>In production</span>
        <span><i style="background:var(--pilot)"></i>Pilot</span>
        <span><i style="background:var(--violet)"></i>In development</span>
        <span><i style="background:var(--grey-tone)"></i>Delivered</span>
      </div>
    </div>`;

  const num = $("#idxCount");
  if (num) num.textContent = `Full index · ${lead.length} headline · ${PROJECTS.length} systems`;

  /* register filter: dims everything that doesn't match, keeps the layout */
  const filt = $("#alsoFilt"), grid = $("#alsoGrid"), intro = $("#alsoIntro");
  filt.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-reg]"); if (!b) return;
    const k = b.dataset.reg;
    $$("button", filt).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    $$(".ridx__i", grid).forEach(c => {
      if (!k || c.dataset.reg === k) c.removeAttribute("data-off");
      else c.setAttribute("data-off", "");
    });
    /* each register carries a written description of what belongs in it —
       show it, rather than leaving the reader to infer it from the chips */
    intro.textContent = k ? REGISTERS[k].intro : ALL_INTRO;
    intro.classList.remove("is-swap"); void intro.offsetWidth; intro.classList.add("is-swap");
  });
}

/* floating preview that trails the cursor over the index */
function wirePeek() {
  if (COARSE) return;
  const peek = $("#peek");
  let px = 0, py = 0, tx = 0, ty = 0, on = false;

  $("#idx").addEventListener("pointerover", ev => {
    const row = ev.target.closest("[data-peek]");
    /* chips unfold their own summary inline, so the preview only follows rows */
    if (!row) { if (on) { peek.classList.remove("is-on"); on = false; } return; }
    const p = byId[row.dataset.peek];
    const shot = p.shots[0];
    peek.innerHTML = shot
      ? `<img src="${shot.src}" alt="">`
      : `<span class="peek__glyph"><b>${p.modules ? p.modules.items.length : p.stack.length}</b>
           <span>${p.modules ? "modules" : "tech"}</span></span>`;
    peek.classList.add("is-on"); on = true;
  });
  $("#idx").addEventListener("pointerleave", () => { peek.classList.remove("is-on"); on = false; });
  addEventListener("pointermove", ev => { tx = ev.clientX; ty = ev.clientY; }, { passive: true });

  (function frame() {
    px += (tx - px) * 0.13; py += (ty - py) * 0.13;
    if (on) peek.style.transform = `translate(${px}px, ${py}px) translate(-50%,-50%)`;
    requestAnimationFrame(frame);
  })();
}

/* ================================================================ MARQUEE */
function buildMarquee() {
  const el = $("#marquee");
  const words = ["Forward deployed", "Mirpur · Azad Kashmir", "Django", "ASP.NET Core",
                 "Next.js", "Blood banking", "Hospital systems", "Genetics LIMS",
                 "Point of sale", "Self-hosted AI", "Available for work"];
  const run = `<span>${words.join("</span><span>")}</span>`;
  el.innerHTML = run + run;                       // duplicated for a seamless loop
  if (REDUCED) return;
  let x = 0;
  const half = () => el.scrollWidth / 2;
  (function frame() {
    x -= 0.55;
    if (-x >= half()) x = 0;
    el.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(frame);
  })();
}

/* ============================================================== HERO FIELD
   Falling code. Columns of real source glyphs drift down behind the headline;
   the leading character of each column burns brighter, and anything near the
   pointer flips to the accent and speeds up. One canvas, no DOM per glyph.
   ========================================================================= */
function heroField() {
  const c = $("#heroField"); if (!c || REDUCED) return;
  const x = c.getContext("2d", { alpha: true });

  /* glyphs pulled from the languages actually in the register */
  const POOL = ("{}()[]<>/*+-=;:.,|&!?_#$@" +
                "0123456789" +
                "abcdefghijklmnopqrstuvwxyz").split("");
  const WORDS = ["def", "async", "await", "SELECT", "INSERT", "class", "return",
                 "git", "POST", "200", "psql", "venv", "npm", "docker", "null",
                 "true", "=>", "()", "::", "&&", "||", "->", "self", "const"];

  const FS = 15;                       // glyph cell
  let w = 0, h = 0, cols = [], mx = -9999, my = -9999, last = 0;

  const pick = () => Math.random() < 0.14
    ? WORDS[(Math.random() * WORDS.length) | 0]
    : POOL[(Math.random() * POOL.length) | 0];

  function build() {
    const r = c.parentElement.getBoundingClientRect();
    w = r.width; h = r.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + "px"; c.style.height = h + "px";
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.ceil(w / FS);
    cols = Array.from({ length: n }, (_, i) => ({
      x: i * FS + FS * 0.5,
      y: Math.random() * -h * 1.4,
      sp: 26 + Math.random() * 58,               // px per second
      len: 7 + ((Math.random() * 14) | 0),
      glyphs: Array.from({ length: 26 }, pick),
    }));
  }
  build();
  new ResizeObserver(build).observe(c.parentElement);
  addEventListener("mousemove", e => {
    const r = c.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  }, { passive: true });
  addEventListener("mouseleave", () => { mx = my = -9999; });

  x.textAlign = "center";
  const R = 190;                                  // pointer influence radius

  function frame(ts) {
    requestAnimationFrame(frame);
    if (ts - last < 33) return;                   // ~30fps is plenty, and cheap
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;

    x.clearRect(0, 0, w, h);
    x.font = "500 " + FS * 0.78 + "px ui-monospace, 'JetBrains Mono', monospace";

    for (const col of cols) {
      const near = Math.abs(col.x - mx) < R
        ? 1 - Math.abs(col.x - mx) / R : 0;
      col.y += (col.sp + near * 90) * dt;
      if (col.y - col.len * FS > h) {
        col.y = -Math.random() * h * 0.5;
        col.len = 7 + ((Math.random() * 14) | 0);
      }
      if (Math.random() < 0.06) col.glyphs[(Math.random() * col.glyphs.length) | 0] = pick();

      for (let k = 0; k < col.len; k++) {
        const gy = col.y - k * FS;
        if (gy < -FS || gy > h + FS) continue;
        const dy = Math.abs(gy - my);
        const hot = near > 0 && dy < R ? near * (1 - dy / R) : 0;
        const fade = 1 - k / col.len;
        if (k === 0) {
          x.fillStyle = tokens.accent2 || tokens.accent;
          x.globalAlpha = 0.5 + hot * 0.5;
        } else {
          x.fillStyle = hot > 0.05 ? tokens.accent : tokens.faint;
          x.globalAlpha = (0.035 + fade * 0.16) + hot * 0.55;
        }
        x.fillText(col.glyphs[k % col.glyphs.length], col.x, gy);
      }
    }
    x.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------- live deployment ticker */
function heroTicker() {
  const el = $("#heroLive"); if (!el) return;
  const live = PROJECTS.filter(p => p.status === "production");
  let i = 0;
  const paint = () => {
    const p = live[i % live.length];
    el.innerHTML = `<i></i><b class="swap">${esc(p.code)}</b>
      <span class="swap">${esc(p.name)}</span><em class="swap">Online</em>`;
    i++;
  };
  paint();
  if (!REDUCED) setInterval(paint, 3200);
}

/* =========================================================== FOCUS / INERT
   The drawer, palette and lightbox all declare aria-modal="true". Without
   this that claim is false: Tab walks straight out of the dialog into the
   page behind it, which a screen reader is still reading out. `inert` on the
   sibling regions does both jobs at once — it removes them from the tab order
   and from the accessibility tree — and the stack keeps nesting honest when
   the lightbox opens on top of an already-open drawer.
   ========================================================================= */
const overlayStack = [];

function trapFocus(root, initial) {
  if (!root || overlayStack.some(o => o.root === root)) return;
  const restore = document.activeElement;
  root.removeAttribute("inert");
  /* #scrim is the shared backdrop and must stay clickable to close on tap */
  const inerted = [...document.body.children]
    .filter(el => el !== root && el.id !== "scrim" && !el.hasAttribute("inert"));
  inerted.forEach(el => el.setAttribute("inert", ""));
  overlayStack.push({ root, restore, inerted });
  if (initial) setTimeout(() => initial.focus(), 60);
}

function releaseFocus(root) {
  if (!root) return;
  const i = overlayStack.findIndex(o => o.root === root);
  root.setAttribute("inert", "");
  if (i < 0) return;
  const [o] = overlayStack.splice(i, 1);
  o.inerted.forEach(el => el.removeAttribute("inert"));
  if (o.restore && o.restore.isConnected && o.restore.focus) o.restore.focus({ preventScroll: true });
}

/* ================================================================ DRAWER */
const drawer = { open: false };

/* Where a project's screenshots actually came from. Most are captured from the
   running application; a couple are not, and saying so is the whole point of
   claiming it anywhere at all. */
const shotSource = p => p.shotSrc || "from the running application";

function drawerHTML(p) {
  const shots = p.shots.length ? `
    <div>
      <div class="dlabel">Screens · ${p.shots.length} ${esc(shotSource(p))}
        <span class="shots__nav" aria-hidden="true">
          <button type="button" data-sh="-1" aria-label="Previous screen">&#8592;</button>
          <button type="button" data-sh="1" aria-label="Next screen">&#8594;</button>
        </span></div>
      ${p.shotNote ? `<p class="shotnote">${esc(p.shotNote)}</p>` : ""}
      <div class="shots" id="dshots" tabindex="0" aria-label="Screenshots — scroll sideways, drag, or use the arrows">${p.shots.map((s, i) => `
        <figure data-pid="${p.id}" data-i="${i}" data-cursor="View">
          <img src="${s.src}" alt="${esc(s.cap)}" loading="lazy" decoding="async">
          <figcaption>${esc(s.cap)}</figcaption>
        </figure>`).join("")}</div>
    </div>` : "";
  const mods = p.modules ? `
    <div>
      <div class="dlabel">${esc(p.modules.title)} · ${esc(p.modules.count)}</div>
      <div class="modmap">${p.modules.items.map(it =>
        `<span>${esc(it[0])}${it[1] ? `<b>${esc(it[1])}</b>` : ""}</span>`).join("")}</div>
    </div>` : "";
  return `
    <h2>${p.name}</h2>
    <p class="drawer__lede">${p.blurb}</p>
    <dl class="spec">${p.spec.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}
      <div><dt>Domain</dt><dd>${esc(DOMAINS[p.domain])}</dd></div></dl>
    <div><div class="dlabel">Built with</div>
      <ul class="chips">${p.stack.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
    ${shots}${mods}`;
}
function openDrawer(id) {
  const p = byId[id]; if (!p) return;
  drawer.open = true;
  $("#dstamp").innerHTML = stampHTML(p) + `<span class="code">${esc(p.code)}</span>`;
  $("#dbody").innerHTML = drawerHTML(p);
  $("#dbody").scrollTop = 0;
  $("#drawer").classList.add("is-on");
  document.body.classList.add("is-locked");
  cursor.setLabel("");
  trapFocus($("#drawer"), $("#dclose"));
}
function closeDrawer() {
  drawer.open = false;
  $("#drawer").classList.remove("is-on");
  releaseFocus($("#drawer"));
  if (!lb.open) document.body.classList.remove("is-locked");
}

/* ================================================================= TOKENS
   The hero canvas paints with the same custom properties the stylesheet
   uses, so a theme switch repaints instead of drifting out of sync. These
   names must match app.css exactly — a typo is silent, because canvas just
   ignores an empty fillStyle and keeps whatever colour was set last. */
let tokens = {};
function readTokens() {
  const cs = getComputedStyle(document.body);
  const g = n => cs.getPropertyValue(n).trim();
  tokens = { live: g("--live"), amber: g("--pilot"), violet: g("--violet"), grey: g("--grey-tone"),
             lineSoft: g("--line-soft"), faint: g("--faint"), ground: g("--ground"),
             mapBg: g("--raise-2"), accent: g("--accent"), accent2: g("--accent-2") };
}

/* ============================================================== FIELD LOG
   Four full-viewport panels driven sideways by vertical scroll while the
   viewport is pinned. Every reveal inside a panel is triggered through
   `containerAnimation`, which is how ScrollTrigger tracks an element that is
   moving horizontally under a pin rather than down the page.
   ========================================================================= */
function buildField() {
  const track = $("#fieldTrack"); if (!track) return;
  const total = String(FIELD.length).padStart(2, "0");

  track.innerHTML = FIELD.map(f => {
    const media = f.shot
      ? `<div class="fpanel__media">
           <img src="${f.shot}" alt="${esc(f.place)}" loading="lazy" decoding="async">
         </div>`
      : `<div class="fplate">
           <b>${esc(f.plate.big)}</b><span>${esc(f.plate.label)}</span>
           <small>${esc(f.plate.note)}</small>
         </div>`;
    return `<article class="fpanel">
      <div class="fpanel__body">
        <span class="fpanel__no">${esc(f.no)} <i>/ ${total}</i></span>
        <h3 class="fpanel__place">${f.place}</h3>
        <span class="fpanel__city">${f.city}</span>
        <span class="fpanel__role">${f.role}</span>
        <p class="fpanel__line">${f.line}</p>
        <div class="facts">${f.facts.map(([k, v]) => `
          <div class="fact"><span class="fact__k">${k}</span><i class="fact__r"></i>
            <span class="fact__v">${v}</span></div>`).join("")}
        </div>
        <button class="fpanel__open" data-open="${f.id}" data-cursor="Open">
          Open the case<i></i>
        </button>
      </div>
      ${media}
    </article>`;
  }).join("");

  const count = $("#fieldCount"), rail = $("#fieldRail");
  const panels = $$(".fpanel", track);

  /* Below 900px, and on any touch device, the stylesheet has already turned
     this into an ordinary vertical read — pinning a sideways track under a
     thumb is worse than no effect at all. Reveal on plain scroll instead. */
  const horizontal = HAS_GSAP && !COARSE && !REDUCED && innerWidth > 900;
  if (!horizontal) {
    if (HAS_GSAP && !REDUCED) {
      panels.forEach(p => {
        gsap.to(p.querySelectorAll(".fact__r"), {
          scaleX: 1, duration: .6, ease: "expo.out", stagger: .07,
          scrollTrigger: { trigger: p, start: "top 72%" },
        });
      });
    } else {
      $$(".fact__r", track).forEach(r => (r.style.transform = "none"));
    }
    return;
  }

  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const run = gsap.to(track, {
    x: () => -dist(), ease: "none",
    scrollTrigger: {
      trigger: "#field .field__viewport", start: "top top",
      end: () => "+=" + dist(), pin: true, scrub: .55, invalidateOnRefresh: true,
      onUpdate: self => {
        if (rail) rail.style.width = (self.progress * 100).toFixed(2) + "%";
        const i = clamp(Math.floor(self.progress * FIELD.length) + 1, 1, FIELD.length);
        if (count) count.innerHTML = String(i).padStart(2, "0") + ` <i>/ ${total}</i>`;
        /* each image drifts against the direction of travel, so the media
           reads as sitting behind the frame rather than glued to it */
        panels.forEach(p => {
          const img = p.querySelector(".fpanel__media img"); if (!img) return;
          const r = p.getBoundingClientRect();
          const k = (r.left + r.width / 2 - innerWidth / 2) / innerWidth;
          img.style.transform = `translateX(${(k * 4.5).toFixed(2)}%)`;
        });
      },
    },
  });

  /* per-panel reveals, tracked through the horizontal tween */
  panels.forEach(p => {
    const st = { trigger: p, containerAnimation: run, toggleActions: "play none none reverse" };
    gsap.from(p.querySelectorAll(".fpanel__no, .fpanel__place, .fpanel__city, .fpanel__role, .fpanel__line"), {
      y: 34, opacity: 0, duration: .85, ease: "expo.out", stagger: .07,
      scrollTrigger: { ...st, start: "left 72%" },
    });
    gsap.to(p.querySelectorAll(".fact__r"), {
      scaleX: 1, duration: .7, ease: "expo.out", stagger: .08,
      scrollTrigger: { ...st, start: "left 60%" },
    });
    gsap.from(p.querySelectorAll(".fpanel__media, .fplate"), {
      scale: .92, opacity: 0, duration: 1, ease: "expo.out",
      scrollTrigger: { ...st, start: "left 80%" },
    });
  });
}

/* ============================================================= TIME STACK
   Career cards that come to rest one under the other, each new card riding
   up over the last. The resting is pure CSS `position: sticky`; GSAP only
   scales and dims the card being covered, so if the tween never runs the
   section is still a perfectly readable list.
   ========================================================================= */
function buildStack() {
  const host = $("#stackRun"); if (!host) return;
  const list = [...EXPERIENCE].reverse();          // oldest at the back, current on top
  const total = String(list.length).padStart(2, "0");
  host.innerHTML = list.map((e, i) => {
    /* an explicit flag, not a date string: two roles run concurrently and
       only one of them is the headline */
    const now = !!e.now;
    /* Each role names the systems that came out of it, and each one opens the
       same drawer as the register — so a claim on the CV is one click from
       the thing itself rather than something you have to take on trust. */
    const built = (e.systems || []).map(id => byId[id]).filter(Boolean);
    return `
    <article class="tcard${now ? " is-now" : ""}" style="--i:${i}">
      <div class="tcard__bar">
        ${now ? `<span class="tcard__now">Now</span>` : ""}
        ${!now && e.current ? `<span class="tcard__cur">Current</span>` : ""}
        ${e.where ? `<span class="tcard__where">${e.where}</span>` : ""}
        <span class="tcard__i">${String(i + 1).padStart(2, "0")} / ${total}</span>
      </div>
      <div class="tcard__in">
        <h3>${e.role}</h3>
        <span class="tcard__org">${e.org}${e.url ? `
          <a class="tcard__url" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer"
             data-cursor="Visit">${esc(e.urlLabel || e.url)}<i aria-hidden="true">&#8599;</i></a>` : ""}</span>
        <ul>${e.points.map(p => `<li>${p}</li>`).join("")}</ul>
        ${built.length ? `
          <div class="tcard__out">
            <span class="tcard__outk">Shipped out of it</span>
            <div class="tcard__sys">${built.map(p => `
              <button class="syschip" data-open="${p.id}" data-cursor="Open"
                      aria-label="Open ${esc(p.name)}">
                <i class="syschip__d tone--${STATUS[p.status].tone}" aria-hidden="true"></i>
                ${esc(p.name)}
              </button>`).join("")}</div>
          </div>` : ""}
      </div>
    </article>`;
  }).join("") +
    /* real trailing element, not padding on the run — see .stack__tail in the
       stylesheet for why padding cannot give the last card its sticky range */
    `<div class="stack__tail" aria-hidden="true"></div>`;

  if (!HAS_GSAP || REDUCED) return;
  const cards = $$(".tcard", host);

  /* spine: draws down the section as the stack is worked through */
  const spine = $("#stackSpine");
  if (spine) {
    gsap.fromTo(spine, { scaleY: 0 }, {
      scaleY: 1, ease: "none", transformOrigin: "top center",
      scrollTrigger: { trigger: host, start: "top 65%", end: "bottom 75%", scrub: true },
    });
  }

  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;           // the top card is never covered
    gsap.to(card, {
      scale: .945, "--dim": .62, ease: "none",
      /* dim only across the overlap itself, not the whole approach */
      scrollTrigger: { trigger: cards[i + 1], start: "top 82%", end: "top 34%", scrub: true },
    });
  });
}

/* ================================================================ PARALLAX
   Opt-in with data-parallax="<pixels of travel>". The element drifts by that
   much across the whole time it is on screen — enough to feel like depth,
   never enough to pull it out of its frame. */
function wireParallax() {
  if (!HAS_GSAP || REDUCED) return;
  $$("[data-parallax]").forEach(el => {
    const d = parseFloat(el.dataset.parallax) || 16;
    gsap.fromTo(el, { y: -d }, {
      y: d, ease: "none",
      scrollTrigger: { trigger: el.parentElement || el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}

/* ========================================================= TECHNOLOGY SPREAD
   A tally, not a bar chart. Each row is one mark per system out of all 32, so
   the denominator is on screen and the reader can count it — the old bars
   normalised to the leader, which drew Python at full width when it is in 7
   of 32, and made 2 look like a third of the work.

   Counts come from the canonical names in TECH_ALIASES, because `stack` is
   written per project ("Next.js 16", "Next.js App Router") and counting the
   raw strings counted spellings instead of technologies.

   One measure, one hue: this is a magnitude chart of a single series, so the
   marks carry the accent and nothing here is colour-coded by category. The
   count is printed on every row, so identity never rests on colour.
   ========================================================================= */
/* Case-insensitive, because the capability lines are written in sentence case
   ("vector search") while the register writes them as they appear on the
   project ("Vector search"). Exact-case stack strings resolve identically. */
const ALIAS_CI = new Map(Object.entries(TECH_ALIASES).map(([k, v]) => [k.toLowerCase(), v]));
const canonTech = s => {
  const t = String(s).trim();
  return ALIAS_CI.get(t.toLowerCase()) || t;
};

function techIndex() {
  const m = new Map();
  PROJECTS.forEach(p => {
    const seen = new Set();
    p.stack.forEach(s => {
      const c = canonTech(s);
      if (seen.has(c)) return;          // one project counts once per technology
      seen.add(c);
      if (!m.has(c)) m.set(c, []);
      m.get(c).push(p.name);
    });
  });
  return m;
}

function renderSpread() {
  const host = $("#spread"); if (!host) return;
  const idx = techIndex(), N = PROJECTS.length;

  const groups = TECH_GROUPS.map(([label, list]) => {
    const rows = list
      .map(t => [t, idx.get(t) || []])
      .filter(([, u]) => u.length >= 2)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    return [label, rows];
  }).filter(([, rows]) => rows.length);

  host.innerHTML = groups.map(([label, rows]) => `
    <section class="spg">
      <h3 class="spg__k">${esc(label)}<i></i><b>${rows.length}</b></h3>
      ${rows.map(([t, used]) => `
        <div class="trow" tabindex="0" data-used="${esc(used.join(" · "))}"
             data-tech="${esc(t)}" data-cursor="${used.length} / ${N}">
          <span class="trow__k">${esc(t)}</span>
          <span class="trow__track" aria-hidden="true">${
            Array.from({ length: N }, (_, i) =>
              `<i${i < used.length ? ' class="on"' : ""}></i>`).join("")
          }</span>
          <span class="trow__v">${used.length}</span>
          <span class="sr">${esc(t)}: used in ${used.length} of ${N} systems — ${esc(used.join(", "))}.</span>
        </div>`).join("")}
    </section>`).join("");

  const note = $("#spreadNote");
  if (note) note.textContent = `One mark per system · ${N} on the register`;

  /* hover / focus readout — names the systems behind the row */
  const tip = $("#spreadTip");
  if (tip) {
    const show = el => {
      tip.innerHTML = `<b>${esc(el.dataset.tech)}</b><span>${esc(el.dataset.used)}</span>`;
      const box = (tip.offsetParent || host).getBoundingClientRect();
      const r = el.getBoundingClientRect();
      tip.classList.add("is-on");
      tip.style.left = clamp(r.left - box.left, 0, Math.max(0, box.width - tip.offsetWidth)) + "px";
      tip.style.top = (r.bottom - box.top + 6) + "px";
    };
    const hide = () => tip.classList.remove("is-on");
    host.addEventListener("pointerover", e => {
      const row = e.target.closest(".trow"); row ? show(row) : hide();
    });
    host.addEventListener("pointerleave", hide);
    host.addEventListener("focusin", e => {
      const row = e.target.closest(".trow"); if (row) show(row);
    });
    host.addEventListener("focusout", hide);
  }

  if (!HAS_GSAP || REDUCED) return;
  $$(".spg", host).forEach(g => {
    gsap.from(g.querySelectorAll(".trow__track i.on"), {
      scaleX: 0, transformOrigin: "left center", duration: .5, ease: "expo.out",
      stagger: { each: .012, from: "start" },
      scrollTrigger: { trigger: g, start: "top 88%" },
    });
  });
}

/* ======================================================== COMMAND PALETTE */
const palette = { open: false, items: [], idx: 0 };
function buildPaletteItems(q) {
  const out = [];
  const push = (name, sub, kind, run) => out.push({ name, sub, kind, run });
  PROJECTS.forEach(p => push(p.name, `${STATUS[p.status].label} · ${p.code}`, "Project", () => openDrawer(p.id)));
  [["index", "The register"], ["field", "The field log"],
   ["track", "The time stack"], ["about", "About"], ["contact", "Contact"]]
    .forEach(([id, l]) => push(l, "Jump to section", "Section", () => jump(id)));
  push(currentTheme() === "dark" ? "Switch to light" : "Switch to dark", "Toggle appearance",
       "Action", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
  if (!q) return out.slice(0, 40);
  const needle = q.toLowerCase();
  return out.map(it => ({ it, s: score(it.name.toLowerCase(), needle) + score(it.sub.toLowerCase(), needle) * .3 }))
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 40).map(x => x.it);
}
function score(hay, needle) {
  if (hay.startsWith(needle)) return 120;
  if (hay.includes(needle)) return 80;
  let i = 0, s = 0, run = 0;
  for (const ch of hay) { if (i < needle.length && ch === needle[i]) { i++; run++; s += 4 + run * 2; } else run = 0; }
  return i === needle.length ? s : 0;
}
function renderPalette() {
  const list = $("#plist");
  palette.items = buildPaletteItems($("#pq").value);
  if (!palette.items.length) { list.innerHTML = `<div class="palette__empty">Nothing matches that.</div>`; return; }
  palette.idx = clamp(palette.idx, 0, palette.items.length - 1);
  list.innerHTML = palette.items.map((it, i) => `
    <div class="pitem" id="pitem-${i}" data-i="${i}" data-active="${i === palette.idx}"
         role="option" aria-selected="${i === palette.idx}">
      <div class="pitem__t"><div class="pitem__n">${esc(it.name)}</div>
        <div class="pitem__s">${esc(it.sub)}</div></div>
      <span class="pitem__k">${esc(it.kind)}</span></div>`).join("");
  /* the input keeps focus, so the active row has to be named for a reader */
  $("#pq").setAttribute("aria-activedescendant", "pitem-" + palette.idx);
  list.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
}
function openPalette() {
  palette.open = true; palette.idx = 0;
  $("#scrim").classList.add("is-on"); $("#palette").classList.add("is-on");
  $("#pq").value = ""; renderPalette();
  trapFocus($("#palette"), $("#pq"));
}
function closePalette() {
  palette.open = false;
  $("#scrim").classList.remove("is-on"); $("#palette").classList.remove("is-on");
  releaseFocus($("#palette"));
}

/* ================================================================ LIGHTBOX */
const lb = { open: false, shots: [], i: 0, title: "" };
/* ------------------------------------------------ screenshot strip
   A sideways strip inside a vertical drawer: the wheel steers it sideways
   while it still has room to move, it can be dragged, and the arrows step
   one screen at a time. Click and drag are told apart by distance. */
const strip = { dragged: false, target: null, anim: false, el: null };
const stripMax = el => Math.max(0, el.scrollWidth - el.clientWidth);
/* glide toward a target instead of jumping, so a wheel tick feels like the
   strip is carrying itself along */
function stripGlide(el, to) {
  strip.el = el;
  strip.target = clamp(to, 0, stripMax(el));
  if (REDUCED) { el.scrollLeft = strip.target; return; }
  if (strip.anim) return;
  strip.anim = true;
  /* snapping fights a frame-by-frame scroll (it pulls each step back to the
     nearest snap point), so it is switched off for the duration */
  el.classList.add("is-glide");
  let frames = 0;
  const done = () => { strip.anim = false; if (strip.el) strip.el.classList.remove("is-glide"); };
  (function frame() {
    if (!strip.el || !strip.el.isConnected || strip.target === null) { done(); return; }
    const cur = strip.el.scrollLeft, next = cur + (strip.target - cur) * 0.16;
    if (Math.abs(strip.target - cur) < 0.6 || ++frames > 240) { strip.el.scrollLeft = strip.target; done(); return; }
    strip.el.scrollLeft = next;
    requestAnimationFrame(frame);
  })();
}
function stepShots(dir) {
  const el = $("#dshots"); if (!el) return;
  const fig = el.querySelector("figure");
  const w = fig ? fig.getBoundingClientRect().width + 12 : el.clientWidth * .8;
  const from = strip.anim && strip.el === el ? strip.target : el.scrollLeft;
  stripGlide(el, from + dir * w);
}
function wireShots() {
  const body = $("#dbody"); if (!body) return;

  /* capture phase so the strip sees the wheel before the drawer body does */
  body.addEventListener("wheel", ev => {
    const el = ev.target.closest("#dshots"); if (!el) return;
    if (ev.ctrlKey) return;
    let d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    if (ev.deltaMode === 1) d *= 40; else if (ev.deltaMode === 2) d *= el.clientWidth;
    const max = stripMax(el);
    if (max <= 0) return;
    const from = strip.anim && strip.el === el ? strip.target : el.scrollLeft;
    const canGo = d > 0 ? from < max - 1 : from > 1;
    if (!canGo) return;                     // at the end: let the drawer scroll on
    ev.preventDefault();
    ev.stopPropagation();
    stripGlide(el, from + d * 1.4);
  }, { passive: false, capture: true });

  let down = null;
  body.addEventListener("pointerdown", ev => {
    const el = ev.target.closest("#dshots"); if (!el || ev.button !== 0) return;
    strip.target = null;                        // a hand on the strip cancels any glide
    down = { el, x: ev.clientX, left: el.scrollLeft, id: ev.pointerId };
    strip.dragged = false;
  });
  body.addEventListener("pointermove", ev => {
    if (!down || ev.pointerId !== down.id) return;
    const dx = ev.clientX - down.x;
    if (!strip.dragged && Math.abs(dx) > 6) {
      strip.dragged = true;
      down.el.classList.add("is-drag");
      down.el.setPointerCapture(ev.pointerId);
    }
    if (strip.dragged) down.el.scrollLeft = down.left - dx;
  });
  const up = ev => {
    if (!down) return;
    down.el.classList.remove("is-drag");
    down = null;
    /* leave `dragged` set for the click that follows a drag, then clear it */
    setTimeout(() => { strip.dragged = false; }, 0);
  };
  body.addEventListener("pointerup", up);
  body.addEventListener("pointercancel", up);

  body.addEventListener("keydown", ev => {
    if (!ev.target.closest("#dshots")) return;
    if (ev.key === "ArrowRight") { ev.preventDefault(); stepShots(1); }
    if (ev.key === "ArrowLeft")  { ev.preventDefault(); stepShots(-1); }
  });
}

function openLightbox(pid, i) {
  const p = byId[pid]; if (!p || !p.shots.length) return;
  Object.assign(lb, { open: true, shots: p.shots, i, title: p.name });
  const src = $("#lbsrc");
  if (src) src.textContent = "Captured " + shotSource(p);
  /* paint before revealing, or the first frame shows an image with no src */
  paintLightbox();
  $("#lightbox").classList.add("is-on");
  document.body.classList.add("is-locked");
  trapFocus($("#lightbox"), $("#lbclose"));
}
function paintLightbox() {
  const s = lb.shots[lb.i], img = $("#lbimg");
  img.src = s.src; img.alt = s.cap;
  $("#lbtitle").textContent = lb.title; $("#lbcap").textContent = s.cap;
  $("#lbn").textContent = `${lb.i + 1} / ${lb.shots.length}`;
  $("#lbprev").hidden = $("#lbnext").hidden = lb.shots.length < 2;
  [lb.i + 1, lb.i - 1].forEach(j => {
    const n = lb.shots[(j + lb.shots.length) % lb.shots.length];
    if (n) { const im = new Image(); im.src = n.src; }
  });
}
const stepLightbox = d => { lb.i = (lb.i + d + lb.shots.length) % lb.shots.length; paintLightbox(); };
function closeLightbox() {
  lb.open = false; $("#lightbox").classList.remove("is-on");
  releaseFocus($("#lightbox"));
  if (!drawer.open) document.body.classList.remove("is-locked");
}

/* =================================================================== HELP */
function toggleHelp(force) {
  const el = $("#help");
  const on = force != null ? force : !el.classList.contains("is-on");
  el.classList.toggle("is-on", on);
  $("#scrim").classList.toggle("is-on", on);
  if (on) trapFocus(el, el); else releaseFocus(el);
}

/* ================================================================ HELPERS */
/* Both nav bars retract on a downward scroll. A jump triggered FROM one of
   them is a downward scroll, so without this the bar you just tapped slides
   away under your thumb. Hold it open until the jump settles. */
let navHold = 0;
function jump(id) {
  const el = document.getElementById(id); if (!el) return;
  navHold = performance.now() + 1200;
  smoother.to(el.getBoundingClientRect().top + window.scrollY - 10);
}
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch (e) { return; }
  const span = btn.querySelector("span") || btn;
  const old = btn.dataset.label || span.textContent;
  btn.dataset.label = old; span.textContent = "Copied"; btn.classList.add("copied");
  setTimeout(() => { span.textContent = old; btn.classList.remove("copied"); }, 1500);
}
function countUp(el) {
  const target = +el.dataset.count, suffix = el.dataset.suffix || "";
  if (REDUCED || !target) { el.textContent = target + suffix; return; }
  const t0 = performance.now();
  const tick = now => {
    const k = clamp((now - t0) / 1100, 0, 1), eased = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(target * eased) + (k === 1 ? suffix : "");
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ======================================================== STATIC SECTIONS */
/* The headline figures are counted from the register rather than typed into
   the markup, so adding or removing a project can never leave a stale number
   on the page claiming something the index below it contradicts. */
function renderFigures() {
  const counts = {
    projects: PROJECTS.length,
    live: PROJECTS.filter(p => p.status === "production").length,
    shots: PROJECTS.reduce((n, p) => n + p.shots.length, 0),
  };
  $$("[data-stat]").forEach(el => {
    const v = counts[el.dataset.stat];
    if (v != null) el.dataset.count = v;
  });
}

/* ================================================== CAPABILITY & EDUCATION
   The capability list used to be a flat set of bullets — exactly the kind of
   self-reported claim the rest of this page refuses to make. Each entry is now
   resolved against the register, so anything that has actually carried work
   says how many systems it is in, and anything that has not says nothing at
   all rather than borrowing credibility it has not earned.
   ========================================================================= */
const rxEsc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/* Resolve one capability line to the number of systems behind it.
   First an exact match on the separators these lines actually use, then a
   word-boundary search for a canonical name sitting inside the phrase — so
   "Self-hosted Ollama deployment" finds Ollama, while "SQL" never matches
   inside "PostgreSQL". Returns 0 when nothing on the register backs it. */
function skillEvidence(item, idx) {
  let best = 0, who = "";
  /* whole line first: some lines are themselves an alias ("HTML & CSS"), and
     splitting them on the ampersand would destroy the match before it is tried */
  const whole = idx.get(canonTech(item));
  if (whole) { best = whole.length; who = canonTech(item); }
  String(item).split(/\s*[·,&/]\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean)
    .forEach(f => {
      const hit = idx.get(canonTech(f));
      if (hit && hit.length > best) { best = hit.length; who = canonTech(f); }
    });
  if (!best) for (const [k, v] of idx) {
    if (k.length < 3 || v.length <= best) continue;
    if (new RegExp("(^|[^A-Za-z0-9])" + rxEsc(k) + "([^A-Za-z0-9]|$)", "i").test(item)) {
      best = v.length; who = k;
    }
  }
  return { n: best, who };
}

function renderRecord() {
  const idx = techIndex(), N = PROJECTS.length;

  /* ---- capability ---- */
  const skills = $("#skills");
  if (skills) skills.innerHTML = SKILLS.map(([group, items], gi) => {
    const rows = items.map(i => ({ label: i, ...skillEvidence(i, idx) }));
    const seen = rows.filter(r => r.n > 0).length;
    return `
    <article class="cap" data-up>
      <div class="cap__h">
        <span class="cap__n">${String(gi + 1).padStart(2, "0")}</span>
        <h3>${esc(group)}</h3>
      </div>
      <ul class="cap__l">${rows.map(r => `
        <li class="${r.n ? "is-seen" : ""}"${r.n ? ` title="${esc(r.who)} — ${r.n} of ${N} systems"` : ""}>
          <span>${r.label}</span>${r.n ? `<b>${r.n}<i class="sr"> systems on the register</i></b>` : ""}
        </li>`).join("")}
      </ul>
      ${seen ? `<span class="cap__f">${seen} of ${rows.length} carry work on the register</span>` : ""}
    </article>`;
  }).join("");

  /* ---- education ---- */
  const edu = $("#education");
  if (edu) edu.innerHTML = EDUCATION.map(e => {
    return `
    <article class="ed" data-up>
      <span class="ed__when">${esc(e.when)}</span>
      <h3>${e.role}</h3>
      <span class="ed__org">${e.org}</span>
      <p>${e.points.join(" ")}</p>
    </article>`;
  }).join("");
}

/* ================================================================= WIRING */
function init() {
  readTokens();
  renderFigures();
  renderRecord();
  renderSpread();
  buildServices();
  buildIndex();
  buildField();
  buildStack();
  buildMarquee();
  wireParallax();
  wirePeek();
  heroField();
  heroTicker();
  syncToggle();
  smoother.init();
  tickClock(); setInterval(tickClock, 1000);
  $$("[data-split]").forEach(splitWords);

  /* delegated clicks */
  document.addEventListener("click", ev => {
    const anchor = ev.target.closest('a[href^="#"]');
    if (anchor) { ev.preventDefault(); jump(anchor.getAttribute("href").slice(1)); return; }
    const open = ev.target.closest("[data-open]");
    if (open) { openDrawer(open.dataset.open); return; }
    const nav = ev.target.closest("[data-sh]");
    if (nav) { stepShots(+nav.dataset.sh); return; }
    const fig = ev.target.closest("#dshots figure");
    if (fig) { if (!strip.dragged) openLightbox(fig.dataset.pid, +fig.dataset.i); return; }
  });
  wireShots();

  $("#theme").addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
  $$("[data-copy]").forEach(b => b.addEventListener("click", () => copyText(b.dataset.copy, b)));
  $("#openpalette").addEventListener("click", openPalette);
  $("#scrim").addEventListener("click", () => { closePalette(); toggleHelp(false); });
  $("#pq").addEventListener("input", () => { palette.idx = 0; renderPalette(); });
  $("#plist").addEventListener("click", ev => {
    const it = ev.target.closest(".pitem");
    if (it) { const item = palette.items[+it.dataset.i]; closePalette(); item && item.run(); }
  });
  $("#plist").addEventListener("mousemove", ev => {
    const it = ev.target.closest(".pitem");
    if (it && +it.dataset.i !== palette.idx) { palette.idx = +it.dataset.i; renderPalette(); }
  });
  $("#dclose").addEventListener("click", closeDrawer);
  $("#dscrim").addEventListener("click", closeDrawer);
  $("#lbclose").addEventListener("click", closeLightbox);
  $("#lbprev").addEventListener("click", () => stepLightbox(-1));
  $("#lbnext").addEventListener("click", () => stepLightbox(1));
  $("#lightbox").addEventListener("click", ev => {
    if (ev.target.id === "lightbox" || ev.target.classList.contains("lb__stage")) closeLightbox();
  });

  addEventListener("keydown", ev => {
    const typing = /^(INPUT|TEXTAREA)$/.test(ev.target.tagName);
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault(); palette.open ? closePalette() : openPalette(); return;
    }
    if (palette.open) {
      if (ev.key === "Escape") { ev.preventDefault(); closePalette(); }
      else if (ev.key === "ArrowDown") { ev.preventDefault(); palette.idx = Math.min(palette.idx + 1, palette.items.length - 1); renderPalette(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); palette.idx = Math.max(palette.idx - 1, 0); renderPalette(); }
      else if (ev.key === "Enter") { ev.preventDefault(); const it = palette.items[palette.idx]; closePalette(); it && it.run(); }
      return;
    }
    if (lb.open) {
      if (ev.key === "Escape") closeLightbox();
      else if (ev.key === "ArrowRight") stepLightbox(1);
      else if (ev.key === "ArrowLeft") stepLightbox(-1);
      return;
    }
    if (drawer.open) { if (ev.key === "Escape") closeDrawer(); return; }
    if (typing) return;
    if (ev.key.toLowerCase() === "t") setTheme(currentTheme() === "dark" ? "light" : "dark");
    else if (ev.key === "?") toggleHelp();
    else if (ev.key.toLowerCase() === "g") jump("index");
    else if (ev.key === "Escape") toggleHelp(false);
  });

  /* progress bar + hide-on-scroll-down bar */
  const prog = $("#progress"), bar = $(".statusbar"), mob = $("#mobnav");
  let lastY = 0;
  addEventListener("scroll", () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    prog.style.transform = `scaleX(${p})`;
    const away = h.scrollTop > 260 && h.scrollTop > lastY && performance.now() > navHold;
    bar.classList.toggle("is-hidden", away);
    if (mob) mob.classList.toggle("is-hidden", away);
    lastY = h.scrollTop;
  }, { passive: true });

  /* section spy */
  /* both navs share the spy — the status bar above 1080px, the bottom rail below */
  const navLinks = $$(".statnav a, .mobnav a");
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(l =>
      l.getAttribute("href") === "#" + e.target.id
        ? l.setAttribute("aria-current", "true")
        : l.removeAttribute("aria-current"));
  }), { rootMargin: "-45% 0px -50% 0px" });
  ["index", "field", "track", "about", "contact"]
    .map(id => document.getElementById(id)).filter(Boolean).forEach(s => spy.observe(s));

  /* counters + chart bars, once each */
  const once = (el, fn, threshold = .3) => {
    if (!el) return;
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (e.isIntersecting) { fn(); o.disconnect(); }
    }), { threshold }).observe(el);
  };
  once($(".stats"), () => $$("[data-count]").forEach(countUp));
  /* the technology tally runs its own per-group ScrollTrigger in renderSpread */

  /* preloader gates the entrance animation */
  document.body.classList.add("is-locked");
  runLoader(() => {
    animateIn();
    if (HAS_GSAP) ScrollTrigger.refresh();
  });
}

if (document.readyState === "loading") addEventListener("DOMContentLoaded", init);
else init();
})();
