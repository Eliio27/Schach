import { describe, expect, it } from 'vitest';
import {
  aggregateAccuracy,
  classifyMove,
  cpLoss,
  formatScore,
  moveAccuracy,
  scoreToCp,
  winLoss,
  winPercent,
} from '../src/analysis/classify';

describe('winPercent', () => {
  it('ist 50 % bei ausgeglichener Stellung', () => {
    expect(winPercent(0)).toBeCloseTo(50, 5);
  });
  it('ist symmetrisch', () => {
    expect(winPercent(300) + winPercent(-300)).toBeCloseTo(100, 5);
  });
  it('steigt monoton', () => {
    expect(winPercent(100)).toBeGreaterThan(winPercent(50));
    expect(winPercent(10000)).toBeGreaterThan(99);
  });
});

describe('scoreToCp', () => {
  it('bildet Matt auf grosse Werte ab, näheres Matt grösser', () => {
    expect(scoreToCp({ mate: 1 })).toBeGreaterThan(scoreToCp({ mate: 5 }));
    expect(scoreToCp({ mate: -2 })).toBeLessThan(-9000);
  });
  it('übernimmt Centipawns', () => {
    expect(scoreToCp({ cp: -42 })).toBe(-42);
  });
});

describe('classifyMove', () => {
  it('Engine-Zug ist immer „best"', () => {
    expect(classifyMove({ cp: 50 }, { cp: 40 }, 'w', true)).toBe('best');
  });
  it('kleiner Verlust ist „good"', () => {
    expect(classifyMove({ cp: 30 }, { cp: 10 }, 'w', false)).toBe('good');
  });
  it('erkennt Ungenauigkeit, Fehler und Patzer aus Sicht von Weiss', () => {
    expect(classifyMove({ cp: 0 }, { cp: -70 }, 'w', false)).toBe('inaccuracy');
    expect(classifyMove({ cp: 0 }, { cp: -130 }, 'w', false)).toBe('mistake');
    expect(classifyMove({ cp: 0 }, { cp: -400 }, 'w', false)).toBe('blunder');
  });
  it('rechnet aus Sicht von Schwarz richtig', () => {
    // Schwarz zieht, Weiss-Bewertung steigt von 0 auf +400 → Patzer von Schwarz
    expect(classifyMove({ cp: 0 }, { cp: 400 }, 'b', false)).toBe('blunder');
    // Weiss-Bewertung fällt → für Schwarz gut
    expect(classifyMove({ cp: 0 }, { cp: -400 }, 'b', false)).toBe('good');
  });
  it('verpasstes Matt in klar gewonnener Stellung ist kein Patzer', () => {
    expect(classifyMove({ mate: 3 }, { cp: 1500 }, 'w', false)).toBe('good');
  });
  it('Matt zulassen aus ausgeglichener Stellung ist ein Patzer', () => {
    expect(classifyMove({ cp: 0 }, { mate: -2 }, 'w', false)).toBe('blunder');
  });
  it('in total verlorener Stellung zählen weitere Verluste kaum', () => {
    expect(classifyMove({ cp: -1500 }, { cp: -1900 }, 'w', false)).toBe('good');
  });
  it('Grenzwert Ungenau liegt bei ca. −55 cp aus 0', () => {
    expect(winLoss({ cp: 0 }, { cp: -54 }, 'w')).toBeLessThan(5);
    expect(winLoss({ cp: 0 }, { cp: -55 }, 'w')).toBeGreaterThanOrEqual(5);
  });
});

describe('Genauigkeit', () => {
  it('100 % ohne Verlust', () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 0);
  });
  it('sinkt mit Verlust und bleibt ≥ 0', () => {
    expect(moveAccuracy(10)).toBeLessThan(moveAccuracy(5));
    expect(moveAccuracy(100)).toBeGreaterThanOrEqual(0);
  });
  it('Aggregat liegt zwischen harmonischem und arithmetischem Mittel', () => {
    const a = aggregateAccuracy([100, 100, 20])!;
    expect(a).toBeLessThan(220 / 3);
    expect(a).toBeGreaterThan(40);
    expect(aggregateAccuracy([])).toBeNull();
  });
  it('cpLoss begrenzt auf ±1000', () => {
    expect(cpLoss({ cp: 3000 }, { cp: -3000 }, 'w')).toBe(2000);
    expect(cpLoss({ cp: 0 }, { cp: 100 }, 'w')).toBe(0);
  });
});

describe('formatScore', () => {
  it('formatiert cp und Matt', () => {
    expect(formatScore({ cp: 123 })).toBe('+1.2');
    expect(formatScore({ cp: -50 })).toBe('−0.5');
    expect(formatScore({ mate: 3 })).toBe('#3');
    expect(formatScore({ mate: -2 })).toBe('−#2');
  });
});
