// סימולציית איזון: שחקן אוטומטי שמתקדם משלב 1 עד 48. מריצים עם npm run balance
import { test } from 'vitest';
import { newSave, type Save } from '../src/game/save';
import { levelDef, UNIT_IDS, UNITS, SLOTS, type UnitId } from '../src/game/data';
import * as E from '../src/game/economy';
import { BattleSim } from '../src/game/sim';

const W: Record<UnitId, number> = { sword: 3, archer: 3, spear: 2, mage: 2, healer: 1.2, samurai: 2.2, giant: 1 };

export function spend(s: Save) {
  // ציוד הטוב ביותר
  for (const sl of SLOTS) {
    const best = s.inv.filter((i) => i.slot === sl).sort((a, b) => E.itemPower(b) - E.itemPower(a))[0];
    if (best && (!s.equip[sl] || E.itemPower(best) > E.itemPower(s.equip[sl]!))) E.equipItem(s, best.id);
  }
  for (const it of [...s.inv]) E.sellItem(s, it.id);
  for (const a of E.achView(s)) while (E.claimAch(s, a.id));
  let guard = 0;
  while (guard++ < 500) {
    let did = false;
    if (E.armyCount(s) < E.capacity(s.heroLvl)) {
      const ids = UNIT_IDS.filter((id) => E.isUnlocked(s, id));
      const tw = ids.reduce((a, id) => a + W[id], 0);
      const tot = E.armyCount(s) + 1;
      ids.sort((a, b) => s.units[a].count / tot - W[a] / tw - (s.units[b].count / tot - W[b] / tw));
      for (const id of ids) if (E.recruit(s, id)) { did = true; break; }
    }
    if (!did) {
      const ids = UNIT_IDS.filter((id) => s.units[id].count > 0 && E.canUpgrade(s, id)).sort(
        (a, b) => E.upgradeCost(a, s.units[a].lvl).gold / s.units[a].count - E.upgradeCost(b, s.units[b].lvl).gold / s.units[b].count,
      );
      if (ids.length && E.armyCount(s) >= E.capacity(s.heroLvl) * 0.85) { E.upgradeUnit(s, ids[0]); did = true; }
    }
    if (!did) break;
  }
}

function fight(s: Save, n: number, seed: number) {
  const sim = BattleSim.autoRun({ level: levelDef(n), hero: E.heroStats(s), army: s.units, skills: s.skills, potions: E.BASE_POTIONS, rng: E.mulberry32(seed) });
  return { sim, sum: E.applyBattle(s, n, sim.outcome(), E.mulberry32(seed + 7)) };
}

test('balance', () => {
  for (const seed of [1, 2, 3]) {
    const s = newSave();
    let totalReplays = 0;
    const rows: string[] = [];
    for (let n = 1; n <= 48; n++) {
      let replays = 0;
      let res;
      for (;;) {
        spend(s);
        const pw = E.totalPower(s);
        res = fight(s, n, seed * 1000 + n * 10 + replays);
        if (res.sum.win) { rows.push(`${String(n).padStart(2)} r${replays} *${res.sum.stars} hero${String(s.heroLvl).padStart(2)} army ${E.armyCount(s)}/${E.capacity(s.heroLvl)} lv[${UNIT_IDS.map((i) => s.units[i].lvl).join(',')}] gold ${s.gold} gems ${s.gems} pw ${pw} rec ${E.recommendedPower(n)} t${Math.round(res.sim.time)} fallen ${res.sum.fallen}/${Object.values(res.sim.sent).reduce((a, b) => a + (b ?? 0), 0)} hp${Math.round(res.sim.hero.hp / res.sim.hero.maxHp * 100)}`); break; }
        replays++;
        if (process.env.DBG) console.log(`LOSS n${n} t${Math.round(res.sim.time)} wave${res.sim.wave} boss${res.sim.bossEnt ? Math.round(res.sim.bossEnt.hp / res.sim.bossEnt.maxHp * 100) : '-'} enemiesAlive ${res.sim.alive(1)} allies ${res.sim.alive(0)} fallen ${res.sum.fallen} army ${E.armyCount(s)} gold ${s.gold} pw ${pw}`);
        if (replays > 30) { rows.push(`${n} STUCK`); break; }
        spend(s);
        // חוזרים לשלבים קודמים עד שהעוצמה חוזרת לרמה סבירה
        for (let g = 0; g < 12; g++) {
          let farm = 1;
          for (let k = n - 1; k >= 1; k--) if (E.recommendedPower(k) <= E.totalPower(s) * 0.9) { farm = k; break; }
          fight(s, farm, seed * 999 + n * 31 + replays);
          spend(s);
          if (E.totalPower(s) >= pw * 1.02) break;
          replays++;
        }
      }
      totalReplays += replays;
      if (replays > 30) break;
    }
    console.log(`--- seed ${seed} replays ${totalReplays}\n` + (process.env.FULL && seed === 1 ? rows.join('\n') : rows.map((r) => r.replace(/ hero.*? t/, ' t').replace(/lv\[.*?\]/, '')).join(' | ').replace(/ fallen /g, ' f').replace(/ r0/g, '').replace(/ t\d+/g, '')));
  }
});
