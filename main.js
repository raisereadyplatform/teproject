(() => {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;

const range = (v, a, b) => clamp((v - a) / (b - a));
const ease  = t => t * t * (3 - 2 * t);

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE    = matchMedia('(hover:hover) and (pointer:fine)').matches;

function splitChars(el) {
  const txt = el.textContent;
  el.textContent = '';
  [...txt].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch === ' ' ? ' ' : ch;
    s.style.transitionDelay = (i * 0.035) + 's';
    el.appendChild(s);
  });
}

function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'word';
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

$$('[data-split]').forEach(splitChars);
$$('[data-split-words]').forEach(splitWords);

const om = $('[data-omerta]');
if (om) {
  om.innerHTML = [...om.textContent].map(c => `<i>${c}</i>`).join('');
}

$$('.line').forEach(line => {
  const inner = $('.line__in', line);
  if (!inner) return;

  const sibs = [...line.parentElement.children].filter(n => n.classList.contains('line'));
  inner.style.transitionDelay = (sibs.indexOf(line) * 0.11) + 's';
});

const revealTargets = [
  ...$$('.reveal-up'), ...$$('.line'), ...$$('.prac__row'), ...$$('.scale')
];

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const d = parseFloat(el.dataset.delay || 0);
    if (d) el.style.transitionDelay = d + 's';
    el.classList.add('is-in');
    io.unobserve(el);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

revealTargets.forEach(el => io.observe(el));

if (FINE && !REDUCED) {
  const cur  = $('.cursor');
  const ring = $('.cursor__ring');
  const dot  = $('.cursor__dot');
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;

  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.classList.add('is-live');
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  }, { passive: true });

  (function ringLoop() {
    rx = lerp(rx, mx, 0.16);
    ry = lerp(ry, my, 0.16);
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(ringLoop);
  })();

  $$('a,button,.prac__row').forEach(el => {
    el.addEventListener('mouseenter', () => cur.classList.add('is-hot'));
    el.addEventListener('mouseleave', () => cur.classList.remove('is-hot'));
  });
}

if (FINE && !REDUCED) {
  $$('[data-magnetic]').forEach(el => {
    const pull = 0.32;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * pull}px, ${y * pull}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform .7s cubic-bezier(.19,1,.22,1)';
      el.style.transform = '';
      setTimeout(() => (el.style.transition = ''), 700);
    });
    el.addEventListener('mouseenter', () => (el.style.transition = ''));
  });
}

$$('.scale__ink').forEach(el => el.style.setProperty('--l', Math.ceil(el.getTotalLength())));

$$('.prac__ico svg').forEach(svg => {
  svg.querySelectorAll('path,circle,rect,line,polyline').forEach(el => {
    const len = Math.ceil(el.getTotalLength ? el.getTotalLength() : 220);
    el.style.setProperty('--len', len);
  });
});

const bar      = $('.progress i');
const nav      = $('#nav');
const parallax = $$('[data-parallax]');
const marquees = $$('[data-marquee]');
const swapSec  = $('#swap');
const cardA    = $('#cardA');
const cardB    = $('#cardB');
const glyph    = $('.swap__glyph');
const words    = $$('.swap__word');
const metaA    = cardA && $('.card__meta', cardA);
const metaB    = cardB && $('.card__meta', cardB);
const swapBar  = $('#swapBar');
const swapPct  = $('#swapPct');
const ledger   = $('#ledger');
const rail     = $('#rail');
const litBlocks = $$('[data-split-words]');

let lastY = scrollY, velo = 0, marqX = 0, railSpan = 0, colStack = false;

function measure() {
  colStack = innerWidth <= 760;
  if (ledger && rail) {
    railSpan = Math.max(0, rail.scrollWidth - innerWidth);

    ledger.style.height = (innerHeight + railSpan) + 'px';
  }
}

