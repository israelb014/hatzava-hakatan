import { describe, it, expect } from 'vitest';
import { newSave, sanitize, exportCode, importCode, loadSave, SAVE_KEY, SAVE_VERSION, armySlots, type Storage } from '../src/game/save';
import { UNIT_IDS, UNIT_SLOTS, UNITS, FORMATION_ORDER, levelDef } from '../src/game/data';
import * as E from '../src/game/economy';
import { BattleSim, FIELD_W } from '../src/game/sim';
import { newer, pickApkUpdate } from '../src/game/version';

/** שמירה כפי שנשמרה בגרסה 1.0.3 (גרסת שמירה 1, בלי מילואים) */
function v1Save() {
  const s = newSave() as unknown as Record<string, unknown>;
  delete s.reserve;
  s.v = 1;
  s.heroLvl = 22;
  s.heroXp = 321;
  s.gold = 5432;
  s.gems = 77;
  s.units = { sword: { lvl: 9, count: 8 }, archer: { lvl: 8, count: 6 }, spear: { lvl: 5, count: 4 }, mage: { lvl: 4, count: 3 }, healer: { lvl: 3, count: 2 }, samurai: { lvl: 4, count: 5 }, giant: { lvl: 6, count: 26 } };
  s.stars = Array.from({ length: 48 }, (_, i) => (i < 20 ? 2 + (i % 2) : 0));
  s.inv = [E.makeItem(3, 'weapon', 3, 18)];
  s.skills = [4, 2, 3];
  return s;
}

describe('מקומות בצבא', () => {
  it('ענק תופס 3 מקומות, סמוראי 2, השאר 1', () => {
    expect(UNIT_SLOTS).toEqual({ sword: 1, archer: 1, spear: 1, mage: 1, healer: 1, samurai: 2, giant: 3 });
  });
  it('הקיבולת נספרת במקומות ולא ביחידות', () => {
    const s = newSave();
    s.heroLvl = 20;
    s.gold = 1e9;
    for (const id of UNIT_IDS) s.units[id].count = 0;
    while (E.recruit(s, 'giant'));
    expect(s.units.giant.count).toBe(Math.floor(E.capacity(20) / 3));
    expect(E.freeSlots(s)).toBeLessThan(3);
    while (E.recruit(s, 'sword'));
    expect(armySlots(s)).toBe(E.capacity(20));
    expect(E.recruit(s, 'sword')).toBe(false);
  });
  it('העברה בין הצבא למילואים', () => {
    const s = newSave();
    const before = s.units.sword.count;
    expect(E.toReserve(s, 'sword')).toBe(true);
    expect(s.units.sword.count).toBe(before - 1);
    expect(s.reserve.sword).toBe(1);
    expect(E.fromReserve(s, 'sword')).toBe(true);
    expect(s.reserve.sword).toBe(0);
    expect(E.fromReserve(s, 'sword')).toBe(false);
    // אין מקום: לא מחזירים מהמילואים
    s.gold = 1e9;
    while (E.recruit(s, 'archer'));
    s.reserve.sword = 3;
    expect(E.fromReserve(s, 'sword')).toBe(false);
    expect(s.reserve.sword).toBe(3);
  });
});

describe('המרת שמירה מגרסה 1', () => {
  it('שום חייל לא נמחק: העודפים עוברים למילואים לפי סדר המערך', () => {
    const raw = v1Save();
    const units = raw.units as Record<string, { lvl: number; count: number }>;
    const s = sanitize(JSON.parse(JSON.stringify(raw)));
    expect(s.v).toBe(SAVE_VERSION);
    expect(armySlots(s)).toBeLessThanOrEqual(E.capacity(22));
    for (const id of UNIT_IDS) {
      expect(s.units[id].count + s.reserve[id]).toBe(units[id].count);
      expect(s.units[id].lvl).toBe(units[id].lvl);
    }
    // נשארים בצבא מהחזית לאחור: קודם ענקים
    expect(s.units.giant.count).toBe(Math.floor(E.capacity(22) / 3));
    expect(s.reserve.healer).toBe(2);
    // מי שנשאר בחוץ הוא תמיד מסוף סדר המערך
    const firstOut = FORMATION_ORDER.findIndex((id) => s.reserve[id] > 0);
    for (let i = firstOut + 1; i < FORMATION_ORDER.length; i++) expect(s.units[FORMATION_ORDER[i]].count).toBe(0);
  });
  it('כל ההתקדמות נשמרת', () => {
    const raw = v1Save();
    const s = sanitize(JSON.parse(JSON.stringify(raw)));
    expect(s.heroLvl).toBe(22);
    expect(s.heroXp).toBe(321);
    expect(s.gold).toBe(5432);
    expect(s.gems).toBe(77);
    expect(s.stars).toEqual(raw.stars);
    expect(s.inv).toEqual(raw.inv);
    expect(s.skills).toEqual([4, 2, 3]);
    expect(E.currentLevel(s)).toBe(21);
  });
  it('טעינה מ-localStorage של שמירה ישנה, וההמרה יציבה בטעינה חוזרת', () => {
    const data: Record<string, string> = { [SAVE_KEY]: JSON.stringify(v1Save()) };
    const st: Storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
    const a = loadSave(st);
    const b = sanitize(JSON.parse(JSON.stringify(a)));
    expect(b).toEqual(a);
  });
  it('צבא שלא חורג מהקיבולת לא משתנה', () => {
    const raw = v1Save();
    raw.units = { sword: { lvl: 9, count: 8 }, archer: { lvl: 8, count: 6 }, spear: { lvl: 1, count: 0 }, mage: { lvl: 1, count: 0 }, healer: { lvl: 1, count: 0 }, samurai: { lvl: 1, count: 0 }, giant: { lvl: 6, count: 5 } };
    const s = sanitize(raw);
    expect(s.units.giant.count).toBe(5);
    expect(UNIT_IDS.reduce((a, id) => a + s.reserve[id], 0)).toBe(0);
  });
  it('קוד גיבוי מגרסה 1 מתקבל ומומר', () => {
    const raw = v1Save();
    const body = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(raw))));
    // אותו חישוב סיכום ביקורת כמו בקוד הגיבוי
    let h = 2166136261;
    for (let i = 0; i < body.length; i++) {
      h ^= body.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const s = importCode(`HK1.${(h >>> 0).toString(36)}.${body}`);
    expect(s).not.toBeNull();
    expect(s!.heroLvl).toBe(22);
    expect(s!.v).toBe(SAVE_VERSION);
    expect(importCode(exportCode(s!))).toEqual(s);
  });
});

