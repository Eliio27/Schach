/**
 * Stockfish 18 lite (single-thread, WASM) in einem Web Worker.
 * Keine Threads/SharedArrayBuffer nötig – läuft auf GitHub Pages ohne COOP/COEP.
 * Aufträge werden nacheinander abgearbeitet; nach 2 Minuten Leerlauf wird der Worker beendet.
 */
import type { Score } from '../analysis/classify';

export const ENGINE_URL = 'engine/stockfish-18-lite-single.js';

export interface SearchResult {
  /** Bewertung aus Sicht von Weiss. */
  score: Score;
  best: string | null;
  pv: string[];
  depth: number;
}

export interface SearchOptions {
  depth?: number;
  movetime?: number;
  /** Spielstärke 0–20 („Skill Level"). Ohne Angabe: volle Stärke. */
  skill?: number;
}

type Job = {
  fen: string;
  opts: SearchOptions;
  resolve: (r: SearchResult) => void;
  reject: (e: Error) => void;
};

const IDLE_MS = 120_000;

class Engine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Job[] = [];
  private running = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private lineHandler: ((line: string) => void) | null = null;
  private currentSkill = 20;
  private failed = false;

  /** Startet den Worker (falls nötig) und wartet auf „uciok"/„readyok". */
  warmUp(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      try {
        const url = new URL(ENGINE_URL, document.baseURI).href;
        const w = new Worker(url);
        this.worker = w;
        w.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data : String(e.data);
          this.lineHandler?.(line);
        };
        w.onerror = (e) => {
          this.failed = true;
          reject(new Error('Engine konnte nicht geladen werden: ' + (e.message || 'unbekannt')));
        };
        const timeout = setTimeout(() => reject(new Error('Engine antwortet nicht.')), 30_000);
        this.lineHandler = (line) => {
          if (line === 'uciok') {
            this.send('setoption name Hash value 16');
            this.send('setoption name Threads value 1');
            this.send('isready');
          } else if (line === 'readyok') {
            clearTimeout(timeout);
            this.lineHandler = null;
            resolve();
          }
        };
        this.send('uci');
      } catch (e) {
        this.failed = true;
        reject(e as Error);
      }
    });
    this.ready.catch(() => {
      this.ready = null;
      this.worker?.terminate();
      this.worker = null;
    });
    return this.ready;
  }

  get available(): boolean {
    return !this.failed;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  /** Sucht in einer Stellung. Ergebnis in Weiss-Sicht. */
  search(fen: string, opts: SearchOptions = {}): Promise<SearchResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fen, opts, resolve, reject });
      void this.pump();
    });
  }

  /** Bricht alle wartenden Aufträge ab (laufender Auftrag wird gestoppt). */
  cancelAll() {
    const q = this.queue;
    this.queue = [];
    for (const j of q) j.reject(new Error('abgebrochen'));
    if (this.running) this.send('stop');
  }

  private async pump() {
    if (this.running) return;
    const job = this.queue.shift();
    if (!job) {
      this.scheduleIdle();
      return;
    }
    this.running = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    try {
      await this.warmUp();
      job.resolve(await this.run(job));
    } catch (e) {
      job.reject(e as Error);
    } finally {
      this.running = false;
      void this.pump();
    }
  }

  private run(job: Job): Promise<SearchResult> {
    const whiteToMove = (job.fen.split(' ')[1] ?? 'w') === 'w';
    const skill = job.opts.skill ?? 20;
    if (skill !== this.currentSkill) {
      this.send(`setoption name Skill Level value ${skill}`);
      this.currentSkill = skill;
    }
    return new Promise((resolve) => {
      let last: SearchResult = { score: { cp: 0 }, best: null, pv: [], depth: 0 };
      this.lineHandler = (line) => {
        if (line.startsWith('info') && line.includes(' pv ') && !line.includes('multipv 2')) {
          const parsed = parseInfo(line, whiteToMove);
          if (parsed) last = { ...last, ...parsed };
        } else if (line.startsWith('bestmove')) {
          this.lineHandler = null;
          const best = line.split(' ')[1];
          resolve({ ...last, best: best && best !== '(none)' ? best : null });
        }
      };
      this.send(`position fen ${job.fen}`);
      const parts = ['go'];
      if (job.opts.depth) parts.push(`depth ${job.opts.depth}`);
      if (job.opts.movetime) parts.push(`movetime ${job.opts.movetime}`);
      if (!job.opts.depth && !job.opts.movetime) parts.push('depth 12');
      this.send(parts.join(' '));
    });
  }

  private scheduleIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.terminate(), IDLE_MS);
  }

  terminate() {
    this.cancelAll();
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.running = false;
    this.currentSkill = 20;
  }
}

/** Parst eine UCI-„info"-Zeile. Score wird in Weiss-Sicht umgerechnet. */
export function parseInfo(line: string, whiteToMove: boolean): Omit<SearchResult, 'best'> | null {
  const t = line.split(' ');
  const di = t.indexOf('depth');
  const si = t.indexOf('score');
  const pi = t.indexOf('pv');
  if (si < 0 || pi < 0) return null;
  const kind = t[si + 1];
  const val = parseInt(t[si + 2] ?? '0', 10);
  const sign = whiteToMove ? 1 : -1;
  const score: Score = kind === 'mate' ? { mate: sign * val } : { cp: sign * val };
  return { score, pv: t.slice(pi + 1), depth: di >= 0 ? parseInt(t[di + 1] ?? '0', 10) : 0 };
}

export const engine = new Engine();
