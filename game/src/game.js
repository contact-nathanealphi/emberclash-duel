// Emberclash — game state, turns, rendering and overlays. One Game object owns the run.
import { CARD_LIBRARY, ELEMENTS, RARITY_STARS, cardById, buildStarterDeck, rollDraftChoices } from './cards.js';
import { mulberry32, shuffleDeck, drawCards } from './deck.js';
import { OPPONENTS, opponentByIndex, opponentDeckCards } from './opponents.js';
import { describeIntent, planAiTurn } from './ai.js';
import { sfx, setMuted, isMuted } from './audio.js';
import { burst, burstAtElement, floatText } from './fx.js';

const $ = (id) => document.getElementById(id);
const MAX_HAND = 10;
const MAX_MANA = 10;

export class Game {
  constructor() {
    this.rng = mulberry32((Date.now() % 2147483647) || 1);
    if (localStorage.getItem('emberclash.muted') === '1') {
      setMuted(true);
      $('soundBtn').classList.add('off');
    }
    this.resetRun();
    this.bindButtons();
    this.showTitle();
  }

  resetRun() {
    this.deckIds = buildStarterDeck();
    this.duelIndex = 0;
    this.score = 0;
    this.stats = { damageDealt: 0, cardsPlayed: 0, surges: 0, duelsWon: 0, turnsTaken: 0 };
    this.best = Number(localStorage.getItem('emberclash.best') || 0);
    this.phase = 'title';
    this.startDuel();
  }

  startDuel() {
    const opp = opponentByIndex(this.duelIndex);
    this.opp = opp;
    this.foeHp = opp.hp;
    this.foeMax = opp.hp;
    this.foeBlock = 0;
    this.foeBurn = 0;
    this.foeManaDebt = 0;
    this.foeTauntedLow = false;
    this.playerTauntedLow = false;
    this.lastPlayed = [];
    this.playerHp = this.duelIndex === 0 ? 30 : this.playerMax;
    this.playerMax = 30;
    this.playerBlock = 0;
    this.playerBurn = 0;
    this.turn = 0;
    this.mana = 0;
    this.manaMax = 0;
    this.manaBonus = 0;
    this.elementsPlayed = [];
    this.drawPile = shuffleDeck(this.deckIds.map((id) => cardById(id)), this.rng);
    this.discardPile = [];
    this.hand = [];
    // Rival: its own draw pile, 5-card opening hand, draws 2 each of its turns.
    this.foeDrawPile = shuffleDeck(opponentDeckCards(opp), this.rng);
    this.foeHand = [];
    this.foeDiscard = [];
    for (let i = 0; i < 5 && this.foeDrawPile.length > 0; i++) this.foeHand.push(this.foeDrawPile.pop());
    this.foeMana = 3;
    this.busy = false;
    drawCards(this, 5);
    this.log('sys', `» ${opp.taunt}`);
    this.log('sys', `Duel ${this.duelIndex + 1} of ${OPPONENTS.length} — defeat ${opp.name}!`);
    this.phase = 'player';
    this.beginPlayerTurn(true);
  }

  // ---------- turns ----------
  beginPlayerTurn(first = false) {
    this.turn += 1;
    this.stats.turnsTaken += 1;
    this.manaMax = Math.min(MAX_MANA, 3 + this.turn);
    this.mana = this.manaMax;
    this.manaBonus = 0;
    this.elementsPlayed = [];
    this.playerBlock = 0;
    if (this.playerBurn > 0) {
      this.applyDamageToPlayer(this.playerBurn, 'burn');
      this.log('bad', `🔥 Burn scorches you for ${this.playerBurn}.`);
      sfx.burn();
      this.playerBurn = 0;
    }
    if (!first) drawCards(this, 2);
    if (this.hand.length > MAX_HAND) {
      const over = this.hand.length - MAX_HAND;
      this.hand.splice(MAX_HAND, over);
      this.log('sys', `» Hand full — ${over} card(s) discarded.`);
    }
    this.log('turn', `— Your turn ${this.turn} · ${this.mana} mana, drew cards —`);
    sfx.turnStart();
    this.updateIntent();
    this.render();
  }

