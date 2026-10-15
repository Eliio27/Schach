import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';

export type { Color, Move, PieceSymbol, Square };

export const FILES = 'abcdefgh';

/** Figurenwerte in Bauerneinheiten. Der König zählt hier als 0 (für Materialbilanzen). */
export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Deutsche Figurennamen (Nominativ) – für Erklärsätze. */
export const NAME_DE: Record<PieceSymbol, string> = {
  p: 'Bauer',
  n: 'Springer',
  b: 'Läufer',
  r: 'Turm',
  q: 'Dame',
  k: 'König',
};

/** Deutsche Figurennamen im Akkusativ mit Artikel („den Turm", „die Dame"). */
export const NAME_DE_AKK: Record<PieceSymbol, string> = {
  p: 'den Bauern',
  n: 'den Springer',
  b: 'den Läufer',
  r: 'den Turm',
  q: 'die Dame',
  k: 'den König',
};

/** SAN-Buchstaben auf Deutsch (K, D, T, L, S). */
const SAN_DE: Record<string, string> = { K: 'K', Q: 'D', R: 'T', B: 'L', N: 'S' };

export function colorName(c: Color): string {
  return c === 'w' ? 'Weiss' : 'Schwarz';
}

export function other(c: Color): Color {
  return c === 'w' ? 'b' : 'w';
}

/** Englische SAN in deutsche Notation umwandeln (Nf3 → Sf3, e8=Q → e8=D). */
export function sanDe(san: string): string {
  return san.replace(/[KQRBN]/g, (ch) => SAN_DE[ch] ?? ch);
}

export interface UciMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

export function parseUci(uci: string): UciMove {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;
  return promotion ? { from, to, promotion } : { from, to };
}

export function toUci(m: { from: string; to: string; promotion?: string }): string {
  return m.from + m.to + (m.promotion ?? '');
}

/** Spielt einen UCI-Zug auf einer Kopie und gibt das Move-Objekt zurück (oder null, wenn illegal). */
export function tryMove(chess: Chess, uci: string): Move | null {
  try {
    return chess.move(parseUci(uci));
  } catch {
    return null;
  }
}

/** Wandelt eine UCI-Zugfolge ab einer FEN in SAN um. Stoppt beim ersten illegalen Zug. */
export function uciLineToSan(fen: string, ucis: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of ucis) {
    const m = tryMove(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

/** Formatiert eine SAN-Folge mit Zugnummern („23. Se4 Kf8 24. Dh8#"). */
export function formatLine(fen: string, sans: string[]): string {
  const parts = fen.split(' ');
  let moveNo = parseInt(parts[5] ?? '1', 10) || 1;
  let white = (parts[1] ?? 'w') === 'w';
  const out: string[] = [];
  sans.forEach((san, i) => {
    if (white) out.push(`${moveNo}. ${sanDe(san)}`);
    else out.push(i === 0 ? `${moveNo}… ${sanDe(san)}` : sanDe(san));
    if (!white) moveNo++;
    white = !white;
  });
  return out.join(' ');
}

/** Materialbilanz aus Sicht von Weiss (positiv = Weiss hat mehr). */
export function materialBalance(chess: Chess): number {
  let sum = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      sum += (sq.color === 'w' ? 1 : -1) * VALUE[sq.type];
    }
  }
  return sum;
}

/** Summe der Nicht-Bauern-Figuren beider Seiten (D=9, T=5, L/S=3). */
export function nonPawnMaterial(chess: Chess): number {
  let sum = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.type === 'p' || sq.type === 'k') continue;
      sum += VALUE[sq.type];
    }
  }
  return sum;
}

export type Phase = 'opening' | 'middlegame' | 'endgame';

export const PHASE_DE: Record<Phase, string> = {
  opening: 'Eröffnung',
  middlegame: 'Mittelspiel',
  endgame: 'Endspiel',
};

/**
 * Spielphase für eine Stellung.
 * Endspiel: Nicht-Bauern-Material beider Seiten ≤ 26. Eröffnung: Halbzug ≤ 20 und kein Endspiel.
 */
export function phaseOf(chess: Chess, ply: number): Phase {
  if (nonPawnMaterial(chess) <= 26) return 'endgame';
  if (ply <= 20) return 'opening';
  return 'middlegame';
}

export function sideToMove(fen: string): Color {
  return (fen.split(' ')[1] ?? 'w') as Color;
}

export function squareColor(sq: Square): 'light' | 'dark' {
  const f = FILES.indexOf(sq[0]!);
  const r = parseInt(sq[1]!, 10) - 1;
  return (f + r) % 2 === 1 ? 'light' : 'dark';
}

/** Alle Felder, die von der Figur auf `sq` angegriffen werden (unabhängig davon, wer am Zug ist). */
export function attackedBy(chess: Chess, sq: Square): Square[] {
  const piece = chess.get(sq);
  if (!piece) return [];
  const out: Square[] = [];
  for (const row of chess.board()) {
    for (const t of row) {
      if (!t || t.color === piece.color) continue;
      if (chess.attackers(t.square, piece.color).includes(sq)) out.push(t.square);
    }
  }
  return out;
}
