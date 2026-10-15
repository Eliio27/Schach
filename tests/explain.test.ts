import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { detectFork, explainMistake, explainPuzzle, mainTag } from '../src/analysis/explain';

describe('detectFork', () => {
  it('erkennt Springergabel auf König und Turm', () => {
    const f = detectFork('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'b5c7');
    expect(f?.targets.map((t) => t.type).sort()).toEqual(['k', 'r']);
  });
  it('erkennt Gabel auf zwei Türme', () => {
    const f = detectFork('1r3r1k/8/8/4N3/8/8/8/K7 w - - 0 1', 'e5d7');
    expect(f?.targets.map((t) => t.square).sort()).toEqual(['b8', 'f8']);
  });
  it('keine Gabel, wenn der Springer gratis geschlagen werden kann', () => {
    expect(detectFork('1r3r1k/8/2b5/4N3/8/8/8/K7 w - - 0 1', 'e5d7')).toBeNull();
  });
  it('keine Gabel bei nur einem Ziel', () => {
    expect(detectFork('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'b5d6')).toBeNull();
  });
  it('gedeckte, gleichwertige Figuren zählen nicht als Ziel', () => {
    // Springer greift zwei gedeckte Springer an → keine Gabel
    expect(detectFork('4k3/8/2n1n3/3p4/8/2N5/8/4K3 w - - 0 1', 'c3b5')).toBeNull();
  });
});

describe('explainMistake', () => {
  it('Matt zugelassen auf der Grundreihe', () => {
    const e = explainMistake({
      fen: '4r1k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
      played: 'd1d5',
      best: 'd1d4',
      bestPv: ['d1d4'],
      replyPv: ['e8e1'],
      before: { cp: 400 },
      after: { mate: -1 },
    });
    expect(e.motifs).toEqual(['mateAllowed', 'backRank']);
    expect(e.text).toContain('setzt Schwarz in einem Zug matt: 1… Te1#');
    expect(e.text).toContain('Grundreihe');
  });

  it('Matt verpasst', () => {
    const e = explainMistake({
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      played: 'g1f1',
      best: 'a1a8',
      bestPv: ['a1a8'],
      replyPv: ['g8f8'],
      before: { mate: 1 },
      after: { cp: 500 },
    });
    expect(e.motifs).toContain('mateMissed');
    expect(e.text).toContain('Matt in 1: 1. Ta8#');
  });

  it('kein „Matt verpasst", wenn der gespielte Zug auch mattsetzt', () => {
    const e = explainMistake({
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      played: 'a1a7',
      best: 'a1a8',
      bestPv: ['a1a8'],
      replyPv: ['g8f8', 'a7a8'],
      before: { mate: 1 },
      after: { mate: 2 },
    });
    expect(e.motifs).not.toContain('mateMissed');
  });

  it('Figur eingestellt', () => {
    const e = explainMistake({
      fen: '4k3/8/8/4p3/8/8/8/2B1K3 w - - 0 1',
      played: 'c1f4',
      best: 'e1d2',
      bestPv: ['e1d2'],
      replyPv: ['e5f4'],
      before: { cp: 300 },
      after: { cp: 0 },
    });
    expect(e.motifs).toEqual(['pieceLost']);
    expect(e.text).toContain('schlägt Schwarz mit exf4 den Läufer auf f4');
  });

  it('kein „eingestellt" bei gleichwertigem Abtausch', () => {
    // Läufer schlägt gedeckten Springer: Lxc6 bxc6 → materiell ausgeglichen
    const e = explainMistake({
      fen: '4k3/1p6/2n5/8/4B3/8/8/4K3 w - - 0 1',
      played: 'e4c6',
      best: 'e1d2',
      bestPv: ['e1d2'],
      replyPv: ['b7c6'],
      before: { cp: 50 },
      after: { cp: -60 },
    });
    expect(e.motifs).not.toContain('pieceLost');
  });

  it('verpasste Gabel mit Zielen', () => {
    const e = explainMistake({
      fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
      played: 'e1e2',
      best: 'b5c7',
      bestPv: ['b5c7', 'e8d7', 'c7a8'],
      replyPv: ['a8a1'],
      before: { cp: 500 },
      after: { cp: 0 },
    });
    expect(e.motifs).toEqual(['forkMissed']);
    expect(e.text).toContain('Sc7+ hätte den König auf e8 und den Turm auf a8 gleichzeitig angegriffen');
  });

  it('ungedeckte Figur übersehen', () => {
    const e = explainMistake({
      fen: '4k3/8/8/2q5/8/8/7P/2RK4 w - - 0 1',
      played: 'h2h3',
      best: 'c1c5',
      bestPv: ['c1c5'],
      replyPv: ['c5a5'],
      before: { cp: 400 },
      after: { cp: -900 },
    });
    expect(e.motifs).toContain('freePieceMissed');
    expect(e.text).toContain('Die Dame auf c5 war ungedeckt – Txc5 gewinnt sie.');
  });

  it('allgemeiner Satz, wenn kein Motiv sicher ist', () => {
    const e = explainMistake({
      fen: new Chess().fen(),
      played: 'a2a3',
      best: 'e2e4',
      bestPv: ['e2e4', 'e7e5'],
      replyPv: ['e7e5'],
      before: { cp: 30 },
      after: { cp: -120 },
    });
    expect(e.motifs).toEqual(['general']);
    expect(e.text).toBe('Besser war e4 (+0.3). Der Zug kostet etwa 1.5 Bauern.');
  });
});

describe('explainPuzzle', () => {
  it('nennt Thema, Gabel-Ziele und Lösung', () => {
    const e = explainPuzzle('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['b5c7', 'e8d7', 'c7a8'], ['fork', 'short']);
    expect(e.text).toContain('Gabel');
    expect(e.text).toContain('Sc7+ greift den König auf e8 und den Turm auf a8 an.');
    expect(e.text).toContain('Lösung: 1. Sc7+ Kd7 2. Sxa8');
  });
  it('keine erfundenen Details bei anderen Tags', () => {
    const e = explainPuzzle('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['a1a8'], ['backRankMate', 'mateIn1', 'mate']);
    expect(e.text).toBe('Grundreihenmatt: Der König ist von den eigenen Bauern eingesperrt. Lösung: 1. Ta8#');
  });
  it('mainTag bevorzugt spezifische Tags', () => {
    expect(mainTag(['mateIn2', 'smotheredMate'])).toBe('smotheredMate');
    expect(mainTag(['crushing'])).toBeNull();
  });
});

import { explainRefutation } from '../src/analysis/explain';

describe('explainRefutation', () => {
  it('meldet sofortiges Matt', () => {
    // Weiss spielt Dd5?? und Schwarz setzt mit Te1 matt
    const before = '4r1k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1';
    const after = '4r1k1/5ppp/8/3Q4/8/8/5PPP/6K1 b - - 1 1';
    expect(explainRefutation(before, 'd1d5', after, ['e8e1'], { mate: -1 })).toBe('Danach setzt Schwarz sofort matt: Te1#.');
  });
  it('meldet Figurenverlust', () => {
    const before = '4k3/8/8/4p3/8/8/8/2B1K3 w - - 0 1';
    const after = '4k3/8/8/4p3/5B2/8/8/4K3 b - - 1 1';
    expect(explainRefutation(before, 'c1f4', after, ['e5f4'], { cp: -300 })).toBe('Schwarz antwortet exf4 und schlägt den Läufer auf f4.');
  });
  it('erkennt „gut, aber nicht der beste"', () => {
    const before = '4k3/8/8/8/8/8/8/3QK3 w - - 0 1';
    const after = '4k3/8/8/8/8/8/3Q4/4K3 b - - 1 1';
    expect(explainRefutation(before, 'd1d2', after, ['e8f7'], { cp: 900 })).toMatch(/^Nicht schlecht/);
  });
});
