// Ad-hoc-Rauchtest für weitere Abläufe (nicht Teil von npm test).
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const DIST = new URL('../../dist/', import.meta.url).pathname;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (q, s) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname); const f = join(DIST, p.endsWith('/') ? p + 'index.html' : p); try { const b = await readFile(f); s.writeHead(200, { 'Content-Type': T[extname(f)] ?? 'application/octet-stream' }); s.end(b); } catch { s.writeHead(404); s.end(); } }).listen(4179);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const S = '.session ';
async function solveAll(max = 20) {
  for (let i = 0; i < max; i++) {
    if (await page.locator(S + 'button:has-text("Fertig")').count()) return i;
    const v = page.locator(S + 'button:has-text("Verstanden")'); if (await v.count()) await v.click();
    const w = page.locator(S + 'button:has-text("Weiter")');
    if (await w.count()) { await w.click({ timeout: 3000 }).catch(async (e) => { await page.screenshot({ path: 'test-results/s-detached.png' }); console.log('  detached', i); }); continue; }
    const h = page.locator(S + 'button:has-text("Hinweis"):not([disabled])');
    if (await h.count()) { await h.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(200); continue; }
    await page.waitForTimeout(700);
  }
  return -1;
}
await page.goto('http://localhost:4179/');
await page.waitForSelector('text=Section A');
console.log('A1 Lektion 1');
await page.click('button:has-text("Los geht")');
let n = await solveAll(40); console.log('  fertig nach Schritten:', n);
await page.screenshot({ path: 'test-results/s1-a1-done.png' });
await page.click(S + 'button:has-text("Fertig")');
console.log('A3 Lektion 1 (custom)');
await page.click('text=Schach abwehren'); await page.click('button:has-text("Lektion 1")');
n = await solveAll(40); console.log('  fertig:', n); await page.click(S + 'button:has-text("Fertig")');
console.log('E3 Lektion 1 (Linien, geführt)');
await page.click('text=Mein Weiss-Repertoire'); await page.click('button:has-text("Lektion 1")');
await page.click(S + 'button:has-text("Verstanden")');
await page.waitForTimeout(9500);
await page.screenshot({ path: 'test-results/s2-line.png' });
// geführte Linie: Pfeil-Züge nachspielen über Pfeil-Koordinaten
for (let k = 0; k < 40; k++) {
  if (await page.locator(S + 'button:has-text("Weiter")').count()) { await page.click(S + 'button:has-text("Weiter")', { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(10000); continue; }
  if (await page.locator(S + 'button:has-text("Fertig")').count()) break;
  const ok = await page.evaluate(() => {
    const svg = document.querySelector('.session svg.board'); if (!svg) return false;
    const line = svg.querySelector('g.arrow line'); if (!line) return false;
    const r = svg.getBoundingClientRect(); const sq = r.width / 8;
    const x1 = +line.getAttribute('x1'), y1 = +line.getAttribute('y1'), x2 = +line.getAttribute('x2'), y2 = +line.getAttribute('y2');
    const fx = Math.floor(x1), fy = Math.floor(y1); const len = Math.hypot(x2 - x1, y2 - y1); const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const tx = Math.floor(x2 + ux * 0.32), ty = Math.floor(y2 + uy * 0.32);
    const tap = (x, y) => { for (const t of ['pointerdown', 'pointerup']) svg.dispatchEvent(new PointerEvent(t, { clientX: r.left + (x + 0.5) * sq, clientY: r.top + (y + 0.5) * sq, bubbles: true })); };
    tap(fx, fy); setTimeout(() => tap(tx, ty), 50); return true;
  });
  await page.waitForTimeout(ok ? 900 : 500);
}
await page.screenshot({ path: 'test-results/s3-line-done.png' });
if (await page.locator(S + 'button:has-text("Fertig")').count()) { console.log('  Linien fertig'); await page.click(S + 'button:has-text("Fertig")'); } else { console.log('  Linien NICHT fertig'); await page.click(S + 'button[aria-label="Schliessen"]'); }
console.log('Import als Elischa123 (Schwarz) → Fehlerkarten');
const pgn = '[White "Elischa123"]\n[Black "Gegner"]\n[Date "2026.10.14"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1';
await page.click('nav >> text=Analyse'); await page.fill('#pgn', pgn); await page.click('button:has-text("Importieren")');
await page.waitForFunction(() => document.body.textContent.includes('1/1 analysiert'), null, { timeout: 300000 });
await page.click('nav >> text=Wiederholen'); await page.waitForSelector('text=Meine Fehler');
await page.screenshot({ path: 'test-results/s4-fehler.png', fullPage: true });
await page.click('button:has-text("Training starten")');
await page.waitForTimeout(500);
await page.screenshot({ path: 'test-results/s5-fehler-aufgabe.png' });
n = await solveAll(60); console.log('  Fehler-Training fertig:', n);
await page.click(S + 'button:has-text("Fertig")');
console.log('Einstufung');
await page.click('nav >> text=Lernen'); await page.click('text=Einstufungstest machen');
n = await solveAll(200); console.log('  Einstufung fertig:', n, await page.textContent('.session .concept').catch(() => ''));
await page.screenshot({ path: 'test-results/s6-einstufung.png' });
await page.click(S + 'button:has-text("Fertig")');
await page.screenshot({ path: 'test-results/s7-pfad.png', fullPage: true });
console.log('Fehler:', errors);
await browser.close(); server.close();
