// נתוני המשחק: יחידות, אויבים, שלבים, פריטים

export type UnitId = 'sword' | 'archer' | 'spear' | 'mage' | 'healer' | 'samurai' | 'giant';
export type EnemyId = 'imp' | 'skel' | 'darcher' | 'brute' | 'impking' | 'spirit' | 'icegiant' | 'lord';
export type Role = 'melee' | 'ranged' | 'mage' | 'healer' | 'boss' | 'hero';

export interface FighterDef {
  name: string;
  role: Role;
  hp: number;
  atk: number;
  def: number;
  range: number;
  speed: number;
  cd: number;
  big?: boolean;
  splash?: number;
  knock?: number;
  bonusBig?: number;
}

export interface UnitDef extends FighterDef {
  id: UnitId;
  unlock: number;
  /** מחיר גיוס */
  cost: number;
  /** בסיס מחיר שדרוג */
  up: number;
}

export const UNIT_IDS: UnitId[] = ['sword', 'archer', 'spear', 'mage', 'healer', 'samurai', 'giant'];

export const UNITS: Record<UnitId, UnitDef> = {
  sword: { id: 'sword', name: 'חרבן', role: 'melee', unlock: 1, cost: 12, up: 30, hp: 130, atk: 14, def: 5, range: 56, speed: 72, cd: 1.0 },
  archer: { id: 'archer', name: 'קשת', role: 'ranged', unlock: 1, cost: 14, up: 35, hp: 70, atk: 13.8, def: 1, range: 330, speed: 66, cd: 1.3 },
  spear: { id: 'spear', name: 'נושא חנית', role: 'melee', unlock: 3, cost: 18, up: 50, hp: 115, atk: 14, def: 4, range: 98, speed: 68, cd: 1.1, bonusBig: 1.9 },
  mage: { id: 'mage', name: 'קוסם', role: 'mage', unlock: 6, cost: 28, up: 90, hp: 65, atk: 19.55, def: 1, range: 300, speed: 60, cd: 1.9, splash: 75 },
  healer: { id: 'healer', name: 'מרפאה', role: 'healer', unlock: 9, cost: 34, up: 110, hp: 80, atk: 28, def: 1, range: 250, speed: 64, cd: 1.5 },
  samurai: { id: 'samurai', name: 'סמוראי', role: 'melee', unlock: 14, cost: 45, up: 160, hp: 170, atk: 30, def: 5, range: 60, speed: 118, cd: 0.7 },
  giant: { id: 'giant', name: 'ענק', role: 'melee', unlock: 20, cost: 80, up: 300, hp: 700, atk: 40, def: 9, range: 80, speed: 44, cd: 1.8, big: true, knock: 42 },
};

/** כמה מקומות בצבא תופסת כל יחידה */
export const UNIT_SLOTS: Record<UnitId, number> = { sword: 1, archer: 1, spear: 1, mage: 1, healer: 1, samurai: 2, giant: 3 };
/** סדר המערך מהחזית לאחור (וגם סדר העדיפות לכניסה לקרב) */
export const FORMATION_ORDER: UnitId[] = ['giant', 'spear', 'sword', 'samurai', 'archer', 'mage', 'healer'];
/** מרפאה מרפאת עד שני חיילים בכל פעם */
export const HEAL_TARGETS = 2;

export function capacityFor(heroLvl: number): number {
  return Math.min(110, 10 + 2 * heroLvl);
}

export const MAX_UNIT_LEVEL = 30;
export const MAX_HERO_LEVEL = 50;
export const HERO_NAME = 'סר ארתור';

