// הצבא שלי - גיוס ושדרוג יחידות
import Phaser from 'phaser';
import { G, W, go, setupScene, fmt, persist } from '../core';
import { img } from '../art/svg';
import { Puppet } from '../art/puppet';
import { button, topBar, txt, C, nine, toast, bar, setT, type TopBar, type Bar, type Btn, floatText } from '../ui/widgets';
import { UNIT_IDS, UNITS, MAX_UNIT_LEVEL, type UnitId } from '../game/data';
import { armyCount, capacity, isUnlocked, recruit, recruitCost, upgradeCost, upgradeUnit, unitStats, track } from '../game/economy';
import { audio } from '../audio';

export function interiorBg(scene: Phaser.Scene) {
  scene.add.image(0, 0, 'interior').setOrigin(0, 0);
  for (const x of [105, 1175]) {
    const gl = img(scene, x, 300, 'glow', 4).setTint(0xffa63a).setAlpha(0.35);
    scene.tweens.add({ targets: gl, alpha: 0.2, duration: 480, yoyo: true, repeat: -1 });
    const f = img(scene, x, 322, 'flame', 1.1);
    scene.tweens.add({ targets: f, scaleY: f.scaleY * 1.18, scaleX: f.scaleX * 0.92, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

interface Card {
  id: UnitId;
  refresh(): void;
  puppet?: Puppet;
}

export class ArmyScene extends Phaser.Scene {
  private top!: TopBar;
  private cards: Card[] = [];
  private cap!: Bar;
  private puppets: Puppet[] = [];
  private hold: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Army');
  }

  create() {
    this.cards = [];
    this.puppets = [];
    interiorBg(this);
    this.top = topBar(this, 'הצבא שלי');
    const cw = 232;
    const ch = 238;
    const gap = 16;
    UNIT_IDS.forEach((id, i) => {
      const row = i < 4 ? 0 : 1;
      const col = i < 4 ? i : i - 4;
      const n = row === 0 ? 4 : 3;
      const total = n * cw + (n - 1) * gap;
      // סדר מימין לשמאל
      const x = W / 2 + total / 2 - cw / 2 - col * (cw + gap);
      const y = 262 + row * (ch + 10);
      this.cards.push(this.makeCard(id, x, y, cw, ch));
    });
    txt(this, 330, 640, 'קיבולת צבא', 22, C.cream, { ox: 1, weight: '900' });
    this.cap = bar(this, 40, 660, 300, 28, 0x6fd04a, '', 18);
    button(this, W / 2, 664, 250, 68, 'חזרה למחנה', 'orange', () => go(this, 'Home'), { size: 30 });
    this.refresh();
    this.input.on('pointerup', () => this.stopHold());
    setupScene(this);
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    for (const p of this.puppets) p.tick(dt);
  }

  private stopHold() {
    this.hold?.remove();
    this.hold = null;
  }

  private refresh() {
    const s = G.save;
    this.top.refresh();
    for (const c of this.cards) c.refresh();
    const n = armyCount(s);
    const cap = capacity(s.heroLvl);
    this.cap.set(n / cap, `${n}/${cap} חיילים`);
  }

  private makeCard(id: UnitId, x: number, y: number, w: number, h: number): Card {
    const s = G.save;
    const d = UNITS[id];
    const c = this.add.container(x, y);
    c.add(nine(this, 0, 0, 'panel_card', w, h, 16));
    const unlocked = isUnlocked(s, id);
    c.add(txt(this, unlocked ? -w / 2 + 18 : 0, -h / 2 + 30, d.name, 23, C.cream, { weight: '900', ox: unlocked ? 0 : 0.5 }));
    const p = new Puppet(this, id);
    const k = id === 'giant' ? 0.62 : 1;
    p.setChar(id, 1.2 * k).setPosition(x + 54, y + 36);
    this.puppets.push(p);
    if (!unlocked) {
      p.setAlpha(0.35);
      c.add(this.add.rectangle(0, 8, w - 20, h - 26, 0x1c1008, 0.5));
      c.add(img(this, 0, -4, 'lock', 1.2));
      c.add(txt(this, 0, 62, `נפתח ברמה ${d.unlock}`, 23, C.cream, { weight: '900' }));
      return { id, refresh() {}, puppet: p };
    }
    const lvl = txt(this, -w / 2 + 18, -60, '', 20, C.gold, { ox: 0, weight: '900' });
    const cnt = txt(this, -w / 2 + 18, -30, '', 28, C.cream, { ox: 0, weight: '900' });
    c.add(img(this, -w / 2 + 28, 0, 'heart', 0.36));
    const hp = txt(this, -w / 2 + 42, 0, '', 17, C.cream, { ox: 0 });
    c.add(img(this, -w / 2 + 28, 22, 'ic_sword', 0.34));
    const atk = txt(this, -w / 2 + 42, 22, '', 17, C.cream, { ox: 0 });
    c.add([lvl, cnt, hp, atk]);
    const bw = 102;
    const doRecruit = () => {
      if (recruit(s, id)) {
        track(s, 'recruits', 1);
        audio.play('coin');
        p.attack();
        persist();
        this.refresh();
        return true;
      }
      audio.play('error');
      toast(this, armyCount(s) >= capacity(s.heroLvl) ? 'הצבא מלא - העלה את רמת הגיבור' : 'אין מספיק זהב');
      this.stopHold();
      return false;
    };
    const rec: Btn = button(this, w / 2 - bw / 2 - 12, h / 2 - 44, bw, 64, 'גייס', 'green', doRecruit, { size: 23, sub: '0', subIcon: 'coin', subSize: 17, silent: true });
    // לחיצה ארוכה מגייסת ברצף
    rec.on('pointerdown', () => {
      this.stopHold();
      this.hold = this.time.addEvent({ delay: 110, startAt: -340, loop: true, callback: () => doRecruit() });
    });
    rec.on('pointerout', () => this.stopHold());
    const up: Btn = button(this, -w / 2 + bw / 2 + 12, h / 2 - 44, bw, 64, 'שדרג', 'blue', () => {
      const u = s.units[id];
      if (u.lvl >= MAX_UNIT_LEVEL) return toast(this, 'היחידה ברמה המרבית');
      const cost = upgradeCost(id, u.lvl);
      if (upgradeUnit(s, id)) {
        track(s, 'upgrades', 1);
        audio.play('upgrade');
        floatText(this, x, y - 20, 'רמה +1', C.green);
        p.attack();
        persist();
        this.refresh();
      } else {
        audio.play('error');
        toast(this, s.gold < cost.gold ? 'אין מספיק זהב' : 'אין מספיק יהלומים');
      }
    }, { size: 23, sub: '0', subIcon: 'coin', subSize: 17, silent: true });
    c.add([rec, up]);
    const gemIc = img(this, 0, 0, 'gem', 0.36).setVisible(false);
    const gemT = txt(this, 0, 0, '', 16, C.blue, { ox: 0, weight: '900' }).setVisible(false);
    c.add([gemIc, gemT]);
    return {
      id,
      puppet: p,
      refresh: () => {
        const u = s.units[id];
        const st = unitStats(id, u.lvl);
        setT(lvl, `רמה ${u.lvl}`);
        cnt.setText(`×${u.count}`);
        hp.setText(fmt(st.hp));
        atk.setText(fmt(st.atk));
        (rec.getData('sub') as Phaser.GameObjects.Text).setText(fmt(recruitCost(id, u.lvl)));
        const sub = up.getData('sub') as Phaser.GameObjects.Text;
        if (u.lvl >= MAX_UNIT_LEVEL) {
          setT(sub, 'מקסימום');
          gemIc.setVisible(false);
          gemT.setVisible(false);
        } else {
          const cost = upgradeCost(id, u.lvl);
          sub.setText(fmt(cost.gold));
          const g = cost.gems > 0;
          gemIc.setVisible(g).setPosition(up.x - 30, up.y - 33);
          gemT.setVisible(g).setPosition(up.x - 18, up.y - 33).setText(String(cost.gems));
        }
      },
    };
  }
}
