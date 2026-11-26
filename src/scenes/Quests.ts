// משימות יומיות והישגים
import Phaser from 'phaser';
import { G, W, go, setupScene, fmt, persist } from '../core';
import { img } from '../art/svg';
import { button, topBar, txt, C, nine, bar, type TopBar, floatText, pressable } from '../ui/widgets';
import { achView, claimAch, claimDaily, dailyView, ensureDaily, type QuestView } from '../game/economy';
import { audio } from '../audio';
import { interiorBg } from './Army';

const LIST_X = W / 2;
const LIST_Y = 196;
const LIST_W = 940;
const LIST_H = 420;
const ROW_H = 80;

export class QuestsScene extends Phaser.Scene {
  private top!: TopBar;
  private tab: 'daily' | 'ach' = 'daily';
  private list!: Phaser.GameObjects.Container;
  private tabs!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private dragging = false;
  private lastY = 0;

  constructor() {
    super('Quests');
  }

  create() {
    ensureDaily(G.save);
    interiorBg(this);
    this.top = topBar(this, 'משימות');
    nine(this, LIST_X, LIST_Y + LIST_H / 2, 'panel_wood', LIST_W + 44, LIST_H + 44, 24);
    nine(this, LIST_X, LIST_Y + LIST_H / 2, 'panel_parch', LIST_W + 16, LIST_H + 16, 22);
    this.tabs = this.add.container(0, 0);
    this.list = this.add.container(0, 0);
    const maskG = this.make.graphics({}, false);
    maskG.fillRect(LIST_X - LIST_W / 2, LIST_Y, LIST_W, LIST_H);
    this.list.setMask(maskG.createGeometryMask());
    button(this, W / 2, 668, 250, 64, 'חזרה למחנה', 'orange', () => go(this, 'Home'), { size: 30 });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.worldY > LIST_Y && p.worldY < LIST_Y + LIST_H) {
        this.dragging = true;
        this.lastY = p.worldY;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      this.setScroll(this.scrollY - (p.worldY - this.lastY));
      this.lastY = p.worldY;
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setScroll(this.scrollY + dy));
    this.build();
    setupScene(this);
  }

  private setScroll(y: number) {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.list.y = -this.scrollY;
  }

  private build() {
    const s = G.save;
    this.tabs.removeAll(true);
    this.list.removeAll(true);
    const mkTab = (x: number, label: string, key: 'daily' | 'ach') => {
      const on = this.tab === key;
      const c = this.add.container(x, LIST_Y - 32);
      c.add(nine(this, 0, 6, on ? 'panel_parch' : 'panel_card', 250, 64, 16));
      c.add(txt(this, 0, 0, label, 25, on ? C.ink : C.cream, { weight: '900' }));
      pressable(this, c, 250, 58, () => {
        if (this.tab === key) return;
        this.tab = key;
        this.scrollY = 0;
        this.list.y = 0;
        this.build();
      });
      this.tabs.add(c);
    };
    mkTab(LIST_X + LIST_W / 2 - 150, 'משימות יומיות', 'daily');
    mkTab(LIST_X + LIST_W / 2 - 410, 'הישגים', 'ach');
    const rows: (QuestView & { complete?: boolean })[] = this.tab === 'daily' ? dailyView(s) : achView(s);
    // משימות שניתן לקבל - בראש הרשימה
    rows.sort((a, b) => Number(b.done && !b.claimed) - Number(a.done && !a.claimed) || Number(a.claimed) - Number(b.claimed));
    this.maxScroll = Math.max(0, rows.length * (ROW_H + 4) + 8 - LIST_H);
    rows.forEach((q, i) => {
      const y = LIST_Y + 8 + i * (ROW_H + 4) + ROW_H / 2;
      const c = this.add.container(LIST_X, y);
      this.list.add(c);
      c.add(nine(this, 0, 0, 'panel_row', LIST_W - 20, ROW_H, 14));
      const R = LIST_W / 2 - 22;
      c.add(nine(this, R - 34, 0, 'panel_card', 62, 62, 14));
      c.add(img(this, R - 34, 0, q.icon, 0.78));
      c.add(txt(this, R - 78, -17, q.text, 23, C.ink, { ox: 1, weight: '900' }));
      const b = bar(this, R - 78 - 300, 8, 300, 22, q.claimed ? 0x8f8f8f : 0x3fa8f0, `${fmt(q.progress)}/${fmt(q.target)}`, 15);
      b.set(q.progress / q.target);
      c.add(b.g);
      c.add(b.t!);
      // פרסים
      const rx = -40;
      c.add(nine(this, rx, 0, 'panel_card', 62, 62, 14));
      c.add(img(this, rx, -9, 'coin', 0.52));
      c.add(txt(this, rx, 17, fmt(q.gold), 15, C.gold, { weight: '900' }));
      c.add(nine(this, rx - 70, 0, 'panel_card', 62, 62, 14));
      c.add(img(this, rx - 70, -9, 'gem', 0.5));
      c.add(txt(this, rx - 70, 17, `×${q.gems}`, 15, C.blue, { weight: '900' }));
      const bx = -R + 96;
      if (q.claimed) {
        c.add(img(this, bx + 50, 0, 'ic_check', 0.7));
        c.add(txt(this, bx - 14, 0, 'הושלם', 22, '#2a7a2a', { weight: '900' }));
      } else if (q.done) {
        c.add(
          button(this, bx, 0, 150, 58, 'קבל', 'blue', () => {
            const ok = this.tab === 'daily' ? claimDaily(s, q.id) : claimAch(s, q.id);
            if (!ok) return;
            audio.play('coin');
            floatText(this, LIST_X + bx, y - this.scrollY - 20, `+${fmt(q.gold)}`, C.gold);
            persist();
            this.top.refresh();
            this.build();
            this.setScroll(this.scrollY);
          }, { size: 28, glow: true, silent: true }),
        );
      } else {
        const g = button(this, bx, 0, 150, 58, 'בביצוע', 'grey', () => {}, { size: 24 });
        g.disableInteractive();
        c.add(g);
      }
    });
    if (this.tab === 'daily') {
      const t = txt(this, LIST_X - LIST_W / 2 + 16, LIST_Y - 26, 'המשימות מתחדשות בכל חצות', 18, C.cream, { ox: 0 });
      this.tabs.add(t);
    }
  }
}
