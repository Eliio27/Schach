/**
 * Erklär-Engine: kurze deutsche Sätze zu Puzzles und eigenen Fehlern.
 * Grundsatz: Ein Detail wird nur genannt, wenn es eindeutig nachgewiesen ist („kurz und richtig").
 */
import { Chess, type Square } from 'chess.js';
import {
  attackedBy,
  colorName,
  formatLine,
  materialBalance,
  NAME_DE,
  NAME_DE_AKK,
  sanDe,
  tryMove,
  VALUE,
} from '../chess/util';
import { formatScore, scoreToCp, type Score } from './classify';

/** Erkannte Motive. Jedes Motiv verweist auf eine Unit im Lernpfad. */
export type Motif =
  | 'mateMissed'
  | 'mateAllowed'
  | 'backRank'
  | 'pieceLost'
  | 'forkMissed'
  | 'freePieceMissed'
  | 'promotionMissed'
  | 'general';

export const MOTIF_DE: Record<Motif, string> = {
  mateMissed: 'Matt verpasst',
  mateAllowed: 'Mattdrohung übersehen',
  backRank: 'Grundreihe',
  pieceLost: 'Figur eingestellt',
  forkMissed: 'Gabel verpasst',
  freePieceMissed: 'Ungedeckte Figur übersehen',
  promotionMissed: 'Umwandlung verpasst',
  general: 'Sonstiges',
};

/** Unit im Lernpfad, die zu einem Motiv passt. */
export const MOTIF_UNIT: Record<Motif, string | null> = {
  mateMissed: 'B7',
  mateAllowed: 'B5',
  backRank: 'B1',
  pieceLost: 'B4',
  forkMissed: 'C1',
  freePieceMissed: 'B4',
  promotionMissed: 'A4',
  general: null,
};

export interface Explanation {
  motifs: Motif[];
  /** Ein bis drei kurze Sätze. */
  text: string;
}

/** Materialbilanz nach einer Zugfolge (aus Sicht von Weiss). Stoppt beim ersten illegalen Zug. */
function materialAfterLine(fen: string, ucis: string[], maxPlies: number): number {
  const c = new Chess(fen);
  for (const u of ucis.slice(0, maxPlies)) if (!tryMove(c, u)) break;
  return materialBalance(c);
}

/** Materialgewinn (≥ 0 = Gewinn) für `color` entlang der PV. */
function materialGain(fen: string, pv: string[], color: 'w' | 'b', maxPlies = 6): number {
  const before = materialBalance(new Chess(fen));
  const after = materialAfterLine(fen, pv, maxPlies);
  return (after - before) * (color === 'w' ? 1 : -1);
}

/**
 * Gabel: Nach dem Zug greift die gezogene Figur mindestens zwei gegnerische Figuren an, die
 * wertvoller sind als sie selbst oder ungedeckt – bzw. König + eine weitere Figur.
 * Gibt die angegriffenen Figuren zurück (oder null).
 */
export function detectFork(fen: string, uci: string): { piece: string; targets: { type: string; square: Square }[] } | null {
  const c = new Chess(fen);
  const m = tryMove(c, uci);
  if (!m) return null;
  const moverValue = m.piece === 'k' ? 100 : VALUE[m.piece];
  const enemy = m.color === 'w' ? 'b' : 'w';
  const targets: { type: string; square: Square }[] = [];
  for (const sq of attackedBy(c, m.to)) {
    const t = c.get(sq)!;
    if (t.color !== enemy) continue;
    const defended = c.attackers(sq, enemy).length > 0;
    if (t.type === 'k' || VALUE[t.type] > moverValue || (!defended && VALUE[t.type] >= 3)) {
      targets.push({ type: t.type, square: sq });
    }
  }
  if (targets.length < 2) return null;
  targets.sort((a, b) => (b.type === 'k' ? 100 : VALUE[b.type as 'p']) - (a.type === 'k' ? 100 : VALUE[a.type as 'p']));
  // Die gezogene Figur darf nicht einfach gratis geschlagen werden können (sonst ist es keine echte Gabel).
  const attackers = c.attackers(m.to, enemy);
  const defenders = c.attackers(m.to, m.color);
  if (attackers.length > 0 && defenders.length === 0 && !targets.some((t) => t.type === 'k')) return null;
  return { piece: m.piece, targets };
}

