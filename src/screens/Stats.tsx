import { useEffect, useState } from 'preact/hooks';
import type { AppData } from '../app';
import { allAnalyses, allAttempts, allGames, type AttemptRecord, type StoredAnalysis, type StoredGame } from '../db/db';
import { MOTIF_DE, MOTIF_UNIT, TAG_TEXT, type Motif } from '../analysis/explain';
import { buildLesson, type SessionPlan } from '../course/session';

interface Data {
  games: StoredGame[];
  analyses: StoredAnalysis[];
  attempts: AttemptRecord[];
}

const TAG_DE: Record<string, string> = {
  fork: 'Gabel',
  pin: 'Fesselung',
  skewer: 'Spiess',
  discoveredAttack: 'Abzug',
  mateIn1: 'Matt in 1',
  mateIn2: 'Matt in 2',
  mateIn3: 'Matt in 3',
  backRankMate: 'Grundreihe',
  hangingPiece: 'Hängende Figur',
  defensiveMove: 'Verteidigung',
  deflection: 'Ablenkung',
  attraction: 'Hinlenkung',
  sacrifice: 'Opfer',
  promotion: 'Umwandlung',
  capturingDefender: 'Verteidiger beseitigen',
  intermezzo: 'Zwischenzug',
  discoveredCheck: 'Abzugsschach',
  doubleCheck: 'Doppelschach',
  kingsideAttack: 'Königsangriff',
  smotheredMate: 'Ersticktes Matt',
  xRayAttack: 'Röntgen',
  trappedPiece: 'Gefangene Figur',
  quietMove: 'Ruhiger Zug',
  equality: 'Ausgleich',
  zugzwang: 'Zugzwang',
  clearance: 'Räumung',
  interference: 'Verstellung',
  attackingF2F7: 'f2/f7',
};

