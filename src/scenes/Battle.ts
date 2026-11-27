// מסך הקרב (כולל קרב בוס, ניצחון והפסד)
import Phaser from 'phaser';
import { G, V, W, H, L, R, go, setupScene, fmt, persist } from '../core';
import { img, setFrame, FRAMES } from '../art/svg';
import { Puppet } from '../art/puppet';
import { CHARS } from '../art/chars';
import { Scenery } from '../ui/scenery';
import { button, txt, C, nine, modal, roundBtn, bar, setT, versionLabel, toast, type Bar, type Modal } from '../ui/widgets';
import { levelDef, ENEMIES, UNITS, UNIT_IDS, RARITY_COLORS, RARITY_NAMES, SKILL_CD, LEVEL_COUNT, itemName, type LevelDef } from '../game/data';
import { heroStats, applyBattle, REVIVE_COST, BASE_POTIONS, type BattleSummary } from '../game/economy';
import { BattleSim, FIELD_W, type Ent, type SimEvent } from '../game/sim';
import { audio } from '../audio';
import { itemIcon } from './Hero';

// רצועת הקרקע שעליה נלחמים - מעל כפתורי הכישורים והתנועה
const GROUND_TOP = 372;
const Y0 = 398;
const Y1 = 560;
/** בקרב החיילים קטנים מעט, כדי שצבא גדול יישאר קריא; הגיבור גדול יותר */
const UNIT_SCALE = 0.86;
const HERO_SCALE = 1.2;
const MAX_NUMS = 12;
const yOf = (e: Ent) => Y0 + e.y * (Y1 - Y0);

function fallenText(fallen: number, back: number, many: string, one: string): string {
  const a = fallen === 1 ? 'נפל חייל אחד' : `נפלו ${fallen} חיילים`;
  if (back <= 0) return a;
  return `${a} · ${back === 1 ? `אחד ${one}` : `${back} ${many}`}`;
}

interface Fx {
  im: Phaser.GameObjects.Image;
  wx: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  s0: number;
  s1: number;
  rot: number;
  a0: number;
  base: number;
  screen: boolean;
}
interface Proj {
  im: Phaser.GameObjects.Image;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  arc: number;
}
interface Num {
  bt: Phaser.GameObjects.BitmapText;
  wx: number;
  y: number;
  life: number;
}

export class BattleScene extends Phaser.Scene {
  private level = 1;
  private potions0 = BASE_POTIONS;
  private lv!: LevelDef;
  private sim!: BattleSim;
  private scenery!: Scenery;
  private camX = 0;
  private puppets = new Map<number, Puppet>();
  private pool: Puppet[] = [];
  private dying: { p: Puppet; wx: number }[] = [];
  private fx: Fx[] = [];
  private fxPool: Phaser.GameObjects.Image[] = [];
  private projs: Proj[] = [];
  private projPool: Phaser.GameObjects.Image[] = [];
  private nums: Num[] = [];
  private numPool: Phaser.GameObjects.BitmapText[] = [];
  private tele: { im: Phaser.GameObjects.Image; wx: number; t: number; dur: number; r: number }[] = [];
  private hpG!: Phaser.GameObjects.Graphics;
  private cdG!: Phaser.GameObjects.Graphics;
  private paused = false;
  private ended = false;
  private moveL = false;
  private moveR = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private heroBar!: Bar;
  private bossBar: Bar | null = null;
  private bossUi!: Phaser.GameObjects.Container;
  private waveT!: Phaser.GameObjects.Text;
  private allyT!: Phaser.GameObjects.Text;
  private enemyT!: Phaser.GameObjects.Text;
  private potT!: Phaser.GameObjects.Text;
  private cdT: Phaser.GameObjects.Text[] = [];
  private skillPos: [number, number][] = [];
  private totalAllies = 0;
  private totalEnemies = 0;
  private buffGlow!: Phaser.GameObjects.Image;
  private time0 = 0;
  private dmgAcc = new Map<number, { e: Ent; sum: number; big: boolean; t: number; h: number }>();
  private heroRing!: Phaser.GameObjects.Image;
  private hudBtns: { c: Phaser.GameObjects.Container; x: number; y: number }[] = [];

  constructor() {
    super('Battle');
  }

  init(data: { level: number; potions?: number }) {
    this.level = data.level;
    this.potions0 = data.potions ?? BASE_POTIONS;
  }

