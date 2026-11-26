// מייצר את קובצי ה-SVG של האייקון מתוך אמנות המשחק. מריצים: npx vitest run --config scripts/icon.config.ts
import { test } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { charSprites } from '../src/art/chars';

test('icon', () => {
  const parts = Object.fromEntries(charSprites().map((s) => [s.key, s.body]));
  const hero = (x: number, y: number, k: number) =>
    `<g transform="translate(${x},${y}) scale(${k})">` +
    `<g transform="translate(-5,-34) rotate(8)">${parts.hero_cape}</g>` +
    `<g transform="translate(0,-12)">${parts.hero_body}</g>` +
    `<g transform="translate(1,-34)">${parts.hero_head}</g>` +
    `<g transform="translate(14,-30) rotate(-26)">${parts.hero_armf}</g></g>`;
  const defs = `<defs><radialGradient id="sky" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#bfeaff"/><stop offset="1" stop-color="#3f8fd8"/></radialGradient><clipPath id="clip"><rect x="26" y="26" width="460" height="460" rx="96"/></clipPath></defs>`;
  const scene = (k: number, y: number) =>
    `<rect width="512" height="512" fill="url(#sky)"/><circle cx="256" cy="210" r="190" fill="#fff6c0" opacity=".35"/>` +
    `<path d="M0,400 C120,340 380,340 512,400 L512,512 L0,512 Z" fill="#6fbe5c"/><path d="M0,430 C140,390 360,390 512,430 L512,512 L0,512 Z" fill="#4f9a44"/>` +
    hero(256, y, k);
  const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect x="8" y="8" width="496" height="496" rx="112" fill="#3a2415"/><rect x="16" y="16" width="480" height="480" rx="104" fill="#f2c230"/><rect x="26" y="26" width="460" height="460" rx="96" fill="#3a2415"/><g clip-path="url(#clip)">${scene(5.4, 540)}</g></svg>`;
  const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}${scene(4.2, 470)}</svg>`;
  const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${hero(256, 430, 3.7)}</svg>`;
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#3a2415"/><circle cx="512" cy="480" r="330" fill="#6b4423" opacity=".6"/>${hero(512, 640, 4.6)}</svg>`;
  mkdirSync('build', { recursive: true });
  writeFileSync('build/icon.svg', full);
  writeFileSync('build/icon-maskable.svg', maskable);
  writeFileSync('build/icon-foreground.svg', foreground);
  writeFileSync('build/splash.svg', splash);
});
