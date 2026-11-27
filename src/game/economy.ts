// כלכלה, התקדמות ופרסים - לוגיקה טהורה (נבדקת בבדיקות אוטומטיות)
import {
  type Item,
  type Slot,
  type UnitId,
  SLOTS,
  UNITS,
  UNIT_IDS,
  MAX_UNIT_LEVEL,
  MAX_HERO_LEVEL,
  MAX_SKILL_LEVEL,
  RARITY_MULT,
  LEVEL_COUNT,
  LEVELS_PER_REGION,
  levelDef,
  ENEMIES,
  UNIT_SLOTS,
  capacityFor,
} from './data';
import { type Save, armySlots } from './save';

export { armySlots };

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** מכפיל הפרסים - המשחק מעט קל יותר ממשחק חינמי טיפוסי */
export const REWARD_MULT = 1.5;
/** חלק מהחיילים שנפלו חוזרים למחנה אחרי הקרב */
export const RETURN_ON_WIN = 0.5;
export const RETURN_ON_LOSS = 0.3;
export const REVIVE_COST = 20;
export const POTION_COST = 5;
export const BASE_POTIONS = 3;
export const MAX_EXTRA_POTIONS = 3;

// ---------- גיבור ----------
export function xpToNext(lvl: number): number {
  return Math.round(50 + 24 * lvl + 0.2 * lvl * lvl);
}

export function capacity(heroLvl: number): number {
  return capacityFor(heroLvl);
}

export function freeSlots(s: Save): number {
  return capacity(s.heroLvl) - armySlots(s);
}

export function armyCount(s: Save): number {
  let n = 0;
  for (const id of UNIT_IDS) n += s.units[id].count;
  return n;
}

export interface HeroStats {
  atk: number;
  def: number;
  hp: number;
  spd: number;
}

export function heroBase(lvl: number): HeroStats {
  return {
    atk: Math.round(22 + 3 * (lvl - 1)),
    def: Math.round(5 + 0.6 * (lvl - 1)),
    hp: Math.round(320 + 24 * (lvl - 1)),
    spd: 10,
  };
}

export function heroStats(s: Save, equip: Record<Slot, Item | null> = s.equip): HeroStats {
  const b = heroBase(s.heroLvl);
  for (const sl of SLOTS) {
    const it = equip[sl];
    if (it) {
      b.atk += it.atk;
      b.def += it.def;
      b.hp += it.hp;
      b.spd += it.spd;
    }
  }
  return b;
}

/** מוסיף ניסיון ומחזיר כמה רמות עלו */
export function addXp(s: Save, xp: number): number {
  let ups = 0;
  if (s.heroLvl >= MAX_HERO_LEVEL) {
    s.heroXp = 0;
    return 0;
  }
  s.heroXp += xp;
  while (s.heroLvl < MAX_HERO_LEVEL && s.heroXp >= xpToNext(s.heroLvl)) {
    s.heroXp -= xpToNext(s.heroLvl);
    s.heroLvl++;
    ups++;
  }
  if (s.heroLvl >= MAX_HERO_LEVEL) s.heroXp = 0;
  return ups;
}

// ---------- יחידות ----------
export function unitMult(lvl: number): number {
  return 1 + 0.08 * (lvl - 1);
}

export function unitStats(id: UnitId, lvl: number) {
  const d = UNITS[id];
  const m = unitMult(lvl);
  return { hp: Math.round(d.hp * m), atk: Math.round(d.atk * m), def: Math.round(d.def * m) };
}

export function recruitCost(id: UnitId, lvl: number): number {
  return Math.round(UNITS[id].cost * (1 + 0.04 * (lvl - 1)));
}

export function upgradeCost(id: UnitId, lvl: number): { gold: number; gems: number } {
  const next = lvl + 1;
  const gold = Math.round(UNITS[id].up * 1.5 * Math.pow(lvl, 1.12));
  const gems = next % 5 === 0 ? 5 + 5 * (next / 5) : 0;
  return { gold, gems };
}

export function isUnlocked(s: Save, id: UnitId): boolean {
  return s.heroLvl >= UNITS[id].unlock;
}

export function canRecruit(s: Save, id: UnitId): boolean {
  return isUnlocked(s, id) && freeSlots(s) >= UNIT_SLOTS[id] && s.gold >= recruitCost(id, s.units[id].lvl);
}

