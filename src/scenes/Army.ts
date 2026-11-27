// הצבא שלי - גיוס, שדרוג ומילואים
import Phaser from 'phaser';
import { G, W, L, go, setupScene, fmt, persist } from '../core';
import { img } from '../art/svg';
import { INTERIOR_OX } from '../art/bg';
import { Puppet } from '../art/puppet';
import { button, topBar, txt, C, nine, toast, bar, setT, pressable, type TopBar, type Bar, type Btn, floatText } from '../ui/widgets';
import { UNIT_IDS, UNITS, UNIT_SLOTS, MAX_UNIT_LEVEL, type UnitId } from '../game/data';
import { armySlots, capacity, freeSlots, isUnlocked, recruit, recruitCost, upgradeCost, upgradeUnit, unitStats, track, toReserve, fromReserve } from '../game/economy';
import { audio } from '../audio';

export function interiorBg(scene: Phaser.Scene) {
  scene.add.image(-INTERIOR_OX, 0, 'interior').setOrigin(0, 0);
  for (const x of [105, 1175]) {
    const gl = img(scene, x, 300, 'glow', 4).setTint(0xffa63a).setAlpha(0.35);
    scene.tweens.add({ targets: gl, alpha: 0.2, duration: 480, yoyo: true, repeat: -1 });
    const f = img(scene, x, 322, 'flame', 1.1);
    scene.tweens.add({ targets: f, scaleY: f.scaleY * 1.18, scaleX: f.scaleX * 0.92, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

const slotText = (n: number) => (n === 1 ? 'תופס מקום אחד' : `תופס ${n} מקומות`);

interface Card {
  id: UnitId;
  refresh(): void;
}

export class ArmyScene extends Phaser.Scene {
  private top!: TopBar;
  private cards: Card[] = [];
  private cap!: Bar;
  private resT!: Phaser.GameObjects.Text;
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
    const cw = 250;
    const ch = 240;
    const gap = 12;
    UNIT_IDS.forEach((id, i) => {
      const row = i < 4 ? 0 : 1;
      const col = i < 4 ? i : i - 4;
      const n = row === 0 ? 4 : 3;
      const total = n * cw + (n - 1) * gap;
      // סדר מימין לשמאל
      const x = W / 2 + total / 2 - cw / 2 - col * (cw + gap);
      const y = 258 + row * (ch + 8);
      this.cards.push(this.makeCard(id, x, y, cw, ch));
    });
    const bx = L(36);
    txt(this, bx + 250, 632, 'קיבולת צבא', 21, C.cream, { ox: 1, weight: '900' });
    this.cap = bar(this, bx, 652, 250, 28, 0x6fd04a, '', 17);
    this.resT = txt(this, bx + 250, 698, '', 17, C.gold, { ox: 1, weight: '900' });
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
    const n = armySlots(s);
    const cap = capacity(s.heroLvl);
    this.cap.set(n / cap, `${n}/${cap} מקומות`);
    let res = 0;
    for (const id of UNIT_IDS) res += s.reserve[id];
    setT(this.resT, res > 0 ? `במילואים: ${res} חיילים` : '');
  }

  private makeCard(id: UnitId, x: number, y: number, w: number, h: number): Card {
    const s = G.save;
    const d = UNITS[id];
    this.add.container(x, y, [nine(this, 0, 0, 'panel_card', w, h, 16)]);
    const unlocked = isUnlocked(s, id);
    // הדמות מצוירת מתחת לשכבת הטקסט, ובגודל שלא מגיע לאזור השם
    const p = new Puppet(this, id);
    p.setChar(id, id === 'giant' ? 0.56 : 0.92).setPosition(x + 66, y + 44);
    this.puppets.push(p);
    const c = this.add.container(x, y);
    // לשם יש אזור משלו לכל רוחב הכרטיס; הגופן מתכווץ אם צריך
    c.add(nine(this, 0, -h / 2 + 27, 'pill', w - 22, 36, 17));
    const name = txt(this, 0, -h / 2 + 26, d.name, 23, C.cream, { weight: '900' });
    const maxW = w - 40;
    if (name.width > maxW) name.setScale(maxW / name.width);
    c.add(name);
    if (!unlocked) {
      p.setAlpha(0.35);
      c.add(this.add.rectangle(0, 20, w - 20, h - 62, 0x1c1008, 0.5));
      c.add(img(this, 0, 6, 'lock', 1.2));
      c.add(txt(this, 0, 74, `נפתח ברמה ${d.unlock}`, 23, C.cream, { weight: '900' }));
      return { id, refresh() {} };
    }
    const lx = -w / 2 + 16;
    const lvl = txt(this, lx, -62, '', 19, C.gold, { ox: 0, weight: '900' });
    const cnt = txt(this, lx, -37, '', 27, C.cream, { ox: 0, weight: '900' });
    c.add(img(this, lx + 9, -12, 'ic_slot', 0.36));
    c.add(txt(this, lx + 20, -12, slotText(UNIT_SLOTS[id]), 14, '#f0d9a8', { ox: 0, weight: '700' }));
    c.add(img(this, lx + 9, 9, 'heart', 0.32));
    const hp = txt(this, lx + 19, 9, '', 15, C.cream, { ox: 0 });
    c.add(img(this, lx + 68, 9, 'ic_sword', 0.3));
    const atk = txt(this, lx + 78, 9, '', 15, C.cream, { ox: 0 });
    c.add([lvl, cnt, hp, atk]);
    // מילואים: העברת חיילים בין הצבא למילואים
    const small = (bx: number, key: string, icon: string, cb: () => void) => {
      const b = this.add.container(bx, 36);
      b.add(img(this, 0, 0, key, 0.34));
      b.add(img(this, 0, 0, icon, 0.4));
      pressable(this, b, 40, 38, cb, () => true, undefined, true);
      c.add(b);
    };
    small(lx + 16, 'round_red', 'ic_minus', () => {
      if (toReserve(s, id)) {
        audio.play('click');
        persist();
        this.refresh();
      } else audio.play('error');
    });
    small(lx + 54, 'round_blue', 'ic_plus', () => {
      if (fromReserve(s, id)) {
        audio.play('click');
        persist();
        this.refresh();
      } else {
        audio.play('error');
        toast(this, s.reserve[id] <= 0 ? 'אין חיילים מסוג זה במילואים' : 'אין מספיק מקום בצבא');
      }
    });
    const resT = txt(this, lx + 76, 36, '', 15, '#f0d9a8', { ox: 0, weight: '700' });
    c.add(resT);
    const bw = 112;
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
      toast(this, freeSlots(s) < UNIT_SLOTS[id] ? (s.reserve[id] > 0 ? 'הצבא מלא - יש חיילים במילואים' : 'הצבא מלא - העלה את רמת הגיבור') : 'אין מספיק זהב');
      this.stopHold();
      return false;
    };
    const rec: Btn = button(this, w / 2 - bw / 2 - 10, h / 2 - 40, bw, 60, 'גייס', 'green', doRecruit, { size: 22, price: [{ icon: 'coin', text: '0' }], subSize: 16, silent: true });
    // לחיצה ארוכה מגייסת ברצף
    rec.on('pointerdown', () => {
      this.stopHold();
      this.hold = this.time.addEvent({ delay: 110, startAt: -340, loop: true, callback: () => doRecruit() });
    });
    rec.on('pointerout', () => this.stopHold());
    const up: Btn = button(this, -w / 2 + bw / 2 + 10, h / 2 - 40, bw, 60, 'שדרג', 'blue', () => {
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
    }, { size: 22, price: [{ icon: 'coin', text: '0' }], subSize: 16, silent: true });
    c.add([rec, up]);
    return {
      id,
      refresh: () => {
        const u = s.units[id];
        const st = unitStats(id, u.lvl);
        setT(lvl, `רמה ${u.lvl}`);
        cnt.setText(`×${u.count}`);
        hp.setText(fmt(st.hp));
        atk.setText(fmt(st.atk));
        setT(resT, `מילואים ${s.reserve[id]}`);
        rec.setPrice([{ icon: 'coin', text: fmt(recruitCost(id, u.lvl)) }]);
        if (u.lvl >= MAX_UNIT_LEVEL) up.setPrice('מקסימום');
        else {
          // מחיר היהלומים בתוך הכפתור, לצד מחיר הזהב
          const cost = upgradeCost(id, u.lvl);
          const items = [{ icon: 'coin', text: fmt(cost.gold) }];
          if (cost.gems > 0) items.push({ icon: 'gem', text: String(cost.gems) });
          up.setPrice(items);
        }
      },
    };
  }
}
