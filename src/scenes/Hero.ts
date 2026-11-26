// הגיבור - ציוד, נתונים וכישורים
import Phaser from 'phaser';
import { G, W, go, setupScene, fmt, persist } from '../core';
import { img } from '../art/svg';
import { Puppet } from '../art/puppet';
import { button, topBar, txt, C, nine, toast, modal, pressable, type TopBar, floatText } from '../ui/widgets';
import { SLOTS, SLOT_NAMES, RARITY_COLORS, RARITY_NAMES, SKILL_NAMES, SKILL_DESC, MAX_SKILL_LEVEL, itemName, type Item, type Slot } from '../game/data';
import { heroStats, equipItem, unequipItem, sellItem, sellValue, itemPower, skillCost, upgradeSkill, track } from '../game/economy';
import { audio } from '../audio';
import { interiorBg } from './Army';

export const SLOT_ICON: Record<Slot, string> = { helmet: 'ic_helmet', armor: 'ic_armor', weapon: 'ic_sword', shield: 'ic_shield', gloves: 'ic_gloves', ring: 'ic_ring' };
const SLOT_POS: Record<Slot, [number, number]> = { helmet: [236, 222], armor: [236, 362], weapon: [640, 222], shield: [776, 222], gloves: [640, 362], ring: [776, 362] };
const STAT_ROWS: { key: 'atk' | 'def' | 'hp' | 'spd'; label: string; icon: string }[] = [
  { key: 'atk', label: 'כוח', icon: 'ic_sword' },
  { key: 'def', label: 'הגנה', icon: 'ic_shield' },
  { key: 'hp', label: 'חיים', icon: 'heart' },
  { key: 'spd', label: 'מהירות', icon: 'ic_speed' },
];

export function itemIcon(scene: Phaser.Scene, x: number, y: number, it: Item | null, slot: Slot, size = 84): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const bg = nine(scene, 0, 0, 'slot', size, size, 14);
  bg.setTint(it ? RARITY_COLORS[it.rarity] : 0x8a7a5a);
  c.add(bg);
  const ic = img(scene, 0, 0, SLOT_ICON[slot], (size * 0.62) / 48);
  if (!it) ic.setAlpha(0.3).setTintFill(0x2b1a10);
  c.add(ic);
  return c;
}

export class HeroScene extends Phaser.Scene {
  private top!: TopBar;
  private hero!: Puppet;
  private dyn!: Phaser.GameObjects.Container;
  private inv!: Phaser.GameObjects.Container;
  private tab: 'inv' | 'skills' = 'inv';
  private scrollX = 0;
  private maxScroll = 0;
  private dragging = false;
  private lastX = 0;
  private modalOpen = false;

  constructor() {
    super('Hero');
  }

