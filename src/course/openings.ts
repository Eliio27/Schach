/** Eröffnungsnamen aus lichess-org/chess-openings (CC0). */
let cache: Promise<Map<string, [string, string]>> | null = null;

export function loadOpenings(): Promise<Map<string, [string, string]>> {
  if (!cache) {
    cache = fetch('data/openings.json')
      .then((r) => r.json() as Promise<[string, string, string][]>)
      .then((rows) => new Map(rows.map(([eco, name, uci]) => [uci, [eco, name] as [string, string]])));
    cache.catch(() => (cache = null));
  }
  return cache;
}

/** Längster passender Eröffnungsname für eine Zugfolge. */
export function nameFor(map: Map<string, [string, string]>, uci: string[]): { eco: string; name: string } | null {
  for (let n = Math.min(uci.length, 30); n > 0; n--) {
    const hit = map.get(uci.slice(0, n).join(' '));
    if (hit) return { eco: hit[0], name: hit[1] };
  }
  return null;
}
