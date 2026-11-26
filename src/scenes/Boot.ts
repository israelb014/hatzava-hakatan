import Phaser from 'phaser';
import { buildAtlas, buildTexture } from '../art/svg';
import { charSprites } from '../art/chars';
import { uiSprites } from '../art/uikit';
import { regionArt, interiorArt, mapArt, BG_W, MAP_REGION_W } from '../art/bg';

export const REGION_SKY: [number, number][] = [];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    void this.build();
  }

  private async build() {
    const arc = document.getElementById('boot-arc');
    const prog = (p: number) => arc?.setAttribute('stroke-dashoffset', String(314 * (1 - p)));
    const defs = [...charSprites(), ...uiSprites()];
    await buildAtlas(this, defs, (p) => prog(p * 0.7));
    let done = 0;
    const jobs: Promise<void>[] = [];
    const step = () => prog(0.7 + (++done / 17) * 0.3);
    for (let r = 0; r < 4; r++) {
      const a = regionArt(r);
      REGION_SKY[r] = a.sky;
      jobs.push(buildTexture(this, `far${r}`, BG_W, a.farH, a.far).then(step));
      jobs.push(buildTexture(this, `mid${r}`, BG_W, a.midH, a.mid).then(step));
      jobs.push(buildTexture(this, `ground${r}`, BG_W, a.groundH, a.ground).then(step));
      jobs.push(buildTexture(this, `map${r}`, MAP_REGION_W, 720, mapArt(r)).then(step));
    }
    jobs.push(buildTexture(this, 'interior', 1280, 720, interiorArt()).then(step));
    await Promise.all(jobs);
    this.makeDigits();
    prog(1);
    document.getElementById('boot')?.classList.add('hidden');
    this.scene.start('Home');
  }

  /** גופן ספרות מהיר למספרי הנזק */
  private makeDigits() {
    const chars = '0123456789+-';
    const cw = 30;
    const ch = 44;
    const c = document.createElement('canvas');
    c.width = cw * chars.length;
    c.height = ch;
    const ctx = c.getContext('2d')!;
    ctx.font = '900 34px Rubik, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < chars.length; i++) {
      const x = i * cw + cw / 2;
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#3a2415';
      ctx.strokeText(chars[i], x, ch / 2 + 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(chars[i], x, ch / 2 + 2);
    }
    if (this.textures.exists('digits')) this.textures.remove('digits');
    this.textures.addCanvas('digits', c);
    const cfg = { image: 'digits', width: cw, height: ch, chars, charsPerRow: chars.length, 'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0 };
    this.cache.bitmapFont.add('digits', Phaser.GameObjects.RetroFont.Parse(this, cfg as unknown as Phaser.Types.GameObjects.BitmapText.RetroFontConfig));
  }
}