  async endTurn() {
    if (this.phase !== 'player' || this.busy) return;
    this.phase = 'ai';
    this.busy = true;
    sfx.endTurn();
    this.log('turn', '— Rival turn —');
    this.discardPile.push(...this.hand.splice(0));
    this.render();
    await this.sleep(650);
    // Rival burn tick
    if (this.foeBurn > 0) {
      this.applyDamageToFoe(this.foeBurn, 'burn');
      this.log('good', `🔥 Burn scorches ${this.opp.name} for ${this.foeBurn}.`);
      sfx.burn();
      this.foeBurn = 0;
      this.render();
      await this.sleep(550);
      if (this.checkEnd()) { this.busy = false; return; }
    }
    this.foeBlock = 0;
    this.foeMana = Math.max(0, Math.min(this.opp.manaCap || 8, 2 + this.turn) - this.foeManaDebt);
    if (this.foeManaDebt > 0) {
      this.log('sys', `🌀 ${this.opp.name} loses ${this.foeManaDebt} mana to the siphon.`);
      this.foeManaDebt = 0;
    }
    // Rival draws 2, reshuffling its discard pile when its deck runs out.
    for (let i = 0; i < 2; i++) {
      if (this.foeDrawPile.length === 0) {
        if (this.foeDiscard.length === 0) break;
        this.foeDrawPile = shuffleDeck(this.foeDiscard, this.rng);
        this.foeDiscard = [];
      }
      this.foeHand.push(this.foeDrawPile.pop());
    }
    if (this.foeHand.length > 8) this.foeHand.splice(8);
    const plan = planAiTurn(this.opp, this.foeHand, this.foeMana, this.playerHp, this.foeHp, this.foeMax);
    for (const card of plan) {
      this.foeHand.splice(this.foeHand.indexOf(card), 1);
      this.foeDiscard.push(card);
      this.foeMana -= card.cost;
      this.showPlayedCard(card, 'foe');
      this.lastPlayed.unshift({ card, who: 'foe', surge: false });
      if (this.lastPlayed.length > 3) this.lastPlayed.pop();
      this.applyCardEffect(card, 'foe');
      this.render();
      await this.sleep(750);
      if (this.checkEnd()) { this.busy = false; return; }
    }
    if (plan.length === 0) {
      this.log('sys', `${this.opp.name} passes, saving mana.`);
      await this.sleep(450);
    }
    this.busy = false;
    this.phase = 'player';
    this.beginPlayerTurn();
  }

  // ---------- playing cards ----------
  playCard(index) {
    if (this.phase !== 'player' || this.busy) return;
    const card = this.hand[index];
    if (!card) return;
    if (card.cost > this.mana) {
      sfx.error();
      this.log('sys', `Not enough mana for ${card.name} (${card.cost} needed).`);
      return;
    }
    this.mana -= card.cost;
    this.hand.splice(index, 1);
    this.discardPile.push(card);
    this.stats.cardsPlayed += 1;
    // Surge: a second card of the same element this turn is empowered —
    // but only cards that cost mana can surge (free jabs stay free).
    const surge = card.cost >= 1 && this.elementsPlayed.includes(card.element);
    this.elementsPlayed.push(card.element);
    if (surge) {
      this.stats.surges += 1;
      sfx.surge();
      this.log('sys', `⚡ SURGE! ${ELEMENTS[card.element].label} power doubles on ${card.name}!`);
    }
    sfx.playCard();
    this.showPlayedCard(card, 'you', surge);
    this.lastPlayed.unshift({ card, who: 'you', surge });
    if (this.lastPlayed.length > 3) this.lastPlayed.pop();
    this.applyCardEffect(card, 'you', surge);
    this.render();
    this.checkEnd();
  }

