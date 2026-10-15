import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

export { Rating, State };
export type { Card };

/** Ergebnis eines Lösungsversuchs (nur der erste Versuch zählt). */
export interface Attempt {
  /** Erster Versuch richtig? */
  correct: boolean;
  /** Höchste genutzte Hinweisstufe (0 = keiner, 1–4). */
  hint: number;
  /** Zeit bis zur Lösung in Sekunden. */
  seconds: number;
}

/** Sekunden, unter denen eine Lösung ohne Hinweis als „leicht" gilt. */
export const EASY_SECONDS = 30;

/**
 * Bildet einen Versuch auf eine FSRS-Bewertung ab (siehe docs/03-plan.md §5.3).
 * „Easy" gibt es nur für Karten, die bereits im Status Review sind.
 */
export function gradeAttempt(a: Attempt, state: State = State.Review): Grade {
  if (!a.correct || a.hint >= 4) return Rating.Again;
  if (a.hint >= 2) return Rating.Hard;
  if (a.hint === 1 || a.seconds > EASY_SECONDS) return Rating.Good;
  return state === State.Review ? Rating.Easy : Rating.Good;
}

/** Soll eine Aufgabe (ausserhalb der Wiederholung) in den Plan aufgenommen werden? */
export function needsReview(a: Attempt): boolean {
  return !a.correct || a.hint >= 2;
}

export const MAX_INTERVAL_DAYS = 180;

const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, maximum_interval: MAX_INTERVAL_DAYS, enable_fuzz: false, enable_short_term: true }),
);

export function newCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

/** Plant eine Karte nach einem Versuch neu. */
export function review(card: Card, a: Attempt, now: Date = new Date()): Card {
  const grade = gradeAttempt(a, card.state);
  const next = scheduler.next(card, now, grade).card;
  // ts-fsrs kann das Maximum durch Rundung leicht überschreiten – hart begrenzen.
  if (next.scheduled_days > MAX_INTERVAL_DAYS) {
    next.scheduled_days = MAX_INTERVAL_DAYS;
    next.due = new Date(now.getTime() + MAX_INTERVAL_DAYS * 86_400_000);
  }
  return next;
}

export function isDue(card: Card, now: Date = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

/** Karten aus IndexedDB/JSON haben Datumsfelder als Strings – hier zurückwandeln. */
export function reviveCard(c: Card): Card {
  return {
    ...c,
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  } as Card;
}
