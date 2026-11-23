// The three rival mages — each with a personality, a deck, and a taunt.
import { cardById } from './cards.js';

export const OPPONENTS = [
  {
    id: 'pip', name: 'Pip the Sproutling', title: 'Rival Mage · Duel 1',
    avatar: '🌱', hp: 30, aggression: 0.35, guardBias: 0.4,
    deck: ['ember-strike', 'cinder-jab', 'cinder-jab', 'cinder-jab',
           'frost-ward', 'frost-ward', 'frost-ward', 'leaf-mend', 'thorn-whip', 'spark-volley'],
    taunt: '“I may be small, but my sparks bite!”',
    lowHpTaunt: '“H-hey! That actually hurt!”',
    defeat: '“Ouch… okay, you fight like a real mage.”',
  },
  {
    id: 'kael', name: 'Kael the Ember Knight', title: 'Rival Mage · Duel 2',
    avatar: '♞', hp: 34, aggression: 0.55, guardBias: 0.35,
    deck: ['ember-strike', 'ember-strike', 'flame-lash', 'flame-lash', 'ignite',
           'frost-ward', 'glacial-wall', 'spark-volley', 'stormcall', 'leaf-mend',
           'thorn-whip', 'cinder-jab', 'mana-siphon', 'overload'],
    taunt: '“My blade is fire. My patience is not.”',
    lowHpTaunt: '“You dare scratch the Ember Knight?!”',
    defeat: '“Hmph. The flame favours you today.”',
  },
  {
    id: 'ashen', name: 'Queen Ashenvale', title: 'Rival Mage · Final Duel',
    avatar: '♛', hp: 42, aggression: 0.65, guardBias: 0.3,
    deck: ['inferno', 'inferno', 'flame-lash', 'ignite', 'ignite', 'meteor',
           'glacial-wall', 'deep-freeze', 'stormcall', 'chain-lightning',
           'bloom', 'spore-cloud', 'ember-strike', 'frost-ward', 'blizzard', 'mana-siphon'],
    taunt: '“Kneel, little spark. The Ashen Throne does not fall.”',
    lowHpTaunt: '“The throne… cracks? No — NO!”',
    defeat: '“Impossible… take the crown, Ember Mage.”',
  },
];

export function opponentByIndex(i) {
  return OPPONENTS[Math.min(i, OPPONENTS.length - 1)];
}

export function opponentDeckCards(opp) {
  return opp.deck.map((id) => cardById(id));
}
