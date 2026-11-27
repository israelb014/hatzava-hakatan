// סימולציית הקרב - לוגיקה טהורה ללא תלות בתצוגה.
// הסצנה קוראת ל-step() ומציירת לפי הישויות והאירועים.
import { type EnemyId, type LevelDef, type Role, type UnitId, ENEMIES, UNITS, FORMATION_ORDER, HEAL_TARGETS, BOSS_SPECIAL, SKILL_CD } from './data';
import { type HeroStats, type Rng, unitMult, skillPower } from './economy';

/** רוחב שדה הקרב - רחב בהרבה מהמסך, המצלמה עוקבת אחרי הקרב */
export const FIELD_W = 3200;
/** שלושה נתיבי עומק על רצועת הקרקע */
export const LANES = [0.18, 0.5, 0.82];
/** גובה רצועת הקרקע ביחידות מרחק (להמרת y למרחק) */
const BAND = 150;
const HERO_MAX_X = FIELD_W - 260;
const SPAWN_MAX_X = FIELD_W - 720;

export interface Ent {
  id: number;
  side: 0 | 1; // 0 = שחקן, 1 = שדים
  kind: string;
  role: Role;
  x: number;
  y: number; // 0..1 עומק
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  range: number;
  speed: number;
  cd: number;
  timer: number;
  big: boolean;
  splash: number;
  knock: number;
  bonusBig: number;
  dead: boolean;
  hero: boolean;
  boss: boolean;
  target: Ent | null;
  retarget: number;
  swing: number;
  moving: boolean;
  face: 1 | -1;
  special: number;
  invuln: number;
  unitId: UnitId | null;
  /** רדיוס הגוף, למרווח בין חיילים */
  r: number;
}

export type SimEvent =
  | { t: 'spawn'; e: Ent }
  | { t: 'attack'; e: Ent }
  | { t: 'hit'; e: Ent; dmg: number; big: boolean; hero: boolean }
  | { t: 'heal'; e: Ent; amt: number }
  | { t: 'die'; e: Ent }
  | { t: 'shot'; kind: 'arrow' | 'bolt' | 'darrow' | 'heal'; x0: number; y0: number; x1: number; y1: number; dur: number; side: 0 | 1 }
  | { t: 'splash'; x: number; y: number; r: number }
  | { t: 'telegraph'; x: number; r: number; dur: number }
  | { t: 'blast'; x: number; r: number }
  | { t: 'wave'; n: number; total: number }
  | { t: 'skill'; i: number }
  | { t: 'potion' }
  | { t: 'heroDown' }
  | { t: 'revive' }
  | { t: 'end'; win: boolean };

interface Shot {
  kind: 'arrow' | 'bolt' | 'darrow';
  src: Ent;
  target: Ent;
  tx: number;
  t: number;
  dmg: number;
  splash: number;
}
interface Telegraph {
  x: number;
  r: number;
  t: number;
  dmg: number;
}

export interface BattleConfig {
  level: LevelDef;
  hero: HeroStats;
  army: Partial<Record<UnitId, { lvl: number; count: number }>>;
  skills: number[];
  potions: number;
  rng?: Rng;
  /** הגיבור נשלט אוטומטית (לבדיקות איזון) */
  autoHero?: boolean;
}

export class BattleSim {
  ents: Ent[] = [];
  events: SimEvent[] = [];
  hero!: Ent;
  wave = 0;
  totalWaves: number;
  state: 'run' | 'down' | 'win' | 'lose' = 'run';
  time = 0;
  heroMove = 0;
  skillCd = [0, 0, 0];
  buff = 0;
  potions: number;
  revived = false;
  kills = 0;
  skillsUsed = 0;
  potionsUsed = 0;
  sent: Partial<Record<UnitId, number>> = {};
  lost: Partial<Record<UnitId, number>> = {};
  bossEnt: Ent | null = null;
  private nextId = 1;
  private shots: Shot[] = [];
  private tele: Telegraph[] = [];
  private waveTimer = 0.6;
  private rng: Rng;
  private cfg: BattleConfig;
  private heroCd: number;
  private heroSpeed: number;

