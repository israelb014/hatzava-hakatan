// מצב גלובלי, מעבר בין מסכים ושמירה
import Phaser from 'phaser';
import { type Save, loadSave, storeSave } from './game/save';
import { ensureDaily } from './game/economy';
import { audio } from './audio';

declare const __APP_VERSION__: string;
export const VERSION: string = __APP_VERSION__;
export const W = 1280;
export const H = 720;

export const G = {
  save: null as unknown as Save,
  /** יחס רזולוציה פנימי (1 עד 1.5) */
  res: 1,
  /** גרסת PWA חדשה מחכה - תוחל במעבר המסך הבא */
  applyUpdate: null as null | (() => void),
  transitioning: false,
};

export function initSave() {
  G.save = loadSave(localStorage);
  ensureDaily(G.save);
  audio.sfxOn = G.save.settings.sfx;
  audio.musicOn = G.save.settings.music;
  persist();
}

export function persist() {
  storeSave(localStorage, G.save);
}

export function setupScene(scene: Phaser.Scene) {
  const cam = scene.cameras.main;
  cam.setZoom(G.res);
  cam.centerOn(W / 2, H / 2);
  cam.fadeIn(160, 24, 14, 8);
  G.transitioning = false;
  scene.input.setTopOnly(true);
}

export function go(scene: Phaser.Scene, key: string, data?: object) {
  if (G.transitioning) return;
  G.transitioning = true;
  persist();
  // עדכון גרסה לעולם לא באמצע קרב - רק במעבר בין מסכי התפריט
  if (G.applyUpdate && key !== 'Battle') {
    const f = G.applyUpdate;
    G.applyUpdate = null;
    f();
    return;
  }
  ensureDaily(G.save);
  const cam = scene.cameras.main;
  cam.fadeOut(130, 24, 14, 8);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
