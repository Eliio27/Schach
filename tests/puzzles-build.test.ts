import { describe, expect, it } from 'vitest';
// @ts-expect-error – reines JS-Modul ohne Typen
import { isValidPuzzle, parseHeader, parseRow, PuzzleSelector, OUTPUT_TAGS } from '../scripts/puzzle-select.mjs';

const HEADER = 'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags';
const BACKRANK_FEN = '6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1';
const row = (id: string, rating: number, pop: number, plays: number, themes: string, moves = 'g8h8 a1a8', dev = 75) =>
  `${id},${BACKRANK_FEN},${moves},${rating},${dev},${pop},${plays},${themes},https://lichess.org/x,`;

describe('build-puzzles', () => {
  it('liest die Kopfzeile und meldet fehlende Spalten', () => {
    expect(parseHeader(HEADER).Moves).toBe(2);
    expect(() => parseHeader('PuzzleId,FEN')).toThrow(/Moves/);
  });

  it('prüft Legalität der Züge', () => {
    expect(isValidPuzzle({ fen: BACKRANK_FEN, moves: 'g8h8 a1a8' })).toBe(true);
    expect(isValidPuzzle({ fen: BACKRANK_FEN, moves: 'g8h8 a1a9' })).toBe(false);
    expect(isValidPuzzle({ fen: BACKRANK_FEN, moves: 'g8h8' })).toBe(false);
  });

  it('filtert nach Rating, Popularität, Plays und Abweichung', () => {
    const idx = parseHeader(HEADER);
    const sel = new PuzzleSelector({ target: 100 });
    sel.add(parseRow(row('ok1', 800, 90, 5000, 'backRankMate mateIn1 mate short'), idx));
    sel.add(parseRow(row('lowpop', 800, 50, 5000, 'backRankMate'), idx));
    sel.add(parseRow(row('toohigh', 1900, 95, 5000, 'backRankMate'), idx));
    sel.add(parseRow(row('toolow', 300, 95, 5000, 'backRankMate'), idx));
    sel.add(parseRow(row('fewplays', 800, 95, 100, 'backRankMate'), idx));
    sel.add(parseRow(row('dev', 800, 95, 5000, 'backRankMate', 'g8h8 a1a8', 120), idx));
    sel.add(parseRow(row('notag', 800, 95, 5000, 'crushing middlegame'), idx));
    sel.add(parseRow(row('illegal', 800, 95, 5000, 'fork', 'g8h8 a1a9'), idx));
    const ids = sel.select().map((p: { id: string }) => p.id);
    expect(ids).toEqual(['ok1']);
  });

  it('wählt ausgewogen über Tags und begrenzt auf das Ziel', () => {
    const idx = parseHeader(HEADER);
    const sel = new PuzzleSelector({ target: 40, reservoir: 30 });
    for (let i = 0; i < 300; i++) sel.add(parseRow(row(`f${i}`, 400 + (i % 14) * 100, 90, 5000, 'fork'), idx));
    for (let i = 0; i < 10; i++) sel.add(parseRow(row(`p${i}`, 900, 90, 5000, 'pin'), idx));
    const chosen = sel.select();
    expect(chosen).toHaveLength(40);
    // Pin hat nur 10 Kandidaten in einem Band – alle sollten drin sein, weil Round-Robin ausgleicht
    expect(chosen.filter((p: { id: string }) => p.id.startsWith('p')).length).toBeGreaterThanOrEqual(5);
  });

  it('nutzt gelockerten Plays-Filter nur für seltene Tags', () => {
    const idx = parseHeader(HEADER);
    const sel = new PuzzleSelector({ target: 100, reservoir: 4 });
    sel.add(parseRow(row('rare', 900, 90, 500, 'enPassant'), idx));
    for (let i = 0; i < 10; i++) sel.add(parseRow(row(`s${i}`, 900, 90, 5000, 'fork'), idx));
    sel.add(parseRow(row('weak', 900, 90, 500, 'fork'), idx));
    const ids = sel.select().map((p: { id: string }) => p.id);
    expect(ids).toContain('rare');
    expect(ids).not.toContain('weak');
  });

  it('erzeugt kompaktes Ausgabeformat mit Tag-Indizes', () => {
    const idx = parseHeader(HEADER);
    const sel = new PuzzleSelector({ target: 10 });
    sel.add(parseRow(row('a', 800, 90, 5000, 'backRankMate mateIn1 mate'), idx));
    const out = sel.output(sel.select(), '2026-10-15');
    expect(out.v).toBe(1);
    expect(out.p[0][0]).toBe('a');
    expect(out.p[0][4].map((i: number) => OUTPUT_TAGS[i]).sort()).toEqual(['backRankMate', 'mate', 'mateIn1']);
  });

  it('ist reproduzierbar (fester Seed)', () => {
    const idx = parseHeader(HEADER);
    const run = () => {
      const sel = new PuzzleSelector({ target: 20, reservoir: 5 });
      for (let i = 0; i < 200; i++) sel.add(parseRow(row(`f${i}`, 800, 90, 5000, 'fork'), idx));
      return sel.select().map((p: { id: string }) => p.id).join();
    };
    expect(run()).toBe(run());
  });
});
