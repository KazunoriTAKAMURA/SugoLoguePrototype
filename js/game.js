// Game state and logic: 1 die, terrain-based random encounters, warp, spring

import { EventType } from './map.js';
import { getNeighbors, hexKey, findExactPath } from './hex.js';
import { EquipSlot, calcEquipStats, getShopItems, getEnemyDrop, slotLabel, formatEquipDiff } from './equipment.js';

export class Game {
  constructor(map) {
    this.map = map;
    this.position = { q: map.start.q, r: map.start.r };
    this.hp = 20;
    this.maxHpBase = 20;
    this.gold = 0;
    this.level = 1;
    this.exp = 0;
    this.floor = 1;
    this.maxFloor = 10;
    this.atkBase = 3;
    this.defBase = 1;
    this.agiBase = 2;
    this.equipped = {
      [EquipSlot.WEAPON]: null,
      [EquipSlot.ARMOR]: null,
      [EquipSlot.ACCESSORY]: null,
    };

    this.turnsLeft = 0;
    this.maxTurns = 0;

    this.movesLeft = 0;
    this.die = 0;
    this.moveHistory = [];
    this.visitedThisTurn = new Set();
    this.steppedThisTurn = 0;

    this.state = 'ready';
    this.logs = [];
    this.pendingEvent = null;
  }

  initTurns() {
    this.maxTurns = 12 + this.floor;
    this.turnsLeft = this.maxTurns;
  }

  get atk() { return this.atkBase + calcEquipStats(this.equipped).atk; }
  get def() { return this.defBase + calcEquipStats(this.equipped).def; }
  get maxHp() { return this.maxHpBase + calcEquipStats(this.equipped).maxHp; }
  get agi() { return this.agiBase + calcEquipStats(this.equipped).agi; }

  equipDiffText(item) { return formatEquipDiff(this.equipped, item); }

  buildRecord(status) {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const mo = String(jst.getUTCMonth() + 1).padStart(2, '0');
    const d = String(jst.getUTCDate()).padStart(2, '0');
    const h = String(jst.getUTCHours()).padStart(2, '0');
    const mi = String(jst.getUTCMinutes()).padStart(2, '0');
    const s = String(jst.getUTCSeconds()).padStart(2, '0');
    const clearTime = `${y}/${mo}/${d} ${h}:${mi}:${s}`;
    return {
      status, floor: this.floor, clearTime,
      level: this.level, hp: this.hp, maxHp: this.maxHp,
      atk: this.atk, def: this.def, agi: this.agi,
      weapon: this.equipped[EquipSlot.WEAPON]?.name || 'なし',
      armor: this.equipped[EquipSlot.ARMOR]?.name || 'なし',
      accessory: this.equipped[EquipSlot.ACCESSORY]?.name || 'なし',
      gold: this.gold,
    };
  }

  rollDice() {
    if (this.state !== 'ready') return null;
    if (this.turnsLeft <= 0) {
      this.state = 'gameover';
      this.addLog('ターン切れで力尽きた...', 'event-battle');
      this.pendingEvent = { text: 'ダイスの残り回数が0になった...\n力尽きた...', choices: [{ text: 'リトライ', action: 'retry' }] };
      return null;
    }
    this.state = 'rolling';
    this.die = Math.floor(Math.random() * 6) + 1;
    this.turnsLeft--;
    return this.die;
  }

  confirmRoll() {
    this.movesLeft = this.die;
    this.moveHistory = [{ ...this.position }];
    this.visitedThisTurn = new Set();
    this.visitedThisTurn.add(hexKey(this.position.q, this.position.r));
    this.steppedThisTurn = 0;
    this.state = 'moving';
  }

  canStopHere() {
    if (this.steppedThisTurn === 0) return false;
    const tile = this.map.tiles.get(hexKey(this.position.q, this.position.r));
    return tile && tile.terrain.id === 'castle';
  }

  getMovableHexes() {
    if (this.state !== 'moving' || this.movesLeft <= 0) return [];
    const neighbors = getNeighbors(this.position.q, this.position.r);
    const movable = [];
    for (const n of neighbors) {
      const tile = this.map.tiles.get(hexKey(n.q, n.r));
      if (!tile || !tile.terrain.walkable) continue;
      const key = hexKey(n.q, n.r);
      if (this.moveHistory.length >= 2) {
        const prev = this.moveHistory[this.moveHistory.length - 2];
        if (prev.q === n.q && prev.r === n.r) { movable.push({ ...n, isBack: true }); continue; }
      }
      if (this.visitedThisTurn.has(key)) continue;
      movable.push({ ...n, isBack: false });
    }
    return movable;
  }

