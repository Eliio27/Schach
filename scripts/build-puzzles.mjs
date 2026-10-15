#!/usr/bin/env node
// Liest die entpackte Lichess-Puzzle-CSV von stdin und schreibt die Auswahl als JSON.
//
//   curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc \
//     | node scripts/build-puzzles.mjs public/data/puzzles.json
//
// Filter per Umgebungsvariable änderbar: PUZZLE_TARGET, PUZZLE_MIN_RATING, PUZZLE_MAX_RATING,
// PUZZLE_MIN_POPULARITY, PUZZLE_MIN_PLAYS, PUZZLE_MIN_PLAYS_RARE, PUZZLE_MAX_DEVIATION, PUZZLE_SEED.
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parseHeader, parseRow, PuzzleSelector, tagCounts } from './puzzle-select.mjs';

const out = process.argv[2] ?? 'public/data/puzzles.json';
const env = (k, d) => (process.env[k] !== undefined ? Number(process.env[k]) : d);
const sel = new PuzzleSelector({
  target: env('PUZZLE_TARGET', 8000),
  minRating: env('PUZZLE_MIN_RATING', 400),
  maxRating: env('PUZZLE_MAX_RATING', 1800),
  minPopularity: env('PUZZLE_MIN_POPULARITY', 80),
  minPlays: env('PUZZLE_MIN_PLAYS', 1000),
  minPlaysRare: env('PUZZLE_MIN_PLAYS_RARE', 300),
  maxDeviation: env('PUZZLE_MAX_DEVIATION', 90),
  seed: env('PUZZLE_SEED', 20261015),
});

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
let idx = null;
for await (const line of rl) {
  if (!idx) {
    idx = parseHeader(line);
    continue;
  }
  if (line) sel.add(parseRow(line, idx));
  if (sel.rows % 1_000_000 === 0) console.error(`… ${sel.rows.toLocaleString('de-CH')} Zeilen gelesen`);
}
if (!idx) throw new Error('Keine Eingabe erhalten.');

const selected = sel.select();
const json = JSON.stringify(sel.output(selected, new Date().toISOString().slice(0, 10)));
const gz = gzipSync(json).length;
console.error(`Zeilen: ${sel.rows}, Filter bestanden: ${sel.passed}, ausgewählt: ${selected.length}`);
console.error(`Grösse: ${(json.length / 1e6).toFixed(2)} MB, gzip ${(gz / 1e6).toFixed(2)} MB`);
console.error('Puzzles pro Tag:', JSON.stringify(tagCounts(selected)));
if (selected.length < 1000) throw new Error('Zu wenige Puzzles ausgewählt – Filter prüfen.');
if (json.length > 5_000_000) throw new Error('puzzles.json ist grösser als 5 MB.');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, json);
console.error(`Geschrieben: ${out}`);
