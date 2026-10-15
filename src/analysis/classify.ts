/**
 * Zugklassifizierung und Genauigkeit, angelehnt an Lichess.
 * Alle Bewertungen werden intern aus Sicht von Weiss in Centipawns geführt.
 */

export interface Score {
  /** Centipawns aus Sicht von Weiss (falls kein Matt). */
  cp?: number;
  /** Matt in N aus Sicht von Weiss: positiv = Weiss setzt matt, negativ = Schwarz setzt matt. 0 = bereits matt. */
  mate?: number;
}

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const CLASS_DE: Record<MoveClass, string> = {
  best: 'Bester',
  good: 'Gut',
  inaccuracy: 'Ungenau',
  mistake: 'Fehler',
  blunder: 'Patzer',
};

export const MATE_CP = 10000;

/** Score → Centipawns aus Sicht von Weiss. Matt wird auf ±10000 abgebildet (näheres Matt = grösser). */
export function scoreToCp(s: Score): number {
  if (s.mate !== undefined) {
    if (s.mate === 0) return 0; // sollte nicht vorkommen: Stellung ist matt, wird vom Aufrufer behandelt
    const sign = s.mate > 0 ? 1 : -1;
    return sign * (MATE_CP - Math.min(Math.abs(s.mate), 100) * 10);
  }
  return s.cp ?? 0;
}

/** Gewinnchance in Prozent (0–100) aus Sicht von Weiss (Lichess-Formel). */
export function winPercent(cp: number): number {
  const c = Math.max(-MATE_CP, Math.min(MATE_CP, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

/** Schwellen in Prozentpunkten Gewinnchance (entspricht Lichess 0.1 / 0.2 / 0.3 auf der Skala −1…1). */
export const THRESHOLDS = { inaccuracy: 5, mistake: 10, blunder: 15 } as const;

/**
 * Klassifiziert einen Zug.
 * @param before Score der Stellung vor dem Zug (Weiss-Sicht)
 * @param after Score der Stellung nach dem Zug (Weiss-Sicht)
 * @param mover Farbe des Ziehenden
 * @param playedBest true, wenn der gespielte Zug dem Engine-Zug entspricht
 */
export function classifyMove(before: Score, after: Score, mover: 'w' | 'b', playedBest: boolean): MoveClass {
  const loss = winLoss(before, after, mover);
  if (playedBest) return 'best';
  if (loss >= THRESHOLDS.blunder) return 'blunder';
  if (loss >= THRESHOLDS.mistake) return 'mistake';
  if (loss >= THRESHOLDS.inaccuracy) return 'inaccuracy';
  return 'good';
}

/** Verlust an Gewinnchance (Prozentpunkte, ≥ 0) aus Sicht des Ziehenden. */
export function winLoss(before: Score, after: Score, mover: 'w' | 'b'): number {
  const sign = mover === 'w' ? 1 : -1;
  const wb = winPercent(sign * scoreToCp(before));
  const wa = winPercent(sign * scoreToCp(after));
  return Math.max(0, wb - wa);
}

/** Centipawn-Verlust aus Sicht des Ziehenden, Bewertungen auf ±1000 begrenzt. */
export function cpLoss(before: Score, after: Score, mover: 'w' | 'b'): number {
  const sign = mover === 'w' ? 1 : -1;
  const clamp = (x: number) => Math.max(-1000, Math.min(1000, x));
  return Math.max(0, clamp(sign * scoreToCp(before)) - clamp(sign * scoreToCp(after)));
}

/** Genauigkeit eines einzelnen Zuges (0–100), Lichess-Formel. */
export function moveAccuracy(winLossPct: number): number {
  const a = 103.1668 * Math.exp(-0.04354 * winLossPct) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

/** Genauigkeit über mehrere Züge: Mittel aus arithmetischem und harmonischem Mittel. */
export function aggregateAccuracy(accs: number[]): number | null {
  if (accs.length === 0) return null;
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const harmonic = accs.length / accs.reduce((a, b) => a + 1 / Math.max(b, 1), 0);
  return (mean + harmonic) / 2;
}

/** Formatiert einen Score für die Anzeige („+1.2", „#3", „−#2"). */
export function formatScore(s: Score): string {
  if (s.mate !== undefined) return (s.mate < 0 ? '−#' : '#') + Math.abs(s.mate);
  const v = (s.cp ?? 0) / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
}
