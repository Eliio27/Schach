import { Chess } from 'chess.js';
import type { ReachTask } from './types';

/** Setzt die Seite am Zug (für Aufgaben, in denen nur eine Seite zieht). */
export function forceTurn(fen: string, color: 'w' | 'b'): string {
  const p = fen.split(' ');
  p[1] = color;
  p[2] = '-';
  p[3] = '-';
  return p.join(' ');
}

export function freeChess(fen: string): Chess {
  return new Chess(fen, { skipValidation: true });
}

/** Ist die Aufgabe gelöst? */
export function reachSolved(task: ReachTask, fen: string): boolean {
  const c = freeChess(fen);
  const pieces = c.board().flat().filter(Boolean);
  if (task.collect) return !pieces.some((p) => p!.color === 'b');
  const p = c.get(task.target as never);
  return !!p && p.color === 'w';
}

/** Kürzester Lösungsweg (Breitensuche). Gibt die UCI-Züge zurück oder null. */
export function reachPlan(task: ReachTask, maxDepth = 10): string[] | null {
  const start = forceTurn(task.fen, 'w');
  const key = (fen: string) => fen.split(' ')[0]!;
  if (reachSolved(task, start)) return [];
  const seen = new Set([key(start)]);
  let frontier: { fen: string; path: string[] }[] = [{ fen: start, path: [] }];
  for (let d = 0; d < maxDepth; d++) {
    const next: typeof frontier = [];
    for (const { fen, path } of frontier) {
      const c = freeChess(fen);
      for (const m of c.moves({ verbose: true })) {
        if (m.promotion && m.promotion !== 'q') continue;
        const c2 = freeChess(fen);
        c2.move({ from: m.from, to: m.to, promotion: m.promotion });
        const f2 = forceTurn(c2.fen(), 'w');
        const k = key(f2);
        if (seen.has(k)) continue;
        seen.add(k);
        const p2 = [...path, m.from + m.to + (m.promotion ?? '')];
        if (reachSolved(task, f2)) return p2;
        next.push({ fen: f2, path: p2 });
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return null;
}
