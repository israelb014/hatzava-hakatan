// ערכת ממשק: כפתורים, מסגרות עץ, מגילות, אייקונים ואפקטים - הכול SVG
import { type SpriteDef, O, st, shade } from './svg';

let uid = 0;
const gid = () => 'g' + uid++;

function button(key: string, c: string): SpriteDef {
  const id = gid();
  const dark = shade(c, -0.38);
  return {
    key,
    vb: [0, 0, 120, 68],
    noTrim: true,
    scale: 2,
    defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, 0.28)}"/><stop offset="1" stop-color="${shade(c, -0.08)}"/></linearGradient>`,
    body:
      `<rect x="1.5" y="1.5" width="117" height="65" rx="20" fill="${O}"/>` +
      `<rect x="4.5" y="4.5" width="111" height="59" rx="17" fill="${dark}"/>` +
      `<rect x="4.5" y="4.5" width="111" height="52" rx="17" fill="url(#${id})"/>` +
      `<rect x="9" y="7.5" width="102" height="18" rx="10" fill="#fff" opacity=".26"/>` +
      `<rect x="5.5" y="5.5" width="109" height="50" rx="16" fill="none" stroke="${shade(c, 0.45)}" stroke-width="1.6" opacity=".7"/>`,
  };
}

function round(key: string, c: string): SpriteDef {
  const id = gid();
  return {
    key,
    vb: [-50, -50, 100, 100],
    scale: 2,
    defs: `<radialGradient id="${id}" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${shade(c, 0.45)}"/><stop offset="1" stop-color="${shade(c, -0.25)}"/></radialGradient>`,
    body:
      `<circle r="47" fill="${O}"/><circle r="43.5" fill="#f2c230"/><circle r="43.5" fill="none" stroke="#fff3b0" stroke-width="2" opacity=".7"/>` +
      `<circle r="37" fill="${O}"/><circle r="34.5" fill="url(#${id})"/><ellipse cx="-6" cy="-16" rx="20" ry="10" fill="#fff" opacity=".22"/>`,
  };
}

function node(key: string, c: string): SpriteDef {
  return {
    key,
    vb: [-36, -34, 72, 72],
    scale: 2,
    body:
      `<ellipse cx="0" cy="12" rx="31" ry="20" fill="${O}"/><ellipse cx="0" cy="10" rx="28" ry="17.5" fill="${shade(c, -0.4)}"/>` +
      `<ellipse cx="0" cy="0" rx="31" ry="21" fill="${O}"/><ellipse cx="0" cy="0" rx="28" ry="18" fill="${c}"/>` +
      `<ellipse cx="-4" cy="-7" rx="19" ry="8" fill="#fff" opacity=".3"/>`,
  };
}

