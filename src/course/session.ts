/**
 * Baut Sitzungen (Lektion, Unit-Test, Wiederholung, Einstufung) und verbucht Ergebnisse
 * (Versuchsprotokoll, FSRS-Wiederholungsplan, Taktik-Rating).
 */
import {
  addAttempt,
  allCards,
  getCard,
  getProgress,
  loadSettings,
  putCard,
  putProgress,
  saveSetting,
  type StoredCard,
  type UnitProgress,
} from '../db/db';
import { isDue, needsReview, newCard, review, reviveCard, type Attempt } from '../srs/srs';
import { pickPuzzles, seededRandom, shuffle, type Puzzle } from '../puzzles/pool';
import { DEFAULT_HINT1, hasTest, lessonCount, UNIT_BY_ID, UNITS } from './course';
import { lineTask, type RepLine } from './repertoire';
import { mainTag, TAG_TEXT } from '../analysis/explain';
import type { Concept, Task, Unit } from './types';

export interface SessionTask {
  task: Task;
  /** Geführt: Figur und Zielfeld sind vormarkiert, zählt nicht für Wiederholung/Rating. */
  guided?: boolean;
  /** Text für Hinweisstufe 1. */
  hint1: string;
  unitId?: string;
}

export interface SessionPlan {
  kind: 'lesson' | 'test' | 'review' | 'placement' | 'endgame' | 'lines';
  title: string;
  unitId?: string;
  lesson?: number;
  concept?: Concept;
  tasks: SessionTask[];
  /** Adaptive Sitzungen liefern die nächste Aufgabe selbst. */
  next?: (results: TaskResult[]) => SessionTask | null;
  /** Wird am Ende aufgerufen (z. B. Einstufung auswerten). Gibt eine Zusammenfassung zurück. */
  finish?: (results: TaskResult[]) => Promise<string | null>;
}

export interface TaskResult extends Attempt {
  /** Lösung angezeigt bzw. aufgegeben. */
  gaveUp?: boolean;
}

export interface BuildContext {
  pool: Puzzle[];
  progress: Record<string, UnitProgress>;
  lines: { w: RepLine[]; b: RepLine[] };
}

/* ---------------- Hilfen ---------------- */

export function unitDone(u: Unit, p?: UnitProgress): boolean {
  if (!p) return false;
  if (p.test === 'passed' || p.test === 'skipped') return true;
  return !hasTest(u) && p.lessonsDone >= lessonCount(u);
}

/** Hinweis Stufe 1 für ein Puzzle: Thema nennen (in gemischten Sitzungen) oder Unit-Hinweis. */
function themeHint(tags: string[]): string {
  const t = mainTag(tags);
  return t && TAG_TEXT[t] ? `Thema: ${TAG_TEXT[t]}` : DEFAULT_HINT1;
}

function puzzleTask(p: Puzzle, opts: { thematicHint?: string; guided?: boolean; unitId?: string }): SessionTask {
  return {
    task: { kind: 'puzzle', puzzle: p },
    hint1: opts.thematicHint ?? themeHint(p.tags),
    guided: opts.guided,
    unitId: opts.unitId,
  };
}

function lessonWindow(u: Unit, lesson: number): [number, number] {
  const [lo, hi] = u.band;
  const third = (hi - lo) / 3;
  return [Math.round(lo + lesson * third - 50), Math.round(lo + (lesson + 1) * third + 50)];
}

/** Puzzles aus bereits erledigten Units (für Interleaving). */
function interleave(ctx: BuildContext, exclude: string, count: number, seed: string, avoid: Set<string>): SessionTask[] {
  const done = UNITS.filter(
    (u) => u.id !== exclude && u.type === 'puzzle' && u.tags && (ctx.progress[u.id]?.lessonsDone ?? 0) > 0,
  );
  if (done.length === 0) return [];
  const rand = seededRandom(seed + ':mix');
  const out: SessionTask[] = [];
  for (let i = 0; i < count; i++) {
    const u = done[Math.floor(rand() * done.length)]!;
    const mid = (u.band[0] + u.band[1]) / 2;
    const [p] = pickPuzzles(ctx.pool, {
      tags: u.tags,
      excludeTags: u.excludeTags,
      filter: u.filter,
      min: mid - 150,
      max: mid + 150,
      count: 1,
      avoid,
      seed: seed + ':mix' + i,
    });
    if (p && !avoid.has(p.id)) {
      avoid.add(p.id);
      out.push(puzzleTask(p, { unitId: u.id }));
    }
  }
  return out;
}

/* ---------------- Lektion ---------------- */

