// Map generation: hex grid with terrain, height, fixed events only
// Random encounters are resolved at runtime by game.js based on terrain.

import { getNeighbors, hexKey, hexDistance } from './hex.js';

export const Terrain = {
  WATER:    { id: 'water',    name: '水',   color: '#2a6fc9', side: '#1d4f8a', walkable: false },
  PLAINS:   { id: 'plains',   name: '平地', color: '#5a9e3e', side: '#3d7228', walkable: true },
  FOREST:   { id: 'forest',   name: '森',   color: '#2d7a3d', side: '#1d5a2a', walkable: true },
  HILLS:    { id: 'hills',    name: '丘',   color: '#c4a55a', side: '#9e8040', walkable: true },
  MOUNTAIN: { id: 'mountain', name: '山',   color: '#8a8a9a', side: '#6a6a7a', walkable: false },
  CASTLE:   { id: 'castle',   name: '城',   color: '#c8b8a0', side: '#9a8a70', walkable: true },
  RIVER:    { id: 'river',    name: '川',   color: '#3a85d6', side: '#2a65a6', walkable: false },
  BRIDGE:   { id: 'bridge',   name: '橋',   color: '#3a85d6', side: '#2a65a6', walkable: true },
};

export const EventType = {
  EMPTY:  { id: 'empty',  color: 'transparent' },
  START:  { id: 'start',  color: 'transparent' },
  GOAL:   { id: 'goal',   color: 'transparent' },
  SHOP:   { id: 'shop',   color: '#3498db' },
  BOSS:   { id: 'boss',   color: '#ff2244' },
  SPRING: { id: 'spring', color: '#00bcd4' },
  WARP:   { id: 'warp',   color: '#ff9800' },
};

// --- Floor name generation ---
const PREFIXES = [
  '王都','古都','廃都','聖都','魔都','帝都','港町','城塞都市','交易都市','辺境の町',
  '忘れられた都','沈黙の街','落ちた天空城','迷いの森','霧の湖畔','嘆きの谷',
  '黄昏の原野','暁の峡谷','凍てつく荒野','灼熱の砂漠','深淵の洞窟','星降る丘',
  '翡翠の密林','白銀の山脈','紅蓮の火口','月影の遺跡','風の回廊','竜の巣',
  '眠りの森','天空の回廊','幻影の塔','漂泊の島','鉄の砦','水晶の洞',
  '禁断の地','約束の地','流浪の荒野','朽ちた神殿','影の回廊','光の大聖堂',
  '魔獣の森','呪われた沼地','失われた楽園','虹の架け橋','雷鳴の峰','黒鉄の城',
  '蒼穹の草原','深緑の渓谷','夜明けの岬','終焉の地',
];
const NAMES = [
  'スタンダール','エドバーグ','アルカディア','ヴァルハラ','エルドラド','カメロット',
  'アヴァロン','ミッドガルド','ザナドゥ','エリュシオン','ガラハド','トリスタン',
  'ブリュンヒルデ','フェルガナ','イスタンブル','ベオグラード','ケルンブルク',
  'ノルドヘイム','ヴォルフスブルク','フランベルジュ','クロイツェル','シュヴァルツ',
  'ゲッティンゲン','リューベック','アイゼンガルド','ブランシュ','モンターニュ',
  'ヴィルヌーヴ','フォンテーヌ','ロートリンゲン','ウィンダミア','グラスゴー',
  'エディンバラ','カンタベリー','ヨークシャー','ブラッドフォード','リバプール',
  'マルセイユ','リヨネーゼ','プロヴァンス','ボルドーニュ','シャンティイ',
  'フィレンツェ','ヴェネツィア','ミラネーゼ','ナポリターナ','パレルモ',
  'バルセローナ','グラナーダ','セビリアーナ','トレドーネ','サラゴサ',
  'アムステルダ','ロッテルダム','ハーグエン','ブリュージュ','ゲントベルク',
  'プラハエン','ウィーネン','ザルツブルク','インスブルク','チューリヒ',
  'ジュネーヴ','ベルニーナ','ルツェルン','バーゼリア','ダヴォスタン',
  'ヘルシンキア','ストックホルン','オスロンド','コペンハーゲ','レイキャヴィク',
  'ワルシャーヴ','クラクフェン','ブダペスタ','ブカレスティ','ソフィアーナ',
  'アテナイオン','テッサロニア','アンカラーノ','スミルナエン','ペルセポリス',
  'カイロネーゼ','アレクサンドル','ダマスクーノ','バグダディア','サマルカンド',
  'タシュケンタ','カブーリア','デリーアーナ','ムンバイエン','ジャイプルク',
  'コルカターナ','チェンナイン','バンガロール','ランカプール','シンガプーラ',
  'マニライオン','ジャカルタン','バンコクーノ','ハノイエーゼ','キョウトリア',
  'エドガルド','サカイノーヴァ','ナガサキーノ','ハコダテーゼ',
];

