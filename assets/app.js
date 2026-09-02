/* ============================================================================
   app.js — JAWAD HAMZA / Deployment Register

   Preloader · Lenis-style inertia scroll · custom lerp cursor · GSAP
   ScrollTrigger pinned horizontal showcase · hover-peek index · canvas
   deployment map · command palette · drawer · lightbox.
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
const FEATURED = ["bloodbank", "lims", "vendora", "rms", "nexus", "futurespace"];
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
  requestAnimationFrame(() => { readTokens(); drawMap(); });
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

/* ================================================== PINNED HORIZONTAL SHOW */
function panelHTML(p, i) {
  const shot = p.shots[0];
  const mods = p.modules
    ? `<span class="panel__mods">${p.modules.items.slice(0, 8).map(m => esc(m[0])).join("  ·  ")}</span>` : "";
  const art = shot
    ? `<img src="${shot.src}" alt="${esc(p.name)}" loading="lazy" decoding="async">
       <span class="panel__scrim"></span>`
    : `<span class="panel__glyph"><b>${p.modules ? p.modules.items.length : p.stack.length}</b>
         <span>${p.modules ? "modules shipped" : "technologies"}</span>${mods}</span>
       <span class="panel__scrim"></span>`;
  return `<button class="panel" data-open="${p.id}" data-cursor="Open"
                  aria-label="Open ${esc(p.name)}">
      <span class="panel__media">${art}</span>
      <span class="panel__no">${String(i + 1).padStart(2, "0")}</span>
      <span class="panel__content">
        <span class="panel__meta">${stampHTML(p)}<span class="code">${esc(p.code)}</span></span>
        <h3>${p.name}</h3>
        <p>${esc(p.tag)}</p>
        <span class="panel__stack">${esc(p.stack.slice(0, 4).join(" · "))}</span>
        <span class="panel__cta">Open case<i></i></span>
      </span>
    </button>`;
}
const stampHTML = p => {
  const s = STATUS[p.status];
  return `<span class="stamp stamp--${s.tone}">${s.label}</span>`;
};

function buildShowcase() {
  const track = $("#showTrack");
  track.innerHTML = FEATURED.map((id, i) => panelHTML(byId[id], i)).join("");
  if (!HAS_GSAP || COARSE) {
    /* graceful fallback: a plain horizontal scroller */
    track.parentElement.style.overflowX = "auto";
    return;
  }
  const dist = () => Math.max(0, track.scrollWidth - innerWidth + 32);
  gsap.to(track, {
    x: () => -dist(), ease: "none",
    scrollTrigger: {
      trigger: "#showcase", start: "top top", end: () => "+=" + dist(),
      pin: true, scrub: 0.6, invalidateOnRefresh: true,
      onUpdate: self => {
        const f = $("#showRail i");
        if (f) f.style.width = (self.progress * 100).toFixed(2) + "%";
        /* each image drifts inside its own frame as the panel crosses the
           viewport — the depth cue that makes a flat card feel photographic */
        $$(".panel").forEach(el => {
          const img = el.querySelector(".panel__media img");
          if (!img) return;
          const r = el.getBoundingClientRect();
          const k = (r.left + r.width / 2 - innerWidth / 2) / innerWidth;
          img.style.transform = `translateX(${(-k * 5.5).toFixed(2)}%)`;
        });
      },
    },
  });
}

/* ============================================================== INDEX LIST */
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

  const chips = rest.map(p => `
      <button class="chip" data-open="${p.id}" data-reg="${p.reg}" data-cursor="Open"
              aria-label="${esc(p.name)} — ${esc(p.tag)}">
        <span class="chip__dot tone--${STATUS[p.status].tone}" aria-hidden="true"></span>
        <span class="chip__name">${p.name}</span>
        <span class="chip__more" aria-hidden="true">
          <span class="chip__tag">${esc(p.tag)}</span>
          <span class="chip__stack">${esc(p.stack.slice(0, 3).join(" · "))}</span>
        </span>
        <span class="chip__arrow" aria-hidden="true">&#8594;</span>
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
      <div class="chips-grid" id="alsoGrid">${chips}</div>
    </div>`;

  const num = $("#idxCount");
  if (num) num.textContent = `Full index · ${lead.length} headline · ${PROJECTS.length} systems`;

  /* register filter: dims everything that doesn't match, keeps the layout */
  const filt = $("#alsoFilt"), grid = $("#alsoGrid");
  filt.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-reg]"); if (!b) return;
    const k = b.dataset.reg;
    $$("button", filt).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    $$(".chip", grid).forEach(c => {
      if (!k || c.dataset.reg === k) c.removeAttribute("data-off");
      else c.setAttribute("data-off", "");
    });
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