export function buildLesson(unitId: string, lesson: number, ctx: BuildContext): SessionPlan {
  const u = UNIT_BY_ID[unitId]!;
  const prog = ctx.progress[unitId];
  const avoid = new Set(prog?.seen ?? []);
  const seed = `${unitId}:${lesson}:${prog?.seen.length ?? 0}:${Math.floor(Date.now() / 3_600_000)}`;
  const thematic = u.mixed ? undefined : (u.hint1 ?? DEFAULT_HINT1);
  const title = `${u.id} ${u.title} · Lektion ${lesson + 1}/${lessonCount(u)}`;
  const tasks: SessionTask[] = [];

  if (u.type === 'endgame') {
    const e = u.endgames![Math.min(lesson, u.endgames!.length - 1)]!;
    return { kind: 'endgame', title, unitId, lesson, concept: u.concept, tasks: [{ task: e, hint1: e.idea, unitId }] };
  }

  if (u.type === 'line') {
    const color = u.lineColor!;
    const lines = ctx.lines[color];
    const mode = lesson === 0 ? 'guided' : 'free';
    const chosen = lesson === 2 ? shuffle(lines, seededRandom(seed)) : lines;
    return {
      kind: 'lines',
      title,
      unitId,
      lesson,
      concept: lesson === 0 ? u.concept : undefined,
      tasks: chosen.map((l) => ({ task: lineTask(l, mode), hint1: `Linie: ${l.name}`, unitId })),
    };
  }

  if (u.type === 'custom' || u.type === 'mixed') {
    const custom = u.tasks ?? [];
    const per = Math.ceil(custom.length / lessonCount(u));
    const slice = custom.slice(lesson * per, (lesson + 1) * per);
    slice.forEach((t, i) => tasks.push({ task: t, hint1: thematic ?? DEFAULT_HINT1, guided: lesson === 0 && i === 0, unitId }));
  }

  if (u.type === 'puzzle' || u.type === 'mixed') {
    const [lo, hi] = lessonWindow(u, lesson);
    const n = u.type === 'mixed' ? 3 : 6;
    const picked = pickPuzzles(ctx.pool, { tags: u.tags, excludeTags: u.excludeTags, filter: u.filter, min: lo, max: hi, count: n, avoid, seed });
    picked.forEach((p, i) => {
      avoid.add(p.id);
      tasks.push(puzzleTask(p, { thematicHint: thematic, guided: u.type === 'puzzle' && i < (lesson === 0 ? 2 : 1), unitId }));
    });
  }

  tasks.push(...interleave(ctx, unitId, tasks.length >= 6 ? 1 : 2, seed, avoid));
  return { kind: 'lesson', title, unitId, lesson, concept: u.concept, tasks };
}

/* ---------------- Unit-Test ---------------- */

export const TEST_SIZE = 10;
export const TEST_PASS = 8;

export function buildTest(unitId: string, ctx: BuildContext): SessionPlan {
  const u = UNIT_BY_ID[unitId]!;
  const avoid = new Set<string>();
  const seed = `${unitId}:test:${Math.floor(Date.now() / 3_600_000)}`;
  const tasks: SessionTask[] = [];
  if (u.tasks) for (const t of u.tasks) tasks.push({ task: t, hint1: DEFAULT_HINT1, unitId });
  if (u.tags) {
    const need = Math.max(0, TEST_SIZE - 3 - tasks.length);
    const mid = (u.band[0] + u.band[1]) / 2;
    for (const p of pickPuzzles(ctx.pool, { tags: u.tags, excludeTags: u.excludeTags, filter: u.filter, min: mid - 100, max: u.band[1], count: need, avoid, seed })) {
      avoid.add(p.id);
      tasks.push(puzzleTask(p, { unitId }));
    }
  }
  const all = shuffle([...tasks, ...interleave(ctx, unitId, Math.max(0, TEST_SIZE - tasks.length), seed, avoid)], seededRandom(seed)).slice(
    0,
    Math.max(TEST_SIZE, tasks.length),
  );
  return {
    kind: 'test',
    title: `${u.id} ${u.title} · Test`,
    unitId,
    tasks: all,
    finish: async (results) => {
      const ok = results.filter((r) => r.correct && r.hint === 0).length;
      const needed = Math.ceil((TEST_PASS / TEST_SIZE) * results.length);
      const passed = ok >= needed;
      const p = await getProgress(unitId);
      if (passed) await putProgress({ ...p, test: 'passed', lessonsDone: Math.max(p.lessonsDone, lessonCount(u)) });
      return passed
        ? `Bestanden: ${ok} von ${results.length} beim ersten Versuch. Die Unit ist abgeschlossen.`
        : `${ok} von ${results.length} beim ersten Versuch – für den Abschluss braucht es ${needed}. Die Lektionen helfen.`;
    },
  };
}

/* ---------------- Wiederholung ---------------- */

export async function dueCards(now = new Date()): Promise<StoredCard[]> {
  const cards = await allCards();
  return cards.filter((c) => isDue(reviveCard(c.card), now)).sort((a, b) => +new Date(a.card.due) - +new Date(b.card.due));
}

