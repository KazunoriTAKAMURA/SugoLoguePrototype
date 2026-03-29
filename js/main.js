// Main entry point: title dice, game loop, UI, click-to-move, endroll, ranking

import { generateMap } from './map.js';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { EquipSlot } from './equipment.js';

let renderer, game, map;
let lastTime = 0;
let diceAnimTimer = 0;
let diceAnimating = false;
let startingGold = 0;

let autoMovePath = [];
let autoMoveTimer = 0;
const AUTO_MOVE_INTERVAL = 150;

const RANKING_KEY = 'sugologue_rankings';

// --- DOM ---
const titleScreen = document.getElementById('title-screen');
const app = document.getElementById('app');
const canvas = document.getElementById('gameCanvas');
const btnStart = document.getElementById('btn-start');
const btnTitleRoll = document.getElementById('btn-title-roll');
const titleDiceArea = document.getElementById('title-dice-area');
const titleDice1 = document.getElementById('title-dice1');
const titleDice2 = document.getElementById('title-dice2');
const titleDiceResult = document.getElementById('title-dice-result');
const btnRoll = document.getElementById('btn-roll');
const btnStop = document.getElementById('btn-stop');
const moveInfo = document.getElementById('move-info');
const moveRemaining = document.getElementById('move-remaining');
const dice1 = document.getElementById('dice1');
const diceTotal = document.getElementById('dice-total');
const eventText = document.getElementById('event-text');
const eventChoices = document.getElementById('event-choices');
const logContent = document.getElementById('log-content');
const statHp = document.getElementById('stat-hp');
const statAtk = document.getElementById('stat-atk');
const statDef = document.getElementById('stat-def');
const statAgi = document.getElementById('stat-agi');
const statGold = document.getElementById('stat-gold');
const statLevel = document.getElementById('stat-level');
const statFloor = document.getElementById('stat-floor');
const statTurns = document.getElementById('stat-turns');
const equipWeapon = document.getElementById('equip-weapon');
const equipArmor = document.getElementById('equip-armor');
const equipAccessory = document.getElementById('equip-accessory');
const floorNameOverlay = document.getElementById('floor-name-overlay');
const floorNameNumber = document.getElementById('floor-name-number');
const floorNameText = document.getElementById('floor-name-text');
const endrollOverlay = document.getElementById('endroll-overlay');
const endrollContent = document.getElementById('endroll-content');
const btnEndrollSkip = document.getElementById('btn-endroll-skip');
const rankingTitle = document.getElementById('ranking-title');
const rankingList = document.getElementById('ranking-list');

// ====== Map radius per floor ======
function getMapRadius(floor) {
  if (floor <= 3) return 5;  // 1辺6マス
  if (floor <= 6) return 6;  // 1辺7マス
  if (floor <= 9) return 7;  // 1辺8マス
  return 9;                  // 1辺10マス
}

// ====== Ranking ======
function loadRankings() {
  try {
    return JSON.parse(localStorage.getItem(RANKING_KEY)) || [];
  } catch { return []; }
}

function saveRanking(record) {
  const rankings = loadRankings();
  rankings.push(record);
  // Sort: 1) status (クリア first) 2) level desc 3) clearTime asc
  rankings.sort((a, b) => {
    const sa = a.status === 'クリア' ? 0 : 1;
    const sb = b.status === 'クリア' ? 0 : 1;
    if (sa !== sb) return sa - sb;
    if (b.level !== a.level) return b.level - a.level;
    return a.clearTime.localeCompare(b.clearTime);
  });
  if (rankings.length > 20) rankings.length = 20;
  localStorage.setItem(RANKING_KEY, JSON.stringify(rankings));
}

function renderRankings() {
  const rankings = loadRankings();
  if (rankings.length === 0) {
    rankingTitle.classList.add('hidden');
    rankingList.innerHTML = '';
    return;
  }
  rankingTitle.classList.remove('hidden');
  rankingList.innerHTML = rankings.map((r, i) => {
    const statusLabel = r.status === 'クリア' ? '🏆クリア' : '💀リタイア';
    const floorLabel = r.floor ? `F${r.floor}` : '';
    return `<div class="rank-entry${r.status === 'クリア' ? ' rank-clear' : ' rank-retire'}">` +
      `<span class="rank-num">#${i + 1}</span>` +
      `<span class="rank-status">${statusLabel}</span>` +
      `<span class="rank-detail">${floorLabel} Lv.${r.level} | ${r.clearTime} | ATK${r.atk} DEF${r.def} AGI${r.agi} | ${r.gold}G</span>` +
      `<span class="rank-equip">${r.weapon} / ${r.armor} / ${r.accessory}</span>` +
      `</div>`;
  }).join('');
}

