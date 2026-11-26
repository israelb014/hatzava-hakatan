// דמויות צ'יבי: כל דמות בנויה משכבות וקטוריות (ראש, גוף, ידיים, רגליים, נשק, גלימה)
import { type SpriteDef, O, st, shade } from './svg';

export type AttackStyle = 'swing' | 'thrust' | 'shoot' | 'cast' | 'smash';

export interface CharDef {
  key: string;
  /** קנה מידה בתצוגה */
  scale: number;
  /** רזולוציית הטקסטורה */
  tex: number;
  style: AttackStyle;
  armRest: number; // מעלות
  floats?: boolean;
  hasCape?: boolean;
  wide?: number; // הרחקת כתפיים
}

interface Look {
  skin: string;
  head: string; // תוכן SVG של הראש (סביב הצוואר 0,0)
  body: string;
  leg: string;
  arm: string; // יד ללא נשק
  weapon: string; // מצויר ביחס לכף היד
  cape?: string;
}

const eyeCute = (iris = '#2b1a10') =>
  `<ellipse cx="5" cy="-19.5" rx="3.3" ry="4.6" fill="${iris}"/><ellipse cx="16" cy="-19.5" rx="3.1" ry="4.6" fill="${iris}"/>` +
  `<circle cx="6.3" cy="-21.4" r="1.3" fill="#fff"/><circle cx="17.2" cy="-21.4" r="1.3" fill="#fff"/>`;
const brows = (c = O, angry = true) =>
  angry
    ? `<path d="M0.5,-27.5 L8.5,-25.6 M12.5,-25.6 L20.5,-27.5" stroke="${c}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`
    : `<path d="M1,-26.5 Q5,-28.5 9,-26.8 M13,-26.8 Q17,-28.5 21,-26.5" stroke="${c}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
const mouth = (smile = true) =>
  smile
    ? `<path d="M7.5,-10.5 Q11,-7.8 14.5,-10.5" stroke="${O}" stroke-width="2" stroke-linecap="round" fill="none"/>`
    : `<path d="M8,-9.5 L14,-10" stroke="${O}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
const blush = `<ellipse cx="-1" cy="-13" rx="3.6" ry="2.1" fill="#ff7b6b" opacity=".5"/><ellipse cx="20" cy="-13" rx="2.6" ry="1.9" fill="#ff7b6b" opacity=".45"/>`;

function headBase(skin: string, ear: 'round' | 'point' | 'none' = 'round'): string {
  const e =
    ear === 'round'
      ? `<ellipse cx="-21" cy="-17" rx="4.5" ry="5.5" fill="${skin}" ${st()}/>`
      : ear === 'point'
        ? `<path d="M-17,-25 L-41,-35 L-21,-11 Z" fill="${skin}" ${st()}/><path d="M19,-27 L35,-39 L23,-14 Z" fill="${shade(skin, -0.12)}" ${st()}/>`
        : '';
  return (
    e +
    `<ellipse cx="0" cy="-21" rx="23" ry="21" fill="${skin}" ${st()}/>` +
    `<path d="M-21.5,-21 C-21.5,-6 -8,-1.5 0,-1.5 C-12,-6 -17,-14 -17,-26 Z" fill="#000" opacity=".1"/>`
  );
}

function knightHelm(metal: string, plume: string, gold = false): string {
  return (
    `<path d="M-2,-42 C-10,-66 -42,-58 -36,-28 C-30,-40 -20,-42 -8,-37 Z" fill="${plume}" ${st()}/>` +
    `<path d="M-12,-50 C-22,-52 -30,-44 -32,-36" stroke="${shade(plume, 0.35)}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>` +
    `<path d="M-25.5,-13 C-28,-49 28,-49 25.5,-16 L25.5,-25 C15,-31 1,-31 -7,-27 L-7,-5 C-16,-5 -24.5,-7 -25.5,-13 Z" fill="${metal}" ${st()}/>` +
    `<path d="M-25,-14 C-26,-30 -20,-40 -10,-44 C-16,-34 -17,-22 -15,-6 C-20,-7 -24,-9 -25,-14Z" fill="#000" opacity=".13"/>` +
    `<path d="M-10,-41 C-3,-45 8,-45 15,-41" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>` +
    `<path d="M8.6,-31 L13,-31 L12.4,-16.5 L9.2,-16.5 Z" fill="${metal}" ${st(2.2)}/>` +
    (gold ? `<path d="M-7,-27 C1,-31 15,-31 25.5,-25" stroke="#f2c230" stroke-width="2.6" fill="none"/>` : '')
  );
}

