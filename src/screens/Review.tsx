import { useEffect, useState } from 'preact/hooks';
import type { AppData } from '../app';
import { buildReview, cardStats, type SessionPlan } from '../course/session';
import { isDue, reviveCard } from '../srs/srs';
import type { StoredCard } from '../db/db';
import { MOTIF_DE, type Motif } from '../analysis/explain';
import { CLASS_DE } from '../analysis/classify';

export function ReviewScreen(props: { data: AppData; onStart: (p: SessionPlan) => void }) {
  const { data } = props;
  const ctx = { pool: data.pool, progress: data.progress, lines: data.lines };
  const [cards, setCards] = useState<StoredCard[] | null>(null);
  const [motif, setMotif] = useState<Motif | 'all'>('all');
  useEffect(() => {
    void cardStats().then(setCards);
  }, [data]);
  if (!cards) return <div class="empty">Lade …</div>;

  const now = new Date();
  const mistakes = cards.filter((c) => c.source.type === 'mistake');
  const dueAll = cards.filter((c) => isDue(reviveCard(c.card), now));
  const dueMistakes = mistakes.filter((c) => isDue(reviveCard(c.card), now));
  const motifCounts = new Map<Motif, number>();
  for (const c of mistakes) for (const m of c.data?.motifs ?? []) motifCounts.set(m, (motifCounts.get(m) ?? 0) + 1);
  const filtered = mistakes.filter((c) => motif === 'all' || c.data?.motifs.includes(motif));
  const nextDue = cards
    .map((c) => new Date(c.card.due).getTime())
    .filter((t) => t > now.getTime())
    .sort((a, b) => a - b)[0];

  return (
    <>
      <section class="card hero">
        <h2>Wiederholung</h2>
        {dueAll.length > 0 ? (
          <>
            <p class="muted" style={{ marginTop: 0 }}>
              <b class="num" style={{ color: 'var(--text)' }}>{dueAll.length}</b> Aufgaben sind fällig – gemischt, ohne Themenhinweis.
            </p>
            <button class="btn primary block" onClick={async () => props.onStart(await buildReview(ctx))}>
              Wiederholung starten
            </button>
          </>
        ) : (
          <p class="muted" style={{ margin: 0 }}>
            Nichts fällig. {nextDue ? `Nächste Wiederholung: ${new Date(nextDue).toLocaleString('de-CH', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.` : 'Falsch gelöste Aufgaben landen automatisch hier.'}
          </p>
        )}
        <p class="small muted" style={{ marginBottom: 0 }}>
          Im Plan: <span class="num">{cards.length}</span> Karten, davon <span class="num">{mistakes.length}</span> aus deinen Partien.
        </p>
      </section>

      <h2 class="section-title">Meine Fehler</h2>
      <section class="card">
        {mistakes.length === 0 ? (
          <p class="muted" style={{ margin: 0 }}>
            Noch keine. Importiere Partien im Tab <b>Analyse</b> – jeder Fehler und Patzer wird zur Aufgabe „Finde den besseren Zug".
          </p>
        ) : (
          <>
            <p class="small muted" style={{ marginTop: 0 }}>
              Fällig heute: <span class="num">{dueMistakes.length}</span> · Gesamt: <span class="num">{mistakes.length}</span>
            </p>
            <div>
              <button class="chip" aria-pressed={motif === 'all'} onClick={() => setMotif('all')}>
                Alle {mistakes.length}
              </button>
              {[...motifCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([m, n]) => (
                  <button key={m} class="chip" aria-pressed={motif === m} onClick={() => setMotif(m)}>
                    {MOTIF_DE[m]} {n}
                  </button>
                ))}
            </div>
            <button
              class="btn primary block"
              style={{ marginTop: '0.5rem' }}
              disabled={filtered.length === 0}
              onClick={async () =>
                props.onStart(
                  await buildReview(ctx, (c) => c.source.type === 'mistake' && (motif === 'all' || !!c.data?.motifs.includes(motif)), 12, true),
                )
              }
            >
              Training starten ({Math.min(12, filtered.length)})
            </button>
            <h3 style={{ margin: '1rem 0 0.25rem' }}>Zuletzt hinzugefügt</h3>
            <ul class="list">
              {[...filtered]
                .sort((a, b) => b.added - a.added)
                .slice(0, 8)
                .map((c) => (
                  <li key={c.id} style={{ padding: '0.5rem 0' }}>
                    <div class="small">
                      <span class={`cls cls-${c.data?.cls}`} /> {c.data ? CLASS_DE[c.data.cls] : ''} · {c.data?.motifs.map((m) => MOTIF_DE[m]).join(', ')}
                    </div>
                    <div class="small muted">{c.data?.label}</div>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