export const ENEMIES: Record<EnemyId, FighterDef> = {
  imp: { name: 'שדון', role: 'melee', hp: 42, atk: 7, def: 0, range: 46, speed: 108, cd: 0.8 },
  skel: { name: 'שלד לוחם', role: 'melee', hp: 92, atk: 11, def: 3, range: 54, speed: 66, cd: 1.1 },
  darcher: { name: 'קשת שדים', role: 'ranged', hp: 54, atk: 10, def: 0, range: 310, speed: 60, cd: 1.6 },
  brute: { name: 'שד מקורנן', role: 'melee', hp: 400, atk: 27, def: 6, range: 72, speed: 46, cd: 1.7, big: true, knock: 30 },
  impking: { name: 'מלך השדונים', role: 'boss', hp: 800, atk: 17, def: 6, range: 105, speed: 40, cd: 1.7, big: true },
  spirit: { name: 'רוח היער', role: 'boss', hp: 1050, atk: 20, def: 7, range: 115, speed: 38, cd: 1.8, big: true },
  icegiant: { name: 'ענק הקרח', role: 'boss', hp: 800, atk: 15, def: 9, range: 125, speed: 34, cd: 2.0, big: true },
  lord: { name: 'שר השדים', role: 'boss', hp: 780, atk: 15, def: 10, range: 130, speed: 36, cd: 1.8, big: true },
};

export const BOSS_OF_REGION: EnemyId[] = ['impking', 'spirit', 'icegiant', 'lord'];
export const BOSS_SPECIAL: Record<string, 'summon' | 'blast' | 'both'> = {
  impking: 'summon',
  spirit: 'blast',
  icegiant: 'blast',
  lord: 'both',
};

export const REGIONS = ['ממלכת האחו', 'יער האופל', 'פסגות הקרח', 'ארץ השדים'];
export const LEVELS_PER_REGION = 12;
export const LEVEL_COUNT = 48;

const LEVEL_NAMES: string[][] = [
  ['שער הכפר', 'שדה החיטה', 'גשר האבן', 'טחנת הרוח', 'גבעת הפרחים', 'דרך המלך', 'מעיין השקט', 'חורשת האלונים', 'מגדל השמירה', 'שדות הקרב', 'חומות הטירה', 'כס מלך השדונים'],
  ['סף היער', 'שביל הצללים', 'ביצת הערפל', 'עצי הלחישה', 'מערת העטלפים', 'קרחת הירח', 'גשר החבלים', 'חורבות עתיקות', 'שורשי הענק', 'אגם האופל', 'לב היער', 'מקדש רוח היער'],
  ['מעבר ההרים', 'כפר השלג', 'נהר הקפוא', 'מערת הבדולח', 'צוק הרוחות', 'גשר הקרח', 'עמק הסופה', 'מכרה נטוש', 'פסגת הנשר', 'שדה הקרחונים', 'שער הכפור', 'כס ענק הקרח'],
  ['שער הגיהינום', 'שדות האפר', 'נהר הלבה', 'גשר העצמות', 'מבצר הגחלים', 'בקעת הגופרית', 'מגדל הצעקות', 'כבשן השדים', 'חומת הלהבות', 'ארמון האופל', 'אולם הכתר', 'כס שר השדים'],
];

export interface WaveGroup {
  kind: EnemyId;
  count: number;
}
export interface LevelDef {
  n: number; // 1..48
  region: number; // 0..3
  name: string;
  boss: EnemyId | null;
  waves: WaveGroup[][];
  mult: number; // מכפיל חיים
  atkMult: number;
}

/** מכפיל עוצמת האויבים לפי מספר השלב */
export function enemyHpMult(n: number): number {
  // אחרי שלב 24 הקושי עולה לאט יותר
  return 2.6 + 0.54 * Math.min(n - 1, 23) + 0.28 * Math.max(0, n - 24);
}
export function enemyAtkMult(n: number): number {
  return 2.6 + 0.072 * Math.min(n - 1, 23) + 0.034 * Math.max(0, n - 24);
}

