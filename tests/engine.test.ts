import { describe, expect, it } from 'vitest';
import { parseInfo } from '../src/engine/engine';

describe('parseInfo (UCI)', () => {
  it('rechnet Scores in Weiss-Sicht um', () => {
    const line = 'info depth 14 seldepth 20 multipv 1 score cp 35 nodes 1000 nps 1 time 10 pv e7e5 g1f3';
    expect(parseInfo(line, true)).toEqual({ score: { cp: 35 }, pv: ['e7e5', 'g1f3'], depth: 14 });
    expect(parseInfo(line, false)!.score).toEqual({ cp: -35 });
  });
  it('liest Matt-Scores', () => {
    expect(parseInfo('info depth 5 score mate 2 pv a1a8', true)!.score).toEqual({ mate: 2 });
    expect(parseInfo('info depth 5 score mate -1 pv a1a8', false)!.score).toEqual({ mate: 1 });
  });
  it('ignoriert Zeilen ohne Score oder PV', () => {
    expect(parseInfo('info string NNUE evaluation enabled', true)).toBeNull();
  });
});
