import { Chess } from 'chess.js';
import { phaseOf, tryMove } from '../chess/util';
import { aggregateAccuracy, classifyMove, cpLoss, moveAccuracy, winLoss, type MoveClass } from './classify';
import type { MoveReport, PlyAnalysis, StoredAnalysis } from '../db/db';

const EMPTY_COUNTS = (): Record<MoveClass, number> => ({ best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 });

/** Erzeugt Zugberichte und Zusammenfassung aus den Bewertungen aller Stellungen (n + 1 Einträge). */
export function buildReport(
  startFen: string,
  uci: string[],
  positions: PlyAnalysis[],
): { moves: MoveReport[]; summary: NonNullable<StoredAnalysis['summary']> } {
  const c = new Chess(startFen);
  const startPly = (c.turn() === 'w' ? 0 : 1) + 2 * ((parseInt(startFen.split(' ')[5] ?? '1', 10) || 1) - 1);
  const moves: MoveReport[] = [];
  const acc: Record<'w' | 'b', number[]> = { w: [], b: [] };
  const loss: Record<'w' | 'b', number[]> = { w: [], b: [] };
  const phaseAcc = {
    opening: { w: [] as number[], b: [] as number[] },
    middlegame: { w: [] as number[], b: [] as number[] },
    endgame: { w: [] as number[], b: [] as number[] },
  };
  const counts = { w: EMPTY_COUNTS(), b: EMPTY_COUNTS() };

  for (let i = 0; i < uci.length; i++) {
    const before = positions[i];
    const after = positions[i + 1];
    const color = c.turn();
    const phase = phaseOf(c, startPly + i);
    const m = tryMove(c, uci[i]!);
    if (!m || !before || !after) break;
    const wl = winLoss(before.score, after.score, color);
    const cls = classifyMove(before.score, after.score, color, before.best === uci[i]);
    const a = cls === 'best' ? 100 : moveAccuracy(wl);
    const cl = cls === 'best' ? 0 : cpLoss(before.score, after.score, color);
    acc[color].push(a);
    loss[color].push(cl);
    phaseAcc[phase][color].push(a);
    counts[color][cls]++;
    moves.push({ ply: i, uci: uci[i]!, san: m.san, color, cls, winLoss: wl, cpLoss: cl, accuracy: a, phase });
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  return {
    moves,
    summary: {
      accuracy: { w: aggregateAccuracy(acc.w), b: aggregateAccuracy(acc.b) },
      acpl: { w: Math.round(mean(loss.w)), b: Math.round(mean(loss.b)) },
      byPhase: {
        opening: { w: aggregateAccuracy(phaseAcc.opening.w), b: aggregateAccuracy(phaseAcc.opening.b) },
        middlegame: { w: aggregateAccuracy(phaseAcc.middlegame.w), b: aggregateAccuracy(phaseAcc.middlegame.b) },
        endgame: { w: aggregateAccuracy(phaseAcc.endgame.w), b: aggregateAccuracy(phaseAcc.endgame.b) },
      },
      counts,
    },
  };
}
