// Battlefield effects — canvas particles and floating damage numbers. No assets.
const canvas = document.getElementById('fx');
const ctx2d = canvas.getContext('2d');
let particles = [];

function sizeCanvas() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
}
window.addEventListener('resize', sizeCanvas);
sizeCanvas();

export function burst(x, y, color, count = 26) {
  const rect = canvas.getBoundingClientRect();
  const px = (x - rect.left) * devicePixelRatio;
  const py = (y - rect.top) * devicePixelRatio;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.4 + Math.random() * 0.9;
    particles.push({
      x: px, y: py,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: (3 + Math.random() * 5) * devicePixelRatio,
      color, born: performance.now(), life: 500 + Math.random() * 500,
    });
  }
}

export function burstAtElement(el, color, count = 26) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, color, count);
}

// ---------- ambient embers: slow sparks drifting up the arena, always on ----------
const embers = [];
for (let i = 0; i < 26; i++) {
  embers.push({
    x: Math.random(), y: Math.random(),
    r: 1 + Math.random() * 2.2, speed: 0.008 + Math.random() * 0.02,
    sway: Math.random() * Math.PI * 2, alpha: 0.15 + Math.random() * 0.35,
  });
}
let ambientRaf = null;
function ambientTick() {
  const w = canvas.width, h = canvas.height;
  ctx2d.clearRect(0, 0, w, h);
  const now = performance.now() / 1000;
  for (const e of embers) {
    e.y -= e.speed / 60;
    if (e.y < -0.02) { e.y = 1.02; e.x = Math.random(); }
    const x = (e.x + Math.sin(now * 0.6 + e.sway) * 0.012) * w;
    const y = e.y * h;
    ctx2d.globalAlpha = e.alpha * (0.7 + 0.3 * Math.sin(now * 2 + e.sway));
    ctx2d.fillStyle = '#ffb347';
    ctx2d.beginPath();
    ctx2d.arc(x, y, e.r * devicePixelRatio, 0, Math.PI * 2);
    ctx2d.fill();
  }
  ctx2d.globalAlpha = 1;
  // keep burst particles on top of the ambient layer
  if (particles.length > 0) {
    const t = performance.now();
    particles = particles.filter((p) => t - p.born < p.life);
    for (const p of particles) {
      const age = (t - p.born) / p.life;
      ctx2d.globalAlpha = 1 - age;
      ctx2d.fillStyle = p.color;
      ctx2d.beginPath();
      ctx2d.arc(p.x + p.vx * age * 90, p.y + p.vy * age * 90, p.r * (1 - age * 0.5), 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
  }
  ambientRaf = requestAnimationFrame(ambientTick);
}
ambientTick();

/** A floating "-12" / "+8" label over a fighter card. */
export function floatText(anchorEl, text, kind = '') {
  const zone = document.getElementById('playedZone');
  const r = anchorEl.getBoundingClientRect();
  const zr = zone.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `floatDmg ${kind}`;
  el.textContent = text;
  el.style.left = `${r.left - zr.left + r.width / 2 - 30}px`;
  el.style.top = `${Math.max(8, r.top - zr.top - 10)}px`;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 1150);
}
