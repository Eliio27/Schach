#!/usr/bin/env node
/**
 * End-to-End-Test im echten Browser (Chromium, Handy-Viewport):
 *  1. App laden, Service Worker installiert alles
 *  2. Lektion starten, falschen Zug spielen → Widerlegung der Engine erscheint
 *  3. 44-Zug-Partie per PGN importieren und mit 4× gedrosselter CPU analysieren;
 *     dabei messen, dass der Haupt-Thread nie lange blockiert
 *  4. Netz aus, neu laden: Lernpfad, Puzzles und Engine funktionieren offline
 *
 * Voraussetzung: `npm run build`. Start: `npm run e2e`.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIST = new URL('../../dist/', import.meta.url).pathname;
const PGN = await readFile(new URL('./kasparov-topalov.pgn', import.meta.url), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(DIST, path.endsWith('/') ? path + 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(4178);

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const step = (s) => console.log('▶', s);
const fail = async (msg) => {
  await page.screenshot({ path: 'test-results/fail.png' }).catch(() => {});
  console.error('✗', msg, errors);
  process.exit(1);
};

try {
  step('App laden');
  await page.goto('http://localhost:4178/');
  await page.waitForSelector('text=Section A', { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.screenshot({ path: 'test-results/01-lernpfad.png' });

  step('Lektion B1 starten und falschen Zug spielen');
  await page.click('text=Grundreihenmatt');
  await page.click('button:has-text("Lektion 1")');
  await page.click('.session >> text=Verstanden');
  // geführte Aufgabe 1: Lösung über Hinweis 4 abspielen
  await page.waitForSelector('text=Hinweis');
  await page.screenshot({ path: 'test-results/02-aufgabe.png' });
  await page.click('.session button:has-text("Hinweis")');
  await page.waitForSelector('.session button:has-text("Weiter")', { timeout: 15000 });
  await page.click('.session button:has-text("Weiter")');
  // nächste geführte Aufgabe ebenfalls auflösen
  await page.click('.session button:has-text("Hinweis")');
  await page.waitForSelector('.session button:has-text("Weiter")', { timeout: 15000 });
  await page.click('.session button:has-text("Weiter")');
  // freie Aufgabe: einen legalen, aber falschen Zug spielen
  await page.waitForTimeout(900);
  const moved = await page.evaluate(async () => {
    const svg = document.querySelector('svg.board');
    const r = svg.getBoundingClientRect();
    const sq = r.width / 8;
    // alle Felder antippen, bis ein Zielpunkt erscheint, dann den ersten Zielpunkt antippen
    const tap = (x, y) => {
      for (const t of ['pointerdown', 'pointerup']) svg.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
    };
    for (let y = 7; y >= 0; y--) {
      for (let x = 0; x < 8; x++) {
        tap(r.left + (x + 0.5) * sq, r.top + (y + 0.5) * sq);
        await new Promise((res) => setTimeout(res, 30));
        const dots = [...svg.querySelectorAll('circle.dot, circle.ring')];
        if (dots.length > 1) {
          const d = dots[dots.length - 1];
          tap(r.left + Number(d.getAttribute('cx')) * sq, r.top + Number(d.getAttribute('cy')) * sq);
          return true;
        }
      }
    }
    return false;
  });
  if (!moved) await fail('Kein Zug möglich');
  const fb = await page.waitForSelector('.feedback', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const text = await fb.textContent();
  console.log('   Rückmeldung:', text);
  await page.screenshot({ path: 'test-results/03-rueckmeldung.png' });
  await page.click('.session button[aria-label="Schliessen"]');

  step('PGN importieren und mit 4× CPU-Drosselung analysieren');
  await page.click('nav >> text=Analyse');
  await page.fill('#pgn', PGN);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: false });
  });
  const t0 = Date.now();
  await page.click('button:has-text("Importieren")');
  await page.waitForSelector('text=1 Partie importiert');
  await page.waitForFunction(() => document.body.textContent.includes('1/1 analysiert'), null, { timeout: 600000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const longTasks = await page.evaluate(() => window.__long);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const maxLong = Math.max(0, ...longTasks);
  console.log(`   Analyse fertig in ${secs} s (CPU 4× gedrosselt). Long Tasks: ${longTasks.length}, längster ${maxLong.toFixed(0)} ms`);
  if (maxLong > 300) await fail(`Haupt-Thread blockiert ${maxLong.toFixed(0)} ms`);
  await page.click('text=Kasparov, Garry');
  await page.waitForSelector('text=Genauigkeit');
  await page.click('.session button:has-text("Fehler ›")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/04-review.png' });
  await page.click('.session button[aria-label="Schliessen"]');

  step('Offline neu laden');
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('text=Meine Partien', { timeout: 15000 });
  await page.click('nav >> text=Lernen');
  await page.waitForSelector('text=Section A', { timeout: 15000 });
  const offlinePuzzles = await page.evaluate(() => !document.body.textContent.includes('Puzzle-Daten fehlen'));
  if (!offlinePuzzles) await fail('Puzzles offline nicht verfügbar');
  await page.click('text=Springergabel');
  await page.click('button:has-text("Lektion 1")');
  await page.click('.session >> text=Verstanden');
  await page.click('.session button:has-text("Hinweis")');
  await page.waitForSelector('.session button:has-text("Weiter")', { timeout: 15000 });
  await page.click('.session button[aria-label="Schliessen"]');
  // Engine offline: Endspiel starten, Engine muss laden
  await page.click('text=Endspiel: Dame gegen König');
  await page.click('button:has-text("Endspiel 1")');
  await page.click('.session >> text=Verstanden');
  await page.waitForSelector('text=Du spielst Weiss gegen Stockfish', { timeout: 30000 });
  await page.screenshot({ path: 'test-results/05-offline-endspiel.png' });
  await page.click('.session button[aria-label="Schliessen"]');
  await page.click('nav >> text=Wiederholen');
  await page.waitForSelector('text=Meine Fehler');
  await page.screenshot({ path: 'test-results/06-wiederholen.png' });
  await page.click('nav >> text=Statistik');
  await page.waitForSelector('text=Was kostet dich am meisten?');
  await page.screenshot({ path: 'test-results/07-statistik.png', fullPage: true });

  const relevant = errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(e));
  if (relevant.length) await fail('Konsolenfehler: ' + relevant.join(' | '));
  console.log('✓ Alles bestanden.');
} catch (e) {
  await fail(e.message);
} finally {
  await browser.close();
  server.close();
}
