import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import { FILES } from '../chess/util';

export type HighlightKind = 'good' | 'bad' | 'hint' | 'target' | 'sel';

export interface Highlight {
  square: string;
  kind: HighlightKind;
}

export interface Arrow {
  from: string;
  to: string;
  color?: 'gold' | 'green' | 'red';
}

export interface BoardProps {
  fen: string;
  orientation?: 'w' | 'b';
  /** Welche Farbe darf ziehen? `null` = niemand. Standard: Seite am Zug. */
  movable?: 'w' | 'b' | null;
  /** Nur diese Startfelder sind ziehbar (z. B. bei „Bring die Figur nach …"). */
  onlyFrom?: string[];
  onMove?: (uci: string) => void;
  lastMove?: [string, string] | null;
  /** Wenn true, wird der letzte Zug animiert, sobald sich `fen` ändert. */
  animate?: boolean;
  highlights?: Highlight[];
  arrows?: Arrow[];
  coords?: boolean;
}

type Piece = { type: string; color: 'w' | 'b'; square: Square };

const ARROW_COLOR = { gold: '#e0b24a', green: '#9bbf7a', red: '#e07a5f' };

function sqXY(sq: string, orientation: 'w' | 'b'): [number, number] {
  const f = FILES.indexOf(sq[0]!);
  const r = parseInt(sq[1]!, 10) - 1;
  return orientation === 'w' ? [f, 7 - r] : [7 - f, r];
}

function xyToSq(x: number, y: number, orientation: 'w' | 'b'): string | null {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  const f = orientation === 'w' ? x : 7 - x;
  const r = orientation === 'w' ? 7 - y : y;
  return FILES[f]! + (r + 1);
}

