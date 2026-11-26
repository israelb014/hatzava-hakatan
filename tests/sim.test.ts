import { describe, it, expect } from 'vitest';
import { newSave } from '../src/game/save';
import { levelDef } from '../src/game/data';
import * as E from '../src/game/economy';
import { BattleSim } from '../src/game/sim';

describe('סימולציית קרב', () => {
  it('הצבא ההתחלתי מנצח בשלב 1', () => {
    const s = newSave();
    for (let seed = 1; seed <= 20; seed++) {
      const sim = BattleSim.autoRun({ level: levelDef(1), hero: E.heroStats(s), army: s.units, skills: s.skills, potions: 3, rng: E.mulberry32(seed) });
      expect(sim.state).toBe('win');
      expect(sim.kills).toBe(sim.enemiesTotal());
    }
  });
  it('גיבור לבדו ברמה 1 מפסיד לבוס האחרון', () => {
    const s = newSave();
    s.units.sword.count = 0;
    s.units.archer.count = 0;
    const sim = BattleSim.autoRun({ level: levelDef(48), hero: E.heroStats(s), army: s.units, skills: s.skills, potions: 3, rng: E.mulberry32(5) });
    expect(sim.state).toBe('lose');
  });
  it('שיקוי מרפא 40% ונגמר אחרי 3', () => {
    const s = newSave();
    const sim = new BattleSim({ level: levelDef(1), hero: E.heroStats(s), army: {}, skills: s.skills, potions: 3, rng: E.mulberry32(1) });
    const h = sim.hero;
    expect(sim.usePotion()).toBe(false); // חיים מלאים
    h.hp = 1;
    expect(sim.usePotion()).toBe(true);
    expect(h.hp).toBeCloseTo(1 + h.maxHp * 0.4);
    h.hp = 1;
    sim.usePotion();
    h.hp = 1;
    sim.usePotion();
    h.hp = 1;
    expect(sim.usePotion()).toBe(false);
    expect(sim.potionsUsed).toBe(3);
  });
  it('החייאה אפשרית פעם אחת בלבד', () => {
    const s = newSave();
    const sim = new BattleSim({ level: levelDef(30), hero: E.heroStats(s), army: {}, skills: s.skills, potions: 0, rng: E.mulberry32(2) });
    for (let i = 0; i < 4000 && sim.state === 'run'; i++) sim.step(0.05);
    expect(sim.state).toBe('down');
    sim.revive();
    expect(sim.state).toBe('run');
    expect(sim.hero.hp).toBeGreaterThan(0);
    for (let i = 0; i < 4000 && sim.state === 'run'; i++) sim.step(0.05);
    expect(sim.state).toBe('down');
    sim.revive();
    expect(sim.state).toBe('down');
    sim.giveUp();
    expect(sim.state).toBe('lose');
  });
});
