import type { Puzzle } from '../puzzles/pool';
import type { MistakeData } from '../db/db';

/** Eigene Einzelaufgabe (Section A und Spezialfälle). */
export interface CustomTask {
  kind: 'custom';
  id: string;
  /** Startstellung. */
  fen: string;
  /** Optionaler Gegnerzug, der zuerst animiert wird (z. B. Doppelschritt vor en passant). */
  setup?: string;
  prompt: string;
  /** Lösungszüge ab der Stellung nach `setup` (eigene und Gegnerzüge abwechselnd). */
  solution: string[];
  /** Weitere akzeptierte erste Züge (gleichwertig). */
  alts?: string[];
  /** 'mate': jeder mattsetzende Zug ist richtig. */
  accept?: 'mate';
  explain: string;
}

/** „Bring die Figur nach …" bzw. „Schlag alle Bauern" – nur eine Seite zieht. */
export interface ReachTask {
  kind: 'reach';
  id: string;
  /** Stellung ohne Könige erlaubt (skipValidation). Weiss zieht immer. */
  fen: string;
  /** Zielfeld (bei `collect` leer). */
  target?: string;
  /** Alle schwarzen Figuren schlagen. */
  collect?: boolean;
  prompt: string;
  explain: string;
}

export interface EndgameTask {
  kind: 'endgame';
  id: string;
  fen: string;
  goal: 'mate' | 'promote';
  /** Maximale Anzahl eigener Züge. */
  maxMoves: number;
  prompt: string;
  explain: string;
  /** Hinweis Stufe 1. */
  idea: string;
}

export interface LineTask {
  kind: 'line';
  id: string;
  name: string;
  /** Züge ab Grundstellung (UCI). */
  uci: string[];
  color: 'w' | 'b';
  mode: 'guided' | 'free';
}

export interface PuzzleTask {
  kind: 'puzzle';
  puzzle: Puzzle;
}

export interface MistakeTask {
  kind: 'mistake';
  id: string;
  data: MistakeData;
}

export type Task = CustomTask | ReachTask | EndgameTask | LineTask | PuzzleTask | MistakeTask;

export interface Concept {
  title: string;
  text: string[];
  /** Beispielstellung mit Zugfolge, die animiert wird. */
  example?: { fen: string; moves: string[]; caption?: string };
}

export interface Unit {
  id: string;
  section: string;
  title: string;
  /** Kurzbeschreibung in der Liste. */
  short: string;
  concept: Concept;
  /** Typ der Unit. 'puzzle' = Lichess-Puzzles nach Tags. */
  type: 'puzzle' | 'custom' | 'mixed' | 'endgame' | 'line';
  tags?: string[];
  excludeTags?: string[];
  filter?: (p: Puzzle) => boolean;
  /** Rating-Band der Puzzles. */
  band: [number, number];
  /** Hinweis Stufe 1 in dieser Unit (überschreibt die Standardformulierung). */
  hint1?: string;
  /** Eigene Aufgaben (custom/mixed/reach). */
  tasks?: (CustomTask | ReachTask)[];
  endgames?: EndgameTask[];
  /** Für line-Units: welche Farbe. */
  lineColor?: 'w' | 'b';
  /** Thema in Lektionen nicht verraten (gemischte Units). */
  mixed?: boolean;
}

export interface Section {
  id: string;
  title: string;
  band: string;
  intro: string;
  /** Parallel zum Hauptpfad (Eröffnungen). */
  parallel?: boolean;
}
