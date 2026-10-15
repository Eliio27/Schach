import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(async () => chromium.launch());
const p = await b.newPage();
for (const [src, out, size] of [['public/icons/icon.svg','public/icons/icon-192.png',192],['public/icons/icon.svg','public/icons/icon-512.png',512],['public/icons/icon.svg','public/icons/apple-touch-icon.png',180],['public/icons/icon-maskable.svg','public/icons/icon-maskable-512.png',512]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:transparent">${readFileSync(src,'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: out, omitBackground: true });
}
await b.close();