export function cardToTask(c: StoredCard, ctx: BuildContext): SessionTask | null {
  const s = c.source;
  if (s.type === 'puzzle') {
    const p = ctx.pool.find((x) => x.id === s.puzzleId);
    return p ? puzzleTask(p, { unitId: s.unitId }) : null;
  }
  if (s.type === 'custom') {
    const t = UNIT_BY_ID[s.unitId]?.tasks?.find((x) => x.id === s.taskId);
    return t ? { task: t, hint1: DEFAULT_HINT1, unitId: s.unitId } : null;
  }
  if (s.type === 'mistake' && c.data) {
    const t = c.data.motifs[0];
    const hint = t && t !== 'general' ? `Achte auf: ${MOTIF_HINT[t] ?? DEFAULT_HINT1}` : DEFAULT_HINT1;
    return { task: { kind: 'mistake', id: c.id, data: c.data }, hint1: hint };
  }
  if (s.type === 'line') {
    const l = [...ctx.lines.w, ...ctx.lines.b].find((x) => x.id === s.lineId);
    return l ? { task: lineTask(l, 'free'), hint1: `Linie: ${l.name}` } : null;
  }
  return null;
}

const MOTIF_HINT: Record<string, string> = {
  mateMissed: 'Es gibt ein Matt.',
  mateAllowed: 'Was droht dein Gegner?',
  backRank: 'Die Grundreihe.',
  pieceLost: 'Hängt nach deinem Zug etwas?',
  forkMissed: 'Ein Doppelangriff ist möglich.',
  freePieceMissed: 'Eine gegnerische Figur ist ungedeckt.',
  promotionMissed: 'Ein Bauer kann umwandeln.',
};

export async function buildReview(
  ctx: BuildContext,
  filter?: (c: StoredCard) => boolean,
  max = 15,
  includeNotDue = false,
): Promise<SessionPlan> {
  const source = includeNotDue
    ? (await allCards()).sort((a, b) => +new Date(a.card.due) - +new Date(b.card.due))
    : await dueCards();
  const due = source.filter((c) => !filter || filter(c));
  const tasks: SessionTask[] = [];
  for (const c of due) {
    const t = cardToTask(c, ctx);
    if (t) tasks.push(t);
    if (tasks.length >= max) break;
  }
  return { kind: 'review', title: 'Wiederholung', tasks: shuffle(tasks, seededRandom(String(Date.now()))) };
}

export async function cardStats(): Promise<StoredCard[]> {
  return allCards();
}

/* ---------------- Einstufung ---------------- */

const PLACEMENT_TAGS = ['mateIn1', 'mateIn2', 'hangingPiece', 'fork', 'pin', 'skewer', 'discoveredAttack', 'backRankMate', 'defensiveMove', 'deflection'];
export const PLACEMENT_SIZE = 16;

export function buildPlacement(ctx: BuildContext, startRating: number): SessionPlan {
  const used = new Set<string>();
  let rating = Math.max(450, Math.min(1700, startRating));
  const steps = [200, 200, 150, 150, 100, 100, 100, 75, 75, 50, 50, 50, 50, 50, 50, 50];
  const nextTask = (results: TaskResult[]): SessionTask | null => {
    const i = results.length;
    if (i > 0) {
      const r = results[i - 1]!;
      const step = steps[i - 1] ?? 50;
      rating += r.correct && r.hint === 0 ? step : -step;
      rating = Math.max(400, Math.min(1800, rating));
    }
    if (i >= PLACEMENT_SIZE) return null;
    const tag = PLACEMENT_TAGS[i % PLACEMENT_TAGS.length]!;
    const [p] = pickPuzzles(ctx.pool, { tags: [tag], min: rating - 60, max: rating + 60, count: 1, avoid: used, seed: 'place' + i + rating });
    if (!p) return null;
    used.add(p.id);
    return { task: { kind: 'puzzle', puzzle: p }, hint1: DEFAULT_HINT1 };
  };
  return {
    kind: 'placement',
    title: 'Einstufung',
    tasks: [],
    next: nextTask,
    finish: async () => {
      const estimate = Math.round(rating / 25) * 25;
      await saveSetting('tacticsRating', estimate);
      await saveSetting('placementDone', true);
      const skipped: string[] = [];
      for (const u of UNITS) {
        if (u.section === 'E' || u.section === 'F') continue;
        const top = u.type === 'endgame' || u.type === 'line' ? sectionTop(u.section) : u.band[1];
        if (top <= estimate - 50) {
          const p = await getProgress(u.id);
          if (!unitDone(u, p)) {
            await putProgress({ ...p, test: hasTest(u) ? 'skipped' : p.test, lessonsDone: Math.max(p.lessonsDone, hasTest(u) ? 0 : lessonCount(u)) });
            skipped.push(u.id);
          }
        }
      }
      return `Geschätztes Taktik-Rating: ${estimate}. ${skipped.length > 0 ? `Übersprungen: ${skipped.join(', ')}.` : 'Du startest am Anfang des Pfads.'}`;
    },
  };
}

