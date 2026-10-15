import { useMemo, useRef, useState } from 'preact/hooks';
import { Board, type Arrow, type Highlight } from '../../board/Board';
import { forceTurn, freeChess, reachPlan, reachSolved } from '../../course/reach';
import type { ReachTask as RT } from '../../course/types';
import type { SessionTask, TaskResult } from '../../course/session';

/** „Bring die Figur nach …" / „Schlag alle Bauern" – nur Weiss zieht, in möglichst wenigen Zügen. */
export function ReachTask(props: { st: SessionTask; coords: boolean; onDone: (r: TaskResult) => void }) {
  const task = props.st.task as RT;
  const start = useMemo(() => forceTurn(task.fen, 'w'), [task]);
  const optimal = useMemo(() => reachPlan(task)?.length ?? 99, [task]);
  const [fen, setFen] = useState(start);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [moves, setMoves] = useState(0);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(props.st.guided ? 3 : 0);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string; expl?: string } | null>(null);
  const [done, setDone] = useState(false);
  const maxHint = useRef(0);
  const t0 = useRef(Date.now());

  const whiteSquares = freeChess(fen)
    .board()
    .flat()
    .filter((p) => p && p.color === 'w')
    .map((p) => p!.square as string);

  const plan = useMemo(() => (done ? null : reachPlan({ ...task, fen })), [fen, done]);
  const nextMove = plan?.[0];

  const onMove = (uci: string) => {
    if (done) return;
    const c = freeChess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' });
    const after = forceTurn(c.fen(), 'w');
    const n = moves + 1;
    setFen(after);
    setLast([m.from, m.to]);
    setMoves(n);
    if (reachSolved(task, after)) {
      const ok = n <= optimal && !failed;
      setDone(true);
      setMsg({
        kind: ok ? 'ok' : 'info',
        text: ok ? `Richtig – in ${n} ${n === 1 ? 'Zug' : 'Zügen'}!` : `Geschafft in ${n} Zügen. Es geht in ${optimal}.`,
        expl: task.explain,
      });
      return;
    }
    if (n >= optimal) {
      setFailed(true);
      setMsg({ kind: 'bad', text: `Das geht in ${optimal} ${optimal === 1 ? 'Zug' : 'Zügen'}. Versuch es nochmal.` });
      setTimeout(() => {
        setFen(start);
        setLast(null);
        setMoves(0);
      }, 900);
    }
  };

  const nextHint = () => {
    const h = Math.min(4, hint + 1);
    setHint(h);
    maxHint.current = Math.max(maxHint.current, h);
    if (h === 1) setMsg({ kind: 'info', text: task.explain });
    if (h === 4 && plan) {
      // Lösung vorspielen
      let cur = fen;
      plan.forEach((u, i) =>
        setTimeout(() => {
          const c = freeChess(cur);
          const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
          cur = forceTurn(c.fen(), 'w');
          setFen(cur);
          setLast([m.from, m.to]);
          if (i === plan.length - 1) {
            setDone(true);
            setFailed(true);
            setMsg({ kind: 'info', text: 'Die Lösung:', expl: task.explain });
          }
        }, 300 + i * 650),
      );
    }
  };

  const marks: Highlight[] = [];
  if (task.target) marks.push({ square: task.target, kind: 'target' });
  const arrows: Arrow[] = [];
  if (!done && nextMove) {
    if (hint >= 2) marks.push({ square: nextMove.slice(0, 2), kind: 'hint' });
    if (hint >= 3) arrows.push({ from: nextMove.slice(0, 2), to: nextMove.slice(2, 4) });
  }

  return (
    <>
      <div class="board-wrap">
        <Board
          fen={fen}
          movable={done ? null : 'w'}
          onlyFrom={whiteSquares}
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
          Züge: <span class="num">{moves}</span> / <span class="num">{optimal}</span>
        </div>
      </div>
      {msg && (
        <div class={`feedback ${msg.kind === 'ok' ? 'ok' : msg.kind === 'bad' ? 'bad' : ''}`} role="status">
          {msg.text}
          {msg.expl && <span class="expl">{msg.expl}</span>}
        </div>
      )}
      <div class="session-actions">
        {done ? (
          <button
            class="btn primary block"
            onClick={() =>
              props.onDone({
                correct: !failed && moves <= optimal,
                hint: props.st.guided ? 0 : maxHint.current,
                seconds: (Date.now() - t0.current) / 1000,
              })
            }
          >
            Weiter
          </button>
        ) : (
          <>
            <button class="btn" disabled={hint >= 4} onClick={nextHint}>
              Hinweis {Math.min(hint + 1, 4)}/4
            </button>
            <button
              class="btn"
              onClick={() => {
                setFen(start);
                setLast(null);
                if (moves > 0) setFailed(true);
                setMoves(0);
              }}
            >
              Neu
            </button>
          </>
        )}
      </div>
    </>
  );
}