// ====== Endroll ======
function showEndroll(record) {
  app.classList.add('hidden');
  endrollOverlay.classList.remove('hidden');

  const lines = [
    '', '', '',
    '🏆 CONGRATULATIONS 🏆',
    '',
    '全10フロア制覇！',
    '',
    '— クリアデータ —',
    '',
    `クリア時刻: ${record.clearTime} (JST)`,
    `レベル: ${record.level}`,
    `HP: ${record.hp} / ${record.maxHp}`,
    `ATK: ${record.atk}`,
    `DEF: ${record.def}`,
    `AGI: ${record.agi}`,
    '',
    `武器: ${record.weapon}`,
    `防具: ${record.armor}`,
    `装飾: ${record.accessory}`,
    '',
    `所持ゴールド: ${record.gold}G`,
    '',
    '',
    '— STAFF —',
    '',
    'Game Design',
    'Player',
    '',
    'Programming',
    'Claude & Player',
    '',
    'Powered by',
    'SugoLogue Engine',
    '',
    '',
    'Thank you for playing!',
    '',
    '',
    '',
  ];

  endrollContent.innerHTML = lines.map(l =>
    `<div class="endroll-line">${l || '&nbsp;'}</div>`
  ).join('');

  // Start scroll animation
  const scroll = endrollOverlay.querySelector('#endroll-scroll');
  scroll.style.animation = 'none';
  void scroll.offsetHeight; // reflow
  scroll.style.animation = 'endrollScroll 15s linear forwards';

  // Show skip button after 3s
  btnEndrollSkip.classList.add('hidden');
  setTimeout(() => btnEndrollSkip.classList.remove('hidden'), 3000);
}

btnEndrollSkip.addEventListener('click', () => {
  endrollOverlay.classList.add('hidden');
  app.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  resetTitle();
});

// ====== Title Screen ======
let titleState = 'init';
let titleDiceValues = [0, 0];
let titleRollTimer = 0;

function resetTitle() {
  titleState = 'init';
  startingGold = 0;
  titleDiceArea.classList.remove('hidden');
  btnTitleRoll.classList.remove('hidden');
  btnStart.classList.add('hidden');
  titleDiceResult.classList.add('hidden');
  titleDice1.textContent = '?';
  titleDice2.textContent = '?';
  titleDice1.classList.remove('rolling');
  titleDice2.classList.remove('rolling');
  renderRankings();
}

btnTitleRoll.addEventListener('click', () => {
  if (titleState !== 'init') return;
  titleState = 'rolling';
  titleRollTimer = 0;
  titleDiceValues = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
  titleDice1.classList.add('rolling');
  titleDice2.classList.add('rolling');
  btnTitleRoll.classList.add('hidden');
});

btnStart.addEventListener('click', () => {
  if (titleState !== 'rolled') return;
  titleScreen.classList.add('hidden');
  app.classList.remove('hidden');
  startGame(1, null, startingGold);
});

function updateTitleDice(dt) {
  if (titleState !== 'rolling') return;
  titleRollTimer += dt;
  if (titleRollTimer < 600) {
    titleDice1.textContent = Math.floor(Math.random() * 6) + 1;
    titleDice2.textContent = Math.floor(Math.random() * 6) + 1;
  } else {
    titleState = 'rolled';
    titleDice1.textContent = titleDiceValues[0];
    titleDice2.textContent = titleDiceValues[1];
    titleDice1.classList.remove('rolling');
    titleDice2.classList.remove('rolling');
    const total = titleDiceValues[0] + titleDiceValues[1];
    startingGold = total * 10;
    titleDiceResult.textContent = `${titleDiceValues[0]} + ${titleDiceValues[1]} = ${total} → 初期ゴールド ${startingGold}G！`;
    titleDiceResult.classList.remove('hidden');
    btnStart.classList.remove('hidden');
  }
}

// ====== Floor Name Overlay ======
function showFloorName(floor, floorName) {
  floorNameNumber.textContent = `Floor ${floor}`;
  floorNameText.textContent = floorName;
  floorNameOverlay.classList.remove('hidden');
  floorNameOverlay.classList.add('show');
  setTimeout(() => {
    floorNameOverlay.classList.remove('show');
    floorNameOverlay.classList.add('fade-out');
    setTimeout(() => {
      floorNameOverlay.classList.add('hidden');
      floorNameOverlay.classList.remove('fade-out');
    }, 1000);
  }, 2500);
}

