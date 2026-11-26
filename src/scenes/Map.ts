// מפת העולם
import Phaser from 'phaser';
import { G, W, H, go, setupScene, fmt, persist } from '../core';
import { img } from '../art/svg';
import { MAP_REGION_W } from '../art/bg';
import { button, topBar, txt, C, nine, modal, toast, pressable, type TopBar } from '../ui/widgets';
import { REGIONS, LEVEL_COUNT, levelDef, ENEMIES, type EnemyId } from '../game/data';
import { currentLevel, isLevelUnlocked, levelRewards, recommendedPower, totalPower, isBossLevel, POTION_COST, MAX_EXTRA_POTIONS, BASE_POTIONS } from '../game/economy';
import { audio } from '../audio';

const WORLD_W = MAP_REGION_W * 4;
export const nodeX = (i: number) => 52 + i * (MAP_REGION_W / 12);
export const nodeY = (i: number) => 408 + 105 * Math.sin(i * 0.85) + 34 * Math.sin(i * 0.37 + 1);

export class MapScene extends Phaser.Scene {
  private world!: Phaser.GameObjects.Container;
  private scrollX = 0;
  private vel = 0;
  private dragging = false;
  private lastX = 0;
  private modalOpen = false;
  private top!: TopBar;

  constructor() {
    super('Map');
  }

  create(data: { focus?: number }) {
    audio.setMode('camp');
    this.modalOpen = false;
    const s = G.save;
    this.world = this.add.container(0, 0);
    for (let r = 0; r < 4; r++) this.world.add(this.add.image(r * MAP_REGION_W, 0, `map${r}`).setOrigin(0, 0));
    // השביל
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(-40, nodeY(-1))];
    for (let i = 0; i < LEVEL_COUNT; i++) pts.push(new Phaser.Math.Vector2(nodeX(i), nodeY(i) + 8));
    const curve = new Phaser.Curves.Spline(pts);
    const g = this.add.graphics();
    g.lineStyle(34, 0x2b1a10, 0.3);
    curve.draw(g, 400);
    g.lineStyle(24, 0xf6e7bf, 0.95);
    curve.draw(g, 400);
    g.lineStyle(10, 0xfffaf0, 0.5);
    curve.draw(g, 400);
    this.world.add(g);
    for (let r = 0; r < 4; r++) {
      const cx = r * MAP_REGION_W + MAP_REGION_W / 2;
      const t = txt(this, cx, 196, REGIONS[r], 30, C.cream, { weight: '900' });
      this.world.add(nine(this, cx, 196, 'pill', t.width + 44, 54, 20));
      this.world.add(t);
    }
    const cur = currentLevel(s);
    for (let i = 0; i < LEVEL_COUNT; i++) this.world.add(this.makeNode(i + 1, cur));

    this.top = topBar(this, 'מפת העולם');
    button(this, W / 2, 664, 250, 68, 'חזרה למחנה', 'orange', () => go(this, 'Home'), { size: 30 });

