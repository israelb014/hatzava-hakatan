import { describe, it, expect } from 'vitest';
import { newSave, exportCode, importCode, loadSave, storeSave, sanitize, SAVE_KEY, type Storage } from '../src/game/save';
import { makeItem } from '../src/game/economy';

function memStorage(): Storage & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

describe('שמירה', () => {
  it('שמירה וטעינה מ-localStorage', () => {
    const st = memStorage();
    const s = newSave();
    s.gold = 4321;
    s.heroLvl = 17;
    s.stars[5] = 3;
    s.inv.push(makeItem(1, 'armor', 4, 30));
    storeSave(st, s);
    expect(st.data[SAVE_KEY]).toBeTruthy();
    expect(loadSave(st)).toEqual(s);
  });
  it('שמירה פגומה מחזירה משחק חדש', () => {
    const st = memStorage();
    st.setItem(SAVE_KEY, '{not json');
    expect(loadSave(st).gold).toBe(newSave().gold);
  });
  it('קוד גיבוי: ייצוא וייבוא זהים, כולל עברית', () => {
    const s = newSave();
    s.gems = 777;
    s.units.mage = { lvl: 12, count: 9 };
    s.daily.day = 'יום-בדיקה';
    const code = exportCode(s);
    expect(code.startsWith('HK1.')).toBe(true);
    expect(importCode(code)).toEqual(s);
    expect(importCode('  ' + code.slice(0, 40) + '\n' + code.slice(40) + ' ')).toEqual(s);
  });
  it('קוד שגוי או ערוך נדחה', () => {
    const code = exportCode(newSave());
    expect(importCode('שלום')).toBeNull();
    expect(importCode('')).toBeNull();
    expect(importCode(code.slice(0, -6) + 'AAAAAA')).toBeNull();
  });
  it('ערכים לא חוקיים מתוקנים', () => {
    const s = sanitize({ v: 1, gold: -50, gems: 'x', heroLvl: 999, units: { sword: { lvl: 80, count: -3 } }, stars: [9, 2], inv: [{ bad: true }] });
    expect(s.gold).toBe(0);
    expect(s.heroLvl).toBe(50);
    expect(s.units.sword).toEqual({ lvl: 30, count: 0 });
    expect(s.stars[0]).toBe(3);
    expect(s.stars.length).toBe(48);
    expect(s.inv.length).toBe(0);
  });
});