/** SVG-Schachbrett mit Tap-Tap und Ziehen, Animation, Markierungen und Pfeilen. */
export function Board(props: BoardProps) {
  const orientation = props.orientation ?? 'w';
  const chess = useMemo(() => {
    try {
      return new Chess(props.fen);
    } catch {
      return new Chess();
    }
  }, [props.fen]);
  const pieces = useMemo(() => chess.board().flat().filter(Boolean) as Piece[], [chess]);
  const turn = chess.turn();
  const movable = props.movable === undefined ? turn : props.movable;
  const canMove = !!props.onMove && movable !== null && movable === turn;

  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: string; x: number; y: number; moved: boolean } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Animation des letzten Zuges: Beim ersten Rendern der neuen Stellung steht die Figur (ohne Transition)
  // versetzt auf dem Ausgangsfeld, im nächsten Frame gleitet sie aufs Zielfeld.
  const animRef = useRef<{ fen: string; to: string; dx: number; dy: number; done: boolean } | null>(null);
  const [, force] = useState(0);
  const prevFen = useRef(props.fen);
  if (prevFen.current !== props.fen) {
    prevFen.current = props.fen;
    if (props.animate && props.lastMove) {
      const [from, to] = props.lastMove;
      const [fx, fy] = sqXY(from, orientation);
      const [tx, ty] = sqXY(to, orientation);
      animRef.current = { fen: props.fen, to, dx: fx - tx, dy: fy - ty, done: false };
    } else animRef.current = null;
  }
  useEffect(() => {
    setSelected(null);
    setPromo(null);
    const a = animRef.current;
    if (!a || a.done) return undefined;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (animRef.current === a) {
          a.done = true;
          force((n) => n + 1);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [props.fen]);
  const anim = animRef.current;

  const legalFrom = (sq: string): string[] => {
    if (!canMove) return [];
    if (props.onlyFrom && !props.onlyFrom.includes(sq)) return [];
    const p = chess.get(sq as Square);
    if (!p || p.color !== movable) return [];
    return chess.moves({ square: sq as Square, verbose: true }).map((m) => m.to);
  };

  const dests = useMemo(() => (selected ? legalFrom(selected) : []), [selected, chess, canMove]);

  const tryMove = (from: string, to: string) => {
    const moves = chess.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to);
    if (moves.length === 0) return false;
    if (moves.some((m) => m.promotion)) {
      setPromo({ from, to });
      return true;
    }
    setSelected(null);
    props.onMove?.(from + to);
    return true;
  };

  const pointToBoard = (e: PointerEvent): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 8, ((e.clientY - r.top) / r.height) * 8];
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!canMove || promo) return;
    const [bx, by] = pointToBoard(e);
    const sq = xyToSq(Math.floor(bx), Math.floor(by), orientation);
    if (!sq) return;
    if (selected && selected !== sq && dests.includes(sq)) {
      tryMove(selected, sq);
      return;
    }
    if (legalFrom(sq).length > 0) {
      setSelected(sq);
      setDrag({ from: sq, x: bx, y: by, moved: false });
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } else {
      setSelected(null);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return;
    const [bx, by] = pointToBoard(e);
    const moved = drag.moved || Math.hypot(bx - drag.x, by - drag.y) > 0.25;
    setDrag({ ...drag, x: bx, y: by, moved });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag) return;
    const [bx, by] = pointToBoard(e);
    const sq = xyToSq(Math.floor(bx), Math.floor(by), orientation);
    const d = drag;
    setDrag(null);
    if (d.moved && sq && sq !== d.from) {
      if (!tryMove(d.from, sq)) setSelected(null);
    }
  };

  const checkSq = chess.inCheck()
    ? pieces.find((p) => p.type === 'k' && p.color === turn)?.square
    : undefined;

  const squares = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const light = (x + y) % 2 === 0;
      squares.push(<rect key={`s${x}${y}`} x={x} y={y} width={1} height={1} class={light ? 'sq-l' : 'sq-d'} />);
    }
  }

  const coordEls = [];
  if (props.coords !== false) {
    for (let i = 0; i < 8; i++) {
      const file = orientation === 'w' ? FILES[i] : FILES[7 - i];
      const rank = orientation === 'w' ? 8 - i : i + 1;
      coordEls.push(
        <text key={`f${i}`} x={i + 0.94} y={7.95} text-anchor="end" class={`coord ${(i + 7) % 2 === 0 ? 'coord-l' : 'coord-d'}`}>
          {file}
        </text>,
        <text key={`r${i}`} x={0.05} y={i + 0.2} class={`coord ${i % 2 === 0 ? 'coord-l' : 'coord-d'}`}>
          {rank}
        </text>,
      );
    }
  }

  const rectAt = (sq: string, cls: string, key: string) => {
    const [x, y] = sqXY(sq, orientation);
    return <rect key={key} x={x} y={y} width={1} height={1} class={cls} />;
  };

  const overlays = [];
  if (props.lastMove) {
    overlays.push(rectAt(props.lastMove[0], 'hl-last', 'lm0'), rectAt(props.lastMove[1], 'hl-last', 'lm1'));
  }
  if (checkSq) overlays.push(rectAt(checkSq, 'hl-check', 'chk'));
  if (selected) overlays.push(rectAt(selected, 'hl-sel', 'sel'));
  for (const [i, h] of (props.highlights ?? []).entries()) {
    const [x, y] = sqXY(h.square, orientation);
    if (h.kind === 'hint') overlays.push(<rect key={`h${i}`} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={0.08} class="hl-hint" />);
    else if (h.kind === 'target') overlays.push(<rect key={`h${i}`} x={x + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.1} class="hl-target" />);
    else overlays.push(rectAt(h.square, `hl-${h.kind}`, `h${i}`));
  }

  const dotEls = dests.map((d) => {
    const [x, y] = sqXY(d, orientation);
    const occupied = !!chess.get(d as Square);
    return occupied ? (
      <circle key={`d${d}`} cx={x + 0.5} cy={y + 0.5} r={0.46} class="ring" />
    ) : (
      <circle key={`d${d}`} cx={x + 0.5} cy={y + 0.5} r={0.15} class="dot" />
    );
  });

  const pieceEls = pieces.map((p) => {
    const [x, y] = sqXY(p.square, orientation);
    const dragging = drag?.moved && drag.from === p.square;
    const isAnim = !!anim && anim.to === p.square;
    const offset = isAnim && !anim!.done;
    const style = offset ? { transform: `translate(${anim!.dx}px, ${anim!.dy}px)` } : undefined;
    return (
      <g
        key={`${p.square}`}
        class={`piece${offset ? ' noanim' : ''}`}
        style={style}
        opacity={dragging ? 0.3 : 1}
      >
        <use href={`#zz-${p.color}${p.type.toUpperCase()}`} x={x} y={y} width={1} height={1} />
      </g>
    );
  });

  const dragPiece = drag?.moved ? chess.get(drag.from as Square) : null;

  const arrowEls = (props.arrows ?? []).map((a, i) => {
    const [fx, fy] = sqXY(a.from, orientation);
    const [tx, ty] = sqXY(a.to, orientation);
    const x1 = fx + 0.5, y1 = fy + 0.5, x2 = tx + 0.5, y2 = ty + 0.5;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const ex = x2 - ux * 0.32, ey = y2 - uy * 0.32;
    const color = ARROW_COLOR[a.color ?? 'gold'];
    const hx = x2 - ux * 0.05, hy = y2 - uy * 0.05;
    const bx = x2 - ux * 0.42, by = y2 - uy * 0.42;
    const px = -uy * 0.2, py = ux * 0.2;
    return (
      <g key={`a${i}`} class="arrow">
        <line x1={x1 + ux * 0.2} y1={y1 + uy * 0.2} x2={ex} y2={ey} stroke={color} stroke-width={0.17} />
        <polygon points={`${hx},${hy} ${bx + px},${by + py} ${bx - px},${by - py}`} fill={color} />
      </g>
    );
  });

  const promoColor = movable ?? 'w';

  return (
    <div class="board-host">
      <svg
        ref={svgRef}
        class="board"
        viewBox="0 0 8 8"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        role="img"
        aria-label="Schachbrett"
      >
        <defs>
          <radialGradient id="zz-check">
            <stop offset="0%" stop-color="#ff5a3c" stop-opacity="0.9" />
            <stop offset="45%" stop-color="#e07a5f" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#e07a5f" stop-opacity="0" />
          </radialGradient>
        </defs>
        {squares}
        {coordEls}
        {overlays}
        {dotEls}
        {pieceEls}
        {arrowEls}
        {dragPiece && drag && (
          <use
            class="drag"
            href={`#zz-${dragPiece.color}${dragPiece.type.toUpperCase()}`}
            x={drag.x - 0.6}
            y={drag.y - 0.85}
            width={1.2}
            height={1.2}
          />
        )}
      </svg>
      {promo && (
        <div class="promo" onClick={() => setPromo(null)}>
          <div class="promo-box" onClick={(e) => e.stopPropagation()}>
            {(['q', 'r', 'b', 'n'] as const).map((t) => (
              <button
                key={t}
                aria-label={{ q: 'Dame', r: 'Turm', b: 'Läufer', n: 'Springer' }[t]}
                onClick={() => {
                  const p = promo;
                  setPromo(null);
                  setSelected(null);
                  props.onMove?.(p.from + p.to + t);
                }}
              >
                <svg viewBox="0 0 1 1" width="100%" height="100%">
                  <use href={`#zz-${promoColor}${t.toUpperCase()}`} width={1} height={1} />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