/* ================================================================ DRAWER */
const drawer = { open: false };

function drawerHTML(p) {
  const shots = p.shots.length ? `
    <div>
      <div class="dlabel">Screens · ${p.shots.length} from the running app
        <span class="shots__nav" aria-hidden="true">
          <button type="button" data-sh="-1" aria-label="Previous screen">&#8592;</button>
          <button type="button" data-sh="1" aria-label="Next screen">&#8594;</button>
        </span></div>
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
  setTimeout(() => $("#dclose").focus(), 80);
}
function closeDrawer() {
  drawer.open = false;
  $("#drawer").classList.remove("is-on");
  if (!lb.open) document.body.classList.remove("is-locked");
}

/* ================================================================== MAP */
const cv = $("#mapcv"), ctx = cv ? cv.getContext("2d") : null;
let nodes = [], hubs = {}, hover = null, tokens = {}, mapW = 0, mapH = 0;

function readTokens() {
  const cs = getComputedStyle(document.body);
  const g = n => cs.getPropertyValue(n).trim();
  tokens = { live: g("--live"), amber: g("--amber"), violet: g("--violet"), grey: g("--grey-tone"),
             lineSoft: g("--line-soft"), faint: g("--faint"), ground: g("--ground"), mapBg: g("--raise-2") };
}
const toneColor = t => ({ live: tokens.live, amber: tokens.amber, violet: tokens.violet, grey: tokens.grey }[t]);
const rnd = s => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };

function layout() {
  const keys = Object.keys(DOMAINS);
  const cx = mapW / 2, cy = mapH / 2, rx = mapW * .33, ry = mapH * .30;
  hubs = {};
  keys.forEach((k, i) => {
    const a = (i / keys.length) * Math.PI * 2 - Math.PI / 2;
    hubs[k] = { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, key: k };
  });
  const scale = Math.min(mapW, mapH) / 420;
  nodes = PROJECTS.map((p, i) => {
    const hub = hubs[p.domain], peers = PROJECTS.filter(q => q.domain === p.domain);
    const a = (peers.indexOf(p) / Math.max(peers.length, 1)) * Math.PI * 2 + rnd(i + 1) * 1.2;
    const d = (24 + rnd(i + 7) * 32) * scale;
    return { p, hub, x: hub.x + Math.cos(a) * d, y: hub.y + Math.sin(a) * d,
             r: (4.4 + p.weight * 2.4) * Math.max(scale, .72),
             ph: rnd(i + 3) * Math.PI * 2, sp: .35 + rnd(i + 11) * .5 };
  });
  for (let pass = 0; pass < 60; pass++) {
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || .01, min = a.r + b.r + 9;
        if (dist < min) { const k = (min - dist) / dist * .5; dx *= k; dy *= k;
          a.x -= dx; a.y -= dy; b.x += dx; b.y += dy; }
      }
    nodes.forEach(n => {
      n.x += (n.hub.x - n.x) * .012; n.y += (n.hub.y - n.y) * .012;
      n.x = clamp(n.x, n.r + 6, mapW - n.r - 6); n.y = clamp(n.y, n.r + 6, mapH - n.r - 6);
    });
  }
  nodes.forEach(n => { n.dx = n.x; n.dy = n.y; });
  if (hover) hover = nodes.find(n => n.p.id === hover.p.id) || null;
}
function sizeMap() {
  if (!cv) return;
  const w = cv.parentElement.getBoundingClientRect().width;
  mapW = Math.max(300, w);
  mapH = Math.max(300, Math.min(520, Math.round(mapW * .46)));
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(mapW * dpr); cv.height = Math.round(mapH * dpr);
  cv.style.width = mapW + "px"; cv.style.height = mapH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout();
}
const sharesStack = (a, b) => {
  const A = new Set(a.p.stack.map(s => s.toLowerCase()));
  return b.p.stack.some(s => A.has(s.toLowerCase()));
};
function drawMap() {
  if (!ctx) return;
  ctx.clearRect(0, 0, mapW, mapH);
  ctx.lineWidth = 1; ctx.strokeStyle = tokens.lineSoft;
  nodes.forEach(n => { ctx.beginPath(); ctx.moveTo(n.hub.x, n.hub.y); ctx.lineTo(n.dx, n.dy); ctx.stroke(); });

  if (hover) {
    ctx.strokeStyle = tokens.accent; ctx.globalAlpha = .36; ctx.lineWidth = 1.2;
    nodes.forEach(n => {
      if (n === hover || !sharesStack(hover, n)) return;
      ctx.beginPath(); ctx.moveTo(hover.dx, hover.dy); ctx.lineTo(n.dx, n.dy); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  Object.values(hubs).forEach(h => {
    ctx.fillStyle = tokens.faint; ctx.globalAlpha = .5;
    ctx.beginPath(); ctx.arc(h.x, h.y, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  });
  nodes.forEach(n => {
    const col = toneColor(STATUS[n.p.status].tone);
    if (hover === n) {
      ctx.fillStyle = col; ctx.globalAlpha = .2;
      ctx.beginPath(); ctx.arc(n.dx, n.dy, n.r + 8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(n.dx, n.dy, n.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tokens.ground; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(n.dx, n.dy, n.r, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.font = "500 8px ui-monospace, JetBrains Mono, monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  Object.values(hubs).forEach(h => {
    const own = nodes.filter(n => n.p.domain === h.key); if (!own.length) return;
    const label = DOMAINS[h.key].toUpperCase(), w = ctx.measureText(label).width;
    const x = clamp((Math.min(...own.map(n => n.dx)) + Math.max(...own.map(n => n.dx))) / 2,
                    w / 2 + 5, mapW - w / 2 - 5);
    const y = Math.max(9, Math.min(...own.map(n => n.dy - n.r)) - 9);
    ctx.lineWidth = 3.5; ctx.strokeStyle = tokens.mapBg; ctx.strokeText(label, x, y);
    ctx.fillStyle = tokens.faint; ctx.fillText(label, x, y);
  });
  ctx.textBaseline = "alphabetic";
}
function animateMap(ts) {
  const t = ts / 1000;
  nodes.forEach(n => {
    if (REDUCED) { n.dx = n.x; n.dy = n.y; return; }
    n.dx = n.x + Math.sin(t * n.sp + n.ph) * 3;
    n.dy = n.y + Math.cos(t * n.sp * .8 + n.ph) * 3;
  });
  drawMap();
  requestAnimationFrame(animateMap);
}
const pickNode = (cx, cy) => {
  let best = null, bd = 1e9;
  nodes.forEach(n => { const d = Math.hypot(n.dx - cx, n.dy - cy);
    if (d < n.r + 9 && d < bd) { bd = d; best = n; } });
  return best;
};

/* ============================================================ STACK CHART */
const stackCounts = () => {
  const m = new Map();
  PROJECTS.forEach(p => p.stack.forEach(s => m.set(s.trim(), (m.get(s.trim()) || 0) + 1)));
  return [...m.entries()].filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
function renderChart() {
  const host = $("#stackchart"); if (!host) return;
  const rows = stackCounts(), max = rows[0][1];
  host.innerHTML = rows.map(([k, n]) => `
    <div class="bar">
      <span class="bar__k">${esc(k)}</span>
      <span class="bar__track"><span class="bar__fill" data-w="${(n / max * 100).toFixed(1)}"></span></span>
      <span class="bar__v">${n}</span>
    </div>`).join("");
}

/* ======================================================== COMMAND PALETTE */
const palette = { open: false, items: [], idx: 0 };
function buildPaletteItems(q) {
  const out = [];
  const push = (name, sub, kind, run) => out.push({ name, sub, kind, run });
  PROJECTS.forEach(p => push(p.name, `${STATUS[p.status].label} · ${p.code}`, "Project", () => openDrawer(p.id)));
  [["work", "Selected work"], ["index", "Full index"], ["map", "Deployment map"],
   ["about", "About"], ["contact", "Contact"]]
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
    <div class="pitem" data-i="${i}" data-active="${i === palette.idx}" role="option">
      <div class="pitem__t"><div class="pitem__n">${esc(it.name)}</div>
        <div class="pitem__s">${esc(it.sub)}</div></div>
      <span class="pitem__k">${esc(it.kind)}</span></div>`).join("");
  list.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
}
function openPalette() {
  palette.open = true; palette.idx = 0;
  $("#scrim").classList.add("is-on"); $("#palette").classList.add("is-on");
  $("#pq").value = ""; renderPalette();
  setTimeout(() => $("#pq").focus(), 40);
}
function closePalette() {
  palette.open = false;
  $("#scrim").classList.remove("is-on"); $("#palette").classList.remove("is-on");
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
  $("#lightbox").classList.add("is-on");
  document.body.classList.add("is-locked");
  paintLightbox();
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
  if (!drawer.open) document.body.classList.remove("is-locked");
}

