// בובת דמות: שלד פשוט עם אנימציות פרוצדורליות (עמידה, הליכה, תקיפה, ירי, כישוף, פגיעה, מוות)
import Phaser from 'phaser';
import { CHARS, type CharDef } from './chars';
import { FRAMES, setFrame } from './svg';

const D2R = Math.PI / 180;
const ATK_DUR: Record<string, number> = { swing: 0.34, thrust: 0.3, shoot: 0.4, cast: 0.5, smash: 0.5 };

export class Puppet extends Phaser.GameObjects.Container {
  def!: CharDef;
  private shadow: Phaser.GameObjects.Image;
  private cape: Phaser.GameObjects.Image;
  private armB: Phaser.GameObjects.Image;
  private legL: Phaser.GameObjects.Image;
  private legR: Phaser.GameObjects.Image;
  private torso: Phaser.GameObjects.Image;
  private head: Phaser.GameObjects.Image;
  private armF: Phaser.GameObjects.Image;
  private parts: Phaser.GameObjects.Image[];
  private t = Math.random() * 10;
  private atk = -1;
  private flashT = 0;
  private flashed = false;
  private flashCd = 0;
  moving = false;
  dying = -1;
  facing = 1;
  baseScale = 1;

  constructor(scene: Phaser.Scene, key: string) {
    super(scene, 0, 0);
    const mk = () => scene.make.image({ key: FRAMES.shadow.tex, frame: 'shadow', add: false });
    this.shadow = mk();
    this.cape = mk();
    this.armB = mk();
    this.legL = mk();
    this.legR = mk();
    this.torso = mk();
    this.head = mk();
    this.armF = mk();
    this.parts = [this.cape, this.armB, this.legL, this.legR, this.torso, this.head, this.armF];
    this.add([this.shadow, ...this.parts]);
    this.setChar(key);
    scene.add.existing(this);
  }

  setChar(key: string, scaleMul = 1): this {
    const d = (this.def = CHARS[key]);
    setFrame(this.shadow, 'shadow', d.wide ? 1.5 : 1.1);
    this.cape.setVisible(!!d.hasCape);
    if (d.hasCape) setFrame(this.cape, `${key}_cape`);
    setFrame(this.armB, `${key}_armb`);
    const legs = !d.floats;
    this.legL.setVisible(legs);
    this.legR.setVisible(legs);
    if (legs) {
      setFrame(this.legL, `${key}_leg`);
      setFrame(this.legR, `${key}_leg`);
    }
    setFrame(this.torso, `${key}_body`);
    setFrame(this.head, `${key}_head`);
    setFrame(this.armF, `${key}_armf`);
    this.baseScale = d.scale * scaleMul;
    this.atk = -1;
    this.dying = -1;
    this.flashT = 0;
    this.flashCd = 0;
    this.clearFlash();
    this.setAlpha(1);
    this.rotation = 0;
    this.face(1);
    this.pose(0);
    return this;
  }

  face(dir: number) {
    this.facing = dir >= 0 ? 1 : -1;
    this.setScale(this.baseScale * this.facing, this.baseScale);
  }

  attack() {
    this.atk = 0;
  }

  flash() {
    // לא מהבהבים ברצף - אחרת דמות שסופגת הרבה מכות נשארת לבנה
    if (this.flashCd > 0) return;
    const big = this.def.scale >= 1.8;
    this.flashT = big ? 0.06 : 0.09;
    this.flashCd = big ? 0.3 : 0.2;
    if (!this.flashed) {
      this.flashed = true;
      for (const p of this.parts) {
        if (big) p.setTint(0xffb0a0);
        else p.setTintFill(0xffffff);
      }
    }
  }

  private clearFlash() {
    if (this.flashed) {
      this.flashed = false;
      for (const p of this.parts) p.clearTint();
    }
  }

  die() {
    this.dying = 0;
  }

