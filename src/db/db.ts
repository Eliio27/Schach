import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card } from '../srs/srs';
import type { Score, MoveClass } from '../analysis/classify';
import type { Motif } from '../analysis/explain';

/** Fortschritt pro Unit. */
export interface UnitProgress {
  unitId: string;
  lessonsDone: number;
  test: 'passed' | 'skipped' | null;
  seen: string[];
  updated: number;
}

/** Herkunft einer Wiederholungskarte. */
export type CardSource =
  | { type: 'puzzle'; puzzleId: string; unitId?: string }
  | { type: 'custom'; taskId: string; unitId: string }
  | { type: 'mistake'; gameId: string; ply: number }
  | { type: 'line'; lineId: string };

export interface StoredCard {
  id: string;
  card: Card;
  source: CardSource;
  /** Für Fehler-Karten: alles, was die Aufgabe braucht (Stellung, Lösung, Erklärung …). */
  data?: MistakeData;
  added: number;
  tags: string[];
}

export interface MistakeData {
  fen: string;
  best: string;
  bestPv: string[];
  played: string;
  playedSan: string;
  bestScore: Score;
  explanation: string;
  motifs: Motif[];
  label: string;
  cls: MoveClass;
}

export interface AttemptRecord {
  id?: number;
  at: number;
  itemId: string;
  kind: string;
  correct: boolean;
  hint: number;
  seconds: number;
  tags: string[];
  rating?: number;
}

export interface StoredGame {
  id: string;
  pgn: string;
  headers: Record<string, string>;
  white: string;
  black: string;
  result: string;
  date: string;
  /** Eigene Farbe (falls erkannt). */
  color: 'w' | 'b' | null;
  source: 'pgn' | 'chesscom' | 'lichess';
  plies: number;
  imported: number;
  opening: string;
  eco: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
}

export interface PlyAnalysis {
  /** Bewertung der Stellung VOR diesem Halbzug (Weiss-Sicht). */
  score: Score;
  best: string | null;
  pv: string[];
}

export interface MoveReport {
  ply: number;
  uci: string;
  san: string;
  color: 'w' | 'b';
  cls: MoveClass;
  winLoss: number;
  cpLoss: number;
  accuracy: number;
  phase: 'opening' | 'middlegame' | 'endgame';
  explanation?: string;
  motifs?: Motif[];
}

export interface StoredAnalysis {
  gameId: string;
  depth: number;
  /** Ein Eintrag pro Stellung (plies + 1). Wird während der Analyse schrittweise gefüllt. */
  positions: (PlyAnalysis | null)[];
  moves?: MoveReport[];
  summary?: {
    accuracy: { w: number | null; b: number | null };
    acpl: { w: number; b: number };
    byPhase: Record<'opening' | 'middlegame' | 'endgame', { w: number | null; b: number | null }>;
    counts: Record<'w' | 'b', Record<MoveClass, number>>;
  };
  finished?: number;
}

interface ZZSchema extends DBSchema {
  settings: { key: string; value: { key: string; value: unknown } };
  progress: { key: string; value: UnitProgress };
  cards: { key: string; value: StoredCard };
  attempts: { key: number; value: AttemptRecord; indexes: { at: number } };
  games: { key: string; value: StoredGame; indexes: { imported: number } };
  analyses: { key: string; value: StoredAnalysis };
  activity: { key: string; value: { day: string; count: number } };
}

export const STORES = ['settings', 'progress', 'cards', 'attempts', 'games', 'analyses', 'activity'] as const;
export type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBPDatabase<ZZSchema>> | null = null;

export function db(): Promise<IDBPDatabase<ZZSchema>> {
  if (!dbp) {
    dbp = openDB<ZZSchema>('zugzwang', 1, {
      upgrade(d) {
        d.createObjectStore('settings', { keyPath: 'key' });
        d.createObjectStore('progress', { keyPath: 'unitId' });
        d.createObjectStore('cards', { keyPath: 'id' });
        const a = d.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        a.createIndex('at', 'at');
        const g = d.createObjectStore('games', { keyPath: 'id' });
        g.createIndex('imported', 'imported');
        d.createObjectStore('analyses', { keyPath: 'gameId' });
        d.createObjectStore('activity', { keyPath: 'day' });
      },
    });
  }
  return dbp;
}

/* ---------- Einstellungen ---------- */

export interface Settings {
  streak: boolean;
  board: 'holz' | 'kontrast' | 'gruen';
  coords: boolean;
  depth: number;
  movetime: number;
  chesscomUser: string;
  lichessUser: string;
  showPlayedMove: boolean;
  placementDone: boolean;
  tacticsRating: number;
  chesscomRating: number;
  tagRatings: Record<string, { r: number; n: number }>;
  weeklyGoal: number;
}

