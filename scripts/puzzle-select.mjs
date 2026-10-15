// Auswahl-Logik für die Lichess-Puzzle-Datenbank (CC0).
// Rein und ohne I/O, damit sie mit Vitest getestet werden kann.
import { Chess } from 'chess.js';

/** Tags, nach denen ausgewogen ausgewählt wird (je ein Bucket pro Tag × Rating-Band). */
export const BUCKET_TAGS = [
  'mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'smotheredMate', 'anastasiaMate', 'arabianMate',
  'hookMate', 'doubleBishopMate', 'bodenMate', 'dovetailMate',
  'hangingPiece', 'defensiveMove', 'capturingDefender', 'fork', 'pin', 'skewer', 'discoveredAttack',
  'discoveredCheck', 'doubleCheck', 'xRayAttack', 'equality', 'quietMove', 'deflection', 'attraction',
  'intermezzo', 'interference', 'clearance', 'trappedPiece', 'sacrifice', 'promotion', 'advancedPawn',
  'enPassant', 'castling', 'attackingF2F7', 'kingsideAttack', 'queensideAttack', 'exposedKing', 'zugzwang',
  'pawnEndgame', 'rookEndgame', 'bishopEndgame', 'knightEndgame', 'queenEndgame', 'queenRookEndgame',
  'underPromotion',
];

/** Zusätzliche Tags, die im Ergebnis erhalten bleiben (für Filter in der App), aber keinen eigenen Bucket haben. */
export const EXTRA_TAGS = ['mate', 'opening', 'middlegame', 'endgame', 'short', 'long', 'veryLong', 'oneMove', 'crushing', 'advantage'];

export const OUTPUT_TAGS = [...BUCKET_TAGS, ...EXTRA_TAGS];

export const DEFAULTS = {
  minRating: 400,
  maxRating: 1800,
  binSize: 100,
  minPopularity: 80,
  minPlays: 1000,
  minPlaysRare: 300,
  maxDeviation: 90,
  target: 8000,
  reservoir: 60,
  seed: 20261015,
};

export const REQUIRED_COLUMNS = ['PuzzleId', 'FEN', 'Moves', 'Rating', 'RatingDeviation', 'Popularity', 'NbPlays', 'Themes'];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Liest die Spaltenpositionen aus der Kopfzeile. Wirft bei fehlenden Spalten. */
export function parseHeader(line) {
  const cols = line.trim().split(',');
  const idx = {};
  for (const c of REQUIRED_COLUMNS) {
    const i = cols.indexOf(c);
    if (i < 0) throw new Error(`Spalte "${c}" fehlt in der Kopfzeile. Format der Lichess-Datenbank geändert?`);
    idx[c] = i;
  }
  return idx;
}

/** Zerlegt eine CSV-Zeile. Lichess-Felder enthalten keine Kommas, daher genügt split. */
export function parseRow(line, idx) {
  const f = line.split(',');
  if (f.length < REQUIRED_COLUMNS.length) return null;
  return {
    id: f[idx.PuzzleId],
    fen: f[idx.FEN],
    moves: f[idx.Moves],
    rating: Number(f[idx.Rating]),
    deviation: Number(f[idx.RatingDeviation]),
    popularity: Number(f[idx.Popularity]),
    plays: Number(f[idx.NbPlays]),
    themes: (f[idx.Themes] ?? '').split(' ').filter(Boolean),
  };
}

