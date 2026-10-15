# Phase 2 – Storyboard: Was hilft, was ist Bloat?

Grundlage: [`01-duolingo-analyse.md`](01-duolingo-analyse.md). Bewertet wird nach **Lernwirkung**, nicht nach Engagement-Metriken.

Arbeitstitel der App: **„Zugzwang"** (Platzhalter, frei änderbar).

---

## 1. Bewertungstabelle

Die Begründungen stützen sich auf gut belegte Effekte aus der Lernforschung: Abrufübung (*retrieval practice*), verteiltes Wiederholen (*spacing*), gemischtes Üben (*interleaving*), schrittweises Zurücknehmen von Hilfen (*guidance fading*, Worked-Example-Effekt) und sofortiges Feedback bei Anfängern. Dazu kommen schachspezifische Erfahrungen mit Mustererkennung.

| # | Mechanik | Lerneffekt (Begründung) | Urteil |
|---|---|---|---|
| 1 | Kurze Lektionen mit einem Konzept | Geringe kognitive Last, ein Muster wird isoliert eingeprägt. Passt zum Handy. | **Behalten** |
| 2 | Steigerung geführt → frei | Worked-Example-Effekt: Anfänger lernen mehr aus gelösten Beispielen. Die Hilfe muss dann abgebaut werden, sonst bleibt man abhängig. | **Behalten** |
| 3 | Theorie als Maskottchen-Dialog | Der Inhalt (Konzept benennen) ist wertvoll, das Format (mehrere Sprechblasen, Witze) kostet Zeit ohne Lernwirkung. | **Verbessern** → eine Konzeptkarte: 2–3 Sätze + animierte Beispielstellung, überspringbar |
| 4 | Widerlegung auf dem Brett | Sehr wirksam: Man *sieht*, warum der Zug scheitert. Das ist konkretes Feedback statt „falsch". | **Behalten + verbessern** → zusätzlich ein deutscher Satz, *was* die Widerlegung ausnutzt |
| 5 | Pfeil nach wiederholten Fehlern | Sprung von „nichts" direkt zur Lösung. Es fehlen Zwischenstufen, die Denken anregen. | **Verbessern** → 4 gestufte Hinweise (siehe §1.2) |
| 6 | „Nicht falsch, aber nicht der beste" | Wichtig: Gleichwertige Lösungen nicht als Fehler werten, sonst lernt man Auswendiglernen statt Denken. | **Behalten** → Alternativen werden per Engine geprüft und akzeptiert |
| 7 | Thematische Puzzle-Blöcke | Gut zum Einführen, aber die Unit verrät das Motiv. In Partien fehlt dieser Hinweis, Transfer schwach. | **Verbessern** → jede Lektion mit 1–2 unmarkierten Aufgaben aus älteren Units, Unit-Test gemischt, eigener „Gibt es hier überhaupt etwas?"-Modus |
| 8 | Mini-Matches aus Stellung (Endspiel/Matt) | Hoher Transfer: Technik unter „echten" Bedingungen gegen Widerstand. | **Behalten** → gegen Stockfish mit einstellbarer Stärke |
| 9 | Volle Partien gegen KI als Pflicht | Lange, viel Zeit pro Lerneinheit. Sinnvoll zum Spielen, nicht als Pflicht im Pfad. Du spielst ohnehin auf Chess.com. | **Streichen als Pflicht** → optionaler Modus „Gegen Stockfish spielen" |
| 10 | PvP | Spielen ist wichtig, aber das bietet Chess.com bereits. Braucht Server, widerspricht offline. | **Streichen** |
| 11 | Game Review (eigene Matches) | Stärkster Hebel überhaupt: Fehler aus *eigenen* Partien sind die relevantesten Aufgaben. Bei Duolingo nur für interne Matches, ohne Wiederholungsplan. | **Verbessern** → Import eigener Partien, jeder Fehler wird zur Aufgabe mit Spaced Repetition |
| 12 | Interne Elo (aufgebläht) | Falsches Bild des eigenen Niveaus, damit falsche Zielsetzung. | **Verbessern** → Taktik-Rating pro Thema, kalibriert an den echten Lichess-Puzzle-Ratings |
| 13 | Selbstgewählter Einstieg | Selbsteinschätzung ist unzuverlässig. | **Verbessern** → Einstufungstest + jeder Unit-Test kann direkt zum Überspringen gemacht werden |
| 14 | Allgemeine Übungsfunktion | Wiederholung ohne Plan ist schwächer als verteilt nach Vergessenskurve. | **Verbessern** → FSRS-Wiederholungsplan |
| 15 | Streak mit Schuldgefühl, Freeze-Kauf | Ein leichter Gewohnheitsanker hilft. Angst um die Serie führt zu „Pflicht-Mini-Lektionen" ohne Lernwert. | **Verbessern** → dezenter Kalender, Wochenziel statt Tagesschuld, abschaltbar |
| 16 | XP | Belohnt Menge, nicht Lernen. Keine Information. | **Streichen** → Fortschrittsbalken pro Unit |
| 17 | Ligen / Ranglisten | Externer Vergleich, belohnt Farmen leichter Lektionen. Ohne Backend ohnehin nicht machbar. | **Streichen** |
| 18 | Gems / Shop | Kein Lerneffekt. | **Streichen** |
| 19 | Herzen / Energie | Bestraft Ausprobieren (Herzen) bzw. sogar richtige Antworten (Energie). Begrenzt die Übungsmenge künstlich. | **Streichen**. Gegen wahlloses Herumklicken zählt stattdessen *nur der erste Versuch* für die Bewertung im Wiederholungsplan. |
| 20 | Paywall | Entfällt. | **Streichen** |
| 21 | Coach-Kommentare, „absichtliche" Patzer | Kostet Zeit, verfälscht die Gegnerstärke. | **Streichen** → Stockfish mit ehrlicher, einstellbarer Stärke |
| 22 | Push-Benachrichtigungen | Kein Lerneffekt, als PWA offline ohnehin unzuverlässig. | **Streichen** |
| 23 | Puzzle-Qualität (Titel ≠ Inhalt) | Falsch zugeordnete Aufgaben verwirren mehr, als sie lehren. | **Verbessern** → Filter beim Build: Popularität, Anzahl Spiele, Rating-Abweichung, Themen-Tag eindeutig |
| — | **Fehlt: Warum** | Ohne Erklärung bleibt nur „richtig/falsch". Muster werden schlechter abstrahiert. | **Neu** → Erklär-Engine (Heuristiken) für Puzzles *und* eigene Partien |
| — | **Fehlt: Eigene Partien** | Siehe #11. | **Neu** → Analyse-Tool |
| — | **Fehlt: Verteidigung / Blunder-Check** | Im Bereich 800–1500 entstehen die meisten Verluste durch eingestellte Figuren und übersehene Drohungen, nicht durch verpasste eigene Kombinationen. | **Neu** → eigene Units „Was droht?" und eine wiederkehrende Checkliste (Schachs, Schlagzüge, Drohungen) |
| — | **Fehlt: Endspiele früh** | Grundendspiele (Opposition, Quadratregel, Turm-Matt) sind wenig Stoff mit grosser Wirkung. Bei Duolingo kommen sie erst ganz am Schluss. | **Neu** → in jeder Section eine Endspiel-Unit |

