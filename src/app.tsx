import { useCallback, useEffect, useState } from 'preact/hooks';
import { allActivity, allGames, allProgress, loadSettings, type Settings, type UnitProgress } from './db/db';
import { loadPuzzles, type Puzzle } from './puzzles/pool';
import { dueCards, type SessionPlan } from './course/session';
import { linesFromGames, makeGameLines, standardLines, type RepLine } from './course/repertoire';
import { loadOpenings, nameFor } from './course/openings';
import { parseGame } from './import/pgn';
import { Session } from './screens/Session';
import { LearnScreen } from './screens/Learn';
import { ReviewScreen } from './screens/Review';
import { AnalysisScreen } from './screens/Analysis';
import { GameReview } from './screens/GameReview';
import { StatsScreen } from './screens/Stats';
import { SettingsScreen } from './screens/Settings';
import { IconAnalysis, IconGear, IconLearn, IconReview, IconStats } from './ui/icons';
import { Calendar } from './ui/Calendar';
import { runner } from './analysis/runner';

export type Tab = 'learn' | 'review' | 'analysis' | 'stats';

export interface AppData {
  settings: Settings;
  progress: Record<string, UnitProgress>;
  pool: Puzzle[];
  poolError: string | null;
  lines: { w: RepLine[]; b: RepLine[] };
  due: number;
  activity: Record<string, number>;
}

/** Repertoire-Linien: aus eigenen Partien (≥ 3 Partien pro Linie), sonst Standard. */
async function loadLines(): Promise<{ w: RepLine[]; b: RepLine[] }> {
  const games = await allGames();
  const parsed: { uci: string[]; color: 'w' | 'b' }[] = [];
  for (const g of games) {
    if (!g.color) continue;
    try {
      parsed.push({ uci: parseGame(g.pgn).uci, color: g.color });
    } catch {
      /* ignorieren */
    }
  }
  const openings = await loadOpenings().catch(() => null);
  const name = (uci: string[]) => (openings ? nameFor(openings, uci)?.name : null) ?? 'Eigene Linie';
  const result = { w: [] as RepLine[], b: [] as RepLine[] };
  for (const color of ['w', 'b'] as const) {
    const own = makeGameLines(linesFromGames(parsed, color), color, name);
    result[color] = own.length > 0 ? own : standardLines(color);
  }
  return result;
}

export function App() {
  const [tab, setTab] = useState<Tab>(() => (localStorageGet('zz-tab') as Tab) || 'learn');
  const [data, setData] = useState<AppData | null>(null);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [reviewGame, setReviewGame] = useState<{ id: string; ply?: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const refresh = useCallback(async () => {
    const [settings, progress, due, activity, lines] = await Promise.all([
      loadSettings(),
      allProgress(),
      dueCards(),
      allActivity(),
      loadLines(),
    ]);
    document.documentElement.dataset['board'] = settings.board;
    let pool: Puzzle[] = data?.pool ?? [];
    let poolError: string | null = null;
    if (pool.length === 0) {
      try {
        pool = await loadPuzzles();
      } catch (e) {
        poolError = (e as Error).message;
      }
    }
    setData({ settings, progress, pool, poolError, lines, due: due.length, activity });
  }, [data]);

  useEffect(() => {
    void refresh();
    void runner.resumePending();
  }, []);

  useEffect(() => localStorageSet('zz-tab', tab), [tab]);

  // Zurück-Geste (Android) schliesst Overlays statt die App
  useEffect(() => {
    const open = !!plan || !!reviewGame || showSettings;
    if (open) history.pushState({ overlay: true }, '');
    const onPop = () => {
      setPlan(null);
      setReviewGame(null);
      setShowSettings(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [!!plan, !!reviewGame, showSettings]);

  const closeOverlay = () => {
    if (history.state?.overlay) history.back();
    setPlan(null);
    setReviewGame(null);
    setShowSettings(false);
  };

  if (!data) {
    return (
      <div class="app">
        <div class="empty">Lade …</div>
      </div>
    );
  }

  const start = (p: SessionPlan) => setPlan(p);

  return (
    <div class="app">
      <header class="topbar">
        <h1>Zugzwang</h1>
        {data.settings.streak && <Calendar activity={data.activity} goal={data.settings.weeklyGoal} />}
        <button class="iconbtn" aria-label="Einstellungen" onClick={() => setShowSettings(true)}>
          <IconGear />
        </button>
      </header>
      <main class="main">
        {data.poolError && <div class="notice bad">Puzzle-Daten fehlen: {data.poolError}</div>}
        {tab === 'learn' && <LearnScreen data={data} onStart={start} />}
        {tab === 'review' && <ReviewScreen data={data} onStart={start} />}
        {tab === 'analysis' && <AnalysisScreen data={data} onOpenGame={(id) => setReviewGame({ id })} onChanged={refresh} />}
        {tab === 'stats' && <StatsScreen data={data} onStart={start} onOpenGame={(id, ply) => setReviewGame({ id, ply })} />}
      </main>
      <nav class="tabbar" aria-label="Hauptnavigation">
        <TabButton id="learn" cur={tab} set={setTab} label="Lernen" icon={<IconLearn />} />
        <TabButton id="review" cur={tab} set={setTab} label="Wiederholen" icon={<IconReview />} badge={data.due} />
        <TabButton id="analysis" cur={tab} set={setTab} label="Analyse" icon={<IconAnalysis />} />
        <TabButton id="stats" cur={tab} set={setTab} label="Statistik" icon={<IconStats />} />
      </nav>
      {plan && (
        <Session
          key={plan.title + plan.tasks.length}
          plan={plan}
          settings={data.settings}
          onClose={(changed) => {
            closeOverlay();
            if (changed) void refresh();
          }}
        />
      )}
      {reviewGame && (
        <GameReview
          gameId={reviewGame.id}
          initialPly={reviewGame.ply}
          settings={data.settings}
          onClose={() => {
            closeOverlay();
            void refresh();
          }}
        />
      )}
      {showSettings && (
        <SettingsScreen
          data={data}
          onStart={(p) => {
            setShowSettings(false);
            setPlan(p);
          }}
          onClose={() => {
            closeOverlay();
            void refresh();
          }}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function TabButton(props: { id: Tab; cur: Tab; set: (t: Tab) => void; label: string; icon: preact.JSX.Element; badge?: number }) {
  return (
    <button aria-current={props.cur === props.id ? 'page' : undefined} onClick={() => props.set(props.id)}>
      {props.icon}
      {props.label}
      {!!props.badge && <span class="badge">{props.badge > 99 ? '99+' : props.badge}</span>}
    </button>
  );
}

function localStorageGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function localStorageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* privat */
  }
}
