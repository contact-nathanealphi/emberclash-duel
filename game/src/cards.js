// Emberclash card library — every card is one plain data record.
// effect: { dmg, block, heal, draw, mana, burn, surge } — numbers before Surge.
// element: ember | frost | storm | leaf. rarity: common | rare | epic.
export const ELEMENTS = {
  ember: { label: 'EMBER', icon: '🔥' },
  frost: { label: 'FROST', icon: '❄️' },
  storm: { label: 'STORM', icon: '⚡' },
  leaf: { label: 'LEAF', icon: '🌿' },
};

export const CARD_LIBRARY = [
  { id: 'cinder-jab',    name: 'Cinder Jab',     icon: '✷', cost: 0, element: 'ember', rarity: 'common', text: 'Deal 3 damage.', effect: { dmg: 3 } },
  { id: 'ember-strike',  name: 'Ember Strike',   icon: '🔥', cost: 1, element: 'ember', rarity: 'common', text: 'Deal 6 damage.', effect: { dmg: 6 } },
  { id: 'flame-lash',    name: 'Flame Lash',     icon: '♨', cost: 2, element: 'ember', rarity: 'common', text: 'Deal 10 damage.', effect: { dmg: 10 } },
  { id: 'ignite',        name: 'Ignite',         icon: '🕯️', cost: 1, element: 'ember', rarity: 'rare',   text: 'Deal 4 damage. Burn 3.', effect: { dmg: 4, burn: 3 } },
  { id: 'inferno',       name: 'Inferno',        icon: '☄', cost: 3, element: 'ember', rarity: 'rare',   text: 'Deal 16 damage.', effect: { dmg: 16 } },
  { id: 'meteor',        name: 'Meteor Fall',    icon: '✦', cost: 4, element: 'ember', rarity: 'epic',   text: 'Deal 22 damage.', effect: { dmg: 22 } },
  { id: 'ember-feast',   name: 'Ember Feast',    icon: '✚', cost: 2, element: 'ember', rarity: 'epic',   text: 'Deal 8 damage. Heal for half the damage dealt.', effect: { dmg: 8, lifesteal: 0.5 } },
  { id: 'frost-ward',    name: 'Frost Ward',     icon: '🛡️', cost: 1, element: 'frost', rarity: 'common', text: 'Gain 7 Block.', effect: { block: 7 } },
  { id: 'glacial-wall',  name: 'Glacial Wall',   icon: '🧊', cost: 2, element: 'frost', rarity: 'common', text: 'Gain 13 Block.', effect: { block: 13 } },
  { id: 'snowfall',      name: 'Snowfall',       icon: '❄', cost: 1, element: 'frost', rarity: 'rare',   text: 'Gain 5 Block. Draw 1 card.', effect: { block: 5, draw: 1 } },
  { id: 'deep-freeze',   name: 'Deep Freeze',    icon: '🥶', cost: 2, element: 'frost', rarity: 'rare',   text: 'Deal 6 damage. Gain 6 Block.', effect: { dmg: 6, block: 6 } },
  { id: 'blizzard',      name: 'Blizzard',       icon: '🌪️', cost: 3, element: 'frost', rarity: 'epic',   text: 'Deal 6 damage. Gain 10 Block.', effect: { dmg: 6, block: 10 } },
  { id: 'mirror-shard',  name: 'Mirror Shard',   icon: '🪞', cost: 1, element: 'frost', rarity: 'epic',   text: 'Gain 8 Block. +4 more if the rival is Burning.', effect: { block: 8, blockIfBurning: 4 } },
  { id: 'spark-volley',  name: 'Spark Volley',   icon: '✨', cost: 1, element: 'storm', rarity: 'common', text: 'Deal 4 damage. Draw 1 card.', effect: { dmg: 4, draw: 1 } },
  { id: 'lightning-rod', name: 'Lightning Rod',  icon: '🔌', cost: 0, element: 'storm', rarity: 'common', text: 'Gain 2 mana this turn.', effect: { mana: 2 } },
  { id: 'stormcall',     name: 'Stormcall',      icon: '🌩️', cost: 2, element: 'storm', rarity: 'rare',   text: 'Deal 8 damage. Draw 1 card.', effect: { dmg: 8, draw: 1 } },
  { id: 'mana-siphon',   name: 'Mana Siphon',    icon: '🌀', cost: 1, element: 'storm', rarity: 'rare',   text: 'Gain 2 mana. Rival loses 2 mana next turn.', effect: { mana: 2, manaDebt: 2 } },
  { id: 'overload',      name: 'Overload',       icon: '💥', cost: 2, element: 'storm', rarity: 'rare',   text: 'Deal 3 damage for each card in your hand.', effect: { dmgPerHand: 3 } },
  { id: 'chain-lightning', name: 'Chain Lightning', icon: '⚡', cost: 3, element: 'storm', rarity: 'epic', text: 'Deal 14 damage.', effect: { dmg: 14 } },
  { id: 'leaf-mend',     name: 'Leaf Mend',      icon: '🌱', cost: 1, element: 'leaf',  rarity: 'common', text: 'Heal 6 HP.', effect: { heal: 6 } },
  { id: 'thorn-whip',    name: 'Thorn Whip',     icon: '🌵', cost: 1, element: 'leaf',  rarity: 'common', text: 'Deal 5 damage. Heal 3 HP.', effect: { dmg: 5, heal: 3 } },
  { id: 'bloom',         name: 'Bloom',          icon: '✿', cost: 2, element: 'leaf',  rarity: 'rare',   text: 'Heal 10 HP. Draw 1 card.', effect: { heal: 10, draw: 1 } },
  { id: 'phoenix-feather', name: 'Phoenix Feather', icon: '🪶', cost: 3, element: 'leaf', rarity: 'epic', text: 'Heal 12 HP. Draw 1 card.', effect: { heal: 12, draw: 1 } },
  { id: 'spore-cloud',   name: 'Spore Cloud',    icon: '☁', cost: 2, element: 'leaf',  rarity: 'rare',   text: 'Deal 5 damage. Burn 5.', effect: { dmg: 5, burn: 5 } },
];

export const RARITY_STARS = { common: '★', rare: '★★', epic: '★★★' };

export function cardById(id) {
  return CARD_LIBRARY.find((c) => c.id === id);
}

/** Starter deck: 10 cards, a fair mix of every element. */
export function buildStarterDeck() {
  return [
    'ember-strike', 'ember-strike', 'cinder-jab',
    'frost-ward', 'frost-ward', 'flame-lash', 'ignite',
    'spark-volley', 'leaf-mend', 'thorn-whip',
  ];
}

/** Three draft choices after a duel: mostly rare/epic, never a duplicate of each other. */
export function rollDraftChoices(rng, ownedIds) {
  const pool = CARD_LIBRARY.filter((c) => c.rarity !== 'common');
  const picks = [];
  const guard = [];
  while (picks.length < 3 && guard.length < 60) {
    guard.push(1);
    const c = pool[Math.floor(rng() * pool.length)];
    if (picks.some((p) => p.id === c.id)) continue;
    picks.push(c);
  }
  return picks;
}
