// ממיר את קובצי ה-SVG של האייקון ל-PNG בכל הגדלים (דורש Playwright). מריצים: node scripts/render-icons.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const res = path.join(root, 'android/app/src/main/res');
const jobs = [
  ['build/icon.svg', 'build/icon.png', 1024],
  ['build/icon.svg', 'public/icons/icon-512.png', 512],
  ['build/icon.svg', 'public/icons/icon-192.png', 192],
  ['build/icon-maskable.svg', 'public/icons/icon-maskable-512.png', 512],
  ['build/splash.svg', path.join(res, 'drawable/splash.png'), 1024],
];
for (const [d, s, f] of [['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216], ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]]) {
  jobs.push(['build/icon.svg', path.join(res, `mipmap-${d}/ic_launcher.png`), s]);
  jobs.push(['build/icon.svg', path.join(res, `mipmap-${d}/ic_launcher_round.png`), s]);
  jobs.push(['build/icon-foreground.svg', path.join(res, `mipmap-${d}/ic_launcher_foreground.png`), f]);
}
(async () => {
  const b = await chromium.launch();
  for (const [src, out, size] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    const svg = fs.readFileSync(path.join(root, src), 'utf8');
    await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await p.waitForTimeout(80);
    const o = path.isAbsolute(out) ? out : path.join(root, out);
    fs.mkdirSync(path.dirname(o), { recursive: true });
    await p.screenshot({ path: o, omitBackground: true });
    await p.close();
  }
  await b.close();
  console.log('rendered', jobs.length);
})();
