// רקעים מצוירים: שכבות פרלקסה לכל אזור, מחנה, פנים הצריף ומפת העולם
import { O, st, shade, seeded } from './svg';

const TAU = Math.PI * 2;
export const BG_W = 1280;

/** קו גבעות שנסגר על עצמו (ניתן לריצוף אופקי) */
function hills(w: number, h: number, base: number, amps: [number, number, number][], fill: string, stroke = '', sw = 0): string {
  let d = `M0,${h} `;
  for (let x = 0; x <= w; x += 16) {
    let y = base;
    for (const [a, k, p] of amps) y += a * Math.sin((x / w) * TAU * k + p);
    d += `L${x},${y.toFixed(1)} `;
  }
  d += `L${w},${h} Z`;
  return `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
}
function hillY(w: number, base: number, amps: [number, number, number][], x: number): number {
  let y = base;
  for (const [a, k, p] of amps) y += a * Math.sin((x / w) * TAU * k + p);
  return y;
}

const pine = (x: number, y: number, s: number, c: string, snow = false) =>
  `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s.toFixed(2)})"><rect x="-4" y="-8" width="8" height="12" fill="#5c3a1c"/>` +
  `<path d="M0,-78 L-18,-44 L-9,-46 L-26,-18 L-12,-21 L-32,-4 L32,-4 L12,-21 L26,-18 L9,-46 L18,-44 Z" fill="${c}" stroke="${shade(c, -0.45)}" stroke-width="2.5" stroke-linejoin="round"/>` +
  (snow ? `<path d="M0,-78 L-12,-55 L-4,-58 L0,-52 L5,-58 L12,-55 Z M-20,-28 L-9,-46 L9,-46 L20,-28 L8,-34 L0,-28 L-8,-34 Z" fill="#fff"/>` : `<path d="M0,-74 L-10,-52 L0,-56 Z" fill="#fff" opacity=".12"/>`) +
  `</g>`;
const roundTree = (x: number, y: number, s: number, c: string) =>
  `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s.toFixed(2)})"><rect x="-4" y="-22" width="8" height="26" fill="#6b4423"/>` +
  `<path d="M-26,-22 C-40,-36 -26,-58 -10,-54 C-6,-72 22,-70 22,-52 C38,-50 38,-26 24,-22 Z" fill="${c}" stroke="${shade(c, -0.4)}" stroke-width="2.5"/><path d="M-10,-54 C2,-58 12,-52 14,-44" stroke="#fff" stroke-width="3" opacity=".2" fill="none"/></g>`;

const castle = (x: number, y: number, s: number, wall = '#c9d0de', roof = '#d8584a') =>
  `<g transform="translate(${x},${y}) scale(${s})">` +
  `<rect x="-60" y="-70" width="120" height="70" fill="${wall}" stroke="${shade(wall, -0.3)}" stroke-width="2.5"/>` +
  [-60, -36, -12, 12, 36].map((bx) => `<rect x="${bx}" y="-80" width="14" height="12" fill="${wall}" stroke="${shade(wall, -0.3)}" stroke-width="2"/>`).join('') +
  `<rect x="-88" y="-110" width="34" height="110" fill="${shade(wall, 0.12)}" stroke="${shade(wall, -0.3)}" stroke-width="2.5"/><path d="M-94,-110 L-71,-150 L-48,-110 Z" fill="${roof}" stroke="${shade(roof, -0.35)}" stroke-width="2.5"/>` +
  `<rect x="54" y="-96" width="32" height="96" fill="${shade(wall, 0.12)}" stroke="${shade(wall, -0.3)}" stroke-width="2.5"/><path d="M48,-96 L70,-132 L92,-96 Z" fill="${roof}" stroke="${shade(roof, -0.35)}" stroke-width="2.5"/>` +
  `<rect x="-14" y="-130" width="30" height="62" fill="${shade(wall, 0.2)}" stroke="${shade(wall, -0.3)}" stroke-width="2.5"/><path d="M-20,-130 L1,-172 L22,-130 Z" fill="${roof}" stroke="${shade(roof, -0.35)}" stroke-width="2.5"/>` +
  `<path d="M1,-172 L1,-190 L18,-183 L1,-177" fill="${roof}" stroke="${shade(roof, -0.35)}" stroke-width="2"/>` +
  `<path d="M-12,0 L-12,-26 C-12,-42 12,-42 12,-26 L12,0 Z" fill="${shade(wall, -0.5)}"/>` +
  [-76, -66, 64, 74, -4, 6].map((wx, i) => `<rect x="${wx}" y="${i < 4 ? -86 : -110}" width="5" height="10" rx="2" fill="${shade(wall, -0.5)}"/>`).join('') +
  `</g>`;

