import { useEffect, useState } from 'preact/hooks';
import type { AppData } from '../app';
import { clearAll, exportBackup, importBackup, saveSetting, type Settings } from '../db/db';
import { buildPlacement, type SessionPlan } from '../course/session';
import { IconClose } from '../ui/icons';

export function SettingsScreen(props: { data: AppData; onClose: () => void; onChanged: () => void; onStart: (p: SessionPlan) => void }) {
  const [s, setS] = useState<Settings>(props.data.settings);
  const [storage, setStorage] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ bad?: boolean; text: string } | null>(null);
  const [startRating, setStartRating] = useState(String(props.data.settings.chesscomRating || ''));

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined) setStorage(`${(e.usage / 1e6).toFixed(1)} MB${e.quota ? ` von ${(e.quota / 1e9).toFixed(1)} GB` : ''}`);
    });
    navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const set = async <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS({ ...s, [k]: v });
    await saveSetting(k, v);
    if (k === 'board') document.documentElement.dataset['board'] = v as string;
    props.onChanged();
  };

  const doExport = async () => {
    const b = await exportBackup();
    const blob = new Blob([JSON.stringify(b)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zugzwang-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg({ text: 'Sicherung erstellt.' });
  };

  const doImport = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      const b = JSON.parse(await f.text());
      if (!confirm('Alle aktuellen Daten werden durch die Sicherung ersetzt. Fortfahren?')) return;
      await importBackup(b);
      setMsg({ text: 'Sicherung wiederhergestellt.' });
      props.onChanged();
    } catch (err) {
      setMsg({ bad: true, text: (err as Error).message || 'Datei konnte nicht gelesen werden.' });
    } finally {
      input.value = '';
    }
  };

  const Switch = (p: { k: 'streak' | 'coords' | 'showPlayedMove'; label: string; sub?: string }) => (
    <label class="switch-row">
      <span>
        {p.label}
        {p.sub && <div class="small muted">{p.sub}</div>}
      </span>
      <input type="checkbox" class="switch" checked={s[p.k]} onChange={(e) => set(p.k, (e.currentTarget as HTMLInputElement).checked)} />
    </label>
  );

  return (
    <div class="session" role="dialog" aria-label="Einstellungen">
      <div class="session-head">
        <h2 style={{ flex: 1, margin: 0 }}>Einstellungen</h2>
        <button class="iconbtn" aria-label="Schliessen" onClick={props.onClose}>
          <IconClose />
        </button>
      </div>
      <div class="session-body" style={{ padding: '0 1rem 2rem' }}>
        <section class="card">
          <h3>Anzeige</h3>
          <div class="field">
            <label for="board">Brettfarben</label>
            <select id="board" value={s.board} onChange={(e) => set('board', (e.currentTarget as HTMLSelectElement).value as Settings['board'])}>
              <option value="holz">Holz (warm)</option>
              <option value="kontrast">Kontrast (grau-blau)</option>
              <option value="gruen">Grün</option>
            </select>
          </div>
          <Switch k="coords" label="Koordinaten am Brett" />
          <Switch k="streak" label="Wochenkalender anzeigen" sub="Dezent, ohne Serien-Druck" />
          <Switch k="showPlayedMove" label="Bei eigenen Fehlern den gespielten Zug zeigen" />
          <div class="field" style={{ marginTop: '0.75rem' }}>
            <label for="goal">Wochenziel (Übungstage)</label>
            <select id="goal" value={s.weeklyGoal} onChange={(e) => set('weeklyGoal', Number((e.currentTarget as HTMLSelectElement).value))}>
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} Tage
                </option>
              ))}
            </select>
          </div>
        </section>

        <section class="card">
          <h3>Analyse</h3>
          <div class="field">
            <label for="depth">Suchtiefe (höher = genauer, langsamer)</label>
            <select id="depth" value={s.depth} onChange={(e) => set('depth', Number((e.currentTarget as HTMLSelectElement).value))}>
              {[10, 12, 14, 16, 18].map((n) => (
                <option key={n} value={n}>
                  Tiefe {n}
                  {n === 14 ? ' (Standard)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div class="field">
            <label for="mt">Zeitlimit pro Stellung</label>
            <select id="mt" value={s.movetime} onChange={(e) => set('movetime', Number((e.currentTarget as HTMLSelectElement).value))}>
              {[500, 1000, 1500, 3000, 5000].map((n) => (
                <option key={n} value={n}>
                  {(n / 1000).toLocaleString('de-CH')} s{n === 1500 ? ' (Standard)' : ''}
                </option>
              ))}
            </select>
          </div>
          <p class="small muted" style={{ margin: 0 }}>
            Stockfish 18 (lite, Single-Thread) läuft lokal im Hintergrund. Eine Partie mit 40 Zügen braucht auf dem Handy etwa 1–2 Minuten.
          </p>
        </section>

        <section class="card">
          <h3>Einstufung</h3>
          <p class="small muted" style={{ marginTop: 0 }}>
            Taktik-Rating: <span class="num">{s.tacticsRating}</span>. Der Test markiert Units unter deinem Niveau als übersprungen.
          </p>
          <div class="field">
            <label for="cr">Chess.com-Rating (optional, als Startwert)</label>
            <input id="cr" type="number" inputMode="numeric" placeholder="z. B. 450" value={startRating} onInput={(e) => setStartRating((e.currentTarget as HTMLInputElement).value)} />
          </div>
          <button
            class="btn block"
            onClick={() => {
              if (Number(startRating) > 0) void saveSetting('chesscomRating', Number(startRating));
              props.onStart(
                buildPlacement(
                  { pool: props.data.pool, progress: props.data.progress, lines: props.data.lines },
                  Number(startRating) > 0 ? Number(startRating) + 150 : 600,
                ),
              );
            }}
          >
            Einstufungstest starten
          </button>
        </section>

        <section class="card">
          <h3>Daten</h3>
          <p class="small muted" style={{ marginTop: 0 }}>
            Alles bleibt auf diesem Gerät. Belegt: <span class="num">{storage ?? '–'}</span>
            {persisted === false && ' · Speicher nicht dauerhaft geschützt – regelmässig sichern.'}
          </p>
          <div class="btn-row">
            <button class="btn" onClick={doExport}>
              Fortschritt exportieren
            </button>
            <label class="btn">
              Importieren
              <input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={doImport} />
            </label>
          </div>
          <button
            class="btn danger block"
            style={{ marginTop: '0.625rem' }}
            onClick={async () => {
              if (!confirm('Wirklich alles löschen? Fortschritt, Partien und Wiederholungen gehen verloren.')) return;
              await clearAll();
              setMsg({ text: 'Alle Daten gelöscht.' });
              props.onChanged();
            }}
          >
            Alles löschen
          </button>
          {msg && <div class={`notice ${msg.bad ? 'bad' : ''}`}>{msg.text}</div>}
        </section>

        <section class="card small muted">
          <p style={{ marginTop: 0 }}>
            <b>Zugzwang</b> – offline Schach lernen. Puzzles: Lichess-Puzzle-Datenbank (CC0). Eröffnungsnamen: lichess-org/chess-openings (CC0). Engine:
            Stockfish 18 / Stockfish.js (GPL-3). Figuren: cburnett (GPLv2+). Regeln: chess.js (BSD-2).
          </p>
          <p style={{ marginBottom: 0 }}>Quelltext unter GPL-3.0.</p>
        </section>
      </div>
    </div>
  );
}