export function recruit(s: Save, id: UnitId): boolean {
  if (!canRecruit(s, id)) return false;
  s.gold -= recruitCost(id, s.units[id].lvl);
  s.units[id].count++;
  return true;
}

/** מעביר חייל אחד מהצבא למילואים */
export function toReserve(s: Save, id: UnitId): boolean {
  if (s.units[id].count <= 0) return false;
  s.units[id].count--;
  s.reserve[id]++;
  return true;
}

/** מחזיר חייל אחד מהמילואים לצבא, אם יש מקום */
export function fromReserve(s: Save, id: UnitId): boolean {
  if (s.reserve[id] <= 0 || freeSlots(s) < UNIT_SLOTS[id]) return false;
  s.reserve[id]--;
  s.units[id].count++;
  return true;
}

export function canUpgrade(s: Save, id: UnitId): boolean {
  const u = s.units[id];
  if (!isUnlocked(s, id) || u.lvl >= MAX_UNIT_LEVEL) return false;
  const c = upgradeCost(id, u.lvl);
  return s.gold >= c.gold && s.gems >= c.gems;
}

export function upgradeUnit(s: Save, id: UnitId): boolean {
  if (!canUpgrade(s, id)) return false;
  const c = upgradeCost(id, s.units[id].lvl);
  s.gold -= c.gold;
  s.gems -= c.gems;
  s.units[id].lvl++;
  return true;
}

// ---------- כישורים ----------
export function skillCost(lvl: number): number {
  return Math.round(180 * Math.pow(lvl, 1.55));
}
export function skillPower(lvl: number): number {
  return 1 + 0.12 * (lvl - 1);
}
export function upgradeSkill(s: Save, i: number): boolean {
  const lvl = s.skills[i];
  if (lvl >= MAX_SKILL_LEVEL || s.gold < skillCost(lvl)) return false;
  s.gold -= skillCost(lvl);
  s.skills[i]++;
  return true;
}

// ---------- עוצמה ----------
export function statPower(atk: number, def: number, hp: number): number {
  return atk * 2 + def * 3 + hp / 4;
}

export function totalPower(s: Save): number {
  const h = heroStats(s);
  let p = statPower(h.atk, h.def, h.hp) * 1.5;
  for (const id of UNIT_IDS) {
    const u = s.units[id];
    if (u.count <= 0) continue;
    const st = unitStats(id, u.lvl);
    p += statPower(st.atk, st.def, st.hp) * u.count;
  }
  return Math.round(p);
}

export function recommendedPower(n: number): number {
  const lv = levelDef(n);
  let p = 0;
  for (const w of lv.waves)
    for (const g of w) {
      const e = ENEMIES[g.kind];
      p += statPower(e.atk * lv.atkMult, e.def, e.hp * lv.mult) * g.count;
    }
  return Math.round((p * 0.34) / 10) * 10;
}

// ---------- פריטים ----------
export function itemPower(it: Item): number {
  return Math.round(it.atk * 2 + it.def * 3 + it.hp / 4 + it.spd * 8);
}

export function sellValue(it: Item): number {
  return Math.round(12 + itemPower(it) * 0.7);
}

export function makeItem(id: number, slot: Slot, rarity: number, lvl: number): Item {
  const b = (6 + lvl * 1.5) * RARITY_MULT[rarity];
  const it: Item = { id, slot, rarity, lvl, atk: 0, def: 0, hp: 0, spd: 0 };
  switch (slot) {
    case 'weapon':
      it.atk = Math.round(b * 0.75);
      break;
    case 'helmet':
      it.def = Math.round(b * 0.35);
      it.hp = Math.round(b * 1.6);
      break;
    case 'armor':
      it.hp = Math.round(b * 3.2);
      it.def = Math.round(b * 0.25);
      break;
    case 'shield':
      it.def = Math.round(b * 0.7);
      it.hp = Math.round(b * 0.8);
      break;
    case 'gloves':
      it.atk = Math.round(b * 0.35);
      it.spd = 1 + Math.floor(rarity / 2);
      break;
    case 'ring':
      it.atk = Math.round(b * 0.25);
      it.hp = Math.round(b * 1.2);
      it.spd = rarity >= 2 ? 1 : 0;
      break;
  }
  return it;
}

