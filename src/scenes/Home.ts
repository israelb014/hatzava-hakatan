// מחנה - מסך הבית
import Phaser from 'phaser';
import { G, W, L, R, go, persist, setupScene } from '../core';
import { img } from '../art/svg';
import { Puppet } from '../art/puppet';
import { Scenery } from '../ui/scenery';
import { button, topBar, txt, C, roundBtn, nine, modal, type Modal, toast } from '../ui/widgets';
import { claimableCount } from '../game/economy';
import { audio } from '../audio';
import { openBackupDialog, confirmDialog } from '../platform';
import { newSave } from '../game/save';

export class HomeScene extends Phaser.Scene {
  private scenery!: Scenery;
  private hero!: Puppet;
  private flames: Phaser.GameObjects.Image[] = [];
  private t = 0;

  constructor() {
    super('Home');
  }

  create() {
    audio.setMode('camp');
    this.flames = [];
    this.scenery = new Scenery(this, 0);
    // אוהלים, דגל, מדורה, גדר
    img(this, 150, 560, 'tent', 1.55);
    img(this, 380, 520, 'tent', 1.2);
    img(this, 70, 640, 'bush', 1.3);
    img(this, L(40), 660, 'bush', 1.1);
    img(this, R(1250), 700, 'bush', 1.2);
    img(this, 880, 700, 'fence', 1.5);
    img(this, 800, 560, 'fence', 0.9);
    img(this, 560, 590, 'flag', 1.05);
    img(this, 770, 690, 'rock', 1.3);
    img(this, 255, 690, 'rock', 0.9);
    const glow = img(this, 395, 640, 'glow', 4.2).setTint(0xffa63a).setAlpha(0.4);
    this.tweens.add({ targets: glow, alpha: 0.22, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    img(this, 395, 668, 'logs', 1.5);
    for (let i = 0; i < 3; i++) {
      const f = img(this, 395 + (i - 1) * 22, 660, 'flame', i === 1 ? 1.75 : 1.15);
      f.setData('b', f.scaleY).setData('p', i * 2.1);
      this.flames.push(f);
    }
    this.hero = new Puppet(this, 'hero');
    this.hero.setChar('hero', 1.7).setPosition(640, 668);

    topBar(this);
    txt(this, W / 2, 46, 'מחנה', 60, C.cream, { weight: '900', sw: 9, shadow: true });
    txt(this, W / 2, 100, 'הצבא הקטן', 34, '#ffd86b', { weight: '900', sw: 7 });

    const bx = R(1084);
    const fight = button(this, bx, 252, 372, 148, 'לקרב', 'orange', () => go(this, 'Map'), { size: 86 });
    this.tweens.add({ targets: fight, scaleX: 1.025, scaleY: 1.025, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    button(this, bx, 398, 352, 104, 'הצבא שלי', 'brown', () => go(this, 'Army'), { size: 50 });
    button(this, bx, 512, 352, 104, 'הגיבור', 'brown', () => go(this, 'Hero'), { size: 50 });
    button(this, bx, 626, 352, 104, 'משימות', 'brown', () => go(this, 'Quests'), { size: 50 });
    const n = claimableCount(G.save);
    if (n > 0) {
      const badge = this.add.container(bx - 160, 590);
      badge.add(img(this, 0, 0, 'round_red', 0.5));
      badge.add(txt(this, 0, -1, String(n), 24, C.cream, { weight: '900' }));
      this.tweens.add({ targets: badge, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
    }
    roundBtn(this, L(58), 172, 'round_dark', 'ic_gear', 68, () => this.openSettings());

    this.setup();
    if (!G.save.tutorialDone) this.time.delayedCall(350, () => this.tutorial());
    else if (G.movedToReserve > 0) this.time.delayedCall(350, () => this.reserveNotice());
  }

  private setup() {
    // הגדרת המצלמה בסוף, אחרי שכל האובייקטים נוצרו
    setupScene(this);
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.t += dt;
    this.scenery.tick(dt);
    this.hero.tick(dt);
    for (const f of this.flames) {
      const p = f.getData('p') as number;
      const b = f.getData('b') as number;
      f.scaleY = b * (1 + Math.sin(this.t * 9 + p) * 0.14);
      f.scaleX = b * (1 + Math.sin(this.t * 7 + p * 2) * 0.08);
      f.rotation = Math.sin(this.t * 5 + p) * 0.07;
    }
  }

  /** הודעה חד-פעמית אחרי המרת שמירה: חיילים שחרגו מהקיבולת החדשה עברו למילואים */
  private reserveNotice() {
    const n = G.movedToReserve;
    G.movedToReserve = 0;
    const m = modal(this, 640, 400, 'שינוי בקיבולת הצבא');
    m.c.add(
      txt(this, 0, -30, `מעכשיו ענק תופס 3 מקומות וסמוראי תופס 2 מקומות. שום חייל לא נמחק: ${n} חיילים שחרגו מהקיבולת עברו למילואים. אפשר להחליף בין הצבא למילואים במסך "הצבא שלי".`, 22, C.ink, { weight: '700', wrap: 540, align: 'center' }),
    );
    m.c.add(button(this, 0, 130, 280, 70, 'לצבא שלי', 'orange', () => go(this, 'Army'), { size: 30 }));
  }

  private openSettings() {
    const s = G.save;
    const m: Modal = modal(this, 560, 470, 'הגדרות');
    const row = (y: number, label: string, icon: string, get: () => boolean, set: (v: boolean) => void) => {
      m.c.add(img(this, 200, y, icon, 0.8).setTint(0x5c3a1c));
      m.c.add(txt(this, 160, y, label, 30, C.ink, { ox: 1, weight: '900' }));
      const b = button(this, -130, y, 170, 64, '', get() ? 'green' : 'grey', () => {
        set(!get());
        persist();
        m.close();
        this.openSettings();
      });
      b.setLabel(get() ? 'פועל' : 'כבוי');
      m.c.add(b);
    };
    row(-95, 'מוזיקה', 'ic_music', () => s.settings.music, (v) => {
      s.settings.music = v;
      audio.setMusic(v);
    });
    row(-15, 'צלילים', 'ic_sound', () => s.settings.sfx, (v) => {
      s.settings.sfx = v;
      audio.sfxOn = v;
    });
    m.c.add(
      button(this, 0, 75, 400, 70, 'קוד גיבוי', 'blue', () => {
        m.close();
        openBackupDialog(() => this.scene.restart());
      }, { size: 30 }),
    );
    m.c.add(
      button(this, 0, 160, 400, 70, 'איפוס התקדמות', 'red', () => {
        m.close();
        confirmDialog('איפוס התקדמות', 'כל ההתקדמות תימחק ולא ניתן יהיה לשחזר אותה. להמשיך?', 'אפס הכול', () => {
          const settings = { ...G.save.settings };
          G.save = newSave();
          G.save.settings = settings;
          persist();
          this.scene.restart();
        });
      }, { size: 30 }),
    );
  }

  private tutorial() {
    const steps: { x: number; y: number; text: string }[] = [
      { x: R(888), y: 398, text: 'ברוך הבא למחנה! כאן מגייסים חיילים חדשים ומשדרגים אותם.' },
      { x: R(888), y: 512, text: 'כאן מציידים את הגיבור בציוד שנופל בקרבות ומשדרגים את הכישורים שלו.' },
      { x: R(888), y: 626, text: 'השלם משימות יומיות והישגים כדי לקבל זהב ויהלומים.' },
      { x: R(878), y: 252, text: 'מוכן? צא לקרב! הזז את הגיבור עם החצים, והחיילים ילחמו לצדך.' },
    ];
    let i = 0;
    const layer = this.add.container(0, 0).setDepth(1500);
    const dim = this.add.rectangle(W / 2, 360, W * 3, 1500, 0x120a05, 0.45).setInteractive();
    layer.add(dim);
    const bubble = this.add.container(0, 0);
    layer.add(bubble);
    const show = () => {
      bubble.removeAll(true);
      const st = steps[i];
      const bw = 430;
      const t = txt(this, 0, 0, st.text, 25, C.ink, { weight: '700', wrap: bw - 50, align: 'center' });
      const bh = t.height + 74;
      bubble.setPosition(st.x - bw / 2 - 50, st.y);
      bubble.add(nine(this, 0, 0, 'panel_parch', bw, bh, 22));
      const tail = img(this, bw / 2 + 8, 0, 'bubble_tail', 1.1);
      tail.rotation = -Math.PI / 2;
      bubble.add(tail);
      t.y = -14;
      bubble.add(t);
      bubble.add(txt(this, 0, bh / 2 - 26, `${i + 1}/${steps.length}  ·  הקש להמשך`, 17, '#8a6a3a', { weight: '700' }));
      const hand = img(this, bw / 2 + 74, 26, 'hand', 1.1);
      hand.rotation = -0.5;
      bubble.add(hand);
      this.tweens.add({ targets: hand, x: hand.x + 14, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      bubble.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
    };
    dim.on('pointerup', () => {
      audio.play('click');
      i++;
      if (i >= steps.length) {
        layer.destroy();
        G.save.tutorialDone = true;
        persist();
        toast(this, 'בהצלחה, מפקד!');
      } else show();
    });
    show();
  }
}
