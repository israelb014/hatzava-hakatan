// רכיבי ממשק משותפים
import Phaser from 'phaser';
import { FRAMES, img } from '../art/svg';
import { G, W, H, VERSION, fmt } from '../core';
import { audio } from '../audio';
import { xpToNext } from '../game/economy';
import { HERO_NAME, MAX_HERO_LEVEL } from '../game/data';

const RLE = '‫';
const PDF = '‬';
const HEB = /[֐-׿]/;
export const heb = (s: string) => (HEB.test(s) ? RLE + s + PDF : s);

export const C = {
  ink: '#3a2415',
  cream: '#fff6dc',
  gold: '#ffd23e',
  blue: '#7fd4ff',
  green: '#8ff06a',
  red: '#ff6a55',
  brown: '#5c3a1c',
};

export interface TxtOpts {
  stroke?: string | false;
  sw?: number;
  weight?: string;
  ox?: number;
  oy?: number;
  wrap?: number;
  align?: 'right' | 'center' | 'left';
  shadow?: boolean;
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size: number, color: string = C.cream, o: TxtOpts = {}): Phaser.GameObjects.Text {
  // קו מתאר כהה רק לטקסט בהיר
  const n = parseInt(color.slice(1), 16);
  const light = ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 150;
  const stroke = o.stroke === false ? undefined : (o.stroke ?? (light ? C.ink : undefined));
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: 'Rubik, Arial, sans-serif',
    fontSize: size + 'px',
    fontStyle: o.weight ?? '700',
    color,
    padding: { x: 6, y: 5 },
    align: o.align ?? 'center',
    resolution: 2,
  };
  if (stroke) {
    style.stroke = stroke;
    style.strokeThickness = o.sw ?? Math.max(3, Math.round(size * 0.16));
  }
  if (o.wrap) {
    style.wordWrap = {
      width: o.wrap,
      callback: (text: string, t: Phaser.GameObjects.Text) => {
        const ctx = t.context;
        const out: string[] = [];
        for (const para of text.split('\n')) {
          let line = '';
          for (const word of para.split(' ')) {
            const test = line ? line + ' ' + word : word;
            if (line && ctx.measureText(test).width > o.wrap!) {
              out.push(heb(line));
              line = word;
            } else line = test;
          }
          out.push(heb(line));
        }
        return out;
      },
    };
  }
  const t = scene.add.text(x, y, o.wrap ? s : heb(s), style);
  t.setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.wrap) t.setData('wrap', true);
  if (o.shadow) t.setShadow(0, 3, 'rgba(0,0,0,0.45)', 0, true, true);
  return t;
}

export function setT(t: Phaser.GameObjects.Text, s: string) {
  t.setText(t.getData('wrap') ? s : heb(s));
}

export function nine(scene: Phaser.Scene, x: number, y: number, key: string, w: number, h: number, sl = 24, stp?: number, sb?: number): Phaser.GameObjects.NineSlice {
  const f = FRAMES[key];
  const k = f.scale;
  const o = scene.add.nineslice(x, y, f.tex, key, w * k, h * k, sl * k, sl * k, (stp ?? sl) * k, (sb ?? stp ?? sl) * k);
  o.setScale(1 / k);
  o.setData('k', k);
  return o;
}

export interface Btn extends Phaser.GameObjects.Container {
  label: Phaser.GameObjects.Text;
  setLabel(s: string): void;
  setEnabled(on: boolean): void;
  enabled: boolean;
}

export interface BtnOpts {
  size?: number;
  icon?: string;
  sub?: string;
  subIcon?: string;
  subSize?: number;
  onDisabled?: () => void;
  silent?: boolean;
  glow?: boolean;
}

