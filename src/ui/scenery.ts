// נוף שכבות עם פרלקסה
import Phaser from 'phaser';
import { W } from '../core';
import { img } from '../art/svg';
import { REGION_SKY } from '../scenes/Boot';
import { FAR_H, MID_H, GROUND_H } from '../art/bg';

export const GROUND_TOP = 410;

export class Scenery {
  private far: Phaser.GameObjects.TileSprite;
  private mid: Phaser.GameObjects.TileSprite;
  private ground: Phaser.GameObjects.TileSprite;
  private clouds: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, region: number, boss = false) {
    const [top, bottom] = REGION_SKY[region];
    const g = scene.add.graphics();
    const mix = (c: number, k: number) => {
      const r = ((c >> 16) & 255) * k;
      const gg = ((c >> 8) & 255) * (k * 0.8);
      const b = (c & 255) * (k * 0.8);
      return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b);
    };
    const t = boss ? mix(region === 3 ? top : 0x5a1c2a, 0.75) : top;
    const b = boss ? 0xb3382a : bottom;
    g.fillGradientStyle(t, t, b, b, 1);
    g.fillRect(-20, -20, W + 40, 470);
    if (!boss && (region === 0 || region === 2)) {
      img(scene, 250, 120, 'sun', 1.5).setAlpha(0.95);
      for (let i = 0; i < 4; i++) {
        const c = img(scene, 100 + i * 360, 70 + (i % 2) * 70, 'cloud', 0.9 + (i % 3) * 0.25).setAlpha(0.85);
        this.clouds.push(c);
      }
    }
    this.far = scene.add.tileSprite(0, 110, W, FAR_H, `far${region}`).setOrigin(0, 0);
    this.mid = scene.add.tileSprite(0, 215, W, MID_H, `mid${region}`).setOrigin(0, 0);
    this.ground = scene.add.tileSprite(0, GROUND_TOP, W, GROUND_H, `ground${region}`).setOrigin(0, 0);
    if (boss) {
      this.far.setTint(0xd08a8a);
      this.mid.setTint(0xc88080);
      this.ground.setTint(0xe0a8a0);
    }
  }

  setScroll(x: number) {
    this.far.tilePositionX = x * 0.15;
    this.mid.tilePositionX = x * 0.4;
    this.ground.tilePositionX = x;
  }

  tick(dt: number) {
    for (const c of this.clouds) {
      c.x += dt * 6;
      if (c.x > W + 120) c.x = -120;
    }
  }
}
