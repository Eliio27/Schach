import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board, type Arrow, type Highlight } from '../../board/Board';
import { colorName, sideToMove, tryMove } from '../../chess/util';
import { engine } from '../../engine/engine';
import { explainPuzzle, explainRefutation } from '../../analysis/explain';
import { winLoss } from '../../analysis/classify';
import type { SessionTask, TaskResult } from '../../course/session';
import type { Score } from '../../analysis/classify';

interface Normalized {
  startFen: string;
  setup?: string;
  solution: string[];
  alts: string[];
  acceptMate: boolean;
  /** Bei Fehler-Aufgaben: gleichwertige Züge per Engine akzeptieren. */
  engineAccept?: { bestScore: Score };
  success: () => string;
  prompt: string;
  sub?: string;
}

function normalize(st: SessionTask, showPlayed: boolean): Normalized {
  const t = st.task;
  if (t.kind === 'puzzle') {
    const p = t.puzzle;
    const c = new Chess(p.fen);
    tryMove(c, p.moves[0]!);
    const me = c.turn();
    const isMate = p.tags.includes('mate');
    return {
      startFen: p.fen,
      setup: p.moves[0],
      solution: p.moves.slice(1),
      alts: [],
      acceptMate: isMate,
      success: () => explainPuzzle(c.fen(), p.moves.slice(1), p.tags).text,
      prompt: isMate ? `${colorName(me)} am Zug – setze matt.` : `${colorName(me)} am Zug – finde den besten Zug.`,
      sub: `Puzzle ${p.rating}`,
    };
  }
  if (t.kind === 'custom') {
    return {
      startFen: t.fen,
      setup: t.setup,
      solution: t.solution,
      alts: t.alts ?? [],
      acceptMate: t.accept === 'mate',
      success: () => t.explain,
      prompt: t.prompt,
    };
  }
  if (t.kind === 'mistake') {
    const d = t.data;
    return {
      startFen: d.fen,
      solution: [d.best],
      alts: [],
      acceptMate: false,
      engineAccept: { bestScore: d.bestScore },
      success: () => d.explanation,
      prompt: `${colorName(sideToMove(d.fen))} am Zug – finde den besseren Zug.`,
      sub: showPlayed ? `${d.label} · gespielt: ${d.playedSan}` : d.label,
    };
  }
  throw new Error('Kein Puzzle-Task');
}

type Phase = 'intro' | 'play' | 'checking' | 'wrong' | 'opp' | 'done';