export const DEFAULT_SETTINGS: Settings = {
  streak: true,
  board: 'holz',
  coords: true,
  depth: 14,
  movetime: 1500,
  chesscomUser: 'Elischa123',
  lichessUser: '',
  showPlayedMove: true,
  placementDone: false,
  // Startwert für Chess.com ≈ 450: Lichess-Puzzle-Ratings liegen etwa 150 Punkte höher.
  tacticsRating: 600,
  chesscomRating: 450,
  tagRatings: {},
  weeklyGoal: 5,
};

export async function loadSettings(): Promise<Settings> {
  const all = await (await db()).getAll('settings');
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const { key, value } of all) s[key] = value;
  return s as unknown as Settings;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await (await db()).put('settings', { key, value });
}

/* ---------- Fortschritt ---------- */

export async function allProgress(): Promise<Record<string, UnitProgress>> {
  const list = await (await db()).getAll('progress');
  return Object.fromEntries(list.map((p) => [p.unitId, p]));
}

export async function getProgress(unitId: string): Promise<UnitProgress> {
  return (await (await db()).get('progress', unitId)) ?? { unitId, lessonsDone: 0, test: null, seen: [], updated: 0 };
}

export async function putProgress(p: UnitProgress): Promise<void> {
  await (await db()).put('progress', { ...p, seen: p.seen.slice(-400), updated: Date.now() });
}

/* ---------- Karten ---------- */

export async function getCard(id: string) {
  return (await db()).get('cards', id);
}
export async function putCard(c: StoredCard) {
  await (await db()).put('cards', c);
}
export async function deleteCard(id: string) {
  await (await db()).delete('cards', id);
}
export async function allCards(): Promise<StoredCard[]> {
  return (await db()).getAll('cards');
}

/* ---------- Versuche / Aktivität ---------- */

export async function addAttempt(a: AttemptRecord) {
  const d = await db();
  await d.add('attempts', a);
  const day = dayKey(new Date(a.at));
  const cur = await d.get('activity', day);
  await d.put('activity', { day, count: (cur?.count ?? 0) + 1 });
}

export async function allAttempts(): Promise<AttemptRecord[]> {
  return (await db()).getAll('attempts');
}

export async function allActivity(): Promise<Record<string, number>> {
  const list = await (await db()).getAll('activity');
  return Object.fromEntries(list.map((a) => [a.day, a.count]));
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ---------- Partien / Analysen ---------- */

export async function putGame(g: StoredGame) {
  await (await db()).put('games', g);
}
export async function getGame(id: string) {
  return (await db()).get('games', id);
}
export async function allGames(): Promise<StoredGame[]> {
  const list = await (await db()).getAll('games');
  return list.sort((a, b) => (b.date + b.imported).localeCompare(a.date + a.imported));
}
export async function deleteGame(id: string) {
  const d = await db();
  await d.delete('games', id);
  await d.delete('analyses', id);
  for (const c of await d.getAll('cards')) {
    if (c.source.type === 'mistake' && c.source.gameId === id) await d.delete('cards', c.id);
  }
}
export async function getAnalysis(id: string) {
  return (await db()).get('analyses', id);
}
export async function putAnalysis(a: StoredAnalysis) {
  await (await db()).put('analyses', a);
}
export async function allAnalyses(): Promise<StoredAnalysis[]> {
  return (await db()).getAll('analyses');
}

/* ---------- Backup ---------- */

export interface Backup {
  app: 'zugzwang';
  version: 1;
  exported: string;
  stores: Record<StoreName, unknown[]>;
}

export async function exportBackup(): Promise<Backup> {
  const d = await db();
  const stores = {} as Record<StoreName, unknown[]>;
  for (const s of STORES) stores[s] = await d.getAll(s);
  return { app: 'zugzwang', version: 1, exported: new Date().toISOString(), stores };
}

export async function importBackup(b: Backup): Promise<void> {
  if (b.app !== 'zugzwang' || b.version !== 1 || !b.stores) throw new Error('Keine gültige Zugzwang-Sicherung.');
  const d = await db();
  const tx = d.transaction([...STORES], 'readwrite');
  for (const s of STORES) {
    const store = tx.objectStore(s);
    await store.clear();
    for (const row of b.stores[s] ?? []) await store.put(row as never);
  }
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const d = await db();
  const tx = d.transaction([...STORES], 'readwrite');
  for (const s of STORES) await tx.objectStore(s).clear();
  await tx.done;
}
