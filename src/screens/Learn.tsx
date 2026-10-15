import { useState } from 'preact/hooks';
import type { AppData } from '../app';
import { lessonCount, hasTest, SECTIONS, UNIT_BY_ID, unitsOfSection } from '../course/course';
import { buildLesson, buildPlacement, buildReview, buildTest, nextLesson, unitDone, type SessionPlan } from '../course/session';
import type { Unit } from '../course/types';

export function LearnScreen(props: { data: AppData; onStart: (p: SessionPlan) => void }) {
  const { data } = props;
  const ctx = { pool: data.pool, progress: data.progress, lines: data.lines };
  const next = nextLesson(data.progress);
  const nextUnit = next ? UNIT_BY_ID[next.unitId]! : null;
  const [open, setOpen] = useState<string | null>(next?.unitId ?? null);

  const startNext = () => {
    if (!next) return;
    props.onStart(next.lesson === 'test' ? buildTest(next.unitId, ctx) : buildLesson(next.unitId, next.lesson, ctx));
  };

  return (
    <>
      <section class="card hero">
        {data.due > 0 && (
          <p style={{ margin: '0 0 0.5rem' }}>
            Heute fällig: <b class="num">{data.due}</b> {data.due === 1 ? 'Wiederholung' : 'Wiederholungen'}
          </p>
        )}
        {nextUnit ? (
          <p class="muted" style={{ margin: '0 0 0.75rem' }}>
            Weiter: <b style={{ color: 'var(--text)' }}>{nextUnit.id} {nextUnit.title}</b>,{' '}
            {next!.lesson === 'test' ? 'Test' : `Lektion ${(next!.lesson as number) + 1}`}
          </p>
        ) : (
          <p class="muted">Alle Units im Hauptpfad sind erledigt. Stark!</p>
        )}
        <div class="btn-row">
          {data.due > 0 && (
            <button class="btn" onClick={async () => props.onStart(await buildReview(ctx))}>
              Wiederholen
            </button>
          )}
          {nextUnit && (
            <button class="btn primary" onClick={startNext}>
              {data.due > 0 ? 'Lektion' : 'Los geht\'s'}
            </button>
          )}
        </div>
        {!data.settings.placementDone && (
          <p class="small muted" style={{ margin: '0.75rem 0 0' }}>
            Grundlagen schon bekannt?{' '}
            <a href="#" onClick={(e) => (e.preventDefault(), props.onStart(buildPlacement(ctx, data.settings.tacticsRating)))}>
              Einstufungstest machen
            </a>{' '}
            (ca. 6 Minuten)
          </p>
        )}
      </section>

      {SECTIONS.map((s) => {
        const units = unitsOfSection(s.id);
        const done = units.filter((u) => unitDone(u, data.progress[u.id])).length;
        return (
          <section key={s.id}>
            <h2 class="section-title">
              Section {s.id} · {s.title} <span class="num" style={{ float: 'right' }}>{done}/{units.length}</span>
            </h2>
            <div class="card" style={{ padding: '0 1rem' }}>
              <p class="small muted" style={{ margin: '0.75rem 0 0.25rem' }}>
                {s.intro} <span class="num">{s.band}</span>
              </p>
              <ul class="list">
                {units.map((u) => (
                  <UnitRow
                    key={u.id}
                    u={u}
                    data={data}
                    active={next?.unitId === u.id}
                    open={open === u.id}
                    toggle={() => setOpen(open === u.id ? null : u.id)}
                    onStart={props.onStart}
                  />
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </>
  );
}

function UnitRow(props: {
  u: Unit;
  data: AppData;
  active: boolean;
  open: boolean;
  toggle: () => void;
  onStart: (p: SessionPlan) => void;
}) {
  const { u, data } = props;
  const p = data.progress[u.id];
  const n = lessonCount(u);
  const lessonsDone = p?.lessonsDone ?? 0;
  const done = unitDone(u, p);
  const skipped = p?.test === 'skipped';
  const pct = done ? 1 : (lessonsDone + (p?.test === 'passed' ? 1 : 0)) / (n + (hasTest(u) ? 1 : 0));
  const ctx = { pool: data.pool, progress: data.progress, lines: data.lines };
  const iconClass = `unit-icon ${u.type === 'endgame' ? 'end' : ''} ${done && !skipped ? 'done' : skipped ? 'skipped' : props.active ? 'active' : ''}`;
  return (
    <li>
      <button class="row-btn" onClick={props.toggle} aria-expanded={props.open}>
        <span class={iconClass}>{done && !skipped ? '✓' : u.id.replace('-End', '')}</span>
        <span class="grow">
          <span class="title">{u.title}</span>
          <br />
          <span class="meta">{skipped ? 'übersprungen' : u.short}</span>
        </span>
        <span class="mini-progress progress">
          <i style={{ width: `${Math.round(pct * 100)}%` }} />
        </span>
      </button>
      {props.open && (
        <div style={{ padding: '0 0 0.875rem' }}>
          <div class="btn-row">
            {Array.from({ length: n }, (_, i) => (
              <button
                key={i}
                class={`btn ${i === lessonsDone && !done ? 'primary' : ''}`}
                style={{ flex: '1 1 30%' }}
                onClick={() => props.onStart(buildLesson(u.id, i, ctx))}
              >
                {u.type === 'endgame' ? `Endspiel ${i + 1}` : `Lektion ${i + 1}`}
                {i < lessonsDone ? ' ✓' : ''}
              </button>
            ))}
          </div>
          {hasTest(u) && (
            <button class={`btn block ${lessonsDone >= n && !done ? 'primary' : ''}`} style={{ marginTop: '0.625rem' }} onClick={() => props.onStart(buildTest(u.id, ctx))}>
              {p?.test === 'passed' ? 'Test ✓ (nochmal)' : lessonsDone < n ? 'Test – direkt überspringen' : 'Unit-Test'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
