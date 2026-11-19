import { type Block, type Dir, type Program, type Puzzle, REPEAT_MAX, REPEAT_MIN, type Slot, move, repeat, sameBlock } from "./logic";

/**
 * Program-strip editing (pure). A target is a top-level space (`body: -1`) or a space inside a repeat card's
 * body. "Next empty space" runs in reading order: top-level spaces left to right, and a repeat card's body spaces
 * right after the card. So "tap repeat, tap →" fills the repeat's body, and debug fixes ("tap the wrong card,
 * tap the right arrow") refill exactly the space the child emptied.
 */
export interface Target { top: number; body: number }
export type Card = Dir | "repeat";

export const initialProgram = (pz: Puzzle): Slot[] => (pz.given ? [...pz.given] : Array<Slot>(pz.slots).fill(null));

/** The next empty space a card can go into (moves may go into repeat bodies; repeats only at top level). */
export function firstHole(p: Program, card: Card): Target | null {
  for (let top = 0; top < p.length; top++) {
    const b = p[top];
    if (!b) return { top, body: -1 };
    if (card !== "repeat" && b.t === "repeat") {
      const j = b.body.findIndex((d) => !d);
      if (j >= 0) return { top, body: j };
    }
  }
  return null;
}

/** Can `card` go at `t`? (bodies take moves only) */
export const fits = (p: Program, t: Target, card: Card | Block): boolean => {
  if (t.top < 0 || t.top >= p.length) return false;
  if (t.body < 0) return true;
  const b = p[t.top];
  const isMove = typeof card === "string" ? card !== "repeat" : card.t === "move";
  return !!b && b.t === "repeat" && t.body < b.body.length && isMove;
};

/** Put a card (or a whole block) at a target, replacing what was there. */
export function placeAt(p: Program, t: Target, card: Card | Block, bodySlots: number): Slot[] {
  const out = [...p];
  if (!fits(p, t, card)) return out;
  if (t.body >= 0) {
    const r = p[t.top] as Extract<Block, { t: "repeat" }>;
    const d = typeof card === "string" ? (card as Dir) : (card as Extract<Block, { t: "move" }>).d;
    out[t.top] = repeat(r.n, r.body.map((x, j) => (j === t.body ? d : x)));
    return out;
  }
  out[t.top] = typeof card === "string" ? (card === "repeat" ? repeat(REPEAT_MIN, Array(bodySlots).fill(null)) : move(card)) : card;
  return out;
}

/** Tap a card in the palette: it goes into the next empty space. Null when there is no space for it. */
export function addCard(p: Program, card: Card, bodySlots: number): { program: Slot[]; at: Target } | null {
  const at = firstHole(p, card);
  return at ? { program: placeAt(p, at, card, bodySlots), at } : null;
}

/** Take a card out (a repeat's head takes the whole repeat card). Leaves an empty space. */
export function removeAt(p: Program, t: Target): Slot[] {
  const out = [...p];
  const b = p[t.top];
  if (!b) return out;
  if (t.body >= 0 && b.t === "repeat") out[t.top] = repeat(b.n, b.body.map((d, j) => (j === t.body ? null : d)));
  else out[t.top] = null;
  return out;
}

/** The last filled space in reading order (Backspace removes it). */
export function lastFilled(p: Program): Target | null {
  for (let top = p.length - 1; top >= 0; top--) {
    const b = p[top];
    if (!b) continue;
    if (b.t === "repeat") {
      for (let j = b.body.length - 1; j >= 0; j--) if (b.body[j]) return { top, body: j };
    }
    return { top, body: -1 };
  }
  return null;
}

/** Repeat count: set (clamped 2–5), or step with wrap-around (the count button cycles 2 → 3 → 4 → 5 → 2). */
export function setCount(p: Program, top: number, n: number): Slot[] {
  const b = p[top];
  if (!b || b.t !== "repeat") return [...p];
  const out = [...p];
  out[top] = repeat(Math.max(REPEAT_MIN, Math.min(REPEAT_MAX, n)), b.body);
  return out;
}
export const cycleCount = (n: number, delta = 1) => {
  const span = REPEAT_MAX - REPEAT_MIN + 1;
  return REPEAT_MIN + ((((n - REPEAT_MIN + delta) % span) + span) % span);
};

/** Drag a card from one space to another: top-level cards swap; a body move moves (or swaps with) a body move. */
export function moveCard(p: Program, from: Target, to: Target): Slot[] {
  if (from.top === to.top && from.body === to.body) return [...p];
  const src = p[from.top];
  if (!src) return [...p];
  if (from.body < 0 && to.body < 0) {
    const out = [...p];
    [out[from.top], out[to.top]] = [p[to.top] ?? null, src];
    return out;
  }
  const card: Dir | null = from.body >= 0 ? (src.t === "repeat" ? src.body[from.body] ?? null : null) : src.t === "move" ? src.d : null;
  if (!card || !fits(p, to, card)) return [...p];
  const dst = p[to.top];
  const displaced: Dir | null = to.body >= 0 ? (dst?.t === "repeat" ? dst.body[to.body] ?? null : null) : dst?.t === "move" ? dst.d : null;
  let out = removeAt(p, from);
  out = placeAt(out, to, card, 1);
  if (displaced && (from.body < 0 || fits(out, from, displaced))) out = placeAt(out, from, displaced, 1);
  return out;
}

/** Second miss (model): keep the child's cards that already match the intended program, empty the rest. */
export function modelStart(current: Program, solution: Program, slots: number): Slot[] {
  return Array.from({ length: slots }, (_, i) => (solution[i] && sameBlock(current[i] ?? null, solution[i]!) ? current[i]! : null));
}
/** The next ghost to place in model mode, and where. */
export function nextGhost(current: Program, solution: Program): { top: number; block: Block } | null {
  for (let i = 0; i < solution.length; i++) if (solution[i] && !current[i]) return { top: i, block: solution[i]! };
  return null;
}
export const cardOf = (b: Block): Card => (b.t === "move" ? b.d : "repeat");