  moveToHex(q, r) {
    if (this.state !== 'moving') return false;
    const movable = this.getMovableHexes();
    const target = movable.find(m => m.q === q && m.r === r);
    if (!target) return false;
    if (target.isBack) {
      this.moveHistory.pop();
      this.visitedThisTurn.delete(hexKey(this.position.q, this.position.r));
      this.position = { ...target };
      this.movesLeft++;
      this.steppedThisTurn = Math.max(0, this.steppedThisTurn - 1);
    } else {
      this.position = { q, r };
      this.moveHistory.push({ q, r });
      this.visitedThisTurn.add(hexKey(q, r));
      this.movesLeft--;
      this.steppedThisTurn++;
    }
    if (this.movesLeft <= 0) this.endMovement();
    return true;
  }

  findAutoPath(targetQ, targetR) {
    return findExactPath(this.position.q, this.position.r, targetQ, targetR, this.map.tiles, new Set(this.visitedThisTurn), this.movesLeft);
  }

  executeAutoStep(q, r) {
    this.position = { q, r };
    this.moveHistory.push({ q, r });
    this.visitedThisTurn.add(hexKey(q, r));
    this.movesLeft--;
    this.steppedThisTurn++;
  }

  stopMovement() {
    if (this.state === 'moving' && this.canStopHere()) this.endMovement();
  }

  endMovement() {
    this.state = 'event';
    const tile = this.map.tiles.get(hexKey(this.position.q, this.position.r));
    if (tile) this.triggerEvent(tile);
    else this.finishEvent();
  }

  triggerEvent(tile) {
    if (tile.isBossGoal) {
      this.pendingEvent = this.resolveBossGoal();
    } else if (tile.event.id === 'shop' || tile.event.id === 'spring' || tile.event.id === 'warp') {
      this.pendingEvent = this.resolveFixedEvent(tile);
    } else {
      // Terrain-based random encounter
      this.pendingEvent = this.resolveRandomEncounter(tile);
    }
  }

  // --- Terrain-based random encounter ---
  resolveRandomEncounter(tile) {
    const terrain = tile.terrain.id;

    // Bridge: no events
    if (terrain === 'bridge') {
      return { text: '橋を渡った。', choices: [], autoResolve: true };
    }

    let battlePct, treasurePct, trapPct;

    if (terrain === 'forest') {
      battlePct = 50; treasurePct = 30; trapPct = 10;
    } else if (terrain === 'hills') {
      battlePct = 40; treasurePct = 30; trapPct = 10;
    } else {
      battlePct = 40; treasurePct = 20; trapPct = 10;
    }

    const roll = Math.random() * 100;
    if (roll < battlePct) return this.resolveAutoBattle();
    if (roll < battlePct + treasurePct) return this.resolveTreasure();
    if (roll < battlePct + treasurePct + trapPct) return this.resolveTrap();
    return { text: '何もなかった。', choices: [], autoResolve: true };
  }

  resolveAutoBattle() {
    const eHp = 3 + this.floor * 2 + Math.floor(Math.random() * 4);
    const eAtk = 1 + this.floor + Math.floor(Math.random() * 2);
    const eAgi = 1 + Math.floor(Math.random() * 3) + Math.floor(this.floor * 0.5);
    const eName = pickRandom(['スライム', 'ゴブリン', 'スケルトン', 'コウモリ', 'オオカミ', 'オーク']);
    const { won, log } = this.runFight({ name: eName, hp: eHp, atk: eAtk, agi: eAgi });

    if (!won) {
      this.hp = 0; this.state = 'gameover';
      this.addLog(`${eName}に敗北...`, 'event-battle');
      return { text: `${eName}が現れた！\n${log}`, choices: [{ text: 'リトライ', action: 'retry' }] };
    }

    const goldReward = 5 + Math.floor(Math.random() * 10) * this.floor;
    this.gold += goldReward; this.exp += 5; this.checkLevelUp();
    this.addLog(`${eName}撃破！ +${goldReward}G`, 'event-battle');

    const drop = getEnemyDrop(this.floor);
    if (drop) {
      this.addLog(`${drop.name}をドロップ！`, 'event-treasure');
      const diff = this.equipDiffText(drop);
      return {
        text: `${eName}を撃破！\n${log}\n+${goldReward}G / +5EXP\n\n${drop.name}(${slotLabel(drop.slot)})を落とした！\n[${diff}]`,
        choices: [{ text: '装備する', action: 'equipDrop', data: drop }, { text: '拾わない', action: 'skipEvent' }],
      };
    }
    return { text: `${eName}を撃破！\n${log}\n+${goldReward}G / +5EXP`, choices: [], autoResolve: true };
  }

