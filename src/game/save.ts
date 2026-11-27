// מצב המשחק ושמירה
import { type Item, type Slot, type UnitId, UNIT_IDS, SLOTS, LEVEL_COUNT, UNIT_SLOTS, FORMATION_ORDER, capacityFor } from './data';

export interface QuestProgress {
  id: string;
  claimed: boolean;
}
export interface Save {
  v: number;
  gold: number;
  gems: number;
  heroLvl: number;
  heroXp: number;
  units: Record<UnitId, { lvl: number; count: number }>;
  /** מילואים: חיילים שאינם נכנסים לקרב (נוסף בגרסת שמירה 2) */
  reserve: Record<UnitId, number>;
  stars: number[];
  equip: Record<Slot, Item | null>;
  inv: Item[];
  skills: number[];
  nextItemId: number;
  daily: { day: string; quests: QuestProgress[]; counters: Record<string, number> };
  ach: Record<string, number>;
  stats: Record<string, number>;
  settings: { music: boolean; sfx: boolean };
  tutorialDone: boolean;
}

export const SAVE_KEY = 'hatzava-hakatan-save-v1';
export const SAVE_VERSION = 2;
const CODE_PREFIX = 'HK1.';

export function newSave(): Save {
  const units = {} as Save['units'];
  for (const id of UNIT_IDS) units[id] = { lvl: 1, count: 0 };
  units.sword.count = 6;
  units.archer.count = 4;
  const reserve = {} as Save['reserve'];
  for (const id of UNIT_IDS) reserve[id] = 0;
  const equip = {} as Save['equip'];
  for (const s of SLOTS) equip[s] = null;
  return {
    v: SAVE_VERSION,
    gold: 150,
    gems: 10,
    heroLvl: 1,
    heroXp: 0,
    units,
    reserve,
    stars: new Array(LEVEL_COUNT).fill(0),
    equip,
    inv: [],
    skills: [1, 1, 1],
    nextItemId: 1,
    daily: { day: '', quests: [], counters: {} },
    ach: {},
    stats: {},
    settings: { music: true, sfx: true },
    tutorialDone: false,
  };
}

/** משלים שדות חסרים ומוודא שהמבנה תקין (גם לשמירות ישנות / קודי גיבוי) */
export function sanitize(raw: unknown): Save {
  const base = newSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Save>;
  const num = (v: unknown, d: number, min = 0, max = 1e12) =>
    typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : d;
  const s: Save = base;
  s.gold = num(r.gold, base.gold);
  s.gems = num(r.gems, base.gems);
  s.heroLvl = num(r.heroLvl, 1, 1, 50);
  s.heroXp = num(r.heroXp, 0);
  for (const id of UNIT_IDS) {
    const u = r.units?.[id];
    if (u) s.units[id] = { lvl: num(u.lvl, 1, 1, 30), count: num(u.count, 0, 0, 110) };
    s.reserve[id] = num(r.reserve?.[id], 0, 0, 9999);
  }
  if (Array.isArray(r.stars)) for (let i = 0; i < LEVEL_COUNT; i++) s.stars[i] = num(r.stars[i], 0, 0, 3);
  const okItem = (it: unknown): it is Item =>
    !!it && typeof it === 'object' && SLOTS.includes((it as Item).slot) && typeof (it as Item).rarity === 'number';
  for (const sl of SLOTS) {
    const it = r.equip?.[sl];
    s.equip[sl] = okItem(it) && it.slot === sl ? it : null;
  }
  if (Array.isArray(r.inv)) s.inv = r.inv.filter(okItem).slice(0, 200);
  if (Array.isArray(r.skills)) s.skills = [0, 1, 2].map((i) => num(r.skills![i], 1, 1, 10));
  s.nextItemId = num(r.nextItemId, 1, 1);
  if (r.daily && typeof r.daily === 'object' && Array.isArray(r.daily.quests)) {
    s.daily = {
      day: String(r.daily.day ?? ''),
      quests: r.daily.quests.map((q) => ({ id: String(q.id), claimed: !!q.claimed })),
      counters: { ...(r.daily.counters ?? {}) },
    };
  }
  if (r.ach && typeof r.ach === 'object') s.ach = { ...r.ach };
  if (r.stats && typeof r.stats === 'object') s.stats = { ...r.stats };
  if (r.settings) s.settings = { music: r.settings.music !== false, sfx: r.settings.sfx !== false };
  s.tutorialDone = !!r.tutorialDone;
  fitArmy(s);
  return s;
}

export function armySlots(s: Save): number {
  let n = 0;
  for (const id of UNIT_IDS) n += s.units[id].count * UNIT_SLOTS[id];
  return n;
}

/**
 * מוודא שהצבא אינו חורג מהקיבולת. חיילים עודפים עוברים למילואים ולעולם אינם נמחקים.
 * נשארים בצבא לפי סדר המערך (מהחזית לאחור). משמש גם להמרת שמירות מגרסה 1,
 * שבה כל יחידה תפסה מקום אחד.
 */
export function fitArmy(s: Save): number {
  let over = armySlots(s) - capacityFor(s.heroLvl);
  let moved = 0;
  for (let i = FORMATION_ORDER.length - 1; i >= 0 && over > 0; i--) {
    const id = FORMATION_ORDER[i];
    const n = Math.min(s.units[id].count, Math.ceil(over / UNIT_SLOTS[id]));
    if (n <= 0) continue;
    s.units[id].count -= n;
    s.reserve[id] += n;
    over -= n * UNIT_SLOTS[id];
    moved += n;
  }
  return moved;
}

function toB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function fromB64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function checksum(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** קוד גיבוי להעברה בין מכשירים */
export function exportCode(s: Save): string {
  const body = toB64(JSON.stringify(s));
  return `${CODE_PREFIX}${checksum(body)}.${body}`;
}

export function importCode(code: string): Save | null {
  try {
    const c = code.trim().replace(/\s+/g, '');
    if (!c.startsWith(CODE_PREFIX)) return null;
    const rest = c.slice(CODE_PREFIX.length);
    const dot = rest.indexOf('.');
    if (dot < 0) return null;
    const sum = rest.slice(0, dot);
    const body = rest.slice(dot + 1);
    if (checksum(body) !== sum) return null;
    const obj = JSON.parse(fromB64(body));
    // קודים מגרסת שמירה 1 מתקבלים ומומרים
    if (!obj || typeof obj !== 'object' || (obj.v !== 1 && obj.v !== 2)) return null;
    return sanitize(obj);
  } catch {
    return null;
  }
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function loadSave(st: Storage): Save {
  try {
    const raw = st.getItem(SAVE_KEY);
    if (!raw) return newSave();
    return sanitize(JSON.parse(raw));
  } catch {
    return newSave();
  }
}

export function storeSave(st: Storage, s: Save): void {
  try {
    st.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* אחסון מלא או חסום - ממשיכים לשחק */
  }
}