export function generateFloorName(seed) {
  const rng = makeRng(seed);
  return `${PREFIXES[Math.floor(rng() * PREFIXES.length)]} ${NAMES[Math.floor(rng() * NAMES.length)]}`;
}

// --- Reachability ---
function getReachableSet(tiles, startQ, startR) {
  const visited = new Set([hexKey(startQ, startR)]);
  const queue = [{ q: startQ, r: startR }];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const n of getNeighbors(cur.q, cur.r)) {
      const nk = hexKey(n.q, n.r);
      if (visited.has(nk)) continue;
      const tile = tiles.get(nk);
      if (!tile || !tile.terrain.walkable) continue;
      visited.add(nk);
      queue.push(n);
    }
  }
  return visited;
}

// --- Main generation ---
export function generateMap(radius, seed) {
  const floorName = generateFloorName(seed + 999);
  for (let attempt = 0; attempt < 50; attempt++) {
    const result = tryGenerateMap(radius, seed + attempt);
    if (result) { result.floorName = floorName; return result; }
  }
  const result = tryGenerateMap(radius, seed, true);
  result.floorName = floorName;
  return result;
}

function tryGenerateMap(radius, seed, forceClear = false) {
  const rng = makeRng(seed);
  const tiles = new Map();
  const allCoords = [];
  for (let q = -radius; q <= radius; q++)
    for (let r = -radius; r <= radius; r++)
      if (Math.abs(q + r) <= radius) allCoords.push({ q, r });

  const heightData = generateHeightMap(allCoords, radius, rng);
  for (const { q, r } of allCoords) {
    const h = heightData.get(hexKey(q, r));
    tiles.set(hexKey(q, r), { q, r, height: h, terrain: heightToTerrain(h, rng), event: EventType.EMPTY });
  }

  enforceMountainRatio(tiles, allCoords, rng);

  // Generate river with 2 bridges
  placeRiver(tiles, allCoords, radius, rng);

  const start = placeEdge(tiles, allCoords, -1, EventType.START, rng);
  const goal = placeEdge(tiles, allCoords, 1, EventType.GOAL, rng);
  if (!start || !goal) return null;

  if (forceClear) carvePath(tiles, start, goal);

  const reachable = getReachableSet(tiles, start.q, start.r);
  if (!reachable.has(hexKey(goal.q, goal.r))) return null;

  placeCastles(tiles, allCoords, rng, reachable);
  placeSprings(tiles, allCoords, rng, reachable);
  placeWarps(tiles, allCoords, rng, reachable);

  goal.event = EventType.BOSS;
  goal.isBossGoal = true;

  return { tiles, radius, start, goal };
}

function carvePath(tiles, start, goal) {
  let q = start.q, r = start.r;
  while (q !== goal.q || r !== goal.r) {
    let best = null, bestDist = Infinity;
    for (const n of getNeighbors(q, r)) {
      const tile = tiles.get(hexKey(n.q, n.r));
      if (!tile) continue;
      const d = hexDistance(n.q, n.r, goal.q, goal.r);
      if (d < bestDist) { bestDist = d; best = n; }
    }
    if (!best) break;
    const tile = tiles.get(hexKey(best.q, best.r));
    if (tile && !tile.terrain.walkable) { tile.terrain = Terrain.PLAINS; tile.height = 2; }
    q = best.q; r = best.r;
  }
}

function generateHeightMap(allCoords, radius, rng) {
  const hMap = new Map();
  const peakCount = Math.max(5, Math.floor(allCoords.length / 8));
  const peaks = [];
  for (let i = 0; i < peakCount; i++) {
    const coord = allCoords[Math.floor(rng() * allCoords.length)];
    peaks.push({ q: coord.q, r: coord.r, h: Math.floor(rng() * 5) + 1 });
  }
  for (const { q, r } of allCoords) {
    let totalH = 0, totalW = 0;
    for (const p of peaks) {
      const dist = hexDistance(q, r, p.q, p.r) + 1;
      const w = 1 / (dist * dist);
      totalH += p.h * w; totalW += w;
    }
    hMap.set(hexKey(q, r), Math.round(totalH / totalW) + Math.floor(rng() * 3) - 1);
  }
  for (let pass = 0; pass < 2; pass++) {
    const copy = new Map(hMap);
    for (const { q, r } of allCoords) {
      let sum = copy.get(hexKey(q, r)), count = 1;
      for (const n of getNeighbors(q, r)) {
        const nk = hexKey(n.q, n.r);
        if (copy.has(nk)) { sum += copy.get(nk); count++; }
      }
      hMap.set(hexKey(q, r), Math.round(sum / count));
    }
  }
  let minH = Infinity, maxH = -Infinity;
  for (const h of hMap.values()) { minH = Math.min(minH, h); maxH = Math.max(maxH, h); }
  const range = maxH - minH || 1;
  for (const [key, h] of hMap)
    hMap.set(key, Math.max(1, Math.min(5, Math.round(((h - minH) / range) * 4) + 1)));
  return hMap;
}