const mountain = (x: number, y: number, w: number, h: number, c: string, cap = '') =>
  `<path d="M${x - w / 2},${y} L${x - w * 0.12},${y - h * 0.82} L${x},${y - h} L${x + w * 0.16},${y - h * 0.74} L${x + w / 2},${y} Z" fill="${c}" stroke="${shade(c, -0.3)}" stroke-width="2.5" stroke-linejoin="round"/>` +
  `<path d="M${x},${y - h} L${x + w * 0.16},${y - h * 0.74} L${x + w / 2},${y} L${x + w * 0.08},${y} Z" fill="#000" opacity=".12"/>` +
  (cap ? `<path d="M${x - w * 0.12},${y - h * 0.82} L${x},${y - h} L${x + w * 0.16},${y - h * 0.74} L${x + w * 0.09},${y - h * 0.6} L${x + w * 0.02},${y - h * 0.7} L${x - w * 0.06},${y - h * 0.58} L${x - w * 0.17},${y - h * 0.7} Z" fill="${cap}"/>` : '');

export interface RegionArt {
  sky: [number, number]; // צבעים עליון ותחתון
  far: string;
  mid: string;
  ground: string;
  farH: number;
  midH: number;
  groundH: number;
}

export const FAR_H = 330;
export const MID_H = 260;
export const GROUND_H = 310;

