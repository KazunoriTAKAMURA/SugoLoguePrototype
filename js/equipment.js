// Equipment definitions and system (with AGI support)

export const EquipSlot = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
};

const WEAPONS = [
  // Tier 1
  { name: '木の棒',           atk: 1,  def: 0, maxHp: 0,  agi: 0,  tier: 1, price: 8 },
  { name: '木の剣',           atk: 2,  def: 0, maxHp: 0,  agi: 0,  tier: 1, price: 15 },
  { name: 'ナイフ',           atk: 2,  def: 0, maxHp: 0,  agi: 1,  tier: 1, price: 12 },
  { name: 'ブロンズソード',     atk: 3,  def: 0, maxHp: 0,  agi: 0,  tier: 1, price: 25 },
  { name: 'ハンドアクス',      atk: 4,  def: 0, maxHp: 0,  agi: -1, tier: 1, price: 28 },
  // Tier 2
  { name: '鉄の剣',           atk: 5,  def: 0, maxHp: 0,  agi: 0,  tier: 2, price: 45 },
  { name: 'スピードダガー',    atk: 3,  def: 0, maxHp: 0,  agi: 4,  tier: 2, price: 50 },
  { name: 'ロングソード',      atk: 6,  def: 0, maxHp: 0,  agi: 0,  tier: 2, price: 55 },
  { name: 'バトルアクス',      atk: 7,  def: 0, maxHp: 0,  agi: -1, tier: 2, price: 65 },
  { name: 'レイピア',          atk: 5,  def: 0, maxHp: 0,  agi: 3,  tier: 2, price: 60 },
  // Tier 3
  { name: '鋼の剣',           atk: 8,  def: 0, maxHp: 0,  agi: 0,  tier: 3, price: 90 },
  { name: 'ウォーハンマー',    atk: 10, def: 0, maxHp: 0,  agi: -2, tier: 3, price: 100 },
  { name: 'ミスリルブレイド',   atk: 9,  def: 1, maxHp: 0,  agi: 1,  tier: 3, price: 110 },
  { name: 'フレイムソード',    atk: 10, def: 0, maxHp: 0,  agi: 0,  tier: 3, price: 115 },
  { name: '疾風の刃',         atk: 7,  def: 0, maxHp: 0,  agi: 5,  tier: 3, price: 105 },
  // Tier 4
  { name: 'ルーンブレイド',    atk: 12, def: 0, maxHp: 5,  agi: 1,  tier: 4, price: 160 },
  { name: 'ドラゴンブレイド',   atk: 14, def: 0, maxHp: 0,  agi: 0,  tier: 4, price: 180 },
  { name: '魔剣ダークエッジ',  atk: 15, def: 0, maxHp: -5, agi: 2,  tier: 4, price: 170 },
  { name: '雷神の斧',         atk: 16, def: 0, maxHp: 0,  agi: -2, tier: 4, price: 190 },
  { name: 'エルフィンレイピア', atk: 11, def: 0, maxHp: 0,  agi: 6,  tier: 4, price: 175 },
  // Tier 5
  { name: '天空の聖剣',       atk: 18, def: 2, maxHp: 5,  agi: 3,  tier: 5, price: 300 },
  { name: '覇王の大剣',       atk: 22, def: 0, maxHp: 0,  agi: -3, tier: 5, price: 320 },
  { name: '神速のカタナ',     atk: 16, def: 0, maxHp: 0,  agi: 8,  tier: 5, price: 310 },
  { name: '混沌の魔剣',       atk: 20, def: 0, maxHp: -10, agi: 4, tier: 5, price: 280 },
  { name: '星辰の剣',         atk: 19, def: 3, maxHp: 10, agi: 2,  tier: 5, price: 350 },
];

