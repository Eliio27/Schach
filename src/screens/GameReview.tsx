import { Fragment } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chess } from 'chess.js';
import { Board, type Arrow, type Highlight } from '../board/Board';
import { getAnalysis, getGame, type MoveReport, type Settings, type StoredAnalysis, type StoredGame } from '../db/db';
import { parseGame } from '../import/pgn';
import { CLASS_DE, formatScore, scoreToCp, winPercent } from '../analysis/classify';
import { MOTIF_DE, MOTIF_UNIT } from '../analysis/explain';
import { PHASE_DE, sanDe, uciLineToSan, formatLine } from '../chess/util';
import { UNIT_BY_ID } from '../course/course';
import { IconClose, IconFlip, IconNext, IconPrev } from '../ui/icons';

/** Partie-Review: Bewertungsgraph, Brett, Zugklassen und Erklärungen. */
export function GameReview(props: { gameId: string; initialPly?: number; settings: Settings; onClose: () => void }) {
  const [game, setGame] = useState<StoredGame | null>(null);
  const [an, setAn] = useState<StoredAnalysis | null>(null);
  const [ply, setPly] = useState(0);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    void Promise.all([getGame(props.gameId), getAnalysis(props.gameId)]).then(([g, a]) => {
      setGame(g ?? null);
      setAn(a ?? null);
      setPly(props.initialPly !== undefined ? props.initialPly + 1 : 0);
    });
  }, [props.gameId]);

  const parsed = useMemo(() => (game ? parseGame(game.pgn) : null), [game]);
  const fens = useMemo(() => {
    if (!parsed) return [];
    const c = new Chess(parsed.startFen);
    const out = [c.fen()];
    for (const u of parsed.uci) {
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      out.push(c.fen());
    }
    return out;
  }, [parsed]);

  if (!game || !parsed || !an?.moves || !an.summary) {
    return (
      <div class="session">
        <div class="session-head">
          <span class="grow" />
          <button class="iconbtn" aria-label="Schliessen" onClick={props.onClose}>
            <IconClose />
          </button>
        </div>
        <div class="empty">{game && !an?.moves ? 'Analyse noch nicht fertig.' : 'Lade …'}</div>
      </div>
    );
  }

  const moves = an.moves;
  const me = game.color ?? 'w';
  const orientation = flip ? (me === 'w' ? 'b' : 'w') : me;
  const n = parsed.uci.length;
  const cur: MoveReport | undefined = ply > 0 ? moves[ply - 1] : undefined;
  const mistakesIdx = moves.filter((m) => (m.cls === 'mistake' || m.cls === 'blunder') && (!game.color || m.color === game.color)).map((m) => m.ply + 1);
  const prevMistake = [...mistakesIdx].reverse().find((p) => p < ply);
  const nextMistake = mistakesIdx.find((p) => p > ply);
  const s = an.summary;
  const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x)} %`);

  const last: [string, string] | null = cur ? [cur.uci.slice(0, 2), cur.uci.slice(2, 4)] : null;
  const highlights: Highlight[] = [];
  const arrows: Arrow[] = [];
  if (cur && (cur.cls === 'mistake' || cur.cls === 'blunder')) highlights.push({ square: cur.uci.slice(2, 4), kind: 'bad' });
  const before = cur ? an.positions[cur.ply] : an.positions[0];
  if (cur && before?.best && cur.cls !== 'best') arrows.push({ from: before.best.slice(0, 2), to: before.best.slice(2, 4), color: 'green' });
  const posScore = an.positions[ply]?.score;

  return (
    <div class="session" role="dialog" aria-label="Partie-Review">
      <div class="session-head">
        <div class="grow" style={{ flex: 1, minWidth: 0 }}>
          <div class="ellipsis" style={{ fontWeight: 600 }}>
            {game.white} – {game.black} · <span class="num">{game.result}</span>
          </div>
          <div class="small muted ellipsis">
            {game.eco} {game.opening}
          </div>
        </div>
        <button class="iconbtn" aria-label="Brett drehen" onClick={() => setFlip(!flip)}>
          <IconFlip />
        </button>
        <button class="iconbtn" aria-label="Schliessen" onClick={props.onClose}>
          <IconClose />
        </button>
      </div>
      <div class="session-body">
        <div style={{ padding: '0 1rem' }}>
          <div class="stat-grid">
            <div class="stat">
              <div class="v">{pct(s.accuracy[me])}</div>
              <div class="l">Genauigkeit {game.color ? 'du' : 'Weiss'}</div>
            </div>
            <div class="stat">
              <div class="v">{pct(s.accuracy[me === 'w' ? 'b' : 'w'])}</div>
              <div class="l">Gegner</div>
            </div>
            <div class="stat">
              <div class="v">{s.acpl[me]}</div>
              <div class="l">Ø cp-Verlust</div>
            </div>
          </div>
          <p class="small muted" style={{ margin: '0.5rem 0' }}>
            {(['opening', 'middlegame', 'endgame'] as const).map((ph) => (
              <span key={ph} style={{ marginRight: '0.75rem' }}>
                {PHASE_DE[ph]} <span class="num">{pct(s.byPhase[ph][me])}</span>
              </span>
            ))}
          </p>
          <EvalGraph an={an} n={n} ply={ply} onSelect={setPly} />
        </div>
        <div class="board-wrap" style={{ marginTop: '0.5rem' }}>
          <Board fen={fens[ply]!} orientation={orientation} movable={null} lastMove={last} animate highlights={highlights} arrows={arrows} coords={props.settings.coords} />
        </div>
        <div class="feedback" style={{ minHeight: '5.5rem' }}>
          {cur ? (
            <>
              <div>
                <span class={`cls cls-${cur.cls}`} />{' '}
                <b class="mono">
                  {Math.floor(cur.ply / 2) + 1}
                  {cur.color === 'w' ? '.' : '…'} {sanDe(cur.san)}
                </b>{' '}
                {CLASS_DE[cur.cls]} <span class="muted num">({before ? formatScore(before.score) : ''} → {posScore ? formatScore(posScore) : ''})</span>
              </div>
              {before?.best && cur.cls !== 'best' && (
                <div class="small muted">
                  Bester Zug: <span class="mono">{formatLine(fens[cur.ply]!, uciLineToSan(fens[cur.ply]!, before.pv.slice(0, 4)))}</span>
                </div>
              )}
              {cur.explanation && <span class="expl">{cur.explanation}</span>}
              {cur.motifs?.map((m) => {
                const unit = MOTIF_UNIT[m];
                return unit ? (
                  <div key={m} class="small" style={{ marginTop: '0.25rem' }}>
                    → Übung: Unit {unit} {UNIT_BY_ID[unit]?.title} ({MOTIF_DE[m]})
                  </div>
                ) : null;
              })}
            </>
          ) : (
            <span class="muted">Startstellung. Tippe auf den Graphen oder nutze die Pfeile.</span>
          )}
        </div>
        <div class="session-actions" style={{ paddingBottom: '0.5rem' }}>
          <button class="btn icon" aria-label="Zurück" disabled={ply === 0} onClick={() => setPly(ply - 1)}>
            <IconPrev />
          </button>
          <button class="btn" disabled={prevMistake === undefined} onClick={() => prevMistake !== undefined && setPly(prevMistake)}>
            ‹ Fehler
          </button>
          <button class="btn" disabled={nextMistake === undefined} onClick={() => nextMistake !== undefined && setPly(nextMistake)}>
            Fehler ›
          </button>
          <button class="btn icon" aria-label="Weiter" disabled={ply >= n} onClick={() => setPly(ply + 1)}>
            <IconNext />
          </button>
        </div>
        <div class="movelist" style={{ padding: '0 1rem 1.5rem' }}>
          {moves.map((m) => (
            <Fragment key={m.ply}>
              {m.color === 'w' && <span class="no">{Math.floor(m.ply / 2) + 1}.</span>}
              {m.color === 'b' && m.ply === 0 && <span class="no">1…</span>}
              <button class={ply === m.ply + 1 ? 'cur' : ''} onClick={() => setPly(m.ply + 1)}>
                <span class={`cls cls-${m.cls}`} title={CLASS_DE[m.cls]} />
                {sanDe(m.san)}
              </button>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Bewertungsgraph: Gewinnchance von Weiss pro Halbzug; antippen springt zum Zug. */
function EvalGraph(props: { an: StoredAnalysis; n: number; ply: number; onSelect: (ply: number) => void }) {
  const W = 300;
  const H = 80;
  const pts = props.an.positions.map((p, i) => {
    const w = p ? winPercent(scoreToCp(p.score)) : 50;
    return [(i / Math.max(1, props.n)) * W, H - (w / 100) * H] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const area = `${line}L${W},${H}L0,${H}Z`;
  const [cx, cy] = pts[props.ply] ?? [0, H / 2];
  const marks = (props.an.moves ?? []).filter((m) => m.cls === 'mistake' || m.cls === 'blunder');
  const pick = (e: PointerEvent) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * props.n);
    props.onSelect(Math.max(0, Math.min(props.n, i)));
  };
  return (
    <svg
      class="evalgraph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onPointerDown={pick}
      onPointerMove={(e) => e.buttons && pick(e)}
      role="img"
      aria-label="Bewertungsverlauf (oben: Vorteil Weiss)"
    >
      <rect x={0} y={0} width={W} height={H} fill="var(--bg2)" rx={4} />
      <path d={area} fill="var(--text)" opacity={0.85} />
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--muted2)" stroke-width={0.6} vector-effect="non-scaling-stroke" />
      {marks.map((m) => {
        const [x, y] = pts[m.ply + 1] ?? [0, 0];
        return <circle key={m.ply} cx={x} cy={y} r={2.6} fill={m.cls === 'blunder' ? 'var(--red)' : '#e39b5f'} stroke="var(--bg2)" stroke-width={0.8} />;
      })}
      <line x1={cx} y1={0} x2={cx} y2={H} stroke="var(--gold)" stroke-width={2} vector-effect="non-scaling-stroke" />
      <circle cx={cx} cy={cy} r={3.2} fill="var(--gold)" stroke="var(--bg2)" stroke-width={1} />
    </svg>
  );
}