/** Prüft, ob alle Züge des Puzzles legal sind. */
export function isValidPuzzle(p) {
  try {
    const c = new Chess(p.fen);
    const moves = p.moves.split(' ');
    if (moves.length < 2) return false;
    for (const u of moves) {
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sammelt Kandidaten im Stream (Reservoir-Sampling pro Tag × Rating-Band) und wählt am Ende ausgewogen aus.
 */
export class PuzzleSelector {
  constructor(opts = {}) {
    this.o = { ...DEFAULTS, ...opts };
    this.rand = mulberry32(this.o.seed);
    this.bins = Math.ceil((this.o.maxRating - this.o.minRating + 1) / this.o.binSize);
    /** key `${tag}|${bin}|${strict}` → { seen, items[] } */
    this.buckets = new Map();
    this.rows = 0;
    this.passed = 0;
  }

  binOf(rating) {
    return Math.min(this.bins - 1, Math.floor((rating - this.o.minRating) / this.o.binSize));
  }

  /** Verarbeitet eine geparste Zeile. */
  add(p) {
    this.rows++;
    const o = this.o;
    if (!p || !p.id || !p.fen || !p.moves) return;
    if (!(p.rating >= o.minRating && p.rating <= o.maxRating)) return;
    if (!(p.popularity >= o.minPopularity)) return;
    if (!(p.deviation <= o.maxDeviation)) return;
    if (!(p.plays >= o.minPlaysRare)) return;
    const tags = p.themes.filter((t) => BUCKET_TAGS.includes(t));
    if (tags.length === 0) return;
    this.passed++;
    const strict = p.plays >= o.minPlays ? 1 : 0;
    const bin = this.binOf(p.rating);
    const item = { id: p.id, fen: p.fen, moves: p.moves, rating: p.rating, themes: p.themes.filter((t) => OUTPUT_TAGS.includes(t)) };
    for (const tag of tags) {
      const key = `${tag}|${bin}|${strict}`;
      let b = this.buckets.get(key);
      if (!b) this.buckets.set(key, (b = { seen: 0, items: [] }));
      b.seen++;
      if (b.items.length < o.reservoir) b.items.push(item);
      else {
        const j = Math.floor(this.rand() * b.seen);
        if (j < o.reservoir) b.items[j] = item;
      }
    }
  }

  /**
   * Ausgewogene Endauswahl: Round-Robin über die Tags (jeder Tag gleich oft an der Reihe),
   * innerhalb eines Tags reihum über die Rating-Bänder. Strenge Kandidaten zuerst.
   */
  select() {
    const o = this.o;
    const lists = [];
    for (const tag of BUCKET_TAGS) {
      const perBin = [];
      for (let bin = 0; bin < this.bins; bin++) {
        const strict = this.buckets.get(`${tag}|${bin}|1`)?.items ?? [];
        const relaxed = this.buckets.get(`${tag}|${bin}|0`)?.items ?? [];
        // Seltene Tags: gelockerter Plays-Filter nur, wenn zu wenig strenge Kandidaten.
        const list = strict.length >= o.reservoir / 2 ? strict : [...strict, ...relaxed];
        if (list.length) perBin.push(list);
      }
      const merged = [];
      const longest = Math.max(0, ...perBin.map((l) => l.length));
      for (let i = 0; i < longest; i++) for (const l of perBin) if (l[i]) merged.push(l[i]);
      if (merged.length) lists.push(merged);
    }
    const chosen = new Map();
    const ptr = lists.map(() => 0);
    let progress = true;
    while (chosen.size < o.target && progress) {
      progress = false;
      for (let li = 0; li < lists.length && chosen.size < o.target; li++) {
        const list = lists[li];
        while (ptr[li] < list.length) {
          const item = list[ptr[li]++];
          if (chosen.has(item.id) || !isValidPuzzle(item)) continue;
          chosen.set(item.id, item);
          progress = true;
          break;
        }
      }
    }
    return [...chosen.values()];
  }

  /** Erzeugt das kompakte JSON-Objekt für die App. */
  output(selected, generated) {
    const tagIndex = new Map(OUTPUT_TAGS.map((t, i) => [t, i]));
    const sorted = [...selected].sort((a, b) => a.rating - b.rating || (a.id < b.id ? -1 : 1));
    return {
      v: 1,
      generated,
      source: 'Lichess puzzle database (https://database.lichess.org/#puzzles), CC0',
      filter: {
        rating: [this.o.minRating, this.o.maxRating],
        minPopularity: this.o.minPopularity,
        minPlays: this.o.minPlays,
        minPlaysRare: this.o.minPlaysRare,
        maxDeviation: this.o.maxDeviation,
      },
      tags: OUTPUT_TAGS,
      p: sorted.map((x) => [x.id, x.fen, x.moves, x.rating, x.themes.map((t) => tagIndex.get(t)).filter((i) => i !== undefined)]),
    };
  }
}

/** Statistik: Anzahl Puzzles pro Bucket-Tag. */
export function tagCounts(selected) {
  const counts = Object.fromEntries(BUCKET_TAGS.map((t) => [t, 0]));
  for (const p of selected) for (const t of p.themes) if (t in counts) counts[t]++;
  return counts;
}
