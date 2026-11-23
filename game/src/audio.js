// Sound — tiny WebAudio synth, no audio files. Blips, whooshes and a victory arpeggio.
let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  playCard() { tone(520, 0.12, 'triangle', 0.14); tone(780, 0.14, 'triangle', 0.1, 0.06); },
  hit() { tone(180, 0.18, 'sawtooth', 0.16, 0, 60); tone(90, 0.2, 'square', 0.1, 0.02, 45); },
  block() { tone(320, 0.12, 'sine', 0.12, 0, 520); },
  heal() { tone(660, 0.16, 'sine', 0.1); tone(880, 0.2, 'sine', 0.1, 0.09); },
  draw() { tone(440, 0.07, 'triangle', 0.07); tone(560, 0.07, 'triangle', 0.06, 0.05); },
  burn() { tone(240, 0.25, 'sawtooth', 0.08, 0, 90); },
  surge() { tone(880, 0.1, 'square', 0.09); tone(1174, 0.12, 'square', 0.09, 0.07); tone(1568, 0.16, 'square', 0.09, 0.14); },
  endTurn() { tone(392, 0.1, 'triangle', 0.1); tone(311, 0.14, 'triangle', 0.1, 0.08); },
  turnStart() { tone(523, 0.1, 'triangle', 0.1); tone(659, 0.12, 'triangle', 0.1, 0.07); },
  error() { tone(140, 0.14, 'square', 0.1, 0, 110); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.13, i * 0.13)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'sine', 0.11, i * 0.16)); },
  draft() { tone(784, 0.14, 'triangle', 0.11); tone(988, 0.18, 'triangle', 0.11, 0.1); },
};
