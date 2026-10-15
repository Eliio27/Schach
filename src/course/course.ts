/**
 * Lernpfad „Zugzwang" – Sections, Units, Konzepttexte und eigene Aufgaben.
 * Puzzles kommen aus der Lichess-Datenbank (CC0) und werden über Tags zugeordnet.
 * Alle Texte sind eigene Formulierungen (Deutsch, Schweizer Rechtschreibung).
 */
import type { Puzzle } from '../puzzles/pool';
import { firstSolverPiece } from '../puzzles/pool';
import type { CustomTask, EndgameTask, ReachTask, Section, Unit } from './types';

export const SECTIONS: Section[] = [
  { id: 'A', title: 'Fundament', band: '≈ 400–700', intro: 'Regeln, Figurenwert, erste Mattbilder. Per Einstufung überspringbar.' },
  { id: 'B', title: 'Matt und Sicherheit', band: '≈ 600–1000', intro: 'Mattmuster erkennen – und die eigenen Figuren nicht einstellen.' },
  { id: 'C', title: 'Doppelangriffe', band: '≈ 900–1300', intro: 'Gabel, Fesselung, Spiess, Abzug: eine Figur, zwei Drohungen.' },
  { id: 'D', title: 'Kombinieren', band: '≈ 1200–1600', intro: 'Ablenken, Hinlenken, Zwischenzüge – Motive verknüpfen.' },
  { id: 'E', title: 'Eröffnung mit Plan', band: 'parallel', intro: 'Prinzipien, Fallen und dein eigenes Repertoire.', parallel: true },
  { id: 'F', title: 'Rechnen und Technik', band: '≈ 1400–1800', intro: 'Längere Varianten, Königsangriff, Endspieltechnik.' },
];

const reach = (id: string, fen: string, target: string, prompt: string, explain: string): ReachTask => ({
  kind: 'reach',
  id,
  fen,
  target,
  prompt,
  explain,
});
const collect = (id: string, fen: string, prompt: string, explain: string): ReachTask => ({
  kind: 'reach',
  id,
  fen,
  collect: true,
  prompt,
  explain,
});
const custom = (t: Omit<CustomTask, 'kind'>): CustomTask => ({ kind: 'custom', ...t });
const endgame = (t: Omit<EndgameTask, 'kind'>): EndgameTask => ({ kind: 'endgame', ...t });

const isKnight = (p: Puzzle) => firstSolverPiece(p) === 'n';