  applyCardEffect(card, who, surge = false) {
    const e = card.effect;
    const mult = surge ? 2 : 1;
    const isYou = who === 'you';
    const target = isYou ? 'foe' : 'you';
    if (e.mana) {
      if (isYou) { this.mana += e.mana; this.manaBonus += e.mana; }
      else this.foeMana += e.mana;
      this.log('sys', `${isYou ? 'You gain' : this.opp.name + ' gains'} ${e.mana} mana.`);
    }
    if (e.manaDebt) {
      if (isYou) {
        this.foeManaDebt += e.manaDebt;
        this.log('good', `🌀 ${this.opp.name} will lose ${e.manaDebt} mana next turn.`);
      } else {
        this.mana = Math.max(0, this.mana - e.manaDebt);
        this.log('bad', `🌀 ${this.opp.name} siphons ${e.manaDebt} of your mana!`);
      }
    }
    if (e.dmgPerHand) {
      const dmg = e.dmgPerHand * (isYou ? this.hand.length : this.foeHand.length) * mult;
      if (isYou) this.applyDamageToFoe(dmg, 'hit');
      else this.applyDamageToPlayer(dmg, 'hit');
      this.log(isYou ? 'good' : 'bad', `${isYou ? 'Overload crackles for' : this.opp.name + ' overloads for'} ${dmg} damage.`);
      sfx.hit();
    }
    if (e.dmg) {
      const dmg = e.dmg * mult;
      if (isYou) this.applyDamageToFoe(dmg, 'hit');
      else this.applyDamageToPlayer(dmg, 'hit');
      this.log(isYou ? 'good' : 'bad', `${isYou ? 'You hit' : this.opp.name + ' hits'} for ${dmg} damage.`);
      sfx.hit();
    }
    if (e.burn) {
      const burn = e.burn * mult;
      if (isYou) { this.foeBurn += burn; this.log('good', `🔥 ${this.opp.name} is Burning (${this.foeBurn}).`); }
      else { this.playerBurn += burn; this.log('bad', `🔥 You are Burning (${this.playerBurn}).`); }
    }
    if (e.block) {
      let block = e.block * mult;
      if (e.blockIfBurning && ((isYou && this.foeBurn > 0) || (!isYou && this.playerBurn > 0))) block += e.blockIfBurning;
      if (isYou) { this.playerBlock += block; floatText($('playerCard'), `+${block} 🛡`, 'block'); }
      else { this.foeBlock += block; floatText($('foeCard'), `+${block} 🛡`, 'block'); }
      sfx.block();
    }
    if (e.heal) {
      const heal = e.heal * mult;
      if (isYou) {
        const real = Math.min(heal, this.playerMax - this.playerHp);
        this.playerHp += real;
        if (real > 0) { floatText($('playerCard'), `+${real} ❤`, 'heal'); this.log('good', `💚 You heal ${real} HP.`); }
        else this.log('sys', '💚 Already at full health.');
      } else {
        const real = Math.min(heal, this.foeMax - this.foeHp);
        this.foeHp += real;
        if (real > 0) { floatText($('foeCard'), `+${real} ❤`, 'heal'); this.log('bad', `💚 ${this.opp.name} heals ${real} HP.`); }
      }
      sfx.heal();
    }
    if (e.lifesteal && e.dmg) {
      const heal = Math.floor((e.dmg * mult) * e.lifesteal);
      if (isYou) {
        const real = Math.min(heal, this.playerMax - this.playerHp);
        this.playerHp += real;
        floatText($('playerCard'), `+${real} ❤`, 'heal');
      } else {
        const real = Math.min(heal, this.foeMax - this.foeHp);
        this.foeHp += real;
      }
    }
    if (e.draw) {
      if (isYou) { drawCards(this, e.draw); sfx.draw(); this.log('sys', `» You draw ${e.draw} card(s).`); }
      else {
        for (let i = 0; i < e.draw && this.foeHand.length < 8; i++) {
          if (this.foeDrawPile.length === 0) {
            if (this.foeDiscard.length === 0) break;
            this.foeDrawPile = shuffleDeck(this.foeDiscard, this.rng);
            this.foeDiscard = [];
          }
          this.foeHand.push(this.foeDrawPile.pop());
        }
      }
    }
  }

  applyDamageToFoe(amount, kind) {
    let left = amount;
    // Burn scorches straight through Block — it is the answer to turtling rivals.
    if (kind !== 'burn' && this.foeBlock > 0) {
      const blocked = Math.min(this.foeBlock, left);
      this.foeBlock -= blocked;
      left -= blocked;
    }
    if (left > 0) {
      this.foeHp = Math.max(0, this.foeHp - left);
      this.stats.damageDealt += left;
      floatText($('foeCard'), `-${left}`, '');
      burstAtElement($('foeCard'), '#ff6a2a', 30);
      $('foeCard').classList.remove('hurt');
      void $('foeCard').offsetWidth;
      $('foeCard').classList.add('hurt');
    }
  }

