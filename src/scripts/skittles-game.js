import { WORLD, makePins, makeBall, step } from './skittles-physics.js';

const canvas = document.getElementById('lawn');
const ctx = canvas.getContext('2d');
const ui = {
  prompt: document.getElementById('prompt'),
  result: document.getElementById('result'),
  resultText: document.getElementById('result-text'),
  again: document.getElementById('again'),
  strike: document.getElementById('strike'),
  code: document.getElementById('code'),
  strikeAgain: document.getElementById('strike-again'),
  score: document.getElementById('best'),
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Game state ---------------------------------------------------------
let phase = 'aim'; // aim -> power -> rolling -> done
let aim = 0, power = 0, phaseStart = performance.now();
let state = { ball: makeBall(0, 0), pins: makePins() };
let best = 0;

function reset() {
  phase = 'aim';
  phaseStart = performance.now();
  state = { ball: makeBall(0, 0), pins: makePins() };
  state.ball.vx = state.ball.vz = 0;
  ui.result.hidden = true;
  ui.strike.hidden = true;
  setPrompt('Click to set your aim');
  canvas.focus({ preventScroll: true });
}

function setPrompt(t) { ui.prompt.textContent = t; }

function action() {
  if (phase === 'aim') {
    phase = 'power'; phaseStart = performance.now();
    setPrompt('Click again to set your power');
  } else if (phase === 'power') {
    state.ball = makeBall(aim, power);
    phase = 'rolling';
    setPrompt('Rolling…');
  }
}

function finish() {
  phase = 'done';
  const down = state.pins.filter((p) => p.fallen).length;
  best = Math.max(best, down);
  ui.score.textContent = `${best} / 9`;
  setPrompt('');
  if (down === 9) {
    ui.code.textContent = makeCode();
    ui.strike.hidden = false;
    ui.strikeAgain.focus();
  } else {
    ui.resultText.textContent = down === 0 ? 'Missed them all! Have another go.' : `${down} of 9 pins down. So close, try again for a strike.`;
    ui.result.hidden = false;
    ui.again.focus();
  }
}

function makeCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => abc[b % abc.length]).join('');
  return `GP-DEMO-${pick(4)}-${pick(4)}`;
}

canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); action(); });
canvas.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); action(); }
});
ui.again.addEventListener('click', reset);
ui.strikeAgain.addEventListener('click', reset);

// ---- Rendering ----------------------------------------------------------
let W = 960, H = 600, horizon, f, camZ = 2.2, camH = 2.6, dpr = 1;
const Z_VIS = 0.6; // shorten the lawn visually so the pins read larger
const PIN_VIS = 1.7, KING_VIS = 2.15; // draw pins bigger than their physics size (giant games!)

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = 960;
  H = rect.width < 600 ? 860 : 600;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.aspectRatio = `${W} / ${H}`;
  horizon = H * 0.26;
  f = ((H * 0.9 - horizon) * camZ) / camH;
}
window.addEventListener('resize', resize);
resize();

const proj = (x, z) => {
  const d = Math.max(0.3, z * Z_VIS + camZ);
  return { x: W / 2 + (f * x) / d, y: horizon + (f * camH) / d, s: f / d };
};