/* ================================================================ HELPERS */
function jump(id) {
  const el = document.getElementById(id); if (!el) return;
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
function renderRecord() {
  const tl = list => list.map(e => `
    <div class="tl" data-up>
      <div class="tl__when">${esc(e.when)}</div>
      <div><h3>${e.role}</h3><span class="tl__org">${e.org}</span>
        <ul>${e.points.map(p => `<li>${p}</li>`).join("")}</ul></div></div>`).join("");
  $("#experience").innerHTML = tl(EXPERIENCE);
  $("#education").innerHTML  = tl(EDUCATION);
  $("#skills").innerHTML = SKILLS.map(([t, items]) => `
    <div class="skillcol"><h4>${esc(t)}</h4>
      <ul>${items.map(i => `<li>${i}</li>`).join("")}</ul></div>`).join("");
}

/* ================================================================= WIRING */
function init() {
  readTokens();
  renderRecord();
  renderChart();
  buildShowcase();
  buildIndex();
  buildMarquee();
  wirePeek();
  heroField();
  heroTicker();
  syncToggle();
  smoother.init();
  tickClock(); setInterval(tickClock, 1000);
  $$("[data-split]").forEach(splitWords);

  /* map */
  if (cv) {
    sizeMap(); drawMap(); requestAnimationFrame(animateMap);
    new ResizeObserver(() => { sizeMap(); if (HAS_GSAP) ScrollTrigger.refresh(); }).observe(cv.parentElement);
    const tip = $("#maptip");
    cv.addEventListener("mousemove", ev => {
      const r = cv.getBoundingClientRect();
      const cx = ev.clientX - r.left, cy = ev.clientY - r.top;
      const hit = pickNode(cx, cy);
      if (hit !== hover) { hover = hit; cursor.setLabel(hit ? "Open" : ""); }
      if (!hit) { tip.classList.remove("is-on"); return; }
      const shared = nodes.filter(n => n !== hit && sharesStack(hit, n)).length;
      tip.innerHTML = `<b>${esc(hit.p.name)}</b>
        <span><em>${STATUS[hit.p.status].label}</em> · ${esc(hit.p.code)}</span>
        <span>${esc(DOMAINS[hit.p.domain])}</span>
        <span>${shared} share a technology · click to open</span>`;
      tip.classList.add("is-on");
      tip.style.left = clamp(cx - tip.offsetWidth / 2, 6, mapW - tip.offsetWidth - 6) + "px";
      tip.style.top  = Math.max(6, cy - tip.offsetHeight - 14) + "px";
    });
    cv.addEventListener("mouseleave", () => { hover = null; tip.classList.remove("is-on"); cursor.setLabel(""); });
    cv.addEventListener("click", ev => {
      const r = cv.getBoundingClientRect();
      const hit = pickNode(ev.clientX - r.left, ev.clientY - r.top);
      if (hit) openDrawer(hit.p.id);
    });
  }

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
  $("#scrim").addEventListener("click", () => { closePalette(); $("#help").classList.remove("is-on"); });
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
    else if (ev.key === "?") { $("#help").classList.toggle("is-on"); $("#scrim").classList.toggle("is-on"); }
    else if (ev.key.toLowerCase() === "g") jump("work");
    else if (ev.key === "Escape") { $("#help").classList.remove("is-on"); $("#scrim").classList.remove("is-on"); }
  });

  /* progress bar + hide-on-scroll-down bar */
  const prog = $("#progress"), bar = $(".statusbar");
  let lastY = 0;
  addEventListener("scroll", () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    prog.style.transform = `scaleX(${p})`;
    if (h.scrollTop > 260 && h.scrollTop > lastY) bar.classList.add("is-hidden");
    else bar.classList.remove("is-hidden");
    lastY = h.scrollTop;
  }, { passive: true });

  /* section spy */
  const links = new Map($$(".statnav a").map(a => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver(es => es.forEach(e => {
    const a = links.get(e.target.id);
    if (a && e.isIntersecting) {
      links.forEach(l => l.removeAttribute("aria-current"));
      a.setAttribute("aria-current", "true");
    }
  }), { rootMargin: "-45% 0px -50% 0px" });
  ["work", "index", "map", "about", "contact"]
    .map(id => document.getElementById(id)).filter(Boolean).forEach(s => spy.observe(s));

  /* counters + chart bars, once each */
  const once = (el, fn, threshold = .3) => {
    if (!el) return;
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (e.isIntersecting) { fn(); o.disconnect(); }
    }), { threshold }).observe(el);
  };
  once($(".stats"), () => $$("[data-count]").forEach(countUp));
  once($("#stackchart"), () => $$("#stackchart .bar__fill").forEach((el, i) => {
    setTimeout(() => { el.style.transition = "width .9s cubic-bezier(.19,1,.22,1)";
                       el.style.width = el.dataset.w + "%"; }, i * 45);
  }), .15);

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