  create() {
    this.modalOpen = false;
    this.scrollX = 0;
    interiorBg(this);
    this.top = topBar(this, 'הגיבור');
    img(this, 440, 470, 'shadow', 5);
    this.hero = new Puppet(this, 'hero');
    this.hero.setChar('hero', 1.75).setPosition(440, 462);
    this.dyn = this.add.container(0, 0);
    nine(this, W / 2, 546, 'panel_wood', 1080, 150, 24);
    this.inv = this.add.container(0, 0);
    const mg = this.make.graphics({}, false);
    mg.fillRect(120, 476, 1040, 140);
    this.inv.setMask(mg.createGeometryMask());
    button(this, W / 2, 668, 250, 62, 'חזרה למחנה', 'orange', () => go(this, 'Home'), { size: 29 });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.modalOpen && this.tab === 'inv' && p.worldY > 480 && p.worldY < 615) {
        this.dragging = true;
        this.lastX = p.worldX;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      this.setScroll(this.scrollX + (p.worldX - this.lastX));
      this.lastX = p.worldX;
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => !this.modalOpen && this.setScroll(this.scrollX - dx - dy));
    this.build();
    setupScene(this);
  }

  update(_t: number, dms: number) {
    this.hero.tick(Math.min(0.05, dms / 1000));
  }

  /** הרשימה נגללת מימין לשמאל */
  private setScroll(x: number) {
    this.scrollX = Phaser.Math.Clamp(x, 0, this.maxScroll);
    this.inv.x = this.scrollX;
  }

  private build() {
    const s = G.save;
    this.top.refresh();
    this.dyn.removeAll(true);
    this.inv.removeAll(true);
    // משבצות ציוד
    for (const slot of SLOTS) {
      const [x, y] = SLOT_POS[slot];
      const c = this.add.container(x, y);
      c.add(nine(this, 0, 4, 'panel_parch', 118, 128, 18));
      c.add(txt(this, 0, -42, SLOT_NAMES[slot], 21, C.ink, { weight: '900' }));
      const it = s.equip[slot];
      c.add(itemIcon(this, 0, 18, it, slot, 78));
      pressable(this, c, 118, 128, () => {
        if (this.modalOpen) return;
        if (it) this.openItem(it, true);
        else toast(this, 'אין פריט במשבצת - בחר פריט מהתיק');
      });
      this.dyn.add(c);
    }
    // נתונים
    const st = heroStats(s);
    this.dyn.add(nine(this, 1068, 292, 'panel_wood', 300, 268, 24));
    STAT_ROWS.forEach((r, i) => {
      const y = 204 + i * 59;
      this.dyn.add(nine(this, 1068, y, 'pill', 260, 52, 20));
      this.dyn.add(img(this, 968, y, r.icon, 0.72));
      this.dyn.add(txt(this, 1182, y - 13, r.label, 17, '#f0d9a8', { ox: 1 }));
      this.dyn.add(txt(this, 1182, y + 9, fmt(st[r.key]), 25, C.cream, { ox: 1, weight: '900' }));
    });
    // לשוניות
    const mkTab = (x: number, label: string, key: 'inv' | 'skills') => {
      const on = this.tab === key;
      const c = this.add.container(x, 458);
      c.add(nine(this, 0, 0, on ? 'panel_parch' : 'panel_card', 150, 46, 14));
      c.add(txt(this, 0, -2, label, 22, on ? C.ink : C.cream, { weight: '900' }));
      pressable(this, c, 150, 46, () => {
        if (this.modalOpen || this.tab === key) return;
        this.tab = key;
        this.setScroll(0);
        this.build();
      });
      this.dyn.add(c);
    };
    mkTab(1070, `תיק (${s.inv.length})`, 'inv');
    mkTab(910, 'כישורים', 'skills');
    if (this.tab === 'inv') this.buildInv();
    else this.buildSkills();
  }

  private buildInv() {
    const s = G.save;
    const items = [...s.inv].sort((a, b) => b.rarity - a.rarity || itemPower(b) - itemPower(a));
    const step = 96;
    this.maxScroll = Math.max(0, items.length * step + 20 - 1040);
    if (items.length === 0) {
      this.inv.add(txt(this, W / 2, 546, 'התיק ריק - נצח בקרבות כדי להשיג ציוד', 24, '#f0d9a8', { weight: '700' }));
      return;
    }
    items.forEach((it, i) => {
      const x = 1160 - 58 - i * step;
      const c = itemIcon(this, x, 546, it, it.slot, 84);
      const eq = s.equip[it.slot];
      if (!eq || itemPower(it) > itemPower(eq)) c.add(img(this, 26, -26, 'ic_up', 0.4));
      pressable(this, c, 84, 84, () => !this.modalOpen && this.openItem(it, false));
      this.inv.add(c);
    });
    this.setScroll(this.scrollX);
  }

  private buildSkills() {
    const s = G.save;
    this.maxScroll = 0;
    this.inv.x = 0;
    for (let i = 0; i < 3; i++) {
      const x = 1160 - 180 - i * 345;
      const c = this.add.container(x, 546);
      const lvl = s.skills[i];
      c.add(img(this, 126, 0, ['round_orange', 'round_blue', 'round_teal'][i], 0.86));
      c.add(img(this, 126, 0, `ic_skill${i}`, 0.9));
      c.add(txt(this, 76, -34, SKILL_NAMES[i], 22, C.cream, { ox: 1, weight: '900' }));
      c.add(txt(this, 76, -8, `רמה ${lvl}`, 18, C.gold, { ox: 1, weight: '900' }));
      const max = lvl >= MAX_SKILL_LEVEL;
      const b = button(this, -6, 32, 168, 52, max ? 'מקסימום' : 'שדרג', max ? 'grey' : 'blue', () => {
        if (this.modalOpen || max) return;
        if (upgradeSkill(s, i)) {
          track(s, 'upgrades', 1);
          audio.play('upgrade');
          floatText(this, x, 500, 'רמה +1', C.green);
          persist();
          this.build();
        } else {
          audio.play('error');
          toast(this, 'אין מספיק זהב');
        }
      }, max ? { size: 20 } : { size: 20, sub: fmt(skillCost(lvl)), subIcon: 'coin', subSize: 16, silent: true });
      c.add(b);
      const info = this.add.container(-120, -24);
      info.add(img(this, 0, 0, 'round_dark', 0.36));
      info.add(txt(this, 0, -1, '?', 20, C.cream, { weight: '900' }));
      pressable(this, info, 40, 40, () => toast(this, SKILL_DESC[i]));
      c.add(info);
      this.inv.add(c);
    }
  }

  private openItem(it: Item, equipped: boolean) {
    const s = G.save;
    this.modalOpen = true;
    const m = modal(this, 600, 500, undefined, () => (this.modalOpen = false));
    const c = m.c;
    const col = '#' + RARITY_COLORS[it.rarity].toString(16).padStart(6, '0');
    c.add(itemIcon(this, 210, -178, it, it.slot, 92));
    c.add(txt(this, 150, -196, itemName(it), 32, C.ink, { ox: 1, weight: '900' }));
    c.add(txt(this, 150, -158, `${RARITY_NAMES[it.rarity]} · ${SLOT_NAMES[it.slot]}`, 21, col, { ox: 1, weight: '900', stroke: C.ink, sw: 4 }));
    const cur = equipped ? null : s.equip[it.slot];
    if (!equipped) c.add(txt(this, 0, -112, cur ? `בהשוואה ל: ${itemName(cur)}` : 'המשבצת ריקה כרגע', 19, '#8a6a3a', { weight: '700' }));
    let y = -70;
    for (const r of STAT_ROWS) {
      const v = it[r.key];
      const cv = cur ? cur[r.key] : 0;
      if (v === 0 && cv === 0) continue;
      c.add(nine(this, 0, y, 'panel_row', 500, 50, 14));
      c.add(img(this, 220, y, r.icon, 0.6));
      c.add(txt(this, 190, y, r.label, 23, C.ink, { ox: 1, weight: '900' }));
      c.add(txt(this, 40, y, `+${fmt(v)}`, 25, C.ink, { ox: 0.5, weight: '900' }));
      if (!equipped) {
        const diff = v - cv;
        if (diff !== 0) {
          c.add(img(this, -110, y, diff > 0 ? 'ic_up' : 'ic_down', 0.5));
          c.add(txt(this, -135, y, `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}`, 23, diff > 0 ? '#2a7a2a' : '#b3261e', { ox: 1, weight: '900' }));
        }
      }
      y += 56;
    }
    const by = 190;
    if (equipped) {
      c.add(
        button(this, 0, by, 240, 70, 'הסר', 'blue', () => {
          unequipItem(s, it.slot);
          audio.play('click');
          persist();
          m.close();
          this.build();
        }, { size: 32 }),
      );
    } else {
      c.add(
        button(this, 130, by, 230, 70, 'צייד', 'green', () => {
          equipItem(s, it.id);
          audio.play('upgrade');
          this.hero.attack();
          persist();
          m.close();
          this.build();
        }, { size: 32, silent: true }),
      );
      c.add(
        button(this, -130, by, 230, 70, 'מכור', 'orange', () => {
          const v = sellItem(s, it.id);
          audio.play('coin');
          persist();
          m.close();
          this.build();
          floatText(this, W / 2, 480, `+${fmt(v)}`, C.gold);
        }, { size: 26, sub: fmt(sellValue(it)), subIcon: 'coin', subSize: 19, silent: true }),
      );
    }
  }
}
