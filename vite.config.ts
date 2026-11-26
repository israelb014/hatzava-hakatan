import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Generates dist/sw.js with a precache list, so the PWA works fully offline. */
function serviceWorker(): Plugin {
  return {
    name: 'hk-service-worker',
    apply: 'build',
    closeBundle() {
      const dist = join(process.cwd(), 'dist');
      const files = walk(dist)
        .map((f) => relative(dist, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.endsWith('.txt'));
      const assets = ['./', ...files.map((f) => './' + f)];
      const tpl = readFileSync(join(process.cwd(), 'src', 'sw.template.js'), 'utf8')
        .replace('__VERSION__', pkg.version)
        .replace('"__ASSETS__"', JSON.stringify(assets));
      writeFileSync(join(dist, 'sw.js'), tpl);
    },
  };
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', chunkSizeWarningLimit: 2500, assetsInlineLimit: 0 },
  plugins: [serviceWorker()],
});
