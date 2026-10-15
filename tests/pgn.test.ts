import { describe, expect, it } from 'vitest';
import { cleanMovetext, gameId, myColor, parseGame, parsePgnCollection, splitPgn } from '../src/import/pgn';

const CHESSCOM = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.10.12"]
[White "Elischa123"]
[Black "Gegner"]
[Result "1-0"]
[ECO "C50"]
[Link "https://www.chess.com/game/live/123456"]

1. e4 {[%clk 0:09:58.1]} 1... e5 {[%clk 0:09:57]} 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Qxd5 13. O-O O-O 14. Qxa5 1-0`;

const LICHESS = `[Event "Rated Blitz game"]
[Site "https://lichess.org/abcdefgh"]
[White "Gegner2"]
[Black "elischa123"]
[Result "0-1"]

1. f3 e5 2. g4?? Qh4# 0-1`;

describe('splitPgn', () => {
  it('trennt mehrere Partien', () => {
    expect(splitPgn(CHESSCOM + '\n\n' + LICHESS)).toHaveLength(2);
  });
  it('akzeptiert Windows-Zeilenenden und BOM', () => {
    expect(splitPgn('﻿' + LICHESS.replace(/\n/g, '\r\n'))).toHaveLength(1);
  });
  it('akzeptiert Partien ohne Header', () => {
    expect(splitPgn('1. e4 e5 2. Nf3 *')).toHaveLength(1);
  });
});

describe('cleanMovetext', () => {
  it('entfernt Kommentare, Varianten, NAGs und Zugnummern', () => {
    expect(cleanMovetext('1. e4 {gut} (1. d4 d5 (1... Nf6)) 1... e5!? $1 2. Nf3 ; Kommentar\n2... Nc6')).toBe('e4 e5 Nf3 Nc6');
  });
  it('wandelt 0-0 in O-O um', () => {
    expect(cleanMovetext('5. 0-0 0-0-0')).toBe('O-O O-O-O');
  });
});

describe('parseGame', () => {
  it('liest eine Chess.com-Partie mit Uhrzeit-Kommentaren', () => {
    const g = parseGame(CHESSCOM);
    expect(g.san).toHaveLength(27);
    expect(g.uci[0]).toBe('e2e4');
    expect(g.san[24]).toBe('O-O');
    expect(g.result).toBe('1-0');
    expect(g.headers['ECO']).toBe('C50');
  });
  it('liest Annotationen wie ?? und #', () => {
    const g = parseGame(LICHESS);
    expect(g.san).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
    expect(g.result).toBe('0-1');
  });
  it('unterstützt FEN-Header', () => {
    const g = parseGame('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e4 Kd7 *');
    expect(g.uci).toEqual(['e2e4', 'e8d7']);
  });
  it('meldet illegale Züge mit Zugnummer', () => {
    expect(() => parseGame('1. e4 e5 2. Ke3 *')).toThrow(/Ke3.*Zug 2/);
  });
  it('meldet leere Partien', () => {
    expect(() => parseGame('[White "x"]\n\n*')).toThrow(/keine Züge/);
  });
});

describe('parsePgnCollection', () => {
  it('liefert gültige Partien und Fehler getrennt', () => {
    const r = parsePgnCollection(CHESSCOM + '\n\n[White "x"]\n\n1. e4 e4 *\n\n' + LICHESS);
    expect(r.games).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]!.index).toBe(1);
  });
});

describe('gameId / myColor', () => {
  it('nutzt den Link als ID', () => {
    expect(gameId(parseGame(CHESSCOM))).toBe('https://www.chess.com/game/live/123456');
    expect(gameId(parseGame(LICHESS))).toBe('https://lichess.org/abcdefgh');
  });
  it('erzeugt stabile Hash-IDs ohne Link', () => {
    const a = parseGame('[White "a"]\n[Black "b"]\n\n1. e4 e5 *');
    const b = parseGame('[White "a"]\n[Black "b"]\n\n1. e4 e5 *');
    expect(gameId(a)).toBe(gameId(b));
    expect(gameId(a)).toMatch(/^pgn:/);
  });
  it('erkennt die eigene Farbe ohne Gross-/Kleinschreibung', () => {
    expect(myColor(parseGame(CHESSCOM), ['elischa123'])).toBe('w');
    expect(myColor(parseGame(LICHESS), ['Elischa123'])).toBe('b');
    expect(myColor(parseGame(LICHESS), ['jemand'])).toBeNull();
  });
});
