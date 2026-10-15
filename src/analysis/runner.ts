/**
 * Hintergrund-Analyse importierter Partien mit dem lokalen Stockfish.
 * Die Engine läuft im Web Worker; hier wird nur koordiniert. Fortschritt wird nach jeder
 * Stellung gespeichert, damit eine unterbrochene Analyse später weiterläuft.
 */
import { Chess } from 'chess.js';
import { engine } from '../engine/engine';
import {
  getAnalysis,
  getCard,
  getGame,
  allGames,
  loadSettings,
  putAnalysis,
  putCard,
  putGame,
  type MoveReport,
  type PlyAnalysis,
  type StoredAnalysis,
} from '../db/db';
import { parseGame } from '../import/pgn';
import { MATE_CP, type Score } from './classify';
import { buildReport } from './report';
import { explainMistake } from './explain';
import { newCard } from '../srs/srs';
import { colorName, sanDe } from '../chess/util';

type Listener = (state: RunnerState) => void;

export interface RunnerState {
  running: boolean;
  paused: boolean;
  gameId: string | null;
  done: number;
  total: number;
  queue: number;
  error?: string;
}

class Runner {
  private queue: string[] = [];
  private state: RunnerState = { running: false, paused: false, gameId: null, done: 0, total: 0, queue: 0 };
  private listeners = new Set<Listener>();
  private stopFlag = false;

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    l(this.state);
    return () => this.listeners.delete(l);
  }

  private emit(patch: Partial<RunnerState>) {
    this.state = { ...this.state, ...patch, queue: this.queue.length };
    for (const l of this.listeners) l(this.state);
  }

  enqueue(ids: string[]) {
    for (const id of ids) if (!this.queue.includes(id) && this.state.gameId !== id) this.queue.push(id);
    this.emit({});
    if (!this.state.running && !this.state.paused) void this.loop();
  }

  /** Alle Partien, deren Analyse noch nicht fertig ist, einreihen. */
  async resumePending() {
    const games = await allGames();
    this.enqueue(games.filter((g) => g.status !== 'done' && g.status !== 'error').map((g) => g.id));
  }

  pause() {
    this.stopFlag = true;
    this.emit({ paused: true });
    engine.cancelAll();
  }

  resume() {
    this.emit({ paused: false });
    if (!this.state.running) void this.loop();
  }

  private async loop() {
    this.stopFlag = false;
    this.emit({ running: true });
    while (this.queue.length > 0 && !this.stopFlag) {
      const id = this.queue.shift()!;
      try {
        await this.analyse(id);
      } catch (e) {
        if (this.stopFlag) {
          this.queue.unshift(id);
          break;
        }
        const g = await getGame(id);
        if (g) await putGame({ ...g, status: 'error' });
        this.emit({ error: (e as Error).message });
      }
    }
    this.emit({ running: false, gameId: null });
  }

  private async analyse(id: string) {
    const g = await getGame(id);
    if (!g) return;
    const s = await loadSettings();
    const parsed = parseGame(g.pgn);
    const n = parsed.uci.length;
    let a: StoredAnalysis = (await getAnalysis(id)) ?? { gameId: id, depth: s.depth, positions: Array(n + 1).fill(null) };
    if (a.depth !== s.depth && !a.finished) a = { gameId: id, depth: s.depth, positions: Array(n + 1).fill(null) };
    await putGame({ ...g, status: 'running' });
    this.emit({ gameId: id, done: a.positions.filter(Boolean).length, total: n + 1, error: undefined });

    const c = new Chess(parsed.startFen);
    const fens = [c.fen()];
    for (const u of parsed.uci) {
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      fens.push(c.fen());
    }

    for (let i = 0; i <= n; i++) {
      if (this.stopFlag) throw new Error('pausiert');
      if (a.positions[i]) continue;
      a.positions[i] = await evaluate(fens[i]!, a.depth, s.movetime);
      // Fortschritt regelmässig speichern
      if (i % 4 === 0 || i === n) await putAnalysis(a);
      this.emit({ done: a.positions.filter(Boolean).length });
      const latest = await getGame(id);
      if (latest) await putGame({ ...latest, progress: a.positions.filter(Boolean).length / (n + 1) });
    }

    const report = buildReport(parsed.startFen, parsed.uci, a.positions as PlyAnalysis[]);
    a = { ...a, moves: report.moves, summary: report.summary, finished: Date.now() };
    await addExplanationsAndCards(id, g.color, fens, parsed.uci, a);
    await putAnalysis(a);
    const latest = (await getGame(id)) ?? g;
    await putGame({ ...latest, status: 'done', progress: 1 });
  }
}

/** Bewertet eine Stellung. Endstellungen (matt/patt) ohne Engine. */
async function evaluate(fen: string, depth: number, movetime: number): Promise<PlyAnalysis> {
  const c = new Chess(fen);
  if (c.isCheckmate()) return { score: { cp: c.turn() === 'w' ? -MATE_CP : MATE_CP }, best: null, pv: [] };
  if (c.isStalemate() || c.isInsufficientMaterial()) return { score: { cp: 0 }, best: null, pv: [] };
  const r = await engine.search(fen, { depth, movetime });
  return { score: r.score, best: r.best, pv: r.pv.slice(0, 10) };
}

/** Erklärungen für Fehler/Patzer erzeugen und eigene Fehler als Wiederholungskarten anlegen. */
async function addExplanationsAndCards(gameId: string, myColor: 'w' | 'b' | null, fens: string[], uci: string[], a: StoredAnalysis) {
  const g = await getGame(gameId);
  const label = g ? `${g.white} – ${g.black}, ${g.date}` : 'Partie';
  for (const m of a.moves ?? []) {
    if (m.cls !== 'mistake' && m.cls !== 'blunder') continue;
    const before = a.positions[m.ply]!;
    const after = a.positions[m.ply + 1]!;
    if (!before.best) continue;
    const ex = explainMistake({
      fen: fens[m.ply]!,
      played: uci[m.ply]!,
      best: before.best,
      bestPv: before.pv,
      replyPv: after.pv,
      before: before.score,
      after: after.score,
    });
    m.explanation = ex.text;
    m.motifs = ex.motifs;
    if (myColor && m.color === myColor) {
      const id = `mistake:${gameId}:${m.ply}`;
      if (!(await getCard(id))) {
        const moveNo = Math.floor(m.ply / 2) + 1;
        await putCard({
          id,
          card: newCard(),
          source: { type: 'mistake', gameId, ply: m.ply },
          added: Date.now(),
          tags: ex.motifs,
          data: {
            fen: fens[m.ply]!,
            best: before.best,
            bestPv: before.pv,
            played: uci[m.ply]!,
            playedSan: sanDe(m.san),
            bestScore: before.score,
            explanation: ex.text,
            motifs: ex.motifs,
            label: `${label} · Zug ${moveNo}${m.color === 'b' ? ' (' + colorName('b') + ')' : ''}`,
            cls: m.cls,
          },
        });
      }
    }
  }
}

export const runner = new Runner();

export type { MoveReport, Score };