function sectionTop(section: string): number {
  const us = UNITS.filter((u) => u.section === section && u.type !== 'endgame' && u.type !== 'line');
  return Math.max(...us.map((u) => u.band[1]));
}

/* ---------------- Ergebnisse verbuchen ---------------- */

export function itemId(st: SessionTask): string {
  const t = st.task;
  if (t.kind === 'puzzle') return 'puzzle:' + t.puzzle.id;
  return t.id.startsWith('line:') || t.id.startsWith('mistake:') ? t.id : 'task:' + t.id;
}

function cardSource(st: SessionTask): StoredCard['source'] | null {
  const t = st.task;
  if (t.kind === 'puzzle') return { type: 'puzzle', puzzleId: t.puzzle.id, unitId: st.unitId };
  if (t.kind === 'custom') return { type: 'custom', taskId: t.id, unitId: st.unitId ?? '' };
  if (t.kind === 'line') return { type: 'line', lineId: t.id };
  return null; // Fehler-Karten existieren bereits; Endspiele und Wegaufgaben kommen nicht in den Plan
}

/** Elo-Update eines Ratings gegen ein Puzzle-Rating. */
export function eloUpdate(r: number, n: number, opp: number, won: boolean): number {
  const k = n < 30 ? 40 : 16;
  const exp = 1 / (1 + 10 ** ((opp - r) / 400));
  return r + k * ((won ? 1 : 0) - exp);
}

export async function recordResult(plan: SessionPlan, st: SessionTask, r: TaskResult): Promise<void> {
  const t = st.task;
  const tags = t.kind === 'puzzle' ? t.puzzle.tags : t.kind === 'mistake' ? t.data.motifs : [];
  await addAttempt({
    at: Date.now(),
    itemId: itemId(st),
    kind: st.guided ? 'guided' : plan.kind,
    correct: r.correct,
    hint: r.hint,
    seconds: r.seconds,
    tags,
    rating: t.kind === 'puzzle' ? t.puzzle.rating : undefined,
  });
  if (st.guided) return;

  // Wiederholungsplan
  const id = t.kind === 'mistake' ? t.id : itemId(st);
  const existing = await getCard(id);
  if (existing) {
    await putCard({ ...existing, card: review(reviveCard(existing.card), r) });
  } else if (needsReview(r)) {
    const source = cardSource(st);
    if (source) {
      await putCard({ id, card: review(newCard(), r), source, added: Date.now(), tags });
    }
  }

  // Taktik-Rating (nur Puzzles)
  if (t.kind === 'puzzle') {
    const s = await loadSettings();
    const won = r.correct && r.hint <= 1;
    const n = Object.values(s.tagRatings).reduce((a, b) => Math.max(a, b.n), 0);
    await saveSetting('tacticsRating', Math.round(eloUpdate(s.tacticsRating, n, t.puzzle.rating, won)));
    const tr = { ...s.tagRatings };
    for (const tag of t.puzzle.tags) {
      if (!TAG_TEXT[tag] || /Endgame$/.test(tag)) continue;
      const cur = tr[tag] ?? { r: s.tacticsRating, n: 0 };
      tr[tag] = { r: Math.round(eloUpdate(cur.r, cur.n, t.puzzle.rating, won)), n: cur.n + 1 };
    }
    await saveSetting('tagRatings', tr);
  }
}

/** Nach einer Lektion: Fortschritt und gesehene Puzzles speichern. */
export async function finishLesson(plan: SessionPlan): Promise<void> {
  if (!plan.unitId || plan.lesson === undefined) return;
  const p = await getProgress(plan.unitId);
  const seen = [...p.seen];
  for (const st of plan.tasks) if (st.task.kind === 'puzzle' && st.unitId === plan.unitId) seen.push(st.task.puzzle.id);
  await putProgress({ ...p, lessonsDone: Math.max(p.lessonsDone, plan.lesson + 1), seen });
}

/** Nächste empfohlene Lektion im Hauptpfad (ohne Section E). */
export function nextLesson(progress: Record<string, UnitProgress>): { unitId: string; lesson: number | 'test' } | null {
  for (const u of UNITS) {
    if (u.section === 'E') continue;
    const p = progress[u.id];
    if (unitDone(u, p)) continue;
    const done = p?.lessonsDone ?? 0;
    if (done < lessonCount(u)) return { unitId: u.id, lesson: done };
    if (hasTest(u)) return { unitId: u.id, lesson: 'test' };
  }
  return null;
}