export function levelDef(n: number): LevelDef {
  const region = Math.floor((n - 1) / LEVELS_PER_REGION);
  const idx = (n - 1) % LEVELS_PER_REGION;
  const isBoss = idx === LEVELS_PER_REGION - 1;
  // כל שלב רביעי קשה מעט יותר
  const spike = idx % 4 === 3 && !isBoss ? (n > 24 ? 1.07 : 1.15) : 1;
  const total = Math.round((10 + n * 0.95) * spike);
  const waveCount = n <= 2 ? 1 : n <= 6 ? 2 : 3;
  const waves: WaveGroup[][] = [];
  for (let w = 0; w < waveCount; w++) {
    const share = waveCount === 1 ? 1 : waveCount === 2 ? [0.42, 0.58][w] : [0.26, 0.34, 0.4][w];
    let cnt = Math.max(3, Math.round(total * share));
    const g: WaveGroup[] = [];
    const last = w === waveCount - 1;
    if (isBoss && last) cnt = Math.round(cnt * 0.5);
    // תמהיל לפי התקדמות
    let brutes = n >= 9 ? Math.floor((cnt * Math.min(0.2, 0.06 + n * 0.003)) * (last ? 1.3 : 0.7)) : 0;
    if (n >= 9 && last && brutes === 0) brutes = 1;
    let archers = n >= 5 ? Math.round(cnt * Math.min(0.3, 0.14 + n * 0.004)) : 0;
    const rest = Math.max(1, cnt - brutes * 2 - archers);
    const skel = n >= 2 ? Math.round(rest * Math.min(0.62, 0.25 + n * 0.012)) : 0;
    const imps = Math.max(0, rest - skel);
    if (imps > 0) g.push({ kind: 'imp', count: imps });
    if (skel > 0) g.push({ kind: 'skel', count: skel });
    if (archers > 0) g.push({ kind: 'darcher', count: archers });
    if (brutes > 0) g.push({ kind: 'brute', count: brutes });
    if (isBoss && last) g.push({ kind: BOSS_OF_REGION[region], count: 1 });
    waves.push(g);
  }
  return {
    n,
    region,
    name: LEVEL_NAMES[region][idx],
    boss: isBoss ? BOSS_OF_REGION[region] : null,
    waves,
    // שלושת השלבים הראשונים קלים יותר - היכרות עם המשחק
    mult: enemyHpMult(n) * (n <= 3 ? 0.62 + n * 0.1 : 1),
    atkMult: enemyAtkMult(n) * (n <= 3 ? 0.62 + n * 0.1 : 1),
  };
}

// ---------- פריטים ----------
export type Slot = 'helmet' | 'armor' | 'weapon' | 'shield' | 'gloves' | 'ring';
export const SLOTS: Slot[] = ['helmet', 'armor', 'weapon', 'shield', 'gloves', 'ring'];
export const SLOT_NAMES: Record<Slot, string> = {
  helmet: 'קסדה',
  armor: 'שריון',
  weapon: 'נשק',
  shield: 'מגן',
  gloves: 'כפפות',
  ring: 'טבעת',
};
export const SLOT_ITEM_BASE: Record<Slot, string> = {
  helmet: 'קסדת',
  armor: 'שריון',
  weapon: 'חרב',
  shield: 'מגן',
  gloves: 'כפפות',
  ring: 'טבעת',
};
export const RARITY_NAMES = ['רגיל', 'נדיר', 'מיוחד', 'אפי', 'אגדי'];
export const RARITY_SUFFIX = ['הטירון', 'השומר', 'האביר', 'הדרקון', 'המלכים'];
export const RARITY_COLORS = [0x9aa0a6, 0x4caf50, 0x2f8fe0, 0x9b4fd6, 0xf2b01e];
export const RARITY_MULT = [1, 1.35, 1.8, 2.4, 3.2];

export interface Item {
  id: number;
  slot: Slot;
  rarity: number; // 0..4
  lvl: number; // רמת השלב שממנו נפל
  atk: number;
  def: number;
  hp: number;
  spd: number;
}

export function itemName(it: Item): string {
  return `${SLOT_ITEM_BASE[it.slot]} ${RARITY_SUFFIX[it.rarity]}`;
}

export const SKILL_NAMES = ['סערת חרבות', 'קריאת קרב', 'ריפוי'];
export const SKILL_DESC = ['סיבוב חרב הפוגע בכל האויבים מסביב', 'הצבא מקבל 30% נזק נוסף למשך 6 שניות', 'מרפא את הגיבור ואת החיילים הקרובים'];
export const SKILL_CD = [8, 18, 15];
export const MAX_SKILL_LEVEL = 10;
