import { Chess } from 'chess.js';

export interface ParsedGame {
  headers: Record<string, string>;
  /** Startstellung (FEN) – Standard oder aus dem FEN-Header. */
  startFen: string;
  /** Züge in UCI. */
  uci: string[];
  /** Züge in SAN (englisch). */
  san: string[];
  /** Ergebnis „1-0", „0-1", „1/2-1/2" oder „*". */
  result: string;
  /** Bereinigte PGN zum Speichern. */
  pgn: string;
}

export interface ParseResult {
  games: ParsedGame[];
  errors: { index: number; message: string }[];
}

/**
 * Teilt einen Text mit beliebig vielen PGN-Partien in einzelne Partien.
 * Eine neue Partie beginnt mit einem Header-Block nach einem Zugteil.
 */
export function splitPgn(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const lines = normalized.split('\n');
  const games: string[] = [];
  let current: string[] = [];
  let inMoves = false;
  for (const line of lines) {
    const t = line.trim();
    const isHeader = /^\[[A-Za-z0-9_]+\s+".*"\]$/.test(t);
    if (isHeader && inMoves) {
      games.push(current.join('\n'));
      current = [];
      inMoves = false;
    }
    if (!isHeader && t !== '') inMoves = true;
    current.push(line);
  }
  if (current.some((l) => l.trim() !== '')) games.push(current.join('\n'));
  return games.map((g) => g.trim()).filter((g) => g.length > 0);
}

/** Entfernt Kommentare, Varianten, NAGs und Zugnummern-Rauschen aus dem Zugteil. */
export function cleanMovetext(movetext: string): string {
  let s = movetext;
  // Kommentare { … } und ; bis Zeilenende
  s = s.replace(/\{[^}]*\}/g, ' ');
  s = s.replace(/;[^\n]*/g, ' ');
  // Varianten ( … ), auch verschachtelt
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\([^()]*\)/g, ' ');
  }
  // NAGs ($1) und Annotationen (!?, ??)
  s = s.replace(/\$\d+/g, ' ');
  s = s.replace(/([a-hKQRBNO0-8=+#])[!?]+/g, '$1');
  // Zugnummern „12." und „12..."
  s = s.replace(/\d+\.(\.\.)?/g, ' ');
  // 0-0 → O-O
  s = s.replace(/\b0-0-0\b/g, 'O-O-O').replace(/\b0-0\b/g, 'O-O');
  return s.replace(/\s+/g, ' ').trim();
}

function parseHeaders(text: string): { headers: Record<string, string>; movetext: string } {
  const headers: Record<string, string> = {};
  const rest: string[] = [];
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^\[([A-Za-z0-9_]+)\s+"(.*)"\]$/);
    if (m) headers[m[1]!] = m[2]!.replace(/\\"/g, '"');
    else rest.push(line);
  }
  return { headers, movetext: rest.join('\n') };
}

const RESULT_RE = /^(1-0|0-1|1\/2-1\/2|\*)$/;

/** Parst eine einzelne Partie. Wirft einen Error mit deutscher Meldung bei Fehlern. */
export function parseGame(text: string): ParsedGame {
  const { headers, movetext } = parseHeaders(text);
  const tokens = cleanMovetext(movetext).split(' ').filter(Boolean);
  let result = headers['Result'] ?? '*';
  const startFen = headers['FEN'] && headers['SetUp'] !== '0' ? headers['FEN'] : new Chess().fen();
  let chess: Chess;
  try {
    chess = new Chess(startFen);
  } catch {
    throw new Error('Ungültige Startstellung (FEN-Header).');
  }
  const uci: string[] = [];
  const san: string[] = [];
  for (const tok of tokens) {
    if (RESULT_RE.test(tok)) {
      result = tok;
      break;
    }
    let m;
    try {
      m = chess.move(tok, { strict: false });
    } catch {
      m = null;
    }
    if (!m) {
      const no = Math.floor(san.length / 2) + 1;
      throw new Error(`Ungültiger Zug „${tok}" (Zug ${no}).`);
    }
    uci.push(m.from + m.to + (m.promotion ?? ''));
    san.push(m.san);
  }
  if (san.length === 0) throw new Error('Partie enthält keine Züge.');
  const clean = new Chess(startFen);
  for (const [k, v] of Object.entries(headers)) clean.setHeader(k, v);
  for (const s of san) clean.move(s);
  return { headers, startFen, uci, san, result, pgn: clean.pgn() };
}

/** Parst einen Text mit beliebig vielen Partien. Fehlerhafte Partien werden gemeldet, nicht verworfen. */
export function parsePgnCollection(text: string): ParseResult {
  const games: ParsedGame[] = [];
  const errors: ParseResult['errors'] = [];
  splitPgn(text).forEach((chunk, index) => {
    try {
      games.push(parseGame(chunk));
    } catch (e) {
      errors.push({ index, message: (e as Error).message });
    }
  });
  return { games, errors };
}

/** Stabile ID für eine Partie (für Duplikaterkennung beim Import). */
export function gameId(g: ParsedGame): string {
  const link = g.headers['Link'] ?? g.headers['Site'] ?? '';
  if (/^https?:\/\//.test(link) && !/^https?:\/\/(www\.)?chess\.com\/?$/.test(link)) return link;
  const key = [g.headers['White'], g.headers['Black'], g.headers['Date'], g.headers['UTCTime'] ?? '', g.uci.join('')].join('|');
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'pgn:' + (h >>> 0).toString(36) + ':' + g.uci.length;
}

/** Bestimmt die eigene Farbe anhand des Benutzernamens (ohne Gross-/Kleinschreibung). */
export function myColor(g: ParsedGame, usernames: string[]): 'w' | 'b' | null {
  const names = usernames.map((u) => u.trim().toLowerCase()).filter(Boolean);
  if (names.includes((g.headers['White'] ?? '').toLowerCase())) return 'w';
  if (names.includes((g.headers['Black'] ?? '').toLowerCase())) return 'b';
  return null;
}
