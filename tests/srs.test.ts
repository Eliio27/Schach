import { describe, expect, it } from 'vitest';
import { gradeAttempt, isDue, needsReview, newCard, Rating, review, reviveCard, State } from '../src/srs/srs';

const DAY = 24 * 3600 * 1000;

describe('gradeAttempt', () => {
  it('falsch oder Lösung angezeigt → Again', () => {
    expect(gradeAttempt({ correct: false, hint: 0, seconds: 5 })).toBe(Rating.Again);
    expect(gradeAttempt({ correct: true, hint: 4, seconds: 5 })).toBe(Rating.Again);
  });
  it('Hinweis 2–3 → Hard', () => {
    expect(gradeAttempt({ correct: true, hint: 2, seconds: 5 })).toBe(Rating.Hard);
    expect(gradeAttempt({ correct: true, hint: 3, seconds: 5 })).toBe(Rating.Hard);
  });
  it('Hinweis 1 oder langsam → Good', () => {
    expect(gradeAttempt({ correct: true, hint: 1, seconds: 5 })).toBe(Rating.Good);
    expect(gradeAttempt({ correct: true, hint: 0, seconds: 45 })).toBe(Rating.Good);
  });
  it('schnell ohne Hinweis → Easy nur im Review-Status', () => {
    expect(gradeAttempt({ correct: true, hint: 0, seconds: 10 }, State.Review)).toBe(Rating.Easy);
    expect(gradeAttempt({ correct: true, hint: 0, seconds: 10 }, State.New)).toBe(Rating.Good);
  });
});

describe('needsReview', () => {
  it('nur falsche oder stark unterstützte Versuche kommen in den Plan', () => {
    expect(needsReview({ correct: false, hint: 0, seconds: 1 })).toBe(true);
    expect(needsReview({ correct: true, hint: 2, seconds: 1 })).toBe(true);
    expect(needsReview({ correct: true, hint: 1, seconds: 1 })).toBe(false);
    expect(needsReview({ correct: true, hint: 0, seconds: 1 })).toBe(false);
  });
});

describe('Wiederholungsplanung', () => {
  const t0 = new Date('2026-10-01T08:00:00Z');

  it('neue Karte ist sofort fällig', () => {
    expect(isDue(newCard(t0), t0)).toBe(true);
  });

  it('Intervalle wachsen bei wiederholtem Erfolg', () => {
    let card = newCard(t0);
    let now = t0;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      card = review(card, { correct: true, hint: 0, seconds: 40 }, now);
      const due = new Date(card.due);
      intervals.push(due.getTime() - now.getTime());
      now = due;
    }
    for (let i = 2; i < intervals.length; i++) expect(intervals[i]!).toBeGreaterThan(intervals[i - 1]!);
    expect(intervals[4]!).toBeGreaterThan(7 * DAY);
  });

  it('ein Fehler setzt das Intervall stark zurück', () => {
    let card = newCard(t0);
    let now = t0;
    for (let i = 0; i < 4; i++) {
      card = review(card, { correct: true, hint: 0, seconds: 40 }, now);
      now = new Date(card.due);
    }
    const before = card.scheduled_days * DAY;
    const failed = review(card, { correct: false, hint: 0, seconds: 40 }, now);
    const after = new Date(failed.due).getTime() - now.getTime();
    expect(after).toBeLessThan(DAY);
    expect(after).toBeLessThan(before);
    expect(failed.lapses).toBe(1);
  });

  it('Hard plant kürzer als Good', () => {
    let card = newCard(t0);
    card = review(card, { correct: true, hint: 0, seconds: 40 }, t0);
    const now = new Date(card.due);
    const hard = review(card, { correct: true, hint: 2, seconds: 5 }, now);
    const good = review(card, { correct: true, hint: 0, seconds: 40 }, now);
    expect(new Date(hard.due).getTime()).toBeLessThan(new Date(good.due).getTime());
  });

  it('maximales Intervall 180 Tage', () => {
    let card = newCard(t0);
    let now = t0;
    for (let i = 0; i < 20; i++) {
      card = review(card, { correct: true, hint: 0, seconds: 5 }, now);
      now = new Date(card.due);
    }
    expect(card.scheduled_days).toBeLessThanOrEqual(180);
  });

  it('reviveCard stellt Datumsfelder aus JSON wieder her', () => {
    const card = review(newCard(t0), { correct: true, hint: 0, seconds: 5 }, t0);
    const json = JSON.parse(JSON.stringify(card));
    const revived = reviveCard(json);
    expect(revived.due).toBeInstanceOf(Date);
    expect(review(revived, { correct: true, hint: 0, seconds: 5 }, new Date(revived.due)).reps).toBe(2);
  });
});