const ARMORS = [
  // Tier 1
  { name: '布の服',           atk: 0, def: 1,  maxHp: 0,  agi: 1,  tier: 1, price: 8 },
  { name: '皮の鎧',           atk: 0, def: 2,  maxHp: 0,  agi: 1,  tier: 1, price: 15 },
  { name: '旅人の服',         atk: 0, def: 1,  maxHp: 5,  agi: 0,  tier: 1, price: 12 },
  { name: 'ブロンズアーマー',  atk: 0, def: 3,  maxHp: 0,  agi: 0,  tier: 1, price: 25 },
  { name: 'ハードレザー',      atk: 0, def: 2,  maxHp: 0,  agi: 2,  tier: 1, price: 22 },
  // Tier 2
  { name: 'チェインメイル',     atk: 0, def: 4,  maxHp: 0,  agi: 0,  tier: 2, price: 40 },
  { name: '鉄の鎧',           atk: 0, def: 5,  maxHp: 5,  agi: -1, tier: 2, price: 50 },
  { name: 'スケイルメイル',    atk: 0, def: 5,  maxHp: 0,  agi: 0,  tier: 2, price: 48 },
  { name: 'レンジャーコート',  atk: 0, def: 3,  maxHp: 0,  agi: 4,  tier: 2, price: 55 },
  { name: 'プレートアーマー',   atk: 0, def: 7,  maxHp: 5,  agi: -2, tier: 2, price: 65 },
  // Tier 3
  { name: 'ミスリルアーマー',   atk: 0, def: 9,  maxHp: 5,  agi: 1,  tier: 3, price: 100 },
  { name: 'バンデッドメイル',  atk: 0, def: 8,  maxHp: 10, agi: 0,  tier: 3, price: 95 },
  { name: '炎の鎧',           atk: 1, def: 8,  maxHp: 0,  agi: 0,  tier: 3, price: 105 },
  { name: 'シルフィードローブ', atk: 0, def: 6,  maxHp: 0,  agi: 5,  tier: 3, price: 98 },
  { name: 'ナイトアーマー',    atk: 0, def: 10, maxHp: 5,  agi: -1, tier: 3, price: 110 },
  // Tier 4
  { name: 'ドラゴンメイル',     atk: 2, def: 13, maxHp: 10, agi: 0,  tier: 4, price: 180 },
  { name: '魔法の鎧',         atk: 0, def: 11, maxHp: 15, agi: 1,  tier: 4, price: 170 },
  { name: '風神の衣',         atk: 0, def: 9,  maxHp: 0,  agi: 7,  tier: 4, price: 175 },
  { name: 'クリスタルメイル',  atk: 0, def: 14, maxHp: 10, agi: -1, tier: 4, price: 190 },
  { name: '暗黒の鎧',         atk: 3, def: 12, maxHp: -5, agi: 2,  tier: 4, price: 165 },
  // Tier 5
  { name: '伝説の聖鎧',       atk: 0, def: 18, maxHp: 20, agi: 2,  tier: 5, price: 320 },
  { name: '天帝の甲冑',       atk: 2, def: 20, maxHp: 15, agi: -2, tier: 5, price: 350 },
  { name: '星光のローブ',     atk: 0, def: 15, maxHp: 10, agi: 8,  tier: 5, price: 330 },
  { name: '不滅の鎧',         atk: 0, def: 16, maxHp: 30, agi: 0,  tier: 5, price: 340 },
  { name: '虚空の外套',       atk: 3, def: 17, maxHp: 5,  agi: 5,  tier: 5, price: 360 },
];

const ACCESSORIES = [
  // Tier 1
  { name: '力のお守り',       atk: 2, def: 0, maxHp: 0,  agi: 0,  tier: 1, price: 15 },
  { name: '守りの指輪',       atk: 0, def: 2, maxHp: 0,  agi: 0,  tier: 1, price: 15 },
  { name: '体力のペンダント',   atk: 0, def: 0, maxHp: 8,  agi: 0,  tier: 1, price: 18 },
  { name: '俊足のブーツ',     atk: 0, def: 0, maxHp: 0,  agi: 3,  tier: 1, price: 18 },
  { name: '旅人のバンダナ',   atk: 1, def: 1, maxHp: 0,  agi: 1,  tier: 1, price: 20 },
  // Tier 2
  { name: '戦士の腕輪',       atk: 3, def: 1, maxHp: 5,  agi: 0,  tier: 2, price: 45 },
  { name: '鉄壁の盾',         atk: 0, def: 4, maxHp: 5,  agi: -1, tier: 2, price: 50 },
  { name: '疾風のバングル',   atk: 1, def: 0, maxHp: 0,  agi: 5,  tier: 2, price: 48 },
  { name: '生命の首飾り',     atk: 0, def: 1, maxHp: 15, agi: 0,  tier: 2, price: 50 },
  { name: '魔石のブローチ',   atk: 2, def: 2, maxHp: 0,  agi: 1,  tier: 2, price: 52 },
  // Tier 3
  { name: '勇者のマント',      atk: 2, def: 3, maxHp: 10, agi: 2,  tier: 3, price: 90 },
  { name: '竜牙のネックレス',  atk: 5, def: 0, maxHp: 0,  agi: 1,  tier: 3, price: 85 },
  { name: '守護者のガントレット', atk: 0, def: 5, maxHp: 10, agi: 0, tier: 3, price: 95 },
  { name: '韋駄天の靴',       atk: 1, def: 0, maxHp: 0,  agi: 7,  tier: 3, price: 88 },
  { name: '賢者のサークレット', atk: 3, def: 2, maxHp: 5,  agi: 2,  tier: 3, price: 92 },
  // Tier 4
  { name: '竜の紋章',         atk: 5, def: 5, maxHp: 15, agi: 3,  tier: 4, price: 170 },
  { name: '闘神のベルト',     atk: 7, def: 0, maxHp: 5,  agi: 2,  tier: 4, price: 165 },
  { name: '不動の大盾',       atk: 0, def: 8, maxHp: 20, agi: -2, tier: 4, price: 175 },
  { name: '光速のブーツ',     atk: 2, def: 0, maxHp: 0,  agi: 10, tier: 4, price: 180 },
  { name: '生命の宝珠',       atk: 0, def: 3, maxHp: 25, agi: 1,  tier: 4, price: 170 },
  // Tier 5
  { name: '神々の指輪',       atk: 6, def: 6, maxHp: 20, agi: 5,  tier: 5, price: 350 },
  { name: '覇王の腕輪',       atk: 10, def: 2, maxHp: 10, agi: 3, tier: 5, price: 340 },
  { name: '永遠の護符',       atk: 0, def: 8, maxHp: 35, agi: 2,  tier: 5, price: 330 },
  { name: '天翔の羽衣',       atk: 3, def: 3, maxHp: 5,  agi: 12, tier: 5, price: 360 },
  { name: '混沌の宝玉',       atk: 8, def: 5, maxHp: -10, agi: 8, tier: 5, price: 300 },
];