    const focus = data?.focus ?? cur;
    this.scrollX = Phaser.Math.Clamp(nodeX(focus - 1) - W / 2, 0, WORLD_W - W);
    this.world.x = -this.scrollX;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.modalOpen || p.worldY < 130) return;
      this.dragging = true;
      this.lastX = p.worldX;
      this.vel = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const dx = p.worldX - this.lastX;
      this.lastX = p.worldX;
      this.scrollX = Phaser.Math.Clamp(this.scrollX - dx, 0, WORLD_W - W);
      this.vel = -dx * 60;
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      if (!this.modalOpen) this.scrollX = Phaser.Math.Clamp(this.scrollX + dx + dy, 0, WORLD_W - W);
    });
    setupScene(this);
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    if (!this.dragging && Math.abs(this.vel) > 5) {
      this.scrollX = Phaser.Math.Clamp(this.scrollX + this.vel * dt, 0, WORLD_W - W);
      this.vel *= Math.pow(0.04, dt);
    }
    this.world.x = -this.scrollX;
  }

  private makeNode(n: number, cur: number): Phaser.GameObjects.Container {
    const s = G.save;
    const i = n - 1;
    const c = this.add.container(nodeX(i), nodeY(i));
    const stars = s.stars[i];
    const unlocked = isLevelUnlocked(s, n);
    const boss = isBossLevel(n);
    const isCur = n === cur && stars === 0;
    if (isCur) {
      const gl = img(this, 0, 0, 'glow', 3.4).setTint(0xfff3a0).setAlpha(0.8);
      c.add(gl);
      this.tweens.add({ targets: gl, alpha: 0.3, scale: gl.scale * 1.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const body = this.add.container(0, 0);
    c.add(body);
    if (boss) {
      const b = img(this, 0, -14, 'node_boss', 0.92);
      if (!unlocked) b.setTint(0x777777);
      body.add(b);
      body.add(txt(this, 0, 50, String(n), 22, C.cream, { weight: '900' }));
    } else {
      body.add(img(this, 0, 0, !unlocked ? 'node_grey' : isCur ? 'node_gold' : stars > 0 ? 'node_blue' : 'node_green', 1));
      if (unlocked) body.add(txt(this, 0, -2, String(n), 26, C.cream, { weight: '900' }));
      else body.add(img(this, 0, -3, 'lock', 0.6));
    }
    if (isCur) this.tweens.add({ targets: body, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (stars > 0) for (let k = 0; k < 3; k++) c.add(img(this, (k - 1) * 22, (boss ? -78 : -36) - (k === 1 ? 6 : 0), k < stars ? 'star' : 'star_empty', 0.48));
    pressable(this, c, 76, 76, () => {
      if (this.modalOpen) return;
      if (!unlocked) {
        audio.play('error');
        toast(this, 'השלב נעול - נצח את השלב הקודם');
        return;
      }
      this.openLevel(n);
    });
    return c;
  }

  private openLevel(n: number) {
    const s = G.save;
    const lv = levelDef(n);
    this.modalOpen = true;
    this.vel = 0;
    let extra = 0;
    let started = false;
    const m = modal(this, 620, 560, undefined, () => {
      this.modalOpen = false;
      // שיקויים שנקנו ולא נוצלו מוחזרים
      if (!started && extra > 0) {
        s.gems += extra * POTION_COST;
        persist();
        this.top.refresh();
      }
    });
    const c = m.c;
    c.add(txt(this, 0, -222, `שלב ${n} · ${lv.name}`, 34, C.ink, { weight: '900' }));
    c.add(txt(this, 0, -182, REGIONS[lv.region] + (lv.boss ? ` · בוס: ${ENEMIES[lv.boss].name}` : ''), 21, lv.boss ? '#b3261e' : '#8a6a3a', { weight: '700' }));
    const rec = recommendedPower(n);
    const mine = totalPower(s);
    c.add(nine(this, 0, -126, 'panel_row', 540, 60, 14));
    c.add(txt(this, 250, -126, `עוצמה מומלצת: ${fmt(rec)}`, 22, C.ink, { ox: 1, weight: '900' }));
    c.add(txt(this, -250, -126, `העוצמה שלך: ${fmt(mine)}`, 22, mine >= rec ? '#2a7a2a' : '#b3261e', { ox: 0, weight: '900' }));
    // אויבים
    c.add(txt(this, 250, -74, 'אויבים', 22, '#8a6a3a', { ox: 1, weight: '900' }));
    const counts = new Map<EnemyId, number>();
    for (const w of lv.waves) for (const g of w) counts.set(g.kind, (counts.get(g.kind) ?? 0) + g.count);
    let ex = 150;
    for (const [kind, cnt] of counts) {
      const big = ENEMIES[kind].role === 'boss';
      c.add(img(this, ex, -18, `${kind}_head`, big ? 0.95 : 0.8));
      c.add(txt(this, ex, 8, `×${cnt}`, 19, C.ink, { weight: '900' }));
      ex -= 92;
    }
    c.add(txt(this, -250, -74, `גלים: ${lv.waves.length}`, 22, '#8a6a3a', { ox: 0, weight: '900' }));
    // פרסים
    const prev = s.stars[n - 1];
    const rw = levelRewards(n, 3, prev);
    c.add(nine(this, 0, 64, 'panel_row', 540, 64, 14));
    c.add(txt(this, 250, 64, 'פרסים', 22, '#8a6a3a', { ox: 1, weight: '900' }));
    const chip = (x: number, icon: string, v: string) => {
      c.add(img(this, x + 30, 64, icon, 0.62));
      c.add(txt(this, x + 8, 64, v, 22, C.ink, { ox: 1, weight: '900' }));
    };
    chip(120, 'coin', fmt(rw.gold));
    chip(-10, 'ic_xp', fmt(rw.xp));
    if (rw.gems > 0) chip(-130, 'gem', String(rw.gems));
    if (prev >= 3) c.add(txt(this, -250, 64, 'משחק חוזר', 17, '#8a6a3a', { ox: 0 }));
    // שיקוי נוסף
    const potTxt = txt(this, 250, 134, '', 21, C.ink, { ox: 1, weight: '900' });
    c.add(img(this, 60, 134, 'ic_potion', 0.6));
    c.add(potTxt);
    const upd = () => potTxt.setText(`‫שיקויים לקרב: ${BASE_POTIONS + extra}‬`);
    upd();
    const potBtn = button(this, -150, 134, 220, 56, 'שיקוי נוסף', 'blue', () => {
      if (extra >= MAX_EXTRA_POTIONS) return toast(this, 'הגעת למספר השיקויים המרבי');
      if (s.gems < POTION_COST) {
        audio.play('error');
        return toast(this, 'אין מספיק יהלומים');
      }
      s.gems -= POTION_COST;
      extra++;
      audio.play('potion');
      persist();
      this.top.refresh();
      upd();
    }, { size: 19, sub: `${POTION_COST}`, subIcon: 'gem', subSize: 17 });
    c.add(potBtn);
    c.add(button(this, 0, 220, 300, 80, 'התחל', 'orange', () => {
      started = true;
      go(this, 'Battle', { level: n, potions: BASE_POTIONS + extra });
    }, { size: 40 }));
  }
}