/** Prüft, ob nach einer Mattfolge der Mattsetzer auf der Grundreihe des Königs steht. */
function isBackRankMate(fen: string, pv: string[]): boolean {
  const c = new Chess(fen);
  let last = null;
  for (const u of pv) {
    const m = tryMove(c, u);
    if (!m) return false;
    last = m;
    if (c.isCheckmate()) break;
  }
  if (!last || !c.isCheckmate()) return false;
  const kingColor = c.turn();
  const kingSq = c
    .board()
    .flat()
    .find((p) => p && p.type === 'k' && p.color === kingColor)?.square;
  if (!kingSq) return false;
  const backRank = kingColor === 'w' ? '1' : '8';
  return kingSq[1] === backRank && last.to[1] === backRank && (last.piece === 'r' || last.piece === 'q');
}

export interface MistakeInput {
  /** Stellung vor dem eigenen Zug. */
  fen: string;
  /** Gespielter Zug (UCI). */
  played: string;
  /** Bester Zug der Engine (UCI). */
  best: string;
  /** Hauptvariante ab der Stellung vor dem Zug (beginnt mit dem besten Zug). */
  bestPv: string[];
  /** Hauptvariante nach dem gespielten Zug (beginnt mit der Antwort des Gegners). */
  replyPv: string[];
  /** Bewertung vor dem Zug (Weiss-Sicht). */
  before: Score;
  /** Bewertung nach dem gespielten Zug (Weiss-Sicht). */
  after: Score;
}

/** Erklärt einen Fehler/Patzer aus einer eigenen Partie. */
export function explainMistake(x: MistakeInput): Explanation {
  const c = new Chess(x.fen);
  const me = c.turn();
  const opp = me === 'w' ? 'b' : 'w';
  const sign = me === 'w' ? 1 : -1;
  const motifs: Motif[] = [];
  const parts: string[] = [];

  const playedMove = tryMove(new Chess(x.fen), x.played);
  const bestSan = playedMove ? tryMove(new Chess(x.fen), x.best)?.san : undefined;
  const playedSan = playedMove?.san ?? x.played;
  const fenAfter = playedMove?.after ?? x.fen;

  // 1) Zugelassenes Matt
  const afterMate = x.after.mate !== undefined ? x.after.mate * sign : undefined;
  if (afterMate !== undefined && afterMate < 0 && -afterMate <= 3) {
    const n = -afterMate;
    const line = formatLine(fenAfter, sanLine(fenAfter, x.replyPv.slice(0, 2 * n - 1)));
    motifs.push('mateAllowed');
    let s = `Nach ${sanDe(playedSan)} setzt ${colorName(opp)} in ${n === 1 ? 'einem Zug' : `${n} Zügen`} matt: ${line}.`;
    if (isBackRankMate(fenAfter, x.replyPv.slice(0, 2 * n - 1))) {
      motifs.push('backRank');
      s += ' Das Matt kommt auf der Grundreihe.';
    }
    parts.push(s);
  }

  // 2) Verpasstes Matt
  const beforeMate = x.before.mate !== undefined ? x.before.mate * sign : undefined;
  if (motifs.length === 0 && beforeMate !== undefined && beforeMate > 0 && beforeMate <= 3 && !(afterMate !== undefined && afterMate > 0)) {
    const line = formatLine(x.fen, sanLine(x.fen, x.bestPv.slice(0, 2 * beforeMate - 1)));
    motifs.push('mateMissed');
    parts.push(`Hier gab es Matt in ${beforeMate}: ${line}.`);
    if (isBackRankMate(x.fen, x.bestPv.slice(0, 2 * beforeMate - 1))) motifs.push('backRank');
  }

  // 3) Figur eingestellt: Antwort ist ein Schlagzug und die Variante kostet ≥ 2 Punkte
  if (motifs.length === 0 && x.replyPv.length > 0 && playedMove) {
    const reply = tryMove(new Chess(fenAfter), x.replyPv[0]!);
    // Bilanz ab der Stellung VOR dem eigenen Zug, damit ein fairer Abtausch nicht als Verlust gilt.
    const loss = -materialGain(x.fen, [x.played, ...x.replyPv], me, 7);
    if (reply?.captured && loss >= 2) {
      motifs.push('pieceLost');
      const what = `${NAME_DE_AKK[reply.captured]} auf ${reply.to}`;
      parts.push(`Nach ${sanDe(playedSan)} schlägt ${colorName(opp)} mit ${sanDe(reply.san)} ${what} und gewinnt Material.`);
    }
  }

  // 4) Verpasste Gabel (nur wenn die beste Variante wirklich Material gewinnt)
  if (motifs.length === 0 && bestSan) {
    const fork = detectFork(x.fen, x.best);
    if (fork && materialGain(x.fen, x.bestPv, me) >= 2) {
      motifs.push('forkMissed');
      parts.push(
        `${sanDe(bestSan)} hätte ${fork.targets.map((t) => `${NAME_DE_AKK[t.type as keyof typeof NAME_DE_AKK]} auf ${t.square}`).join(' und ')} gleichzeitig angegriffen (Gabel).`,
      );
    }
  }

  // 5) Verpasste Umwandlung
  if (motifs.length === 0 && x.best.length === 5 && bestSan) {
    motifs.push('promotionMissed');
    parts.push(`Mit ${sanDe(bestSan)} hättest du einen Bauern umgewandelt.`);
  }

  // 6) Ungedeckte Figur übersehen
  if (motifs.length === 0 && bestSan) {
    const b = tryMove(new Chess(x.fen), x.best);
    if (b?.captured && materialGain(x.fen, x.bestPv, me) >= 2) {
      const defended = new Chess(x.fen).attackers(b.to, opp).length > 0;
      if (!defended) {
        motifs.push('freePieceMissed');
        const art = b.captured === 'q' ? 'Die' : 'Der';
        const pron = b.captured === 'q' ? 'sie' : 'ihn';
        parts.push(`${art} ${NAME_DE[b.captured]} auf ${b.to} war ungedeckt – ${sanDe(bestSan)} gewinnt ${pron}.`);
      }
    }
  }

  // Allgemeine Aussage – immer dabei, wenn kein Mattmotiv
  if (!motifs.includes('mateAllowed') && !motifs.includes('mateMissed') && bestSan) {
    const lossPawns = Math.abs(scoreToCp(x.before) - scoreToCp(x.after)) / 100;
    const general = `Besser war ${sanDe(bestSan)} (${formatScore(x.before)}).`;
    const cost = lossPawns >= 0.5 && lossPawns < 50 ? ` Dein Zug kostet etwa ${lossPawns.toFixed(1)} Bauern.` : '';
    parts.push(general + cost);
  } else if (bestSan && !motifs.includes('mateMissed')) {
    parts.push(`Besser war ${sanDe(bestSan)}.`);
  }

  if (motifs.length === 0) motifs.push('general');
  return { motifs, text: parts.join(' ') };
}

