// התאמות פלטפורמה: PWA, אנדרואיד (Capacitor), חלונות HTML לגיבוי ולעדכונים
import { registerPlugin } from '@capacitor/core';
import { G, VERSION, persist } from './core';
import { exportCode, importCode } from './game/save';
import { audio } from './audio';

const REPO = 'israelb014/hatzava-hakatan';

interface CapWindow {
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
}
export const isNative = () => !!(window as unknown as CapWindow).Capacitor?.isNativePlatform?.();
export const isElectron = () => /electron/i.test(navigator.userAgent);

const ICON = {
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  restore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/></svg>',
};

function openOverlay(html: string): HTMLElement {
  const ov = document.getElementById('overlay')!;
  ov.innerHTML = `<div class="dlg">${html}</div>`;
  ov.classList.add('open');
  ov.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => audio.play('click')));
  return ov;
}
function closeOverlay() {
  const ov = document.getElementById('overlay')!;
  ov.classList.remove('open');
  ov.innerHTML = '';
}

export function confirmDialog(title: string, text: string, ok: string, cb: () => void) {
  const ov = openOverlay(`<h2>${title}</h2><p>${text}</p><div class="row"><button id="d-ok">${ok}</button><button id="d-no" class="grey">ביטול</button></div>`);
  ov.querySelector('#d-ok')!.addEventListener('click', () => {
    closeOverlay();
    cb();
  });
  ov.querySelector('#d-no')!.addEventListener('click', closeOverlay);
}

/** קוד גיבוי: ייצוא וייבוא של השמירה כטקסט */
export function openBackupDialog(onImport: () => void) {
  const code = exportCode(G.save);
  const ov = openOverlay(
    `<h2>קוד גיבוי</h2><p>העתק את הקוד ושמור אותו במקום בטוח. כדי לעבור למכשיר אחר, הדבק שם את הקוד ולחץ על "שחזר מקוד".</p>` +
      `<textarea id="d-code" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea><div class="msg" id="d-msg"></div>` +
      `<div class="row"><button id="d-copy" class="blue">${ICON.copy}העתק</button><button id="d-imp">${ICON.restore}שחזר מקוד</button><button id="d-close" class="grey">סגור</button></div>`,
  );
  const ta = ov.querySelector('#d-code') as HTMLTextAreaElement;
  const msg = ov.querySelector('#d-msg') as HTMLElement;
  ta.value = code;
  const say = (t: string, ok: boolean) => {
    msg.textContent = t;
    msg.className = 'msg ' + (ok ? 'ok' : 'err');
  };
  ov.querySelector('#d-copy')!.addEventListener('click', async () => {
    ta.value = code;
    ta.select();
    try {
      await navigator.clipboard.writeText(code);
      say('הקוד הועתק', true);
    } catch {
      const ok = document.execCommand('copy');
      say(ok ? 'הקוד הועתק' : 'סמן את הקוד והעתק אותו ידנית', ok);
    }
  });
  ov.querySelector('#d-imp')!.addEventListener('click', () => {
    const v = ta.value.trim();
    if (!v || v === code) return say('הדבק כאן קוד גיבוי ממכשיר אחר', false);
    const s = importCode(v);
    if (!s) return say('הקוד אינו תקין', false);
    confirmDialog('שחזור התקדמות', 'ההתקדמות במכשיר הזה תוחלף בהתקדמות שבקוד. להמשיך?', 'שחזר', () => {
      G.save = s;
      audio.sfxOn = s.settings.sfx;
      audio.setMusic(s.settings.music);
      persist();
      onImport();
    });
  });
  ov.querySelector('#d-close')!.addEventListener('click', closeOverlay);
}

export function newer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

// ---------- אנדרואיד ----------
interface UpdaterPlugin {
  downloadAndInstall(o: { url: string }): Promise<void>;
  addListener(ev: 'progress', cb: (d: { percent: number }) => void): Promise<{ remove: () => void }>;
}

async function checkAndroidUpdate() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return;
    const j = (await r.json()) as { tag_name: string; assets: { name: string; browser_download_url: string }[] };
    if (!j.tag_name || !newer(j.tag_name, VERSION)) return;
    const apk = j.assets?.find((a) => a.name.endsWith('.apk'));
    if (!apk) return;
    const ver = j.tag_name.replace(/^v/, '');
    const ov = openOverlay(
      `<h2>יש גרסה חדשה</h2><p>גרסה ${ver} מוכנה להתקנה. ההתקדמות שלך נשמרת.</p>` +
        `<svg class="ring" id="d-ring" viewBox="0 0 120 120" style="display:none"><circle cx="60" cy="60" r="50" fill="none" stroke="#c9a05a" stroke-width="12"/><circle id="d-arc" cx="60" cy="60" r="50" fill="none" stroke="#e8641e" stroke-width="12" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="314" transform="rotate(-90 60 60)"/></svg>` +
        `<div class="msg" id="d-msg"></div><div class="row" id="d-row"><button id="d-ok">${ICON.down}עדכן</button><button id="d-no" class="grey">אחר כך</button></div>`,
    );
    ov.querySelector('#d-no')!.addEventListener('click', closeOverlay);
    ov.querySelector('#d-ok')!.addEventListener('click', async () => {
      const msg = ov.querySelector('#d-msg') as HTMLElement;
      const ring = ov.querySelector('#d-ring') as HTMLElement;
      const arc = ov.querySelector('#d-arc') as SVGCircleElement;
      (ov.querySelector('#d-row') as HTMLElement).style.display = 'none';
      ring.style.display = 'block';
      msg.textContent = 'מוריד את העדכון...';
      msg.className = 'msg';
      try {
        const up = registerPlugin<UpdaterPlugin>('Updater');
        const sub = await up.addListener('progress', (d) => {
          arc.setAttribute('stroke-dashoffset', String(314 * (1 - d.percent / 100)));
          msg.textContent = `מוריד את העדכון... ${Math.round(d.percent)}%`;
        });
        await up.downloadAndInstall({ url: apk.browser_download_url });
        sub.remove();
        msg.textContent = 'אשר את ההתקנה בחלון שנפתח';
        msg.className = 'msg ok';
        (ov.querySelector('#d-row') as HTMLElement).style.display = 'flex';
      } catch {
        // גיבוי: פתיחת קובץ ה-APK בדפדפן
        msg.textContent = 'ההורדה נכשלה - פותח בדפדפן';
        msg.className = 'msg err';
        (ov.querySelector('#d-row') as HTMLElement).style.display = 'flex';
        window.open(apk.browser_download_url, '_system');
      }
    });
  } catch {
    /* אין אינטרנט - המשחק עובד גם בלי */
  }
}

// ---------- PWA ----------
async function initServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD || !location.protocol.startsWith('http')) return;
  try {
    const hadController = !!navigator.serviceWorker.controller;
    const reg = await navigator.serviceWorker.register('./sw.js');
    let reloading = false;
    const arm = (w: ServiceWorker) => {
      // העדכון יוחל במעבר המסך הבא (לעולם לא באמצע קרב)
      G.applyUpdate = () => {
        w.postMessage('skip-waiting');
        setTimeout(() => location.reload(), 2500);
      };
    };
    if (reg.waiting && hadController) arm(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) arm(nw);
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
    const check = () => void reg.update().catch(() => {});
    setInterval(check, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', () => !document.hidden && check());
  } catch {
    /* ללא service worker */
  }
}

export function initPlatform() {
  if (isNative()) void checkAndroidUpdate();
  else if (!isElectron()) void initServiceWorker();
  // מסך מלא בנייד בדפדפן
  if (isElectron()) document.title = 'הצבא הקטן';
}