  constructor(cfg: BattleConfig) {
    this.cfg = cfg;
    this.rng = cfg.rng ?? Math.random;
    this.totalWaves = cfg.level.waves.length;
    this.potions = cfg.potions;
    const spdBonus = Math.max(0, cfg.hero.spd - 10);
    this.heroCd = 0.62 / (1 + spdBonus * 0.025);
    this.heroSpeed = 200 * (1 + spdBonus * 0.03);
    this.spawnArmy();
  }

  private mk(side: 0 | 1, kind: string, role: Role, x: number, y: number, hp: number, atk: number, def: number, range: number, speed: number, cd: number): Ent {
    const e: Ent = {
      id: this.nextId++,
      side,
      kind,
      role,
      x,
      y,
      hp,
      maxHp: hp,
      atk,
      def,
      range: range + (role === 'melee' ? this.rng() * 22 : role === 'boss' || role === 'hero' ? 0 : this.rng() * 50 - 25),
      speed: speed * (0.92 + this.rng() * 0.16),
      cd,
      timer: this.rng() * cd,
      big: false,
      splash: 0,
      knock: 0,
      bonusBig: 1,
      dead: false,
      hero: false,
      boss: false,
      target: null,
      retarget: this.rng() * 0.3,
      swing: -1,
      moving: false,
      face: side === 0 ? 1 : -1,
      special: 5,
      invuln: 0,
      unitId: null,
      r: 18,
    };
    this.ents.push(e);
    return e;
  }

  private spawnArmy() {
    const h = this.cfg.hero;
    // מערך: לכל חייל משבצת משלו - 3 נתיבי עומק ושורות זו מאחורי זו.
    // מהחזית לאחור: גיבור, ענקים, נושאי חנית, חרבנים, סמוראים, קשתים וקוסמים, מרפאות.
    const list: UnitId[] = [];
    for (const id of FORMATION_ORDER) {
      const a = this.cfg.army[id];
      if (!a || a.count <= 0) continue;
      this.sent[id] = a.count;
      for (let i = 0; i < a.count; i++) list.push(id);
    }
    const rows = Math.ceil(list.length / LANES.length);
    const gap = Math.max(34, Math.min(58, 1400 / Math.max(1, rows)));
    let len = 0;
    const rowX: number[] = [];
    let prevRole: Role | null = null;
    for (let r = 0; r < rows; r++) {
      const d = UNITS[list[r * LANES.length]];
      if (prevRole && prevRole !== d.role) len += 26;
      prevRole = d.role;
      len += d.big ? gap * 1.35 : gap;
      rowX.push(len);
    }
    const front = Math.max(700, 70 + len);
    this.hero = this.mk(0, 'hero', 'hero', front + 34, 0.5, h.hp, h.atk, h.def, 78, this.heroSpeed, this.heroCd);
    this.hero.hero = true;
    this.hero.speed = this.heroSpeed;
    this.hero.timer = 0;
    this.hero.r = 22;
    list.forEach((id, i) => {
      const d = UNITS[id];
      const a = this.cfg.army[id]!;
      const m = unitMult(a.lvl);
      const row = Math.floor(i / LANES.length);
      const lane = i % LANES.length;
      const x = front - rowX[row] + (this.rng() - 0.5) * 12 + (lane === 1 ? 10 : 0);
      const y = LANES[lane] + (this.rng() - 0.5) * 0.1;
      const e = this.mk(0, id, d.role, Math.max(30, x), y, d.hp * m, d.atk * m, d.def * m, d.range, d.speed, d.cd);
      e.unitId = id;
      e.big = !!d.big;
      e.r = d.big ? 28 : 18;
      e.splash = d.splash ?? 0;
      e.knock = d.knock ?? 0;
      e.bonusBig = d.bonusBig ?? 1;
    });
    for (const e of this.ents) this.events.push({ t: 'spawn', e });
  }

  private spawnEnemy(kind: EnemyId, x: number, y: number): Ent {
    const d = ENEMIES[kind];
    const lv = this.cfg.level;
    const e = this.mk(1, kind, d.role, x, y, d.hp * lv.mult, d.atk * lv.atkMult, d.def * (1 + (lv.mult - 1) * 0.3), d.range, d.speed, d.cd);
    e.big = !!d.big;
    e.knock = d.knock ?? 0;
    e.r = d.role === 'boss' ? 46 : d.big ? 28 : kind === 'imp' ? 15 : 18;
    if (d.role === 'boss') {
      e.boss = true;
      this.bossEnt = e;
      e.special = 6;
    }
    this.events.push({ t: 'spawn', e });
    return e;
  }