export function getEquipmentPool(slot) {
  switch (slot) {
    case EquipSlot.WEAPON: return WEAPONS;
    case EquipSlot.ARMOR: return ARMORS;
    case EquipSlot.ACCESSORY: return ACCESSORIES;
  }
  return [];
}

export function getShopItems(floor) {
  const maxTier = Math.min(4, Math.ceil(floor / 2) + 1); // Tier5 is drop-only
  // Min tier rises with floor: F1-3→1, F4-6→2, F7-9→3, F10→3
  const minTier = floor <= 3 ? 1 : floor <= 6 ? 2 : 3;
  const items = [];
  items.push(...pickForShop(WEAPONS, minTier, maxTier, 2));
  items.push(...pickForShop(ARMORS, minTier, maxTier, 2));
  items.push(...pickForShop(ACCESSORIES, minTier, maxTier, 1));

  return items.map(item => ({
    ...item,
    slot: WEAPONS.includes(item) ? EquipSlot.WEAPON
        : ARMORS.includes(item) ? EquipSlot.ARMOR
        : EquipSlot.ACCESSORY,
  }));
}

function pickForShop(pool, minTier, maxTier, count) {
  const eligible = pool.filter(e => e.tier >= minTier && e.tier <= maxTier);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getEnemyDrop(floor, forceDrop = false, isBoss = false) {
  if (!forceDrop && Math.random() > 0.25) return null;
  // Drop tier range per floor. Boss uses one range higher.
  const effFloor = isBoss ? Math.min(floor + 3, 10) : floor;
  const minTier = effFloor <= 3 ? 1 : effFloor <= 5 ? 2 : effFloor <= 8 ? 3 : 4;
  const maxTier = effFloor <= 3 ? 2 : effFloor <= 5 ? 3 : effFloor <= 8 ? 4 : 5;
  const allPools = [
    { pool: WEAPONS, slot: EquipSlot.WEAPON },
    { pool: ARMORS, slot: EquipSlot.ARMOR },
    { pool: ACCESSORIES, slot: EquipSlot.ACCESSORY },
  ];
  const chosen = allPools[Math.floor(Math.random() * allPools.length)];
  const eligible = chosen.pool.filter(e => e.tier >= minTier && e.tier <= maxTier);
  if (eligible.length === 0) return null;
  const item = eligible[Math.floor(Math.random() * eligible.length)];
  return { ...item, slot: chosen.slot };
}

export function calcEquipStats(equipped) {
  let atk = 0, def = 0, maxHp = 0, agi = 0;
  for (const slot of Object.values(EquipSlot)) {
    const item = equipped[slot];
    if (item) {
      atk += item.atk || 0;
      def += item.def || 0;
      maxHp += item.maxHp || 0;
      agi += item.agi || 0;
    }
  }
  return { atk, def, maxHp, agi };
}

export function slotLabel(slot) {
  switch (slot) {
    case EquipSlot.WEAPON: return '武器';
    case EquipSlot.ARMOR: return '防具';
    case EquipSlot.ACCESSORY: return '装飾';
  }
  return '';
}

export function formatEquipStats(item) {
  const parts = [];
  if (item.atk) parts.push(`ATK+${item.atk}`);
  if (item.def) parts.push(`DEF+${item.def}`);
  if (item.maxHp) parts.push(`HP+${item.maxHp}`);
  if (item.agi > 0) parts.push(`AGI+${item.agi}`);
  if (item.agi < 0) parts.push(`AGI${item.agi}`);
  return parts.join(' ');
}

export function formatEquipDiff(equipped, newItem) {
  const current = equipped[newItem.slot];
  const cAtk = current ? (current.atk || 0) : 0;
  const cDef = current ? (current.def || 0) : 0;
  const cHp  = current ? (current.maxHp || 0) : 0;
  const cAgi = current ? (current.agi || 0) : 0;

  const dAtk = (newItem.atk || 0) - cAtk;
  const dDef = (newItem.def || 0) - cDef;
  const dHp  = (newItem.maxHp || 0) - cHp;
  const dAgi = (newItem.agi || 0) - cAgi;

  const parts = [];
  if (dAtk !== 0) parts.push(`ATK${dAtk > 0 ? '+' : ''}${dAtk}`);
  if (dDef !== 0) parts.push(`DEF${dDef > 0 ? '+' : ''}${dDef}`);
  if (dHp !== 0)  parts.push(`HP${dHp > 0 ? '+' : ''}${dHp}`);
  if (dAgi !== 0) parts.push(`AGI${dAgi > 0 ? '+' : ''}${dAgi}`);

  if (parts.length === 0) return '変化なし';
  return parts.join(' ');
}