  applyDamageToPlayer(amount, kind) {
    let left = amount;
    if (kind !== 'burn' && this.playerBlock > 0) {
      const blocked = Math.min(this.playerBlock, left);
      this.playerBlock -= blocked;
      left -= blocked;
    }
    if (left > 0) {
      this.playerHp = Math.max(0, this.playerHp - left);
      floatText($('playerCard'), `-${left}`, '');
      burstAtElement($('playerCard'), '#ff3b3b', 30);
      $('playerCard').classList.remove('hurt');
      void $('playerCard').offsetWidth;
      $('playerCard').classList.add('hurt');
    }
  }

  checkEnd() {
    if (this.foeHp <= 0) { this.winDuel(); return true; }
    if (this.playerHp <= 0) { this.loseRun(); return true; }
    return false;
  }

  winDuel() {
    this.stats.duelsWon += 1;
    const turnBonus = Math.max(0, 60 - this.stats.turnsTaken * 2);
    const gained = 100 + turnBonus + this.stats.damageDealt;
    this.score += gained;
    sfx.victory();
    this.log('sys', `🏆 Duel won! +${gained} score.`);
    this.phase = 'over';
    if (this.duelIndex >= OPPONENTS.length - 1) {
      this.winRun();
      return;
    }
    this.showDraft(gained);
  }

