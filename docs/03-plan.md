# Phase 3 – Implementierungsplan

Grundlage: [`02-storyboard.md`](02-storyboard.md) und die Antworten vom 15.10.2026 (GitHub Action für Puzzles, eigenes SVG-Brett, FSRS mit `ts-fsrs`, Name „Zugzwang", Farben der PWA-Familie).

## 1. Architektur

```
┌──────────────── Browser (PWA, offline) ────────────────┐
│  index.html  (Preact-UI, CSS, Logik – inline gebündelt)│
│     │                                                  │
│     ├── IndexedDB  (Fortschritt, FSRS-Karten,          │
│     │               Partien, Analysen, Einstellungen)  │
│     ├── Web Worker: stockfish-18-lite-single.js/.wasm  │
│     ├── data/puzzles.json   (Lichess-Auswahl, CC0)     │
│     └── data/openings.json  (Lichess chess-openings)   │
│  sw.js  Service Worker: alles vorab cachen              │
└────────────────────────────────────────────────────────┘
        ▲ nur online, optional: api.chess.com, lichess.org/api
```

| Baustein | Entscheidung | Grund |
|---|---|---|
| Build | **Vite** + Plugin, das JS/CSS in `index.html` inlinet; eigenes Mini-Plugin schreibt `sw.js` mit Asset-Liste und Versions-Hash | „Single-File wo es geht", ein `npm run build`, keine Server-Komponente |
| UI | **Preact** (≈ 4 kB) mit TSX, kein Router (eigener Zustand mit Hash-Navigation) | klein, komponentenbasiert, schnell auf dem Handy |
| Sprache | TypeScript | Typsicherheit bei Brett-/Analyse-Logik |
| Regeln | `chess.js` 1.4 (BSD-2) | Zuggenerierung, PGN, FEN, SAN |
| Brett | eigenes SVG-Brett, Figuren „cburnett" (aus Lichess, GPL-kompatibel) | Stil, Pfeile, Markierungen, Tap-Tap + Ziehen |
| Engine | **Stockfish 18 lite single-thread** (npm `stockfish@18.0.8`, GPL-3) im Web Worker | GitHub Pages setzt keine COOP/COEP-Header, also kein SharedArrayBuffer und keine Threads. Die Single-Thread-Lite-Version braucht beides nicht. |
| Speicher | IndexedDB über `idb` (≈ 1 kB) | strukturierte Stores, gross genug für Partien |
| Wiederholung | `ts-fsrs` (MIT) | moderner Scheduler, gut getestet |
| Tests | Vitest (Node) | PGN-Parsing, Klassifizierung, Wiederholungsplanung, Erklär-Engine, Puzzle-Filter |
| Deploy | GitHub Action → GitHub Pages | kein Build-Server nötig |

Lizenz: Da Stockfish GPL-3 ist, steht das ganze Repo unter **GPL-3.0**.

## 2. Verzeichnisstruktur

```
index.html                 Vite-Einstieg
src/
  main.tsx                 App-Start, Service-Worker-Registrierung
  app.tsx                  Tab-Bar, Navigation
  styles.css               warm-dark/gold, Tokens aus der PWA-Familie
  board/                   SVG-Brett, Figuren, Pfeile, Promotion-Auswahl
  chess/                   Hilfsfunktionen rund um chess.js (UCI↔SAN, Material, Phasen)
  engine/                  Stockfish-Worker-Wrapper (UCI-Protokoll, Warteschlange)
  analysis/                Gewinnchance, Klassifizierung, Genauigkeit, Erklär-Engine
  import/                  PGN-Split/-Parse, Chess.com-/Lichess-Abruf
  srs/                     FSRS-Wrapper, Bewertung aus Versuch/Hinweis/Zeit
  course/                  Kursdefinition (Sections, Units, Texte), Lektionsgenerator
  puzzles/                 Puzzle-Pool laden, Auswahl pro Unit
  db/                      IndexedDB-Schema, Backup-Export/-Import
  screens/                 Lernpfad, Session-Player, Wiederholen, Analyse, Review, Statistik, Einstellungen
public/
  data/puzzles.json        generiert (GitHub Action)
  data/openings.json       generiert (scripts/build-openings.mjs)
  engine/                  Stockfish-Dateien (beim Build aus node_modules kopiert)
  icons/, manifest.webmanifest
scripts/
  build-puzzles.mjs        Lichess-CSV (stdin) → puzzles.json
  build-openings.mjs       chess-openings-TSV → openings.json
.github/workflows/
  puzzles.yml              lädt die Lichess-DB, filtert, committet puzzles.json
  pages.yml                testet, baut und deployt auf GitHub Pages
tests/                     Vitest
```

## 3. Datenformate

### 3.1 `puzzles.json`

```json
{ "v": 1, "generated": "2026-10-15", "source": "lichess_db_puzzle (CC0)",
  "tags": ["fork","pin", …],
  "p": [["00sHx","<FEN>","e8d7 a2e6 d7d8 f7f8",1760,[0,4,12]], …] }
```

Felder pro Puzzle: Lichess-ID, FEN (vor dem Zug des Gegners), Züge (UCI, erster Zug = Gegner), Rating, Tag-Indizes. Ca. 110 Byte pro Puzzle.

**Filter (`scripts/build-puzzles.mjs`, alle Werte per Umgebungsvariable änderbar):**

| Kriterium | Wert |
|---|---|
| Rating | 400–1800 |
| Popularity | ≥ 80 |
| NbPlays | ≥ 1000 (für seltene Tags automatisch ≥ 300) |
| RatingDeviation | ≤ 90 |
| Ziel | 8000 Puzzles (Bereich 5000–10'000) |
| Ausgewogenheit | Reservoir-Sampling pro *(Tag × 100er-Rating-Band)*, danach gierige Auswahl mit Quote pro Tag. Ein Puzzle zählt für alle seine Tags. Seed fest, damit das Ergebnis reproduzierbar ist. |

Die Lichess-Datei (≈ 270 MB `.zst`) wird im Stream gelesen (`zstd -dc | node …`), nichts davon landet im Repo.

### 3.2 `openings.json`

`[[eco, name, uciZüge], …]` aus `a.tsv`–`e.tsv`. Dient zur Benennung importierter Partien (längster passender Präfix) und als Quelle für die Standard-Eröffnungen.

### 3.3 IndexedDB (`zugzwang`, Version 1)

| Store | Schlüssel | Inhalt |
|---|---|---|
| `settings` | `key` | Streak an/aus, Brettfarben, Tiefe, Chess.com-Name … |
| `progress` | `unitId` | Lektionen erledigt, Test bestanden/übersprungen, gesehene Puzzle-IDs |
| `cards` | `id` | FSRS-Karte + Herkunft (Puzzle-ID oder Partie-Fehler) + Stellung/Lösung |
| `attempts` | auto | Protokoll (Datum, Item, richtig, Hinweisstufe, Zeit, Tags) für Statistik und Ratings |
| `games` | `id` | PGN, Header, Farbe, Quelle, Analysezustand |
| `analyses` | `gameId` | pro Zug: Bewertung, bester Zug, PV, Klasse, Erklärung |
| `activity` | `YYYY-MM-DD` | Anzahl Aufgaben für den Kalender |

**Backup:** Einstellungen → „Fortschritt exportieren" schreibt alle Stores als JSON-Datei. Import ersetzt alles nach einer Rückfrage.

## 4. Speicherbudget

| Posten | Grösse (roh) | Übertragen (gzip) | Ort |
|---|---|---|---|
| App (`index.html` inkl. JS/CSS) | ≈ 250 kB | ≈ 80 kB | Cache Storage |
| Figuren-SVGs (inline) | ≈ 20 kB | – | im Bundle |
| Stockfish lite (JS + WASM) | ≈ 7,3 MB | ≈ 5,7 MB | Cache Storage |
| `puzzles.json` (8000 Puzzles) | ≈ 0,9 MB (Grenze 5 MB) | ≈ 0,35 MB | Cache Storage |
| `openings.json` | ≈ 0,3 MB | ≈ 0,07 MB | Cache Storage |
| **Summe statisch** | **≈ 9 MB** | **≈ 6,3 MB** beim ersten Laden | |
| Pro importierter Partie (PGN + Analyse) | ≈ 8 kB | | IndexedDB |
| 1000 Partien | ≈ 8 MB | | IndexedDB |
| Attempts-Log (1 Jahr täglich 30 Aufgaben) | ≈ 1 MB | | IndexedDB |

Ziel: **unter 50 MB gesamt**. Das liegt deutlich unter den Kontingenten von iOS Safari (installierte PWAs bekommen einen Anteil des freien Speichers). Die App ruft `navigator.storage.persist()` auf, damit iOS die Daten nicht nach Wochen ohne Nutzung räumt, und zeigt den Verbrauch in den Einstellungen (`navigator.storage.estimate()`).

Engine-Arbeitsspeicher: `Hash` = 16 MB, eine Instanz. Sie wird erst bei Bedarf gestartet und nach 2 Minuten Leerlauf beendet.

## 5. Kernlogik

### 5.1 Lektionsgenerator

Unit = 3 Lektionen + Unit-Test. Lektion = Konzeptkarte → 1–2 **geführte** Aufgaben (Figur und Zielfeld sind vormarkiert, also Hinweisstufe 3 automatisch) → 3–4 freie Aufgaben mit steigendem Rating → 1–2 unmarkierte Aufgaben aus früheren Units. Das Rating-Fenster pro Lektion ergibt sich aus dem Band der Unit und Lektion 1/2/3 (unteres, mittleres, oberes Drittel). Gesehene Puzzles werden gemieden, solange der Pool reicht.

Aufgabentypen:
- `puzzle` – Lichess-Puzzle (Taktik, Matt in N): Gegnerzug wird animiert, danach ist man selbst am Zug.
- `goal` – Figur bewegen / Ziel erreichen (Section A, eigene Stellungen, z. B. „Bring den Springer in 3 Zügen nach f7").
- `line` – Eröffnungszüge nachspielen (zeigen → mit Pfeilen nachspielen → frei).
- `endgame` – Mini-Endspiel gegen Stockfish mit Ziel (Matt setzen, umwandeln, halten) und Zuglimit.
- `mistake` – „Finde den besseren Zug" aus eigenen Partien.

**Zugprüfung bei Puzzles:** Richtig ist der Lösungszug, ausserdem jeder Zug, der direkt mattsetzt (Lichess-Regel). Bei `mistake`-Aufgaben wird ein anderer Zug von der Engine geprüft und akzeptiert, wenn er höchstens 3 Prozentpunkte Gewinnchance vom besten Zug entfernt liegt.

**Falscher Zug:** Der Zug bleibt stehen, die Engine sucht die Antwort (Tiefe 10, ≤ 0,8 s) und spielt sie animiert. Danach erscheint ein Erklärsatz (§5.4) und „Nochmal" setzt die Stellung zurück. Ohne Engine (noch nicht geladen) gibt es nur den Satz „Das ist nicht der gesuchte Zug".

### 5.2 Gestufte Hinweise

1. Thema nennen (in thematischen Lektionen: „Prüfe alle Schachs und Schlagzüge") → 2. ziehende Figur markieren → 3. Zielfeld zeigen → 4. Lösung vorspielen + Erklärung.

### 5.3 Wiederholung (FSRS)

- In den Plan kommt jede Aufgabe, die **beim ersten Versuch falsch** war oder bei der ein Hinweis ab Stufe 2 nötig war. Dazu kommt jeder Fehler/Patzer aus eigenen Partien.
- Bewertung aus dem ersten Versuch (keine Knöpfe):

| Ergebnis | FSRS-Rating |
|---|---|
| falsch oder Hinweis 4 | Again |
| Hinweis 2 oder 3 | Hard |
| Hinweis 1, oder richtig nach > 30 s | Good |
| richtig ohne Hinweis in ≤ 30 s | Easy (nur bei Karten im Status „Review", sonst Good) |

- Gewünschte Behaltensrate 0,9, maximales Intervall 180 Tage.

### 5.4 Analyse

1. PGN aufteilen (mehrere Partien pro Datei, Kommentare/Varianten/NAGs entfernen) → `chess.js` lädt jede Partie.
2. Engine bewertet jede Stellung (`go depth D movetime T`, Standard D = 14, T = 1500 ms). Ergebnis: Score aus Sicht von Weiss, bester Zug, PV (8 Halbzüge). Fortschritt wird nach jeder Stellung gespeichert, damit eine abgebrochene Analyse weiterlaufen kann.
3. **Gewinnchance** (Lichess-Formel): `W(cp) = 50 + 50·(2/(1+e^(−0.00368208·cp)) − 1)`, Matt = ±10000 cp.
4. **Klasse** pro eigenem Zug aus dem Verlust ΔW (Prozentpunkte, aus Sicht des Ziehenden): Bester (= Engine-Zug), Gut (ΔW < 5), Ungenau (≥ 5), Fehler (≥ 10), Patzer (≥ 15). Die Schwellen entsprechen Lichess (0,1/0,2/0,3 auf der Skala −1…1).
5. **Genauigkeit** pro Zug: `103.1668·e^(−0.04354·ΔW) − 3.1669` (auf 0–100 begrenzt), pro Partie bzw. Phase der Mittelwert aus arithmetischem und harmonischem Mittel. Dazu der durchschnittliche Centipawn-Verlust (cp auf ±1000 begrenzt).
6. **Phasen:** Eröffnung = Halbzug ≤ 20 und kein Endspiel. Endspiel = Summe der Nicht-Bauern-Figuren beider Seiten ≤ 26 (D=9, T=5, L/S=3). Dazwischen Mittelspiel.

### 5.5 Erklär-Engine – „kurz und richtig"

Grundsatz: **Ein Detail wird nur genannt, wenn es eindeutig nachgewiesen ist.** Sonst bleibt es beim Thema (Lichess-Tag) bzw. bei der allgemeinen Aussage.

| Stufe | Quelle | Beispiel |
|---|---|---|
| Basis Puzzle | Lichess-Tags → feste deutsche Sätze pro Tag | „Thema: Gabel – eine Figur greift zwei Ziele gleichzeitig an." |
| Basis Partie | Bewertungsverlust + bester Zug in SAN | „Besser war Se4 (+1,2). Dein Zug kostet etwa 2,5 Bauern." |
| Detail: Matt | Engine meldet Matt ≤ 3 | „Hier gab es Matt in 2: Dh7+ Kf8 Dh8#." |
| Detail: Matt zugelassen | Score nach dem Zug = Matt für den Gegner ≤ 3 | „Danach setzt Schwarz in 2 Zügen matt." (+ „auf der Grundreihe", wenn das Mattbild das eindeutig zeigt) |
| Detail: Figur verloren | Antwort der Widerlegung ist ein Schlagzug **und** die Materialbilanz der PV (bis zu 6 Halbzüge) ist ≥ 2 Punkte schlechter | „Danach schlägt Schwarz Lxc4 und gewinnt Material." |
| Detail: Gabel | Bester Zug greift danach ≥ 2 Figuren an, die wertvoller als die ziehende Figur sind (oder König + ungedeckte Figur), **und** die PV gewinnt ≥ 2 Punkte | „Se4 greift König und Turm gleichzeitig an." |
| Detail: Umwandlung | Bester Zug ist eine Umwandlung | „b8=D wandelt den Bauern um." |
| Detail: ungedeckte Figur | Bester Zug schlägt eine Figur, die nicht gedeckt ist, und die PV gewinnt ≥ 2 Punkte | „Der Läufer auf c5 war ungedeckt." |

Fesselung, Spiess usw. werden in Partien **nicht** heuristisch behauptet (zu fehleranfällig). Bei Puzzles kommen sie aus den Tags. Jedes Detail verweist auf eine Unit (Statistik-Link). Alle Detektoren haben Unit-Tests mit Positiv- **und** Negativbeispielen.

### 5.6 Eröffnungs-Units (Section E)

- **Solange keine Partien importiert sind:** Standard-Linien (Weiss: Italienisch, Londoner System, Damengambit; Schwarz gegen 1.e4: Caro-Kann/Skandinavisch, gegen 1.d4: Damengambit abgelehnt), jeweils 8–10 Halbzüge aus `openings.json`.
- **Mit importierten Partien:** häufigste eigene Linien als Weiss und Schwarz (bis Halbzug 10, mindestens 3 Partien), dazu die Stelle, an der du in deinen Partien am meisten verlierst (Ø Verlust bis Zug 12).
- Jeder Zug der Linie ist eine FSRS-Karte.

### 5.7 Einstufungstest

16 Aufgaben, adaptives Treppenverfahren: Start bei 800 oder beim eingegebenen Chess.com-Rating, Schrittweite 200 → 150 → 100 → 50. Ergebnis = geschätztes Taktik-Rating. Units, deren Band darunter liegt, werden als „übersprungen" markiert.

### 5.8 Ratings pro Thema

Elo-Update (K = 40 → 16 nach 30 Aufgaben) gegen das Lichess-Puzzle-Rating, getrennt pro Tag und gesamt. Nur der erste Versuch zählt.

## 6. Inhalt

Chess.com-Rating: **ca. 450** (Nachtrag vom 15.10.2026). Daraus folgt:
- **Section A (Fundament) und B (Matt und Sicherheit)** sind die wichtigsten und vollständig befüllt (eigene Aufgaben, Konzepttexte, Endspiele, Puzzle-Zuordnung). C und D sind ebenfalls befüllt, E hat Standard-Linien als Fallback, F ist über Tags spielbar.
- Startwert Taktik-Rating 600 (Lichess-Puzzle-Ratings liegen erfahrungsgemäss über Chess.com-Rapid), der Einstufungstest startet bei 450 + 150.
- Der Einstufungstest bleibt optional – bei 450 ist der Pfad ab A1 sinnvoll; er überspringt nur, was sicher sitzt.

## 7. Bauschritte (je ein lauffähiger Commit)

1. Gerüst: Vite, Preact, TS, Vitest, Styles mit deinen Tokens, Tab-Bar, Manifest.
2. SVG-Brett (Tap-Tap, Ziehen, Animation, Markierungen, Pfeile, Umwandlung) + **eine Lektion** mit Testpuzzles.
3. Puzzle-Pipeline: `build-puzzles.mjs` + Tests + `puzzles.yml`. Action laufen lassen, `puzzles.json` übernehmen. `build-openings.mjs`.
4. Engine-Worker + Widerlegung bei falschen Zügen + gestufte Hinweise.
5. IndexedDB, FSRS, Wiederholen-Tab.
6. Lernpfad komplett (Kursdaten A–E, Unit-Tests, Einstufung, Endspiele, Eröffnungslinien).
7. Analyse: Import (PGN, Datei, Chess.com, Lichess), Hintergrund-Analyse, Review mit Graph, Erklärungen, Fehler → Karten.
8. Statistik, Einstellungen, Backup, Kalender.
9. Service Worker, Offline-Test (Playwright, Netzwerk aus), `pages.yml`, README.

## 8. Tests und Abnahme

| Bereich | Wie |
|---|---|
| PGN-Parsing | Vitest: mehrere Partien, Kommentare, Varianten, Chess.com-Header, kaputte Eingaben |
| Klassifizierung/Genauigkeit | Vitest: Grenzwerte, Matt-Scores, Perspektive Weiss/Schwarz |
| Wiederholungsplanung | Vitest: Bewertung aus Versuch, Intervalle wachsen bei Erfolg, Reset bei Fehler |
| Erklär-Engine | Vitest: Positiv-/Negativbeispiele je Detektor |
| Puzzle-Filter | Vitest mit Mini-CSV |
| Offline | Playwright (Chromium): Seite laden, Netz abschalten, neu laden, Lektion lösen, PGN importieren und analysieren |
| 40-Zug-Analyse | Playwright mit CPU-Drosselung (4×) misst, dass der Haupt-Thread nie > 300 ms blockiert (gemessen in Chromium: 4 Long Tasks, längster 210 ms; Analyse 44 Züge in 13 s) |

**iOS Safari als installierte PWA:** In dieser Cloud-Umgebung gibt es nur Chromium, kein WebKit und kein iPhone. Ich teste deshalb alles, was geht, in Chromium mit Handy-Viewport und gedrosselter CPU, und vermeide bekannte iOS-Fallen:
- WASM im Worker (ab iOS 16 unterstützt)
- kein SharedArrayBuffer
- `100dvh` und `env(safe-area-inset-*)`
- keine `beforeinstallprompt`-Abhängigkeit
- Service Worker mit relativem Scope
- Touch-Events über Pointer Events mit `touch-action: none` auf dem Brett

Den finalen Test auf deinem iPhone (Checkliste im README) musst du machen.

## 9. Risiken

| Risiko | Gegenmassnahme |
|---|---|
| Stockfish lite zu langsam auf dem Handy | `movetime`-Deckel pro Stellung, Tiefe einstellbar, Analyse pausierbar und fortsetzbar |
| iOS räumt Speicher | `storage.persist()`, JSON-Backup, Hinweis in den Einstellungen |
| Lichess-Format ändert sich | Build-Skript prüft den CSV-Header und bricht mit klarer Meldung ab |
| Zu wenige Puzzles für seltene Tags | gelockerter NbPlays-Filter für seltene Tags, Unit zieht notfalls verwandte Tags |
| CORS bei Chess.com | Die öffentliche API sendet `Access-Control-Allow-Origin: *`. Bei Fehlern erscheint ein Hinweis auf den PGN-Export. |
