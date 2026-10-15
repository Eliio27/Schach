import { allGames, putGame, type StoredGame } from '../db/db';
import { gameId, myColor, parsePgnCollection } from './pgn';
import { loadOpenings, nameFor } from '../course/openings';

export interface ImportResult {
  added: string[];
  duplicates: number;
  errors: { index: number; message: string }[];
}

/** Importiert PGN-Text, erkennt Duplikate und die eigene Farbe, benennt die Eröffnung. */
export async function importPgnText(text: string, source: StoredGame['source'], usernames: string[]): Promise<ImportResult> {
  const { games, errors } = parsePgnCollection(text);
  const existing = new Set((await allGames()).map((g) => g.id));
  const openings = await loadOpenings().catch(() => null);
  const added: string[] = [];
  let duplicates = 0;
  for (const g of games) {
    const id = gameId(g);
    if (existing.has(id)) {
      duplicates++;
      continue;
    }
    existing.add(id);
    const named = openings ? nameFor(openings, g.uci) : null;
    const h = g.headers;
    await putGame({
      id,
      pgn: g.pgn,
      headers: h,
      white: h['White'] ?? '?',
      black: h['Black'] ?? '?',
      result: g.result,
      date: (h['UTCDate'] ?? h['Date'] ?? '').replace(/\./g, '-').replace(/\?/g, '0'),
      color: myColor(g, usernames),
      source,
      plies: g.uci.length,
      imported: Date.now(),
      opening: h['Opening'] ?? named?.name ?? h['ECOUrl']?.split('/').pop()?.replace(/-/g, ' ') ?? '',
      eco: h['ECO'] ?? named?.eco ?? '',
      status: 'pending',
      progress: 0,
    });
    added.push(id);
  }
  return { added, duplicates, errors };
}
