// מצב גלובלי, מעבר בין מסכים ושמירה
import Phaser from 'phaser';
import { type Save, loadSave, storeSave, SAVE_KEY } from './game/save';
import { UNIT_IDS } from './game/data';
import { ensureDaily } from './game/economy';
import { audio } from './audio';

declare const __APP_VERSION__: string;
export const VERSION: string = __APP_VERSION__;
export const W = 1280;
export const H = 720;

/**
 * אזור התצוגה. מערכת הצירים של התוכן המרכזי נשארת 0..1280, והמסך מתרחב
 * באופן סימטרי לשני הצדדים במסכים רחבים: הטווח הנראה הוא [-ex, 1280 + ex].
 */
export const V = { w: 1280, ex: 0, safeL: 0, safeR: 0 };
/** עיגון לקצה השמאלי / הימני של המסך (כולל שוליים בטוחים למגרעת ולפינות מעוגלות) */
export const L = (x: number) => x - V.ex + V.safeL;
export const R = (x: number) => x + V.ex - V.safeR;

const MAX_W = 1760; // עד יחס של בערך 22:9
let nativeInsets = { l: 0, r: 0 };

function cssInset(side: 'left' | 'right'): number {
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;padding-${side}:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(d);
  const v = parseFloat(getComputedStyle(d).getPropertyValue(`padding-${side}`)) || 0;
  d.remove();
  return v;
}

/** מחשב מחדש את מידות התצוגה לפי החלון. מחזיר true אם משהו השתנה */
export function computeView(): boolean {
  const ww = Math.max(window.innerWidth, window.innerHeight);
  const wh = Math.max(1, Math.min(window.innerWidth, window.innerHeight));
  const w = Math.round(Math.min(MAX_W, Math.max(W, (H * ww) / wh)) / 2) * 2;
  const ex = (w - W) / 2;
  // המרה מפיקסלים של CSS ליחידות עיצוב
  const k = Math.max(H / wh, w / ww);
  const base = ex > 0 ? 14 : 0;
  const cap = ex + 0;
  const safeL = Math.min(cap, Math.max(base, Math.max(cssInset('left'), nativeInsets.l) * k));
  const safeR = Math.min(cap, Math.max(base, Math.max(cssInset('right'), nativeInsets.r) * k));
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const res = Math.round(Math.min(1.5, Math.max(1, (wh * dpr) / H)) * 100) / 100;
  const changed = w !== V.w || res !== G.res || Math.abs(safeL - V.safeL) > 1 || Math.abs(safeR - V.safeR) > 1;
  V.w = w;
  V.ex = ex;
  V.safeL = safeL;
  V.safeR = safeR;
  G.res = res;
  return changed;
}

/** נקרא מהמעטפת של אנדרואיד עם שולי המגרעת בפיקסלים פיזיים */
export function setNativeInsets(l: number, r: number) {
  const dpr = window.devicePixelRatio || 1;
  nativeInsets = { l: l / dpr, r: r / dpr };
}

export const G = {
  save: null as unknown as Save,
  /** יחס רזולוציה פנימי (1 עד 1.5) */
  res: 1,
  /** גרסת PWA חדשה מחכה - תוחל במעבר המסך הבא */
  applyUpdate: null as null | (() => void),
  transitioning: false,
  /** מספר החיילים שעברו למילואים בהמרת שמירה ישנה (להצגת הודעה חד-פעמית) */
  movedToReserve: 0,
};

export function initSave() {
  let oldVersion = 0;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    oldVersion = JSON.parse(raw ?? '{}').v ?? 0;
    // לפני המרת שמירה מגרסה ישנה שומרים עותק שלה, ליתר ביטחון
    if (raw && oldVersion === 1) localStorage.setItem(SAVE_KEY + '-backup-1', raw);
  } catch {
    oldVersion = 0;
  }
  G.save = loadSave(localStorage);
  if (oldVersion === 1) for (const id of UNIT_IDS) G.movedToReserve += G.save.reserve[id];
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