function heightToTerrain(h, rng) {
  if (h <= 1) return rng() > 0.35 ? Terrain.PLAINS : Terrain.FOREST;
  if (h === 2) return rng() > 0.5 ? Terrain.PLAINS : Terrain.FOREST;
  if (h === 3) return Terrain.HILLS;
  if (h === 4) return Terrain.HILLS;
  return Terrain.MOUNTAIN; // only h=5
}

// Enforce mountains = exactly 15% of total tiles.
// If too many: convert random excess to HILLS.
// If too few: convert random HILLS (highest height first) to MOUNTAIN.
function enforceMountainRatio(tiles, allCoords, rng) {
  const target = Math.floor(allCoords.length * 0.15);
  const mountains = allCoords.filter(c => tiles.get(hexKey(c.q, c.r)).terrain.id === 'mountain');

  if (mountains.length > target) {
    // Remove excess
    const shuffled = [...mountains].sort(() => rng() - 0.5);
    for (let i = target; i < shuffled.length; i++) {
      const tile = tiles.get(hexKey(shuffled[i].q, shuffled[i].r));
      tile.terrain = Terrain.HILLS;
      tile.height = Math.min(tile.height, 4);
    }
  } else if (mountains.length < target) {
    // Add more: pick from HILLS, prefer highest height
    const hills = allCoords
      .filter(c => tiles.get(hexKey(c.q, c.r)).terrain.id === 'hills')
      .sort((a, b) => tiles.get(hexKey(b.q, b.r)).height - tiles.get(hexKey(a.q, a.r)).height);
    const shuffledHills = hills.length > target ? hills : [...hills].sort(() => rng() - 0.5);
    let need = target - mountains.length;
    for (const c of shuffledHills) {
      if (need <= 0) break;
      const tile = tiles.get(hexKey(c.q, c.r));
      tile.terrain = Terrain.MOUNTAIN;
      tile.height = Math.max(tile.height, 5);
      need--;
    }
  }
}

function placeCastles(tiles, allCoords, rng, reachable) {
  let placed = 0;
  const inner = allCoords.filter(c => Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)) >= 2);
  const shuffled = [...inner].sort(() => rng() - 0.5);
  for (const c of shuffled) {
    if (placed >= 1) break;
    const key = hexKey(c.q, c.r);
    const tile = tiles.get(key);
    if (tile && tile.terrain.walkable && tile.event.id === 'empty' && reachable.has(key)) {
      tile.terrain = Terrain.CASTLE; tile.height = Math.max(3, tile.height);
      tile.event = EventType.SHOP; placed++;
    }
  }
}

function placeSprings(tiles, allCoords, rng, reachable) {
  const candidates = allCoords.filter(c => {
    const key = hexKey(c.q, c.r);
    const tile = tiles.get(key);
    return tile && tile.terrain.walkable && tile.event.id === 'empty' && reachable.has(key);
  });
  const shuffled = [...candidates].sort(() => rng() - 0.5);

  let first = null;
  for (const c of shuffled) {
    if (!first) {
      first = c;
      tiles.get(hexKey(c.q, c.r)).event = EventType.SPRING;
      continue;
    }
    // Second spring must be >= 4 hexes from first
    if (hexDistance(c.q, c.r, first.q, first.r) >= 4) {
      tiles.get(hexKey(c.q, c.r)).event = EventType.SPRING;
      break;
    }
  }
}

function placeWarps(tiles, allCoords, rng, reachable) {
  const candidates = allCoords.filter(c => {
    const key = hexKey(c.q, c.r);
    const tile = tiles.get(key);
    return tile && tile.terrain.walkable && tile.event.id === 'empty' && reachable.has(key);
  });
  const shuffled = [...candidates].sort(() => rng() - 0.5);

  const warps = [];
  for (const c of shuffled) {
    if (warps.length >= 2) break;
    // Warps should be at least 4 apart
    if (warps.length === 1 && hexDistance(c.q, c.r, warps[0].q, warps[0].r) < 4) continue;
    const tile = tiles.get(hexKey(c.q, c.r));
    tile.event = EventType.WARP;
    warps.push(c);
  }

  // Link warps and set visibility
  if (warps.length === 2) {
    const t1 = tiles.get(hexKey(warps[0].q, warps[0].r));
    const t2 = tiles.get(hexKey(warps[1].q, warps[1].r));
    t1.warpPairKey = hexKey(warps[1].q, warps[1].r);
    t2.warpPairKey = hexKey(warps[0].q, warps[0].r);
    t1.warpVisible = true;
    t2.warpVisible = false; // hidden until first warp is used
  }
}

