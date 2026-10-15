import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board, type Arrow, type Highlight } from '../../board/Board';
import { formatLine, tryMove } from '../../chess/util';
import type { LineTask as LT } from '../../course/types';
import type { SessionTask, TaskResult } from '../../course/session';

type Phase = 'show' | 'play' | 'opp' | 'done';

/** Eröffnungslinie: (geführt) vorführen, dann selbst nachspielen. Gegnerzüge kommen automatisch. */
export function LineTask(props: { st: SessionTask; coords: boolean; onDone: (r: TaskResult) => void }) {
  const task = props.st.task as LT;
  const [fen, setFen] = useState(new Chess().fen());
  const [last, setLast] = useState<[string, string] | null>(null);
  const [ply, setPly] = useState(0);
  const [phase, setPhase] = useState<Phase>(task.mode === 'guided' ? 'show' : 'opp');
  const [errors, setErrors] = useState(0);
  const [hint, setHint] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const t0 = useRef(Date.now());
  const maxHint = useRef(0);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const isMine = (p: number) => (p % 2 === 0) === (task.color === 'w');
  const sanLine = (() => {
    const c = new Chess();
    return task.uci.map((u) => tryMove(c, u)!.san);
  })();

  // Vorführen (geführter Modus) bzw. erster Gegnerzug
  useEffect(() => {
    if (phase === 'show') {
      let cur = new Chess();
      const timers = task.uci.map((u, i) =>
        setTimeout(() => {
          if (!alive.current) return;
          const m = tryMove(cur, u)!;
          setFen(cur.fen());
          setLast([m.from, m.to]);
          if (i === task.uci.length - 1) {
            setTimeout(() => {
              if (!alive.current) return;
              cur = new Chess();
              setFen(cur.fen());
              setLast(null);
              setPly(0);
              setMsg('Jetzt du – die Pfeile zeigen deine Züge.');
              advance(0, cur.fen());
            }, 900);
          }
        }, 500 + i * 650),
      );
      return () => timers.forEach(clearTimeout);
    }
    if (phase === 'opp' && ply === 0) advance(0, new Chess().fen());
    return undefined;
  }, []);

  /** Spielt Gegnerzüge automatisch, bis der Spieler dran ist. */
  const advance = (p: number, f: string) => {
    if (p >= task.uci.length) {
      setPhase('done');
      setMsg(null);
      return;
    }
    if (isMine(p)) {
      setPhase('play');
      return;
    }
    setPhase('opp');
    setTimeout(() => {
      if (!alive.current) return;
      const c = new Chess(f);
      const m = tryMove(c, task.uci[p]!)!;
      setFen(c.fen());
      setLast([m.from, m.to]);
      setPly(p + 1);
      advance(p + 1, c.fen());
    }, 450);
  };

  const onMove = (uci: string) => {
    if (phase !== 'play') return;
    const expected = task.uci[ply]!;
    if (uci !== expected) {
      setErrors((e) => e + 1);
      setWrong(uci.slice(2, 4));
      setMsg(`Nicht deine Linie. Gesucht ist ${formatLine(fen, [sanLine[ply]!])}.`);
      setHint(3);
      return;
    }
    setWrong(null);
    setMsg(null);
    setHint(0);
    const c = new Chess(fen);
    const m = tryMove(c, uci)!;
    setFen(c.fen());
    setLast([m.from, m.to]);
    setPly(ply + 1);
    advance(ply + 1, c.fen());
  };

  const expected = phase === 'play' ? task.uci[ply] : undefined;
  const arrows: Arrow[] = [];
  const marks: Highlight[] = [];
  if (expected && (task.mode === 'guided' || hint >= 3)) arrows.push({ from: expected.slice(0, 2), to: expected.slice(2, 4), color: wrong ? 'green' : 'gold' });
  else if (expected && hint >= 2) marks.push({ square: expected.slice(0, 2), kind: 'hint' });
  if (wrong) marks.push({ square: wrong, kind: 'bad' });

  return (
    <>
      <div class="board-wrap">
        <Board
          fen={fen}
          orientation={task.color}
          movable={phase === 'play' ? task.color : null}
          onMove={onMove}
          lastMove={last}
          animate
          highlights={marks}
          arrows={arrows}
          coords={props.coords}
        />
      </div>
      <div class="prompt">
        {task.name}
        <div class="small muted mono">{formatLine(new Chess().fen(), sanLine.slice(0, phase === 'show' ? sanLine.length : ply))}</div>
      </div>
      {phase === 'show' && <div class="feedback">Schau zu – danach spielst du die Linie nach.</div>}
      {msg && <div class={`feedback ${wrong ? 'bad' : ''}`}>{msg}</div>}
      {phase === 'done' && (
        <div class={`feedback ${errors === 0 ? 'ok' : ''}`}>
          {errors === 0 ? 'Fehlerfrei!' : `Geschafft – mit ${errors} ${errors === 1 ? 'Fehler' : 'Fehlern'}.`}
        </div>
      )}
      <div class="session-actions">
        {phase === 'done' ? (
          <button
            class="btn primary block"
            onClick={() =>
              props.onDone({
                correct: errors === 0,
                hint: task.mode === 'guided' ? 0 : maxHint.current,
                seconds: (Date.now() - t0.current) / 1000,
              })
            }
          >
            Weiter
          </button>
        ) : (
          <button
            class="btn"
            disabled={phase !== 'play' || task.mode === 'guided'}
            onClick={() => {
              const h = Math.min(3, hint + 2);
              setHint(h);
              maxHint.current = Math.max(maxHint.current, h);
            }}
          >
            Hinweis
          </button>
        )}
      </div>
    </>
  );
}