  create() {
    const s = G.save;
    this.lv = levelDef(this.level);
    const boss = !!this.lv.boss;
    audio.setMode(boss ? 'boss' : 'battle');
    this.puppets.clear();
    this.pool = [];
    this.dying = [];
    this.fx = [];
    this.fxPool = [];
    this.projs = [];
    this.projPool = [];
    this.nums = [];
    this.numPool = [];
    this.tele = [];
    this.cdT = [];
    this.paused = false;
    this.ended = false;
    this.moveL = this.moveR = false;
    this.camX = 0;
    this.time0 = 0;
    this.dmgAcc.clear();

    this.hudBtns = [];
    this.scenery = new Scenery(this, this.lv.region, boss, GROUND_TOP);
    this.heroRing = img(this, 0, 0, 'ringflat', 1.05).setTint(0xffe27a).setDepth(6);
    this.buffGlow = img(this, 0, 0, 'glow', 5).setTint(0xffd23e).setAlpha(0).setDepth(6);
    this.hpG = this.add.graphics().setDepth(790);

    const army: Record<string, { lvl: number; count: number }> = {};
    for (const id of UNIT_IDS) if (s.units[id].count > 0) army[id] = { ...s.units[id] };
    this.sim = new BattleSim({ level: this.lv, hero: heroStats(s), army, skills: s.skills, potions: this.potions0 });
    this.totalAllies = this.sim.alive(0);
    this.totalEnemies = this.sim.enemiesTotal();
    this.buildHud(boss);
    this.handleEvents();
    this.syncPuppets(0);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('LEFT,RIGHT,A,D,SPACE,ONE,TWO,THREE,Q,ESC,P', false) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-ONE', () => this.skill(0));
    kb.on('keydown-TWO', () => this.skill(1));
    kb.on('keydown-THREE', () => this.skill(2));
    kb.on('keydown-Q', () => this.potion());
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners());