  private spawnWave() {
    const groups = this.cfg.level.waves[this.wave];
    this.wave++;
    this.events.push({ t: 'wave', n: this.wave, total: this.totalWaves });
    const list: EnemyId[] = [];
    for (const g of groups) for (let i = 0; i < g.count; i++) list.push(g.kind);
    // סדר: מהירים מלפנים, יורים מאחור, בוס בסוף
    const order = (k: EnemyId) => (ENEMIES[k].role === 'boss' ? 3 : ENEMIES[k].role === 'ranged' ? 2 : k === 'brute' ? 1 : 0);
    list.sort((a, b) => order(a) - order(b));
    // האויבים מופיעים מחוץ למסך מימין, בתוך גבולות השדה, בשלושה נתיבים
    const base = Math.min(SPAWN_MAX_X, Math.max(this.hero.x, this.frontX(0)) + 960);
    let n = 0;
    for (const k of list) {
      const boss = ENEMIES[k].role === 'boss';
      // הבוס מגיע אחרי המלווים שלו
      const x = base + Math.floor(n / LANES.length) * 54 + this.rng() * 24 + (boss ? 240 : 0);
      const y = boss ? 0.5 : LANES[n % LANES.length] + (this.rng() - 0.5) * 0.14;
      if (!boss) n++;
      this.spawnEnemy(k, Math.min(FIELD_W - 50, x), Math.min(0.97, Math.max(0.03, y)));
    }
  }

  private frontX(side: 0 | 1): number {
    let best = side === 0 ? 0 : FIELD_W;
    for (const e of this.ents) {
      if (e.dead || e.side !== side) continue;
      if (side === 0 ? e.x > best : e.x < best) best = e.x;
    }
    return best;
  }

  alive(side: 0 | 1): number {
    let n = 0;
    for (const e of this.ents) if (!e.dead && e.side === side && !e.hero) n++;
    return n;
  }

  /** כמה אויבים נותרו בסך הכול (כולל גלים שטרם הגיעו) */
  enemiesTotal(): number {
    let n = 0;
    for (const w of this.cfg.level.waves) for (const g of w) n += g.count;
    return n;
  }