export function StatsScreen(props: { data: AppData; onStart: (p: SessionPlan) => void; onOpenGame: (id: string, ply?: number) => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [days, setDays] = useState(30);
  useEffect(() => {
    void Promise.all([allGames(), allAnalyses(), allAttempts()]).then(([games, analyses, attempts]) => setD({ games, analyses, attempts }));
  }, [props.data]);
  if (!d) return <div class="empty">Lade …</div>;

  const since = Date.now() - days * 86_400_000;
  const ctx = { pool: props.data.pool, progress: props.data.progress, lines: props.data.lines };
  const openUnit = (id: string) => {
    const p = props.data.progress[id];
    props.onStart(buildLesson(id, Math.min(p?.lessonsDone ?? 0, 2), ctx));
  };

  // --- Fehlertypen aus eigenen Partien (gewichtet mit verlorener Gewinnchance)
  const gameById = new Map(d.games.map((g) => [g.id, g]));
  const motifLoss = new Map<Motif, number>();
  let totalLoss = 0;
  const openingLoss = new Map<string, { color: 'w' | 'b'; loss: number; n: number; games: Set<string> }>();
  const recent: { g: StoredGame; acc: number | null }[] = [];
  for (const a of d.analyses) {
    const g = gameById.get(a.gameId);
    if (!g || !g.color || !a.moves || (Date.parse(g.date) || g.imported) < since) continue;
    recent.push({ g, acc: a.summary?.accuracy[g.color] ?? null });
    for (const m of a.moves) {
      if (m.color !== g.color) continue;
      if (m.cls === 'mistake' || m.cls === 'blunder') {
        totalLoss += m.winLoss;
        for (const mo of m.motifs ?? ['general']) motifLoss.set(mo, (motifLoss.get(mo) ?? 0) + m.winLoss / (m.motifs?.length || 1));
      }
      if (m.ply < 24 && g.opening) {
        const key = `${g.color}|${g.opening.split(':')[0]}`;
        const e = openingLoss.get(key) ?? { color: g.color, loss: 0, n: 0, games: new Set() };
        e.loss += m.cpLoss;
        e.n++;
        e.games.add(g.id);
        openingLoss.set(key, e);
      }
    }
  }
  const motifs = [...motifLoss.entries()].sort((a, b) => b[1] - a[1]);
  const maxMotif = motifs[0]?.[1] ?? 1;
  const openings = [...openingLoss.entries()]
    .map(([k, v]) => ({ name: k.split('|')[1]!, color: v.color, avg: v.loss / v.n, games: v.games.size }))
    .filter((o) => o.games >= 2)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);
  recent.sort((a, b) => (b.g.date + b.g.imported).localeCompare(a.g.date + a.g.imported));

  // --- Training
  const att = d.attempts.filter((a) => a.at >= since && a.kind !== 'guided');
  const firstTry = att.filter((a) => a.correct && a.hint === 0).length;
  const tagRatings = Object.entries(props.data.settings.tagRatings)
    .filter(([t, v]) => v.n >= 3 && TAG_TEXT[t])
    .sort((a, b) => a[1].r - b[1].r);

  return (
    <>
      <div style={{ marginBottom: '0.75rem' }}>
        {[7, 30, 90, 3650].map((n) => (
          <button key={n} class="chip" aria-pressed={days === n} onClick={() => setDays(n)}>
            {n === 3650 ? 'Alles' : `${n} Tage`}
          </button>
        ))}
      </div>

      <section class="card">
        <h2>Training</h2>
        <div class="stat-grid">
          <div class="stat">
            <div class="v">{props.data.settings.tacticsRating}</div>
            <div class="l">Taktik-Rating</div>
          </div>
          <div class="stat">
            <div class="v">{att.length}</div>
            <div class="l">Aufgaben</div>
          </div>
          <div class="stat">
            <div class="v">{att.length ? Math.round((firstTry / att.length) * 100) : 0} %</div>
            <div class="l">auf Anhieb</div>
          </div>
        </div>
        <p class="small muted" style={{ marginBottom: 0 }}>
          Das Taktik-Rating ist an den Lichess-Puzzle-Ratings geeicht, nicht an deinem Partie-Rating.
        </p>
      </section>

      <h2 class="section-title">Was kostet dich am meisten?</h2>
      <section class="card">
        {motifs.length === 0 ? (
          <p class="muted" style={{ margin: 0 }}>
            Noch keine analysierten eigenen Partien in diesem Zeitraum. Importiere Partien im Tab <b>Analyse</b>.
          </p>
        ) : (
          <>
            {motifs.map(([m, loss]) => {
              const unit = MOTIF_UNIT[m];
              return (
                <div key={m} class="bar-row">
                  <div>
                    <div class="lbl">
                      {MOTIF_DE[m]}
                      {unit && (
                        <button class="chip" style={{ marginLeft: '0.5rem', marginBottom: 0, minHeight: 28 }} onClick={() => openUnit(unit)}>
                          → {unit}
                        </button>
                      )}
                    </div>
                    <div class="bar" style={{ width: `${(loss / maxMotif) * 100}%` }} />
                  </div>
                  <div class="val">{Math.round((loss / totalLoss) * 100)} %</div>
                </div>
              );
            })}
            <p class="small muted" style={{ marginBottom: 0 }}>Anteil an der verlorenen Gewinnchance durch Fehler und Patzer.</p>
          </>
        )}
      </section>

      {openings.length > 0 && (
        <>
          <h2 class="section-title">Eröffnungen (Ø Verlust bis Zug 12)</h2>
          <section class="card">
            {openings.map((o) => (
              <div key={o.color + o.name} class="bar-row">
                <div class="lbl">
                  {o.color === 'w' ? '● ' : '○ '}
                  {o.name} <span class="small muted">({o.games} Partien)</span>
                </div>
                <div class="val">{Math.round(o.avg)} cp</div>
              </div>
            ))}
            <button class="btn block" style={{ marginTop: '0.5rem' }} onClick={() => openUnit(openings[0]!.color === 'w' ? 'E3' : 'E4')}>
              Repertoire üben ({openings[0]!.color === 'w' ? 'E3' : 'E4'})
            </button>
          </section>
        </>
      )}

      {recent.length > 0 && (
        <>
          <h2 class="section-title">Genauigkeit der letzten Partien</h2>
          <section class="card" style={{ padding: '0 1rem' }}>
            <ul class="list">
              {recent.slice(0, 10).map(({ g, acc }) => (
                <li key={g.id}>
                  <button class="row-btn" onClick={() => props.onOpenGame(g.id)}>
                    <span class="grow ellipsis">
                      <span class="title">{g.color === 'w' ? g.black : g.white}</span>
                      <span class="meta"> · {g.date}</span>
                    </span>
                    <span class="num">{acc === null ? '–' : `${Math.round(acc)} %`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {tagRatings.length > 0 && (
        <>
          <h2 class="section-title">Taktik-Rating je Thema (schwächste zuerst)</h2>
          <section class="card">
            {tagRatings.slice(0, 10).map(([t, v]) => (
              <div key={t} class="bar-row">
                <div class="lbl">{TAG_DE[t] ?? t}</div>
                <div class="val">
                  {v.r} <span class="small">({v.n})</span>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
