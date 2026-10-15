import { useEffect, useRef, useState } from 'preact/hooks';
import { Board } from '../board/Board';
import { forceTurn, freeChess } from '../course/reach';
import { finishLesson, recordResult, type SessionPlan, type SessionTask, type TaskResult } from '../course/session';
import type { Concept } from '../course/types';
import type { Settings } from '../db/db';
import { PuzzleTask } from './tasks/PuzzleTask';
import { ReachTask } from './tasks/ReachTask';
import { EndgameTask } from './tasks/EndgameTask';
import { LineTask } from './tasks/LineTask';
import { IconClose } from '../ui/icons';

/** Konzeptkarte mit animierter Beispielstellung (Züge beider Farben werden „frei" gespielt). */
export function ConceptCard(props: { concept: Concept; coords: boolean; onContinue: () => void }) {
  const ex = props.concept.example;
  const [fen, setFen] = useState(ex?.fen ?? '');
  const [last, setLast] = useState<[string, string] | null>(null);
  useEffect(() => {
    if (!ex) return;
    let cur = ex.fen;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      cur = ex.fen;
      setFen(cur);
      setLast(null);
      timers = ex.moves.map((u, i) =>
        setTimeout(() => {
          let c = freeChess(cur);
          const piece = c.get(u.slice(0, 2) as never);
          if (piece && piece.color !== c.turn()) c = freeChess(forceTurn(cur, piece.color));
          c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
          cur = c.fen();
          setFen(cur);
          setLast([u.slice(0, 2), u.slice(2, 4)]);
          if (i === ex.moves.length - 1) timers.push(setTimeout(run, 2600));
        }, 900 + i * 900),
      );
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [ex]);
  return (
    <>
      {ex && (
        <div class="board-wrap">
          <Board fen={fen} movable={null} lastMove={last} animate coords={props.coords} />
        </div>
      )}
      <div class="concept">
        <h2>{props.concept.title}</h2>
        {props.concept.text.map((t) => (
          <p key={t}>{t}</p>
        ))}
        {ex?.caption && <p class="muted small">{ex.caption}</p>}
      </div>
      <div class="session-actions">
        <button class="btn primary block" onClick={props.onContinue}>
          Verstanden
        </button>
      </div>
    </>
  );
}

function TaskView(props: { st: SessionTask; settings: Settings; onDone: (r: TaskResult) => void }) {
  const t = props.st.task;
  const common = { st: props.st, coords: props.settings.coords, onDone: props.onDone };
  if (t.kind === 'reach') return <ReachTask {...common} />;
  if (t.kind === 'endgame') return <EndgameTask {...common} />;
  if (t.kind === 'line') return <LineTask {...common} />;
  return <PuzzleTask {...common} showPlayed={props.settings.showPlayedMove} />;
}

/** Spielt eine Sitzung (Lektion, Test, Wiederholung, Einstufung) ab. */
export function Session(props: { plan: SessionPlan; settings: Settings; onClose: (changed: boolean) => void }) {
  const { plan } = props;
  const [showConcept, setShowConcept] = useState(!!plan.concept);
  const [tasks, setTasks] = useState<SessionTask[]>(() => {
    if (plan.next) {
      const first = plan.next([]);
      return first ? [first] : [];
    }
    return plan.tasks;
  });
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<TaskResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const changed = useRef(false);
  const total = plan.next ? 16 : tasks.length;

  const onDone = async (r: TaskResult) => {
    const st = tasks[index]!;
    changed.current = true;
    if (plan.kind !== 'placement') await recordResult(plan, st, r).catch(console.error);
    const res = [...results, r];
    setResults(res);
    let list = tasks;
    if (plan.next) {
      const n = plan.next(res);
      if (n) list = [...tasks, n];
      setTasks(list);
    }
    if (index + 1 < list.length) {
      setIndex(index + 1);
    } else {
      if (plan.kind === 'lesson' || plan.kind === 'endgame' || plan.kind === 'lines') await finishLesson(plan);
      const s = plan.finish ? await plan.finish(res) : null;
      setSummary(s);
      setFinished(true);
    }
  };

  const firstTry = results.filter((r) => r.correct && r.hint === 0).length;
  const progress = finished ? 1 : total > 0 ? index / total : 0;

  return (
    <div class="session" role="dialog" aria-label={plan.title}>
      <div class="session-head">
        <div class="progress" aria-label="Fortschritt">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <span class="label num">
          {Math.min(index + 1, total)}/{total}
        </span>
        <button class="iconbtn" aria-label="Schliessen" onClick={() => props.onClose(changed.current)}>
          <IconClose />
        </button>
      </div>
      <div class="session-body">
        {finished ? (
          <div class="concept">
            <h2>{plan.kind === 'placement' ? 'Einstufung abgeschlossen' : 'Geschafft!'}</h2>
            {results.length > 0 && (
              <p>
                <span class="num">{firstTry}</span> von <span class="num">{results.length}</span> beim ersten Versuch ohne Hinweis gelöst.
              </p>
            )}
            {summary && <p>{summary}</p>}
            {results.some((r) => !r.correct || r.hint >= 2) && plan.kind !== 'placement' && (
              <p class="muted small">Die schwierigen Aufgaben kommen in deine Wiederholung.</p>
            )}
            {tasks.length === 0 && <p class="muted">Für diese Auswahl gibt es gerade keine Aufgaben.</p>}
            <div class="session-actions" style={{ padding: '1rem 0' }}>
              <button class="btn primary block" onClick={() => props.onClose(true)}>
                Fertig
              </button>
            </div>
          </div>
        ) : showConcept && plan.concept ? (
          <ConceptCard concept={plan.concept} coords={props.settings.coords} onContinue={() => setShowConcept(false)} />
        ) : tasks.length === 0 ? (
          <div class="concept">
            <p class="muted">Keine Aufgaben gefunden. Sind die Puzzle-Daten geladen?</p>
            <button class="btn block" onClick={() => props.onClose(false)}>
              Zurück
            </button>
          </div>
        ) : (
          <TaskView key={index} st={tasks[index]!} settings={props.settings} onDone={onDone} />
        )}
      </div>
    </div>
  );
}