function hairCap(c: string): string {
  return (
    `<path d="M-24.5,-17 C-29,-50 27,-52 24.5,-22 C18,-32 7,-35 -3,-31 C-10,-28 -15,-23 -17.5,-11 C-22,-11 -24,-13 -24.5,-17 Z" fill="${c}" ${st()}/>` +
    `<path d="M-12,-42 C-4,-46 8,-45 14,-41" stroke="${shade(c, 0.4)}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`
  );
}

const horn = (c: string, big: boolean) =>
  big
    ? `<path d="M-13,-36 C-32,-42 -40,-62 -28,-76 C-27,-60 -17,-50 -4,-43 Z" fill="${c}" ${st()}/><path d="M13,-37 C32,-42 40,-62 28,-76 C27,-60 17,-50 5,-43 Z" fill="${shade(c, -0.1)}" ${st()}/>`
    : `<path d="M-13,-37 L-18,-53 L-4,-41 Z" fill="${c}" ${st(2.5)}/><path d="M12,-38 L19,-53 L4,-41 Z" fill="${c}" ${st(2.5)}/>`;

const evilEyes = (c: string) =>
  `<path d="M0,-25 L10,-20 L2,-16 Z" fill="${c}" ${st(1.8)}/><path d="M22,-25 L12.5,-20 L20,-16 Z" fill="${c}" ${st(1.8)}/>` +
  `<circle cx="5.5" cy="-20.3" r="1.6" fill="#2b0d0d"/><circle cx="17" cy="-20.3" r="1.6" fill="#2b0d0d"/>`;
const fangMouth = (w = 1) =>
  `<path d="M${1 - w},-11 Q11,${-3 + w} ${21 + w},-11 Q11,-8.5 ${1 - w},-11 Z" fill="#3a0a0a" ${st(2)}/>` +
  `<path d="M4,-10.2 L6,-6.5 L8,-9.6 Z M14,-9.6 L16,-6.5 L18,-10.2 Z" fill="#fff"/>`;