/** מוסיף התנהגות לחיצה עם אנימציה */
export function pressable(scene: Phaser.Scene, c: Phaser.GameObjects.Container, w: number, h: number, cb: () => void, isEnabled: () => boolean = () => true, onDisabled?: () => void, silent = false) {
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  const sx = c.scaleX;
  const sy = c.scaleY;
  let down = false;
  const up = () => {
    down = false;
    scene.tweens.add({ targets: c, scaleX: sx, scaleY: sy, duration: 90, ease: 'Back.Out' });
  };
  c.on('pointerdown', () => {
    down = true;
    scene.tweens.add({ targets: c, scaleX: sx * 0.94, scaleY: sy * 0.92, duration: 60 });
  });
  c.on('pointerout', () => down && up());
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (!down) return;
    up();
    if (p.getDistance() > 24) return;
    if (!isEnabled()) {
      audio.play('error');
      onDisabled?.();
      return;
    }
    if (!silent) audio.play('click');
    cb();
  });
}

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, color: string, cb: () => void, o: BtnOpts = {}): Btn {
  const c = scene.add.container(x, y) as Btn;
  const bg = nine(scene, 0, 0, 'btn_' + color, w, h, Math.min(26, h / 2 - 2), Math.min(24, h / 2 - 4), Math.min(30, h / 2));
  c.add(bg);
  const size = o.size ?? Math.round(h * 0.42);
  const hasSub = !!o.sub;
  const label_ = txt(scene, 0, hasSub ? -h * 0.2 : -h * 0.06, label, size, C.cream, { weight: '900', sw: Math.max(4, size * 0.2) });
  c.add(label_);
  c.label = label_;
  if (o.icon) {
    const ic = img(scene, w / 2 - h * 0.5, -h * 0.06, o.icon, (h * 0.55) / 48);
    c.add(ic);
    label_.x = -h * 0.2;
  }
  if (hasSub) {
    const ss = o.subSize ?? Math.round(h * 0.26);
    const st = txt(scene, 0, h * 0.15, o.sub!, ss, C.cream, { weight: '700' });
    c.add(st);
    if (o.subIcon) {
      const ic = img(scene, 0, h * 0.15, o.subIcon, (ss * 1.1) / 44);
      c.add(ic);
      const tw = st.width - 12;
      ic.x = -tw / 2 - 2;
      st.x = ss * 0.55;
    }
    c.setData('sub', st);
  }
  c.enabled = true;
  c.setLabel = (s: string) => setT(label_, s);
  c.setEnabled = (on: boolean) => {
    c.enabled = on;
    const f = FRAMES[on ? 'btn_' + color : 'btn_grey'];
    bg.setTexture(f.tex, on ? 'btn_' + color : 'btn_grey');
  };
  pressable(scene, c, w, h, cb, () => c.enabled, o.onDisabled, o.silent);
  if (o.glow) {
    const gl = img(scene, 0, 0, 'glow', 1).setTint(0x8fe0ff).setAlpha(0.5);
    gl.setScale((w * 1.5) / 64 / 2, (h * 2.2) / 64 / 2);
    c.addAt(gl, 0);
    scene.tweens.add({ targets: gl, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
  }
  return c;
}

export function roundBtn(scene: Phaser.Scene, x: number, y: number, key: string, icon: string, size: number, cb: () => void): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(img(scene, 0, 0, key, size / 100));
  c.add(img(scene, 0, 0, icon, (size * 0.5) / 48));
  pressable(scene, c, size, size, cb);
  return c;
}

export interface Bar {
  set(pct: number, label?: string): void;
  g: Phaser.GameObjects.Graphics;
  t?: Phaser.GameObjects.Text;
}

export function bar(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number, label?: string, fontSize?: number): Bar {
  const g = scene.add.graphics();
  const t = label !== undefined ? txt(scene, x + w / 2, y + h / 2 - 1, label, fontSize ?? Math.round(h * 0.7), C.cream, { weight: '900' }) : undefined;
  const r = h / 2;
  const b: Bar = {
    g,
    t,
    set(pct: number, lab?: string) {
      pct = Phaser.Math.Clamp(pct, 0, 1);
      g.clear();
      g.fillStyle(0x2b1a10, 1).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, r + 3);
      g.fillStyle(0x5c3a1c, 1).fillRoundedRect(x, y, w, h, r);
      const fw = Math.max(pct > 0 ? h : 0, w * pct);
      if (fw > 0) {
        g.fillStyle(color, 1).fillRoundedRect(x, y, fw, h, r);
        g.fillStyle(0xffffff, 0.28).fillRoundedRect(x + 4, y + 2, Math.max(2, fw - 8), h * 0.36, h * 0.18);
      }
      if (t && lab !== undefined) setT(t, lab);
    },
  };
  b.set(0);
  return b;
}

export interface TopBar {
  refresh(): void;
}

export function versionLabel(scene: Phaser.Scene) {
  txt(scene, W / 2, H - 11, `גרסה ${VERSION}`, 14, C.cream, { sw: 3 }).setAlpha(0.85).setDepth(900);
}