  resolveTreasure() {
    const hasEquip = Math.random() < 0.45;
    if (hasEquip) {
      const drop = getEnemyDrop(this.floor, true);
      if (drop) {
        const diff = this.equipDiffText(drop);
        return {
          text: `宝箱を開けた！\n中に${drop.name}(${slotLabel(drop.slot)})が入っている！\n[${diff}]`,
          choices: [{ text: '装備する', action: 'equipDrop', data: drop }, { text: 'スルーする', action: 'skip' }],
        };
      }
    }
    const goldAmt = 5 + Math.floor(Math.random() * 10) * this.floor;
    this.gold += goldAmt;
    this.addLog(`宝箱から${goldAmt}G獲得！`, 'event-treasure');
    return { text: `宝箱を開けた！\n${goldAmt}ゴールド手に入れた！`, choices: [], autoResolve: true };
  }

  resolveTrap() {
    const dmg = 1 + Math.floor(Math.random() * 3) + this.floor;
    const dodgeChance = Math.min(0.4, this.agi * 0.05);
    if (Math.random() < dodgeChance) {
      this.addLog(`トラップ回避！ (AGI判定成功)`, 'event-trap');
      return { text: `トラップを素早く回避した！ (AGI判定成功)`, choices: [], autoResolve: true };
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.addLog(`トラップ！ ${dmg}ダメージ！`, 'event-trap');
    if (this.hp <= 0) {
      this.state = 'gameover';
      return { text: `トラップで${dmg}ダメージ！\n力尽きた...`, choices: [{ text: 'リトライ', action: 'retry' }] };
    }
    return { text: `トラップで${dmg}ダメージ！ (HP: ${this.hp}/${this.maxHp})`, choices: [], autoResolve: true };
  }

  // --- Fixed events ---
  resolveFixedEvent(tile) {
    switch (tile.event.id) {
      case 'shop': {
        const items = getShopItems(this.floor);
        const innCost = 5 + this.floor * 3;
        const choices = items.map(item => {
          const diff = this.equipDiffText(item);
          return { text: `${slotLabel(item.slot)}:${item.name} [${diff}] — ${item.price}G`, action: 'shopBuy', data: item };
        });
        choices.push({ text: `宿泊してHP全回復 — ${innCost}G`, action: 'inn', data: { cost: innCost } });
        choices.push({ text: '何もしない', action: 'skip' });
        return { text: `城に立ち寄った。\n所持金: ${this.gold}G / HP: ${this.hp}/${this.maxHp}`, choices };
      }

      case 'spring': {
        // Consume spring
        tile.event = EventType.EMPTY;
        const springDie = Math.floor(Math.random() * 6) + 1;
        this.turnsLeft += springDie;
        const healed = Math.min(springDie, this.maxHp - this.hp);
        this.hp = Math.min(this.maxHp, this.hp + springDie);
        this.addLog(`泉で回復！ ダイス${springDie} → ターン+${springDie} HP+${healed}`, 'event-spring');
        return {
          text: `不思議な泉を見つけた！\nダイスを振った... ${springDie} が出た！\n残りダイス回数+${springDie} (残り${this.turnsLeft}回)\nHP+${healed} (HP: ${this.hp}/${this.maxHp})`,
          choices: [], autoResolve: true,
        };
      }

      case 'warp': {
        const pairKey = tile.warpPairKey;
        const pairTile = this.map.tiles.get(pairKey);
        if (!pairTile) return { text: '何もなかった。', choices: [], autoResolve: true };

        // Reveal the other warp
        pairTile.warpVisible = true;
        tile.warpVisible = true;

        // Teleport
        const [pq, pr] = pairKey.split(',').map(Number);
        this.position = { q: pq, r: pr };
        this.addLog(`ワープ！`, 'event-treasure');
        return {
          text: `☸️ ワープマスに乗った！\n別の場所へ転送された！`,
          choices: [], autoResolve: true,
        };
      }

      default:
        return { text: '何もなかった。', choices: [], autoResolve: true };
    }
  }

  resolveBossGoal() {
    const bossHp = 10 + this.floor * 6;
    const bossAtk = 3 + this.floor * 2;
    const bossAgi = 2 + this.floor;
    const bossName = pickRandom(['ドラゴン', 'デーモン', 'リッチ', 'ゴーレム', 'ワイバーン', 'ベヒーモス']);
    return {
      text: `🦹 フロアボス「${bossName}」が立ちはだかる！\n敵HP: ${bossHp} / ATK: ${bossAtk} / AGI: ${bossAgi}\nこいつを倒せば次のフロアへ進める！`,
      choices: [{ text: '挑む！', action: 'fightBoss', data: { name: bossName, hp: bossHp, atk: bossAtk, agi: bossAgi, boss: true } }],
    };
  }

  runFight(data) {
    let eHp = data.hp;
    const eAgi = data.agi || 1;
    let log = '', rounds = 0;
    while (eHp > 0 && this.hp > 0) {
      rounds++;
      const playerFirst = this.agi >= eAgi || (this.agi + Math.random() * 3 > eAgi);
      if (playerFirst) {
        const pDmg = Math.max(1, this.atk + Math.floor(Math.random() * 3));
        eHp -= pDmg; log += `[${rounds}] ${pDmg}→ `;
        if (eHp <= 0) { log += '撃破！'; break; }
        const dodge = Math.min(0.3, Math.max(0, (this.agi - eAgi) * 0.05));
        if (Math.random() < dodge) { log += '回避！ '; }
        else { const eDmg = Math.max(1, data.atk - this.def + Math.floor(Math.random() * 2)); this.hp -= eDmg; log += `${eDmg}被弾 `; }
      } else {
        const dodge = Math.min(0.2, Math.max(0, (this.agi - eAgi) * 0.03));
        if (Math.random() < dodge) { log += `[${rounds}] 回避！ `; }
        else { const eDmg = Math.max(1, data.atk - this.def + Math.floor(Math.random() * 2)); this.hp -= eDmg; log += `[${rounds}] ${eDmg}被弾 `; }
        if (this.hp <= 0) { log += '敗北...'; break; }
        const pDmg = Math.max(1, this.atk + Math.floor(Math.random() * 3));
        eHp -= pDmg; log += `${pDmg}→ `;
        if (eHp <= 0) { log += '撃破！'; break; }
      }
      if (this.hp <= 0) { log += '敗北...'; break; }
    }
    return { won: this.hp > 0, log };
  }

  executeChoice(action, data) {
    switch (action) {
      case 'fight':
      case 'fightBoss': {
        const isBossGoal = action === 'fightBoss';
        const { won, log } = this.runFight(data);
        if (!won) {
          this.hp = 0; this.state = 'gameover';
          this.addLog(`${data.name}に敗北...`, 'event-battle');
          this.pendingEvent = { text: `${data.name}に敗北...\n${log}`, choices: [{ text: 'リトライ', action: 'retry' }] };
        } else if (isBossGoal) {
          const goldReward = 20 + Math.floor(Math.random() * 15) * this.floor;
          this.gold += goldReward; this.exp += 25; this.checkLevelUp();
          this.addLog(`フロアボス${data.name}撃破！ +${goldReward}G`, 'event-boss');
          const drop = getEnemyDrop(this.floor, false, true);
          let dropText = '';

          if (this.floor >= this.maxFloor) {
            if (drop) {
              this.addLog(`${drop.name}をドロップ！`, 'event-treasure');
              dropText = `\n\n${drop.name}(${slotLabel(drop.slot)})を落とした！`;
              this.equipped[drop.slot] = drop;
              this.hp = Math.min(this.hp, this.maxHp);
            }
            this.clearRecord = this.buildRecord('クリア');
            this.state = 'clear';
            this.pendingEvent = {
              text: `🦹 フロアボス「${data.name}」を撃破！\n${log}\n+${goldReward}G / +25EXP${dropText}\n\n全${this.maxFloor}フロア制覇！おめでとう！`,
              choices: [{ text: 'エンドロールへ', action: 'endroll' }],
            };
          } else {
            const choices = [{ text: '次のフロアへ', action: 'nextFloor' }];
            if (drop) {
              this.addLog(`${drop.name}をドロップ！`, 'event-treasure');
              const diff = this.equipDiffText(drop);
              dropText = `\n\n${drop.name}(${slotLabel(drop.slot)})を落とした！\n[${diff}]`;
              choices.unshift({ text: '装備する', action: 'equipDropThenNext', data: drop });
            }
            this.state = 'clear';
            this.pendingEvent = {
              text: `🦹 フロアボス「${data.name}」を撃破！\n${log}\n+${goldReward}G / +25EXP${dropText}\n\nフロア${this.floor}クリア！`,
              choices,
            };
          }
        } else {
          const goldReward = (data.boss ? 15 : 5) + Math.floor(Math.random() * 10) * this.floor;
          const expReward = data.boss ? 15 : 5;
          this.gold += goldReward; this.exp += expReward; this.checkLevelUp();
          this.addLog(`${data.name}撃破！ +${goldReward}G`, 'event-battle');
          const drop = getEnemyDrop(this.floor);
          if (drop) {
            this.addLog(`${drop.name}をドロップ！`, 'event-treasure');
            const diff = this.equipDiffText(drop);
            this.pendingEvent = {
              text: `${data.name}を撃破！\n${log}\n+${goldReward}G / +${expReward}EXP\n\n${drop.name}(${slotLabel(drop.slot)})を落とした！\n[${diff}]`,
              choices: [{ text: '装備する', action: 'equipDrop', data: drop }, { text: '拾わない', action: 'skipEvent' }],
            };
          } else {
            this.pendingEvent = { text: `${data.name}を撃破！\n${log}\n+${goldReward}G / +${expReward}EXP`, choices: [], autoResolve: true };
          }
          if (this.state !== 'gameover') this.state = 'event';
        }
        break;
      }
      case 'flee': {
        this.hp = Math.max(0, this.hp - data.cost);
        this.addLog(`逃走！ HP-${data.cost}`, 'event-battle');
        if (this.hp <= 0) { this.state = 'gameover'; this.pendingEvent = { text: '逃走中に力尽きた...', choices: [{ text: 'リトライ', action: 'retry' }] }; }
        else { this.pendingEvent = { text: `逃げ切った！ (HP-${data.cost})`, choices: [], autoResolve: true }; }
        break;
      }
      case 'inn': {
        if (this.gold >= data.cost) {
          this.gold -= data.cost;
          const healed = this.maxHp - this.hp; this.hp = this.maxHp;
          this.addLog(`宿泊！ HP全回復 (+${healed}) -${data.cost}G`, 'event-shop');
          this.pendingEvent = { text: `宿泊してHP全回復！ (+${healed}HP / -${data.cost}G)`, choices: [], autoResolve: true };
        } else { this.pendingEvent = { text: 'ゴールドが足りない！', choices: [], autoResolve: true }; }
        break;
      }
      case 'shopBuy': {
        if (this.gold >= data.price) {
          this.gold -= data.price;
          const old = this.equipped[data.slot]; this.equipped[data.slot] = data;
          this.hp = Math.min(this.hp, this.maxHp);
          this.addLog(`${data.name}を装備！`, 'event-shop');
          this.pendingEvent = { text: `${data.name}を装備した！${old ? `\n(${old.name}から変更)` : ''}`, choices: [], autoResolve: true };
        } else { this.pendingEvent = { text: 'ゴールドが足りない！', choices: [], autoResolve: true }; }
        break;
      }
      case 'equipDrop': {
        this.equipped[data.slot] = data; this.hp = Math.min(this.hp, this.maxHp);
        this.addLog(`${data.name}を装備！`, 'event-treasure');
        this.pendingEvent = { text: `${data.name}を装備した！`, choices: [], autoResolve: true };
        break;
      }
      case 'equipDropThenNext': {
        this.equipped[data.slot] = data; this.hp = Math.min(this.hp, this.maxHp);
        this.addLog(`${data.name}を装備！`, 'event-treasure');
        this.pendingEvent = { text: `${data.name}を装備した！\n次のフロアへ...`, choices: [{ text: '次のフロアへ', action: 'nextFloor' }] };
        this.state = 'clear';
        break;
      }
      case 'nextFloor': case 'retry': case 'endroll': break;
      case 'skip': case 'skipEvent':
        this.pendingEvent = { text: 'スルーした。', choices: [], autoResolve: true }; break;
    }
  }

  checkLevelUp() {
    const threshold = this.level * 15;
    if (this.exp >= threshold) {
      this.exp -= threshold; this.level++;
      this.maxHpBase += 5; this.hp = this.maxHp;
      this.atkBase += 1; this.defBase += 1; this.agiBase += 1;
      this.addLog(`レベルアップ！ Lv.${this.level} HP全回復！`, 'event-treasure');
    }
  }

  finishEvent() {
    this.pendingEvent = null;
    if (this.state === 'event') this.state = 'ready';
  }

  addLog(text, className = '') {
    this.logs.unshift({ text, className });
    if (this.logs.length > 50) this.logs.pop();
  }
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
