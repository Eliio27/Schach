# Phase 1 – Analyse des Duolingo-Schachkurses

Stand: Oktober 2026. Ziel dieses Dokuments ist es, **Struktur und Didaktik** des Kurses zu verstehen. Es werden keine Texte, Grafiken, Figuren oder Markennamen in die App übernommen.

## 0. Quellenlage und Methodik

- Recherche über Websuche. Direkte Seitenabrufe (z. B. duolingodata.com, Fandom-Wiki) waren aus der Build-Umgebung durch die Netzwerk-Policy gesperrt. Die Angaben stammen deshalb aus Such-Auszügen dieser Seiten und sind entsprechend markiert.
- Es gibt **keinen offiziellen Lehrplan** von Duolingo. Die Struktur stammt aus Fan-Quellen (duolingodata.com, Duolingo-Fandom-Wiki), Reviews und dem offiziellen Duolingo-Blog.
- Wo Quellen sich widersprechen, sind beide Werte angegeben.

## 1. Kursstruktur

### 1.1 Sections, Units, Elo-Ziele

| Section | Units (duolingodata, 199-Unit-Version) | Units (Fandom-Wiki) | Elo-Band | Schwerpunkt |
|---|---|---|---|---|
| 1 | 6 | 6 (früher 4) | ~100 → 200 | Regeln, Figurenbewegung, Schlagen, Schach, Matt, Spielstart |
| 2 | 25 | 28 (früher 24) | 200 → 500 | Figurenwert, Abtausch, Bauernrennen, Grundtaktik |
| 3 | 24 | 24 | 500 → 800 | Spiesse, Entfesseln, weitere Taktik |
| 4 | 24 | 24 | 800 → 1000 | Taktik-Kombinationen, Endspiel-Grundlagen |
| 5 | 24 | 24 | 1000 → 1100 | u. a. Verstellung (Interference), Zwischenzug |
| 6 | 48 | 48 (früher 24) | 1100 → 1200 | Eröffnungsrepertoire, Abzug, Springer, Angriffstaktik |
| 7 | 48 | 48 | 1200 → 1500 | Turm-/Damen-Endspiele, Läufer-/Springer-Endspiele, längere Mattführungen, Positionsspiel |
| **Total** | **199** | **202** | | |

Die Summe 6 + 25 + 24 + 24 + 24 + 48 + 48 = 199 bestätigt die duolingodata-Version. Das Wiki führt eine neuere Variante mit mehr Units in Section 2. Duolingo selbst gibt als Kursziel „etwa 1500 Elo" an. Die Elo ist intern und nicht mit Chess.com oder FIDE vergleichbar.

### 1.2 Bekannte Unit-Reihenfolge in Section 2 (Auszug, duolingodata)

| Unit | Thema |
|---|---|
| 7 | Gabeln |
| 9 | Absolute Fesselung |
| 13 | Fesselungen ausnutzen |
| 14 | Ersticktes Matt und Spiesse |
| 16 | Abzugsangriff und Doppelangriff |
| 17 | Abzugsschach und Doppelschach |
| weitere | Figurenwert, Abtausch, Bauernrennen/Umwandlung, „häufige Endspiele" |

Units 18–25 waren in den Quellen nicht sichtbar. Die Batterie (aus deinem Brief) konnte ich nicht als eigene Unit belegen. Der Zwischenzug taucht laut einem Erfahrungsbericht erst in **Section 5** auf, nicht in Section 2.

### 1.3 Beobachtete Themen-Reihenfolge (Zusammenfassung)

1. Figuren und Regeln (Zug, Schlagen, Schach, Matt, Rochade, en passant, Umwandlung)
2. Material: Figurenwert, Abtausch
3. Einfache Matt-Muster (Grundreihe, ersticktes Matt)
4. Doppelangriffe: Gabel → Fesselung → Spiess → Abzug → Doppelschach
5. Fortgeschrittene Taktik: Ablenkung, Lenkung, Verstellung, Zwischenzug
6. Eröffnungen (spät, erst ab Section 6; ein Blog-Update spricht von neuen Eröffnungslektionen, die genaue Position ist unklar)
7. Endspieltechnik und längere Mattführungen (Section 7)

