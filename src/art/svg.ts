// כלי עזר ל-SVG ובניית אטלס טקסטורות בזמן ריצה
import Phaser from 'phaser';

export const O = '#3a2415'; // צבע קו המתאר
export const st = (w = 3, c = O) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f >= 0) {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  } else {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}

export interface SpriteDef {
  key: string;
  /** viewBox: x, y, w, h. הראשית (0,0) היא נקודת הציר של החלק */
  vb: [number, number, number, number];
  body: string;
  scale?: number;
  /** ללא חיתוך שוליים (עבור 9-slice) */
  noTrim?: boolean;
  defs?: string;
}

export interface FrameInfo {
  tex: string;
  scale: number; // פיקסלים ליחידת עיצוב
  ox: number;
  oy: number;
}

export const FRAMES: Record<string, FrameInfo> = {};

export function svgDoc(vb: [number, number, number, number], body: string, pxW: number, pxH: number, defs = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="${vb.join(' ')}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}

export function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('svg load failed: ' + svg.slice(0, 200)));
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

interface Packed {
  def: SpriteDef;
  canvas: HTMLCanvasElement;
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  s: number;
}

const PAGE = 2048;

export async function buildAtlas(scene: Phaser.Scene, defs: SpriteDef[], onProgress: (p: number) => void): Promise<void> {
  const packed: Packed[] = [];
  let done = 0;
  const work = async (def: SpriteDef) => {
    const s = def.scale ?? 2;
    const w = Math.ceil(def.vb[2] * s);
    const h = Math.ceil(def.vb[3] * s);
    const im = await loadSvg(svgDoc(def.vb, def.body, w, h, def.defs));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(im, 0, 0, w, h);
    let cx = 0;
    let cy = 0;
    let cw = w;
    let ch = h;
    if (!def.noTrim) {
      const d = ctx.getImageData(0, 0, w, h).data;
      let x0 = w;
      let y0 = h;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < h; y++) {
        const row = y * w * 4;
        for (let x = 0; x < w; x++) {
          if (d[row + x * 4 + 3] > 4) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 >= 0) {
        cx = Math.max(0, x0 - 1);
        cy = Math.max(0, y0 - 1);
        cw = Math.min(w, x1 + 2) - cx;
        ch = Math.min(h, y1 + 2) - cy;
      } else {
        cw = 2;
        ch = 2;
      }
    }
    packed.push({ def, canvas: c, cx, cy, cw, ch, s });
    done++;
    onProgress(done / defs.length);
  };
  // טעינה במקבצים כדי לא לחנוק את הדפדפן
  const BATCH = 24;
  for (let i = 0; i < defs.length; i += BATCH) await Promise.all(defs.slice(i, i + BATCH).map(work));

  packed.sort((a, b) => b.ch - a.ch);
  const pages: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; x: number; y: number; rowH: number; items: { p: Packed; x: number; y: number }[] }[] = [];
  const newPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE;
    canvas.height = PAGE;
    const pg = { canvas, ctx: canvas.getContext('2d')!, x: 2, y: 2, rowH: 0, items: [] as { p: Packed; x: number; y: number }[] };
    pages.push(pg);
    return pg;
  };
  let pg = newPage();
  for (const p of packed) {
    if (pg.x + p.cw + 2 > PAGE) {
      pg.x = 2;
      pg.y += pg.rowH + 3;
      pg.rowH = 0;
    }
    if (pg.y + p.ch + 2 > PAGE) pg = newPage();
    pg.ctx.drawImage(p.canvas, p.cx, p.cy, p.cw, p.ch, pg.x, pg.y, p.cw, p.ch);
    pg.items.push({ p, x: pg.x, y: pg.y });
    pg.x += p.cw + 3;
    pg.rowH = Math.max(pg.rowH, p.ch);
  }
  pages.forEach((page, i) => {
    const name = 'atlas' + i;
    if (scene.textures.exists(name)) scene.textures.remove(name);
    const tex = scene.textures.addCanvas(name, page.canvas)!;
    for (const it of page.items) {
      const { p } = it;
      tex.add(p.def.key, 0, it.x, it.y, p.cw, p.ch);
      FRAMES[p.def.key] = {
        tex: name,
        scale: p.s,
        ox: (-p.def.vb[0] * p.s - p.cx) / p.cw,
        oy: (-p.def.vb[1] * p.s - p.cy) / p.ch,
      };
    }
  });
}

/** טקסטורה בודדת גדולה (רקעים) */
export async function buildTexture(scene: Phaser.Scene, key: string, w: number, h: number, body: string, scale = 1, defs = ''): Promise<void> {
  const im = await loadSvg(svgDoc([0, 0, w, h], body, Math.round(w * scale), Math.round(h * scale), defs));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  FRAMES[key] = { tex: key, scale, ox: 0, oy: 0 };
}

/** יוצר תמונה מהאטלס עם ציר וקנה מידה נכונים */
export function img(scene: Phaser.Scene, x: number, y: number, key: string, k = 1): Phaser.GameObjects.Image {
  const f = FRAMES[key];
  if (!f) throw new Error('missing sprite ' + key);
  const im = f.tex === key ? scene.add.image(x, y, key) : scene.add.image(x, y, f.tex, key);
  im.setOrigin(f.ox, f.oy);
  im.setScale(k / f.scale);
  return im;
}

/** מחליף פריים בתמונה קיימת (לשימוש חוזר באובייקטים) */
export function setFrame(im: Phaser.GameObjects.Image, key: string, k = 1): void {
  const f = FRAMES[key];
  im.setTexture(f.tex, key);
  im.setOrigin(f.ox, f.oy);
  im.setScale(k / f.scale);
}

export function baseScale(key: string): number {
  return 1 / FRAMES[key].scale;
}

/** מחולל מספרים אקראיים דטרמיניסטי לציור רקעים */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
