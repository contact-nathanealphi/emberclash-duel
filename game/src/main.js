// Emberclash boot — starts the game and stages deterministic screenshots.
// ?shot=start|play|draft|end&seed=N puts the game in a fixed, photogenic state
// and sets window.__shotReady when the frame is ready to capture.
import { Game } from './game.js';
import { cardById } from './cards.js';
import { mulberry32 } from './deck.js';
import { opponentByIndex } from './opponents.js';

const game = new Game();
window.__game = game;

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 7);

function ready() { window.__shotReady = true; }

if (shot) {
  game.rng = mulberry32(seed);
  // Mute staged shots: headless audio is noise, screenshots are silent.
  document.getElementById('soundBtn').click();
  if (shot === 'start') {
    game.render();
    setTimeout(ready, 400);
  } else if (shot === 'play') {
    game.hideOverlay();
    game.phase = 'player';
    // A rich mid-battle frame: foe hurt, block up, a full varied hand, mana left.
    game.foeHp = 17;
    game.playerHp = 24;
    game.playerBlock = 7;
    game.foeBurn = 3;
    game.turn = 3;
    game.manaMax = 5;
    game.mana = 4;
    game.elementsPlayed = ['ember'];
    game.hand = ['ember-strike', 'ignite', 'frost-ward', 'stormcall', 'thorn-whip', 'overload'].map(cardById);
    game.lastPlayed = [
      { card: cardById('ember-strike'), who: 'you', surge: true },
      { card: cardById('frost-ward'), who: 'foe', surge: false },
    ];
    game.drawPile = game.drawPile.slice(0, 6);
    game.discardPile = ['cinder-jab', 'frost-ward'].map(cardById);
    game.log('sys', '🔥 The duel begins! Play a card to strike first.');
    game.log('good', 'You hit for 6 damage.');
    game.log('good', '🔥 Pip the Sproutling is Burning (3).');
    game.log('bad', 'Pip the Sproutling hits for 4 damage.');
    game.log('turn', '— Your turn 3 · 5 mana, drew cards —');
    game.updateIntent();
    game.render();
    setTimeout(ready, 400);
  } else if (shot === 'draft') {
    game.hideOverlay();
    game.phase = 'player';
    game.foeHp = 0;
    game.duelIndex = 0;
    game.score = 186;
    game.stats.damageDealt = 41;
    game.stats.cardsPlayed = 9;
    game.render();
    game.winDuel();
    setTimeout(ready, 400);
  } else if (shot === 'end') {
    game.hideOverlay();
    game.phase = 'over';
    game.duelIndex = 2;
    game.opp = opponentByIndex(2);
    game.foeMax = 40;
    game.foeHp = 0;
    game.score = 642;
    game.stats.damageDealt = 118;
    game.stats.cardsPlayed = 27;
    game.stats.surges = 6;
    game.stats.duelsWon = 3;
    game.render();
    game.winRun();
    setTimeout(ready, 400);
  } else {
    setTimeout(ready, 400);
  }
}
