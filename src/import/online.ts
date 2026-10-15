/** Abruf eigener Partien – nur wenn online. Danach liegt alles lokal. */

export async function fetchChessCom(user: string, months: number, onProgress?: (msg: string) => void): Promise<string> {
  const u = user.trim().toLowerCase();
  if (!u) throw new Error('Bitte Chess.com-Benutzernamen eingeben.');
  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`);
  if (res.status === 404) throw new Error(`Chess.com kennt „${user}" nicht.`);
  if (!res.ok) throw new Error(`Chess.com antwortet mit HTTP ${res.status}.`);
  const { archives } = (await res.json()) as { archives: string[] };
  const recent = archives.slice(-months).reverse();
  const pgns: string[] = [];
  for (const [i, url] of recent.entries()) {
    onProgress?.(`Lade Monat ${i + 1}/${recent.length} …`);
    const r = await fetch(url);
    if (!r.ok) continue;
    const data = (await r.json()) as { games: { pgn?: string; rules?: string }[] };
    for (const g of data.games) if (g.pgn && (g.rules ?? 'chess') === 'chess') pgns.push(g.pgn);
  }
  return pgns.join('\n\n');
}

export async function fetchLichess(user: string, max: number): Promise<string> {
  const u = user.trim();
  if (!u) throw new Error('Bitte Lichess-Benutzernamen eingeben.');
  const res = await fetch(
    `https://lichess.org/api/games/user/${encodeURIComponent(u)}?max=${max}&clocks=false&evals=false&opening=true&perfType=bullet,blitz,rapid,classical,correspondence`,
    { headers: { Accept: 'application/x-chess-pgn' } },
  );
  if (res.status === 404) throw new Error(`Lichess kennt „${user}" nicht.`);
  if (!res.ok) throw new Error(`Lichess antwortet mit HTTP ${res.status}.`);
  return res.text();
}