    if (this.level === 1 && s.stars[0] === 0) {
      const tip = this.add.container(W / 2, 596).setDepth(950);
      const t = txt(this, 0, 0, 'הזז את הגיבור עם החצים · הפעל כישורים ושיקויים מימין', 22, C.cream, { weight: '700' });
      tip.add(nine(this, 0, 0, 'pill', t.width + 40, 48, 20));
      tip.add(t);
      this.tweens.add({ targets: tip, alpha: 0, delay: 6500, duration: 600, onComplete: () => tip.destroy() });
    }
    setupScene(this);
  }

  /** שינוי גודל חלון באמצע קרב: רק מיישרים מחדש את המצלמה, הקרב ממשיך */
  onResize() {
    const cam = this.cameras.main;
    cam.setZoom(G.res);
    cam.centerOn(W / 2, H / 2);
  }

  // ---------- HUD ----------
  private buildHud(boss: boolean) {
    const D = 900;
    roundBtn(this, L(54), 52, 'round_dark', 'ic_pause', 68, () => this.togglePause()).setDepth(D);
    nine(this, L(160), 52, 'pill', 120, 46, 20).setDepth(D);
    this.waveT = txt(this, L(160), 52, '', 23, C.cream, { weight: '900' }).setDepth(D);
    // גיבור
    nine(this, R(1126), 40, 'pill', 280, 50, 20).setDepth(D);
    this.heroBar = bar(this, R(1040), 28, 220, 24, 0x6fd04a, '', 16);
    this.heroBar.g.setDepth(D);
    this.heroBar.t!.setDepth(D);
    img(this, R(1006), 46, 'portrait_ring', 0.66).setDepth(D);
    img(this, R(1005), 66, 'hero_head', 0.8).setDepth(D);
    nine(this, R(1196), 92, 'pill', 132, 40, 18).setDepth(D);
    img(this, R(1240), 92, 'ic_helmet', 0.5).setDepth(D);
    this.allyT = txt(this, R(1218), 92, '', 20, C.cream, { ox: 1, weight: '900' }).setDepth(D);
    nine(this, R(1196), 138, 'pill', 132, 40, 18).setDepth(D);
    img(this, R(1240), 138, 'ic_boss', 0.5).setDepth(D);
    this.enemyT = txt(this, R(1218), 138, '', 20, '#ff9a88', { ox: 1, weight: '900' }).setDepth(D);
    // בוס
    this.bossUi = this.add.container(W / 2, 0).setDepth(D).setVisible(false);
    if (boss) {
      this.bossUi.add(nine(this, 0, 40, 'banner', 460, 78, 90, 0, 0));
      this.bossUi.add(txt(this, 0, 30, `בוס: ${ENEMIES[this.lv.boss!].name}`, 30, C.ink, { weight: '900' }));
      this.bossBar = bar(this, -300, 82, 600, 24, 0xe0342c);
      this.bossUi.add(this.bossBar.g);
    }
    // תנועה
    const mv = (x: number, icon: string, set: (v: boolean) => void) => {
      const c = this.add.container(x, 640).setDepth(D);
      this.hudBtns.push({ c, x, y: 640 });
      c.add(img(this, 0, 0, 'round_dark', 1.12).setAlpha(0.9));
      c.add(img(this, 0, 0, icon, 1.2));
      c.setSize(124, 124).setInteractive();
      c.on('pointerdown', () => {
        set(true);
        c.setScale(0.93);
      });
      const off = () => {
        set(false);
        c.setScale(1);
      };
      c.on('pointerup', off);
      c.on('pointerout', off);
    };
    mv(L(84), 'ic_left', (v) => (this.moveL = v));
    mv(L(218), 'ic_right', (v) => (this.moveR = v));
    // כישורים ושיקוי
    this.cdG = this.add.graphics().setDepth(D + 1);
    const keys = ['round_orange', 'round_blue', 'round_teal'];
    // כפתורי הכישורים והשיקוי קטנים ב-15% ומעוגנים לפינה הימנית
    for (let i = 0; i < 3; i++) {
      const x = R(1132 - (2 - i) * 100);
      this.skillPos.length = 3;
      this.skillPos[i] = [x, 656];
      const b = roundBtn(this, x, 656, keys[i], `ic_skill${i}`, 92, () => this.skill(i)).setDepth(D);
      this.hudBtns.push({ c: b, x, y: 656 });
      this.cdT[i] = txt(this, x, 656, '', 29, C.cream, { weight: '900' }).setDepth(D + 2);
    }
    const px = R(1228);
    const pot = roundBtn(this, px, 660, 'round_dark', 'ic_potion', 82, () => this.potion()).setDepth(D);
    this.hudBtns.push({ c: pot, x: px, y: 660 });
    img(this, px + 30, 630, 'round_red', 0.32).setDepth(D + 1);
    this.potT = txt(this, px + 30, 629, '', 18, C.cream, { weight: '900' }).setDepth(D + 2);
    versionLabel(this);
  }

  private skill(i: number) {
    if (this.paused || this.ended) return;
    if (!this.sim.useSkill(i)) audio.play('error');
  }

  private potion() {
    if (this.paused || this.ended) return;
    if (!this.sim.usePotion()) {
      audio.play('error');
      if (this.sim.potions <= 0) toast(this, 'נגמרו השיקויים');
    }
  }

  private togglePause() {
    if (this.ended || this.paused) return;
    this.paused = true;
    const m = modal(this, 460, 340, 'הקרב מושהה', () => (this.paused = false), false);
    m.c.add(
      button(this, 0, -10, 300, 76, 'המשך', 'green', () => m.close(), { size: 36 }),
    );
    m.c.add(
      button(this, 0, 84, 300, 66, 'נסיגה', 'red', () => {
        m.close();
        this.sim.giveUp();
      }, { size: 30 }),
    );
  }

  // ---------- לולאה ----------
  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.scenery.tick(dt);
    if (!this.paused) {
      if (!this.ended && this.sim.state === 'run') {
        const k = this.keys;
        const l = this.moveL || k.LEFT.isDown || k.A.isDown;
        const r = this.moveR || k.RIGHT.isDown || k.D.isDown;
        this.sim.heroMove = l === r ? 0 : l ? -1 : 1;
        if (k.SPACE.isDown) this.sim.heroStrike();
        this.sim.step(dt);
        this.time0 += dt;
      }
      this.handleEvents();
      this.syncPuppets(dt);
      this.tickFx(dt);
    }
    this.updateHud();
  }

  private onScreen(wx: number) {
    const x = wx - this.camX;
    return x > -V.ex - 80 && x < W + V.ex + 80;
  }

  private getPuppet(e: Ent): Puppet {
    let p = this.pool.pop();
    // הגיבור גדול מעט יותר כדי שתמיד יהיה קל למצוא אותו
    const k = e.hero ? HERO_SCALE : e.boss ? 1 : UNIT_SCALE;
    if (p) p.setChar(e.kind, k).setVisible(true).setActive(true);
    else p = new Puppet(this, e.kind).setChar(e.kind, k);
    p.face(e.face);
    this.puppets.set(e.id, p);
    return p;
  }

  private handleEvents() {
    const ev = this.sim.events;
    for (let i = 0; i < ev.length; i++) this.onEvent(ev[i]);
    ev.length = 0;
  }

  private onEvent(e: SimEvent) {
    switch (e.t) {
      case 'spawn': {
        this.getPuppet(e.e);
        if (e.e.boss) {
          this.bossUi.setVisible(true);
          audio.play('boss');
          this.cameras.main.shake(500, 0.008);
          this.centerText(`${ENEMIES[this.lv.boss!].name} הגיע!`, '#ff6a55');
        }
        break;
      }
      case 'attack': {
        const p = this.puppets.get(e.e.id);
        if (!p) break;
        p.face(e.e.face);
        p.attack();
        if (!this.onScreen(e.e.x)) break;
        const st = p.def.style;
        audio.play(st === 'shoot' ? 'arrow' : st === 'cast' ? (e.e.role === 'healer' ? 'heal' : 'magic') : 'sword');
        if (e.e.hero) this.spawnFx('slash', e.e.x + e.e.face * 44, yOf(e.e) - 50, { life: 0.16, s0: 1.1, s1: 1.7, rot: e.e.face > 0 ? 0 : Math.PI, flipX: e.e.face < 0 });
        break;
      }
      case 'hit': {
        const p = this.puppets.get(e.e.id);
        p?.flash();
        if (!this.onScreen(e.e.x)) break;
        const y = yOf(e.e);
        const hh = 60 * (p?.baseScale ?? 1);
        // פגיעות באותה דמות בתוך 250 אלפיות שנייה מתאחדות למספר אחד
        const strong = e.big || e.hero;
        const acc = this.dmgAcc.get(e.e.id);
        if (acc) {
          acc.sum += e.dmg;
          acc.big = acc.big || strong;
        } else {
          this.dmgAcc.set(e.e.id, { e: e.e, sum: e.dmg, big: strong, t: this.time0, h: hh });
          this.spawnFx('spark', e.e.x + (Math.random() - 0.5) * 20, y - hh * 0.6, { life: 0.2, s0: 0.5, s1: e.big ? 1.6 : 1.0, rot: Math.random() * 3 });
        }
        audio.play('hit');
        if (e.e.hero) this.cameras.main.shake(90, 0.004);
        break;
      }
      case 'heal': {
        if (!this.onScreen(e.e.x)) break;
        const y = yOf(e.e);
        for (let i = 0; i < 3; i++) this.spawnFx('healfx', e.e.x + (Math.random() - 0.5) * 36, y - 20 - Math.random() * 40, { life: 0.7, vy: -50, s0: 0.5, s1: 0.9 });
        this.num(e.e.x, y - 80, '+' + e.amt, 0x7dfa9a, 0.44);
        break;
      }
      case 'die': {
        const p = this.puppets.get(e.e.id);
        if (p) {
          this.puppets.delete(e.e.id);
          p.die();
          this.dying.push({ p, wx: e.e.x });
        }
        if (this.onScreen(e.e.x)) audio.play('death');
        break;
      }
      case 'shot': {
        const hy = 44;
        const y0 = Y0 + e.y0 * (Y1 - Y0) - hy;
        const y1 = Y0 + e.y1 * (Y1 - Y0) - hy;
        const key = e.kind === 'heal' ? 'healfx' : e.kind;
        const im = this.projPool.pop() ?? this.add.image(0, 0, FRAMES.arrow.tex, 'arrow');
        setFrame(im, key, e.kind === 'bolt' ? 1.2 : 1);
        im.setVisible(true).setDepth(780);
        const dist = Math.abs(e.x1 - e.x0);
        this.projs.push({ im, x0: e.x0 + e.side * -0 + (e.side === 0 ? 18 : -18), y0, x1: e.x1, y1, t: 0, dur: e.dur, arc: e.kind === 'arrow' || e.kind === 'darrow' ? 30 + dist * 0.16 : 0 });
        break;
      }
      case 'splash': {
        const y = Y0 + e.y * (Y1 - Y0);
        this.spawnFx('ringflat', e.x, y - 6, { life: 0.35, s0: 0.3, s1: e.r / 48, tint: 0x7fd4ff });
        this.spawnFx('glow', e.x, y - 30, { life: 0.3, s0: 1, s1: 3, tint: 0x7fd4ff });
        break;
      }
      case 'telegraph': {
        const im = img(this, 0, (Y0 + Y1) / 2 + 6, 'ringflat', 1).setTint(0xff3a2a).setDepth(7);
        this.tele.push({ im, wx: e.x, t: 0, dur: e.dur, r: e.r });
        break;
      }
      case 'blast': {
        audio.play('blast');
        this.cameras.main.shake(260, 0.012);
        this.spawnFx('glow', e.x, (Y0 + Y1) / 2, { life: 0.45, s0: 2, s1: 9, tint: 0xff7a2a });
        for (let i = 0; i < 10; i++) this.spawnFx('spark', e.x + (Math.random() - 0.5) * e.r * 2, Y0 - 20 + Math.random() * (Y1 - Y0), { life: 0.5, s0: 0.8, s1: 2.2, vy: -80, rot: Math.random() * 3 });
        break;
      }
      case 'wave':
        if (!(this.lv.boss && e.n === e.total)) this.centerText(`גל ${e.n}/${e.total}`, C.cream);
        break;
      case 'skill': {
        const h = this.sim.hero;
        const y = yOf(h);
        audio.play(e.i === 1 ? 'horn' : e.i === 2 ? 'heal' : 'skill');
        if (e.i === 0) {
          this.cameras.main.shake(180, 0.008);
          this.spawnFx('ringflat', h.x, y - 8, { life: 0.4, s0: 0.5, s1: 3.6, tint: 0xfff0b0 });
          for (let i = 0; i < 6; i++) this.spawnFx('slash', h.x, y - 50, { life: 0.35, s0: 1.6, s1: 2.6, rot: (i / 6) * Math.PI * 2, spin: 14 });
        } else if (e.i === 1) {
          this.centerText('קריאת קרב!', C.gold);
          this.spawnFx('ringflat', h.x, y - 8, { life: 0.7, s0: 0.5, s1: 7, tint: 0xffd23e });
        } else {
          this.spawnFx('ringflat', h.x, y - 8, { life: 0.6, s0: 0.5, s1: 5.4, tint: 0x7dfa9a });
        }
        break;
      }
      case 'potion':
        audio.play('potion');
        break;
      case 'heroDown':
        this.heroDown();
        break;
      case 'revive': {
        const h = this.sim.hero;
        audio.play('upgrade');
        this.spawnFx('glow', h.x, yOf(h) - 50, { life: 0.8, s0: 2, s1: 8, tint: 0xfff0b0 });
        break;
      }
      case 'end':
        this.finish(e.win);
        break;
    }
  }

  private centerText(s: string, color: string) {
    const t = txt(this, W / 2, 250, s, 64, color, { weight: '900', sw: 10, shadow: true }).setDepth(940);
    t.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, y: 220, delay: 1100, duration: 350, onComplete: () => t.destroy() });
  }

  private spawnFx(key: string, wx: number, y: number, o: { life: number; s0?: number; s1?: number; vx?: number; vy?: number; g?: number; rot?: number; spin?: number; tint?: number; flipX?: boolean; a0?: number; screen?: boolean }) {
    if (this.fx.length > 140) return;
    const im = this.fxPool.pop() ?? this.add.image(0, 0, FRAMES.spark.tex, 'spark');
    setFrame(im, key);
    im.setVisible(true).setDepth(o.screen ? 1100 : 800).setAlpha(o.a0 ?? 1).setRotation(o.rot ?? 0);
    if (o.tint !== undefined) im.setTint(o.tint);
    else im.clearTint();
    im.setFlipX(false);
    const base = 1 / FRAMES[key].scale;
    this.fx.push({ im, wx, y, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, life: 0, max: o.life, s0: o.s0 ?? 1, s1: o.s1 ?? o.s0 ?? 1, rot: o.spin ?? 0, a0: o.a0 ?? 1, base, screen: !!o.screen });
    void o.flipX;
  }

  private num(wx: number, y: number, s: string, tint: number, scale: number) {
    // לכל היותר 12 מספרים על המסך: הוותיקים דועכים ראשונים
    const over = this.nums.length - (MAX_NUMS - 1);
    for (let i = 0; i < over; i++) this.nums[i].life = Math.max(this.nums[i].life, 0.62);
    if (this.nums.length >= MAX_NUMS) {
      const old = this.nums.shift()!;
      old.bt.setVisible(false);
      this.numPool.push(old.bt);
    }
    const bt = this.numPool.pop() ?? this.add.bitmapText(0, 0, 'digits', '').setOrigin(0.5).setDepth(850);
    bt.setText(s).setTint(tint).setScale(scale).setVisible(true).setAlpha(1);
    this.nums.push({ bt, wx: wx + (Math.random() - 0.5) * 24, y, life: 0 });
  }

  private syncPuppets(dt: number) {
    const sim = this.sim;
    const h = sim.hero;
    // המצלמה עוקבת בעדינות אחרי נקודה בין הגיבור לקו החזית, בתוך גבולות השדה,
    // כך שההתנגשות תמיד נראית במלואה סביב מרכז המסך
    const focus = (h.x + sim.clashX()) / 2;
    let left = focus - V.w / 2;
    left = Math.min(left, h.x - V.w * 0.16);
    left = Math.max(left, h.x - V.w * 0.84);
    left = Phaser.Math.Clamp(left, 0, FIELD_W - V.w);
    const target = left + V.ex;
    this.camX += (target - this.camX) * (dt === 0 ? 1 : Math.min(1, dt * 3.2));
    this.scenery.setScroll(this.camX - V.ex);
    const g = this.hpG;
    g.clear();
    for (const e of sim.ents) {
      if (e.dead) continue;
      const p = this.puppets.get(e.id);
      if (!p) continue;
      const x = e.x - this.camX;
      const vis = x > -V.ex - 160 && x < W + V.ex + 160;
      p.setVisible(vis);
      if (!vis) continue;
      const y = yOf(e);
      p.setPosition(x, y);
      // סדר ציור לפי גובה על המסך; הגיבור תמיד מעל שאר החיילים
      p.setDepth(e.hero ? 700 : y);
      p.moving = e.moving;
      if (p.facing !== e.face) p.face(e.face);
      p.tick(dt);
      if (e.invuln > 0) p.setAlpha(0.6 + Math.sin(this.time0 * 30) * 0.3);
      else if (p.alpha !== 1 && p.dying < 0) p.setAlpha(1);
      if (!e.boss && (e.hp < e.maxHp || e.hero)) {
        const bw = e.hero ? 74 : e.big ? 50 : 34;
        const bh = e.hero ? 8 : 5;
        const by = y - 84 * p.baseScale - (e.hero ? 14 : 8);
        g.fillStyle(0x2b1a10, 0.9).fillRect(x - bw / 2 - 1.5, by - 1.5, bw + 3, bh + 3);
        g.fillStyle(e.hero ? 0x4fd6ff : e.side === 0 ? 0x6fd04a : 0xe0342c, 1).fillRect(x - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), bh);
      }
    }
    // קריאת קרב - הילה מתחת לגיבור
    this.buffGlow.setAlpha(sim.buff > 0 ? 0.35 + Math.sin(this.time0 * 8) * 0.12 : 0).setPosition(h.x - this.camX, yOf(h) - 10);
    // טבעת זוהרת מתחת לרגלי הגיבור
    this.heroRing.setPosition(h.x - this.camX, yOf(h) - 2).setAlpha(0.6 + Math.sin(this.time0 * 4) * 0.25);
    // כפתורים נעשים שקופים מעט כשיש חיילים מאחוריהם
    for (const b of this.hudBtns) {
      let covered = false;
      for (const e of sim.ents) {
        if (e.dead) continue;
        const ex = e.x - this.camX;
        if (ex > b.x - 64 && ex < b.x + 64 && yOf(e) > b.y - 118) {
          covered = true;
          break;
        }
      }
      b.c.setAlpha(covered ? 0.62 : 1);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i];
      d.p.x = d.wx - this.camX;
      if (d.p.tick(dt)) {
        if (this.onScreen(d.wx)) this.spawnFx('poof', d.wx, d.p.y - 20, { life: 0.4, s0: 0.6, s1: 1.5 * d.p.def.scale, vy: -30 });
        d.p.setVisible(false).setActive(false);
        this.pool.push(d.p);
        this.dying.splice(i, 1);
      }
    }
  }

  private tickFx(dt: number) {
    for (const [id, a] of this.dmgAcc) {
      if (this.time0 - a.t < 0.25 && !this.ended) continue;
      this.dmgAcc.delete(id);
      // פגיעה רגילה קטנה; פגיעה חזקה או של הגיבור - גדולה וצהובה
      if (this.onScreen(a.e.x)) this.num(a.e.x, yOf(a.e) - a.h, String(a.sum), a.e.side === 0 ? 0xff6a55 : a.big ? 0xffd23e : 0xffffff, a.e.side === 1 && a.big ? 0.74 : a.e.hero ? 0.6 : 0.44);
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life += dt;
      const k = f.life / f.max;
      if (k >= 1) {
        f.im.setVisible(false);
        this.fxPool.push(f.im);
        this.fx.splice(i, 1);
        continue;
      }
      f.vy += f.g * dt;
      f.wx += f.vx * dt;
      f.y += f.vy * dt;
      f.im.setPosition(f.screen ? f.wx : f.wx - this.camX, f.y);
      f.im.setScale(f.base * (f.s0 + (f.s1 - f.s0) * k));
      f.im.rotation += f.rot * dt;
      f.im.setAlpha(f.a0 * (k < 0.5 ? 1 : 2 - 2 * k));
    }
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      const k = p.t / p.dur;
      if (k >= 1) {
        p.im.setVisible(false);
        this.projPool.push(p.im);
        this.projs.splice(i, 1);
        continue;
      }
      const x = p.x0 + (p.x1 - p.x0) * k;
      const y = p.y0 + (p.y1 - p.y0) * k - p.arc * 4 * k * (1 - k);
      const dy = (p.y1 - p.y0) / p.dur - (p.arc * 4 * (1 - 2 * k)) / p.dur;
      const dx = (p.x1 - p.x0) / p.dur;
      p.im.setPosition(x - this.camX, y);
      p.im.rotation = Math.atan2(dy, dx);
    }
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.life += dt;
      if (n.life > 0.85) {
        n.bt.setVisible(false);
        this.numPool.push(n.bt);
        this.nums.splice(i, 1);
        continue;
      }
      n.bt.setPosition(n.wx - this.camX, n.y - n.life * 64);
      n.bt.setAlpha(n.life < 0.6 ? 1 : Math.max(0, 1 - (n.life - 0.6) / 0.25));
    }
    for (let i = this.tele.length - 1; i >= 0; i--) {
      const t = this.tele[i];
      t.t += dt;
      if (t.t >= t.dur) {
        t.im.destroy();
        this.tele.splice(i, 1);
        continue;
      }
      const k = t.t / t.dur;
      t.im.setPosition(t.wx - this.camX, (Y0 + Y1) / 2 + 6);
      t.im.setScale(((t.r / 48) * (0.4 + 0.6 * k)) / 2, (2.4 * (0.4 + 0.6 * k)) / 2);
      t.im.setAlpha(0.35 + 0.5 * Math.abs(Math.sin(t.t * 14)));
    }
  }

  private updateHud() {
    const sim = this.sim;
    const h = sim.hero;
    this.heroBar.set(h.hp / h.maxHp, `${fmt(Math.max(0, h.hp))}/${fmt(h.maxHp)}`);
    setT(this.waveT, `גל ${Math.max(1, sim.wave)}/${sim.totalWaves}`);
    this.allyT.setText(`${sim.alive(0)}/${this.totalAllies}`);
    this.enemyT.setText(`${Math.max(0, this.totalEnemies - sim.kills)}/${this.totalEnemies}`);
    this.potT.setText(String(sim.potions));
    if (this.bossBar && sim.bossEnt) this.bossBar.set(sim.bossEnt.hp / sim.bossEnt.maxHp);
    const g = this.cdG;
    g.clear();
    for (let i = 0; i < 3; i++) {
      const cd = sim.skillCd[i];
      const [x, y] = this.skillPos[i];
      if (cd > 0) {
        g.fillStyle(0x1c1008, 0.72);
        g.slice(x, y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cd / SKILL_CD[i]), false);
        g.fillPath();
        this.cdT[i].setText(String(Math.ceil(cd)));
      } else this.cdT[i].setText('');
      // טבעת טעינה
      g.lineStyle(5, cd > 0 ? 0x7a6a55 : 0xfff3b0, cd > 0 ? 0.9 : 0.0);
      g.beginPath();
      g.arc(x, y, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd / SKILL_CD[i]), false);
      g.strokePath();
    }
  }

  // ---------- סיום ----------
  private heroDown() {
    const s = G.save;
    audio.play('defeat');
    this.cameras.main.shake(300, 0.01);
    if (this.sim.revived || s.gems < REVIVE_COST) {
      this.sim.giveUp();
      return;
    }
    this.paused = true;
    const m: Modal = modal(this, 520, 360, 'הגיבור נפל!', undefined, false);
    m.c.add(txt(this, 0, -40, 'להחיות את הגיבור ולהמשיך בקרב?', 24, C.ink, { weight: '700' }));
    m.c.add(
      button(this, 125, 70, 220, 84, 'החייה', 'green', () => {
        s.gems -= REVIVE_COST;
        persist();
        m.close();
        this.paused = false;
        this.sim.revive();
      }, { size: 30, sub: String(REVIVE_COST), subIcon: 'gem', subSize: 20 }),
    );
    m.c.add(
      button(this, -125, 70, 220, 84, 'ותר', 'grey', () => {
        m.close();
        this.paused = false;
        this.sim.giveUp();
      }, { size: 32 }),
    );
  }

  private finish(win: boolean) {
    if (this.ended) return;
    this.ended = true;
    const s = G.save;
    const lvlBefore = s.heroLvl;
    const sum = applyBattle(s, this.level, this.sim.outcome());
    persist();
    this.time.delayedCall(win ? 700 : 500, () => this.showResult(sum, lvlBefore));
  }

  private showResult(sum: BattleSummary, lvlBefore: number) {
    const s = G.save;
    const win = sum.win;
    audio.play(win ? 'victory' : 'defeat');
    audio.setMode('camp');
    const layer = this.add.container(0, 0).setDepth(1000);
    layer.add(this.add.rectangle(W / 2, H / 2, W * 3, H * 2, 0x120a05, 0.6).setInteractive());
    const c = this.add.container(W / 2, 0);
    layer.add(c);
    const ban = this.add.container(0, 70);
    ban.add(nine(this, 0, 4, 'banner', 440, 104, 90, 0, 0));
    ban.add(txt(this, 0, -10, win ? 'ניצחון!' : 'הפסד', 54, win ? C.ink : '#8a1c1c', { weight: '900' }));
    c.add(ban);
    ban.setScale(0.3);
    this.tweens.add({ targets: ban, scale: 1, duration: 350, ease: 'Back.Out' });
    c.add(txt(this, 0, 138, `שלב ${this.level} · ${this.lv.name}`, 24, C.cream, { weight: '900' }));
    if (win) {
      for (let i = 0; i < 3; i++) {
        const on = i < sum.stars;
        const star = img(this, (i - 1) * 118, 226 - (i === 1 ? 22 : 0), on ? 'star' : 'star_empty', i === 1 ? 2.5 : 2.05);
        const sc = star.scale;
        c.add(star);
        star.setScale(0);
        this.tweens.add({
          targets: star,
          scale: sc,
          delay: 350 + i * 280,
          duration: 320,
          ease: 'Back.Out',
          onStart: () => {
            if (on) {
              audio.play('star');
              for (let k = 0; k < 8; k++) this.spawnFx('spark', W / 2 + (i - 1) * 118, 226, { life: 0.5, s0: 0.5, s1: 1, vx: Math.cos(k * 0.8) * 160, vy: Math.sin(k * 0.8) * 160, screen: true });
            }
          },
        });
      }
      // קונפטי
      const cols = [0xffd23e, 0xff6a55, 0x7fd4ff, 0x8ff06a, 0xff8fd0];
      for (let i = 0; i < 70; i++) this.spawnFx('confetti', Math.random() * V.w - V.ex, -20 - Math.random() * 200, { life: 2.6 + Math.random(), vy: 140 + Math.random() * 140, vx: (Math.random() - 0.5) * 80, s0: 1.4, s1: 1.4, spin: (Math.random() - 0.5) * 16, tint: cols[i % 5], screen: true });
      c.add(txt(this, 0, 322, 'פרסים', 30, C.gold, { weight: '900', sw: 6 }));
      const tiles: { icon?: string; label: string; color: string; item?: boolean }[] = [
        { icon: 'coin', label: fmt(sum.rewards.gold), color: C.gold },
        { icon: 'ic_xp', label: fmt(sum.rewards.xp), color: C.cream },
      ];
      if (sum.rewards.gems > 0) tiles.splice(1, 0, { icon: 'gem', label: String(sum.rewards.gems), color: C.blue });
      if (sum.item) tiles.push({ label: RARITY_NAMES[sum.item.rarity], color: '#' + RARITY_COLORS[sum.item.rarity].toString(16).padStart(6, '0'), item: true });
      const tw = 104;
      const total = tiles.length * tw + 24;
      c.add(nine(this, 0, 406, 'panel_wood', total + 16, 124, 24));
      tiles.forEach((t, i) => {
        // מימין לשמאל
        const x = total / 2 - 12 - tw / 2 - i * tw;
        const tile = this.add.container(x, 406);
        tile.add(nine(this, 0, 0, 'panel_card', 92, 96, 14));
        if (t.item && sum.item) tile.add(itemIcon(this, 0, -12, sum.item, sum.item.slot, 60));
        else tile.add(img(this, 0, -14, t.icon!, 0.95));
        tile.add(txt(this, 0, 30, t.label, 19, t.color, { weight: '900' }));
        c.add(tile);
        tile.setScale(0);
        this.tweens.add({ targets: tile, scale: 1, delay: 1200 + i * 130, duration: 240, ease: 'Back.Out', onStart: () => audio.play('coin') });
      });
      const lines: string[] = [];
      if (sum.item) lines.push(`פריט חדש: ${itemName(sum.item)}`);
      if (sum.fallen > 0) lines.push(fallenText(sum.fallen, sum.returned, 'חזרו למחנה', 'חזר למחנה'));
      if (sum.levelUps > 0) {
        lines.push(`הגיבור עלה לרמה ${s.heroLvl}!`);
        for (const id of UNIT_IDS) if (UNITS[id].unlock > lvlBefore && UNITS[id].unlock <= s.heroLvl) lines.push(`יחידה חדשה נפתחה: ${UNITS[id].name}`);
      }
      lines.slice(0, 3).forEach((l, i) => c.add(txt(this, 0, 492 + i * 28, l, 21, i === 0 && sum.item ? C.cream : C.gold, { weight: '900' })));
      const last = this.level >= LEVEL_COUNT;
      c.add(button(this, 150, 626, 264, 80, last ? 'למפה' : 'המשך', 'orange', () => go(this, 'Map', { focus: Math.min(LEVEL_COUNT, this.level + 1) }), { size: 38 }));
      c.add(button(this, -150, 626, 264, 80, 'שחק שוב', 'brown', () => go(this, 'Battle', { level: this.level }), { size: 34 }));
      if (last && sum.firstClear) c.add(txt(this, 0, 574, 'כל הכבוד! הבסת את שר השדים והצלת את הממלכה!', 24, C.cream, { weight: '900' }));
    } else {
      c.add(nine(this, 0, 330, 'panel_parch', 620, 250, 22));
      c.add(txt(this, 0, 240, this.sim.hero.hp > 0 ? 'נסוגת מהקרב' : 'הגיבור נפל בקרב', 30, C.ink, { weight: '900' }));
      const tips = ['שדרג את הצבא או את הציוד', 'גייס חיילים נוספים למילוי הצבא', 'חזור לשלבים קודמים כדי לאסוף זהב'];
      tips.forEach((t, i) => {
        c.add(img(this, 250, 292 + i * 42, 'ic_up', 0.5));
        c.add(txt(this, 222, 292 + i * 42, t, 23, C.brown, { ox: 1, weight: '700' }));
      });
      if (sum.fallen > 0) c.add(txt(this, 0, 428, fallenText(sum.fallen, sum.returned, 'נסוגו למחנה', 'נסוג למחנה'), 20, '#8a1c1c', { weight: '900' }));
      c.add(button(this, 150, 560, 264, 80, 'נסה שוב', 'orange', () => go(this, 'Battle', { level: this.level }), { size: 36 }));
      c.add(button(this, -150, 560, 264, 80, 'למחנה', 'brown', () => go(this, 'Home'), { size: 36 }));
    }
  }
}

void CHARS;
