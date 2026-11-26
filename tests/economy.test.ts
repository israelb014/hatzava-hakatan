import { describe, it, expect } from 'vitest';
import { newSave } from '../src/game/save';
import { LEVEL_COUNT, UNITS, UNIT_IDS, levelDef, MAX_HERO_LEVEL } from '../src/game/data';
import * as E from '../src/game/economy';

describe('התקדמות הגיבור', () => {
  it('קיבולת הצבא: 10 + 2 לכל רמה, עד 110', () => {
    expect(E.capacity(1)).toBe(12);
    expect(E.capacity(20)).toBe(50);
    expect(E.capacity(50)).toBe(110);
  });
  it('ניסיון מעלה רמות ונעצר ברמה 50', () => {
    const s = newSave();
    const ups = E.addXp(s, E.xpToNext(1) + E.xpToNext(2) + 5);
    expect(ups).toBe(2);
    expect(s.heroLvl).toBe(3);
    expect(s.heroXp).toBe(5);
    E.addXp(s, 1e9);
    expect(s.heroLvl).toBe(MAX_HERO_LEVEL);
    expect(s.heroXp).toBe(0);
  });
  it('ציוד מוסיף לנתוני הגיבור', () => {
    const s = newSave();
    const base = E.heroStats(s);
    const it = E.makeItem(1, 'weapon', 2, 10);
    s.inv.push(it);
    expect(E.equipItem(s, 1)).toBe(true);
    expect(E.heroStats(s).atk).toBe(base.atk + it.atk);
    expect(s.inv.length).toBe(0);
    E.unequipItem(s, 'weapon');
    expect(E.heroStats(s).atk).toBe(base.atk);
    expect(s.inv.length).toBe(1);
  });
});

describe('גיוס ושדרוג', () => {
  it('גיוס עולה זהב ומוגבל בקיבולת ובנעילה', () => {
    const s = newSave();
    s.gold = 100000;
    expect(E.recruit(s, 'giant')).toBe(false); // נעול עד רמה 20
    const before = s.gold;
    expect(E.recruit(s, 'sword')).toBe(true);
    expect(s.gold).toBe(before - E.recruitCost('sword', 1));
    while (E.recruit(s, 'archer'));
    expect(E.armyCount(s)).toBe(E.capacity(1));
  });
  it('שדרוג: +8% לרמה, יהלומים בכל רמה חמישית, מקסימום 30', () => {
    expect(E.unitMult(1)).toBe(1);
    expect(E.unitMult(2)).toBeCloseTo(1.08);
    expect(E.upgradeCost('sword', 3).gems).toBe(0);
    expect(E.upgradeCost('sword', 4).gems).toBeGreaterThan(0);
    const s = newSave();
    s.gold = 1e9;
    s.gems = 1e6;
    while (E.upgradeUnit(s, 'sword'));
    expect(s.units.sword.lvl).toBe(30);
    s.gold = 0;
    expect(E.canUpgrade(s, 'archer')).toBe(false);
  });
  it('סדר פתיחת היחידות לפי המפרט', () => {
    expect(UNIT_IDS.map((id) => UNITS[id].unlock)).toEqual([1, 1, 3, 6, 9, 14, 20]);
  });
});

