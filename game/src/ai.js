// Rival AI — picks its plays for the turn from its hand and mana.
// Personality: aggression pushes damage, guardBias pushes block when hurt.
export function describeIntent(opp, hand, mana) {
  if (hand.length === 0) return 'out of cards…';
  const playable = hand.filter((c) => c.cost <= mana);
  if (playable.length === 0) return 'saving mana…';
  const best = pickBestCard(opp, playable, hand);
  if (!best) return 'scheming…';
  if (best.effect.dmg) return `plans to strike (${best.effect.dmg} dmg)`;
  if (best.effect.block) return 'plans to guard';
  if (best.effect.heal) return 'plans to mend';
  return 'scheming…';
}

function scoreCard(opp, card, ctx) {
  const e = card.effect;
  let s = 0;
  if (e.dmg) s += e.dmg * (ctx.playerHp <= 10 ? 2.2 : 1.15) * opp.aggression;
  if (e.burn) s += e.burn * 1.6;
  if (e.block) s += e.block * (ctx.foeHp < ctx.foeMax * 0.45 ? 2.0 : 0.8) * (0.5 + opp.guardBias);
  if (e.heal) s += e.heal * (ctx.foeHp < ctx.foeMax * 0.55 ? 1.8 : 0.35);
  if (e.draw) s += 2.5;
  if (e.mana) s += 3.0;
  if (e.lifesteal) s += 3.5;
  s -= card.cost * 0.9;
  return s + Math.random() * 1.5; // a little unpredictability
}

function pickBestCard(opp, playable, hand) {
  const ctx = { playerHp: 30, foeHp: 30, foeMax: 30 };
  let best = null; let bestScore = -Infinity;
  for (const c of playable) {
    const s = scoreCard(opp, c, ctx);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

/** Plan the rival's whole turn: ordered list of card ids it will play. */
export function planAiTurn(opp, hand, mana, playerHp, foeHp, foeMax) {
  const ctx = { playerHp, foeHp, foeMax };
  const plan = [];
  let left = mana;
  const remaining = hand.slice();
  // A rival plays at most 3 cards a turn — duels stay readable, not a blitz.
  for (let step = 0; step < 3; step++) {
    const playable = remaining.filter((c) => c.cost <= left);
    if (playable.length === 0) break;
    let best = null; let bestScore = -Infinity;
    for (const c of playable) {
      const s = scoreCard(opp, c, ctx);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (!best || bestScore < 0.5) break;
    plan.push(best);
    left -= best.cost;
    remaining.splice(remaining.indexOf(best), 1);
    if (best.effect.dmg) ctx.playerHp -= best.effect.dmg;
    if (best.effect.heal) ctx.foeHp = Math.min(foeMax, ctx.foeHp + best.effect.heal);
  }
  return plan;
}