  /** מחזיר true כשאנימציית המוות הסתיימה */
  tick(dt: number): boolean {
    this.t += dt;
    if (this.flashCd > 0) this.flashCd -= dt;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.clearFlash();
    }
    if (this.dying >= 0) {
      this.dying += dt / 0.55;
      const k = Math.min(1, this.dying);
      this.rotation = -this.facing * k * 1.35;
      this.setAlpha(1 - k * k);
      return this.dying >= 1;
    }
    if (this.atk >= 0) {
      this.atk += dt / ATK_DUR[this.def.style];
      if (this.atk >= 1) this.atk = -1;
    }
    this.pose(this.atk);
    return false;
  }

  private pose(atk: number) {
    const d = this.def;
    const wide = d.wide ?? 1;
    const walk = this.moving;
    const ph = this.t * (walk ? 11 : 3);
    const s = Math.sin(ph);
    const hover = d.floats ? -12 + Math.sin(this.t * 2.4) * 4 : 0;
    const bob = (walk ? -Math.abs(s) * 2.2 : s * 0.9) + hover;
    const legSwing = walk ? s * 0.6 : 0;
    this.legL.setPosition(-6 * wide, -13);
    this.legR.setPosition(6 * wide, -13);
    this.legL.rotation = legSwing;
    this.legR.rotation = -legSwing;
    this.torso.setPosition(0, -12 + bob);
    this.head.setPosition(1, -34 + bob * 1.25);
    this.head.rotation = walk ? s * 0.035 : Math.sin(this.t * 1.7) * 0.025;
    this.cape.setPosition(-5 * wide, -34 + bob);
    this.cape.rotation = (walk ? 0.28 + s * 0.1 : 0.06 + Math.sin(this.t * 2) * 0.04);
    const ax = 14 * wide;
    let fr = d.armRest * D2R + (walk ? s * 0.18 : Math.sin(this.t * 2.2) * 0.04);
    let fx = 0;
    let fy = 0;
    let lean = 0;
    if (atk >= 0) {
      const a = atk;
      const ease = (x: number) => x * x * (3 - 2 * x);
      switch (d.style) {
        case 'swing':
        case 'smash': {
          const up = d.style === 'smash' ? -165 : -135;
          const down = d.style === 'smash' ? 62 : 48;
          if (a < 0.3) fr = Phaser.Math.Linear(d.armRest, up, ease(a / 0.3)) * D2R;
          else if (a < 0.55) fr = Phaser.Math.Linear(up, down, ease((a - 0.3) / 0.25)) * D2R;
          else fr = Phaser.Math.Linear(down, d.armRest, ease((a - 0.55) / 0.45)) * D2R;
          lean = a > 0.3 && a < 0.7 ? 0.14 : a < 0.3 ? -0.08 : 0;
          break;
        }
        case 'thrust': {
          fx = a < 0.3 ? -6 * ease(a / 0.3) : a < 0.5 ? Phaser.Math.Linear(-6, 16, ease((a - 0.3) / 0.2)) : Phaser.Math.Linear(16, 0, ease((a - 0.5) / 0.5));
          lean = a > 0.3 && a < 0.6 ? 0.12 : 0;
          break;
        }
        case 'shoot': {
          const k = a < 0.35 ? ease(a / 0.35) : a < 0.7 ? 1 : 1 - ease((a - 0.7) / 0.3);
          fr = Phaser.Math.Linear(d.armRest, -90, k) * D2R;
          fx = a > 0.35 && a < 0.5 ? -3 : 0;
          break;
        }
        case 'cast': {
          const k = Math.sin(a * Math.PI);
          fr = (d.armRest - 26 * k) * D2R;
          fy = -5 * k;
          break;
        }
      }
    }
    this.torso.rotation = lean;
    this.armF.setPosition(ax + fx, -30 + bob + fy);
    this.armF.rotation = fr;
    this.armB.setPosition(-ax + 2, -30 + bob);
    this.armB.rotation = walk ? -s * 0.45 : 0.1;
    if (d.floats) this.shadow.setScale((1.5 / FRAMES.shadow.scale) * 0.9);
  }
}