// --- River generation ---
function placeRiver(tiles, allCoords, radius, rng) {
  // Pick a starting point near center
  const innerCoords = allCoords.filter(c =>
    Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)) <= radius - 1
  );
  if (innerCoords.length === 0) return;

  const startCoord = innerCoords[Math.floor(rng() * innerCoords.length)];

  // Pick a general direction (one of 6 hex directions) and its opposite
  const dirs = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  const dirIdx = Math.floor(rng() * 6);
  const mainDir = dirs[dirIdx];
  const oppDir = dirs[(dirIdx + 3) % 6];

  // Grow river in both directions from start, snaking
  const riverKeys = new Set();
  growRiverArm(tiles, startCoord, mainDir, dirs, radius, rng, riverKeys);
  growRiverArm(tiles, startCoord, oppDir, dirs, radius, rng, riverKeys);

  // Convert river tiles
  const riverTileList = [];
  for (const key of riverKeys) {
    const tile = tiles.get(key);
    if (tile) {
      tile.terrain = Terrain.RIVER;
      tile.height = 1;
      riverTileList.push(tile);
    }
  }

  // Place 2 bridges on river tiles, at least 4 apart
  placeBridges(tiles, riverTileList, rng);
}

function growRiverArm(tiles, start, mainDir, dirs, radius, rng, riverKeys) {
  let q = start.q, r = start.r;
  riverKeys.add(hexKey(q, r));

  for (let step = 0; step < radius * 2; step++) {
    // Choose next: 60% main direction, 20% veer left, 20% veer right
    const mainIdx = dirs.findIndex(d => d.q === mainDir.q && d.r === mainDir.r);
    const roll = rng();
    let chosenDir;
    if (roll < 0.6) {
      chosenDir = mainDir;
    } else if (roll < 0.8) {
      chosenDir = dirs[(mainIdx + 1) % 6];
    } else {
      chosenDir = dirs[(mainIdx + 5) % 6];
    }

    const nq = q + chosenDir.q;
    const nr = r + chosenDir.r;
    const nk = hexKey(nq, nr);

    // Check if still on map
    if (!tiles.has(nk)) break; // reached edge, done

    // Don't overwrite mountains
    const tile = tiles.get(nk);
    if (tile.terrain.id === 'mountain') {
      // Try main direction instead
      const mq = q + mainDir.q;
      const mr = r + mainDir.r;
      if (!tiles.has(hexKey(mq, mr))) break;
      q = mq; r = mr;
    } else {
      q = nq; r = nr;
    }
    riverKeys.add(hexKey(q, r));
  }
}

function placeBridges(tiles, riverTiles, rng) {
  if (riverTiles.length < 2) return;

  const shuffled = [...riverTiles].sort(() => rng() - 0.5);
  const bridges = [];

  for (const tile of shuffled) {
    if (bridges.length >= 2) break;

    // Bridge must have walkable neighbors on at least 2 sides
    const neighbors = getNeighbors(tile.q, tile.r);
    const walkableNeighbors = neighbors.filter(n => {
      const t = tiles.get(hexKey(n.q, n.r));
      return t && t.terrain.walkable;
    });
    if (walkableNeighbors.length < 2) continue;

    // Check distance from other bridges
    if (bridges.length === 1 && hexDistance(tile.q, tile.r, bridges[0].q, bridges[0].r) < 4) continue;

    tile.terrain = Terrain.BRIDGE;
    tile.height = 2;
    bridges.push(tile);
  }
}

function placeEdge(tiles, allCoords, dir, eventType, rng) {
  const sorted = [...allCoords]
    .filter(c => { const t = tiles.get(hexKey(c.q, c.r)); return t && t.terrain.walkable; })
    .sort((a, b) => (b.q - a.q) * dir);
  const edgeQ = sorted.length > 0 ? sorted[0].q : 0;
  const edgeTiles = sorted.filter(c => Math.abs(c.q - edgeQ) <= 1);
  const shuffled = edgeTiles.sort(() => rng() - 0.5);
  for (const c of shuffled) {
    const tile = tiles.get(hexKey(c.q, c.r));
    if (tile && tile.event.id === 'empty') {
      tile.event = eventType; tile.terrain = Terrain.PLAINS;
      tile.height = Math.max(2, tile.height); return tile;
    }
  }
  for (const c of sorted) {
    const tile = tiles.get(hexKey(c.q, c.r));
    if (tile) { tile.terrain = Terrain.PLAINS; tile.height = 2; tile.event = eventType; return tile; }
  }
  return null;
}

function makeRng(seed = Date.now()) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