export function regionArt(r: number): RegionArt {
  const rnd = seeded(100 + r * 17);
  const w = BG_W;
  let far = '';
  let mid = '';
  let ground = '';
  let sky: [number, number] = [0x6fc3ee, 0xd7f1f6];
  const tuft = (x: number, y: number, c: string) => `<path d="M${x - 7},${y} L${x - 4},${y - 10} L${x - 1},${y} L${x + 2},${y - 13} L${x + 5},${y} L${x + 9},${y - 8} L${x + 11},${y} Z" fill="${c}"/>`;
  if (r === 0) {
    const a1: [number, number, number][] = [[26, 1, 0.5], [14, 3, 1.2]];
    far = hills(w, FAR_H, 190, a1, '#a9d7c6') + hills(w, FAR_H, 230, [[30, 2, 2], [10, 5, 0]], '#8fcfa6');
    far += castle(980, 232, 0.92);
    const a2: [number, number, number][] = [[22, 2, 1], [12, 4, 0.3]];
    mid = hills(w, MID_H, 96, a2, '#6fbe5c', '#4f9a44', 3);
    for (let i = 0; i < 12; i++) {
      const x = 40 + i * 104 + rnd() * 50;
      const y = hillY(w, 96, a2, x) + 10 + rnd() * 30;
      mid += rnd() > 0.45 ? roundTree(x, y, 0.75 + rnd() * 0.5, '#4f9f45') : pine(x, y, 0.7 + rnd() * 0.5, '#3a8a4a');
    }
    mid += hills(w, MID_H, 190, [[10, 3, 2], [6, 7, 1]], '#7fca62');
    ground = `<rect width="${w}" height="${GROUND_H}" fill="#d9b67c"/>` + hills(w, GROUND_H, 26, [[6, 4, 0], [3, 9, 1]], '#d0a96c');
    ground += `<path d="M0,0 L${w},0 L${w},22 ${Array.from({ length: 41 }, (_, i) => `L${w - i * 32},${18 + (i % 2) * 9}`).join(' ')} Z" fill="#7fca62" stroke="#4f9a44" stroke-width="3"/>`;
    for (let i = 0; i < 46; i++) ground += `<ellipse cx="${(rnd() * w).toFixed(0)}" cy="${(50 + rnd() * 230).toFixed(0)}" rx="${(8 + rnd() * 22).toFixed(0)}" ry="${(3 + rnd() * 5).toFixed(0)}" fill="${rnd() > 0.5 ? '#c79d5e' : '#e3c48e'}" opacity=".7"/>`;
    for (let i = 0; i < 14; i++) ground += tuft(rnd() * w, 60 + rnd() * 230, '#6fb04e');
    ground += `<path d="M0,${GROUND_H - 26} ${Array.from({ length: 41 }, (_, i) => `L${i * 32},${GROUND_H - 30 + (i % 2) * 10}`).join(' ')} L${w},${GROUND_H} L0,${GROUND_H} Z" fill="#4f9a44"/>`;
  } else if (r === 1) {
    sky = [0x23485a, 0x6f9a8a];
    far = hills(w, FAR_H, 200, [[20, 2, 0], [8, 5, 1]], '#2f5a58');
    for (let i = 0; i < 26; i++) far += pine(i * 50 + rnd() * 20, 250 + rnd() * 20, 1.1 + rnd() * 0.7, '#2a5550');
    far += `<rect y="260" width="${w}" height="70" fill="#2a5550"/>`;
    mid = '';
    for (let i = 0; i < 18; i++) mid += pine(i * 72 + rnd() * 30, 150 + rnd() * 30, 1.5 + rnd() * 0.8, '#1f4a3a');
    mid += hills(w, MID_H, 150, [[10, 2, 1], [6, 5, 0]], '#27573c', '#183a2a', 3);
    for (let i = 0; i < 8; i++) mid += `<ellipse cx="${(rnd() * w).toFixed(0)}" cy="${170 + rnd() * 40}" rx="${90 + rnd() * 80}" ry="14" fill="#cfe8dc" opacity=".12"/>`;
    ground = `<rect width="${w}" height="${GROUND_H}" fill="#6f6146"/>`;
    ground += `<path d="M0,0 L${w},0 L${w},20 ${Array.from({ length: 41 }, (_, i) => `L${w - i * 32},${16 + (i % 2) * 9}`).join(' ')} Z" fill="#2f6a44" stroke="#183a2a" stroke-width="3"/>`;
    for (let i = 0; i < 50; i++) ground += `<ellipse cx="${(rnd() * w).toFixed(0)}" cy="${(50 + rnd() * 230).toFixed(0)}" rx="${(8 + rnd() * 24).toFixed(0)}" ry="${(3 + rnd() * 5).toFixed(0)}" fill="${rnd() > 0.5 ? '#5f5238' : '#7d6e50'}" opacity=".75"/>`;
    for (let i = 0; i < 16; i++) ground += tuft(rnd() * w, 60 + rnd() * 230, '#3f7a4a');
    for (let i = 0; i < 7; i++) {
      const x = rnd() * w;
      const y = 70 + rnd() * 200;
      ground += `<rect x="${x - 3}" y="${y - 10}" width="6" height="10" fill="#e9dfc8"/><ellipse cx="${x}" cy="${y - 10}" rx="10" ry="6" fill="#c9482e" stroke="#7a2a1c" stroke-width="2"/>`;
    }
    ground += `<path d="M0,${GROUND_H - 24} ${Array.from({ length: 41 }, (_, i) => `L${i * 32},${GROUND_H - 28 + (i % 2) * 10}`).join(' ')} L${w},${GROUND_H} L0,${GROUND_H} Z" fill="#1f4a3a"/>`;
  } else if (r === 2) {
    sky = [0x7fb6e6, 0xe6f4fb];
    far = '';
    for (let i = 0; i < 6; i++) far += mountain(110 + i * 214 + rnd() * 30, FAR_H, 330 + rnd() * 90, 210 + rnd() * 90, '#8fa9c9', '#f4fbff');
    far += hills(w, FAR_H, 280, [[12, 2, 0], [6, 5, 2]], '#cfe2f2');
    const a2: [number, number, number][] = [[18, 2, 1.4], [8, 5, 0.3]];
    mid = hills(w, MID_H, 110, a2, '#e6f1fa', '#b9d2e6', 3);
    for (let i = 0; i < 11; i++) {
      const x = 30 + i * 116 + rnd() * 50;
      mid += pine(x, hillY(w, 110, a2, x) + 16 + rnd() * 30, 0.8 + rnd() * 0.5, '#3a7a6a', true);
    }
    mid += hills(w, MID_H, 196, [[8, 3, 2], [5, 7, 1]], '#f4fbff');
    ground = `<rect width="${w}" height="${GROUND_H}" fill="#dcebf5"/>`;
    ground += `<path d="M0,0 L${w},0 L${w},20 ${Array.from({ length: 21 }, (_, i) => `Q${w - i * 64 - 32},${34} ${w - (i + 1) * 64},20`).join(' ')} Z" fill="#f4fbff" stroke="#b9d2e6" stroke-width="3"/>`;
    for (let i = 0; i < 40; i++) ground += `<ellipse cx="${(rnd() * w).toFixed(0)}" cy="${(50 + rnd() * 230).toFixed(0)}" rx="${(12 + rnd() * 30).toFixed(0)}" ry="${(3 + rnd() * 6).toFixed(0)}" fill="${rnd() > 0.5 ? '#c9dfee' : '#f4fbff'}" opacity=".8"/>`;
    for (let i = 0; i < 9; i++) {
      const x = rnd() * w;
      const y = 70 + rnd() * 210;
      ground += `<path d="M${x},${y} l14,-6 l10,8 l16,-4 M${x + 24},${y + 2} l6,12" stroke="#9fc4e0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }
    ground += `<path d="M0,${GROUND_H - 22} ${Array.from({ length: 21 }, (_, i) => `Q${i * 64 + 32},${GROUND_H - 40} ${(i + 1) * 64},${GROUND_H - 22}`).join(' ')} L${w},${GROUND_H} L0,${GROUND_H} Z" fill="#f4fbff" stroke="#b9d2e6" stroke-width="3"/>`;
  } else {
    sky = [0x3a1630, 0xc9482e];
    far = '';
    for (let i = 0; i < 7; i++) far += mountain(80 + i * 190 + rnd() * 30, FAR_H, 260 + rnd() * 90, 170 + rnd() * 110, '#6b2a3a');
    far += `<path d="M560,${FAR_H} L640,140 L700,140 L790,${FAR_H} Z" fill="#4a1c2a" stroke="#2a0d18" stroke-width="3"/><path d="M640,140 L655,170 L668,146 L682,172 L700,140 Z" fill="#ff8a1e"/><ellipse cx="670" cy="132" rx="46" ry="16" fill="#ffb02e" opacity=".35"/>`;
    far += hills(w, FAR_H, 290, [[10, 3, 0], [6, 6, 2]], '#4a1c2a');
    const a2: [number, number, number][] = [[16, 2, 0.4], [9, 5, 1.3]];
    mid = hills(w, MID_H, 120, a2, '#5a2030', '#2a0d18', 3);
    for (let i = 0; i < 14; i++) {
      const x = rnd() * w;
      const y = hillY(w, 120, a2, x) + 8;
      const h = 30 + rnd() * 50;
      mid += `<path d="M${x - 14},${y + 10} L${x - 4},${y - h} L${x + 6},${y - h * 0.6} L${x + 16},${y + 10} Z" fill="#3a1420" stroke="#2a0d18" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    mid += hills(w, MID_H, 200, [[8, 3, 2], [5, 7, 1]], '#6b2a30');
    for (let i = 0; i < 6; i++) {
      const x = rnd() * w;
      mid += `<path d="M${x},215 l18,10 l-8,14 l20,12" stroke="#ff8a1e" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>`;
    }
    ground = `<rect width="${w}" height="${GROUND_H}" fill="#6b3a34"/>`;
    ground += `<path d="M0,0 L${w},0 L${w},18 ${Array.from({ length: 41 }, (_, i) => `L${w - i * 32},${14 + (i % 2) * 10}`).join(' ')} Z" fill="#4a1c22" stroke="#2a0d18" stroke-width="3"/>`;
    for (let i = 0; i < 46; i++) ground += `<ellipse cx="${(rnd() * w).toFixed(0)}" cy="${(50 + rnd() * 230).toFixed(0)}" rx="${(8 + rnd() * 24).toFixed(0)}" ry="${(3 + rnd() * 5).toFixed(0)}" fill="${rnd() > 0.5 ? '#5a2e2a' : '#7d4a40'}" opacity=".75"/>`;
    for (let i = 0; i < 10; i++) {
      const x = rnd() * w;
      const y = 60 + rnd() * 220;
      ground += `<path d="M${x},${y} l16,-5 l8,9 l18,-3 l10,8" stroke="#3a0d0d" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x},${y} l16,-5 l8,9 l18,-3 l10,8" stroke="#ff9a2e" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    ground += `<path d="M0,${GROUND_H - 22} ${Array.from({ length: 41 }, (_, i) => `L${i * 32},${GROUND_H - 28 + (i % 2) * 12}`).join(' ')} L${w},${GROUND_H} L0,${GROUND_H} Z" fill="#2a0d18"/>`;
  }
  return { sky, far, mid, ground, farH: FAR_H, midH: MID_H, groundH: GROUND_H };
}

/** פנים צריף העץ (מסכי צבא / גיבור / משימות) */
export function interiorArt(): string {
  const w = 1280;
  const h = 720;
  const rnd = seeded(77);
  let s = `<rect width="${w}" height="${h}" fill="#4a3a30"/>`;
  // קיר אבן
  for (let row = 0; row < 9; row++)
    for (let col = -1; col < 14; col++) {
      const x = col * 100 + (row % 2) * 50;
      const y = 60 + row * 46;
      const c = shade('#6b5a4c', (rnd() - 0.5) * 0.25);
      s += `<rect x="${x + 2}" y="${y + 2}" width="96" height="42" rx="7" fill="${c}" stroke="#3a2c24" stroke-width="3"/>`;
    }
  // רצפת קרשים
  s += `<path d="M0,470 L${w},470 L${w},${h} L0,${h} Z" fill="#7a5230"/>`;
  for (let i = 0; i <= 16; i++) s += `<path d="M${i * 80},470 L${(i - 8) * 150 + 640},${h}" stroke="#4d321c" stroke-width="3"/>`;
  s += `<path d="M0,470 L${w},470" stroke="#3a2415" stroke-width="5"/><rect y="470" width="${w}" height="40" fill="#000" opacity=".18"/>`;
  // קורות עץ
  const beam = (x: number, y: number, bw: number, bh: number) => `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#8a5a2c" stroke="#3a2415" stroke-width="4"/><rect x="${x + 4}" y="${y + 4}" width="${bw - 8}" height="${Math.min(bh - 8, 10)}" fill="#fff" opacity=".1"/>`;
  s += beam(-10, 20, 1300, 48) + beam(-10, 120, 1300, 22);
  for (const x of [70, 420, 820, 1170]) s += beam(x, 20, 40, 460);
  s += `<path d="M110,68 L250,20 M1170,68 L1030,20 M460,68 L600,20 M820,68 L680,20" stroke="#6b4423" stroke-width="20"/><path d="M110,68 L250,20 M1170,68 L1030,20" stroke="#3a2415" stroke-width="3" fill="none"/>`;
  // חביות וארגזים
  const barrel = (x: number, y: number, k: number) =>
    `<g transform="translate(${x},${y}) scale(${k})"><path d="M-34,-80 C-46,-50 -46,-20 -34,0 L34,0 C46,-20 46,-50 34,-80 Z" fill="#8a5a2c" stroke="#3a2415" stroke-width="4"/><path d="M-41,-58 L41,-58 M-41,-22 L41,-22" stroke="#aeb9c3" stroke-width="7"/><path d="M-12,-80 L-14,0 M12,-80 L14,0" stroke="#5c3a1c" stroke-width="3"/></g>`;
  const crate = (x: number, y: number, k: number) =>
    `<g transform="translate(${x},${y}) scale(${k})"><rect x="-44" y="-76" width="88" height="76" fill="#9a6a3a" stroke="#3a2415" stroke-width="4"/><path d="M-44,-76 L44,0 M44,-76 L-44,0" stroke="#6b4423" stroke-width="9"/><rect x="-44" y="-76" width="88" height="76" fill="none" stroke="#6b4423" stroke-width="12"/><rect x="-44" y="-76" width="88" height="76" fill="none" stroke="#3a2415" stroke-width="4"/></g>`;
  s += barrel(60, 640, 1.5) + crate(170, 560, 1.2) + crate(1210, 640, 1.6) + barrel(1120, 560, 1.15) + barrel(1050, 700, 1.3);
  // מעמד נשקים
  s += `<g transform="translate(250,470)"><rect x="-50" y="-150" width="8" height="150" fill="#6b4423" stroke="#3a2415" stroke-width="3"/><rect x="42" y="-150" width="8" height="150" fill="#6b4423" stroke="#3a2415" stroke-width="3"/><rect x="-56" y="-110" width="112" height="10" fill="#8a5a2c" stroke="#3a2415" stroke-width="3"/>` +
    [-28, 0, 28].map((x) => `<path d="M${x - 4},-170 L${x + 4},-170 L${x + 4},-60 L${x - 4},-60 Z" fill="#c9d3dc" stroke="#3a2415" stroke-width="3"/><rect x="${x - 11}" y="-64" width="22" height="7" fill="#f2c230" stroke="#3a2415" stroke-width="2.5"/>`).join('') + `</g>`;
  // לפידים (הלהבה מונפשת בנפרד)
  for (const x of [105, 1175]) s += `<path d="M${x - 9},330 L${x + 9},330 L${x + 4},390 L${x - 4},390 Z" fill="#6b4423" stroke="#3a2415" stroke-width="3"/><rect x="${x - 14}" y="320" width="28" height="14" rx="4" fill="#aeb9c3" stroke="#3a2415" stroke-width="3"/>`;
  s += `<rect width="${w}" height="${h}" fill="#1c1008" opacity=".3"/>`;
  return s;
}

/** פאנל מפה לאזור (1100x720) */
export const MAP_REGION_W = 1100;
export function mapArt(r: number): string {
  const w = MAP_REGION_W;
  const h = 720;
  const rnd = seeded(500 + r * 31);
  const base = ['#7cc65a', '#2f6a44', '#e3eff8', '#8a2f2c'][r];
  const next = ['#2f6a44', '#e3eff8', '#8a2f2c', '#8a2f2c'][r];
  const skyC = ['#8fd0f2', '#3a6470', '#a9d2f0', '#4a1c30'][r];
  let s = `<rect width="${w}" height="${h}" fill="${base}"/><rect width="${w}" height="130" fill="${skyC}"/><path d="M0,130 ${Array.from({ length: 11 }, (_, i) => `Q${i * 100 + 50},${100 + (i % 2) * 34} ${(i + 1) * 100},130`).join(' ')} L${w},160 L0,160 Z" fill="${base}"/>`;
  // כתמי קרקע
  for (let i = 0; i < 26; i++) s += `<ellipse cx="${(rnd() * w).toFixed(0)}" cy="${(190 + rnd() * 530).toFixed(0)}" rx="${(60 + rnd() * 120).toFixed(0)}" ry="${(24 + rnd() * 40).toFixed(0)}" fill="${shade(base, (rnd() - 0.5) * 0.22)}" opacity=".8"/>`;
  // גבול משונן לאזור הבא
  if (r < 3) {
    let d = `M${w},0 `;
    for (let y = 0; y <= h; y += 40) d += `L${w - 30 - rnd() * 70},${y} `;
    d += `L${w},${h} Z`;
    s += `<path d="${d}" fill="${next}"/>`;
  }
  const items: { y: number; svg: string }[] = [];
  const put = (svg: (x: number, y: number) => string, n: number) => {
    for (let i = 0; i < n; i++) {
      const x = 30 + rnd() * (w - 60);
      const y = 150 + rnd() * 560;
      // משאירים את רצועת השביל פנויה יחסית
      if (y > 300 && y < 560 && rnd() > 0.25) continue;
      items.push({ y, svg: svg(x, y) });
    }
  };
  if (r === 0) {
    s += castle(210, 250, 1.25);
    put((x, y) => roundTree(x, y, 0.8 + rnd() * 0.5, '#4f9f45'), 26);
    put((x, y) => pine(x, y, 0.7 + rnd() * 0.4, '#3a8a4a'), 14);
    put((x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="${rnd() > 0.5 ? '#ffe14a' : '#ff8fb3'}"/>`, 24);
  } else if (r === 1) {
    put((x, y) => pine(x, y, 1.0 + rnd() * 0.7, rnd() > 0.5 ? '#1f4a3a' : '#27573c'), 70);
    put((x, y) => `<ellipse cx="${x}" cy="${y}" rx="60" ry="12" fill="#cfe8dc" opacity=".14"/>`, 10);
  } else if (r === 2) {
    for (let i = 0; i < 5; i++) s += mountain(120 + i * 210 + rnd() * 40, 250 + rnd() * 30, 280, 190 + rnd() * 50, '#8fa9c9', '#ffffff');
    put((x, y) => pine(x, y, 0.8 + rnd() * 0.5, '#3a7a6a', true), 22);
    put((x, y) => mountain(x, y, 90, 70, '#a9c0d9', '#fff'), 12);
    s += castle(930, 250, 0.7, '#dfe8f0', '#7fa9d9');
  } else {
    for (let i = 0; i < 5; i++) s += mountain(140 + i * 220 + rnd() * 40, 250 + rnd() * 30, 300, 170 + rnd() * 60, '#5a1c22');
    put((x, y) => `<path d="M${x - 16},${y} L${x - 4},${y - 50} L${x + 6},${y - 30} L${x + 18},${y} Z" fill="#4a1420" stroke="#2a0d18" stroke-width="2.5" stroke-linejoin="round"/>`, 30);
    put((x, y) => `<path d="M${x},${y} l22,-8 l10,14 l24,-6" stroke="#3a0d0d" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${x},${y} l22,-8 l10,14 l24,-6" stroke="#ff9a2e" stroke-width="4" fill="none" stroke-linecap="round"/>`, 26);
  }
  items.sort((a, b) => a.y - b.y);
  s += items.map((i) => i.svg).join('');
  void O;
  void st;
  return s;
}