// ====== Game Init ======
function startGame(floor, keepStats = null, initialGold = 0) {
  const radius = getMapRadius(floor);
  map = generateMap(radius, Date.now());

  renderer = new Renderer(canvas);
  renderer.resize(radius);

  game = new Game(map);
  game.floor = floor;
  game.initTurns();

  if (keepStats) {
    game.hp = keepStats.hp;
    game.maxHpBase = keepStats.maxHpBase;
    game.gold = keepStats.gold;
    game.level = keepStats.level;
    game.exp = keepStats.exp;
    game.atkBase = keepStats.atkBase;
    game.defBase = keepStats.defBase;
    game.agiBase = keepStats.agiBase;
    game.equipped = keepStats.equipped;
    game.logs = keepStats.logs;
    game.hp = Math.min(game.hp, game.maxHp);
  } else {
    game.gold = initialGold;
  }

  autoMovePath = [];
  game.addLog(`--- フロア${floor}「${map.floorName}」開始 (残り${game.turnsLeft}ターン) ---`);
  eventText.textContent = 'サイコロを振って進もう！';
  eventChoices.innerHTML = '';
  updateUI();
  showFloorName(floor, map.floorName);

  if (!lastTime) requestAnimationFrame(gameLoop);
}

// ====== Game Loop ======
function gameLoop(time) {
  const dt = lastTime ? time - lastTime : 16;
  lastTime = time;

  updateTitleDice(dt);

  if (diceAnimating && game) {
    diceAnimTimer += dt;
    if (diceAnimTimer < 500) {
      dice1.textContent = Math.floor(Math.random() * 6) + 1;
    } else {
      diceAnimating = false;
      dice1.textContent = game.die;
      dice1.classList.remove('rolling');
      game.confirmRoll();
      diceTotal.textContent = `${game.die} マス`;
      game.addLog(`🎲 ${game.die} (残り${game.turnsLeft}ターン)`);
      eventText.textContent = 'マップをクリックして移動！';
      eventChoices.innerHTML = '';
      updateUI();
    }
  }

  if (autoMovePath.length > 0 && game && game.state === 'moving') {
    autoMoveTimer += dt;
    if (autoMoveTimer >= AUTO_MOVE_INTERVAL) {
      autoMoveTimer = 0;
      const step = autoMovePath.shift();
      game.executeAutoStep(step.q, step.r);
      if (autoMovePath.length === 0 || game.movesLeft <= 0) {
        autoMovePath = [];
        if (game.movesLeft <= 0) game.endMovement();
      }
      updateUI();
    }
  }

  if (game && game.state === 'event' && game.pendingEvent && game.pendingEvent.autoResolve) {
    showEvent(game.pendingEvent);
    game.finishEvent();
    updateUI();
  }

  if (game && game.state === 'ready' && game.turnsLeft <= 0) {
    game.state = 'gameover';
    game.addLog('ターン切れで力尽きた...', 'event-battle');
    game.pendingEvent = { text: 'ダイスの残り回数が0になった...\n力尽きた...', choices: [{ text: 'リトライ', action: 'retry' }] };
    showEvent(game.pendingEvent);
    updateUI();
  }

  if (renderer && map && game) renderer.render(map, game, dt);
  requestAnimationFrame(gameLoop);
}

// ====== UI ======
function updateUI() {
  if (!game) return;
  statHp.textContent = `${game.hp} / ${game.maxHp}`;
  statAtk.textContent = game.atk;
  statDef.textContent = game.def;
  statAgi.textContent = game.agi;
  statGold.textContent = game.gold;
  statLevel.textContent = `${game.level} (EXP: ${game.exp}/${game.level * 15})`;
  statFloor.textContent = `${game.floor} / ${game.maxFloor}`;
  statTurns.textContent = `${game.turnsLeft} / ${game.maxTurns}`;

  if (game.turnsLeft <= 3) statTurns.style.color = '#e74c3c';
  else if (game.turnsLeft <= 6) statTurns.style.color = '#f39c12';
  else statTurns.style.color = '';

  updateEquipSlot(equipWeapon, game.equipped[EquipSlot.WEAPON]);
  updateEquipSlot(equipArmor, game.equipped[EquipSlot.ARMOR]);
  updateEquipSlot(equipAccessory, game.equipped[EquipSlot.ACCESSORY]);

  btnRoll.disabled = game.state !== 'ready' || game.turnsLeft <= 0;

  if (game.state === 'moving') {
    moveInfo.classList.remove('hidden');
    moveRemaining.textContent = game.movesLeft;
    if (game.canStopHere()) btnStop.classList.remove('hidden');
    else btnStop.classList.add('hidden');
  } else {
    moveInfo.classList.add('hidden');
  }

  if (game.state === 'event' && game.pendingEvent && !game.pendingEvent.autoResolve) showEvent(game.pendingEvent);
  if (game.state === 'clear' && game.pendingEvent) showEvent(game.pendingEvent);
  if (game.state === 'gameover' && game.pendingEvent) showEvent(game.pendingEvent);

  logContent.innerHTML = game.logs
    .map(l => `<div class="log-entry ${l.className}">${l.text}</div>`)
    .join('');
}