export function isBossLevel(n: number): boolean {
  return n % LEVELS_PER_REGION === 0;
}

export function rollRarity(n: number, minRarity: number, rng: Rng): number {
  const region = Math.floor((n - 1) / LEVELS_PER_REGION);
  const w = [56 - region * 9, 27, 11 + region * 4, 5 + region * 3, 1 + region * 2];
  let total = 0;
  for (let i = minRarity; i < 5; i++) total += Math.max(0, w[i]);
  let r = rng() * total;
  for (let i = minRarity; i < 5; i++) {
    r -= Math.max(0, w[i]);
    if (r < 0) return i;
  }
  return 4;
}

export function dropChance(n: number, stars: number): number {
  if (isBossLevel(n)) return 1;
  return stars >= 3 ? 0.38 : 0.24;
}

export function rollItem(s: Save, n: number, stars: number, rng: Rng): Item | null {
  if (rng() >= dropChance(n, stars)) return null;
  const minR = isBossLevel(n) ? 2 : 0;
  const rarity = rollRarity(n, minR, rng);
  const slot = SLOTS[Math.floor(rng() * SLOTS.length) % SLOTS.length];
  return makeItem(s.nextItemId++, slot, rarity, n);
}

export function equipItem(s: Save, itemId: number): boolean {
  const idx = s.inv.findIndex((i) => i.id === itemId);
  if (idx < 0) return false;
  const it = s.inv[idx];
  const prev = s.equip[it.slot];
  s.inv.splice(idx, 1);
  if (prev) s.inv.push(prev);
  s.equip[it.slot] = it;
  return true;
}

export function unequipItem(s: Save, slot: Slot): boolean {
  const it = s.equip[slot];
  if (!it) return false;
  s.equip[slot] = null;
  s.inv.push(it);
  return true;
}

export function sellItem(s: Save, itemId: number): number {
  const idx = s.inv.findIndex((i) => i.id === itemId);
  if (idx < 0) return 0;
  const v = sellValue(s.inv[idx]);
  s.inv.splice(idx, 1);
  s.gold += v;
  track(s, 'goldEarned', v);
  track(s, 'itemsSold', 1);
  return v;
}

// ---------- קרב ----------
export function calcStars(win: boolean, heroHpPct: number, lostPct: number): number {
  if (!win) return 0;
  if (heroHpPct > 0.5 && lostPct <= 0.25) return 3;
  if (heroHpPct > 0.5) return 2;
  return 1;
}

export function isLevelUnlocked(s: Save, n: number): boolean {
  return n === 1 || (n <= LEVEL_COUNT && s.stars[n - 2] > 0);
}

export function currentLevel(s: Save): number {
  for (let n = 1; n <= LEVEL_COUNT; n++) if (s.stars[n - 1] === 0) return n;
  return LEVEL_COUNT;
}

export interface Rewards {
  gold: number;
  gems: number;
  xp: number;
}

export function levelRewards(n: number, stars: number, prevStars: number): Rewards {
  const boss = isBossLevel(n);
  let gold = (40 + 20 * n) * REWARD_MULT * (boss ? 2 : 1) * (1 + 0.1 * (stars - 1));
  let xp = (26 + 9 * n) * REWARD_MULT * (boss ? 1.6 : 1);
  let gems = 0;
  if (prevStars === 0) gems += boss ? 10 : 1;
  gems += Math.max(0, stars - prevStars);
  if (prevStars >= 3) {
    gold *= 0.7;
    xp *= 0.7;
  }
  return { gold: Math.round(gold), gems, xp: Math.round(xp) };
}

export interface BattleOutcome {
  win: boolean;
  heroHpPct: number;
  /** כמה חיילים מכל סוג נכנסו לקרב */
  sent: Partial<Record<UnitId, number>>;
  /** כמה נפלו */
  lost: Partial<Record<UnitId, number>>;
  kills: number;
  skillsUsed: number;
  potionsUsed: number;
}

export interface BattleSummary {
  win: boolean;
  stars: number;
  rewards: Rewards;
  item: Item | null;
  levelUps: number;
  returned: number;
  fallen: number;
  firstClear: boolean;
}