export function banner(scene: Phaser.Scene, title: string, y = 52, w = 400): Phaser.GameObjects.Container {
  const c = scene.add.container(W / 2, y);
  c.add(nine(scene, 0, 4, 'banner', w, 96, 90, 0, 0));
  c.add(txt(scene, 0, -8, title, 44, C.ink, { weight: '900' }));
  return c;
}

export function topBar(scene: Phaser.Scene, title?: string): TopBar {
  const s = G.save;
  // זהב ויהלומים
  nine(scene, 150, 68, 'panel_wood', 252, 112, 24);
  img(scene, 62, 46, 'coin', 0.78);
  img(scene, 62, 90, 'gem', 0.74);
  const gold = txt(scene, 252, 46, '', 25, C.gold, { ox: 1, weight: '900' });
  const gems = txt(scene, 252, 90, '', 25, C.blue, { ox: 1, weight: '900' });
  // גיבור
  nine(scene, 1124, 62, 'panel_wood', 268, 96, 24);
  const px = 1010;
  const py = 62;
  const ring = scene.add.graphics();
  img(scene, px, py, 'portrait_ring', 1.02);
  img(scene, px - 2, py + 30, 'hero_head', 1.25);
  const lvl = txt(scene, 1238, 42, '', 24, C.gold, { ox: 1, weight: '900' });
  txt(scene, 1238, 82, HERO_NAME, 22, C.cream, { ox: 1 });
  if (title) banner(scene, title);
  versionLabel(scene);
  const tb: TopBar = {
    refresh() {
      setT(gold, `${fmt(s.gold)} זהב`);
      setT(gems, `${fmt(s.gems)} יהלומים`);
      setT(lvl, `רמה ${s.heroLvl}`);
      const pct = s.heroLvl >= MAX_HERO_LEVEL ? 1 : s.heroXp / xpToNext(s.heroLvl);
      ring.clear();
      ring.lineStyle(9, 0x2b1a10, 1).strokeCircle(px, py, 50);
      ring.lineStyle(6, 0x3a5a8a, 1).strokeCircle(px, py, 50);
      ring.lineStyle(6, 0xffc93a, 1);
      ring.beginPath();
      ring.arc(px, py, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, pct), false);
      ring.strokePath();
    },
  };
  tb.refresh();
  return tb;
}

export interface Modal {
  c: Phaser.GameObjects.Container;
  close(): void;
}

export function modal(scene: Phaser.Scene, w: number, h: number, title?: string, onClose?: () => void, closable = true): Modal {
  const c = scene.add.container(0, 0).setDepth(1000);
  const dim = scene.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x120a05, 0.66).setInteractive();
  c.add(dim);
  const box = scene.add.container(W / 2, H / 2);
  c.add(box);
  box.add(nine(scene, 0, 0, 'panel_wood', w, h, 24));
  box.add(nine(scene, 0, 0, 'panel_parch', w - 30, h - 30, 22));
  if (title) box.add(txt(scene, 0, -h / 2 + 52, title, 36, C.ink, { weight: '900' }));
  const m: Modal = {
    c: box,
    close() {
      c.destroy();
      onClose?.();
    },
  };
  if (closable) {
    const x = roundBtn(scene, w / 2 - 14, -h / 2 + 14, 'round_red', 'ic_close', 56, () => m.close());
    box.add(x);
  }
  box.setScale(0.85);
  box.setAlpha(0);
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 170, ease: 'Back.Out' });
  return m;
}

export function toast(scene: Phaser.Scene, s: string, color: string = C.cream) {
  const c = scene.add.container(W / 2, H - 150).setDepth(2000);
  const t = txt(scene, 0, 0, s, 24, color, { weight: '900' });
  c.add(nine(scene, 0, 0, 'pill', t.width + 40, 50, 20));
  c.add(t);
  c.setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, y: H - 170, duration: 160 });
  scene.tweens.add({ targets: c, alpha: 0, delay: 1500, duration: 350, onComplete: () => c.destroy() });
}

/** מספר מרחף (זהב שהתקבל וכו') */
export function floatText(scene: Phaser.Scene, x: number, y: number, s: string, color: string) {
  const t = txt(scene, x, y, s, 26, color, { weight: '900' }).setDepth(2000);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 800, ease: 'Cubic.Out', onComplete: () => t.destroy() });
}

export function rewardChip(scene: Phaser.Scene, x: number, y: number, icon: string, value: string, color: string = C.cream): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(img(scene, 0, 0, icon, 0.6));
  c.add(txt(scene, 0, 24, value, 17, color, { weight: '900' }));
  return c;
}