function updateEquipSlot(el, item) {
  if (item) { el.textContent = item.name; el.classList.add('has-item'); }
  else { el.textContent = 'なし'; el.classList.remove('has-item'); }
}

function showEvent(ev) {
  eventText.textContent = ev.text;
  eventChoices.innerHTML = '';
  for (const choice of (ev.choices || [])) {
    const btn = document.createElement('button');
    btn.textContent = choice.text;
    btn.addEventListener('click', () => handleChoice(choice));
    eventChoices.appendChild(btn);
  }
}

function handleChoice(choice) {
  if (choice.action === 'nextFloor') {
    const stats = {
      hp: game.hp, maxHpBase: game.maxHpBase, gold: game.gold,
      level: game.level, exp: game.exp,
      atkBase: game.atkBase, defBase: game.defBase, agiBase: game.agiBase,
      equipped: { ...game.equipped }, logs: game.logs,
    };
    startGame(game.floor + 1, stats);
    return;
  }

  if (choice.action === 'endroll') {
    if (game.clearRecord) {
      saveRanking(game.clearRecord);
      showEndroll(game.clearRecord);
    }
    return;
  }

  if (choice.action === 'retry') {
    // Save retire record
    if (game) {
      saveRanking(game.buildRecord('リタイア'));
    }
    app.classList.add('hidden');
    titleScreen.classList.remove('hidden');
    resetTitle();
    return;
  }

  game.executeChoice(choice.action, choice.data);

  if (game.pendingEvent) {
    showEvent(game.pendingEvent);
    if (game.pendingEvent.autoResolve && game.state !== 'gameover') game.finishEvent();
  }
  updateUI();
}

// ====== Input ======
btnRoll.addEventListener('click', () => {
  if (!game || game.state !== 'ready') return;
  const result = game.rollDice();
  if (result) {
    diceAnimating = true;
    diceAnimTimer = 0;
    dice1.classList.add('rolling');
    diceTotal.textContent = '';
    eventText.textContent = 'サイコロを振っています...';
    eventChoices.innerHTML = '';
    btnRoll.disabled = true;
  } else if (game.state === 'gameover') {
    updateUI();
  }
});

btnStop.addEventListener('click', () => {
  if (game && game.state === 'moving' && game.canStopHere()) {
    autoMovePath = [];
    game.stopMovement();
    updateUI();
  }
});

canvas.addEventListener('click', (e) => {
  if (!game || game.state !== 'moving') return;
  if (autoMovePath.length > 0) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const tile = renderer.screenToHex(x, y, map.tiles);
  if (!tile) return;

  const movable = game.getMovableHexes();
  const adjacent = movable.find(m => m.q === tile.q && m.r === tile.r);
  if (adjacent) {
    game.moveToHex(tile.q, tile.r);
    updateUI();
    return;
  }

  const path = game.findAutoPath(tile.q, tile.r);
  if (path && path.length > 0) {
    autoMovePath = path;
    autoMoveTimer = 0;
    const firstStep = autoMovePath.shift();
    game.executeAutoStep(firstStep.q, firstStep.r);
    if (autoMovePath.length === 0 && game.movesLeft <= 0) game.endMovement();
    updateUI();
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!renderer || !map) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const tile = renderer.screenToHex(x, y, map.tiles);
  if (tile) {
    renderer.hoveredHex = { q: tile.q, r: tile.r };
    canvas.title = `${tile.terrain.name} (高さ: ${tile.height})`;
  } else {
    renderer.hoveredHex = null;
    canvas.title = '';
  }
});

// ====== Init ======
resetTitle();
requestAnimationFrame(gameLoop);