  private nearest(e: Ent): Ent | null {
    let best: Ent | null = null;
    let bd = 1e9;
    for (const o of this.ents) {
      if (o.dead || o.side === e.side) continue;
      // העדפה לאויב באותו נתיב
      const d = Math.abs(o.x - e.x) + Math.abs(o.y - e.y) * 90;
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  private dmg(src: Ent, tgt: Ent, base: number, big = false) {
    if (tgt.dead || tgt.invuln > 0) return;
    let d = base * (0.9 + this.rng() * 0.2);
    if (src.side === 0 && this.buff > 0) d *= 1.3;
    if (tgt.big && src.bonusBig > 1) d *= src.bonusBig;
    d = Math.max(1, (d * 100) / (100 + tgt.def));
    tgt.hp -= d;
    this.events.push({ t: 'hit', e: tgt, dmg: Math.round(d), big, hero: src.hero });
    if (src.knock > 0 && !tgt.boss && !tgt.hero) {
      tgt.x += (src.side === 0 ? 1 : -1) * src.knock * (tgt.big ? 0.4 : 1);
      tgt.x = Math.max(20, Math.min(FIELD_W - 30, tgt.x));
    }
    if (tgt.hp <= 0) this.kill(tgt);
  }

  private kill(e: Ent) {
    e.hp = 0;
    if (e.hero) {
      if (this.state === 'run') {
        this.state = 'down';
        this.events.push({ t: 'heroDown' });
      }
      return;
    }
    e.dead = true;
    this.events.push({ t: 'die', e });
    if (e.side === 1) this.kills++;
    else if (e.unitId) this.lost[e.unitId] = (this.lost[e.unitId] ?? 0) + 1;
  }

  private heal(e: Ent, amt: number) {
    if (e.dead || e.hp >= e.maxHp) return;
    const a = Math.min(amt, e.maxHp - e.hp);
    e.hp += a;
    this.events.push({ t: 'heal', e, amt: Math.round(a) });
  }

  // ----- פעולות שחקן -----
  useSkill(i: number): boolean {
    if (this.state !== 'run' || this.skillCd[i] > 0) return false;
    const p = skillPower(this.cfg.skills[i] ?? 1);
    const h = this.hero;
    this.skillCd[i] = SKILL_CD[i];
    this.skillsUsed++;
    this.events.push({ t: 'skill', i });
    if (i === 0) {
      for (const o of this.ents) {
        if (o.dead || o.side !== 1) continue;
        if (Math.abs(o.x - h.x) <= 170) {
          this.dmg(h, o, h.atk * 2.6 * p, true);
          if (!o.boss && !o.dead) o.x = Math.max(20, Math.min(FIELD_W - 30, o.x + (o.x >= h.x ? 1 : -1) * 45));
        }
      }
    } else if (i === 1) {
      this.buff = 6 + (p - 1) * 4;
    } else {
      this.heal(h, h.maxHp * 0.32 * p);
      for (const o of this.ents) {
        if (o.dead || o.side !== 0 || o.hero) continue;
        if (Math.abs(o.x - h.x) <= 260) this.heal(o, o.maxHp * 0.35 * p);
      }
    }
    return true;
  }

  /** תקיפה יזומה של הגיבור (מקש רווח) - מניף חרב גם ללא אויב בטווח */
  heroStrike(): boolean {
    const h = this.hero;
    if (this.state !== 'run' || h.timer > 0 || h.swing >= 0) return false;
    h.timer = h.cd;
    h.swing = 0.14;
    this.events.push({ t: 'attack', e: h });
    return true;
  }

  usePotion(): boolean {
    if (this.state !== 'run' || this.potions <= 0 || this.hero.hp >= this.hero.maxHp) return false;
    this.potions--;
    this.potionsUsed++;
    this.events.push({ t: 'potion' });
    this.heal(this.hero, this.hero.maxHp * 0.4);
    return true;
  }

  revive() {
    if (this.state !== 'down' || this.revived) return;
    this.revived = true;
    this.state = 'run';
    const h = this.hero;
    h.hp = h.maxHp * 0.6;
    h.invuln = 2.5;
    for (const o of this.ents) if (!o.dead && o.side === 1 && !o.boss && Math.abs(o.x - h.x) < 200) o.x = Math.min(FIELD_W - 30, o.x + 120);
    this.events.push({ t: 'revive' });
  }

  giveUp() {
    if (this.state === 'run' || this.state === 'down') {
      this.state = 'lose';
      this.events.push({ t: 'end', win: false });
    }
  }

  // ----- צעד סימולציה -----
  step(dt: number) {
    if (this.state !== 'run') return;
    this.time += dt;
    for (let i = 0; i < 3; i++) if (this.skillCd[i] > 0) this.skillCd[i] = Math.max(0, this.skillCd[i] - dt);
    if (this.buff > 0) this.buff -= dt;

    // גלים
    let enemiesAlive = 0;
    for (const e of this.ents) if (!e.dead && e.side === 1) enemiesAlive++;
    if (enemiesAlive === 0) {
      if (this.wave >= this.totalWaves) {
        this.state = 'win';
        this.events.push({ t: 'end', win: true });
        return;
      }
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.spawnWave();
        this.waveTimer = 1.4;
      }
    }

    if (this.cfg.autoHero) this.autoHero();

    for (const e of this.ents) {
      if (e.dead) continue;
      if (e.invuln > 0) e.invuln -= dt;
      e.timer -= dt;
      if (e.swing >= 0) {
        e.swing -= dt;
        if (e.swing < 0) this.resolveSwing(e);
      }
      e.retarget -= dt;
      if (e.retarget <= 0 || !e.target || e.target.dead) {
        e.target = e.role === 'healer' ? this.healTarget(e) : this.nearest(e);
        e.retarget = 0.25 + this.rng() * 0.15;
      }
      if (e.hero) this.stepHero(e, dt);
      else if (e.role === 'healer') this.stepHealer(e, dt);
      else this.stepUnit(e, dt);
      if (this.state !== 'run') break;
    }

    this.separate(dt);

    // קליעים
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.t -= dt;
      if (s.t > 0) continue;
      this.shots.splice(i, 1);
      if (s.splash > 0) {
        const cx = s.target.dead ? s.tx : s.target.x;
        this.events.push({ t: 'splash', x: cx, y: s.target.y, r: s.splash });
        for (const o of this.ents) {
          if (o.dead || o.side === s.src.side) continue;
          if (Math.abs(o.x - cx) <= s.splash) this.dmg(s.src, o, o === s.target ? s.dmg : s.dmg * 0.6);
        }
      } else if (!s.target.dead) this.dmg(s.src, s.target, s.dmg);
    }
    // התקפות אזור של בוסים
    for (let i = this.tele.length - 1; i >= 0; i--) {
      const t = this.tele[i];
      t.t -= dt;
      if (t.t > 0) continue;
      this.tele.splice(i, 1);
      this.events.push({ t: 'blast', x: t.x, r: t.r });
      const src = this.bossEnt ?? this.hero;
      for (const o of this.ents) {
        if (o.dead || o.side !== 0) continue;
        if (Math.abs(o.x - t.x) <= t.r) {
          if (o.invuln > 0) continue;
          const d = Math.max(1, (t.dmg * (o.hero ? 1 : 0.5) * 100) / (100 + o.def));
          o.hp -= d;
          this.events.push({ t: 'hit', e: o, dmg: Math.round(d), big: true, hero: false });
          if (o.hp <= 0) this.kill(o);
        }
      }
      void src;
    }
  }