const starPath = (r: number, r2: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r2;
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)} `;
  }
  return d + 'Z';
};

function icon(key: string, body: string, size = 48, scale = 2.5): SpriteDef {
  return { key, vb: [-size / 2, -size / 2, size, size], body, scale };
}

const coin =
  `<circle r="20" fill="${O}"/><circle r="17.5" fill="#f2b01e"/><circle r="17.5" fill="none" stroke="#ffe680" stroke-width="2.5"/><circle r="12" fill="#ffd23e" stroke="#c98a12" stroke-width="2"/>` +
  `<path d="M-3,-7 L3,-7 L3,7 L-3,7 Z" fill="#c98a12"/><ellipse cx="-6" cy="-9" rx="6" ry="3" fill="#fff" opacity=".5" transform="rotate(-30 -6 -9)"/>`;
const gem =
  `<path d="M-18,-6 L-9,-17 L9,-17 L18,-6 L0,19 Z" fill="#2f9be8" ${st(3)}/><path d="M-18,-6 L18,-6 M-9,-17 L-5,-6 L0,19 L5,-6 L9,-17" stroke="#bfe6ff" stroke-width="1.6" fill="none"/>` +
  `<path d="M-9,-17 L9,-17 L5,-6 L-5,-6 Z" fill="#8fd4ff"/><path d="M-18,-6 L-5,-6 L0,19 Z" fill="#1c6fc0" opacity=".55"/>`;
const heart = `<path d="M0,16 C-22,2 -20,-16 -9,-16 C-4,-16 0,-12 0,-8 C0,-12 4,-16 9,-16 C20,-16 22,2 0,16 Z" fill="#e8382e" ${st(3)}/><ellipse cx="-8" cy="-9" rx="4.5" ry="3" fill="#fff" opacity=".55"/>`;
const swordIc = (rot = 45) =>
  `<g transform="rotate(${rot})"><path d="M-3.5,-22 L3.5,-22 L3.5,6 L-3.5,6 Z M-3.5,-22 L0,-27 L3.5,-22" fill="#e9f1f7" ${st(2.6)}/><rect x="-9" y="5" width="18" height="5" rx="2" fill="#f2c230" ${st(2.4)}/><rect x="-2.5" y="10" width="5" height="10" rx="2" fill="#7a4a22" ${st(2.4)}/><circle cy="21" r="3" fill="#f2c230" ${st(2)}/></g>`;
const shieldIc = (c = '#c9d3dc') =>
  `<path d="M0,-20 C8,-15 14,-15 18,-15 C18,2 12,14 0,21 C-12,14 -18,2 -18,-15 C-14,-15 -8,-15 0,-20 Z" fill="${c}" ${st(3)}/><path d="M0,-14 C5,-11 9,-10.5 12,-10.5 C12,1 8,9 0,14 Z" fill="#fff" opacity=".35"/>`;
const skull = (c = '#f1ead8') =>
  `<path d="M-15,-4 C-15,-22 15,-22 15,-4 C15,3 11,6 9,7 L9,13 L-9,13 L-9,7 C-11,6 -15,3 -15,-4 Z" fill="${c}" ${st(3)}/>` +
  `<ellipse cx="-6" cy="-3" rx="4.2" ry="5" fill="${O}"/><ellipse cx="6" cy="-3" rx="4.2" ry="5" fill="${O}"/><path d="M0,3 L2.4,7 L-2.4,7 Z" fill="${O}"/><path d="M-4,9 L-4,13 M0,9 L0,13 M4,9 L4,13" stroke="${O}" stroke-width="1.8"/>`;
const lockIc = `<path d="M-8,-4 L-8,-10 C-8,-21 8,-21 8,-10 L8,-4" fill="none" stroke="${O}" stroke-width="8"/><path d="M-8,-4 L-8,-10 C-8,-21 8,-21 8,-10 L8,-4" fill="none" stroke="#c9d3dc" stroke-width="3.6"/><rect x="-13" y="-5" width="26" height="22" rx="5" fill="#8f99a3" ${st(3)}/><circle cy="4" r="3.4" fill="${O}"/><rect x="-1.5" y="4" width="3" height="7" fill="${O}"/>`;
const potion =
  `<path d="M-5,-18 L5,-18 L5,-9 C16,-4 18,16 0,18 C-18,16 -16,-4 -5,-9 Z" fill="#f4f8fb" ${st(3)}/><path d="M-12,2 C-10,-3 10,-3 12,2 C13,12 8,15 0,15.5 C-8,15 -13,12 -12,2 Z" fill="#e8382e"/>` +
  `<rect x="-7" y="-22" width="14" height="6" rx="2" fill="#a8743c" ${st(2.4)}/><ellipse cx="-6" cy="4" rx="2.5" ry="4" fill="#fff" opacity=".55"/>`;

export function uiSprites(): SpriteDef[] {
  const out: SpriteDef[] = [];
  // כפתורים
  out.push(button('btn_orange', '#f0702a'), button('btn_blue', '#2f93e0'), button('btn_green', '#59b93a'), button('btn_grey', '#8f8f8f'), button('btn_red', '#d83a2e'), button('btn_brown', '#9a5a2c'));
  out.push(round('round_orange', '#f0902a'), round('round_blue', '#2f93e0'), round('round_teal', '#2fc0c8'), round('round_dark', '#4a3526'), round('round_red', '#d83a2e'));
  out.push(node('node_blue', '#3f97e6'), node('node_gold', '#ffc93a'), node('node_grey', '#8a8f96'), node('node_green', '#5cc23e'));
  // מסגרות
  out.push({
    key: 'panel_wood',
    vb: [0, 0, 96, 96],
    noTrim: true,
    body:
      `<rect x="1.5" y="1.5" width="93" height="93" rx="20" fill="${O}"/><rect x="4.5" y="4.5" width="87" height="87" rx="17" fill="#9a602e"/>` +
      `<rect x="4.5" y="4.5" width="87" height="42" rx="17" fill="#b3743a" opacity=".6"/>` +
      `<rect x="8" y="8" width="80" height="80" rx="14" fill="none" stroke="#f2c230" stroke-width="2.6"/><rect x="12" y="12" width="72" height="72" rx="11" fill="#4d2f17" stroke="${O}" stroke-width="2"/>`,
  });
  out.push({
    key: 'panel_parch',
    vb: [0, 0, 96, 96],
    noTrim: true,
    body:
      `<rect x="1.5" y="1.5" width="93" height="93" rx="16" fill="${O}"/><rect x="4.5" y="4.5" width="87" height="87" rx="13" fill="#f6e7bf"/>` +
      `<rect x="4.5" y="60" width="87" height="31.5" rx="13" fill="#e9d29c" opacity=".7"/><rect x="7.5" y="7.5" width="81" height="81" rx="11" fill="none" stroke="#c9a05a" stroke-width="2"/>`,
  });
  out.push({
    key: 'panel_dark',
    vb: [0, 0, 64, 64],
    noTrim: true,
    body: `<rect x="1" y="1" width="62" height="62" rx="14" fill="#2b1a10" opacity=".88"/><rect x="2.5" y="2.5" width="59" height="59" rx="12.5" fill="none" stroke="#7a5230" stroke-width="2"/>`,
  });
  out.push({
    key: 'panel_card',
    vb: [0, 0, 80, 80],
    noTrim: true,
    body:
      `<rect x="1.5" y="1.5" width="77" height="77" rx="13" fill="${O}"/><rect x="4" y="4" width="72" height="72" rx="10.5" fill="#f2deaa"/><rect x="7" y="7" width="66" height="66" rx="8" fill="#7d4a24"/>` +
      `<rect x="7" y="7" width="66" height="30" rx="8" fill="#96592c" opacity=".7"/>`,
  });
  out.push({
    key: 'panel_row',
    vb: [0, 0, 80, 80],
    noTrim: true,
    body: `<rect x="1.5" y="1.5" width="77" height="77" rx="13" fill="#8a6a3a"/><rect x="4" y="4" width="72" height="72" rx="10.5" fill="#fbf1d2"/><rect x="4" y="52" width="72" height="24" rx="10.5" fill="#f0deb0" opacity=".8"/>`,
  });
  out.push({
    key: 'slot',
    vb: [0, 0, 64, 64],
    noTrim: true,
    body:
      `<rect x="1.5" y="1.5" width="61" height="61" rx="12" fill="${O}"/><rect x="4" y="4" width="56" height="56" rx="9.5" fill="#fff"/>` +
      `<rect x="8" y="8" width="48" height="48" rx="6.5" fill="#000" opacity=".28"/><rect x="8" y="8" width="48" height="20" rx="6.5" fill="#fff" opacity=".12"/>`,
  });
  out.push({
    key: 'pill',
    vb: [0, 0, 64, 40],
    noTrim: true,
    body: `<rect x="0" y="0" width="64" height="40" rx="20" fill="#1c1410" opacity=".72"/>`,
  });
  out.push({
    key: 'banner',
    vb: [0, 0, 300, 96],
    noTrim: true,
    body:
      `<path d="M38,60 L6,66 L22,78 L8,92 L62,86 Z" fill="#c9a05a" ${st(3)}/><path d="M262,60 L294,66 L278,78 L292,92 L238,86 Z" fill="#c9a05a" ${st(3)}/>` +
      `<path d="M38,60 L62,86 L62,70 Z" fill="#8a6a3a" ${st(2.5)}/><path d="M262,60 L238,86 L238,70 Z" fill="#8a6a3a" ${st(2.5)}/>` +
      `<path d="M30,10 C90,2 210,2 270,10 L264,72 C210,64 90,64 36,72 Z" fill="#f6e7bf" ${st(3.5)}/>` +
      `<path d="M36,62 C90,55 210,55 264,62 L264,72 C210,64 90,64 36,72 Z" fill="#e2c88e" opacity=".8"/>` +
      `<path d="M30,10 L22,18 L30,26 L24,34 L32,42 L26,52 L36,72 M270,10 L278,18 L270,26 L276,34 L268,42 L274,52 L264,72" fill="none" stroke="${O}" stroke-width="2" opacity=".35"/>`,
  });
  // אייקונים
  out.push(icon('coin', coin));
  out.push(icon('gem', gem));
  out.push(icon('heart', heart));
  out.push(icon('ic_sword', swordIc(40), 60));
  out.push(icon('ic_shield', shieldIc()));
  out.push(icon('ic_speed', `<path d="M4,-22 L-12,3 L-2,3 L-6,22 L13,-5 L3,-5 Z" fill="#3fc0ff" ${st(3)}/><path d="M2,-14 L-6,0 L1,0" fill="#fff" opacity=".5"/>`));
  out.push(icon('ic_swords', `<g transform="scale(.8)">${swordIc(45)}${swordIc(-45)}</g>`, 56));
  out.push(icon('ic_skull', skull()));
  out.push(icon('ic_boss', `<path d="M-12,-14 C-20,-22 -22,-28 -18,-32 C-14,-24 -8,-22 -4,-18 Z M12,-14 C20,-22 22,-28 18,-32 C14,-24 8,-22 4,-18 Z" fill="#8a1c1c" ${st(2.6)}/>` + skull('#ff6a55'), 68));
  out.push(icon('lock', lockIc));
  out.push(icon('ic_potion', potion, 52));
  out.push(icon('star', `<path d="${starPath(22, 10)}" fill="#ffc93a" ${st(3)}/><path d="${starPath(14, 6.5)}" fill="#ffe680" opacity=".7" transform="translate(-1,-2)"/>`, 52, 3));
  out.push(icon('star_empty', `<path d="${starPath(22, 10)}" fill="#5a4636" ${st(3)}/>`, 52, 3));
  out.push(icon('ic_star', `<path d="${starPath(20, 9)}" fill="#ffc93a" ${st(3)}/>`));
  out.push(icon('ic_xp', `<path d="${starPath(21, 11)}" fill="#ffb02e" ${st(3)}/><path d="M-9,-5 L-3,3 M-3,-5 L-9,3 M2,3 L2,-5 L6,-5 C9,-5 9,0 6,0 L2,0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>`, 52));
  out.push(icon('ic_gear', Array.from({ length: 8 }, (_, i) => `<path d="M-4.5,-21 L4.5,-21 L3.5,-13 L-3.5,-13 Z" transform="rotate(${i * 45})" fill="#d5dee6" ${st(2.6)}/>`).join('') + `<circle r="14" fill="#d5dee6" ${st(3)}/><circle r="6" fill="#4a3526" ${st(2.4)}/>`));
  out.push(icon('ic_pause', `<rect x="-10" y="-12" width="7" height="24" rx="2.5" fill="#fff6dc" ${st(2.6)}/><rect x="3" y="-12" width="7" height="24" rx="2.5" fill="#fff6dc" ${st(2.6)}/>`));
  out.push(icon('ic_play', `<path d="M-8,-13 L13,0 L-8,13 Z" fill="#fff6dc" ${st(2.8)}/>`));
  out.push(icon('ic_left', `<path d="M10,-16 L-12,0 L10,16 L5,0 Z" fill="#fff6dc" ${st(3)}/>`));
  out.push(icon('ic_right', `<path d="M-10,-16 L12,0 L-10,16 L-5,0 Z" fill="#fff6dc" ${st(3)}/>`));
  out.push(icon('ic_close', `<path d="M-11,-11 L11,11 M11,-11 L-11,11" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M-11,-11 L11,11 M11,-11 L-11,11" stroke="#fff6dc" stroke-width="4.5" stroke-linecap="round"/>`));
  out.push(icon('ic_check', `<path d="M-13,1 L-4,10 L14,-10" stroke="${O}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M-13,1 L-4,10 L14,-10" stroke="#8ff06a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`));
  out.push(icon('ic_up', `<path d="M0,-20 L17,0 L8,0 L8,18 L-8,18 L-8,0 L-17,0 Z" fill="#6fe04a" ${st(3)}/><path d="M0,-13 L8,-3 L-8,-3 Z" fill="#fff" opacity=".4"/>`));
  out.push(icon('ic_down', `<path d="M0,20 L17,0 L8,0 L8,-18 L-8,-18 L-8,0 L-17,0 Z" fill="#e8382e" ${st(3)}/>`));
  out.push(icon('ic_helmet', `<path d="M-16,8 C-18,-22 18,-22 16,4 L16,-4 C9,-8 0,-8 -5,-5 L-5,12 C-10,12 -15,11 -16,8 Z" fill="#c9d3dc" ${st(3)}/><path d="M-2,-18 C-8,-32 -24,-26 -22,-10 C-18,-16 -12,-18 -6,-15 Z" fill="#d8402c" ${st(2.6)}/>`, 56));
  out.push(icon('ic_armor', `<path d="M-16,-14 L-7,-19 C-3,-14 3,-14 7,-19 L16,-14 L20,-4 L13,0 L13,18 L-13,18 L-13,0 L-20,-4 Z" fill="#c9d3dc" ${st(3)}/><path d="M0,-12 L0,18 M-13,8 L13,8" stroke="#8f99a3" stroke-width="2"/><rect x="-13" y="10" width="26" height="5" fill="#8a5226" ${st(2)}/>`));
  out.push(icon('ic_gloves', `<path d="M-10,18 L-10,2 C-14,-2 -16,-8 -12,-10 C-10,-10 -8,-8 -7,-5 L-6,-17 C-6,-21 -1,-21 -1,-17 L-0.5,-19 C0,-23 5,-22 5,-18 L5.5,-17 C7,-20 11,-19 11,-15 L11,-10 C13,-12 16,-10 15.5,-6 L13,6 L11,18 Z" fill="#8f7a66" ${st(3)}/><rect x="-11" y="11" width="23" height="7" rx="2" fill="#6b5a4a" ${st(2.4)}/>`));
  out.push(icon('ic_ring', `<circle cy="6" r="12" fill="none" stroke="${O}" stroke-width="9"/><circle cy="6" r="12" fill="none" stroke="#f2c230" stroke-width="4.5"/><path d="M-8,-9 L-4,-16 L4,-16 L8,-9 L0,0 Z" fill="#4fd6ff" ${st(2.6)}/><path d="M-4,-16 L4,-16 L2,-10 L-2,-10 Z" fill="#fff" opacity=".6"/>`));
  out.push(icon('ic_chest', `<path d="M-19,-3 C-19,-18 19,-18 19,-3 Z" fill="#b3743a" ${st(3)}/><rect x="-19" y="-3" width="38" height="20" rx="2" fill="#9a602e" ${st(3)}/><path d="M-10,-15 L-10,17 M10,-15 L10,17" stroke="#f2c230" stroke-width="4"/><rect x="-4.5" y="-7" width="9" height="10" rx="2" fill="#f2c230" ${st(2.4)}/>`));
  out.push(icon('ic_flag', `<rect x="-13" y="-20" width="4" height="40" rx="2" fill="#a8743c" ${st(2.4)}/><path d="M-9,-18 L16,-12 L-9,-3 Z" fill="#e8382e" ${st(3)}/>`));
  out.push(icon('ic_crown', `<path d="M-18,12 L-20,-10 L-9,0 L0,-16 L9,0 L20,-10 L18,12 Z" fill="#f2c230" ${st(3)}/><circle cy="4" r="3.2" fill="#e8382e" ${st(1.8)}/><circle cx="-10" cy="5" r="2.2" fill="#4fd6ff" ${st(1.6)}/><circle cx="10" cy="5" r="2.2" fill="#4fd6ff" ${st(1.6)}/>`));
  out.push(icon('ic_music', `<path d="M-6,12 L-6,-14 L14,-19 L14,8" fill="none" stroke="${O}" stroke-width="8" stroke-linejoin="round"/><path d="M-6,12 L-6,-14 L14,-19 L14,8" fill="none" stroke="#fff6dc" stroke-width="3.6" stroke-linejoin="round"/><ellipse cx="-11" cy="13" rx="7" ry="5.5" fill="#fff6dc" ${st(2.6)}/><ellipse cx="9" cy="9" rx="7" ry="5.5" fill="#fff6dc" ${st(2.6)}/>`));
  out.push(icon('ic_sound', `<path d="M-18,-6 L-10,-6 L1,-16 L1,16 L-10,6 L-18,6 Z" fill="#fff6dc" ${st(3)}/><path d="M7,-8 C12,-3 12,3 7,8 M12,-14 C21,-5 21,5 12,14" stroke="${O}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M7,-8 C12,-3 12,3 7,8 M12,-14 C21,-5 21,5 12,14" stroke="#fff6dc" stroke-width="3" fill="none" stroke-linecap="round"/>`));
  out.push(icon('ic_key', `<circle cx="-9" cy="-6" r="9" fill="none" stroke="${O}" stroke-width="9"/><circle cx="-9" cy="-6" r="9" fill="none" stroke="#f2c230" stroke-width="4.5"/><path d="M-2,1 L16,19 M10,13 L15,8 M5,8 L9,4" stroke="${O}" stroke-width="9" stroke-linecap="round"/><path d="M-2,1 L16,19 M10,13 L15,8 M5,8 L9,4" stroke="#f2c230" stroke-width="4.5" stroke-linecap="round"/>`));
  out.push(icon('ic_trash', `<path d="M-13,-10 L13,-10 L10,19 L-10,19 Z" fill="#e8382e" ${st(3)}/><rect x="-16" y="-15" width="32" height="6" rx="2" fill="#e8382e" ${st(3)}/><rect x="-5" y="-20" width="10" height="5" rx="2" fill="#e8382e" ${st(2.6)}/><path d="M-5,-4 L-4,13 M5,-4 L4,13" stroke="#fff" stroke-width="2.4" opacity=".7"/>`));
  // כישורים
  out.push(icon('ic_skill0', `<g transform="scale(.82)">${swordIc(30)}</g><path d="M-18,6 A19,19 0 0 1 4,-19 M18,-6 A19,19 0 0 1 -4,19" stroke="${O}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-18,6 A19,19 0 0 1 4,-19 M18,-6 A19,19 0 0 1 -4,19" stroke="#fff6dc" stroke-width="3.2" fill="none" stroke-linecap="round"/>`, 56));
  out.push(icon('ic_skill1', `<path d="M-19,-5 L-8,-7 L12,-17 L12,17 L-8,7 L-19,5 Z" fill="#f2c230" ${st(3)}/><path d="M-8,-7 L-8,7" stroke="${O}" stroke-width="2"/><path d="M17,-9 L22,-12 M18,0 L24,0 M17,9 L22,12" stroke="${O}" stroke-width="7" stroke-linecap="round"/><path d="M17,-9 L22,-12 M18,0 L24,0 M17,9 L22,12" stroke="#fff6dc" stroke-width="3" stroke-linecap="round"/>`, 56));
  out.push(icon('ic_skill2', heart + `<path d="M-2.6,-9 L2.6,-9 L2.6,-3.6 L8,-3.6 L8,1.6 L2.6,1.6 L2.6,7 L-2.6,7 L-2.6,1.6 L-8,1.6 L-8,-3.6 L-2.6,-3.6 Z" fill="#fff"/>`, 52));
  // מפה
  out.push({
    key: 'node_boss',
    vb: [-44, -52, 88, 110],
    scale: 2,
    body:
      `<path d="M-20,-22 C-34,-30 -40,-42 -34,-50 C-28,-40 -18,-36 -8,-32 Z M20,-22 C34,-30 40,-42 34,-50 C28,-40 18,-36 8,-32 Z" fill="#8a1c1c" ${st(3)}/>` +
      `<path d="M0,-36 C22,-36 34,-22 34,-4 C34,18 14,34 0,52 C-14,34 -34,18 -34,-4 C-34,-22 -22,-36 0,-36 Z" fill="#c92a22" ${st(3.5)}/>` +
      `<path d="M0,-30 C18,-30 28,-18 28,-4 C28,6 22,15 14,24 C20,10 18,-10 0,-22 Z" fill="#000" opacity=".15"/>` +
      `<g transform="translate(0,-4) scale(1.15)">${skull('#ff8a75')}</g>`,
  });
  // אפקטים
  out.push({ key: 'shadow', vb: [-24, -8, 48, 16], scale: 1, body: `<ellipse rx="22" ry="6.5" fill="#000" opacity=".28"/>` });
  const g1 = gid();
  out.push({ key: 'glow', vb: [-32, -32, 64, 64], scale: 2, defs: `<radialGradient id="${g1}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".4" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`, body: `<circle r="32" fill="url(#${g1})"/>` });
  out.push({ key: 'ring', vb: [-34, -34, 68, 68], scale: 2, body: `<circle r="28" fill="none" stroke="#fff" stroke-width="7"/>` });
  out.push({ key: 'ringflat', vb: [-52, -18, 104, 36], scale: 2, body: `<ellipse rx="48" ry="14" fill="#fff" opacity=".28"/><ellipse rx="48" ry="14" fill="none" stroke="#fff" stroke-width="4"/>` });
  out.push({ key: 'spark', vb: [-20, -20, 40, 40], scale: 2, body: `<path d="M0,-19 L4,-5 L18,-8 L7,2 L13,17 L0,7 L-13,17 L-7,2 L-18,-8 L-4,-5 Z" fill="#fff6c0" stroke="#ffb02e" stroke-width="2.4" stroke-linejoin="round"/>` });
  out.push({ key: 'poof', vb: [-22, -20, 44, 40], scale: 2, body: `<path d="M-14,10 C-24,8 -22,-6 -12,-6 C-12,-18 6,-20 9,-9 C20,-12 24,4 14,9 C10,16 -8,16 -14,10 Z" fill="#fff" stroke="#d8d0c0" stroke-width="2"/>` });
  out.push({ key: 'slash', vb: [-40, -40, 80, 80], scale: 2, body: `<path d="M-30,20 A36,36 0 0 1 30,-22 A30,30 0 0 0 -30,20 Z" fill="#fff" opacity=".9"/>` });
  out.push({ key: 'arrow', vb: [-20, -6, 40, 12], scale: 2.5, body: `<rect x="-16" y="-1.3" width="28" height="2.6" fill="#a8743c" ${st(1.4)}/><path d="M11,-4.5 L19,0 L11,4.5 Z" fill="#e9f1f7" ${st(1.6)}/><path d="M-17,-4 L-11,0 L-17,4 Z" fill="#fff" ${st(1.4)}/>` });
  out.push({ key: 'darrow', vb: [-20, -6, 40, 12], scale: 2.5, body: `<rect x="-16" y="-1.3" width="28" height="2.6" fill="#3a2230" ${st(1.4)}/><path d="M11,-4.5 L19,0 L11,4.5 Z" fill="#e0342c" ${st(1.6)}/><path d="M-17,-4 L-11,0 L-17,4 Z" fill="#8a1c1c" ${st(1.4)}/>` });
  out.push({ key: 'bolt', vb: [-22, -12, 44, 24], scale: 2.5, body: `<path d="M-20,0 C-8,-8 2,-10 10,-9 C18,-8 20,8 10,9 C2,10 -8,8 -20,0 Z" fill="#4fd6ff" opacity=".55"/><circle cx="9" r="7" fill="#bff0ff" stroke="#2f93e0" stroke-width="2"/><circle cx="7.5" cy="-2" r="2.4" fill="#fff"/>` });
  out.push({ key: 'healfx', vb: [-12, -12, 24, 24], scale: 2.5, body: `<path d="M-3.5,-10 L3.5,-10 L3.5,-3.5 L10,-3.5 L10,3.5 L3.5,3.5 L3.5,10 L-3.5,10 L-3.5,3.5 L-10,3.5 L-10,-3.5 L-3.5,-3.5 Z" fill="#7dfa9a" stroke="#1f8a4a" stroke-width="2" stroke-linejoin="round"/>` });
  out.push({ key: 'flame', vb: [-22, -52, 44, 56], scale: 2.5, body: `<path d="M0,2 C-22,0 -20,-22 -9,-30 C-10,-22 -5,-20 -3,-24 C-2,-34 4,-42 2,-50 C14,-38 22,-22 16,-10 C14,-2 8,2 0,2 Z" fill="#ff7a1e" stroke="#d8402c" stroke-width="2.4" stroke-linejoin="round"/><path d="M0,0 C-11,-1 -11,-14 -4,-19 C-3,-13 1,-14 2,-24 C9,-16 12,-8 9,-3 C7,0 4,0 0,0 Z" fill="#ffe14a"/>` });
  out.push({ key: 'confetti', vb: [-5, -3, 10, 6], scale: 2, body: `<rect x="-5" y="-3" width="10" height="6" rx="1" fill="#fff"/>` });
  out.push({ key: 'px', vb: [0, 0, 8, 8], noTrim: true, scale: 1, body: `<rect width="8" height="8" fill="#fff"/>` });
  out.push({ key: 'cloud', vb: [-70, -28, 140, 56], scale: 1.5, body: `<path d="M-52,18 C-72,16 -68,-8 -48,-6 C-46,-24 -16,-28 -8,-12 C2,-28 34,-24 34,-6 C56,-10 66,14 48,18 Z" fill="#fff" opacity=".9"/>` });
  const g2 = gid();
  out.push({ key: 'sun', vb: [-70, -70, 140, 140], scale: 1.5, defs: `<radialGradient id="${g2}"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#fff3a0" stop-opacity=".9"/><stop offset="1" stop-color="#fff3a0" stop-opacity="0"/></radialGradient>`, body: `<circle r="70" fill="url(#${g2})"/>` });
  out.push({
    key: 'hand',
    vb: [-24, -8, 48, 56],
    scale: 2.5,
    body: `<path d="M-4,-4 C-4,-9 4,-9 4,-4 L4,12 L7,12 C7,8 13,8 13,12 L14,13 C15,10 20,11 20,15 L20,30 C20,40 14,44 6,44 L0,44 C-8,44 -12,38 -16,30 L-20,20 C-21,16 -16,14 -13,18 L-4,26 Z" fill="#fff6dc" ${st(3)}/>`,
  });
  out.push({ key: 'bubble_tail', vb: [-16, 0, 32, 22], scale: 2, body: `<path d="M-14,0 L0,20 L14,0 Z" fill="#f6e7bf" ${st(3)}/><rect x="-12.5" y="-3" width="25" height="5" fill="#f6e7bf"/>` });
  out.push({
    key: 'portrait_ring',
    vb: [-50, -50, 100, 100],
    scale: 2,
    body: `<circle r="47" fill="${O}"/><circle r="44" fill="#6b4423"/><circle r="36" fill="${O}"/><circle r="34" fill="#7fc6f0"/><path d="M-34,6 C-20,-2 20,-2 34,6 A34,34 0 0 1 -34,6 Z" fill="#8fd16a"/>`,
  });
  out.push({ key: 'itemcard', vb: [-30, -40, 60, 80], scale: 2, body: `<rect x="-27" y="-37" width="54" height="74" rx="9" fill="#9b4fd6" ${st(3.5)}/><rect x="-21" y="-31" width="42" height="62" rx="6" fill="#5a2a8a"/><path d="${starPath(13, 6)}" fill="#ffd0ff"/>` });
  // פריטי מחנה
  out.push({
    key: 'tent',
    vb: [-120, -150, 240, 160],
    scale: 1.5,
    body:
      `<path d="M-104,4 L-8,-128 L112,4 Z" fill="#efe0c2" ${st(4)}/><path d="M-8,-128 L112,4 L40,4 Z" fill="#d9c4a0"/><path d="M-8,-128 L-36,4 L20,4 Z" fill="#5c4030" ${st(3.5)}/>` +
      `<path d="M-8,-128 L-36,4 L-56,4 Z" fill="#fff4dc" ${st(3)}/><path d="M-8,-128 L20,4 L38,4 Z" fill="#fff4dc" ${st(3)}/>` +
      `<path d="M-20,-140 L-8,-128 L6,-142" fill="none" stroke="#7a4a22" stroke-width="7" stroke-linecap="round"/><path d="M-104,4 L112,4" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`,
  });
  out.push({
    key: 'logs',
    vb: [-50, -24, 100, 40],
    scale: 2,
    body:
      `<g transform="rotate(14)"><rect x="-40" y="-8" width="80" height="16" rx="8" fill="#9a602e" ${st(3)}/><ellipse cx="38" cy="0" rx="5" ry="7.5" fill="#e0b070" ${st(2.4)}/></g>` +
      `<g transform="rotate(-14)"><rect x="-40" y="-8" width="80" height="16" rx="8" fill="#b3743a" ${st(3)}/><ellipse cx="-38" cy="0" rx="5" ry="7.5" fill="#e9c488" ${st(2.4)}/></g>` +
      [-40, -22, 22, 40].map((x) => `<ellipse cx="${x}" cy="13" rx="7" ry="4" fill="#9aa0a6" ${st(2.2)}/>`).join(''),
  });
  out.push({
    key: 'flag',
    vb: [-70, -250, 140, 260],
    scale: 1.5,
    body:
      `<rect x="-5" y="-232" width="10" height="238" rx="4" fill="#a8743c" ${st(3.5)}/><path d="M0,-248 L9,-230 L-9,-230 Z" fill="#d5dee6" ${st(3)}/>` +
      `<rect x="-58" y="-214" width="116" height="10" rx="4" fill="#8a5a2c" ${st(3)}/>` +
      `<path d="M-50,-206 L50,-206 L50,-104 L0,-80 L-50,-104 Z" fill="#4f79b8" ${st(3.5)}/><path d="M-50,-206 L-30,-206 L-30,-95 L-50,-104 Z" fill="#000" opacity=".14"/>` +
      `<g transform="translate(0,-150) scale(1.5)">${shieldIc('#dfe8f0')}</g><path d="M-9,-146 L-9,-158 L-4.5,-152 L0,-160 L4.5,-152 L9,-158 L9,-146 Z" fill="#4f79b8"/>`,
  });
  out.push({
    key: 'fence',
    vb: [-90, -60, 180, 66],
    scale: 1.5,
    body:
      [-70, 0, 70].map((x) => `<path d="M${x - 8},4 L${x - 8},-44 L${x},-56 L${x + 8},-44 L${x + 8},4 Z" fill="#a8743c" ${st(3)}/>`).join('') +
      `<rect x="-86" y="-38" width="172" height="10" rx="3" fill="#b9854a" ${st(3)}/><rect x="-86" y="-16" width="172" height="10" rx="3" fill="#b9854a" ${st(3)}/>`,
  });
  out.push({ key: 'rock', vb: [-34, -30, 68, 36], scale: 1.5, body: `<path d="M-30,4 L-22,-16 L-4,-26 L16,-20 L30,4 Z" fill="#9aa0a6" ${st(3)}/><path d="M-4,-26 L16,-20 L30,4 L8,4 Z" fill="#000" opacity=".14"/>` });
  out.push({ key: 'bush', vb: [-60, -44, 120, 52], scale: 1.5, body: `<path d="M-54,6 C-66,-10 -48,-28 -34,-20 C-32,-40 -2,-44 6,-26 C18,-42 48,-34 44,-14 C60,-12 60,6 50,6 Z" fill="#3f8a3a" ${st(3.5)}/><path d="M-34,-20 C-20,-28 -8,-22 -6,-10 M6,-26 C18,-28 28,-20 28,-10" stroke="#57a84a" stroke-width="4" fill="none" stroke-linecap="round"/>` });
  return out;
}

export { coin as COIN_SVG, gem as GEM_SVG };