  winRun() {
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('emberclash.best', String(this.best));
    }
    this.phase = 'over';
    this.render();
    this.showOverlay(`
      <h1>🏆 CHAMPION!</h1>
      <h2>You defeated Queen Ashenvale!</h2>
      <p>The Ember Crown is yours. Every rival mage in the realm now knows your name.</p>
      <div class="statGrid">
        <div class="stat"><b>${this.score}</b><span>FINAL SCORE</span></div>
        <div class="stat"><b>${this.stats.damageDealt}</b><span>DAMAGE DEALT</span></div>
        <div class="stat"><b>${this.stats.cardsPlayed}</b><span>CARDS PLAYED</span></div>
        <div class="stat"><b>${this.stats.surges}</b><span>SURGES</span></div>
      </div>
      <p class="sub">Best score on this device: ${this.best}</p>
      <button class="bigbtn" id="againBtn">PLAY AGAIN</button>
    `);
    $('againBtn').onclick = () => { this.hideOverlay(); this.resetRun(); this.render(); };
  }

  loseRun() {
    sfx.defeat();
    this.phase = 'over';
    this.render();
    this.showOverlay(`
      <h1>💀 DEFEATED</h1>
      <h2>${this.opp.name} wins this duel.</h2>
      <p>${this.opp.defeat}</p>
      <div class="statGrid">
        <div class="stat"><b>${this.score}</b><span>SCORE</span></div>
        <div class="stat"><b>${this.stats.duelsWon} / 3</b><span>DUELS WON</span></div>
        <div class="stat"><b>${this.stats.damageDealt}</b><span>DAMAGE DEALT</span></div>
        <div class="stat"><b>${this.stats.cardsPlayed}</b><span>CARDS PLAYED</span></div>
      </div>
      <p class="sub">Tip: play two cards of the same element in one turn to trigger a Surge — double power!</p>
      <button class="bigbtn" id="againBtn">TRY AGAIN</button>
    `);
    $('againBtn').onclick = () => { this.hideOverlay(); this.resetRun(); this.render(); };
  }

  showDraft(gained) {
    const choices = rollDraftChoices(this.rng, this.deckIds);
    sfx.draft();
    this.showOverlay(`
      <h2>🏆 Duel ${this.duelIndex + 1} won! +${gained} score</h2>
      <p>${this.opp.name} falls. You catch your breath (fully healed) and choose <b>one new card</b> for your deck — or take Second Wind instead — before the next duel.</p>
      <div class="draftRow" id="draftRow"></div>
      <p class="sub">Your deck: ${this.deckIds.length} cards — draft one to grow it, or take Second Wind.</p>
    `);
    const row = $('draftRow');
    choices.forEach((c) => {
      const el = this.cardElement(c, 999, true);
      el.onclick = () => {
        this.deckIds.push(c.id);
        sfx.draft();
        this.log('sys', `» Drafted ${c.name} into your deck.`);
        this.hideOverlay();
        this.duelIndex += 1;
        this.startDuel();
        this.showBanner(`DUEL ${this.duelIndex + 1}`);
        this.render();
      };
      row.appendChild(el);
    });
    // Fourth choice: Second Wind — mend wounds and raise max HP, take no card.
    const rest = document.createElement('div');
    rest.className = 'card el-leaf';
    rest.innerHTML = `
      <div class="cost">–</div>
      <div class="rarity">★</div>
      <div class="cicon">💚</div>
      <div class="cname">Second Wind</div>
      <div class="celem">🌿 LEAF</div>
      <div class="ctext">Heal 12 HP and gain +2 max HP. Take no new card.</div>
    `;
    rest.onclick = () => {
      this.playerMax = Math.min(40, this.playerMax + 2);
      const real = Math.min(12, this.playerMax - this.playerHp);
      this.playerHp += real;
      sfx.heal();
      this.log('sys', `💚 Second Wind: +2 max HP, mended ${real} HP.`);
      this.hideOverlay();
      this.duelIndex += 1;
      this.startDuel();
      this.showBanner(`DUEL ${this.duelIndex + 1}`);
      this.render();
    };
    row.appendChild(rest);
  }

  // ---------- rendering ----------
  render() {
    // top bar
    $('duelLabel').textContent = `Duel ${Math.min(this.duelIndex + 1, 3)} / 3`;
    $('turnLabel').textContent = `Turn ${this.turn}`;
    $('scoreLabel').textContent = `Score ${this.score}`;
    $('bestLabel').textContent = `Best ${this.best}`;
    // foe
    $('foeAvatar').textContent = this.opp.avatar;
    $('foeCard').classList.toggle('ai-turn', this.phase === 'ai');
    $('foeName').textContent = this.opp.name;
    $('foeTitle').textContent = this.opp.title;
    $('foeHpFill').style.width = `${(this.foeHp / this.foeMax) * 100}%`;
    $('foeHpText').textContent = `${this.foeHp} / ${this.foeMax}`;
    $('foeHandCount').textContent = `▦ ×${this.foeHand.length}`;
    this.setChip($('foeBlock'), this.foeBlock, '🛡');
    this.setChip($('foeBurn'), this.foeBurn, '🔥 Burn');
    // player
    $('playerHpFill').style.width = `${(this.playerHp / this.playerMax) * 100}%`;
    $('playerHpText').textContent = `${this.playerHp} / ${this.playerMax}`;
    this.setChip($('playerBlock'), this.playerBlock, '🛡');
    this.setChip($('playerBurn'), this.playerBurn, '🔥 Burn');
    const surgeReady = this.elementsPlayed.length > 0;
    $('playerSurge').classList.toggle('hidden', !surgeReady);
    $('playerSurge').textContent = surgeReady ? `⚡ Surge: ${ELEMENTS[this.elementsPlayed[this.elementsPlayed.length - 1]].label} doubled` : '';
    // mana gems
    const manaBox = $('manaBox');
    manaBox.innerHTML = '';
    for (let i = 0; i < this.manaMax; i++) {
      const g = document.createElement('div');
      g.className = 'manaGem' + (i < this.mana ? '' : ' spent') + (i >= this.manaMax - this.manaBonus && this.manaBonus > 0 && i < this.mana ? ' bonus' : '');
      g.textContent = '◆';
      manaBox.appendChild(g);
    }
    const manaLabel = document.createElement('span');
    manaLabel.style.cssText = 'font-weight:800;color:#ffd9a0;font-size:14px;margin-left:4px';
    manaLabel.textContent = `${this.mana}/${this.manaMax}`;
    manaBox.appendChild(manaLabel);
    // piles
    $('deckCount').textContent = this.drawPile.length;
    $('discardCount').textContent = this.discardPile.length;
    $('endTurnBtn').disabled = this.phase !== 'player' || this.busy;
    // hand
    const handEl = $('hand');
    handEl.innerHTML = '';
    this.hand.forEach((card, i) => {
      const el = this.cardElement(card, i, false);
      handEl.appendChild(el);
    });
    // battlefield history: last 3 cards played, newest first
    const strip = $('historyStrip');
    strip.innerHTML = '';
    for (const entry of this.lastPlayed) {
      const m = document.createElement('div');
      m.className = `miniCard el-${entry.card.element}${entry.who === 'foe' ? ' foePlayed' : ''}`;
      m.innerHTML = `<span class="mi">${entry.card.icon}</span>${entry.card.name}<span class="who">${entry.who === 'you' ? 'YOU' : 'RIVAL'}${entry.surge ? ' · SURGE' : ''}</span>`;
      strip.appendChild(m);
    }
    // low-health flavour: rival taunts once when nearly beaten, red vignette when you are
    if (this.foeHp > 0 && this.foeHp <= this.foeMax * 0.25 && !this.foeTauntedLow) {
      this.foeTauntedLow = true;
      this.log('sys', `${this.opp.name}: ${this.opp.lowHpTaunt}`);
    }
    if (this.playerHp > 0 && this.playerHp <= this.playerMax * 0.25 && !this.playerTauntedLow) {
      this.playerTauntedLow = true;
      this.log('bad', '⚠️ You are nearly out of health — guard up or finish this fast!');
    }
    $('app').classList.toggle('danger', this.phase === 'player' && this.playerHp > 0 && this.playerHp <= this.playerMax * 0.25);
  }

  setChip(el, value, label) {
    el.classList.toggle('hidden', value <= 0);
    el.textContent = `${label} ${value}`;
  }

  cardElement(card, index, draft) {
    const el = document.createElement('div');
    el.className = `card el-${card.element}`;
    const playable = !draft && card.cost <= this.mana && this.phase === 'player' && !this.busy;
    const surgeNext = !draft && card.cost >= 1 && this.elementsPlayed.includes(card.element);
    if (!draft && !playable) el.classList.add('unplayable');
    if (surgeNext && playable) el.classList.add('surgeGlow');
    el.innerHTML = `
      <div class="cost">${card.cost}</div>
      <div class="rarity">${RARITY_STARS[card.rarity]}</div>
      <div class="cicon">${card.icon}</div>
      <div class="cname">${card.name}</div>
      <div class="celem">${ELEMENTS[card.element].icon} ${ELEMENTS[card.element].label}${surgeNext && playable ? ' · SURGE ×2' : ''}</div>
      <div class="ctext">${card.text}</div>
      ${!draft && index < 9 ? `<div class="ckey">${index + 1}</div>` : ''}
    `;
    if (!draft) {
      el.onclick = () => this.playCard(index);
      el.onmouseenter = (e) => this.showTooltip(e, card);
      el.onmouseleave = () => $('tooltip').classList.add('hidden');
    }
    return el;
  }

  showTooltip(e, card) {
    const t = $('tooltip');
    t.innerHTML = `<b>${card.name}</b> — ${ELEMENTS[card.element].label} · ${card.rarity}<br>${card.text}<br><span style="color:#c9a37e">Cost ${card.cost} mana. Play a second ${ELEMENTS[card.element].label} card costing 1+ mana this turn to Surge (double effect).</span>`;
    t.classList.remove('hidden');
    const r = e.currentTarget.getBoundingClientRect();
    t.style.left = `${Math.min(window.innerWidth - 250, r.left)}px`;
    t.style.top = `${Math.max(8, r.top - 110)}px`;
  }

  showPlayedCard(card, who, surge = false) {
    const zone = $('playedZone');
    const el = this.cardElement(card, 999, true);
    el.classList.remove('unplayable');
    el.classList.add('playedCard');
    if (surge) el.classList.add('surgeGlow');
    el.style.pointerEvents = 'none';
    zone.appendChild(el);
    setTimeout(() => el.remove(), 950);
    burstAtElement(who === 'you' ? $('foeCard') : $('playerCard'), card.element === 'ember' ? '#ff6a2a' : card.element === 'frost' ? '#7ec8ff' : card.element === 'storm' ? '#c9a7ff' : '#8dff9d', 18);
  }

  showBanner(text) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    setTimeout(() => b.classList.add('hidden'), 1450);
  }

  log(kind, text) {
    const box = $('logBox');
    const div = document.createElement('div');
    div.className = kind;
    div.textContent = text;
    box.appendChild(div);
    while (box.children.length > 60) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  updateIntent() {
    $('foeIntent').textContent = describeIntent(this.opp, this.foeHand, this.foeMana);
  }

  // ---------- overlays ----------
  showOverlay(html) {
    $('overlayCard').innerHTML = html;
    $('overlay').classList.remove('hidden');
  }
  hideOverlay() { $('overlay').classList.add('hidden'); }

  showTitle() {
    this.phase = 'title';
    this.showOverlay(`
      <h1>🔥 EMBERCLASH 🔥</h1>
      <h2>Duel of the Ember Mages</h2>
      <p>A turn-based card battler. Outplay three rival mages, draft new cards between duels, and claim the Ember Crown.</p>
      <div class="statGrid">
        ${OPPONENTS.map((o) => `<div class="stat"><b>${o.avatar}</b><span>${o.name.toUpperCase()} · ${o.hp} HP</span></div>`).join('')}
      </div>
      <div class="rules">
        <b>» How to play</b><br>
        • Each turn you gain mana (up to 10, starting at 4) and draw 2 cards.<br>
        • Click a card (or press 1–9) to play it — attacks hurt the rival, Block absorbs damage, Burn ticks each turn straight through Block.<br>
        • <b>Surge:</b> play two cards of the same element in one turn and the second one (costing 1+ mana) hits twice as hard.<br>
        • Win a duel to draft a powerful new card into your deck. Beat all 3 rivals to win the run.<br>
        • Watch the rival's intent — it shows what they plan to do next.
      </div>
      <div class="elKey">
        <span class="e-ember">🔥 EMBER — damage</span>
        <span class="e-frost">❄️ FROST — block</span>
        <span class="e-storm">⚡ STORM — draw &amp; mana</span>
        <span class="e-leaf">🌿 LEAF — heal</span>
      </div>
      <button class="bigbtn" id="startBtn">START DUEL ▶</button>
      <p class="sub">Best score on this device: ${this.best} · Sound: on (M to mute)</p>
    `);
    $('startBtn').onclick = () => {
      this.hideOverlay();
      this.showBanner(`DUEL 1`);
      this.phase = 'player';
      this.log('sys', '🔥 The duel begins! Play a card to strike first.');
      this.render();
    };
  }

  showDeckViewer(which) {
    const cards = which === 'discard' ? this.discardPile : [...this.drawPile, ...this.hand];
    const counts = new Map();
    for (const c of cards) counts.set(c.id, (counts.get(c.id) || 0) + 1);
    const rows = [...counts.entries()]
      .map(([id, n]) => {
        const c = cardById(id);
        return `<div>${c.icon} <b>${c.name}</b> ×${n} — ${c.cost} mana · ${ELEMENTS[c.element].label} · ${c.text}</div>`;
      })
      .join('');
    this.showOverlay(`
      <h2>${which === 'discard' ? 'Discard pile' : 'Your deck'} — ${cards.length} card(s)</h2>
      <div class="deckList">${rows || '<div>Empty.</div>'}</div>
      <button class="bigbtn" id="closeDeck">BACK TO THE DUEL</button>
    `);
    $('closeDeck').onclick = () => this.hideOverlay();
  }

  showHelp() {
    this.showOverlay(`
      <h2>How to play</h2>
      <div class="rules">
        • <b>Mana:</b> you gain +1 max mana each turn (up to 10). Cards cost mana to play.<br>
        • <b>Attack</b> cards deal damage; the rival's Block absorbs it first.<br>
        • <b>Block</b> disappears at the start of your next turn — spend it wisely.<br>
        • <b>Burn</b> ticks at the start of the owner's turn, straight through Block.<br>
        • <b>Surge:</b> two cards of the same element in one turn → the second (cost 1+) is doubled.<br>
        • <b>Draft:</b> after each duel you win, pick 1 of 3 new cards for your deck.<br>
        • <b>Keys:</b> 1–9 play a card · Space ends turn · H help · M mute · R restart.
      </div>
      <button class="bigbtn" id="closeHelp">BACK TO THE DUEL</button>
    `);
    $('closeHelp').onclick = () => this.hideOverlay();
  }

  bindButtons() {
    $('endTurnBtn').onclick = () => this.endTurn();
    $('deckPile').onclick = () => this.showDeckViewer('deck');
    $('discardPile').onclick = () => this.showDeckViewer('discard');
    $('helpBtn').onclick = () => this.showHelp();
    $('restartBtn').onclick = () => { this.hideOverlay(); this.resetRun(); this.showTitle(); this.render(); };
    $('soundBtn').onclick = () => {
      setMuted(!isMuted());
      $('soundBtn').classList.toggle('off', isMuted());
      localStorage.setItem('emberclash.muted', isMuted() ? '1' : '0');
    };
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); this.endTurn(); }
      else if (e.key >= '1' && e.key <= '9') this.playCard(Number(e.key) - 1);
      else if (e.key === 'h' || e.key === 'H') this.showHelp();
      else if (e.key === 'm' || e.key === 'M') $('soundBtn').click();
      else if (e.key === 'r' || e.key === 'R') $('restartBtn').click();
      else if (e.key === 'Escape') this.hideOverlay();
    });
  }

  sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
}
