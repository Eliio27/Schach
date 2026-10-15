import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { UNITS } from '../src/course/course';
import { reachPlan } from '../src/course/reach';
import type { CustomTask } from '../src/course/types';

const play = (c: Chess, u: string) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

describe('Kursinhalte', () => {
  it('IDs sind eindeutig', () => {
    const ids = UNITS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    const taskIds = UNITS.flatMap((u) => [...(u.tasks ?? []), ...(u.endgames ?? [])].map((t) => t.id));
    expect(new Set(taskIds).size).toBe(taskIds.length);
  });

  for (const u of UNITS) {
    for (const t of u.tasks ?? []) {
      if (t.kind === 'custom') {
        it(`${t.id}: Lösung ist legal`, () => {
          const c = new Chess(t.fen);
          if (t.setup) play(c, t.setup);
          const start = c.fen();
          for (const m of t.solution) expect(() => play(c, m)).not.toThrow();
          for (const a of (t as CustomTask).alts ?? []) expect(() => play(new Chess(start), a)).not.toThrow();
          if (t.accept === 'mate') expect(c.isCheckmate()).toBe(true);
        });
      } else {
        it(`${t.id}: Ziel ist erreichbar`, () => {
          const plan = reachPlan(t);
          expect(plan).not.toBeNull();
          expect(plan!.length).toBeGreaterThan(0);
          expect(plan!.length).toBeLessThanOrEqual(8);
        });
      }
    }
    for (const e of u.endgames ?? []) {
      it(`${e.id}: Startstellung ist legal, Weiss am Zug`, () => {
        const c = new Chess(e.fen);
        expect(c.turn()).toBe('w');
        expect(c.isGameOver()).toBe(false);
      });
    }
    if (u.concept.example) {
      it(`${u.id}: Beispielzüge sind legal`, () => {
        const ex = u.concept.example!;
        const c = new Chess(ex.fen, { skipValidation: true });
        for (const m of ex.moves) {
          const piece = c.get(m.slice(0, 2) as never);
          expect(piece).toBeTruthy();
          if (piece!.color !== c.turn()) {
            const parts = c.fen().split(' ');
            parts[1] = piece!.color;
            parts[3] = '-';
            c.load(parts.join(' '), { skipValidation: true });
          }
          expect(() => play(c, m)).not.toThrow();
        }
      });
    }
  }

  it('A6: In den Patt-Aufgaben gibt es den Patt-Fehler wirklich', () => {
    const c = new Chess('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1');
    play(c, 'f1f7');
    expect(c.isStalemate()).toBe(true);
  });
});