describe('מערך הקרב', () => {
  const army = { giant: { lvl: 3, count: 4 }, spear: { lvl: 3, count: 8 }, sword: { lvl: 3, count: 10 }, samurai: { lvl: 3, count: 5 }, archer: { lvl: 3, count: 9 }, mage: { lvl: 3, count: 6 }, healer: { lvl: 3, count: 4 } };
  const mk = () => new BattleSim({ level: levelDef(20), hero: E.heroBase(20), army, skills: [1, 1, 1], potions: 3, rng: E.mulberry32(3) });
  it('לכל חייל משבצת משלו - אין שניים באותה נקודה', () => {
    const sim = mk();
    const allies = sim.ents.filter((e) => e.side === 0);
    expect(allies.length).toBe(47);
    for (let i = 0; i < allies.length; i++)
      for (let j = i + 1; j < allies.length; j++) {
        const dx = Math.abs(allies[i].x - allies[j].x);
        const dy = Math.abs(allies[i].y - allies[j].y) * 150;
        expect(dx > 14 || dy > 14).toBe(true);
      }
  });
  it('סדר מהחזית לאחור: גיבור, ענקים, חנית, חרבנים, סמוראים, יורים, מרפאות', () => {
    const sim = mk();
    const avg = (kind: string) => {
      const l = sim.ents.filter((e) => e.kind === kind);
      return l.reduce((a, e) => a + e.x, 0) / l.length;
    };
    const order = ['hero', 'giant', 'spear', 'sword', 'samurai', 'archer', 'mage', 'healer'].map(avg);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeLessThan(order[i - 1] + (i === 6 ? 40 : 0));
  });
  it('החיילים נשארים בגבולות השדה ולא נערמים גם באמצע קרב', () => {
    const sim = new BattleSim({ level: levelDef(20), hero: E.heroBase(20), army, skills: [1, 1, 1], potions: 3, rng: E.mulberry32(3), autoHero: true });
    for (let i = 0; i < 400 && sim.state === 'run'; i++) sim.step(0.05);
    const alive = sim.ents.filter((e) => !e.dead);
    for (const e of alive) {
      expect(e.x).toBeGreaterThanOrEqual(20);
      expect(e.x).toBeLessThanOrEqual(FIELD_W);
      expect(e.y).toBeGreaterThanOrEqual(0.03);
      expect(e.y).toBeLessThanOrEqual(0.97);
    }
    let stacked = 0;
    const allies = alive.filter((e) => e.side === 0 && !e.hero);
    for (let i = 0; i < allies.length; i++) for (let j = i + 1; j < allies.length; j++) if (Math.abs(allies[i].x - allies[j].x) < 6 && Math.abs(allies[i].y - allies[j].y) * 150 < 6) stacked++;
    expect(stacked).toBe(0);
  });
  it('מרפאה מרפאת שני חיילים בבת אחת', () => {
    const sim = new BattleSim({ level: levelDef(1), hero: E.heroBase(1), army: { sword: { lvl: 1, count: 3 }, healer: { lvl: 1, count: 1 } }, skills: [1, 1, 1], potions: 3, rng: E.mulberry32(1) });
    const swords = sim.ents.filter((e) => e.kind === 'sword');
    swords[0].hp = 10;
    swords[1].hp = 20;
    sim.events.length = 0;
    for (let i = 0; i < 60; i++) {
      sim.step(0.05);
      if (sim.events.some((e) => e.t === 'heal')) break;
    }
    const healed = sim.events.filter((e) => e.t === 'heal');
    expect(healed.length).toBe(2);
    expect(UNITS.healer.atk).toBe(28);
  });
});

describe('בדיקת עדכון לאנדרואיד', () => {
  it('השוואת גרסאות', () => {
    expect(newer('v1.0.4', '1.0.3')).toBe(true);
    expect(newer('1.0.3', '1.0.3')).toBe(false);
    expect(newer('v1.0.10', '1.0.9')).toBe(true);
    expect(newer('v1.1.0', '1.0.12')).toBe(true);
    expect(newer('v1.0.2', '1.0.3')).toBe(false);
  });
  it('מזהה APK חדש בגרסה האחרונה', () => {
    const rel = { tag_name: 'v1.0.4', assets: [{ name: 'latest.yml', browser_download_url: 'x' }, { name: 'hatzava-hakatan.apk', browser_download_url: 'https://github.com/israelb014/hatzava-hakatan/releases/download/v1.0.4/hatzava-hakatan.apk' }] };
    expect(pickApkUpdate(rel, '1.0.3')).toEqual({ version: '1.0.4', url: rel.assets[1].browser_download_url });
    expect(pickApkUpdate(rel, '1.0.4')).toBeNull();
    expect(pickApkUpdate({ tag_name: 'v1.0.5', assets: [] }, '1.0.3')).toBeNull();
    expect(pickApkUpdate({}, '1.0.3')).toBeNull();
  });
});