**Beobachtung:** Eröffnungen kommen sehr spät, Endspiele grösstenteils erst am Schluss. Verteidigung („Was droht mir?") ist kein eigener Strang.

## 2. Übungstypen

| Typ | Beschreibung |
|---|---|
| **Theorie-Lektion** | Ein Coach-Charakter erklärt ein Konzept in Sprechblasen, dazwischen einige Brettübungen. |
| **Geführte Züge** | „Zieh den Läufer hierhin". Zielfeld oder Figur vorgegeben. |
| **Bester Zug / Puzzle** | Stellung, finde den besten Zug, ähnlich wie Lichess-Puzzles. Im Pfad mit einem eigenen Symbol (Hantel) markiert, entspricht den Übungslektionen der Sprachkurse. |
| **Matt in N** | Offene Aufgaben wie „Finde Matt in 2". |
| **Mini-Matches** | Wenige Minuten. Kurze Drills für Endspiele und Mattführungen gegen die KI, oft aus einer vorgegebenen Stellung. |
| **Volle Partie gegen KI-Coach** | Ganze Partie, laut Chess.com-Review mit 20-Minuten-Bedenkzeit. Matches sind zum Weiterkommen verpflichtend. |
| **PvP** | Partien gegen andere Lernende, angekündigt an der Duocon 2025, inzwischen ausgerollt. |
| **Game Review** (neu) | Nach jeder Partie: bis zu 9 Schlüsselmomente in drei Kategorien (starke Züge, verpasste Chancen, Fehler). Verpasste Chancen werden zu Wiederholungsübungen, Fehler werden kurz erklärt (Fesselung, übersehene Drohung …). |

**Verhältnis:** ca. 75 % Puzzles, 25 % Mini- und volle Matches.

**Aufbau einer Lektion:** ca. 5 Minuten, einige Brettaufgaben. Steigerung innerhalb einer Unit von geführt („zieh hierhin") zu offen („finde Matt in 2"). Die genaue Zahl der Aufgaben pro Lektion war nicht belegbar. Bei den Sprachkursen sind es typischerweise 10–15 Übungen, beim Schach scheinen es weniger und dafür längere Aufgaben zu sein.

## 3. Didaktische Mechanik

| Mechanik | Umsetzung bei Duolingo |
|---|---|
| **Einstufung** | Beim Start wählt man selbst das Niveau. Ein Elo-basierter Einstufungstest ist laut einem Guide „geplant", aber nicht bestätigt. Der „Hier einsteigen?"-Sprungtest der Sprachkurse ist für Schach nicht belegt. |
| **Rating** | Die Elo steigt nur durch Matches (KI oder PvP). Nutzer berichten, dass sie deutlich über dem Chess.com-Rating liegt. |
| **Konzepteinführung** | Erklärung durch den Coach → geführte Züge → offene Aufgabe → Mini-Match → volle Partie. |
| **Fehlerbehandlung** | Ein falscher Zug wird gespielt, und der Gegner reagiert wie in einer echten Partie (zeigt also die Widerlegung). Bei wiederholten Fehlern erscheint ein Pfeil mit dem Lösungszug. Legale, aber nicht beste Züge bekommen einen Hinweis „nicht falsch, aber nicht der beste". |
| **Hinweise** | Pro Lektion verfügbar. Eine Stufung ist nicht dokumentiert, praktisch geht es von „nichts" zum Pfeil mit der Lösung. |
| **Wiederholung** | App-weite Übungsfunktion. Seit Game Review werden verpasste Chancen aus eigenen Matches zu Übungen. Ein Spaced-Repetition-Plan für falsch gelöste Puzzles ist nicht belegt. |
| **Steigerung** | Linear über den Pfad. Die KI wird laut Nutzern ab ca. 900 Elo sprunghaft deutlich stärker. |

## 4. Gamification

| Element | Umsetzung |
|---|---|
| **Streak** | App-weit, Tageszähler mit Erinnerungen und „Streak Freeze" (Gems). |
| **XP und Ligen** | XP pro Lektion, wöchentliche Ligen mit Auf-/Abstieg. Gilt auch für Schach. |
| **Gems / Shop** | Währung für Freezes, Energie-Refills usw. |
| **Herzen → Energie** | Seit 2025 ersetzt ein Energiesystem die Herzen: 25 Einheiten, jede Übung kostet 1, **egal ob richtig oder falsch**. Auffüllen über Serien richtiger Antworten, Werbung, Gems oder Übungen (je nach Testgruppe). Gratis-Nutzer schaffen laut Reviews oft nur 2–3 Lektionen am Stück. |
| **Paywall** | Der Schachkurs selbst ist gratis. Super/Max entfernen Werbung und Energielimit (ca. 13 USD/Monat). |
| **Maskottchen** | Der KI-Coach kommentiert, erklärt und behauptet bei eigenen Patzern, das sei Absicht gewesen. |
| **Benachrichtigungen** | App-weite, bekannt aggressive Push-Erinnerungen an den Streak. |
| **Interne Elo** | Wirkt als Motivationsanzeige, ist aber aufgebläht. |

## 5. Bekannte Kritik (Nutzer und Reviews)

1. **Kein „Warum".** Der Kurs setzt bewusst auf Lösen statt Lesen (Duolingo-Ankündigung: Fähigkeiten durch aktives Puzzle-Lösen statt langer Erklärungen). Kritiker bemängeln, dass man nach einem Puzzle nicht sieht, *warum* der Zug richtig war, und Aufgaben nicht nachträglich anschauen kann. Game Review hat das für Matches teilweise verbessert, für Puzzles nicht.
2. **Decke bei ca. 1300–1500.** Ein ca. 1400er Spieler fand den Kurs „deutlich weniger hilfreich als andere Gratis-Ressourcen". Ein anderer Rezensent: „Wer kein Anfänger ist, ist hier falsch." Duolingo bestätigt, dass Anfänger die Zielgruppe sind.
3. **Qualität der Puzzles.** Ein Test von 885 Puzzles (Juli 2026, Substack „learnthroughstories") fand rund 24 % unsinnige Aufgaben, darunter Lektionen, deren Titel nicht zum Inhalt passt. *(Nur aus Such-Auszügen, Originaltext nicht abrufbar.)*
4. **Schwierigkeitssprung der KI** ab ca. 900 Elo („nicht mehr schlagbar"), vorher teils absichtliche Patzer.
5. **Coach-Kommentare** werden als nervig empfunden, sie kosten Zeit.
6. **Energiesystem** begrenzt das Üben, auch bei richtigen Antworten. Chess.com-Forenthread: „Das Energie-Konzept ist kein guter Weg zu lernen."
7. **Aufgeblähte Elo** vermittelt ein falsches Bild des eigenen Niveaus.
8. **Keine eigenen Partien.** Game Review analysiert nur Duolingo-Matches. Partien von Chess.com/Lichess lassen sich nicht importieren.
9. **Wenig Endspiel, späte Eröffnungen.** Endspiele erst gegen Schluss, Eröffnungen ab Section 6.

## 6. Erkenntnisse für Phase 2

- Das **Grundgerüst** ist didaktisch solide: ein Konzept pro Unit, Steigerung von geführt zu frei, Widerlegung auf dem Brett, kurze Einheiten.
- Die **Schwächen** sind genau die Punkte aus dem Briefing: kein „Warum", kein Lernen aus eigenen Partien, keine echte Wiederholungsplanung für Puzzles, Gamification, die das Üben eher bremst (Energie) als fördert.
- Ein weiterer, weniger offensichtlicher Punkt: Puzzles innerhalb einer thematischen Unit **verraten das Motiv** („Unit: Gabeln" → es ist eine Gabel). In echten Partien fehlt dieser Hinweis. Ohne gemischtes Üben überträgt sich die Mustererkennung schlecht.
- Verteidigung („Was will der Gegner?") fehlt als eigener Strang. Gerade das kostet im Bereich 800–1500 die meisten Punkte.

## Quellen

- [Duolingodata: Chess from English 199 Units](https://duolingodata.com/dat/chfen199v2.html) (via Such-Auszug)
- [Duolingo Fandom Wiki: Chess](https://duolingo.fandom.com/wiki/Chess) (via Such-Auszug)
- [Duolingo Blog: Chess course](https://blog.duolingo.com/chess-course)
- [Duolingo Blog: Introducing Chess Game Review](https://blog.duolingo.com/chess-game-review/)
- [Duolingo Blog: Product highlights](https://blog.duolingo.com/product-highlights/)
- [Duolingo: What is Elo in chess?](https://www.duolingo.com/chess/terms/what-is-elo-in-chess)
- [David William Rosales: Duolingo's Chess Course is Useless for Non-Beginners](https://davidwilliamrosales.com/2025/08/18/duolingo-chess-review/)
- [Giving it a Joe: I spent 200 days learning chess on Duolingo](https://givingitajoe.co.uk/learning/learning-chess-on-duolingo/)
- [Chess.com Blog: Duolingo Seeks To Benefit From Growing Worldwide Interest In Chess](https://www.chess.com/blog/raync910/duolingo-chess-review)
- [Chessdrive: Duolingo Chess – What It Teaches and Its Real Ceiling](https://chessdrive.io/blog/duolingo-chess-what-it-teaches-and-where-it-stops)
- [Oldschoolchess: Duolingo Chess Review 2026](https://oldschoolchess.com/compare/duolingo-chess-review)
- [Learnthroughstories: I Tested 885 Duolingo Chess Puzzles. 24% Do Not Make Sense.](https://learnthroughstories.substack.com/p/i-tested-885-duolingo-chess-puzzles)
- [Duolingoguides: Duolingo Chess Course Explained (2026)](https://duolingoguides.com/duolingo-chess-course-explained/)
- [Entrepreneur: Duolingo introduces a chess course](https://www.entrepreneur.com/business-news/duolingo-introduces-a-chess-course-for-all-skill-levels/490406)
- [Matthew Sadler: Grandmaster vs Duolingo (or Oscar!)](https://matthewsadler.me.uk/attack/grandmaster-vs-duolingo-or-oscar/)
- [Duoplanet: Duolingo Energy System](https://duoplanet.com/duolingo-energy-system/)
- [Chess.com Forum: The Duolingo energy concept is not a good way to learn](https://www.chess.com/forum/view/off-topic/the-duolingo-energy-concept-is-not-a-good-way-to-learn)
- [Chess.com Forum: wat's duolingo rating](https://www.chess.com/forum/view/general/wats-duolingo-rating)