const C = {
  sky1: '#cfe6ee', sky2: '#f4efe0',
  hedge: '#3d6b45', hedgeDark: '#2c5235',
  grassA: '#7fb069', grassB: '#73a45e', grassFar: '#8bb874',
  wood1: '#e0b27a', wood2: '#b77a42', wood3: '#8a5527',
  teal: '#2bb3b1', tealDark: '#1d8a88',
  ink: '#3b2a1a',
};

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, C.sky1); g.addColorStop(1, C.sky2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);

  // Fence
  const fenceTop = horizon - H * 0.12;
  ctx.fillStyle = '#c99a63';
  ctx.fillRect(0, fenceTop, W, horizon - fenceTop);
  ctx.strokeStyle = 'rgba(110,70,30,.35)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, fenceTop); ctx.lineTo(x, horizon); ctx.stroke(); }
  // Hedge bumps
  ctx.fillStyle = C.hedge;
  for (let x = -20; x < W + 40; x += 46) {
    ctx.beginPath(); ctx.arc(x, fenceTop + 4, 30, Math.PI, 0); ctx.fill();
  }
  ctx.fillStyle = C.hedgeDark; ctx.fillRect(0, horizon - 10, W, 10);

  // Lawn with mowing stripes running down the garden
  ctx.fillStyle = C.grassFar; ctx.fillRect(0, horizon, W, H - horizon);
  const stripe = 0.7, zNear = -2.2, zFar = 40;
  for (let i = -12; i < 12; i++) {
    const x0 = i * stripe, x1 = x0 + stripe;
    const a = proj(x0, zFar), b = proj(x1, zFar), c = proj(x1, zNear), d = proj(x0, zNear);
    ctx.fillStyle = i % 2 === 0 ? C.grassA : C.grassB;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
  }
  // Haze near the horizon
  const haze = ctx.createLinearGradient(0, horizon, 0, horizon + H * 0.12);
  haze.addColorStop(0, 'rgba(240,236,220,.55)'); haze.addColorStop(1, 'rgba(240,236,220,0)');
  ctx.fillStyle = haze; ctx.fillRect(0, horizon, W, H * 0.12);

  // Flower beds on both sides
  for (const side of [-1, 1]) {
    for (let z = 0; z < 14; z += 1.2) {
      const p = proj(side * (3.6 + (z % 2) * 0.3), z);
      const r = 0.12 * p.s;
      ctx.fillStyle = C.hedge; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 2.4, r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ['#f4c430', '#e8789a', '#ffffff', '#b38df0'][Math.floor(z * 3) % 4];
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(p.x + (k - 1) * r * 1.2, p.y - r * 0.6, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  // Throw line
  const l = proj(-1.4, 0.45), r = proj(1.4, 0.45);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
}

// Pin profile: half-widths along the height (0 = base, 1 = top), in metres.
const PIN_H = 0.9;
const PROFILE = [[0, 0.085], [0.1, 0.11], [0.3, 0.13], [0.5, 0.105], [0.66, 0.05], [0.74, 0.048], [0.86, 0.068], [0.96, 0.05], [1, 0]];

function pinPath(len, widthScale) {
  // Draws along +x from base (0,0) to top (len,0).
  ctx.beginPath();
  ctx.moveTo(0, -PROFILE[0][1] * widthScale);
  for (const [t, w] of PROFILE) ctx.lineTo(t * len, -w * widthScale);
  for (let i = PROFILE.length - 1; i >= 0; i--) ctx.lineTo(PROFILE[i][0] * len, PROFILE[i][1] * widthScale);
  ctx.closePath();
}

function woodFill(x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C.wood1); g.addColorStop(0.55, C.wood2); g.addColorStop(1, C.wood3);
  return g;
}

function drawPinStanding(p) {
  const base = proj(p.x, p.z);
  drawPinAt(base, base.s * PIN_VIS, p.king);
}

function drawPinAt(base, s, king) {
  const p = { king };
  const len = PIN_H * s * (p.king ? KING_VIS / PIN_VIS : 1);
  // shadow
  ctx.fillStyle = 'rgba(30,50,20,.28)';
  ctx.beginPath(); ctx.ellipse(base.x + s * 0.08, base.y, s * 0.17, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(base.x, base.y); ctx.rotate(-Math.PI / 2);
  pinPath(len, s);
  ctx.fillStyle = woodFill(0, -0.13 * s, 0, 0.13 * s); ctx.fill();
  if (p.king) {
    ctx.save(); pinPath(len, s); ctx.clip();
    const g = ctx.createLinearGradient(0, -0.13 * s, 0, 0.13 * s);
    g.addColorStop(0, '#5fd3cf'); g.addColorStop(0.6, C.teal); g.addColorStop(1, C.tealDark);
    ctx.fillStyle = g; ctx.fillRect(len * 0.56, -s, len, 2 * s);
    ctx.restore();
    // "GrandPlay" along the belly
    ctx.fillStyle = C.ink;
    ctx.font = `700 ${Math.max(7, s * 0.1)}px "Inter Tight", system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GrandPlay', len * 0.29, 1);
  }
  // grain
  ctx.strokeStyle = 'rgba(90,50,20,.25)'; ctx.lineWidth = 1;
  for (const off of [-0.05, 0.02, 0.07]) {
    ctx.beginPath(); ctx.moveTo(len * 0.04, off * s); ctx.quadraticCurveTo(len * 0.3, (off + 0.02) * s, len * (p.king ? 0.5 : 0.62), off * 0.6 * s); ctx.stroke();
  }
  ctx.restore();
}

// Corner badge showing the GrandPlay king pin up close.
function drawKingBadge() {
  const w = 120, h = 190, x = 20, y = H - h - 20;
  ctx.fillStyle = 'rgba(251,248,239,.9)'; roundRect(x, y, w, h, 16); ctx.fill();
  ctx.fillStyle = '#2d2b29'; ctx.font = '600 13px "Inter Tight", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('King pin', x + w / 2, y + 22);
  drawPinAt({ x: x + w / 2, y: y + h - 16 }, 112, true);
}

function drawPinFallen(p) {
  const base = proj(p.x, p.z);
  const tipZ = p.z + Math.cos(p.angle) * PIN_H, tipX = p.x + Math.sin(p.angle) * PIN_H;
  const tip = proj(tipX, tipZ);
  const dx = tip.x - base.x, dy = tip.y - base.y;
  const len = (Math.hypot(dx, dy) || 1) * (p.king ? KING_VIS : PIN_VIS), s = ((base.s + tip.s) / 2) * PIN_VIS;
  ctx.save();
  ctx.translate(base.x, base.y - s * 0.1); ctx.rotate(Math.atan2(dy, dx));
  ctx.fillStyle = 'rgba(30,50,20,.25)';
  ctx.beginPath(); ctx.ellipse(len / 2, s * 0.1, len / 2, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  pinPath(len, s * 0.9);
  ctx.fillStyle = woodFill(0, -0.12 * s, 0, 0.12 * s); ctx.fill();
  if (p.king) {
    ctx.save(); pinPath(len, s * 0.9); ctx.clip();
    ctx.fillStyle = C.teal; ctx.fillRect(len * 0.56, -s, len, 2 * s); ctx.restore();
  }
  ctx.restore();
}

function drawBall(b) {
  const g = proj(b.x, b.z), r = b.r * g.s;
  ctx.fillStyle = 'rgba(30,50,20,.3)';
  ctx.beginPath(); ctx.ellipse(g.x + r * 0.2, g.y, r * 1.05, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  const cx = g.x, cy = g.y - r;
  const rg = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  rg.addColorStop(0, '#f0cb96'); rg.addColorStop(0.6, C.wood2); rg.addColorStop(1, C.wood3);
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // rotating grain rings
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(90,50,20,.35)'; ctx.lineWidth = Math.max(1, r * 0.06);
  for (let k = -2; k <= 2; k++) {
    const off = ((b.spin * r * 0.35 + k * r * 0.45) % (r * 2.25)) - r * 0.2;
    ctx.beginPath(); ctx.ellipse(cx, cy - r + off, r * 1.1, r * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawAim(t) {
  const b = state.ball;
  const a = (aim * WORLD.maxAngleDeg * Math.PI) / 180;
  ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t / 30;
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let z = 0.3; z <= 4.6; z += 0.2) {
    const p = proj(b.x + Math.sin(a) * z, b.z + Math.cos(a) * z);
    if (z === 0.3) ctx.moveTo(p.x, p.y - 2); else ctx.lineTo(p.x, p.y - 2);
  }
  ctx.stroke(); ctx.setLineDash([]);
  const end = proj(b.x + Math.sin(a) * 4.6, b.z + Math.cos(a) * 4.6);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(end.x, end.y - 2, 6, 0, Math.PI * 2); ctx.fill();
}

function drawPower() {
  const bw = 30, bh = H * 0.5, x = W - bw - 34, y = H * 0.38;
  ctx.fillStyle = 'rgba(251,248,239,.85)';
  roundRect(x - 8, y - 34, bw + 16, bh + 46, 14); ctx.fill();
  ctx.fillStyle = '#2d2b29'; ctx.font = '600 14px "Inter Tight", system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Power', x + bw / 2, y - 14);
  ctx.fillStyle = 'rgba(45,43,41,.15)'; roundRect(x, y, bw, bh, 8); ctx.fill();
  const g = ctx.createLinearGradient(0, y + bh, 0, y);
  g.addColorStop(0, '#2e5e40'); g.addColorStop(0.6, '#c9a227'); g.addColorStop(1, '#9a5b2e');
  ctx.fillStyle = g; const ph = bh * power; roundRect(x, y + bh - ph, bw, ph, 8); ctx.fill();
}

function roundRect(x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---- Loop -----------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now - phaseStart;
  // Triangle waves: aim sweeps -1..1, power 0..1, at a steady, readable speed.
  const tri = (x) => 1 - Math.abs(((x % 2) + 2) % 2 - 1) * 2; // -1..1
  if (phase === 'aim') aim = tri(t / (reduceMotion ? 2400 : 1600) + 0.5);
  if (phase === 'power') power = (tri(t / (reduceMotion ? 1800 : 1200) - 0.5) + 1) / 2;
  if (phase === 'rolling' && !step(state, dt)) finish();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackground();
  const items = state.pins.map((p) => ({ z: p.z, draw: () => (p.fallen ? drawPinFallen(p) : drawPinStanding(p)) }));
  if (state.ball.z < 30) items.push({ z: state.ball.z, draw: () => drawBall(state.ball) });
  items.sort((a, b) => b.z - a.z).forEach((i) => i.draw());
  if (phase === 'aim' || phase === 'power') drawAim(now);
  if (phase === 'power') drawPower();
  if (phase !== 'done') drawKingBadge();
  requestAnimationFrame(frame);
}

// Small hook for automated testing: roll with a fixed aim and power.
window.__skittles = { roll(a, p) { reset(); aim = a; power = p; phase = 'power'; state.ball = makeBall(a, p); phase = 'rolling'; } };

reset();
requestAnimationFrame(frame);
