/**
 * Rumble's Sleepy Trail — fraction maths. Pure TS, no floats for equality: fractions are integer pairs and
 * compare by cross-multiplication (docs/curriculum/maths.md §5).
 */
export interface Frac {
  /** numerator (top number: how many jumps from zero) */
  a: number;
  /** denominator (bottom number: how many equal parts make one whole) */
  d: number;
}

export const gcd = (x: number, y: number): number => (y === 0 ? Math.abs(x) : gcd(y, x % y));
export const reduce = ({ a, d }: Frac): Frac => {
  const g = gcd(a, d) || 1;
  return { a: a / g, d: d / g };
};
/** Same point on the number line? (a1/d1 = a2/d2 ⇔ a1·d2 = a2·d1) */
export const fracEq = (x: Frac, y: Frac) => x.a * y.d === y.a * x.d;
/** −1, 0 or 1: is x left of, on, or right of y? */
export const fracCmp = (x: Frac, y: Frac) => Math.sign(x.a * y.d - y.a * x.d);
/** Value in unit lengths (only for drawing and the tolerance check of estimates). */
export const fracValue = ({ a, d }: Frac) => a / d;

/**
 * Post index of a fraction on a trail split into `p` parts per unit, or null if it is not on a post
 * (e.g. 1/3 on a trail in fourths). 3/4 on eighths → 6.
 */
export function postOf({ a, d }: Frac, p: number): number | null {
  return (a * p) % d === 0 ? (a * p) / d : null;
}

const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const DEN: Record<number, [string, string]> = {
  1: ["whole", "wholes"],
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"],
  8: ["eighth", "eighths"],
  9: ["ninth", "ninths"],
  10: ["tenth", "tenths"],
  12: ["twelfth", "twelfths"],
};

/** Name of one part: 4 → "fourth" (CCSS wording; "quarter" is only for clocks). */
export const unitName = (d: number) => DEN[d]?.[0] ?? `1/${d}`;

/** Spoken fraction in US terms: 3/4 → "three fourths", 1/2 → "one half", 4/4 → "four fourths". */
export function fracWords({ a, d }: Frac): string {
  const den = DEN[d];
  const num = NUM[a];
  if (!den || num === undefined) return `${a} over ${d}`;
  return `${num} ${a === 1 ? den[0] : den[1]}`;
}

export const fracText = ({ a, d }: Frac) => `${a}/${d}`;