// ----- גוף -----
function torso(c: string, kind: 'plate' | 'tunic' | 'robe' | 'bare' | 'fat' | 'bones' | 'wisp', accent = '#7a4a22', w = 1): string {
  const W = (n: number) => (n * w).toFixed(1);
  if (kind === 'bones')
    return (
      `<rect x="-2.2" y="-25" width="4.4" height="25" rx="2" fill="${c}" ${st(2.4)}/>` +
      [-21, -15, -9].map((y, i) => `<path d="M${-11 + i},${y} Q0,${y + 5} ${11 - i},${y}" stroke="${O}" stroke-width="6.5" fill="none" stroke-linecap="round"/><path d="M${-11 + i},${y} Q0,${y + 5} ${11 - i},${y}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('') +
      `<path d="M-9,-3 L9,-3 L6,3 L-6,3 Z" fill="${c}" ${st(2.4)}/>`
    );
  if (kind === 'wisp')
    return (
      `<path d="M-15,-25 C-20,-8 -16,8 -10,16 C-8,8 -3,14 0,26 C3,14 8,8 10,16 C16,8 20,-8 15,-25 C8,-29 -8,-29 -15,-25 Z" fill="${c}" ${st()}/>` +
      `<path d="M-6,-18 C-9,-8 -7,2 -4,8 M5,-18 C8,-10 7,-2 5,4" stroke="${shade(c, -0.3)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
      `<path d="M-13,-22 C-6,-26 4,-26 12,-23 C6,-20 -4,-19 -13,-22Z" fill="${accent}" ${st(2)}/>`
    );
  const bottom = kind === 'robe' ? 13 : 2.5;
  const flare = kind === 'robe' ? 19 : kind === 'fat' ? 17 : 13;
  const mid = kind === 'fat' ? 20 : 16;
  let s =
    `<path d="M${W(-14)},-24 C${W(-mid)},-12 ${W(-mid)},-2 ${W(-flare)},${bottom} L${W(flare)},${bottom} C${W(mid)},-2 ${W(mid)},-12 ${W(14)},-24 C${W(8)},-28.5 ${W(-8)},-28.5 ${W(-14)},-24 Z" fill="${c}" ${st()}/>` +
    `<path d="M${W(-14)},-24 C${W(-mid)},-12 ${W(-mid)},-2 ${W(-flare)},${bottom} L${W(-flare + 8)},${bottom} C${W(-9)},-6 ${W(-9)},-16 ${W(-7)},-26 Z" fill="#000" opacity=".13"/>`;
  if (kind === 'plate')
    s +=
      `<path d="M-6,-21 C-2,-23 6,-23 9,-20" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".7"/>` +
      `<path d="M0,-25 L0,-6" stroke="${shade(c, -0.25)}" stroke-width="1.6"/>` +
      `<rect x="${W(-14.5)}" y="-5.5" width="${W(29)}" height="5.5" rx="1.5" fill="${accent}" ${st(2.2)}/><rect x="-3.4" y="-6.4" width="6.8" height="7.2" rx="1.5" fill="#f2c230" ${st(2)}/>`;
  if (kind === 'tunic')
    s +=
      `<path d="M-6,-26 L1,-17 L8,-26" stroke="${O}" stroke-width="2" fill="${shade(c, 0.3)}"/>` +
      `<rect x="${W(-14.5)}" y="-6" width="${W(29)}" height="5" rx="1.5" fill="${accent}" ${st(2.2)}/><rect x="-3" y="-6.8" width="6" height="6.6" rx="1.4" fill="#f2c230" ${st(1.8)}/>`;
  if (kind === 'robe')
    s +=
      `<path d="M${W(-18.5)},8.5 L${W(18.5)},8.5" stroke="${accent}" stroke-width="3.2"/>` +
      `<path d="M-5,-26 L1,-16 L7,-26" stroke="${O}" stroke-width="2" fill="${accent}"/>` +
      `<path d="M1,-16 L1,8" stroke="${shade(c, -0.25)}" stroke-width="1.6"/>`;
  if (kind === 'bare' || kind === 'fat')
    s +=
      `<path d="M-4,-17 Q1,-13 7,-17 M1,-13 L1,-6" stroke="${shade(c, -0.35)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<path d="M${W(-flare + 0.5)},-4 L${W(flare - 0.5)},-4 L${W(flare)},${bottom} L${W(-flare)},${bottom} Z" fill="${accent}" ${st(2.4)}/>` +
      `<circle cx="1" cy="-1" r="2.6" fill="#f2c230" ${st(1.6)}/>`;
  return s;
}

const leg = (pants: string, boot: string) =>
  `<path d="M-5.5,-1 L5.5,-1 L5.5,9 L-5.5,9 Z" fill="${pants}" ${st()}/>` + `<path d="M-5.8,7.5 L5.6,7.5 L9.5,13.5 L-5.8,13.5 Z" fill="${boot}" ${st()}/>`;
const boneLeg = (c: string) => `<rect x="-2" y="-1" width="4" height="12" rx="2" fill="${c}" ${st(2.4)}/><ellipse cx="2" cy="12.5" rx="5.5" ry="2.6" fill="${c}" ${st(2.4)}/>`;

function arm(sleeve: string, skin: string, pad?: string, thick = 1): string {
  const t = 4.6 * thick;
  return (
    `<path d="M${-t},-3 C${-t},-7 ${t},-7 ${t},-3 L${t - 0.6},13 L${-t + 0.6},13 Z" fill="${sleeve}" ${st()}/>` +
    (pad ? `<ellipse cx="0" cy="-2.5" rx="${6.8 * thick}" ry="5.4" fill="${pad}" ${st(2.4)}/>` : '')
  );
}
const hand = (skin: string, r = 4.7) => `<circle cx="0" cy="15" r="${r}" fill="${skin}" ${st(2.4)}/>`;

// ----- נשקים (ראשית הצירים בכף היד) -----
const W = {
  sword: (blade = '#e9f1f7', guard = '#f2c230', len = 34) =>
    `<g transform="translate(0,15) rotate(-34)"><rect x="-9" y="-2.2" width="10" height="4.4" rx="2" fill="#7a4a22" ${st(2)}/><circle cx="-10" cy="0" r="3" fill="${guard}" ${st(2)}/>` +
    `<path d="M3,-4.2 L${len},-4.2 L${len + 8},0 L${len},4.2 L3,4.2 Z" fill="${blade}" ${st()}/><path d="M5,0 L${len + 3},0" stroke="${shade(blade, -0.22)}" stroke-width="1.6"/>` +
    `<path d="M6,-2.2 L${len - 2},-2.2" stroke="#fff" stroke-width="1.4" opacity=".8"/><rect x="0" y="-8.5" width="5" height="17" rx="2.2" fill="${guard}" ${st(2.2)}/></g>`,
  katana: () =>
    `<g transform="translate(0,15) rotate(-30)"><rect x="-11" y="-2" width="12" height="4" rx="1.5" fill="#2b2b33" ${st(2)}/>` +
    `<path d="M2,-2.6 Q22,-7 44,-12 Q30,-1 2,2.6 Z" fill="#eef4f8" ${st(2.6)}/><ellipse cx="1.5" cy="0" rx="2.6" ry="5.5" fill="#f2c230" ${st(2)}/></g>`,
  spear: () =>
    `<g transform="translate(0,15) rotate(-14)"><rect x="-24" y="-1.9" width="64" height="3.8" rx="1.8" fill="#a8743c" ${st(2.2)}/>` +
    `<path d="M38,-6 L58,0 L38,6 L34,0 Z" fill="#e9f1f7" ${st()}/><path d="M36,0 L55,0" stroke="#aab7c2" stroke-width="1.4"/><path d="M30,-3 L33,3" stroke="#d8402c" stroke-width="5" stroke-linecap="round"/></g>`,
  bow: (wood = '#a8743c') =>
    `<g transform="translate(0,15)"><path d="M-24,-5 Q0,22 24,-5" fill="none" stroke="${O}" stroke-width="7.5" stroke-linecap="round"/><path d="M-24,-5 Q0,22 24,-5" fill="none" stroke="${wood}" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M-24,-5 L24,-5" stroke="#f4efe0" stroke-width="1.3"/></g>`,
  staff: (orb: string, rest: number) =>
    `<g transform="translate(0,15) rotate(${-rest})"><rect x="-2.2" y="-34" width="4.4" height="52" rx="2" fill="#8a5a2c" ${st(2.2)}/>` +
    `<circle cx="0" cy="-39" r="10" fill="${orb}" opacity=".35"/><circle cx="0" cy="-39" r="6.8" fill="${orb}" ${st(2.4)}/><circle cx="-2" cy="-41" r="2.2" fill="#fff" opacity=".85"/></g>`,
  healStaff: (rest: number) =>
    `<g transform="translate(0,15) rotate(${-rest})"><rect x="-2" y="-30" width="4" height="48" rx="2" fill="#f1e6c8" ${st(2.2)}/>` +
    `<path d="M-8,-44 A9,9 0 1 0 8,-44" fill="none" stroke="${O}" stroke-width="7"/><path d="M-8,-44 A9,9 0 1 0 8,-44" fill="none" stroke="#f2c230" stroke-width="3.2"/><circle cx="0" cy="-41" r="4" fill="#5fe08a" ${st(2)}/></g>`,
  club: (c = '#8a5a2c', spikes = '#d9dee3', len = 30) =>
    `<g transform="translate(0,15) rotate(-42)"><path d="M-6,-2.6 L6,-3 L${len},-9 C${len + 12},-10 ${len + 12},10 ${len},9 L6,3 L-6,2.6 Z" fill="${c}" ${st()}/>` +
    `<path d="M${len - 8},-9 L${len - 5},-16 L${len - 1},-9 Z M${len + 3},-9 L${len + 8},-15 L${len + 9},-7 Z M${len - 8},9 L${len - 5},16 L${len - 1},9 Z" fill="${spikes}" ${st(2)}/></g>`,
  trident: () =>
    `<g transform="translate(0,15) rotate(-66)"><rect x="-10" y="-1.6" width="34" height="3.2" rx="1.5" fill="#4a2a2a" ${st(2)}/>` +
    `<path d="M22,-7 L34,-7 L26,-3 L36,0 L26,3 L34,7 L22,7 Z" fill="#c9d3dc" ${st(2.2)}/></g>`,
  scepter: () =>
    `<g transform="translate(0,15) rotate(-32)"><rect x="-10" y="-2" width="36" height="4" rx="2" fill="#f2c230" ${st(2.2)}/><circle cx="30" cy="0" r="7.5" fill="#e0342c" ${st(2.4)}/><circle cx="28" cy="-2" r="2.2" fill="#fff" opacity=".8"/></g>`,
  flameSword: () =>
    `<g transform="translate(0,15) rotate(-34)"><rect x="-9" y="-2.4" width="10" height="4.8" rx="2" fill="#2a1a1a" ${st(2)}/>` +
    `<path d="M3,-7 L34,-8 L46,0 L34,8 L3,7 Z" fill="#ff8a1e" opacity=".55"/><path d="M3,-4.6 L34,-5 L43,0 L34,5 L3,4.6 Z" fill="#3a2230" ${st()}/><path d="M6,0 L38,0" stroke="#ffb02e" stroke-width="2"/>` +
    `<path d="M0,-9 L5,-9 L5,9 L0,9 Z" fill="#8a1c1c" ${st(2.2)}/></g>`,
  none: () => '',
};

const cape = (c: string) =>
  `<path d="M-8,-2 C-14,10 -22,26 -26,36 C-14,40 -2,38 6,33 C8,20 8,8 6,-2 Z" fill="${c}" ${st()}/>` +
  `<path d="M-6,2 C-10,14 -14,24 -18,34" stroke="${shade(c, -0.25)}" stroke-width="2" fill="none"/>`;

const SKIN = '#ffd9b3';
const METAL = '#c9d3dc';

function looks(): Record<string, { def: Omit<CharDef, 'key'>; look: Look }> {
  const rest = { sword: -18, staff: -28, bow: -52, spear: -8, club: -20 };
  return {
    hero: {
      def: { scale: 1.5, tex: 3, style: 'swing', armRest: rest.sword, hasCape: true },
      look: {
        skin: SKIN,
        head: headBase(SKIN, 'none') + eyeCute() + brows() + mouth() + blush + knightHelm('#d5dee6', '#2f7de0', true),
        body: torso('#d5dee6', 'plate', '#8a5226'),
        leg: leg('#3a4d7a', '#c9d3dc'),
        arm: arm('#d5dee6', SKIN, '#eef3f7'),
        weapon: W.sword('#f2f8fc', '#f2c230', 38),
        cape: cape('#2f7de0'),
      },
    },
    sword: {
      def: { scale: 1.2, tex: 2.5, style: 'swing', armRest: rest.sword },
      look: {
        skin: SKIN,
        head: headBase(SKIN, 'none') + eyeCute() + brows() + mouth() + blush + knightHelm(METAL, '#d8402c'),
        body: torso('#4f8fd8', 'tunic'),
        leg: leg('#5a4636', '#7a4a22'),
        arm: arm('#4f8fd8', SKIN, METAL),
        weapon: W.sword(),
      },
    },
    archer: {
      def: { scale: 1.2, tex: 2.5, style: 'shoot', armRest: rest.bow },
      look: {
        skin: SKIN,
        head:
          `<path d="M-20,-34 C-44,-38 -46,-12 -36,2 C-35,-12 -29,-20 -19,-21 Z" fill="#d8482c" ${st()}/>` +
          headBase(SKIN) + eyeCute('#2c5a2a') + brows('#8a2a18', false) + mouth() + blush + hairCap('#d8482c') +
          `<path d="M-23,-27 C-10,-33 12,-34 24,-26" stroke="${O}" stroke-width="7.5" fill="none"/><path d="M-23,-27 C-10,-33 12,-34 24,-26" stroke="#57b34a" stroke-width="4" fill="none"/>`,
        body: torso('#57b34a', 'tunic', '#6b4423'),
        leg: leg('#6b4423', '#4d321c'),
        arm: arm('#57b34a', SKIN),
        weapon: W.bow(),
      },
    },
    spear: {
      def: { scale: 1.2, tex: 2.5, style: 'thrust', armRest: rest.spear },
      look: {
        skin: '#f3c79c',
        head:
          `<path d="M-6,-40 C-10,-60 -30,-58 -28,-44 C-22,-48 -16,-46 -12,-40 Z" fill="#6b5a4a" ${st()}/>` +
          headBase('#f3c79c') + eyeCute() + brows() + mouth(false) + hairCap('#6b5a4a') +
          `<path d="M-24,-25 C-10,-31 12,-32 24.5,-24" stroke="${O}" stroke-width="8.5" fill="none"/><path d="M-24,-25 C-10,-31 12,-32 24.5,-24" stroke="#aeb9c3" stroke-width="5" fill="none"/>`,
        body: torso('#8f99a3', 'plate', '#5c4a3a'),
        leg: leg('#4d4d57', '#33333b'),
        arm: arm('#8f99a3', '#f3c79c', '#aeb9c3'),
        weapon: W.spear(),
      },
    },
    mage: {
      def: { scale: 1.2, tex: 2.5, style: 'cast', armRest: rest.staff },
      look: {
        skin: SKIN,
        head:
          headBase(SKIN) + eyeCute('#3a2a6b') + brows('#eee', false) +
          `<path d="M-2,-11 C0,6 22,6 24,-12 C16,-7 8,-7 -2,-11 Z" fill="#f4f1ea" ${st(2.6)}/>` +
          `<path d="M-20,-34 C-16,-58 -6,-70 -24,-82 C6,-80 18,-58 20,-34 Z" fill="#6a4bd1" ${st()}/><ellipse cx="0" cy="-33" rx="31" ry="7.5" fill="#6a4bd1" ${st()}/>` +
          `<path d="M-19,-38 C-8,-33 10,-33 19.5,-38" stroke="#f2c230" stroke-width="4" fill="none"/>` +
          `<path d="M2,-58 l2,4.4 4.8,0.5 -3.6,3.2 1,4.7 -4.2,-2.4 -4.2,2.4 1,-4.7 -3.6,-3.2 4.8,-0.5 Z" fill="#ffe14a"/>`,
        body: torso('#6a4bd1', 'robe', '#f2c230'),
        leg: leg('#3d2c7a', '#2b1f57'),
        arm: arm('#6a4bd1', SKIN),
        weapon: W.staff('#4fd6ff', rest.staff),
      },
    },
    healer: {
      def: { scale: 1.2, tex: 2.5, style: 'cast', armRest: rest.staff },
      look: {
        skin: '#ffe2c4',
        head:
          `<path d="M-24,-28 C-36,-6 -34,16 -24,28 L-4,26 L-6,-12 Z" fill="#fff3c9" ${st()}/>` +
          headBase('#ffe2c4') + eyeCute('#2a6b5a') + brows('#c9a85a', false) + mouth() + blush + hairCap('#fff3c9') +
          `<circle cx="-13" cy="-36" r="5.5" fill="#ff8fb3" ${st(2)}/><circle cx="-13" cy="-36" r="2" fill="#ffe14a"/>`,
        body: torso('#fdfaf0', 'robe', '#5fd39a'),
        leg: leg('#e9dfc8', '#c9a85a'),
        arm: arm('#fdfaf0', '#ffe2c4'),
        weapon: W.healStaff(rest.staff),
      },
    },
    samurai: {
      def: { scale: 1.22, tex: 2.5, style: 'swing', armRest: -24 },
      look: {
        skin: '#f3c79c',
        head:
          `<path d="M-25,-18 L-39,-2 L-18,-2 Z" fill="#8a1c1c" ${st()}/>` +
          headBase('#f3c79c', 'none') + eyeCute() + brows() + mouth(false) +
          `<path d="M-25.5,-13 C-28,-49 28,-49 25.5,-17 L25.5,-25 C15,-31 1,-31 -9,-26 L-9,-5 C-17,-5 -24.5,-7 -25.5,-13 Z" fill="#b3261e" ${st()}/>` +
          `<path d="M-15,-40 C-13,-66 2,-62 3,-45 C4,-62 19,-66 21,-40 C12,-50 -6,-50 -15,-40 Z" fill="#f2c230" ${st()}/>` +
          `<path d="M-9,-26 C1,-31 15,-31 25.5,-25" stroke="#2b2b33" stroke-width="3" fill="none"/>`,
        body: torso('#b3261e', 'plate', '#2b2b33') + `<path d="M-13,-16 L13,-16 M-14,-11 L14,-11" stroke="#f2c230" stroke-width="1.6"/>`,
        leg: leg('#2b2b33', '#8a1c1c'),
        arm: arm('#2b2b33', '#f3c79c', '#b3261e'),
        weapon: W.katana(),
      },
    },
    giant: {
      def: { scale: 2.0, tex: 3.6, style: 'smash', armRest: -10, wide: 1.25 },
      look: {
        skin: '#e0a070',
        head:
          headBase('#e0a070') +
          `<ellipse cx="5.5" cy="-21" rx="2.6" ry="3" fill="#2b1a10"/><ellipse cx="16" cy="-21" rx="2.5" ry="3" fill="#2b1a10"/>` +
          `<path d="M0,-27 L9,-25 M12.5,-25 L21,-27" stroke="#6b3a1c" stroke-width="4" stroke-linecap="round"/>` +
          `<path d="M-19,-14 C-18,8 22,10 25,-14 C17,-8 9,-10 5,-13 C1,-9 -9,-9 -19,-14 Z" fill="#8a4a24" ${st()}/>` +
          `<path d="M4,-7 Q10,-4 16,-7" stroke="${O}" stroke-width="2" fill="none"/>`,
        body: torso('#e0a070', 'bare', '#6b4423', 1.2),
        leg: leg('#6b4423', '#4d321c'),
        arm: arm('#e0a070', '#e0a070', undefined, 1.35),
        weapon: W.club('#8a5a2c', '#d9dee3', 24),
      },
    },
    // ----- שדים -----
    imp: {
      def: { scale: 1.0, tex: 2.2, style: 'thrust', armRest: -12 },
      look: {
        skin: '#e0483a',
        head: horn('#f4e6c8', false) + headBase('#e0483a', 'point') + evilEyes('#ffe14a') + fangMouth(),
        body: torso('#e0483a', 'bare', '#4a2a2a', 0.85),
        leg: leg('#c93a2e', '#8a221c'),
        arm: arm('#e0483a', '#e0483a'),
        weapon: W.trident(),
      },
    },
    skel: {
      def: { scale: 1.2, tex: 2.5, style: 'swing', armRest: -18 },
      look: {
        skin: '#f1ead8',
        head:
          `<path d="M-23,-22 C-23,-49 23,-49 23,-22 C23,-12 18,-8 14,-7 L14,0 L-12,0 L-12,-7 C-18,-9 -23,-13 -23,-22 Z" fill="#f1ead8" ${st()}/>` +
          `<path d="M-21,-22 C-21,-10 -14,-7 -10,-6 L-10,-1 L-4,-1 C-12,-8 -15,-18 -14,-30 Z" fill="#000" opacity=".1"/>` +
          `<ellipse cx="3" cy="-21" rx="5.6" ry="6.6" fill="#2b1a10"/><ellipse cx="16" cy="-21" rx="5" ry="6.6" fill="#2b1a10"/>` +
          `<circle cx="3.6" cy="-20.5" r="1.9" fill="#ff5a3a"/><circle cx="16.4" cy="-20.5" r="1.9" fill="#ff5a3a"/>` +
          `<path d="M9,-13 L11.5,-9 L7,-9 Z" fill="#2b1a10"/><path d="M-8,-5 L13,-5 M-3,-7.5 L-3,-0.5 M2,-7.5 L2,-0.5 M7,-7.5 L7,-0.5" stroke="${O}" stroke-width="1.8"/>`,
        body: torso('#f1ead8', 'bones'),
        leg: boneLeg('#f1ead8'),
        arm: `<rect x="-2" y="-3" width="4" height="17" rx="2" fill="#f1ead8" ${st(2.4)}/>`,
        weapon: W.sword('#b9a58a', '#7a6a55', 30),
      },
    },
    darcher: {
      def: { scale: 1.2, tex: 2.5, style: 'shoot', armRest: -52 },
      look: {
        skin: '#8fb58a',
        head:
          `<path d="M-24,-28 C-34,-8 -32,10 -24,20 L-6,18 L-8,-12 Z" fill="#2a2a38" ${st()}/>` +
          headBase('#8fb58a', 'point') + evilEyes('#ff5a3a') + `<path d="M7,-9.5 L15,-9.5" stroke="${O}" stroke-width="2" stroke-linecap="round"/>` + hairCap('#2a2a38'),
        body: torso('#5a3d6b', 'tunic', '#2a2a38'),
        leg: leg('#2a2a38', '#1c1c26'),
        arm: arm('#5a3d6b', '#8fb58a'),
        weapon: W.bow('#5a2a2a'),
      },
    },
    brute: {
      def: { scale: 1.85, tex: 3.4, style: 'smash', armRest: -12, wide: 1.25 },
      look: {
        skin: '#b5402e',
        head: horn('#f4e6c8', true) + headBase('#b5402e', 'point') + evilEyes('#ffe14a') + fangMouth(2) + `<path d="M0,-28 L9,-25.5 M13,-25.5 L22,-28" stroke="${O}" stroke-width="3.4" stroke-linecap="round"/>`,
        body: torso('#b5402e', 'bare', '#4a2a1c', 1.2),
        leg: leg('#4a2a1c', '#2e1a12'),
        arm: arm('#b5402e', '#b5402e', undefined, 1.35),
        weapon: W.club('#5a3a2a', '#c9d3dc', 26),
      },
    },
    // ----- בוסים -----
    impking: {
      def: { scale: 2.9, tex: 5, style: 'smash', armRest: -18, wide: 1.3 },
      look: {
        skin: '#e0483a',
        head:
          headBase('#e0483a', 'point') + evilEyes('#ffe14a') + fangMouth(2) +
          `<path d="M-17,-37 L-20,-58 L-9,-47 L0,-62 L9,-47 L20,-58 L17,-37 C8,-42 -8,-42 -17,-37 Z" fill="#f2c230" ${st()}/>` +
          `<circle cx="0" cy="-45" r="3" fill="#4fd6ff" ${st(1.6)}/><circle cx="-11" cy="-43" r="2.2" fill="#e0342c" ${st(1.4)}/><circle cx="11" cy="-43" r="2.2" fill="#e0342c" ${st(1.4)}/>`,
        body: torso('#e0483a', 'fat', '#6a2bb5', 1.25),
        leg: leg('#c93a2e', '#8a221c'),
        arm: arm('#e0483a', '#e0483a', '#f2c230', 1.3),
        weapon: W.scepter(),
        cape: cape('#6a2bb5'),
      },
    },
    spirit: {
      def: { scale: 3.0, tex: 5, style: 'cast', armRest: -30, floats: true, wide: 1.2 },
      look: {
        skin: '#3f6b3a',
        head:
          `<path d="M-10,-38 C-14,-52 -30,-50 -34,-66 M-22,-52 L-34,-48 M8,-38 C12,-54 28,-52 30,-68 M20,-54 L32,-52" stroke="${O}" stroke-width="8.5" fill="none" stroke-linecap="round"/>` +
          `<path d="M-10,-38 C-14,-52 -30,-50 -34,-66 M-22,-52 L-34,-48 M8,-38 C12,-54 28,-52 30,-68 M20,-54 L32,-52" stroke="#6b4a2a" stroke-width="4.5" fill="none" stroke-linecap="round"/>` +
          [[-34, -68], [-36, -47], [31, -70], [34, -51]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="#6fd05a" ${st(2)}/>`).join('') +
          headBase('#3f6b3a', 'none') +
          `<ellipse cx="4" cy="-21" rx="5" ry="6" fill="#0d2a2a"/><ellipse cx="16.5" cy="-21" rx="4.6" ry="6" fill="#0d2a2a"/><ellipse cx="4.4" cy="-21" rx="2.8" ry="3.8" fill="#5ff0e0"/><ellipse cx="16.8" cy="-21" rx="2.6" ry="3.8" fill="#5ff0e0"/>` +
          `<path d="M3,-9 Q10,-5 18,-9" stroke="#0d2a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
          `<path d="M-23,-26 C-12,-44 14,-44 23,-27 C12,-34 -10,-34 -23,-26 Z" fill="#57a04a" ${st()}/>`,
        body: torso('#3f6b3a', 'wisp', '#57a04a', 1.2),
        leg: '',
        arm: arm('#4a7a44', '#3f6b3a', '#57a04a', 1.2),
        weapon: W.staff('#5ff0e0', -30),
      },
    },
    icegiant: {
      def: { scale: 3.2, tex: 5, style: 'smash', armRest: -12, wide: 1.3 },
      look: {
        skin: '#9fd2f0',
        head:
          `<path d="M-18,-36 L-22,-58 L-9,-44 L-2,-66 L7,-44 L20,-60 L18,-36 Z" fill="#e6f7ff" ${st()}/>` +
          headBase('#9fd2f0') +
          `<ellipse cx="5.5" cy="-21" rx="3" ry="3.6" fill="#fff"/><ellipse cx="16.2" cy="-21" rx="2.8" ry="3.6" fill="#fff"/><circle cx="6" cy="-21" r="1.5" fill="#1c4a7a"/><circle cx="16.6" cy="-21" r="1.5" fill="#1c4a7a"/>` +
          `<path d="M0,-28 L9,-25.5 M13,-25.5 L22,-28" stroke="#e6f7ff" stroke-width="4.5" stroke-linecap="round"/>` +
          `<path d="M-19,-14 C-18,12 22,14 25,-14 C17,-8 9,-10 5,-13 C1,-9 -9,-9 -19,-14 Z" fill="#f4fbff" ${st()}/>`,
        body: torso('#9fd2f0', 'bare', '#3d5f8a', 1.25),
        leg: leg('#3d5f8a', '#274060'),
        arm: arm('#9fd2f0', '#9fd2f0', '#e6f7ff', 1.4),
        weapon: W.club('#7fc4ee', '#f4fbff', 28),
      },
    },
    lord: {
      def: { scale: 3.4, tex: 5, style: 'swing', armRest: -18, wide: 1.3, hasCape: true },
      look: {
        skin: '#8a2a22',
        head:
          horn('#3a2230', true) + headBase('#8a2a22', 'point') +
          `<path d="M-1,-26 L11,-20 L1,-15 Z" fill="#ffb02e"/><path d="M23,-26 L12,-20 L21,-15 Z" fill="#ffb02e"/><path d="M-1,-26 L11,-20 L1,-15 Z M23,-26 L12,-20 L21,-15 Z" fill="none" ${st(1.8)}/>` +
          `<path d="M-1,-29 L10,-25 M13,-25 L24,-29" stroke="${O}" stroke-width="3.6" stroke-linecap="round"/>` + fangMouth(3),
        body: torso('#8a2a22', 'bare', '#2a1a22', 1.25) + `<path d="M-12,-22 L14,-8 M14,-22 L-12,-8" stroke="#2a1a22" stroke-width="3"/><circle cx="1" cy="-15" r="4" fill="#ffb02e" ${st(2)}/>`,
        leg: leg('#2a1a22', '#150d12'),
        arm: arm('#8a2a22', '#8a2a22', '#3a2230', 1.4),
        weapon: W.flameSword(),
        cape: cape('#2a1a22'),
      },
    },
  };
}

export const CHARS: Record<string, CharDef> = {};

/** מחזיר את כל הטקסטורות של חלקי הדמויות */
export function charSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  const all = looks();
  for (const key of Object.keys(all)) {
    const { def, look } = all[key];
    CHARS[key] = { key, ...def, hasCape: !!look.cape };
    const s = def.tex;
    const handSkin = look.skin;
    out.push({ key: `${key}_head`, vb: [-48, -86, 96, 118], body: look.head, scale: s });
    out.push({ key: `${key}_body`, vb: [-30, -34, 60, 66], body: look.body, scale: s });
    if (look.leg) out.push({ key: `${key}_leg`, vb: [-10, -4, 24, 22], body: look.leg, scale: s });
    out.push({ key: `${key}_armb`, vb: [-12, -12, 24, 36], body: look.arm + hand(shade(handSkin, -0.08)), scale: s });
    out.push({ key: `${key}_armf`, vb: [-70, -70, 140, 140], body: look.weapon + look.arm + hand(handSkin), scale: s });
    if (look.cape) out.push({ key: `${key}_cape`, vb: [-32, -6, 44, 50], body: look.cape, scale: s });
  }
  return out;
}