function sanLine(fen: string, ucis: string[]): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of ucis) {
    const m = tryMove(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}

/** Feste deutsche Sätze pro Lichess-Tag (Basis der Puzzle-Erklärungen). */
export const TAG_TEXT: Record<string, string> = {
  mateIn1: 'Matt in einem Zug.',
  mateIn2: 'Matt in zwei Zügen.',
  mateIn3: 'Matt in drei Zügen.',
  backRankMate: 'Grundreihenmatt: Der König ist von den eigenen Bauern eingesperrt.',
  smotheredMate: 'Ersticktes Matt: Der König ist von eigenen Figuren umstellt, ein Springer setzt matt.',
  anastasiaMate: 'Anastasia-Matt: Springer und Turm (oder Dame) fangen den König am Rand.',
  arabianMate: 'Arabisches Matt: Turm und Springer im Zusammenspiel in der Ecke.',
  hookMate: 'Hakenmatt: Turm, Springer und Bauer greifen ineinander.',
  doubleBishopMate: 'Matt mit zwei Läufern auf benachbarten Diagonalen.',
  bodenMate: 'Boden-Matt: Zwei Läufer auf sich kreuzenden Diagonalen.',
  dovetailMate: 'Schwalbenschwanz-Matt: Die Dame setzt matt, eigene Figuren versperren die Flucht.',
  hangingPiece: 'Eine Figur steht ungedeckt und kann gratis geschlagen werden.',
  defensiveMove: 'Verteidigung: Erst die Drohung des Gegners abwehren.',
  capturingDefender: 'Verteidiger beseitigen: Schlag die Figur, die eine andere schützt.',
  fork: 'Gabel: Eine Figur greift zwei Ziele gleichzeitig an.',
  pin: 'Fesselung: Eine Figur kann nicht ziehen, ohne eine wertvollere dahinter preiszugeben.',
  skewer: 'Spiess: Die wertvollere Figur muss weichen, die dahinter geht verloren.',
  discoveredAttack: 'Abzugsangriff: Eine Figur zieht weg und gibt die Linie für eine andere frei.',
  discoveredCheck: 'Abzugsschach: Der Abzug gibt Schach – die ziehende Figur kann fast alles machen.',
  doubleCheck: 'Doppelschach: Zwei Figuren geben gleichzeitig Schach, nur der König kann ziehen.',
  xRayAttack: 'Röntgenangriff: Eine Figur wirkt durch eine andere hindurch.',
  equality: 'Ausgleich: Der richtige Zug rettet eine schwierige Stellung.',
  quietMove: 'Ruhiger Zug: Kein Schach, kein Schlagzug – aber eine Drohung, die nicht abzuwehren ist.',
  deflection: 'Ablenkung: Ein Verteidiger wird von seiner Aufgabe weggelockt.',
  attraction: 'Hinlenkung: Eine gegnerische Figur wird auf ein ungünstiges Feld gezwungen.',
  intermezzo: 'Zwischenzug: Statt sofort zurückzuschlagen zuerst eine stärkere Drohung.',
  interference: 'Verstellung: Eine Figur unterbricht die Verbindung zwischen zwei gegnerischen Figuren.',
  clearance: 'Räumung: Ein Feld oder eine Linie wird für eine andere Figur frei gemacht.',
  trappedPiece: 'Gefangene Figur: Sie hat keine sicheren Felder mehr.',
  sacrifice: 'Opfer: Material geben, um mehr zu gewinnen.',
  promotion: 'Umwandlung: Ein Bauer erreicht die letzte Reihe.',
  underPromotion: 'Unterverwandlung: Nicht immer ist die Dame die beste Wahl.',
  advancedPawn: 'Ein weit vorgerückter Bauer entscheidet.',
  enPassant: 'En passant: Schlagen im Vorbeigehen.',
  castling: 'Rochade als Teil der Lösung.',
  attackingF2F7: 'Angriff auf f2/f7 – den schwächsten Punkt am Anfang der Partie.',
  kingsideAttack: 'Angriff auf den rochierten König.',
  queensideAttack: 'Angriff am Damenflügel.',
  exposedKing: 'Der König steht ungeschützt.',
  zugzwang: 'Zugzwang: Jeder Zug verschlechtert die Stellung.',
  pawnEndgame: 'Bauernendspiel.',
  rookEndgame: 'Turmendspiel.',
  bishopEndgame: 'Läuferendspiel.',
  knightEndgame: 'Springerendspiel.',
  queenEndgame: 'Damenendspiel.',
  queenRookEndgame: 'Endspiel mit Dame und Turm.',
};

/** Reihenfolge, in der Tags für den Haupt-Satz bevorzugt werden (spezifisch vor allgemein). */
const TAG_PRIORITY = [
  'smotheredMate', 'backRankMate', 'anastasiaMate', 'arabianMate', 'hookMate', 'doubleBishopMate', 'bodenMate', 'dovetailMate',
  'doubleCheck', 'discoveredCheck', 'fork', 'skewer', 'pin', 'discoveredAttack', 'xRayAttack', 'deflection', 'attraction',
  'capturingDefender', 'intermezzo', 'interference', 'clearance', 'trappedPiece', 'quietMove', 'underPromotion', 'promotion',
  'enPassant', 'hangingPiece', 'defensiveMove', 'equality', 'zugzwang', 'attackingF2F7', 'sacrifice', 'advancedPawn',
  'mateIn1', 'mateIn2', 'mateIn3', 'kingsideAttack', 'exposedKing',
];

/** Wählt den aussagekräftigsten Tag eines Puzzles. */
export function mainTag(tags: string[]): string | null {
  for (const t of TAG_PRIORITY) if (tags.includes(t)) return t;
  return null;
}

/**
 * Erklärung zu einem Puzzle: Thema aus dem Lichess-Tag + Lösungsweg.
 * Details (Gabel-Ziele) nur, wenn der Detektor sie eindeutig bestätigt.
 * @param fen Stellung, in der der Spieler am Zug ist
 * @param solution Lösungszüge ab dieser Stellung (UCI, inkl. Gegnerantworten)
 */
export function explainPuzzle(fen: string, solution: string[], tags: string[]): Explanation {
  const parts: string[] = [];
  const t = mainTag(tags);
  if (t && TAG_TEXT[t]) parts.push(TAG_TEXT[t]!);
  if (t === 'fork' && solution.length > 0) {
    // Die Gabel kann im ersten oder dritten Halbzug kommen
    const c = new Chess(fen);
    for (let i = 0; i < solution.length; i += 2) {
      const f = detectFork(c.fen(), solution[i]!);
      const m = tryMove(c, solution[i]!);
      if (f && m) {
        parts.push(
          `${sanDe(m.san)} greift ${f.targets.map((x) => `${NAME_DE_AKK[x.type as keyof typeof NAME_DE_AKK]} auf ${x.square}`).join(' und ')} an.`,
        );
        break;
      }
      if (!m || i + 1 >= solution.length || !tryMove(c, solution[i + 1]!)) break;
    }
  }
  const line = formatLine(fen, sanLine(fen, solution));
  if (line) parts.push(`Lösung: ${line}`);
  return { motifs: [], text: parts.join(' ') };
}