function frame() {
  const y  = scrollY;
  const vh = innerHeight;
  velo = lerp(velo, y - lastY, 0.14);
  lastY = y;

  const max = document.documentElement.scrollHeight - vh;
  if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;

  if (nav) {
    nav.classList.toggle('is-stuck', y > vh * 0.7);
    nav.classList.toggle('is-hidden', velo > 6 && y > vh * 1.2);
  }

  parallax.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const rel = (r.top + r.height / 2 - vh / 2) / vh;
    el.style.transform = `translate3d(0,${(-rel * parseFloat(el.dataset.parallax) * vh).toFixed(2)}px,0)`;
  });

  if (marquees.length) {
    marqX -= 0.55 + Math.abs(velo) * 0.06;
    const half = marquees[0].scrollWidth / 2;
    if (half && marqX <= -half) marqX += half;
    marquees.forEach(m => (m.style.transform = `translate3d(${marqX}px,0,0)`));
  }

  if (swapSec && cardA && cardB) {
    const r = swapSec.getBoundingClientRect();
    const span = swapSec.offsetHeight - vh;
    const p = span > 0 ? clamp(-r.top / span) : 0;

    const s = ease(range(p, 0.18, 0.82));
    const arc = Math.sin(s * Math.PI);

    if (colStack) {

      const d = cardB.offsetTop - cardA.offsetTop;
      const side = cardA.offsetWidth * 0.30;
      cardA.style.transform =
        `translate3d(${-arc * side}px,${s * d}px,0) scale(${1 + arc * 0.05}) rotate(${-arc * 3}deg)`;
      cardB.style.transform =
        `translate3d(${arc * side}px,${-s * d}px,0) scale(${1 - arc * 0.16}) rotate(${arc * 3}deg)`;
    } else {
      const d = cardB.offsetLeft - cardA.offsetLeft;

      const lift = Math.min(innerHeight * 0.13, 118);
      cardA.style.transform =
        `translate3d(${s * d}px,${-arc * lift}px,${arc * 240}px) rotateY(${-arc * 18}deg) rotateZ(${-arc * 2.5}deg)`;
      cardB.style.transform =
        `translate3d(${-s * d}px,${arc * lift}px,${-arc * 300}px) rotateY(${arc * 18}deg) rotateZ(${arc * 2.5}deg)`;
    }

    cardA.style.zIndex = '2';
    cardB.style.zIndex = '1';
    cardB.style.opacity = String(1 - arc * 0.35);

    const metaFade = String(Math.pow(1 - arc, 1.6));
    if (metaA) metaA.style.opacity = metaFade;
    if (metaB) metaB.style.opacity = metaFade;

    if (glyph) glyph.style.transform = `rotate(${s * 180}deg) scale(${1 + arc * 0.35})`;
    if (swapBar) swapBar.style.transform = `scaleX(${p})`;
    if (swapPct) swapPct.textContent = String(Math.round(p * 100)).padStart(2, '0') + '%';

    const beat = p < 0.3 ? 0 : p < 0.68 ? 1 : 2;
    words.forEach(w => w.classList.toggle('is-on', +w.dataset.beat === beat));
  }

  if (ledger && rail && railSpan > 0) {
    const r = ledger.getBoundingClientRect();
    const p = clamp(-r.top / railSpan);
    rail.style.transform = `translate3d(${-p * railSpan}px,0,0)`;
  }

  litBlocks.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    const p = clamp((vh * 0.82 - r.top) / (vh * 0.55));
    const ws = el.children;
    const n = Math.floor(p * ws.length * 1.15);
    for (let i = 0; i < ws.length; i++) ws[i].classList.toggle('is-lit', i < n);
  });

  requestAnimationFrame(frame);
}

$$('[data-count]').forEach(el => {
  const end = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const pad = el.dataset.count.length;
  const ob = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    ob.disconnect();
    if (REDUCED) { el.textContent = String(end).padStart(pad, '0') + suffix; return; }
    const t0 = performance.now(), dur = 1500;
    (function tick(t) {
      const k = clamp((t - t0) / dur);
      const v = Math.round(end * (1 - Math.pow(1 - k, 3)));
      el.textContent = String(v).padStart(pad, '0') + suffix;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }, { threshold: 0.6 });
  ob.observe(el);
});

if (rail) {
  let down = false, sx = 0, sy = 0;
  rail.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sy = scrollY; });
  addEventListener('pointerup', () => (down = false));
  addEventListener('pointermove', e => {
    if (!down) return;
    e.preventDefault();
    scrollTo({ top: sy + (sx - e.clientX) * 1.4 });
  });
}

$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  });
});

(function boot() {

  let failsafe;
  const loader = $('#loader');
  const fill   = $('.loader__bar i');
  const num    = $('.loader__num');
  const word   = $('.loader__word');
  const lines  = ['ESTABLISHING SECURE LINE', 'VERIFYING CREDENTIALS', 'ACCESS GRANTED'];

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(failsafe);
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => loader.remove(), 1600);

    setTimeout(() => {
      $$('#hero .line, #hero .reveal-up').forEach(el => {
        const d = parseFloat(el.dataset.delay || 0);
        if (d) el.style.transitionDelay = d + 's';
        el.classList.add('is-in');
      });
    }, 320);
  };

  if (REDUCED) { finish(); measure(); requestAnimationFrame(frame); return; }

  failsafe = setTimeout(finish, 3200);

  const t0 = performance.now(), dur = 1700;
  (function tick(t) {
    const k = clamp((t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 2.2);
    fill.style.width = (e * 100) + '%';
    num.textContent = String(Math.round(e * 100)).padStart(2, '0');
    word.textContent = lines[Math.min(lines.length - 1, Math.floor(e * lines.length))];
    if (k < 1) requestAnimationFrame(tick);
    else setTimeout(finish, 260);
  })(t0);

  measure();
  requestAnimationFrame(frame);
})();

let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); });
addEventListener('load', measure);

})();
