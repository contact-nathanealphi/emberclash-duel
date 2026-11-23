// Deck helpers — shuffle, draw, discard, reshuffle. Pure functions over plain arrays.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Draw n cards; when the draw pile runs out, shuffle the discard pile back in. */
export function drawCards(state, n) {
  for (let i = 0; i < n; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) return;
      state.drawPile = shuffleDeck(state.discardPile, state.rng);
      state.discardPile = [];
      state.log('sys', '↻ Discard pile shuffled back into the deck.');
    }
    state.hand.push(state.drawPile.pop());
  }
}
