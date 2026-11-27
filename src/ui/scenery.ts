// נוף שכבות עם פרלקסה. כל שכבה מצוירת כאריחים חופפים (לא TileSprite),
// כך שאין תפרים בין האריחים בשום רמת הגדלה.
import Phaser from 'phaser';
import { V } from '../core';
import { img } from '../art/svg';
import { FAR_H, MID_H, GROUND_H, BG_W, CLOUD_TINT } from '../art/bg';

export const GROUND_TOP = 410;

interface Layer {
  imgs: Phaser.GameObjects.Image[];
  factor: number;
}

export class Scenery {
  private layers: Layer[] = [];
  private clouds: { im: Phaser.GameObjects.Image; speed: number }[] = [];
  private left: number;
  private width: number;
  readonly groundTop: number;

  constructor(scene: Phaser.Scene, region: number, boss = false, groundTop = GROUND_TOP) {
    this.groundTop = groundTop;
    this.left = -V.ex - 2;
    this.width = V.w + 4;
    const sky = scene.add.image(this.left, -4, boss ? 'skyboss' : `sky${region}`).setOrigin(0, 0);
    sky.setDisplaySize(this.width, groundTop + 70);
    if (!boss && (region === 0 || region === 2)) img(scene, 250 - V.ex * 0.5, 110, 'sun', 1.5).setAlpha(0.95);
    // שכבת עננים שנעה לאט
    const [tint, alpha] = boss ? [0x4a1422, 0.6] : CLOUD_TINT[region];
    const n = Math.ceil(this.width / 330) + 1;
    for (let i = 0; i < n; i++) {
      const far = i % 2 === 0;
      const c = img(scene, this.left + i * 330 + (i % 3) * 40, 56 + ((i * 53) % 110), 'cloud', far ? 0.7 + (i % 3) * 0.12 : 1.05 + (i % 2) * 0.2);
      c.setTint(tint).setAlpha(alpha * (far ? 0.7 : 1));
      this.clouds.push({ im: c, speed: far ? 4 : 8 });
    }
    const mk = (key: string, y: number, h: number, factor: number, tint?: number) => {
      const count = Math.ceil(this.width / BG_W) + 1;
      const imgs: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < count; i++) {
        const im = scene.add.image(0, y, key).setOrigin(0, 0);
        // חפיפה של שני פיקסלים בין אריחים סמוכים
        im.setDisplaySize(BG_W + 2, h);
        if (tint !== undefined) im.setTint(tint);
        imgs.push(im);
      }
      this.layers.push({ imgs, factor });
    };
    mk(`far${region}`, groundTop - 300, FAR_H, 0.15, boss ? 0xd08a8a : undefined);
    mk(`mid${region}`, groundTop - 195, MID_H, 0.4, boss ? 0xc88080 : undefined);
    mk(`ground${region}`, groundTop, GROUND_H, 1, boss ? 0xe0a8a0 : undefined);
    this.setScroll(0);
  }

  setScroll(x: number) {
    for (const l of this.layers) {
      const s = x * l.factor;
      const off = Math.round(s - Math.floor(s / BG_W) * BG_W);
      for (let i = 0; i < l.imgs.length; i++) l.imgs[i].x = this.left - off + i * BG_W;
    }
  }

  tick(dt: number) {
    const right = this.left + this.width + 140;
    for (const c of this.clouds) {
      c.im.x += dt * c.speed;
      if (c.im.x > right) c.im.x = this.left - 140;
    }
  }
}
