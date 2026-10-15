import { useEffect, useState } from 'preact/hooks';
import type { AppData } from '../app';
import { allGames, deleteGame, saveSetting, type StoredGame } from '../db/db';
import { importPgnText } from '../import/importGames';
import { fetchChessCom, fetchLichess } from '../import/online';
import { runner, type RunnerState } from '../analysis/runner';
import { IconTrash } from '../ui/icons';

export function AnalysisScreen(props: { data: AppData; onOpenGame: (id: string) => void; onChanged: () => void }) {
  const { settings } = props.data;
  const [games, setGames] = useState<StoredGame[]>([]);
  const [pgn, setPgn] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ bad?: boolean; text: string } | null>(null);
  const [state, setState] = useState<RunnerState | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [ccUser, setCcUser] = useState(settings.chesscomUser);
  const [liUser, setLiUser] = useState(settings.lichessUser);
  const [months, setMonths] = useState(3);

  const reload = () => allGames().then(setGames);
  useEffect(() => {
    void reload();
    const un = runner.subscribe((s) => {
      setState(s);
      if (!s.running) void reload();
    });
    const on = () => setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    const iv = setInterval(reload, 4000);
    return () => {
      un();
      clearInterval(iv);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);

  const usernames = [ccUser, liUser, settings.chesscomUser, settings.lichessUser].filter(Boolean);

  const doImport = async (text: string, source: StoredGame['source']) => {
    const r = await importPgnText(text, source, usernames);
    const parts = [`${r.added.length} ${r.added.length === 1 ? 'Partie' : 'Partien'} importiert`];
    if (r.duplicates) parts.push(`${r.duplicates} schon vorhanden`);
    if (r.errors.length) parts.push(`${r.errors.length} fehlerhaft (${r.errors[0]!.message})`);
    setNotice({ text: parts.join(', ') + '.', bad: r.added.length === 0 && r.errors.length > 0 });
    runner.enqueue(r.added);
    await reload();
    props.onChanged();
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice({ bad: true, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const onFile = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void run('Datei', async () => {
      await doImport(await file.text(), 'pgn');
      input.value = '';
    });
  };

  const analysed = games.filter((g) => g.status === 'done').length;

  return (
    <>
      <section class="card">
        <h2>Partien importieren</h2>
        <div class="field">
          <label for="pgn">PGN einfügen</label>
          <textarea id="pgn" value={pgn} placeholder={'[Event "…"]\n1. e4 e5 2. Nf3 …'} onInput={(e) => setPgn((e.currentTarget as HTMLTextAreaElement).value)} />
        </div>
        <div class="btn-row">
          <button class="btn primary" disabled={!pgn.trim() || !!busy} onClick={() => run('PGN', async () => (await doImport(pgn, 'pgn'), setPgn('')))}>
            Importieren
          </button>
          <label class="btn" style={{ flex: 1 }}>
            .pgn-Datei
            <input type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain" style={{ display: 'none' }} onChange={onFile} />
          </label>
        </div>

        <h3 style={{ margin: '1.25rem 0 0.5rem' }}>
          Online abrufen <span class="small muted">{online ? '' : '(offline – nicht verfügbar)'}</span>
        </h3>
        <div class="field">
          <label for="cc">Chess.com-Benutzername</label>
          <input id="cc" type="text" autocapitalize="off" autocorrect="off" spellcheck={false} value={ccUser} onInput={(e) => setCcUser((e.currentTarget as HTMLInputElement).value)} />
        </div>
        <div class="btn-row">
          <select aria-label="Zeitraum" value={months} onChange={(e) => setMonths(Number((e.currentTarget as HTMLSelectElement).value))} style={{ flex: 1 }}>
            <option value={1}>letzter Monat</option>
            <option value={3}>letzte 3 Monate</option>
            <option value={6}>letzte 6 Monate</option>
            <option value={12}>letzte 12 Monate</option>
          </select>
          <button
            class="btn"
            disabled={!online || !!busy || !ccUser.trim()}
            onClick={() =>
              run('Chess.com', async () => {
                await saveSetting('chesscomUser', ccUser.trim());
                const text = await fetchChessCom(ccUser, months, (m) => setBusy(m));
                await doImport(text, 'chesscom');
              })
            }
          >
            Abrufen
          </button>
        </div>
        <div class="field" style={{ marginTop: '0.875rem' }}>
          <label for="li">Lichess-Benutzername (optional)</label>
          <input id="li" type="text" autocapitalize="off" autocorrect="off" spellcheck={false} value={liUser} onInput={(e) => setLiUser((e.currentTarget as HTMLInputElement).value)} />
        </div>
        <button
          class="btn block"
          disabled={!online || !!busy || !liUser.trim()}
          onClick={() =>
            run('Lichess', async () => {
              await saveSetting('lichessUser', liUser.trim());
              await doImport(await fetchLichess(liUser, 50), 'lichess');
            })
          }
        >
          Letzte 50 Lichess-Partien abrufen
        </button>
        {busy && <p class="small muted">{busy} …</p>}
        {notice && <div class={`notice ${notice.bad ? 'bad' : ''}`}>{notice.text}</div>}
      </section>

      {state && (state.running || state.queue > 0 || state.paused) && (
        <section class="card">
          <h3>Analyse läuft im Hintergrund</h3>
          <div class="progress" style={{ margin: '0.5rem 0' }}>
            <i style={{ width: `${state.total ? Math.round((state.done / state.total) * 100) : 0}%` }} />
          </div>
          <p class="small muted" style={{ margin: '0 0 0.5rem' }}>
            Stellung <span class="num">{state.done}/{state.total}</span> · noch <span class="num">{state.queue}</span> Partien in der Warteschlange · Tiefe{' '}
            <span class="num">{settings.depth}</span>
          </p>
          <button class="btn block" onClick={() => (state.paused ? runner.resume() : runner.pause())}>
            {state.paused ? 'Fortsetzen' : 'Pause'}
          </button>
        </section>
      )}
      {state?.error && <div class="notice bad">Analysefehler: {state.error}</div>}

      <h2 class="section-title">
        Meine Partien <span class="num" style={{ float: 'right' }}>{analysed}/{games.length} analysiert</span>
      </h2>
      {games.length === 0 ? (
        <div class="empty">Noch keine Partien. PGN funktioniert auch offline.</div>
      ) : (
        <section class="card" style={{ padding: '0 1rem' }}>
          <ul class="list">
            {games.map((g) => (
              <li key={g.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button class="row-btn" onClick={() => props.onOpenGame(g.id)} disabled={g.status !== 'done'}>
                  <span class="grow">
                    <span class="title ellipsis" style={{ display: 'block' }}>
                      {g.color === 'w' ? '● ' : g.color === 'b' ? '○ ' : ''}
                      {g.white} – {g.black} <span class="num muted">{g.result}</span>
                    </span>
                    <span class="meta ellipsis" style={{ display: 'block' }}>
                      {g.date} · {g.eco} {g.opening} ·{' '}
                      {g.status === 'done'
                        ? 'analysiert'
                        : g.status === 'error'
                          ? 'Fehler'
                          : g.status === 'running'
                            ? `analysiere ${Math.round(g.progress * 100)} %`
                            : 'wartet'}
                    </span>
                  </span>
                </button>
                <button
                  class="iconbtn"
                  aria-label="Partie löschen"
                  onClick={async () => {
                    if (!confirm('Partie und zugehörige Fehler-Aufgaben löschen?')) return;
                    await deleteGame(g.id);
                    await reload();
                    props.onChanged();
                  }}
                >
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
