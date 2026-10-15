#!/usr/bin/env node
// Lädt lichess-org/chess-openings (CC0) und schreibt public/data/openings.json.
// Format: [[eco, name, "uci uci …"], …]
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const base = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master/';
const rows = [];
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  const res = await fetch(base + f + '.tsv');
  if (!res.ok) throw new Error(`${f}.tsv: HTTP ${res.status}`);
  const lines = (await res.text()).trim().split('\n').slice(1);
  for (const line of lines) {
    const [eco, name, pgn] = line.split('\t');
    const c = new Chess();
    const uci = [];
    for (const tok of pgn.replace(/\d+\.+/g, ' ').trim().split(/\s+/)) {
      const m = c.move(tok);
      uci.push(m.from + m.to + (m.promotion ?? ''));
    }
    rows.push([eco, name, uci.join(' ')]);
  }
}
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/openings.json', JSON.stringify(rows));
console.log(`${rows.length} Eröffnungen geschrieben.`);
