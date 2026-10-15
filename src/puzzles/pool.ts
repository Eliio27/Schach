import { Chess } from 'chess.js';
import { tryMove } from '../chess/util';

export interface Puzzle {
  id: string;
  /** Stellung vor dem Zug des Gegners (Lichess-Format). */
  fen: string;
  /** UCI-Züge, erster Zug = Gegner. */
  moves: string[];
  rating: number;
  tags: string[];
}

interface PuzzleFile {
  v: number;
  tags: string[];
  p: [string, string, string, number, number[]][];
}

let cache: Promise<Puzzle[]> | null = null;

export function loadPuzzles(): Promise<Puzzle[]> {
  if (!cache) {
    cache = fetch('data/puzzles.json')
      .then((r) => {
        if (!r.ok) throw new Error('Puzzle-Daten fehlen (HTTP ' + r.status + ').');
        return r.json() as Promise<PuzzleFile>;
      })
      .then((f) => decodePuzzles(f));
    cache.catch(() => (cache = null));
  }
  return cache;
}

export function decodePuzzles(f: PuzzleFile): Puzzle[] {
  return f.p.map(([id, fen, moves, rating, tagIdx]) => ({
    id,
    fen,
    moves: moves.split(' '),
    rating,
    tags: tagIdx.map((i) => f.tags[i]!).filter(Boolean),
  }));
}

/** Figur, die den ersten eigenen Zug des Puzzles macht (z. B. 'n' für Springer). */
const firstPieceCache = new Map<string, string>();
export function firstSolverPiece(p: Puzzle): string {
  let v = firstPieceCache.get(p.id);
  if (v === undefined) {
    const c = new Chess(p.fen);
    tryMove(c, p.moves[0]!);
    v = c.get(p.moves[1]!.slice(0, 2) as never)?.type ?? '';
    firstPieceCache.set(p.id, v);
  }
  return v;
}

/** Deterministischer Zufall aus einem String (für reproduzierbare Auswahl). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export interface PickOptions {
  tags?: string[];
  /** Alle diese Tags müssen vorkommen. */
  allTags?: string[];
  excludeTags?: string[];
  min: number;
  max: number;
  count: number;
  avoid?: Set<string>;
  filter?: (p: Puzzle) => boolean;
  seed: string;
}

/**
 * Wählt Puzzles nach Tags und Rating-Fenster, sortiert nach Rating (aufsteigend).
 * Bevorzugt ungesehene Puzzles; das Fenster wird schrittweise erweitert, falls zu wenige passen.
 */
export function pickPuzzles(pool: Puzzle[], o: PickOptions): Puzzle[] {
  const match = (p: Puzzle) =>
    (!o.tags || o.tags.some((t) => p.tags.includes(t))) &&
    (!o.allTags || o.allTags.every((t) => p.tags.includes(t))) &&
    (!o.excludeTags || !o.excludeTags.some((t) => p.tags.includes(t))) &&
    (!o.filter || o.filter(p));
  const candidates = pool.filter(match);
  const rand = seededRandom(o.seed);
  for (let widen = 0; widen <= 4; widen++) {
    const lo = o.min - widen * 100;
    const hi = o.max + widen * 100;
    const inWindow = candidates.filter((p) => p.rating >= lo && p.rating <= hi);
    const fresh = inWindow.filter((p) => !o.avoid?.has(p.id));
    const source = fresh.length >= o.count ? fresh : inWindow;
    if (source.length >= o.count || widen === 4) {
      return shuffle(source, rand).slice(0, o.count).sort((a, b) => a.rating - b.rating);
    }
  }
  return [];
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Stellung, in der der Spieler am Zug ist (nach dem ersten Gegnerzug). */
export function solverFen(p: Puzzle): string {
  const c = new Chess(p.fen);
  tryMove(c, p.moves[0]!);
  return c.fen();
}
