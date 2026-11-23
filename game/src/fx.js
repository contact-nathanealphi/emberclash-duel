// Battlefield effects — canvas particles and floating damage numbers. No assets.
const canvas = document.getElementById('fx');
const ctx2d = canvas.getContext('2d');
let particles = [];
let raf = null;

function sizeCanvas() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
}
window.addEventListener('resize', sizeCanvas);
sizeCanvas();

function tick() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  const now = performance.now();
  particles = particles.filter((p) => now - p.born < p.life);
  for (const p of particles) {
    const age = (now - p.born) / p.life;
    const alpha = 1 - age;
    ctx2d.globalAlpha = alpha;
    ctx2d.fillStyle = p.color;
    ctx2d.beginPath();
    ctx2d.arc(p.x + p.vx * age * 90, p.y + p.vy * age * 90, p.r * (1 - age * 0.5), 0, Math.PI * 2);
    ctx2d.fill();
  }
  ctx2d.globalAlpha = 1;
  if (particles.length > 0) raf = requestAnimationFrame(tick);
  else { raf = null; ctx2d.clearRect(0, 0, canvas.width, canvas.height); }
}

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
  if (!raf) raf = requestAnimationFrame(tick);
}

export function burstAtElement(el, color, count = 26) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, color, count);
}

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