### 1.1 Prüfung deiner Arbeitshypothesen

| Hypothese | Urteil |
|---|---|
| Kurze Lektionen, ein Konzept | ✅ Bestätigt. Ergänzt um gemischte Aufgaben am Ende, sonst fehlt der Transfer (#7). |
| Sofortiges Feedback auf dem Brett | ✅ Bestätigt. Bei Anfängern klar wirksam, die Widerlegung ist das beste Feedbackformat im Schach. |
| Gestufte Hinweise | ✅ Bestätigt, mit einer Einschränkung: Stufe 1 „Thema nennen" bringt in einer thematischen Lektion nichts (das Thema ist bekannt). Dort lautet Stufe 1 stattdessen „Kandidaten prüfen: Welche Schachs/Schlagzüge gibt es?". In gemischten Sets bleibt „Thema nennen". |
| Spaced Repetition | ✅ Bestätigt, einer der robustesten Lerneffekte. Für Schach besonders geeignet, weil Muster wiedererkannt werden müssen. |
| Mini-Positionen statt ganzer Partien | ✅ Bestätigt für das *Lernen*. Ganze Partien bleiben wichtig für die *Anwendung*, die passiert auf Chess.com und fliesst über den Import zurück. |
| Geführt → frei | ✅ Bestätigt (Guidance Fading). |
| Herzen/Leben = Bloat | ✅ Bestätigt. Ein kleiner wahrer Kern: Ohne Konsequenz wird geraten. Deshalb zählt der erste Versuch für den Wiederholungsplan. |
| Ligen, Gems, Shop, Push = Bloat | ✅ Bestätigt. |
| Streak-Schuld = Bloat | ⚠️ Teilweise. Die *Schuld* ist Bloat, ein sichtbarer Kalender hilft aber nachweislich bei der Gewohnheitsbildung. Daher dezent behalten, Wochenziel statt Tageszwang. |
| Maskottchen-Dialoge = Bloat | ✅ Bestätigt. Inhalt behalten, Form ersetzen (#3). |
| Fehlt: Warum, eigene Partien | ✅ Bestätigt. Zusätzlich fehlen Verteidigung und frühe Endspiele. |

### 1.2 Gestufte Hinweise (verbindlich für alle Aufgaben)

| Stufe | Inhalt | Wirkung auf Wiederholungsplan |
|---|---|---|
| 1 | Thema nennen („Hier gibt es eine Gabel") – bzw. in thematischen Lektionen: „Prüfe alle Schachs und Schlagzüge" | Bewertung höchstens „Gut" |
| 2 | Betroffene Figur markieren (Figur, die zieht) | höchstens „Schwer" |
| 3 | Zielfeld zeigen | höchstens „Schwer" |
| 4 | Lösung vorspielen + Erklärsatz | „Nochmal" (kommt bald wieder) |

---

## 2. Storyboard der Screens

Alle Screens sind für eine Hand gebaut: Navigation und Hauptaktionen unten im Daumenbereich, Brett in voller Breite darüber. Unten liegt immer die Tab-Leiste:

```
[ Lernen ] [ Wiederholen (7) ] [ Analyse ] [ Statistik ]
```

### 2.1 Startseite / Lernpfad

```
┌──────────────────────────────────┐
│ Zugzwang            ▢▢▣▣▣▢▢  ⚙   │  ← Wochenkalender (dezent, abschaltbar)
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Heute: 7 Wiederholungen      │ │  ← Fällige Aufgaben zuerst
│ │ + Weiter: C3 Fesselung, L2   │ │
│ │        [  Los geht's  ]      │ │  ← ein Knopf startet die beste nächste Sitzung
│ └──────────────────────────────┘ │
│                                  │
│ SECTION C · Doppelangriffe       │
│  ✓ C1 Springergabel     ████████ │
│  ✓ C2 Gabel mit allen…  ████████ │
│  ▶ C3 Fesselung         ███░░░░░ │  ← Fortschrittsbalken pro Unit
│  ○ C4 Fesselung ausnutzen        │
│  ○ C5 Spiess                     │
│  ◇ C-Endspiel: Opposition        │
│  ★ C-Test (überspringen?)        │  ← Unit-/Section-Test zum Überspringen
│                                  │
│ SECTION D · Kombinieren   🔒     │
├──────────────────────────────────┤
│ [Lernen][Wiederh.][Analyse][Stat]│
└──────────────────────────────────┘
```

Gesperrte Sections lassen sich jederzeit per Test freischalten. Nichts ist hart gesperrt.

### 2.2 Lektion – Konzeptkarte (Start)

```
┌──────────────────────────────────┐
│ C3 Fesselung · Lektion 2/4   ✕   │
│ ▓▓░░░░░░  (Aufgabe 0/7)          │
├──────────────────────────────────┤
│        [ Brett: Beispiel ]       │
│   animiert: Läufer fesselt       │
│   Springer an Dame               │
├──────────────────────────────────┤
│ FESSELUNG                        │
│ Eine Figur kann nicht ziehen,    │
│ weil sonst eine wertvollere      │
│ Figur dahinter geschlagen wird.  │
│                                  │
│        [   Verstanden   ]        │
└──────────────────────────────────┘
```

### 2.3 Lektion – Aufgabe

```
┌──────────────────────────────────┐
│ C3 Fesselung · 3/7           ✕   │
│ ▓▓▓░░░░                          │
├──────────────────────────────────┤
│                                  │
│          [  B R E T T  ]         │  ← Tap-Tap oder Ziehen
│                                  │
├──────────────────────────────────┤
│ Weiss am Zug. Gewinne Material.  │
│                                  │
│ [ 💡 Hinweis 1/4 ]   [ ↺ Brett ] │
└──────────────────────────────────┘
```

### 2.4 Aufgabe richtig

```
├──────────────────────────────────┤
│ ✓ Richtig!  Lg5 fesselt den      │  ← grüner Rand am Zielfeld
│ Springer – er kann nicht mehr    │
│ ziehen, ohne die Dame zu         │
│ verlieren. Nächster Zug: f4!     │
│                                  │
│  [ Erklärung ▾ ]  [ Weiter → ]   │
└──────────────────────────────────┘
```

Mehrzügige Aufgaben: Der Gegner antwortet automatisch, die Rückmeldung kommt nach dem letzten Zug.

### 2.5 Aufgabe falsch

```
├──────────────────────────────────┤
│ ✗ Nicht ganz.                    │
│ Nach Sxe5? schlägt Schwarz       │  ← Engine spielt die Widerlegung
│ Dxe5 – dein Springer war nur     │     animiert auf dem Brett
│ einmal gedeckt, aber zweimal     │
│ angegriffen.                     │
│                                  │
│ [ Nochmal ]  [ 💡 Hinweis ]      │  ← Brett springt zurück zur Ausgangsstellung
└──────────────────────────────────┘
```

Keine Leben, kein Abbruch. Die Aufgabe kommt automatisch in den Wiederholungsplan.

### 2.6 Wiederholung

```
┌──────────────────────────────────┐
│ Wiederholung · 4/7           ✕   │
│ Quelle: Deine Partie vs. xyz,    │  ← bei eigenen Fehlern
│ 12.10.2026, Zug 23               │
├──────────────────────────────────┤
│          [  B R E T T  ]         │
├──────────────────────────────────┤
│ Finde den besseren Zug.          │
│ (Du hast hier Th1?? gespielt.)   │  ← optional ausblendbar
│ [ 💡 Hinweis ]                   │
└──────────────────────────────────┘
```

Gemischt, ohne Themen-Label (Interleaving). Die Bewertung ergibt sich automatisch aus erstem Versuch, Hinweisstufe und Zeit, es gibt keine manuellen „Leicht/Schwer"-Knöpfe.

### 2.7 Analyse – Import

```
┌──────────────────────────────────┐
│ Partien importieren              │
├──────────────────────────────────┤
│ [ 📋 PGN einfügen            ]   │
│ [ 📁 .pgn-Datei wählen       ]   │
│ ──────── online ─────────────    │
│ Chess.com: [Elischa123     ]     │
│ Zeitraum:  [letzte 3 Monate ▾]   │
│ [ ⇣ Partien abrufen ]            │  ← nur aktiv, wenn online
│ Lichess:   [               ]     │
├──────────────────────────────────┤
│ Warteschlange Analyse            │
│ ▓▓▓▓▓▓░░░░  6/10 Partien         │  ← läuft im Hintergrund (Worker)
│ Tiefe: [ 14 ▾ ]   [ Pause ]      │
├──────────────────────────────────┤
│ [Lernen][Wiederh.][Analyse][Stat]│
└──────────────────────────────────┘
```

### 2.8 Partie-Review

```
┌──────────────────────────────────┐
│ vs. xyz · 1-0 · Italienisch C50  │
│ Genauigkeit: Du 78 % · Gegner 71%│
│ Eröff. 91 % │ Mittel 72 │ End 80 │
├──────────────────────────────────┤
│ ╭╮  ╱╲__  Bewertungsgraph ╲╱     │  ← antippen = zu dem Zug springen
├──────────────────────────────────┤
│          [  B R E T T  ]         │
├──────────────────────────────────┤
│ 23. Th1??  Patzer  (+1.2 → −3.4) │
│ Bester Zug: Se4! (Gabel auf d6)  │
│ Du hast eine Springergabel       │
│ verpasst: Se4 greift König und   │
│ Turm gleichzeitig an.            │
│ → Unit C1 Springergabel          │  ← Link in den Lernpfad
│                                  │
│  ◀   [ ⏮ Fehler ] [ Fehler ⏭ ]  ▶ │  ← Sprung von Fehler zu Fehler
└──────────────────────────────────┘
```

Zugliste darunter (scrollbar), Klassen als Farbpunkte: Bester / Gut / Ungenau / Fehler / Patzer.

### 2.9 „Meine Fehler"-Training

```
┌──────────────────────────────────┐
│ Meine Fehler                     │
├──────────────────────────────────┤
│ Fällig heute: 5   Gesamt: 64     │
│ [ Training starten ]             │
├──────────────────────────────────┤
│ Filter:                          │
│ (Alle) (Hängende Figur 18)       │
│ (Gabel verpasst 9) (Mattdrohung 7)│
│ (Eröffnung C50 6) (Endspiel 11)  │
├──────────────────────────────────┤
│ Zuletzt hinzugefügt              │
│ • Zug 23 vs xyz – Gabel verpasst │
│ • Zug 31 vs abc – Figur eingest. │
└──────────────────────────────────┘
```

Dieser Screen ist ein Unterbereich von „Wiederholen". Dort laufen Pfad-Fehler und Partie-Fehler in einer gemeinsamen Warteschlange.

### 2.10 Statistik

```
┌──────────────────────────────────┐
│ Statistik    [30 T ▾]            │
├──────────────────────────────────┤
│ Was kostet dich am meisten?      │
│ Hängende Figuren   ██████ 34 %   │ → B5
│ Mattdrohung überseh.███    18 %  │ → B6
│ Gabel verpasst     ██      11 %  │ → C1
├──────────────────────────────────┤
│ Eröffnungen (Ø Verlust bis Zug 12)│
│ Weiss: Italienisch   ▲ gut       │
│ Schwarz: Sizilianisch ▼ −0.9     │ → F2
├──────────────────────────────────┤
│ Genauigkeit über Zeit  ╱╲╱──╱    │
│ Taktik-Rating je Thema           │
│ Gabel 1150 · Fesselung 980 · …   │
└──────────────────────────────────┘
```

Jede Zeile verlinkt in die passende Unit.

### 2.11 Einstellungen (kurz)

Streak/Kalender an/aus · Brettfarben · Tiefe der Analyse · Stockfish-Stärke · Hinweise „Du hast hier X gespielt" anzeigen · Fortschritt exportieren/importieren (JSON) · Alles löschen.

---

## 3. Eigener Lernpfad

### 3.1 Prinzipien

- **Section** = Niveaustufe (grob ein Rating-Band), **Unit** = ein Konzept, **Lektion** = 3–5 Minuten.
- Jede Unit: **3 Lektionen + 1 Unit-Test** (gemischt, ohne Themen-Label, zum Überspringen direkt machbar).
- Aufbau jeder Lektion:
  1. Konzeptkarte (nur Lektion 1 der Unit ausführlich, danach 1 Satz als Erinnerung)
  2. 1–2 **geführte** Aufgaben (Figur oder Zielfeld markiert)
  3. 3–4 **freie** Aufgaben mit steigendem Puzzle-Rating
  4. 1–2 **unmarkierte** Aufgaben aus früheren Units (Interleaving)
- Jede Section enthält eine **Endspiel-Unit** (Mini-Endspiel gegen Stockfish) und schliesst mit einem **Section-Test**.
- Ratings in Klammern = grobe Zielspanne der verwendeten Lichess-Puzzles.

### 3.2 Struktur

**Section A – Fundament** (Puzzles ≈ 400–700) · *per Einstufung überspringbar*

| Unit | Thema | Aufgabentyp / Lichess-Tags |
|---|---|---|
| A1 | Figuren und Zugregeln | Figur bewegen / Ziel erreichen (eigene Aufgaben) |
| A2 | Schlagen und Figurenwert | „Schlag die ungedeckte Figur" (eigene + `hangingPiece`) |
| A3 | Schach und Schach abwehren (ziehen, schlagen, decken) | eigene Aufgaben |
| A4 | Sonderzüge: Rochade, en passant, Umwandlung | `castling`, `enPassant`, `promotion` |
| A5 | Matt in 1 | `mateIn1` |
| A6 | Patt und Remis erkennen | eigene Aufgaben |
| A-End | König + Dame gegen König mattsetzen | Mini-Endspiel |

**Section B – Matt und Sicherheit** (≈ 600–1000)

| Unit | Thema | Lichess-Tags |
|---|---|---|
| B1 | Grundreihenmatt | `backRankMate` |
| B2 | Mattbilder mit Dame (Kuss-Matt, Korridor) | `mateIn1`, `mateIn2`, Mattmuster-Tags |
| B3 | Ersticktes Matt und Springermatts | `smotheredMate` |
| B4 | Hängende Figuren erkennen | `hangingPiece` |
| B5 | **Was droht?** – Blunder-Check (Schachs, Schlagzüge, Drohungen) | `defensiveMove`, eigene „Rette die Figur"-Aufgaben |
| B6 | Abtausch richtig zählen (angegriffen vs. gedeckt) | `hangingPiece`, `capturingDefender` |
| B7 | Matt in 2 | `mateIn2` |
| B-End | König + Turm gegen König, Quadratregel | Mini-Endspiel + `pawnEndgame` |

**Section C – Doppelangriffe** (≈ 900–1300)

| Unit | Thema | Lichess-Tags |
|---|---|---|
| C1 | Springergabel | `fork` + Springer |
| C2 | Gabeln mit Dame, Bauer, Läufer | `fork` |
| C3 | Fesselung erkennen | `pin` |
| C4 | Fesselung ausnutzen | `pin` |
| C5 | Spiess | `skewer` |
| C6 | Abzugsangriff | `discoveredAttack` |
| C7 | Abzugsschach und Doppelschach | `discoveredCheck`, `doubleCheck` |
| C8 | Batterie und Röntgenangriff | `xRayAttack` |
| C9 | **Gibt es hier etwas?** (gemischt mit ruhigen Stellungen) | gemischt + `equality`, `quietMove` |
| C-End | Opposition, Bauernendspiele | `pawnEndgame`, Mini-Endspiel |

**Section D – Kombinieren** (≈ 1200–1600)

| Unit | Thema | Lichess-Tags |
|---|---|---|
| D1 | Ablenkung | `deflection` |
| D2 | Hinlenkung | `attraction` |
| D3 | Verteidiger beseitigen | `capturingDefender` |
| D4 | Zwischenzug | `intermezzo` |
| D5 | Verstellung und Räumung | `interference`, `clearance` |
| D6 | Gefangene Figur | `trappedPiece` |
| D7 | Opfer für Matt | `sacrifice`, `mateIn3` |
| D8 | Verteidigen unter Druck | `defensiveMove` |
| D-End | Turmendspiele: Lucena und Philidor | `rookEndgame`, Mini-Endspiel |

**Section E – Eröffnung mit Plan** (parallel ab Section B freigeschaltet)

| Unit | Thema | Quelle |
|---|---|---|
| E1 | Eröffnungsprinzipien (Zentrum, Entwicklung, Rochade) | eigene Aufgaben |
| E2 | Frühe Fallen um f2/f7 | `attackingF2F7`, `opening` |
| E3 | **Mein Weiss-Repertoire** | Züge aus deinen importierten Partien + `chess-openings` |
| E4 | **Mein Schwarz-Repertoire** | dito |
| E5 | Typische Taktiken in meinen Eröffnungen | Puzzles mit passendem `OpeningTags` |

Eröffnungs-Units nachspielen: Zugfolge zeigen → selbst nachspielen → nur mit Startstellung nachspielen, mit Spaced Repetition pro Zug.

**Section F – Rechnen und Endspieltechnik** (≈ 1500–1800) – später, Struktur wie D: `long`, `veryLong`, `kingsideAttack`, `zugzwang`, `queenEndgame`, `bishopEndgame`, `knightEndgame`.

> Im Vergleich zu Duolingo: Verteidigung (B5, B6, D8) als eigener Strang, Endspiele in jeder Section, Eröffnungen früh und aus *deinen* Partien statt als Einheitsrepertoire.

### 3.3 Einstufungstest

- Dauer ca. 5–8 Minuten, ca. 15–20 Aufgaben, **adaptiv**: Nach richtig steigt das Puzzle-Rating, nach falsch sinkt es (Treppenverfahren, ähnlich Glicko-Schätzung).
- Drei Blöcke: Regeln (5 schnelle Aufgaben, bei Fehlerfreiheit fertig) → Taktik gemischt → 2–3 Endspiel-Grundaufgaben.
- Optional vorab: aktuelles Chess.com-Rating eingeben, dann startet der Test auf passender Höhe.
- Ergebnis: geschätztes Taktik-Rating, empfohlene Start-Section, alle Units darunter gelten als „übersprungen" (nicht als „gemeistert"). Ihre Aufgaben tauchen gelegentlich in der Wiederholung auf. Wer dort scheitert, bekommt die Unit wieder vorgeschlagen.
- Jeder Unit- und Section-Test kann jederzeit direkt gemacht werden (80 % richtig = bestanden).

---

## 4. Analyse-Logik (Überblick)

Die Details folgen in `03-plan.md`. Hier steht nur so viel, wie zum Prüfen des Konzepts nötig ist.

- **Zugklassifizierung** über den Verlust an Gewinnwahrscheinlichkeit, angelehnt an Lichess (Umrechnung Centipawn → Gewinnchance, Schwellen für Ungenau / Fehler / Patzer). „Bester" = Engine-Zug, „Gut" = kleiner Verlust. Genauigkeit pro Partie und pro Phase (Eröffnung / Mittelspiel / Endspiel nach Material und Zugnummer).
- **Erklär-Engine (Heuristiken, keine KI-API)** – erkennt nach dem besten Zug bzw. nach der Widerlegung:

| Erkannter Fall | Beispielsatz | Unit |
|---|---|---|
| Figur eingestellt | „Nach Th1 hängt dein Läufer auf c4 – er war einmal gedeckt, aber zweimal angegriffen." | B4/B6 |
| Matt verpasst | „Hier gab es Matt in 2: Dh7+ Kf8 Dh8#." | B7 |
| Mattdrohung übersehen | „Schwarz droht Matt auf der Grundreihe (Td1#)." | B1/B5 |
| Gabel verpasst / zugelassen | „Se4 hätte König und Turm gleichzeitig angegriffen." | C1/C2 |
| Fesselung / Spiess | „Der Springer auf f6 ist an die Dame gefesselt." | C3–C5 |
| Abzug | „Nach dem Läuferzug greift dein Turm die Dame an." | C6/C7 |
| Umwandlung | „Der Bauer auf b7 wandelt nach b8 um." | A4 |
| Zwischenzug | „Statt zurückzuschlagen gab es zuerst Schach." | D4 |
| Sonst | „Der beste Zug war Se4 (+1.2). Dein Zug verliert 2.5 Bauerneinheiten." | – |

  Dieselbe Engine läuft beim Build über die Lichess-Puzzles. So bekommt auch **jedes Puzzle** eine Erklärung, und genau das fehlt bei Duolingo.
- **Fehler → Training:** Jeder Fehler/Patzer wird zur Aufgabe „Finde den besseren Zug" (Stellung vor deinem Zug, Lösung = Engine-Zug, gleichwertige Züge innerhalb einer Toleranz akzeptiert). Ab in die FSRS-Warteschlange.

---

## 5. Inhaltsquellen (offline, lizenzsauber)

| Quelle | Lizenz | Verwendung |
|---|---|---|
| Lichess-Puzzle-Datenbank (`lichess_db_puzzle.csv.zst`, Spalten u. a. `FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays, Themes, OpeningTags`) | CC0 | Hauptquelle für Aufgaben. Build-Skript filtert pro Unit nach Tag, Rating-Band, Popularität ≥ 80, NbPlays ≥ 1000, RatingDeviation < 90. Ziel ca. 150–250 Puzzles pro Unit, total ca. 6000–8000, kompakt als JSON ca. 0,5–1 MB (gzip deutlich weniger). |
| Lichess `chess-openings` (TSV: `eco, name, pgn`) | CC0 | Eröffnungsnamen/ECO für Import und Statistik. ✅ Aus der Build-Umgebung erreichbar. |
| Lichess-Themenliste (`puzzleTheme.xml`) | AGPL (lila), nur als Referenz für Tag-Namen genutzt | Mapping Tag → Unit. Die deutschen Texte schreibe ich selbst. |
| Eigene Erklärtexte (Deutsch, CH) | eigene | Konzeptkarten, Hinweise, Erklärsätze-Vorlagen |
| Eigene Aufgaben | eigene | Section A (Regeln) und Spezialfälle (Patt, „Rette die Figur") |

**Technische Lizenzhinweise für Phase 3:**
- `chess.js` – BSD-2, problemlos.
- **Stockfish (WASM)** – GPL-3. Das heisst: Die App muss quelloffen bleiben (öffentliches GitHub-Repo genügt).
- `chessground` (Lichess-Brett) – GPL-3, gleiche Folge. Alternative: eigenes SVG-Brett (siehe Frage 2).
- GitHub Pages kann keine COOP/COEP-Header setzen. Deshalb nutze ich die **Single-Thread-Version** von Stockfish (Lite-Netz, ca. 7 MB), die ohne SharedArrayBuffer läuft. Analyse einer 40-Zug-Partie mit Tiefe ~14 dürfte auf dem Handy im Bereich von 1–3 Minuten liegen, im Worker und ohne UI-Blockade.

---

## 6. Offene Fragen an dich (vor Phase 3)

1. **Puzzle-Daten beschaffen:** `database.lichess.org` ist aus dieser Cloud-Umgebung **gesperrt** (Netzwerk-Policy). Optionen:
   - **a) (Empfohlen)** Ich schreibe das Filter-Skript + eine **GitHub Action**, die die Datenbank herunterlädt, filtert und das Ergebnis ins Repo committet. Läuft auf GitHubs Servern, nichts lokal nötig, später per Knopfdruck neu generierbar.
   - b) Du lässt das Skript einmal lokal laufen und committest die JSON-Datei.
   - c) Du gibst `database.lichess.org` in den Netzwerk-Einstellungen der Umgebung frei.
2. **Brett:** eigenes SVG-Brett (volle Kontrolle über Stil, Pfeile, Markierungen, kleiner) **(Empfehlung)** oder `chessground` (ausgereift, aber grösser und schwerer im eigenen Look anzupassen)?
3. **Dein Niveau:** Wie hoch ist dein Chess.com-Rating (Rapid/Blitz) ungefähr? Die Definition of Done verlangt „die ersten zwei Sections mit echten Inhalten". Falls du bei ca. 800+ stehst, wäre es sinnvoller, **B und C** voll zu befüllen statt A und B (A bekommt dann nur ein Gerüst und den Einstufungstest).
4. **Wiederholungsalgorithmus:** FSRS (moderner, genauer, Bibliothek `ts-fsrs`, MIT) **(Empfehlung)** oder das einfachere SM-2?
5. **Name der App** – „Zugzwang" ok, oder hast du eine Namenskonvention für deine PWA-Familie? Und hast du Farbwerte deines warm-dark/gold-Stils (CSS-Variablen aus einer bestehenden App), damit es exakt passt?