export function applyBattle(s: Save, n: number, o: BattleOutcome, rng: Rng = Math.random): BattleSummary {
  let sent = 0;
  let fallen = 0;
  let returned = 0;
  for (const id of UNIT_IDS) {
    const lost = Math.min(o.lost[id] ?? 0, s.units[id].count);
    sent += o.sent[id] ?? 0;
    fallen += lost;
    const back = o.win ? Math.ceil(lost * RETURN_ON_WIN) : Math.floor(lost * RETURN_ON_LOSS);
    returned += back;
    s.units[id].count -= lost - back;
  }
  track(s, 'kills', o.kills);
  track(s, 'skills', o.skillsUsed);
  track(s, 'potions', o.potionsUsed);
  track(s, 'battles', 1);
  const lostPct = sent > 0 ? fallen / sent : 0;
  const stars = calcStars(o.win, o.heroHpPct, lostPct);
  if (!o.win) {
    return { win: false, stars: 0, rewards: { gold: 0, gems: 0, xp: 0 }, item: null, levelUps: 0, returned, fallen, firstClear: false };
  }
  const prev = s.stars[n - 1];
  const rewards = levelRewards(n, stars, prev);
  s.stars[n - 1] = Math.max(prev, stars);
  s.gold += rewards.gold;
  s.gems += rewards.gems;
  const levelUps = addXp(s, rewards.xp);
  const item = rollItem(s, n, stars, rng);
  if (item) s.inv.push(item);
  track(s, 'wins', 1);
  track(s, 'goldEarned', rewards.gold);
  if (stars >= 3) track(s, 'stars3', 1);
  return { win: true, stars, rewards, item, levelUps, returned, fallen, firstClear: prev === 0 };
}

// ---------- משימות ----------
export function track(s: Save, stat: string, amount: number): void {
  if (!amount) return;
  s.stats[stat] = (s.stats[stat] ?? 0) + amount;
  s.daily.counters[stat] = (s.daily.counters[stat] ?? 0) + amount;
}

export interface DailyDef {
  id: string;
  text: string;
  stat: string;
  target: number;
  gold: number;
  gems: number;
  icon: string;
}

