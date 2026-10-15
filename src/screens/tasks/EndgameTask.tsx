import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import { Board, type Arrow, type Highlight } from '../../board/Board';
import { engine } from '../../engine/engine';
import { tryMove } from '../../chess/util';
import type { EndgameTask as ET } from '../../course/types';
import type { SessionTask, TaskResult } from '../../course/session';

type Status = 'loading' | 'play' | 'thinking' | 'won' | 'lost';

/** Mini-Endspiel gegen Stockfish: Matt setzen oder sicher umwandeln. */
export function EndgameTask(props: { st: SessionTask; coords: boolean; onDone: (r: TaskResult) => void }) {
  const task = props.st.task as ET;
  const [fen, setFen] = useState(task.fen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [moves, setMoves] = useState(0);
  const [restarted, setRestarted] = useState(false);
  const [hint, setHint] = useState(0);
  const [hintMove, setHintMove] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string; expl?: string } | null>(null);
  const t0 = useRef(Date.now());
  const maxHint = useRef(0);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  useEffect(() => {
    engine
      .warmUp()
      .then(() => alive.current && setStatus('play'))
      .catch(() => {
        if (!alive.current) return;
        setStatus('lost');
        setMsg({ kind: 'bad', text: 'Die Engine konnte nicht geladen werden. Endspiele brauchen Stockfish.' });
      });
  }, []);

  const lose = (text: string) => {
    setStatus('lost');
    setMsg({ kind: 'bad', text, expl: task.explain });
  };

  const checkAfterMine = (c: Chess, m: { promotion?: string; to: string }, n: number): boolean => {
    if (c.isCheckmate()) {
      setStatus('won');
      setMsg({ kind: 'ok', text: `Matt in ${n} ${n === 1 ? 'Zug' : 'Zügen'}!`, expl: task.explain });
      return true;
    }
    if (c.isStalemate()) {
      lose('Patt! Der gegnerische König hat keinen Zug mehr, steht aber nicht im Schach – Remis.');
      return true;
    }
    if (c.isDraw()) {
      lose('Remis (zu wenig Material oder Stellungswiederholung).');
      return true;
    }
    if (task.goal === 'promote' && m.promotion) {
      const attacked = c.attackers(m.to as Square, 'b').length > 0;
      const defended = c.attackers(m.to as Square, 'w').length > 0;
      if (attacked && !defended) {
        lose('Umgewandelt – aber die neue Figur geht sofort verloren.');
      } else {
        setStatus('won');
        setMsg({ kind: 'ok', text: 'Sicher umgewandelt!', expl: task.explain });
      }
      return true;
    }
    if (n >= task.maxMoves) {
      lose(`Die ${task.maxMoves} Züge sind um.`);
      return true;
    }
    return false;
  };

  const onMove = async (uci: string) => {
    if (status !== 'play') return;
    const c = new Chess(fen);
    const m = tryMove(c, uci);
    if (!m) return;
    const n = moves + 1;
    setFen(c.fen());
    setLast([m.from, m.to]);
    setMoves(n);
    setHintMove(null);
    setMsg(null);
    if (checkAfterMine(c, m, n)) return;
    setStatus('thinking');
    try {
      const r = await engine.search(c.fen(), { depth: 14, movetime: 450 });
      if (!alive.current || !r.best) return;
      const reply = tryMove(c, r.best);
      if (!reply) return;
      setFen(c.fen());
      setLast([reply.from, reply.to]);
      const whiteMaterial = c
        .board()
        .flat()
        .filter((p) => p && p.color === 'w' && p.type !== 'k');
      if (whiteMaterial.length === 0) return lose('Dein Material ist weg – so geht das Endspiel nicht mehr zu gewinnen.');
      if (task.goal === 'promote' && !whiteMaterial.some((p) => p!.type === 'p' || p!.type === 'q')) return lose('Der Bauer ist verloren.');
      if (c.isDraw() || c.isStalemate()) return lose('Remis.');
      setStatus('play');
    } catch {
      setStatus('play');
    }
  };

  const restart = () => {
    setFen(task.fen);
    setLast(null);
    setMoves(0);
    setRestarted(true);
    setHintMove(null);
    setMsg(null);
    setStatus('play');
  };

  const nextHint = async () => {
    const h = Math.min(4, hint + 1);
    setHint(h);
    maxHint.current = Math.max(maxHint.current, h);
    if (h === 1) {
      setMsg({ kind: 'info', text: task.idea });
      return;
    }
    const r = await engine.search(fen, { depth: 16, movetime: 800 }).catch(() => null);
    if (!r?.best || !alive.current) return;
    if (h === 4) {
      setHint(1);
      await onMove(r.best);
    } else setHintMove(r.best);
  };

  const marks: Highlight[] = [];
  const arrows: Arrow[] = [];
  if (hintMove && status === 'play') {
    marks.push({ square: hintMove.slice(0, 2), kind: 'hint' });
    if (hint >= 3) arrows.push({ from: hintMove.slice(0, 2), to: hintMove.slice(2, 4) });
  }

  const over = status === 'won' || status === 'lost';
  return (
    <>
      <div class="board-wrap">
        <Board
          fen={fen}
          movable={status === 'play' ? 'w' : null}
          onMove={onMove}
          lastMove={last}
          animate
          highlights={marks}
          arrows={arrows}
          coords={props.coords}
        />
      </div>
      <div class="prompt">
        {task.prompt}
        <div class="small muted">
          {status === 'loading' ? 'Engine wird geladen …' : status === 'thinking' ? 'Stockfish überlegt …' : 'Du spielst Weiss gegen Stockfish.'}{' '}
          Zug <span class="num">{moves}</span>/<span class="num">{task.maxMoves}</span>
        </div>
      </div>
      {msg && (
        <div class={`feedback ${msg.kind === 'ok' ? 'ok' : msg.kind === 'bad' ? 'bad' : ''}`} role="status">
          {msg.text}
          {msg.expl && <span class="expl">{msg.expl}</span>}
        </div>
      )}
      <div class="session-actions">
        {status === 'won' ? (
          <button
            class="btn primary block"
            onClick={() =>
              props.onDone({ correct: !restarted, hint: maxHint.current, seconds: (Date.now() - t0.current) / 1000 })
            }
          >
            Weiter
          </button>
        ) : over ? (
          <>
            <button class="btn primary" onClick={restart}>
              Nochmal
            </button>
            <button
              class="btn"
              onClick={() => props.onDone({ correct: false, hint: 4, seconds: (Date.now() - t0.current) / 1000, gaveUp: true })}
            >
              Überspringen
            </button>
          </>
        ) : (
          <>
            <button class="btn" disabled={status !== 'play'} onClick={nextHint}>
              Hinweis {hint >= 4 ? 4 : hint + 1}/4
            </button>
            <button class="btn" disabled={status === 'loading'} onClick={restart}>
              Neu starten
            </button>
          </>
        )}
      </div>
    </>
  );
}