export function PuzzleTask(props: {
  st: SessionTask;
  showPlayed: boolean;
  coords: boolean;
  onDone: (r: TaskResult) => void;
}) {
  const n = useMemo(() => normalize(props.st, props.showPlayed), [props.st]);
  const startPos = useMemo(() => {
    if (!n.setup) return { fen: n.startFen, last: null as [string, string] | null };
    const c = new Chess(n.startFen);
    tryMove(c, n.setup);
    return { fen: c.fen(), last: [n.setup.slice(0, 2), n.setup.slice(2, 4)] as [string, string] };
  }, [n]);
  const myColor = sideToMove(startPos.fen);

  const [fen, setFen] = useState(n.setup ? n.startFen : startPos.fen);
  const [last, setLast] = useState<[string, string] | null>(null);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>(n.setup ? 'intro' : 'play');
  const [hint, setHint] = useState(props.st.guided ? 3 : 0);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string; expl?: string } | null>(null);
  const [marks, setMarks] = useState<Highlight[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const t0 = useRef(Date.now());
  const maxHint = useRef(0);
  const beforeWrong = useRef<{ fen: string; last: [string, string] | null } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  // Gegnerzug zu Beginn animieren
  useEffect(() => {
    engine.warmUp().catch(() => undefined);
    if (phase !== 'intro') return;
    const id = setTimeout(() => {
      setFen(startPos.fen);
      setLast(startPos.last);
      setPhase('play');
      t0.current = Date.now();
    }, 550);
    return () => clearTimeout(id);
  }, []);

  const expected = n.solution[step];
  const hintMarks: Highlight[] = [];
  if (phase === 'play' && expected) {
    if (hint >= 2) hintMarks.push({ square: expected.slice(0, 2), kind: 'hint' });
    if (hint >= 3) hintMarks.push({ square: expected.slice(2, 4), kind: 'target' });
  }

  const finish = (correct: boolean, gaveUp = false) => {
    setPhase('done');
    const seconds = (Date.now() - t0.current) / 1000;
    const result: TaskResult = {
      correct: correct && !failed,
      hint: props.st.guided ? 0 : maxHint.current,
      seconds,
      gaveUp,
    };
    setMsg({
      kind: result.correct ? 'ok' : 'info',
      text: result.correct ? 'Richtig!' : gaveUp ? 'Die Lösung:' : 'Gelöst – im zweiten Anlauf.',
      expl: n.success(),
    });
    pending.current = result;
  };
  const pending = useRef<TaskResult | null>(null);

  const playOpponent = (afterFen: string, nextStep: number) => {
    const reply = n.solution[nextStep];
    if (!reply) {
      finish(true);
      return;
    }
    setPhase('opp');
    setTimeout(() => {
      if (!alive.current) return;
      const c = new Chess(afterFen);
      const m = tryMove(c, reply);
      if (!m) return finish(true);
      setFen(c.fen());
      setLast([m.from, m.to]);
      setStep(nextStep + 1);
      if (nextStep + 1 >= n.solution.length) finish(true);
      else setPhase('play');
    }, 420);
  };

  const onMove = async (uci: string) => {
    if (phase !== 'play') return;
    const c = new Chess(fen);
    const m = tryMove(c, uci);
    if (!m) return;
    setMarks([]);
    setArrows([]);
    setMsg(null);
    const exact = uci === expected;
    const altOk = step === 0 && n.alts.includes(uci);
    const mateOk = n.acceptMate && c.isCheckmate();
    if (exact || altOk || mateOk) {
      setFen(c.fen());
      setLast([m.from, m.to]);
      setMarks([{ square: m.to, kind: 'good' }]);
      if (mateOk || altOk || step + 1 >= n.solution.length) finish(true);
      else playOpponent(c.fen(), step + 1);
      return;
    }
    // Fehler-Aufgaben: gleichwertige Züge per Engine prüfen
    if (n.engineAccept) {
      setFen(c.fen());
      setLast([m.from, m.to]);
      setPhase('checking');
      setMsg({ kind: 'info', text: 'Prüfe deinen Zug …' });
      try {
        const r = await engine.search(c.fen(), { depth: 12, movetime: 1200 });
        if (!alive.current) return;
        const loss = winLoss(n.engineAccept.bestScore, r.score, myColor);
        if (loss < 3) {
          setMarks([{ square: m.to, kind: 'good' }]);
          finish(true);
          return;
        }
        return showWrong(fen, uci, c.fen(), [m.from, m.to], r.pv.length ? r.pv : r.best ? [r.best] : [], r.score);
      } catch {
        return showWrong(fen, uci, c.fen(), [m.from, m.to], [], null);
      }
    }
    setFen(c.fen());
    setLast([m.from, m.to]);
    setPhase('checking');
    try {
      const r = await engine.search(c.fen(), { depth: 10, movetime: 800 });
      if (!alive.current) return;
      showWrong(fen, uci, c.fen(), [m.from, m.to], r.pv.length ? r.pv : r.best ? [r.best] : [], r.score);
    } catch {
      showWrong(fen, uci, c.fen(), [m.from, m.to], [], null);
    }
  };

  const showWrong = (before: string, uci: string, after: string, mv: [string, string], pv: string[], score: Score | null) => {
    setFailed(true);
    beforeWrong.current = { fen: before, last };
    setPhase('wrong');
    if (pv.length > 0 && score) {
      const c = new Chess(after);
      const reply = tryMove(c, pv[0]!);
      const text = explainRefutation(before, uci, after, pv, score);
      setMarks([{ square: mv[1], kind: 'bad' }]);
      setMsg({ kind: 'bad', text: 'Nicht ganz.', expl: text });
      if (reply) {
        setTimeout(() => {
          if (!alive.current) return;
          setFen(c.fen());
          setLast([reply.from, reply.to]);
        }, 450);
      }
    } else {
      setMarks([{ square: mv[1], kind: 'bad' }]);
      setMsg({ kind: 'bad', text: 'Das ist nicht der gesuchte Zug.' });
    }
  };

  const retry = () => {
    const b = beforeWrong.current;
    if (!b) return;
    setFen(b.fen);
    setLast(b.last);
    setMarks([]);
    setArrows([]);
    setMsg(null);
    setPhase('play');
  };

  const nextHint = () => {
    if (phase === 'wrong') retry();
    const h = Math.min(4, hint + 1);
    setHint(h);
    maxHint.current = Math.max(maxHint.current, h);
    if (h === 1) setMsg({ kind: 'info', text: props.st.hint1 });
    if (h === 4) showSolution();
  };

  const showSolution = () => {
    const b = phase === 'wrong' && beforeWrong.current ? beforeWrong.current.fen : fen;
    const rest = n.solution.slice(step);
    setPhase('opp');
    let cur = b;
    rest.forEach((u, i) => {
      setTimeout(() => {
        if (!alive.current) return;
        const c = new Chess(cur);
        const m = tryMove(c, u);
        if (!m) return;
        cur = c.fen();
        setFen(cur);
        setLast([m.from, m.to]);
        if (i === 0) setArrows([{ from: m.from, to: m.to, color: 'green' }]);
        if (i === rest.length - 1) finish(false, true);
      }, 300 + i * 700);
    });
    if (rest.length === 0) finish(false, true);
  };

  const guidedArrow: Arrow[] = props.st.guided && phase === 'play' && expected ? [{ from: expected.slice(0, 2), to: expected.slice(2, 4), color: 'gold' }] : [];

  return (
    <>
      <div class="board-wrap">
        <Board
          fen={fen}
          orientation={myColor}
          movable={phase === 'play' ? myColor : null}
          onMove={onMove}
          lastMove={last}
          animate
          highlights={[...marks, ...hintMarks]}
          arrows={[...arrows, ...guidedArrow]}
          coords={props.coords}
        />
      </div>
      <div class="prompt">
        {props.st.guided && phase === 'play' ? 'Geführt: ' : ''}
        {n.prompt}
        {n.sub && <div class="small muted">{n.sub}</div>}
      </div>
      {msg && (
        <div class={`feedback ${msg.kind === 'ok' ? 'ok' : msg.kind === 'bad' ? 'bad' : ''}`} role="status">
          {msg.text}
          {msg.expl && <span class="expl">{msg.expl}</span>}
        </div>
      )}
      <div class="session-actions">
        {phase === 'done' ? (
          <button class="btn primary block" onClick={() => pending.current && props.onDone(pending.current)}>
            Weiter
          </button>
        ) : (
          <>
            <button class="btn" disabled={phase === 'opp' || phase === 'checking' || phase === 'intro' || hint >= 4} onClick={nextHint}>
              Hinweis {Math.min(hint + 1, 4)}/4
            </button>
            {phase === 'wrong' && (
              <button class="btn primary" onClick={retry}>
                Nochmal
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
