# Zugzwang – Schach lernen, offline

Eine persönliche Schachlern-App als PWA: ein Lernpfad mit kurzen Lektionen, Wiederholung nach Vergessenskurve (FSRS) und ein Analyse-Tool, das aus Fehlern in deinen eigenen Partien Übungsaufgaben macht. Nach dem ersten Laden läuft alles im Flugmodus. Es gibt keine Accounts, kein Backend und kein Tracking.

- **Lernpfad** in den Sections A–F mit 42 Units. A–D sind komplett befüllt: eigene Aufgaben, Konzepttexte, Puzzles und Endspiele gegen Stockfish.
- **Aufgabentypen:**
  - „Bring die Figur nach …"
  - Taktik und Matt in N (Lichess-Puzzles)
  - Eröffnungslinien nachspielen
  - Mini-Endspiele gegen Stockfish
  - „Finde den besseren Zug" aus eigenen Partien
- **Gestufte Hinweise:** Thema → Figur → Zielfeld → Lösung mit Erklärung. Bei falschen Zügen spielt die Engine die Widerlegung vor. Es gibt keine Leben.
- **Analyse:** Import per PGN (auch offline), Chess.com und Lichess (online). Die Bewertung läuft mit Stockfish 18 im Hintergrund und liefert:
  - Zugklassen (Bester / Gut / Ungenau / Fehler / Patzer)
  - Genauigkeit pro Phase
  - Bewertungsgraph
  - deutsche Erklärungen
- **Statistik:** welche Fehlertypen und Eröffnungen am meisten kosten, jeweils mit Link zur passenden Unit.

Hintergrund und Entscheidungen stehen in [`docs/`](docs/): Analyse des Duolingo-Kurses, Storyboard und Implementierungsplan.

## Setup

```bash
npm ci            # installiert auch Stockfish (npm-Paket „stockfish")
npm run dev       # Entwicklungsserver auf http://localhost:5173
npm test          # Unit-Tests (Vitest)
npm run build     # Produktionsbuild nach dist/
npm run preview   # Build lokal ansehen
npm run e2e       # Browser-Test (Chromium): Lektion, Analyse mit gedrosselter CPU, Offline-Neustart
```

`npm run e2e` braucht einen vorherigen Build und Chromium. Der Pfad ist in `tests/e2e/offline.mjs` gesetzt. Ein lokaler Chrome funktioniert auch, wenn du `executablePath` anpasst.

## Deploy auf GitHub Pages

1. Im Repository unter **Settings → Pages → Build and deployment → Source** „**GitHub Actions**" wählen.
2. Nach `main` mergen oder pushen. Die Action `.github/workflows/pages.yml` testet, baut und deployt `dist/`.
3. Die App liegt danach unter `https://<user>.github.io/<repo>/`. Alle Pfade sind relativ, ein Unterordner ist kein Problem.

Auf dem iPhone: Seite in Safari öffnen → Teilen → **Zum Home-Bildschirm**. Danach die App einmal online starten, damit der Service Worker alles (≈ 9 MB) cacht.

Es gibt keinen Build-Server. Wer nicht über Actions deployen will, kann `npm run build` lokal ausführen und den Inhalt von `dist/` auf einen beliebigen statischen Host legen.

## Puzzle-Daten neu generieren

