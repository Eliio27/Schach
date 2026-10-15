import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/** Schreibt dist/sw.js mit der Liste aller Dateien und einem Inhalts-Hash als Cache-Version. */
function serviceWorker(): Plugin {
  return {
    name: 'zugzwang-sw',
    apply: 'build',
    closeBundle() {
      const dist = join(root, 'dist');
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(dist, p).split('\\').join('/'));
        }
      };
      walk(dist);
      const assets = files.filter((f) => f !== 'sw.js').sort();
      const hash = createHash('sha256');
      for (const f of assets) hash.update(f).update(readFileSync(join(dist, f)));
      const version = hash.digest('hex').slice(0, 12);
      const template = readFileSync(join(root, 'src', 'sw-template.js'), 'utf8');
      const sw = template
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(['./', ...assets.filter((f) => f !== 'index.html')], null, 0));
      writeFileSync(join(dist, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [preact(), viteSingleFile({ removeViteModuleLoader: true }), serviceWorker()],
  build: { target: 'es2020', assetsInlineLimit: 100_000_000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never);
