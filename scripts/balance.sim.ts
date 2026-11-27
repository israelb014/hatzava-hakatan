// סימולציית איזון: שחקן אוטומטי שמתקדם משלב 1 עד 48. מריצים עם npm run balance
// "חזרות" = כמה קרבות נוספים נדרשו לפני שהשלב נוצח (ניסיונות כושלים + חזרה לשלבים קודמים לאיסוף זהב).
import { test } from 'vitest';
import { newSave, type Save } from '../src/game/save';
import { levelDef, UNIT_IDS, UNIT_SLOTS, SLOTS, REGIONS, type UnitId } from '../src/game/data';
import * as E from '../src/game/economy';
import { BattleSim } from '../src/game/sim';

// חלוקת המקומות בצבא שהשחקן האוטומטי שואף אליה (צבא מעורב)
const W: Record<UnitId, number> = { sword: 3, archer: 3, spear: 2, mage: 2, healer: 1.4, samurai: 2.4, giant: 2.2 };
const ONLY = (process.env.ONLY ?? '') as UnitId | '';

export function spend(s: Save) {
  for (const sl of SLOTS) {
    const best = s.inv.filter((i) => i.slot === sl).sort((a, b) => E.itemPower(b) - E.itemPower(a))[0];
    if (best && (!s.equip[sl] || E.itemPower(best) > E.itemPower(s.equip[sl]!))) E.equipItem(s, best.id);
  }
  for (const it of [...s.inv]) E.sellItem(s, it.id);
  for (const a of E.achView(s)) while (E.claimAch(s, a.id));
  let guard = 0;
  while (guard++ < 800) {
    let did = false;
    if (E.freeSlots(s) > 0) {
      let ids = UNIT_IDS.filter((id) => E.isUnlocked(s, id));
      if (ONLY && ids.includes(ONLY)) ids = [ONLY, ...ids.filter((i) => i !== ONLY)];
      else {
        const tw = ids.reduce((a, id) => a + W[id], 0);
        const tot = E.armySlots(s) + 1;
        const share = (id: UnitId) => (s.units[id].count * UNIT_SLOTS[id]) / tot - W[id] / tw;
        ids.sort((a, b) => share(a) - share(b));
      }
      for (const id of ids) if (E.recruit(s, id)) { did = true; break; }
    }
    if (!did) {
      const ids = UNIT_IDS.filter((id) => s.units[id].count > 0 && E.canUpgrade(s, id)).sort(
        (a, b) => E.upgradeCost(a, s.units[a].lvl).gold / (s.units[a].count * UNIT_SLOTS[a]) - E.upgradeCost(b, s.units[b].lvl).gold / (s.units[b].count * UNIT_SLOTS[b]),
      );
      if (ids.length && E.armySlots(s) >= E.capacity(s.heroLvl) * 0.85) { E.upgradeUnit(s, ids[0]); did = true; }
    }
    if (!did) break;
  }
}

function fight(s: Save, n: number, seed: number) {
  const sim = BattleSim.autoRun({ level: levelDef(n), hero: E.heroStats(s), army: s.units, skills: s.skills, potions: E.BASE_POTIONS, rng: E.mulberry32(seed) });
  return { sim, sum: E.applyBattle(s, n, sim.outcome(), E.mulberry32(seed + 7)) };
}

test('balance', () => {
  const seeds = (process.env.SEEDS ?? '1,2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
  const per: number[][] = Array.from({ length: 48 }, () => []);
  const stars: number[][] = Array.from({ length: 48 }, () => []);
  let stuck = 0;
  for (const seed of seeds) {
    const s = newSave();
    const rows: string[] = [];
    for (let n = 1; n <= 48; n++) {
      let replays = 0;
      for (;;) {
        spend(s);
        const pw = E.totalPower(s);
        const res = fight(s, n, seed * 1000 + n * 10 + replays);
        if (res.sum.win) {
          stars[n - 1].push(res.sum.stars);
          if (process.env.FULL) rows.push(`${String(n).padStart(2)} r${replays} *${res.sum.stars} hero${s.heroLvl} slots ${E.armySlots(s)}/${E.capacity(s.heroLvl)} units[${UNIT_IDS.map((i) => s.units[i].count).join(',')}] lv[${UNIT_IDS.map((i) => s.units[i].lvl).join(',')}] gold ${s.gold} gems ${s.gems} t${Math.round(res.sim.time)} fallen ${res.sum.fallen}`);
          break;
        }
        replays++;
        if (replays > 30) break;
        // חוזרים לשלבים קודמים עד שהצבא משתקם
        for (let g = 0; g < 12; g++) {
          let farm = 1;
          for (let k = n - 1; k >= 1; k--) if (E.recommendedPower(k) <= E.totalPower(s) * 0.9) { farm = k; break; }
          fight(s, farm, seed * 999 + n * 31 + replays);
          spend(s);
          if (E.totalPower(s) >= pw * 1.02) break;
          replays++;
        }
      }
      per[n - 1].push(replays);
      if (replays > 30) { stuck++; break; }
    }
    if (process.env.FULL) console.log(`--- seed ${seed}\n` + rows.join('\n'));
  }
  const lines: string[] = [];
  for (let r = 0; r < 4; r++) {
    const lv = per.slice(r * 12, r * 12 + 12);
    const all = lv.flat();
    const worst = Math.max(0, ...all);
    const avgTotal = all.reduce((a, b) => a + b, 0) / seeds.length;
    const st = stars.slice(r * 12, r * 12 + 12).flat();
    const boss = lv[11];
    lines.push(`${REGIONS[r]}: avg replays per run ${avgTotal.toFixed(1)}, worst level ${worst}, boss [${boss.join(',')}], avg stars ${(st.reduce((a, b) => a + b, 0) / Math.max(1, st.length)).toFixed(2)}`);
  }
  const bad = per.map((a, i) => ({ n: i + 1, m: Math.max(0, ...a) })).filter((x) => x.m > 3);
  console.log(`BALANCE seeds=${seeds.length}${ONLY ? ' only=' + ONLY : ''} stuck=${stuck}\n${lines.join('\n')}\nlevels over 3 replays: ${bad.length ? bad.map((b) => `${b.n}(${b.m})`).join(' ') : 'none'}\nper level worst: ${per.map((a) => Math.max(0, ...a)).join(',')}`);
});
