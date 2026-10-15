import { Chess } from 'chess.js';
import type { LineTask } from './types';

export interface RepLine {
  id: string;
  name: string;
  color: 'w' | 'b';
  uci: string[];
  /** Herkunft: Standardlinie oder aus eigenen Partien (mit Anzahl Partien). */
  source: 'standard' | 'games';
  games?: number;
}

const STANDARD: { name: string; color: 'w' | 'b'; san: string }[] = [
  { name: 'Italienisch (Giuoco Pianissimo)', color: 'w', san: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O' },
  { name: 'Londoner System', color: 'w', san: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6' },
  { name: 'Damengambit', color: 'w', san: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6' },
  { name: 'Caro-Kann, klassisch', color: 'b', san: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6' },
  { name: 'Caro-Kann, Vorstossvariante', color: 'b', san: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5' },
  { name: 'Abgelehntes Damengambit', color: 'b', san: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6' },
  { name: 'Gegen das Londoner System', color: 'b', san: 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6' },
];

export function sanToUci(san: string): string[] {
  const c = new Chess();
  return san.split(' ').map((s) => {
    const m = c.move(s);
    return m.from + m.to + (m.promotion ?? '');
  });
}

/** Kürzt eine Linie, sodass der letzte Halbzug ein eigener Zug ist. */
export function endOnOwnMove(uci: string[], color: 'w' | 'b'): string[] {
  const lastIsOwn = (n: number) => ((n - 1) % 2 === 0) === (color === 'w');
  return uci.length > 0 && !lastIsOwn(uci.length) ? uci.slice(0, -1) : uci;
}

function lineId(color: string, uci: string[]): string {
  let h = 5381;
  const s = color + uci.join('');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'line:' + (h >>> 0).toString(36);
}

export function standardLines(color: 'w' | 'b'): RepLine[] {
  return STANDARD.filter((l) => l.color === color).map((l) => {
    const uci = endOnOwnMove(sanToUci(l.san), color);
    return { id: lineId(color, uci), name: l.name, color, uci, source: 'standard' };
  });
}

/**
 * Leitet Repertoire-Linien aus eigenen Partien ab: An Gegnerzügen wird verzweigt (jede Antwort mit
 * ≥ minGames Partien), bei eigenen Zügen wird der häufigste gewählt. Höchstens 12 Halbzüge.
 */
export function linesFromGames(
  games: { uci: string[]; color: 'w' | 'b' }[],
  color: 'w' | 'b',
  opts: { minGames?: number; maxPlies?: number; maxLines?: number } = {},
): { uci: string[]; games: number }[] {
  const minGames = opts.minGames ?? 3;
  const maxPlies = opts.maxPlies ?? 12;
  const maxLines = opts.maxLines ?? 4;
  const mine = games.filter((g) => g.color === color).map((g) => g.uci.slice(0, maxPlies));
  const out: { uci: string[]; games: number }[] = [];
  const walk = (prefix: string[], pool: string[][]) => {
    if (out.length >= maxLines) return;
    const ply = prefix.length;
    const counts = new Map<string, string[][]>();
    for (const g of pool) {
      const m = g[ply];
      if (!m) continue;
      if (!counts.has(m)) counts.set(m, []);
      counts.get(m)!.push(g);
    }
    const ownMove = (ply % 2 === 0) === (color === 'w');
    const options = [...counts.entries()].filter(([, gs]) => gs.length >= minGames).sort((a, b) => b[1].length - a[1].length);
    if (options.length === 0 || ply >= maxPlies) {
      // Linie soll mit einem eigenen Zug enden
      const line = endOnOwnMove(prefix, color);
      if (line.length >= 4) out.push({ uci: line, games: pool.length });
      return;
    }
    if (ownMove) walk([...prefix, options[0]![0]], options[0]![1]);
    else for (const [m, gs] of options.slice(0, 3)) walk([...prefix, m], gs);
  };
  walk([], mine);
  return out;
}

export function lineTask(l: RepLine, mode: 'guided' | 'free'): LineTask {
  return { kind: 'line', id: l.id, name: l.name, uci: l.uci, color: l.color, mode };
}

export function makeGameLines(found: { uci: string[]; games: number }[], color: 'w' | 'b', name: (uci: string[]) => string): RepLine[] {
  return found.map((f) => ({ id: lineId(color, f.uci), name: name(f.uci), color, uci: f.uci, source: 'games', games: f.games }));
}