`public/data/puzzles.json` enthält eine ausgewogene Auswahl aus der [Lichess-Puzzle-Datenbank](https://database.lichess.org/#puzzles) (CC0):

| Filter | Wert |
|---|---|
| Rating | 400–1800 |
| Popularität | ≥ 80 |
| Gespielt | ≥ 1000-mal (seltene Tags: ≥ 300) |
| Rating-Abweichung | ≤ 90 |
| Anzahl | 8000 Puzzles, Round-Robin über 46 Themen-Tags × 100er-Rating-Bänder |

Ergebnis: ≈ 0,9 MB, gzip ≈ 0,36 MB.

**Per GitHub Action (empfohlen):** Actions → „Puzzle-Daten generieren" → *Run workflow*. Optional lässt sich die Anzahl ändern. Die Action lädt die Datenbank (≈ 270 MB, `.zst`), filtert sie und committet das Ergebnis in den gewählten Branch. Sie läuft ausserdem automatisch, wenn sich `scripts/build-puzzles.mjs` oder `scripts/puzzle-select.mjs` ändern.

**Lokal** (braucht `zstd`):

```bash
curl -L https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc \
  | PUZZLE_TARGET=8000 node scripts/build-puzzles.mjs public/data/puzzles.json
```

Diese Umgebungsvariablen sind möglich: `PUZZLE_TARGET`, `PUZZLE_MIN_RATING`, `PUZZLE_MAX_RATING`, `PUZZLE_MIN_POPULARITY`, `PUZZLE_MIN_PLAYS`, `PUZZLE_MIN_PLAYS_RARE`, `PUZZLE_MAX_DEVIATION` und `PUZZLE_SEED`. Das Skript bricht ab, wenn die Datei grösser als 5 MB wird oder weniger als 1000 Puzzles übrig bleiben.

Die Eröffnungsnamen (`public/data/openings.json`) kommen aus [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0): `npm run openings`.

## Speicherbudget

| Posten | Grösse | Ort |
|---|---|---|
| App (HTML/JS/CSS, Figuren inline) | 216 kB (gzip 73 kB) | Cache Storage |
| Stockfish 18 lite, single-thread (JS + WASM) | 7,3 MB (gzip 5,7 MB) | Cache Storage |
| `puzzles.json` | 0,9 MB (gzip 0,36 MB) | Cache Storage |
| `openings.json` | 0,4 MB (gzip 0,05 MB) | Cache Storage |
| pro analysierter Partie | ≈ 8 kB | IndexedDB |

Die App ruft `navigator.storage.persist()` auf und zeigt den Verbrauch unter Einstellungen → Daten. Dort gibt es auch **Export/Import des gesamten Fortschritts als JSON**.

## Warum Stockfish „lite single-thread"?

GitHub Pages kann keine `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy`-Header setzen. Ohne diese gibt es keinen `SharedArrayBuffer` und damit keine Engine-Threads. Die Single-Thread-Lite-Variante (`stockfish-18-lite-single`) braucht beides nicht und läuft in allen aktuellen Browsern, auch auf iOS ab 16. Sie arbeitet in einem Web Worker, deshalb friert die Oberfläche während der Analyse nicht ein. Pro Stellung gelten Tiefe und Zeitlimit (Standard: Tiefe 14, höchstens 1,5 s), beides ist einstellbar.

## Test auf dem iPhone (Checkliste)

In der Cloud-Umgebung, in der die App gebaut wurde, gibt es nur Chromium. Diese Punkte bitte einmal auf dem iPhone prüfen:

- [ ] Als PWA installieren (Safari → Teilen → Zum Home-Bildschirm), einmal online öffnen
- [ ] Flugmodus an, App neu starten: Lernpfad, Lektion, Wiederholung funktionieren
- [ ] Endspiel „Dame gegen König" starten: Stockfish lädt offline („Du spielst Weiss gegen Stockfish")
- [ ] PGN einfügen und analysieren: Fortschritt läuft, Bedienung bleibt flüssig
- [ ] Ziehen und Tap-Tap auf dem Brett, Umwandlungsauswahl
- [ ] Safe Areas (Notch/Home-Indicator) und Tab-Leiste mit dem Daumen erreichbar
- [ ] Einstellungen → Fortschritt exportieren: Datei wird gespeichert

## Projektstruktur

```
src/board/       SVG-Brett (Tap-Tap, Ziehen, Animation, Pfeile, Umwandlung)
src/engine/      Stockfish-Worker (UCI)
src/analysis/    Klassifizierung, Genauigkeit, Erklär-Engine, Hintergrund-Analyse
src/import/      PGN-Parser, Chess.com-/Lichess-Abruf
src/srs/         FSRS (ts-fsrs) mit Bewertung aus Versuch, Hinweis und Zeit
src/course/      Kursinhalte, Lektionsgenerator, Repertoire
src/screens/     Lernpfad, Aufgaben, Wiederholen, Analyse, Review, Statistik, Einstellungen
scripts/         Puzzle-/Eröffnungsdaten, Engine-Kopie, Icons
tests/           Unit-Tests (Vitest) und E2E-Test (Playwright)
```

## Lizenzen und Quellen

- Code: **GPL-3.0-or-later** (wegen Stockfish)
- Stockfish 18 / [Stockfish.js](https://github.com/nmrugg/stockfish.js): GPL-3
- Puzzles: [Lichess-Puzzle-Datenbank](https://database.lichess.org/#puzzles), CC0
- Eröffnungsnamen: [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), CC0
- Figuren „cburnett" von Colin M. L. Burnett, GPLv2+ (über [lichess-org/lila](https://github.com/lichess-org/lila))
- [chess.js](https://github.com/jhlywa/chess.js): BSD-2
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs): MIT
- [Preact](https://preactjs.com/): MIT
- [idb](https://github.com/jakearchibald/idb): ISC

Alle Lerntexte sind eigene Formulierungen. Es werden keine Texte, Grafiken, Figuren oder Namen von Duolingo verwendet.