export const UNITS: Unit[] = [
  /* ===================== Section A – Fundament ===================== */
  {
    id: 'A1',
    section: 'A',
    title: 'Figuren und Zugregeln',
    short: 'Wie jede Figur zieht',
    type: 'custom',
    band: [400, 600],
    concept: {
      title: 'So ziehen die Figuren',
      text: [
        'Turm: beliebig weit gerade. Läufer: beliebig weit schräg. Dame: beides.',
        'Springer: im „L" (zwei Felder gerade, eins zur Seite) – er springt über andere Figuren.',
        'König: ein Feld in jede Richtung. Bauer: ein Feld vorwärts (vom Startfeld auch zwei), geschlagen wird schräg.',
      ],
      example: { fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', moves: ['d4f5', 'f5e7', 'e7c8'], caption: 'Der Springer springt im L.' },
    },
    tasks: [
      reach('A1-1', '8/8/8/8/8/8/8/R7 w - - 0 1', 'h8', 'Bring den Turm nach h8.', 'Der Turm zieht gerade – zwei Züge genügen: a8 und h8 (oder h1 und h8).'),
      collect('A1-2', '8/1p6/8/8/8/8/1p5p/R7 w - - 0 1', 'Schlag mit dem Turm alle Bauern.', 'Gerade Linien – plane die Reihenfolge so, dass kein Zug verloren geht.'),
      collect('A1-3', '8/8/3p4/6p1/8/4p3/8/2B5 w - - 0 1', 'Schlag mit dem Läufer alle Bauern.', 'Der Läufer bleibt immer auf seiner Feldfarbe.'),
      collect('A1-4', '8/2p3p1/8/8/5p2/8/8/3Q4 w - - 0 1', 'Schlag mit der Dame alle Bauern.', 'Die Dame verbindet Turm und Läufer – gerade und schräg.'),
      reach('A1-5', '8/8/8/8/8/8/8/1N6 w - - 0 1', 'f7', 'Bring den Springer nach f7.', 'Springerwege muss man üben: Jeder Sprung wechselt die Feldfarbe.'),
      collect('A1-6', '8/8/8/3p4/8/2p5/8/1N6 w - - 0 1', 'Schlag mit dem Springer beide Bauern.', 'Sc3 und Sxd5 – der Springer springt von Ziel zu Ziel.'),
      reach('A1-7', '8/8/8/8/8/8/8/K7 w - - 0 1', 'h8', 'Bring den König nach h8.', 'Der König zieht ein Feld, auch schräg – die Diagonale ist der kürzeste Weg.'),
      reach('A1-8', '8/8/8/8/8/8/4P3/8 w - - 0 1', 'e8', 'Bring den Bauern nach e8.', 'Vom Startfeld darf der Bauer zwei Felder ziehen. Auf der letzten Reihe wird er umgewandelt.'),
    ],
  },
  {
    id: 'A2',
    section: 'A',
    title: 'Schlagen und Figurenwert',
    short: 'Was ist eine Figur wert?',
    type: 'mixed',
    tags: ['hangingPiece'],
    band: [400, 750],
    hint1: 'Welche gegnerische Figur ist ungedeckt?',
    concept: {
      title: 'Figurenwert',
      text: [
        'Bauer 1, Springer 3, Läufer 3, Turm 5, Dame 9. Der König ist unbezahlbar.',
        'Eine Figur ist „ungedeckt", wenn keine gegnerische Figur zurückschlagen kann. Ungedeckte Figuren sind gratis.',
        'Schlage eine gedeckte Figur nur, wenn sie mehr wert ist als deine.',
      ],
      example: { fen: '4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1', moves: ['d1d5'], caption: 'Der Springer war ungedeckt.' },
    },
    tasks: [
      custom({
        id: 'A2-1',
        fen: '4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1',
        prompt: 'Schlag die ungedeckte Figur.',
        solution: ['d1d5'],
        explain: 'Dxd5 – niemand kann zurückschlagen, du gewinnst einen Springer (3).',
      }),
      custom({
        id: 'A2-2',
        fen: '4k3/8/p7/1p1r4/8/2N5/8/4K3 w - - 0 1',
        prompt: 'Welche Figur schlägst du?',
        solution: ['c3d5'],
        explain: 'Sxd5 gewinnt einen ungedeckten Turm (5). Der Bauer auf b5 wäre durch a6 gedeckt.',
      }),
      custom({
        id: 'A2-3',
        fen: '4k3/8/4p3/3q4/8/1B6/8/4K3 w - - 0 1',
        prompt: 'Gewinne Material.',
        solution: ['b3d5'],
        explain: 'Lxd5: Die Dame (9) ist zwar gedeckt, aber nach exd5 hast du 9 für 3 getauscht.',
      }),
      custom({
        id: 'A2-4',
        fen: '4k3/2p5/3p4/8/6n1/8/8/3QK3 w - - 0 1',
        prompt: 'Gewinne Material – aber sicher.',
        solution: ['d1g4'],
        explain: 'Dxg4 nimmt den ungedeckten Springer. Dxd6? wäre ein Fehler: cxd6 und die Dame ist weg.',
      }),
    ],
  },
  {
    id: 'A3',
    section: 'A',
    title: 'Schach abwehren',
    short: 'Ziehen, schlagen, dazwischen',
    type: 'custom',
    band: [400, 700],
    concept: {
      title: 'Drei Wege aus dem Schach',
      text: [
        'Steht dein König im Schach, musst du es sofort abwehren:',
        '1. Den König wegziehen. 2. Die angreifende Figur schlagen. 3. Eine Figur dazwischenstellen.',
        'Gegen ein Springerschach hilft kein Dazwischenstellen – Springer springen.',
      ],
      example: { fen: '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1', moves: ['e1f2'], caption: 'Der König weicht dem Springerschach aus.' },
    },
    tasks: [
      custom({
        id: 'A3-1',
        fen: '4k3/8/8/8/8/8/3q4/4K3 w - - 0 1',
        prompt: 'Wehre das Schach ab und gewinne dabei Material.',
        solution: ['e1d2'],
        explain: 'Kxd2 – die Dame war ungedeckt. Schlagen ist oft die beste Abwehr.',
      }),
      custom({
        id: 'A3-2',
        fen: '4k3/8/8/8/8/4N3/5PPP/r5K1 w - - 0 1',
        prompt: 'Dein König kann nicht weg. Wehre das Schach ab.',
        solution: ['e3f1'],
        explain: 'Sf1 stellt sich dazwischen und ist vom König gedeckt. Nach Sd1? würde Txd1 matt setzen.',
      }),
      custom({
        id: 'A3-3',
        fen: '4r1k1/8/8/b7/8/2n4b/8/4K3 w - - 0 1',
        prompt: 'Nur ein Feld ist sicher. Zieh den König dorthin.',
        solution: ['e1f2'],
        explain: 'Kf2. d2 deckt der Läufer a5, d1 der Springer, f1 der Läufer h3.',
      }),
      custom({
        id: 'A3-4',
        fen: '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1',
        prompt: 'Springerschach! Wehre es ab.',
        solution: ['e1e2'],
        alts: ['e1d1', 'e1f1', 'e1f2'],
        explain: 'Gegen den Springer hilft nur Wegziehen (oder Schlagen). Dazwischenstellen geht nicht.',
      }),
      custom({
        id: 'A3-5',
        fen: '4k3/8/8/8/8/R2n4/8/4K3 w - - 0 1',
        prompt: 'Wehre das Schach ab – am besten mit Gewinn.',
        solution: ['a3d3'],
        explain: 'Txd3 schlägt den Springer, der Schach gibt.',
      }),
      custom({
        id: 'A3-6',
        fen: '4r1k1/8/8/8/8/3B4/8/4K3 w - - 0 1',
        prompt: 'Stell eine Figur dazwischen – aber eine gedeckte.',
        solution: ['d3e2'],
        explain: 'Le2: Der Läufer blockt das Schach und ist vom König gedeckt. Le4? würde einfach geschlagen.',
      }),
      custom({
        id: 'A3-7',
        fen: '4k3/8/8/8/8/5N2/3q4/4K3 w - - 0 1',
        prompt: 'Die Dame gibt Schach. Wehre ab und gewinne sie.',
        solution: ['f3d2'],
        alts: ['e1d2'],
        explain: 'Sxd2 (oder Kxd2) – die Dame stand ungedeckt direkt neben dem König.',
      }),
    ],
  },
  {
    id: 'A4',
    section: 'A',
    title: 'Sonderzüge',
    short: 'Rochade, en passant, Umwandlung',
    type: 'mixed',
    tags: ['castling', 'enPassant', 'promotion'],
    band: [400, 900],
    hint1: 'Denk an die Sonderregeln: Rochade, en passant, Umwandlung.',
    concept: {
      title: 'Sonderzüge',
      text: [
        'Rochade: König zwei Felder Richtung Turm, der Turm springt daneben. Nur wenn beide noch nicht gezogen haben, nichts dazwischen steht und der König nicht durch Schach zieht.',
        'En passant: Zieht ein gegnerischer Bauer zwei Felder neben deinen Bauern, darfst du ihn im nächsten Zug so schlagen, als wäre er nur ein Feld gezogen.',
        'Umwandlung: Ein Bauer auf der letzten Reihe wird zu Dame, Turm, Läufer oder Springer.',
      ],
      example: { fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', moves: ['e1g1', 'e8c8'], caption: 'Kurze Rochade (Weiss), lange Rochade (Schwarz).' },
    },
    tasks: [
      custom({
        id: 'A4-1',
        fen: 'r3k2r/pppq1ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPPQ1PPP/R3K2R w KQkq - 0 1',
        prompt: 'Bring den König mit der kurzen Rochade in Sicherheit.',
        solution: ['e1g1'],
        explain: 'O-O: König nach g1, Turm nach f1.',
      }),
      custom({
        id: 'A4-2',
        fen: 'r3k2r/pppq1ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPPQ1PPP/R3K2R w KQkq - 0 1',
        prompt: 'Mach die lange Rochade.',
        solution: ['e1c1'],
        explain: 'O-O-O: König nach c1, Turm nach d1.',
      }),
      custom({
        id: 'A4-3',
        fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1',
        setup: 'd7d5',
        prompt: 'Schwarz hat d7–d5 gespielt. Schlag en passant.',
        solution: ['e5d6'],
        explain: 'exd6 e.p. – der Bauer landet auf d6, der schwarze Bauer auf d5 verschwindet.',
      }),
      custom({
        id: 'A4-4',
        fen: '8/1k2P3/8/8/8/8/8/4K3 w - - 0 1',
        prompt: 'Wandle den Bauern in eine Dame um.',
        solution: ['e7e8q'],
        explain: 'e8=D – aus einem Bauern (1) wird eine Dame (9).',
      }),
      custom({
        id: 'A4-5',
        fen: '3r4/4P3/8/8/k7/8/8/4K3 w - - 0 1',
        prompt: 'Wandle um – aber so, dass die neue Dame nicht verloren geht.',
        solution: ['e7d8q'],
        explain: 'exd8=D schlägt den Turm und wandelt gleichzeitig um. Nach e8=D? würde Txe8 folgen.',
      }),
    ],
  },
  {
    id: 'A5',
    section: 'A',
    title: 'Matt in 1',
    short: 'Den König fangen',
    type: 'puzzle',
    tags: ['mateIn1'],
    band: [400, 900],
    hint1: 'Prüfe zuerst alle Schachgebote.',
    concept: {
      title: 'Schachmatt',
      text: [
        'Matt ist ein Schach, das man nicht abwehren kann: Der König kann nicht weg, der Angreifer nicht geschlagen und nichts dazwischengestellt werden.',
        'Suche Matt immer zuerst bei den Schachgeboten. Frag dich: Wohin kann der König fliehen?',
      ],
      example: { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', moves: ['a1a8'], caption: 'Die eigenen Bauern sperren den König ein.' },
    },
  },
  {
    id: 'A6',
    section: 'A',
    title: 'Matt statt Patt',
    short: 'Patt erkennen und vermeiden',
    type: 'custom',
    band: [400, 700],
    concept: {
      title: 'Patt ist Remis',
      text: [
        'Patt: Wer am Zug ist, steht nicht im Schach, hat aber keinen legalen Zug. Die Partie endet unentschieden.',
        'Gerade mit viel Material passiert das schnell. Prüfe vor jedem Zug: Hat der Gegner danach noch einen Zug?',
      ],
      example: { fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', moves: ['f1f7'], caption: 'Df7?? ist Patt – Schwarz hat keinen Zug, steht aber nicht im Schach.' },
    },
    tasks: [
      custom({
        id: 'A6-1',
        fen: '7k/8/6K1/8/8/8/8/5Q2 w - - 0 1',
        prompt: 'Setze matt – Vorsicht vor Patt!',
        solution: ['f1f8'],
        accept: 'mate',
        explain: 'Df8# (oder Dc8#). Df7?? wäre Patt.',
      }),
      custom({
        id: 'A6-2',
        fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1',
        prompt: 'Setze matt in einem Zug.',
        solution: ['c1c8'],
        accept: 'mate',
        explain: 'Dc8# – der König auf b6 deckt a7 und b7. Dc7?? wäre Patt.',
      }),
      custom({
        id: 'A6-3',
        fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
        prompt: 'Setze matt mit dem Turm.',
        solution: ['h1h8'],
        accept: 'mate',
        explain: 'Th8# – der König hilft, der Turm gibt Schach auf der Grundreihe.',
      }),
      custom({
        id: 'A6-4',
        fen: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1',
        prompt: 'Setze matt mit den beiden Türmen.',
        solution: ['b1b8'],
        accept: 'mate',
        explain: 'Tb8# – der Turm auf a7 sperrt die 7. Reihe, der andere gibt Matt („Treppenmatt").',
      }),
      custom({
        id: 'A6-5',
        fen: '5k2/8/5K2/8/8/8/8/3Q4 w - - 0 1',
        prompt: 'Setze matt in einem Zug.',
        solution: ['d1d8'],
        accept: 'mate',
        explain: 'Dd8# – e7, f7 und g7 deckt dein König, die Dame die 8. Reihe.',
      }),
      custom({
        id: 'A6-6',
        fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
        prompt: 'Setze matt in einem Zug.',
        solution: ['f7g7'],
        accept: 'mate',
        explain: 'Dg7#, Dh7#, Df8# und De8# setzen matt – dein König deckt g7 und h7. Vorsicht: Df6+ ist kein Matt, der König entkommt nach g8.',
      }),
    ],
  },
  {
    id: 'A-End',
    section: 'A',
    title: 'Endspiel: Dame gegen König',
    short: 'Mattsetzen mit der Dame',
    type: 'endgame',
    band: [0, 0],
    concept: {
      title: 'Dame und König gegen König',
      text: [
        'Mit der Dame engst du den König Reihe für Reihe ein: Sie steht einen Springerzug vom König entfernt und folgt ihm.',
        'Sitzt der König am Rand, kommt dein König zu Hilfe. Erst dann gibt die Dame Matt.',
        'Achtung Patt: Lass dem gegnerischen König immer mindestens ein Feld, solange du nicht mattsetzt.',
      ],
    },
    endgames: [
      endgame({
        id: 'A-End-1',
        fen: '8/8/8/3k4/8/8/8/3QK3 w - - 0 1',
        goal: 'mate',
        maxMoves: 30,
        prompt: 'Setze matt (höchstens 30 Züge).',
        explain: 'Einengen, König holen, mattsetzen – und dabei nie Patt.',
        idea: 'Stell die Dame einen Springerzug vom gegnerischen König entfernt hin.',
      }),
    ],
  },

  /* ===================== Section B – Matt und Sicherheit ===================== */
  {
    id: 'B1',
    section: 'B',
    title: 'Grundreihenmatt',
    short: 'Eingesperrt hinter den Bauern',
    type: 'puzzle',
    tags: ['backRankMate'],
    band: [600, 1100],
    concept: {
      title: 'Grundreihenmatt',
      text: [
        'Der rochierte König wird von seinen eigenen Bauern eingesperrt. Ein Turm oder die Dame auf der Grundreihe setzt matt.',
        'Selbst schützen: ein „Luftloch" (z. B. h3 oder g3) oder eine Figur, die die Grundreihe deckt.',
      ],
      example: { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', moves: ['d1d8'], caption: 'Td8# – g8 ist von den eigenen Bauern umstellt.' },
    },
  },
  {
    id: 'B2',
    section: 'B',
    title: 'Mattbilder',
    short: 'Arabisch, Anastasia, Haken …',
    type: 'puzzle',
    tags: ['arabianMate', 'anastasiaMate', 'hookMate', 'dovetailMate', 'bodenMate', 'doubleBishopMate'],
    band: [600, 1300],
    concept: {
      title: 'Mattbilder',
      text: [
        'Viele Matts folgen festen Mustern. Wer sie kennt, sieht sie in Sekunden.',
        'Typisch: Turm und Springer in der Ecke (Arabisch), Springer und Turm am Rand (Anastasia), zwei Läufer auf Kreuz-Diagonalen (Boden).',
      ],
      example: { fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', moves: ['b7h7'], caption: 'Arabisches Matt: Der Springer deckt den Turm und g8.' },
    },
  },
  {
    id: 'B3',
    section: 'B',
    title: 'Ersticktes Matt',
    short: 'Der Springer in der Ecke',
    type: 'puzzle',
    tags: ['smotheredMate'],
    band: [600, 1400],
    concept: {
      title: 'Ersticktes Matt',
      text: [
        'Der König ist von eigenen Figuren umstellt – ein Springer gibt Schach, und es gibt kein Fluchtfeld.',
        'Oft geht ein Damenopfer voraus, damit ein Turm das letzte freie Feld zustellt.',
      ],
      example: { fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', moves: ['h6f7'], caption: 'Sf7# – der König erstickt in der Ecke.' },
    },
  },
  {
    id: 'B4',
    section: 'B',
    title: 'Hängende Figuren',
    short: 'Ungedeckt = gratis',
    type: 'puzzle',
    tags: ['hangingPiece'],
    band: [600, 1100],
    hint1: 'Zähle bei jeder gegnerischen Figur: Wie oft angegriffen, wie oft gedeckt?',
    concept: {
      title: 'Hängende Figuren',
      text: [
        'Eine Figur „hängt", wenn sie öfter angegriffen als gedeckt ist – oder gar nicht gedeckt.',
        'Vor jedem Zug: Hängt nach meinem Zug etwas von mir? Und hängt beim Gegner etwas?',
      ],
      example: { fen: 'r3k3/8/8/8/8/8/8/R3K3 w - - 0 1', moves: ['a1a8'], caption: 'Txa8+ – der Turm war ungedeckt.' },
    },
  },
  {
    id: 'B5',
    section: 'B',
    title: 'Was droht?',
    short: 'Blunder-Check vor jedem Zug',
    type: 'puzzle',
    tags: ['defensiveMove'],
    band: [600, 1200],
    hint1: 'Was will dein Gegner? Prüfe seine Schachs, Schlagzüge und Drohungen.',
    concept: {
      title: 'Was droht?',
      text: [
        'Die meisten Partien bis 1500 gehen durch übersehene Drohungen verloren – nicht durch verpasste Kombinationen.',
        'Checkliste nach jedem Zug des Gegners: Welche Schachs hat er? Welche Schlagzüge? Was droht er im nächsten Zug?',
        'Erst danach suchst du deinen eigenen Plan.',
      ],
      example: {
        fen: '3r2k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
        moves: ['h2h3'],
        caption: 'Schwarz droht Td1#. h3 schafft ein Luftloch.',
      },
    },
  },
  {
    id: 'B6',
    section: 'B',
    title: 'Verteidiger beseitigen',
    short: 'Erst den Beschützer schlagen',
    type: 'puzzle',
    tags: ['capturingDefender'],
    band: [700, 1200],
    concept: {
      title: 'Verteidiger beseitigen',
      text: [
        'Ist eine Figur nur einmal gedeckt, schlage zuerst den Verteidiger. Danach hängt die Figur.',
        'Zähle Angreifer und Verteidiger – und tausche so, dass am Ende du mehr Material hast.',
      ],
      example: { fen: '4k3/8/1n6/B2r4/8/8/8/3RK3 w - - 0 1', moves: ['a5b6'], caption: 'Lxb6 – jetzt ist der Turm auf d5 ungedeckt.' },
    },
  },
  {
    id: 'B7',
    section: 'B',
    title: 'Matt in 2',
    short: 'Zwei Züge vorausdenken',
    type: 'puzzle',
    tags: ['mateIn2'],
    band: [700, 1200],
    hint1: 'Prüfe alle Schachs – auch solche, die Material kosten.',
    concept: {
      title: 'Matt in 2',
      text: [
        'Der erste Zug zwingt den Gegner (oft ein Schach oder Opfer), der zweite setzt matt.',
        'Frag dich: Welches Feld fehlt mir für ein Matt? Wie zwinge ich den König oder eine Figur dorthin?',
      ],
      example: {
        fen: '2r3k1/5ppp/8/8/8/8/4RPPP/4R1K1 w - - 0 1',
        moves: ['e2e8', 'c8e8', 'e1e8'],
        caption: 'Te8+ Txe8 Txe8# – der zweite Turm vollendet.',
      },
    },
  },
  {
    id: 'B-End',
    section: 'B',
    title: 'Endspiel: Turm und Quadrat',
    short: 'Turmmatt, Quadratregel',
    type: 'endgame',
    band: [0, 0],
    concept: {
      title: 'Turmmatt und Quadratregel',
      text: [
        'Turm gegen König: Der Turm schneidet den König ab, dein König kommt in Opposition (gegenüber, ein Feld dazwischen). Dann gibt der Turm Schach am Rand.',
        'Quadratregel: Zeichne vom Bauern aus ein Quadrat bis zur Umwandlungsreihe. Kann der gegnerische König ins Quadrat treten, holt er den Bauern ein.',
      ],
    },
    endgames: [
      endgame({
        id: 'B-End-1',
        fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
        goal: 'mate',
        maxMoves: 35,
        prompt: 'Setze matt mit Turm und König (höchstens 35 Züge).',
        explain: 'Abschneiden, Opposition, Schach am Rand.',
        idea: 'Der Turm sperrt eine Linie, dein König geht dem gegnerischen entgegen.',
      }),
      endgame({
        id: 'B-End-2',
        fen: '8/8/8/P7/8/8/5k2/K7 w - - 0 1',
        goal: 'promote',
        maxMoves: 8,
        prompt: 'Wandle den Bauern um.',
        explain: 'Der schwarze König steht ausserhalb des Quadrats – der Bauer läuft durch.',
        idea: 'Zieh das Quadrat a5–d8: Steht der König ausserhalb?',
      }),
    ],
  },

  /* ===================== Section C – Doppelangriffe ===================== */
  {
    id: 'C1',
    section: 'C',
    title: 'Springergabel',
    short: 'Zwei Ziele mit einem Sprung',
    type: 'puzzle',
    tags: ['fork'],
    filter: isKnight,
    band: [800, 1300],
    concept: {
      title: 'Springergabel',
      text: [
        'Der Springer greift bis zu acht Felder an – und kann von den angegriffenen Figuren nicht zurückschlagen werden.',
        'Suche Felder, von denen der Springer König und Dame, oder Dame und Turm gleichzeitig angreift.',
      ],
      example: { fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', moves: ['b5c7', 'e8d7', 'c7a8'], caption: 'Sc7+ greift König und Turm an.' },
    },
  },
  {
    id: 'C2',
    section: 'C',
    title: 'Gabeln mit allen Figuren',
    short: 'Dame, Bauer, Läufer, Turm',
    type: 'puzzle',
    tags: ['fork'],
    filter: (p) => !isKnight(p),
    band: [800, 1300],
    concept: {
      title: 'Doppelangriff',
      text: [
        'Jede Figur kann gabeln. Besonders stark: die Dame mit Schach und Angriff auf eine ungedeckte Figur.',
        'Auch Bauern gabeln: Ein Bauernzug, der zwei Figuren angreift, gewinnt fast immer Material.',
      ],
      example: { fen: '4k3/8/8/8/1r6/8/8/3QK3 w - - 0 1', moves: ['d1a4', 'e8f7', 'a4b4'], caption: 'Da4+ greift König und Turm an.' },
    },
  },
  {
    id: 'C3',
    section: 'C',
    title: 'Fesselung erkennen',
    short: 'Eine Figur, die nicht ziehen darf',
    type: 'puzzle',
    tags: ['pin'],
    band: [800, 1150],
    concept: {
      title: 'Fesselung',
      text: [
        'Eine Figur ist gefesselt, wenn sie nicht ziehen kann, ohne eine wertvollere Figur dahinter preiszugeben.',
        'Absolute Fesselung: Dahinter steht der König – die Figur darf gar nicht ziehen.',
      ],
      example: { fen: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', moves: ['f1b5'], caption: 'Lb5 fesselt den Springer an den König.' },
    },
  },
  {
    id: 'C4',
    section: 'C',
    title: 'Fesselung ausnutzen',
    short: 'Den Gefesselten angreifen',
    type: 'puzzle',
    tags: ['pin'],
    band: [1100, 1450],
    concept: {
      title: 'Fesselung ausnutzen',
      text: [
        'Eine gefesselte Figur ist ein Ziel: Greif sie noch einmal an – oft mit einem Bauern. Sie kann nicht ausweichen.',
        'Und: Eine gefesselte Figur deckt nichts mehr richtig.',
      ],
      example: { fen: '4k3/8/2n5/1B6/3P4/8/8/4K3 w - - 0 1', moves: ['d4d5'], caption: 'd5! – der gefesselte Springer kann nicht weg.' },
    },
  },
  {
    id: 'C5',
    section: 'C',
    title: 'Spiess',
    short: 'Die Fesselung andersherum',
    type: 'puzzle',
    tags: ['skewer'],
    band: [900, 1400],
    concept: {
      title: 'Spiess',
      text: [
        'Beim Spiess steht die wertvollere Figur vorne. Sie muss weichen – und die Figur dahinter geht verloren.',
        'Typisch: Schach auf einer Linie, hinter dem König steht die Dame oder ein Turm.',
      ],
      example: { fen: '8/8/8/4k2q/8/8/8/R3K3 w - - 0 1', moves: ['a1a5', 'e5f4', 'a5h5'], caption: 'Ta5+ – der König weicht, die Dame fällt.' },
    },
  },
  {
    id: 'C6',
    section: 'C',
    title: 'Abzugsangriff',
    short: 'Weg da – Linie frei',
    type: 'puzzle',
    tags: ['discoveredAttack'],
    band: [900, 1400],
    concept: {
      title: 'Abzugsangriff',
      text: [
        'Eine Figur zieht weg und gibt die Linie für eine andere frei. So entstehen zwei Angriffe auf einmal.',
        'Die wegziehende Figur sollte selbst etwas angreifen oder schlagen.',
      ],
      example: { fen: '4k3/4q2p/8/8/4B3/8/8/4RK2 w - - 0 1', moves: ['e4h7'], caption: 'Lxh7 – jetzt greift der Turm die Dame an.' },
    },
  },
  {
    id: 'C7',
    section: 'C',
    title: 'Abzugsschach und Doppelschach',
    short: 'Die stärksten Abzüge',
    type: 'puzzle',
    tags: ['discoveredCheck', 'doubleCheck'],
    band: [900, 1450],
    concept: {
      title: 'Abzugsschach',
      text: [
        'Gibt der Abzug Schach, muss der Gegner das Schach beantworten – die wegziehende Figur darf fast alles schlagen.',
        'Doppelschach: Beide Figuren geben Schach. Dann hilft nur ein Königszug.',
      ],
      example: { fen: '4k3/8/2q5/8/8/8/4N3/4R1K1 w - - 0 1', moves: ['e2d4'], caption: 'Sd4+ – Abzugsschach und Angriff auf die Dame.' },
    },
  },
  {
    id: 'C8',
    section: 'C',
    title: 'Batterie und Röntgen',
    short: 'Figuren hintereinander',
    type: 'puzzle',
    tags: ['xRayAttack'],
    band: [1000, 1500],
    concept: {
      title: 'Batterie und Röntgenangriff',
      text: [
        'Batterie: Zwei Figuren auf derselben Linie (Dame hinter Läufer, Türme verdoppelt) verstärken einander.',
        'Röntgen: Eine Figur wirkt durch eine andere hindurch – nach einem Abtausch auf der Linie wird ihr Einfluss sichtbar.',
      ],
    },
  },
  {
    id: 'C9',
    section: 'C',
    title: 'Gibt es hier etwas?',
    short: 'Gemischt – ohne Themenhinweis',
    type: 'puzzle',
    tags: ['fork', 'pin', 'skewer', 'discoveredAttack', 'equality', 'quietMove', 'defensiveMove', 'hangingPiece'],
    band: [900, 1400],
    mixed: true,
    concept: {
      title: 'Ohne Wegweiser',
      text: [
        'In einer Partie sagt dir niemand, welches Motiv gerade passt – oder ob es überhaupt eines gibt.',
        'Hier ist alles gemischt: Manchmal gewinnst du Material, manchmal musst du verteidigen, manchmal genügt ein ruhiger Zug.',
      ],
    },
  },
  {
    id: 'C-End',
    section: 'C',
    title: 'Endspiel: Opposition',
    short: 'König und Bauer gegen König',
    type: 'endgame',
    band: [0, 0],
    concept: {
      title: 'Opposition',
      text: [
        'Stehen sich die Könige mit einem Feld Abstand gegenüber, hat die Opposition, wer NICHT am Zug ist.',
        'Mit Bauer: Bring deinen König vor den Bauern auf die „Schlüsselfelder" – dann läuft der Bauer durch.',
      ],
    },
    endgames: [
      endgame({
        id: 'C-End-1',
        fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1',
        goal: 'promote',
        maxMoves: 25,
        prompt: 'Wandle den Bauern sicher um.',
        explain: 'König vor den Bauern, Opposition halten, dann den Bauern nachziehen.',
        idea: 'Nicht sofort den Bauern ziehen: Zuerst den König nach vorne, Opposition beachten.',
      }),
    ],
  },

  /* ===================== Section D – Kombinieren ===================== */
  {
    id: 'D1',
    section: 'D',
    title: 'Ablenkung',
    short: 'Den Verteidiger weglocken',
    type: 'puzzle',
    tags: ['deflection'],
    band: [1100, 1600],
    concept: {
      title: 'Ablenkung',
      text: [
        'Eine gegnerische Figur hat eine wichtige Aufgabe (z. B. ein Mattfeld decken). Ein Opfer oder Schach lockt sie weg.',
        'Frage: Welche Figur hält die gegnerische Stellung zusammen?',
      ],
    },
  },
  {
    id: 'D2',
    section: 'D',
    title: 'Hinlenkung',
    short: 'Auf ein schlechtes Feld zwingen',
    type: 'puzzle',
    tags: ['attraction'],
    band: [1100, 1600],
    concept: {
      title: 'Hinlenkung',
      text: [
        'Ein Opfer zwingt den König oder eine Figur auf ein Feld, auf dem eine Gabel, Fesselung oder ein Matt wartet.',
      ],
    },
  },
  {
    id: 'D3',
    section: 'D',
    title: 'Abtausch und Überlastung',
    short: 'Ein Verteidiger, zwei Aufgaben',
    type: 'puzzle',
    tags: ['capturingDefender'],
    band: [1200, 1650],
    concept: {
      title: 'Überlastung',
      text: [
        'Muss eine Figur zwei Dinge gleichzeitig decken, ist sie überlastet. Greif eines davon an – das andere fällt.',
      ],
    },
  },
  {
    id: 'D4',
    section: 'D',
    title: 'Zwischenzug',
    short: 'Erst die stärkere Drohung',
    type: 'puzzle',
    tags: ['intermezzo'],
    band: [1100, 1700],
    concept: {
      title: 'Zwischenzug',
      text: [
        'Bevor du automatisch zurückschlägst: Gibt es einen Zug mit noch grösserer Drohung (Schach, Damenangriff)?',
        'Der Zwischenzug ändert die Lage, und das Zurückschlagen kommt danach.',
      ],
    },
  },
  {
    id: 'D5',
    section: 'D',
    title: 'Verstellung und Räumung',
    short: 'Linien sperren und öffnen',
    type: 'puzzle',
    tags: ['interference', 'clearance'],
    band: [1100, 1700],
    concept: {
      title: 'Verstellung und Räumung',
      text: [
        'Verstellung: Eine Figur stellt sich zwischen zwei gegnerische, die einander decken.',
        'Räumung: Eine eigene Figur macht mit Tempo ein Feld oder eine Linie frei.',
      ],
    },
  },
  {
    id: 'D6',
    section: 'D',
    title: 'Gefangene Figur',
    short: 'Kein Fluchtfeld mehr',
    type: 'puzzle',
    tags: ['trappedPiece'],
    band: [1100, 1700],
    concept: {
      title: 'Gefangene Figur',
      text: ['Hat eine Figur keine sicheren Felder mehr, greif sie an – sie geht verloren. Besonders oft trifft es Läufer und Damen, die zu früh Bauern schlagen.'],
    },
  },
  {
    id: 'D7',
    section: 'D',
    title: 'Opfer für Matt',
    short: 'Material geben, König fangen',
    type: 'puzzle',
    tags: ['sacrifice'],
    band: [1200, 1700],
    concept: {
      title: 'Opfer',
      text: ['Ein Opfer lohnt sich, wenn danach Matt oder mehr Material folgt. Rechne die Variante bis zum Ende – Hoffnung ist kein Plan.'],
    },
  },
  {
    id: 'D8',
    section: 'D',
    title: 'Verteidigen unter Druck',
    short: 'Die einzige Rettung finden',
    type: 'puzzle',
    tags: ['defensiveMove', 'equality'],
    band: [1100, 1700],
    hint1: 'Was droht? Gibt es einen Zug, der alles deckt – oder ein Gegenangriff mit Schach?',
    concept: {
      title: 'Verteidigung',
      text: ['Wenn der Gegner droht, suche zuerst die Züge, die die Drohung beantworten: Schach geben, schlagen, decken, ausweichen.'],
    },
  },
  {
    id: 'D-End',
    section: 'D',
    title: 'Endspiel: Lucena',
    short: 'Die Brücke bauen',
    type: 'endgame',
    band: [0, 0],
    concept: {
      title: 'Lucena-Stellung',
      text: [
        'Turm und Bauer auf der 7. Reihe gegen Turm: Der König steht vor dem Bauern, wird aber mit Schachs belästigt.',
        'Gewinnidee „Brücke bauen": Den eigenen Turm auf die 4. Reihe stellen, damit er später die Schachs abblockt.',
      ],
    },
    endgames: [
      endgame({
        id: 'D-End-1',
        fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1',
        goal: 'promote',
        maxMoves: 25,
        prompt: 'Wandle den Bauern um, ohne Turm oder Bauer zu verlieren.',
        explain: 'Td1+ vertreibt den König, dann Td4 – die Brücke.',
        idea: 'Zuerst den schwarzen König mit einem Schach von der d-Linie vertreiben.',
      }),
    ],
  },

  /* ===================== Section E – Eröffnung ===================== */
  {
    id: 'E1',
    section: 'E',
    title: 'Eröffnungsprinzipien',
    short: 'Zentrum, Entwicklung, Rochade',
    type: 'puzzle',
    tags: ['opening'],
    band: [500, 1100],
    concept: {
      title: 'Drei Prinzipien',
      text: [
        '1. Zentrum: Bauern und Figuren kontrollieren e4, d4, e5, d5.',
        '2. Entwicklung: Springer und Läufer früh ins Spiel, nicht dieselbe Figur zweimal ziehen.',
        '3. Königssicherheit: früh rochieren. Die Dame nicht zu früh herausbringen.',
        'Die Aufgaben hier stammen aus echten Eröffnungen – meist hat jemand ein Prinzip verletzt.',
      ],
    },
  },
  {
    id: 'E2',
    section: 'E',
    title: 'Fallen um f2/f7',
    short: 'Der schwächste Punkt',
    type: 'puzzle',
    tags: ['attackingF2F7'],
    band: [500, 1300],
    concept: {
      title: 'Der Punkt f7',
      text: ['Am Anfang ist f7 (bzw. f2) nur vom König gedeckt. Läufer auf c4 und Dame oder Springer zielen genau dorthin.'],
    },
  },
  {
    id: 'E3',
    section: 'E',
    title: 'Mein Weiss-Repertoire',
    short: 'Deine Züge als Weiss',
    type: 'line',
    lineColor: 'w',
    band: [0, 0],
    concept: {
      title: 'Repertoire als Weiss',
      text: [
        'Hier übst du die ersten Züge deiner Eröffnungen. Sobald du Partien importiert hast, kommen die Linien aus deinen eigenen Partien.',
        'Bis dahin: Italienisch, Londoner System und Damengambit als solide Standards.',
      ],
    },
  },
  {
    id: 'E4',
    section: 'E',
    title: 'Mein Schwarz-Repertoire',
    short: 'Deine Antworten als Schwarz',
    type: 'line',
    lineColor: 'b',
    band: [0, 0],
    concept: {
      title: 'Repertoire als Schwarz',
      text: [
        'Gegen 1.e4 und 1.d4 brauchst du je eine Antwort. Mit importierten Partien übst du deine eigenen Linien.',
        'Bis dahin: Caro-Kann gegen 1.e4 und abgelehntes Damengambit gegen 1.d4.',
      ],
    },
  },

  /* ===================== Section F – Rechnen und Technik ===================== */
  {
    id: 'F1',
    section: 'F',
    title: 'Längere Varianten',
    short: 'Drei Züge und mehr',
    type: 'puzzle',
    tags: ['mateIn3', 'sacrifice'],
    band: [1300, 1800],
    concept: { title: 'Rechnen', text: ['Stell dir die Stellung nach jedem Zug vor, bevor du weiterrechnest. Prüfe für jede gegnerische Antwort zuerst die Schachs.'] },
  },
  {
    id: 'F2',
    section: 'F',
    title: 'Königsangriff',
    short: 'Der rochierte König',
    type: 'puzzle',
    tags: ['kingsideAttack', 'exposedKing'],
    band: [1300, 1800],
    concept: { title: 'Königsangriff', text: ['Mehr Angreifer als Verteidiger am König? Dann sind Opfer oft korrekt. Öffne Linien zum König.'] },
  },
  {
    id: 'F3',
    section: 'F',
    title: 'Bauernendspiele und Zugzwang',
    short: 'Jedes Tempo zählt',
    type: 'puzzle',
    tags: ['pawnEndgame', 'zugzwang'],
    band: [1200, 1800],
    concept: { title: 'Bauernendspiele', text: ['Im Bauernendspiel entscheidet oft ein einziges Tempo. Zähle die Züge bis zur Umwandlung genau.'] },
  },
  {
    id: 'F4',
    section: 'F',
    title: 'Turm- und Damenendspiele',
    short: 'Aktivität vor Material',
    type: 'puzzle',
    tags: ['rookEndgame', 'queenEndgame', 'queenRookEndgame'],
    band: [1200, 1800],
    concept: { title: 'Schwerfiguren-Endspiele', text: ['Der aktive Turm gehört hinter Freibauern. Im Damenendspiel entscheiden oft Dauerschach oder Gabeln.'] },
  },
];

export const UNIT_BY_ID: Record<string, Unit> = Object.fromEntries(UNITS.map((u) => [u.id, u]));

export function unitsOfSection(sectionId: string): Unit[] {
  return UNITS.filter((u) => u.section === sectionId);
}

/** Anzahl Lektionen einer Unit. */
export function lessonCount(u: Unit): number {
  if (u.type === 'endgame') return u.endgames?.length ?? 1;
  if (u.type === 'line') return 3;
  return 3;
}

/** Hat die Unit einen Unit-Test? */
export function hasTest(u: Unit): boolean {
  return u.type === 'puzzle' || u.type === 'mixed' || u.type === 'custom';
}

/** Standardtext für Hinweisstufe 1 in thematischen Lektionen. */
export const DEFAULT_HINT1 = 'Prüfe alle Schachs, Schlagzüge und Drohungen.';