export const DAILY_POOL: DailyDef[] = [
  { id: 'wins3', text: 'השלם 3 קרבות', stat: 'battles', target: 3, gold: 220, gems: 5, icon: 'ic_swords' },
  { id: 'kills50', text: 'הבס 50 שדים', stat: 'kills', target: 50, gold: 200, gems: 5, icon: 'ic_skull' },
  { id: 'recruit10', text: 'גייס 10 חיילים', stat: 'recruits', target: 10, gold: 180, gems: 4, icon: 'ic_helmet' },
  { id: 'upgrade2', text: 'שדרג יחידות פעמיים', stat: 'upgrades', target: 2, gold: 240, gems: 5, icon: 'ic_up' },
  { id: 'star3', text: 'נצח קרב ב-3 כוכבים', stat: 'stars3', target: 1, gold: 200, gems: 6, icon: 'ic_star' },
  { id: 'skills8', text: 'השתמש ב-8 כישורים', stat: 'skills', target: 8, gold: 160, gems: 4, icon: 'ic_skill0' },
  { id: 'gold600', text: 'אסוף 600 זהב', stat: 'goldEarned', target: 600, gold: 150, gems: 5, icon: 'ic_chest' },
  { id: 'kills120', text: 'הבס 120 שדים', stat: 'kills', target: 120, gold: 320, gems: 8, icon: 'ic_skull' },
  { id: 'wins5', text: 'נצח ב-5 קרבות', stat: 'wins', target: 5, gold: 350, gems: 8, icon: 'ic_swords' },
  { id: 'potion2', text: 'שתה 2 שיקויים', stat: 'potions', target: 2, gold: 140, gems: 4, icon: 'ic_potion' },
];

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** מאפס את המשימות היומיות בחצות (זמן מקומי). מחזיר true אם התחלף יום */
export function ensureDaily(s: Save, now: Date = new Date()): boolean {
  const key = dayKey(now);
  if (s.daily.day === key && s.daily.quests.length === 5) return false;
  const rng = mulberry32(hashStr(key));
  const pool = [...DAILY_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked: DailyDef[] = [];
  for (const q of pool) {
    if (picked.length >= 5) break;
    if (picked.some((p) => p.stat === q.stat)) continue;
    picked.push(q);
  }
  s.daily = { day: key, quests: picked.map((q) => ({ id: q.id, claimed: false })), counters: {} };
  return true;
}

export interface QuestView {
  id: string;
  text: string;
  icon: string;
  progress: number;
  target: number;
  gold: number;
  gems: number;
  done: boolean;
  claimed: boolean;
}

export function dailyView(s: Save): QuestView[] {
  return s.daily.quests.map((q) => {
    const d = DAILY_POOL.find((p) => p.id === q.id)!;
    const progress = Math.min(d.target, s.daily.counters[d.stat] ?? 0);
    return { id: d.id, text: d.text, icon: d.icon, progress, target: d.target, gold: d.gold, gems: d.gems, done: progress >= d.target, claimed: q.claimed };
  });
}

export function claimDaily(s: Save, id: string): boolean {
  const q = s.daily.quests.find((x) => x.id === id);
  const v = dailyView(s).find((x) => x.id === id);
  if (!q || !v || q.claimed || !v.done) return false;
  q.claimed = true;
  s.gold += v.gold;
  s.gems += v.gems;
  return true;
}

export interface AchDef {
  id: string;
  text: (n: number) => string;
  tiers: number[];
  value: (s: Save) => number;
  icon: string;
}

const fmt = (n: number) => n.toLocaleString('en-US');

export const ACHIEVEMENTS: AchDef[] = [
  { id: 'kills', text: (n) => `הבס ${fmt(n)} שדים`, tiers: [100, 500, 2000, 6000, 15000], value: (s) => s.stats.kills ?? 0, icon: 'ic_skull' },
  { id: 'levels', text: (n) => `השלם ${n} שלבים`, tiers: [5, 12, 24, 36, 48], value: (s) => s.stars.filter((x) => x > 0).length, icon: 'ic_flag' },
  { id: 'stars', text: (n) => `אסוף ${n} כוכבים`, tiers: [15, 40, 80, 120, 144], value: (s) => s.stars.reduce((a, b) => a + b, 0), icon: 'ic_star' },
  {
    id: 'boss',
    text: (n) => (n === 1 ? 'הבס בוס אחד' : `הבס ${n} בוסים`),
    tiers: [1, 2, 3, 4],
    value: (s) => [12, 24, 36, 48].filter((n) => s.stars[n - 1] > 0).length,
    icon: 'ic_boss',
  },
  { id: 'hero', text: (n) => `הגע לרמת גיבור ${n}`, tiers: [5, 10, 20, 30, 40, 50], value: (s) => s.heroLvl, icon: 'ic_crown' },
  { id: 'recruit', text: (n) => `גייס ${fmt(n)} חיילים`, tiers: [25, 100, 300, 800], value: (s) => s.stats.recruits ?? 0, icon: 'ic_helmet' },
  { id: 'upgrade', text: (n) => `בצע ${n} שדרוגים`, tiers: [10, 40, 100, 180], value: (s) => s.stats.upgrades ?? 0, icon: 'ic_up' },
  { id: 'gold', text: (n) => `אסוף ${fmt(n)} זהב`, tiers: [2000, 10000, 50000, 200000], value: (s) => s.stats.goldEarned ?? 0, icon: 'ic_chest' },
];

export function achReward(tier: number): { gold: number; gems: number } {
  return { gold: 250 * (tier + 1), gems: 6 + 4 * tier };
}

export function achView(s: Save): (QuestView & { complete: boolean })[] {
  return ACHIEVEMENTS.map((a) => {
    const tier = Math.min(s.ach[a.id] ?? 0, a.tiers.length);
    const complete = tier >= a.tiers.length;
    const t = complete ? a.tiers.length - 1 : tier;
    const target = a.tiers[t];
    const progress = Math.min(target, a.value(s));
    const r = achReward(t);
    return { id: a.id, text: a.text(target), icon: a.icon, progress, target, gold: r.gold, gems: r.gems, done: progress >= target, claimed: complete, complete };
  });
}

export function claimAch(s: Save, id: string): boolean {
  const v = achView(s).find((x) => x.id === id);
  if (!v || v.complete || !v.done) return false;
  s.ach[id] = (s.ach[id] ?? 0) + 1;
  s.gold += v.gold;
  s.gems += v.gems;
  return true;
}

export function claimableCount(s: Save): number {
  return dailyView(s).filter((q) => q.done && !q.claimed).length + achView(s).filter((q) => q.done && !q.complete).length;
}