describe('קרב ופרסים', () => {
  it('חישוב כוכבים', () => {
    expect(E.calcStars(false, 1, 0)).toBe(0);
    expect(E.calcStars(true, 0.3, 0)).toBe(1);
    expect(E.calcStars(true, 0.8, 0.5)).toBe(2);
    expect(E.calcStars(true, 0.8, 0.25)).toBe(3);
  });
  it('ניצחון: חצי מהנופלים חוזרים, פרסים ופתיחת השלב הבא', () => {
    const s = newSave();
    s.units.sword.count = 10;
    const gold = s.gold;
    const sum = E.applyBattle(s, 1, { win: true, heroHpPct: 0.9, sent: { sword: 10, archer: 3 }, lost: { sword: 4 }, kills: 12, skillsUsed: 2, potionsUsed: 1 }, E.mulberry32(1));
    expect(sum.stars).toBe(2);
    expect(s.units.sword.count).toBe(8);
    expect(s.gold).toBe(gold + sum.rewards.gold);
    expect(s.stars[0]).toBe(2);
    expect(E.isLevelUnlocked(s, 2)).toBe(true);
    expect(E.isLevelUnlocked(s, 3)).toBe(false);
    expect(s.stats.kills).toBe(12);
  });
  it('הפסד: אין פרסים, השלב לא נפתח', () => {
    const s = newSave();
    s.units.sword.count = 10;
    const gold = s.gold;
    const sum = E.applyBattle(s, 1, { win: false, heroHpPct: 0, sent: { sword: 10 }, lost: { sword: 10 }, kills: 3, skillsUsed: 0, potionsUsed: 0 });
    expect(sum.win).toBe(false);
    expect(s.gold).toBe(gold);
    expect(s.units.sword.count).toBe(Math.floor(10 * E.RETURN_ON_LOSS));
    expect(s.stars[0]).toBe(0);
  });
  it('משחק חוזר אחרי 3 כוכבים נותן 70% מהפרס', () => {
    const first = E.levelRewards(10, 3, 0);
    const again = E.levelRewards(10, 3, 3);
    expect(again.gold).toBe(Math.round(first.gold * 0.7));
    expect(again.gems).toBe(0);
    expect(again.gold).toBeGreaterThan(0);
  });
  it('שלבי בוס מבטיחים פריט ברמת "מיוחד" לפחות', () => {
    const s = newSave();
    for (let i = 0; i < 200; i++) {
      const it = E.rollItem(s, 12, 1, E.mulberry32(i));
      expect(it).not.toBeNull();
      expect(it!.rarity).toBeGreaterThanOrEqual(2);
    }
    expect(E.dropChance(5, 3)).toBeGreaterThan(E.dropChance(5, 1));
  });
  it('מכירת פריט נותנת זהב', () => {
    const s = newSave();
    const it = E.makeItem(7, 'ring', 3, 20);
    s.inv.push(it);
    const g = s.gold;
    expect(E.sellItem(s, 7)).toBe(E.sellValue(it));
    expect(s.gold).toBe(g + E.sellValue(it));
    expect(E.sellItem(s, 7)).toBe(0);
  });
  it('48 שלבים, בוס בכל שלב 12, והקושי עולה', () => {
    let prev = 0;
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const lv = levelDef(n);
      expect(lv.waves.length).toBeGreaterThanOrEqual(1);
      expect(lv.waves.length).toBeLessThanOrEqual(3);
      expect(!!lv.boss).toBe(n % 12 === 0);
      expect(lv.mult).toBeGreaterThan(prev);
      prev = lv.mult;
    }
  });
});

describe('משימות', () => {
  it('5 משימות יומיות שמתאפסות ביום חדש', () => {
    const s = newSave();
    E.ensureDaily(s, new Date(2026, 0, 5, 23, 59));
    expect(s.daily.quests.length).toBe(5);
    E.track(s, 'kills', 500);
    E.track(s, 'battles', 5);
    const ids = s.daily.quests.map((q) => q.id);
    expect(E.ensureDaily(s, new Date(2026, 0, 5, 23, 59, 59))).toBe(false);
    expect(s.daily.counters.kills).toBe(500);
    expect(E.ensureDaily(s, new Date(2026, 0, 6, 0, 0, 1))).toBe(true);
    expect(s.daily.counters.kills).toBeUndefined();
    expect(s.stats.kills).toBe(500); // ההישגים נשמרים
    expect(ids.length).toBe(5);
  });
  it('קבלת פרס משימה פעם אחת בלבד', () => {
    const s = newSave();
    E.ensureDaily(s, new Date(2026, 0, 5));
    const q = E.dailyView(s)[0];
    expect(E.claimDaily(s, q.id)).toBe(false);
    const def = E.DAILY_POOL.find((d) => d.id === q.id)!;
    E.track(s, def.stat, def.target);
    const gold = s.gold;
    expect(E.claimDaily(s, q.id)).toBe(true);
    expect(s.gold).toBe(gold + q.gold);
    expect(E.claimDaily(s, q.id)).toBe(false);
  });
  it('הישגים מתקדמים בשלבים', () => {
    const s = newSave();
    E.track(s, 'kills', 600);
    expect(E.claimAch(s, 'kills')).toBe(true);
    expect(E.claimAch(s, 'kills')).toBe(true);
    expect(E.claimAch(s, 'kills')).toBe(false);
    expect(E.achView(s).find((a) => a.id === 'kills')!.target).toBe(2000);
  });
});
