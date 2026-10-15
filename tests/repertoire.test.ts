import { describe, expect, it } from 'vitest';
import { linesFromGames, sanToUci, standardLines } from '../src/course/repertoire';

describe('Repertoire', () => {
  it('Standardlinien sind legal und enden mit eigenem Zug', () => {
    for (const color of ['w', 'b'] as const) {
      const lines = standardLines(color);
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const l of lines) {
        expect(l.uci.length).toBeGreaterThanOrEqual(8);
        const lastOwn = color === 'w' ? l.uci.length % 2 === 1 : l.uci.length % 2 === 0;
        expect(lastOwn).toBe(true);
      }
    }
  });

  it('leitet Linien aus eigenen Partien ab und verzweigt bei Gegnerzügen', () => {
    const e4 = sanToUci('e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5');
    const d4 = sanToUci('d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7');
    const rare = sanToUci('c4 e5 Nc3 Nf6 g3 d5');
    const games = [
      ...Array(4).fill({ uci: e4, color: 'b' }),
      ...Array(3).fill({ uci: d4, color: 'b' }),
      { uci: rare, color: 'b' },
      ...Array(5).fill({ uci: e4, color: 'w' }),
    ];
    const lines = linesFromGames(games, 'b');
    expect(lines).toHaveLength(2);
    expect(lines[0]!.uci).toEqual(e4);
    expect(lines[0]!.games).toBe(4);
    expect(lines[1]!.uci).toEqual(d4);
  });

  it('kürzt auf eigenen Zug und verwirft zu kurze Linien', () => {
    const g = sanToUci('e4 e5 Nf3 Nc6 Bb5');
    const lines = linesFromGames(Array(3).fill({ uci: g, color: 'w' }), 'w');
    expect(lines[0]!.uci).toEqual(g);
    const short = linesFromGames(Array(3).fill({ uci: sanToUci('e4 e5'), color: 'w' }), 'w');
    expect(short).toEqual([]);
  });
});