  private resolveSwing(e: Ent) {
    const t = e.target;
    if (e.hero) {
      // הגיבור פוגע בעד 3 אויבים בטווח
      let n = 0;
      const list = this.ents.filter((o) => !o.dead && o.side === 1 && Math.abs(o.x - e.x) <= e.range + 25).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x));
      for (const o of list) {
        if (n >= 3) break;
        this.dmg(e, o, e.atk * (n === 0 ? 1 : 0.6));
        n++;
      }
      return;
    }
    if (e.boss) {
      const near = this.ents.filter((o) => !o.dead && o.side !== e.side && Math.abs(o.x - e.x) <= e.range + 20).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x));
      for (let i = 0; i < near.length && i < 4; i++) this.dmg(e, near[i], e.atk, true);
      return;
    }
    if (!t || t.dead) return;
    if (Math.abs(t.x - e.x) <= e.range + 60) this.dmg(e, t, e.atk, e.big);
  }

  private stepHero(e: Ent, dt: number) {
    e.moving = false;
    if (this.heroMove !== 0) {
      e.x = Math.max(40, Math.min(HERO_MAX_X, e.x + this.heroMove * e.speed * dt));
      e.face = this.heroMove > 0 ? 1 : -1;
      e.moving = true;
    }
    const t = e.target;
    if (t && !t.dead && Math.abs(t.x - e.x) <= e.range && e.timer <= 0) {
      if (!e.moving) e.face = t.x >= e.x ? 1 : -1;
      e.timer = e.cd;
      e.swing = 0.14;
      this.events.push({ t: 'attack', e });
    }
  }

  private autoHero() {
    const h = this.hero;
    const t = h.target;
    this.heroMove = 0;
    if (t && !t.dead) {
      const d = t.x - h.x;
      if (Math.abs(d) > h.range - 10) this.heroMove = d > 0 ? 1 : -1;
      // לא להתרחק מדי מהצבא
      const front = this.frontAllies();
      if (this.heroMove > 0 && h.x > front + 60 && this.alive(0) > 0) this.heroMove = 0;
      if (Math.abs(d) < 170) {
        this.useSkill(0);
        this.useSkill(1);
      }
    }
    // התחמקות מהתקפת אזור
    for (const tl of this.tele) {
      if (Math.abs(h.x - tl.x) < tl.r + 25) this.heroMove = h.x >= tl.x && h.x < HERO_MAX_X - 60 ? 1 : -1;
    }
    if (h.hp < h.maxHp * 0.6) this.useSkill(2);
    if (h.hp < h.maxHp * 0.4) this.usePotion();
  }

  private frontAllies(): number {
    let best = 0;
    for (const e of this.ents) if (!e.dead && e.side === 0 && !e.hero && e.role === 'melee' && e.x > best) best = e.x;
    return best || this.hero.x;
  }

  private healTarget(e: Ent, skip: Ent | null = null): Ent | null {
    let best: Ent | null = null;
    let br = 0.92;
    for (const o of this.ents) {
      if (o.dead || o.side !== e.side || o === e || o === skip) continue;
      if (Math.abs(o.x - e.x) > e.range + (skip ? 0 : 120)) continue;
      const r = o.hp / o.maxHp;
      if (r < br) {
        br = r;
        best = o;
      }
    }
    return best;
  }

  private stepHealer(e: Ent, dt: number) {
    e.moving = false;
    const t = e.target;
    if (t && !t.dead && t.hp < t.maxHp) {
      const d = Math.abs(t.x - e.x);
      if (d <= e.range) {
        if (e.timer <= 0) {
          e.timer = e.cd;
          e.face = t.x >= e.x ? 1 : -1;
          this.events.push({ t: 'attack', e });
          // מרפאת עד שני חיילים בבת אחת
          let cur: Ent | null = t;
          for (let i = 0; i < HEAL_TARGETS && cur; i++) {
            this.events.push({ t: 'shot', kind: 'heal', x0: e.x, y0: e.y, x1: cur.x, y1: cur.y, dur: 0.3, side: e.side });
            this.heal(cur, e.atk);
            cur = i === 0 ? this.healTarget(e, t) : null;
          }
        }
        return;
      }
      e.x += Math.sign(t.x - e.x) * e.speed * dt;
      e.face = t.x >= e.x ? 1 : -1;
      e.moving = true;
      return;
    }
    // ללא פצועים - נשארת מאחורי החזית
    const front = this.frontAllies();
    const goal = front - 230;
    if (Math.abs(goal - e.x) > 40) {
      e.x += Math.sign(goal - e.x) * e.speed * dt;
      e.face = goal >= e.x ? 1 : -1;
      e.moving = true;
    } else e.face = 1;
  }

  /** מרווח מינימלי בין חיילים מאותו צד, כדי שלא ייערמו זה על זה */
  private separate(dt: number) {
    const list = this.ents;
    const n = list.length;
    const k = Math.min(1, dt * 9);
    for (let i = 0; i < n; i++) {
      const a = list[i];
      if (a.dead || a.boss) continue;
      for (let j = i + 1; j < n; j++) {
        const b = list[j];
        if (b.dead || b.boss || b.side !== a.side) continue;
        const dx = a.x - b.x;
        const rx = a.r + b.r;
        if (dx > rx || dx < -rx) continue;
        const ry = rx * 0.55;
        const dy = (a.y - b.y) * BAND;
        if (dy > ry || dy < -ry) continue;
        const nx = dx / rx;
        const ny = dy / ry;
        const d2 = nx * nx + ny * ny;
        if (d2 >= 1) continue;
        const d = Math.sqrt(d2) || 0.001;
        const push = (1 - d) * k * 0.5;
        // אם שניהם בדיוק באותה נקודה - דוחפים לפי המזהה
        const ux = d2 < 1e-6 ? (a.id < b.id ? -1 : 1) : nx / d;
        const uy = d2 < 1e-6 ? (a.id % 2 ? 1 : -1) : ny / d;
        const px = ux * push * rx;
        const py = (uy * push * ry) / BAND;
        if (!a.hero) {
          a.x += px * (a.swing >= 0 ? 0.3 : 1);
          a.y += py;
        }
        if (!b.hero) {
          b.x -= px * (b.swing >= 0 ? 0.3 : 1);
          b.y -= py;
        }
      }
    }
    for (const e of list) {
      if (e.dead) continue;
      if (e.y < 0.03) e.y = 0.03;
      else if (e.y > 0.97) e.y = 0.97;
      if (e.x < 20) e.x = 20;
      else if (e.x > FIELD_W - 30) e.x = FIELD_W - 30;
    }
  }

  /** מרכז הקרב: בין חזית הצבא לאויב הקרוב - המצלמה מתמקדת בו */
  clashX(): number {
    const front = Math.max(this.hero.x, this.frontAllies());
    let enemy = Infinity;
    for (const e of this.ents) if (!e.dead && e.side === 1 && e.x < enemy) enemy = e.x;
    if (enemy === Infinity || enemy - front > 900) return front + 160;
    return (front + enemy) / 2;
  }

  private stepUnit(e: Ent, dt: number) {
    e.moving = false;
    const dir = e.side === 0 ? 1 : -1;
    const t = e.target;
    if (!t || t.dead) {
      // אין אויב: צבא השחקן מתקבץ ליד הגיבור
      if (e.side === 0) {
        const goal = this.hero.x + (e.role === 'melee' ? -30 : -190);
        if (Math.abs(goal - e.x) > 90) {
          e.x += Math.sign(goal - e.x) * e.speed * dt;
          e.face = goal >= e.x ? 1 : -1;
          e.moving = true;
        } else e.face = 1;
      }
      return;
    }
    const d = Math.abs(t.x - e.x);
    const toward = t.x >= e.x ? 1 : -1;
    if (e.boss) this.bossSpecial(e, dt);
    if (d <= e.range) {
      e.face = toward;
      if (e.timer <= 0 && e.swing < 0) {
        e.timer = e.cd;
        this.events.push({ t: 'attack', e });
        if (e.role === 'ranged' || e.role === 'mage') {
          const dur = 0.25 + d / 700;
          const kind = e.role === 'mage' ? 'bolt' : e.side === 0 ? 'arrow' : 'darrow';
          this.shots.push({ kind, src: e, target: t, tx: t.x, t: dur, dmg: e.atk, splash: e.splash });
          this.events.push({ t: 'shot', kind, x0: e.x, y0: e.y, x1: t.x, y1: t.y, dur, side: e.side });
        } else {
          e.swing = e.boss ? 0.35 : 0.16;
        }
      }
      // לוחמי קרב פנים נפרסים לאורך החזית אל מול היריב שלהם
      if (e.role === 'melee' && !t.boss) {
        const dy = t.y - e.y;
        if (dy > 0.04 || dy < -0.04) e.y += Math.sign(dy) * Math.min(Math.abs(dy), 0.35 * dt);
      }
      // יורים שומרים מרחק
      if ((e.role === 'ranged' || e.role === 'mage') && d < e.range * 0.33) {
        const nx = e.x - toward * e.speed * 0.55 * dt;
        if (nx > 30 && nx < FIELD_W - 30) {
          e.x = nx;
          e.moving = true;
        }
      }
      return;
    }
    e.x += toward * e.speed * dt;
    e.face = toward;
    e.moving = true;
    void dir;
  }

  private bossSpecial(e: Ent, dt: number) {
    e.special -= dt;
    if (e.special > 0) return;
    e.special = 7.5;
    const kind = BOSS_SPECIAL[e.kind] ?? 'blast';
    if (kind === 'summon' || kind === 'both') {
      const n = kind === 'both' ? 2 : 3;
      for (let i = 0; i < n; i++) this.spawnEnemy('imp', e.x + 30 + this.rng() * 60, 0.1 + this.rng() * 0.8);
    }
    if (kind === 'blast' || kind === 'both') {
      const r = 135;
      this.tele.push({ x: this.hero.x, r, t: 1.25, dmg: e.atk * 1.6 });
      this.events.push({ t: 'telegraph', x: this.hero.x, r, dur: 1.25 });
    }
  }

  outcome() {
    return {
      win: this.state === 'win',
      heroHpPct: Math.max(0, this.hero.hp / this.hero.maxHp),
      sent: this.sent,
      lost: this.lost,
      kills: this.kills,
      skillsUsed: this.skillsUsed,
      potionsUsed: this.potionsUsed,
    };
  }

  /** מריץ קרב שלם ללא תצוגה */
  static autoRun(cfg: BattleConfig, maxTime = 400): BattleSim {
    const sim = new BattleSim({ ...cfg, autoHero: true });
    while (sim.state === 'run' && sim.time < maxTime) {
      sim.step(0.05);
      sim.events.length = 0;
      if ((sim.state as string) === 'down') sim.giveUp();
    }
    if (sim.state === 'run') sim.giveUp();
    return sim;
  }
}
