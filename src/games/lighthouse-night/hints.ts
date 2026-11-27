import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import {
  type Finale, KIND_TEXT, LADDER_CTX, type Mode, POSITIONS, REF_BEARING, REF_NAME, REL_TEXT, type Rel, SHARE_CTX, SHIPS, backBearing,
  backMistakes, bearingFrom, breadMistakes, finaleOf, fmtBearing, fmtLine, fmtNum, fmtPt, gradMistakes, hypMistakes, hypOf, icptMistakes,
  kindOf, legMistakes, legOf, lineMistakes, mapMistakes, modeOf, p, parMistakes, plotMistakes, pointMistakes, realMistakes, round1, round2,
  shareMistakes, triMistakes, valueAt, vertMistakes,
} from "./logic";

/**
 * Helper (Ripple, the sea otter who notices tiny things), praise and worked models — pure, unit-tested.
 * Round-start lines explain the METHOD of the item's inner game. First-miss lines are diagnosed from the wrong answer
 * (`diagnose`): each names the misconception and points at the strategy without giving the answer. The second miss
 * shows `modelSteps(ex)` on the board, one per runner step, with the answer filled in to confirm.
 */
type Ex = Pick<Exercise, "params" | "answer">;
const RELS: readonly Rel[] = ["corr", "alt", "coint"];
const relOf = (ex: Ex): Rel => RELS[p(ex, "rel")] ?? "corr";

/** Explanation line id for the item (round start). */
export function explainFor(ex: Pick<Exercise, "params">): string {
  const mode = modeOf(ex);
  if (mode === "home") return `ln.help.${finaleOf(ex)}`;
  if (mode === "tri" && p(ex, "iso")) return "ln.help.iso";
  if (mode === "round") return "ln.help.round";
  return `ln.help.${mode}`;
}

/** Line parts / given values of an item, decoded from params. */
const lineParts = (ex: Ex) => [p(ex, "p0"), p(ex, "p1"), p(ex, "p2"), p(ex, "p3")].slice(0, p(ex, "n"));
const triAngles = (ex: Ex): [number, number, number] => [p(ex, "A"), p(ex, "B"), p(ex, "C")];
const parGiven = (ex: Ex) => {
  const phi = p(ex, "fl") ? 180 - p(ex, "th") : p(ex, "th");
  return valueAt(POSITIONS[p(ex, "gp")] ?? "TR", phi);
};

/**
 * The misconception a wrong keypad/dial answer most likely shows (hint key suffix), or null when it isn't a typical
 * one. Choice items are diagnosed from the chosen option id.
 */
export function diagnose(ex: Ex, value: number | string | null): string | null {
  const mode = modeOf(ex);
  const n = typeof value === "number" ? round2(value) : NaN;
  const find = <W extends string>(xs: { value: number; why: W }[]) => xs.find((x) => x.value === n)?.why ?? null;
  const tag = (fam: string, w: string | null) => (w ? `${fam}.${w}` : null);
  switch (mode) {
    case "line": return tag("ang", find(lineMistakes(lineParts(ex), p(ex, "u"))));
    case "point": return tag("ang", find(pointMistakes(lineParts(ex), p(ex, "u"))));
    case "vert": return tag("ang", find(vertMistakes(p(ex, "a"), p(ex, "opp") === 1)));
    case "tri": return tag("ang", find(triMistakes(triAngles(ex), p(ex, "u"), p(ex, "iso") === 1, p(ex, "ig") === 0 ? "apex" : "base")));
    case "par": return tag("ang", find(parMistakes(relOf(ex), parGiven(ex))));
    case "bread": return tag("bear", find(breadMistakes(p(ex, "ref"), p(ex, "side") === 1 ? 1 : -1, p(ex, "d"))));
    case "bback": return tag("bear", find(backMistakes(p(ex, "b"))));
    case "hyp": return tag("pyth", find(hypMistakes(p(ex, "up"), p(ex, "out"), false)));
    case "leg": {
      const c = p(ex, "c"), a = p(ex, "ask") === 1 ? p(ex, "out") : p(ex, "up");
      return tag("pyth", find(legMistakes(c, a, false)));
    }
    case "round": {
      const w = p(ex, "ask") === 0 ? find(hypMistakes(p(ex, "up"), p(ex, "out"), true)) : find(legMistakes(p(ex, "c"), p(ex, "out"), true));
      return tag("pyth", w);
    }
    case "real": return tag("scale", find(realMistakes(p(ex, "cm"), p(ex, "k"))));
    case "map": return tag("scale", find(mapMistakes(p(ex, "km"), p(ex, "k"))));
    case "share": return tag("share", find(shareMistakes(p(ex, "total"), p(ex, "a"), p(ex, "b"), p(ex, "who"))));
    case "plot": return tag("grid", find(plotMistakes(p(ex, "x"), p(ex, "y"))));
    case "grad": return tag("grid", find(gradMistakes(p(ex, "mm"), p(ex, "c"), p(ex, "x2") - p(ex, "x1"))));
    case "icpt": return tag("grid", find(icptMistakes(p(ex, "mm"), p(ex, "c"))));
    case "kind": {
      const right = kindOf(p(ex, "a"));
      return value === "reflex" || right === "reflex" ? "kind.reflex" : value === "right" || right === "right" ? "kind.right" : "kind.size";
    }
    case "reason": return value === "vert" ? "reason.vert" : "reason.shape";
    case "conv": return value === "add" ? "conv.add" : value === "measure" ? "conv.measure" : "conv.check";
    case "ratio": return value === "u" ? "ratio.units" : "ratio.zeros";
    case "eqn": return typeof value === "string" ? `eqn.${value === "swap" ? "swap" : value === "sign" ? "sign" : value === "inv" ? "inv" : "c"}` : null;
    case "meet": return typeof value === "string" ? `meet.${value === "swap" ? "swap" : value.startsWith("icpt") ? "icpt" : "sign"}` : null;
    case "para": return value === "sign" ? "para.sign" : value === "samec" ? "para.samec" : null;
    case "home": return diagnoseFinale(ex, finaleOf(ex), value, n);
  }
}

function diagnoseFinale(ex: Ex, f: Finale, value: number | string | null, n: number): string | null {
  switch (f) {
    case "fline": {
      const a = p(ex, "p2");
      if (n === 180 - a) return "ang.noHalf";
      if (n === (360 - a) / 2) return "ang.line360";
      return null;
    }
    case "ftri": {
      const A = p(ex, "A"), e = p(ex, "ext");
      if (n === 180 - e) return "ang.oneStep";
      if (n === 180 - A - e) return "ang.usedExterior";
      if (n === 180 - A) return "ang.oneStep";
      return null;
    }
    case "fback": {
      const w = backMistakes(p(ex, "b")).find((x) => x.value === n)?.why;
      return w ? `bear.${w}` : null;
    }
    case "fchart": {
      const e = p(ex, "east"), no = p(ex, "north"), c = p(ex, "cmc"), k = p(ex, "k");
      if (n === c) return "scale.noScale";
      if (n === (e + no) * k || n === e + no) return "pyth.added";
      if (n === (e * e + no * no) * k || n === e * e + no * no) return "pyth.noRoot";
      return null;
    }
    case "fcourse":
      return typeof value === "string" ? `eqn.${value === "swap" ? "swap" : value === "sign" ? "sign" : value === "inv" ? "inv" : "c"}` : null;
  }
}

/** First-miss line, diagnosed from what the child entered or chose (falls back to the method explanation). */
export function hintFor(st: Pick<ExerciseState, "exercise" | "lastAnswer">): string {
  const v = typeof st.lastAnswer === "number" || typeof st.lastAnswer === "string" ? st.lastAnswer : null;
  const d = diagnose(st.exercise, v);
  return d ? `ln.hint.${d}` : explainFor(st.exercise);
}

/** Praise the process the item needed. */
export function praiseFor(ex: Pick<Exercise, "params">): string[] {
  const mode: Mode = modeOf(ex);
  if (mode === "home") return ["ln.praise.home"];
  if (mode === "bread" || mode === "bback") return ["ln.praise.bearing"];
  if (["line", "point", "kind", "vert", "tri", "par", "reason"].includes(mode)) return ["ln.praise.angle", "ln.praise.angle2"];
  if (["hyp", "leg", "round", "conv"].includes(mode)) return ["ln.praise.pyth"];
  if (mode === "share") return ["ln.praise.share"];
  if (["real", "map", "ratio"].includes(mode)) return ["ln.praise.scale"];
  return ["ln.praise.graph"];
}

/** The fact card shown on the board after a first miss. */
export function methodFor(ex: Ex): string {
  const mode = modeOf(ex);
  switch (mode) {
    case "line": return "Angles on a straight line add up to 180°.";
    case "point": return "Angles around a point add up to 360°.";
    case "kind": return "Acute < 90° · right = 90° · obtuse 90°–180° · reflex 180°–360°.";
    case "vert": return "Opposite angles are equal; neighbours on a straight line add up to 180°.";
    case "tri": return p(ex, "iso") ? "Triangle: 180° in total. Isosceles: the two base angles are equal." : "Angles in a triangle add up to 180°.";
    case "par":
    case "reason": return "Corresponding (F) equal · alternate (Z) equal · co-interior (C) add up to 180°.";
    case "bread":
    case "bback": return "Bearings: from north, clockwise, three figures. Back bearing: 180° round.";
    case "hyp":
    case "leg":
    case "round":
    case "conv": return "a² + b² = c², where c is the hypotenuse (opposite the right angle).";
    case "real":
    case "map": return `1 cm on the chart = ${p(ex, "k")} km in real life.`;
    case "share": return "Add the ratio numbers to find the parts; share the total; multiply.";
    case "ratio": return "1 km = 1 000 m = 100 000 cm.";
    case "plot": return "(x, y): across first, then up. Negatives go left or down.";
    case "grad": return "Gradient = rise ÷ run (going left to right). Downhill is negative.";
    case "icpt": return "The y-intercept is where the line crosses the y-axis (x = 0).";
    case "eqn": return "y = mx + c: m is the gradient, c is the y-intercept.";
    case "meet": return "The crossing point satisfies both equations.";
    case "para": return "Parallel lines have the same gradient m.";
    case "home": {
      const f = finaleOf(ex);
      return f === "fline" ? "Straight line: 180°. Two equal angles: halve what's left."
        : f === "ftri" ? "Straight line first (180°), then the triangle (180°)."
          : f === "fback" ? "Back bearing: add or take away 180°."
            : f === "fchart" ? "Pythagoras on the chart first, then use the scale."
              : "Gradient = rise ÷ run; then find c from one point.";
    }
  }
}

const deg = (x: number) => `${fmtNum(x)}°`;
const sumText = (xs: number[]) => (xs.length === 1 ? deg(xs[0]!) : `${xs.map(deg).join(" + ")} = ${deg(xs.reduce((s, x) => s + x, 0))}`);

/** Worked model (second miss): one line per runner step. */
export function modelSteps(ex: Ex): string[] {
  const mode = modeOf(ex);
  switch (mode) {
    case "line": {
      const parts = lineParts(ex), u = p(ex, "u");
      const known = parts.filter((_, i) => i !== u);
      const s = known.reduce((a, b) => a + b, 0);
      return ["Angles on a straight line add up to 180°.", `The angles we know: ${sumText(known)}.`, `x = 180° − ${deg(s)} = ${deg(180 - s)}`];
    }
    case "point": {
      const parts = lineParts(ex), u = p(ex, "u");
      const known = parts.filter((_, i) => i !== u);
      const s = known.reduce((a, b) => a + b, 0);
      return ["Angles around a point add up to 360°.", `The angles we know: ${sumText(known)}.`, `x = 360° − ${deg(s)} = ${deg(360 - s)}`];
    }
    case "kind": {
      const a = p(ex, "a");
      return ["Start at the dashed line and follow the arc round.", `It turns ${deg(a)}. ${KIND_TEXT[kindOf(a)]}.`];
    }
    case "vert": {
      const a = p(ex, "a");
      return p(ex, "opp")
        ? [`x is opposite the ${deg(a)} angle, across the crossing.`, `Vertically opposite angles are equal: x = ${deg(a)}`]
        : [`x and ${deg(a)} sit side by side on one straight beam.`, `x = 180° − ${deg(a)} = ${deg(180 - a)}`];
    }
    case "tri": {
      const [A, B, C] = triAngles(ex);
      const u = p(ex, "u");
      if (p(ex, "iso")) {
        if (p(ex, "ig") === 0) return ["Two equal sides, so the two base angles are equal.", `Both base angles together: 180° − ${deg(A)} = ${deg(180 - A)}`, `Each one: ${deg(180 - A)} ÷ 2 = ${deg(B)}`];
        return [`The other base angle is also ${deg(B)}.`, `x = 180° − ${deg(B)} − ${deg(C)} = ${deg(A)}`];
      }
      const known = [A, B, C].filter((_, i) => i !== u);
      const s = known[0]! + known[1]!;
      return ["Angles in a triangle add up to 180°.", `The angles we know: ${sumText(known)}.`, `x = 180° − ${deg(s)} = ${deg(180 - s)}`];
    }
    case "par":
    case "reason": {
      const rel = relOf(ex), g = parGiven(ex);
      const why = rel === "corr" ? "Same position at the other crossing: corresponding angles (an F shape)."
        : rel === "alt" ? "Other side of the beam, between the lanes: alternate angles (a Z shape)."
          : "Same side of the beam, between the lanes: co-interior angles (a C shape).";
      if (mode === "reason") return [why, `${REL_TEXT[rel]}.`];
      return ["The two lanes are parallel.", why, rel === "coint" ? `They add up to 180°: x = 180° − ${deg(g)} = ${deg(180 - g)}` : `They are equal: x = ${deg(g)}`];
    }
    case "bread": {
      const ref = p(ex, "ref"), side = p(ex, "side") === 1 ? 1 : -1, d = p(ex, "d");
      const rb = REF_BEARING[ref] ?? 0;
      const b = bearingFrom(ref, side, d);
      const start = rb === 0 && side === -1 ? 360 : rb;
      return [
        "Bearings start at north and turn clockwise.",
        `Due ${REF_NAME[ref]} is ${fmtBearing(start === 360 ? 0 : start)}${start === 360 ? " (or 360°)" : ""}; the ship is ${deg(d)} ${side === 1 ? "further clockwise" : "back anticlockwise"}.`,
        `${start}° ${side === 1 ? "+" : "−"} ${deg(d)} = ${deg(b)}, written ${fmtBearing(b)}`,
      ];
    }
    case "bback": {
      const b = p(ex, "b");
      return backSteps(b, SHIPS[p(ex, "ship")] ? `the ${SHIPS[p(ex, "ship")]}` : "the ship");
    }
    case "hyp": {
      const up = p(ex, "up"), out = p(ex, "out");
      const s = up * up + out * out;
      return [`The ${thing(ex)} is the hypotenuse: the longest side, opposite the right angle.`, `c² = ${up}² + ${out}² = ${up * up} + ${out * out} = ${s}`, `c = √${s} = ${fmtNum(hypOf(up, out))} m`];
    }
    case "leg": {
      const c = p(ex, "c"), askUp = p(ex, "ask") === 1;
      const a = askUp ? p(ex, "out") : p(ex, "up");
      const d = c * c - a * a;
      return [`The ${thing(ex)} (${c} m) is the hypotenuse, so take away.`, `side² = ${c}² − ${a}² = ${c * c} − ${a * a} = ${d}`, `side = √${d} = ${fmtNum(legOf(c, a))} m`];
    }
    case "round": {
      if (p(ex, "ask") === 0) {
        const up = p(ex, "up"), out = p(ex, "out");
        const s = up * up + out * out;
        const h = hypOf(up, out);
        return [`c² = ${up}² + ${out}² = ${s}`, `c = √${s} m exactly = ${h.toFixed(3)}… m`, `To 1 d.p. (look at the second decimal digit): ${fmtNum(round1(h))} m`];
      }
      const c = p(ex, "c"), out = p(ex, "out");
      const d = c * c - out * out;
      const l = legOf(c, out);
      return [`side² = ${c}² − ${out}² = ${d}`, `side = √${d} m exactly = ${l.toFixed(3)}… m`, `To 1 d.p. (look at the second decimal digit): ${fmtNum(round1(l))} m`];
    }
    case "conv": {
      const s1 = p(ex, "s1"), s2 = p(ex, "s2"), s3 = p(ex, "s3");
      const l = s1 * s1 + s2 * s2, r = s3 * s3;
      return [`Shorter sides: ${s1}² + ${s2}² = ${s1 * s1} + ${s2 * s2} = ${l}`, `Longest side: ${s3}² = ${r}`, l === r ? "They match, so the corner is a right angle." : "They don't match, so it isn't a right angle."];
    }
    case "real": {
      const cm = p(ex, "cm"), k = p(ex, "k");
      return [`1 cm on the chart is ${k} km in real life.`, `${fmtNum(cm)} cm × ${k} = ${fmtNum(cm * k)} km`];
    }
    case "map": {
      const km = p(ex, "km"), k = p(ex, "k");
      return [`Every ${k} km in real life is 1 cm on the chart.`, `${km} km ÷ ${k} = ${fmtNum(km / k)} cm`];
    }
    case "share": {
      const a = p(ex, "a"), b = p(ex, "b"), total = p(ex, "total"), who = p(ex, "who");
      const c = SHARE_CTX[p(ex, "ctx")] ?? SHARE_CTX[0];
      const unit = total / (a + b);
      const part = who === 0 ? a : b;
      return [`Ratio ${a} : ${b} makes ${a} + ${b} = ${a + b} equal parts.`, `One part: ${total} ÷ ${a + b} = ${fmtNum(unit)}`, `${cap(who === 0 ? c.a : c.b)}: ${part} × ${fmtNum(unit)} = ${fmtNum(part * unit)}`];
    }
    case "ratio": {
      const k = p(ex, "k");
      return ["Use the same units on both sides: 1 km = 100 000 cm.", `${k} km = ${k} × 100 000 = ${(k * 100000).toLocaleString("en-US").replace(/,/g, " ")} cm`, `So 1 cm : ${k} km is 1 : ${(k * 100000).toLocaleString("en-US").replace(/,/g, " ")}`];
    }
    case "plot": {
      const x = p(ex, "x"), y = p(ex, "y");
      return ["Start at the origin, (0, 0).", `x first: ${Math.abs(x)} ${x < 0 ? "left" : "right"}.`, `Then y: ${Math.abs(y)} ${y < 0 ? "down" : "up"}. That's ${fmtPt(x, y)}.`];
    }
    case "grad": {
      const x1 = p(ex, "x1"), y1 = p(ex, "y1"), x2 = p(ex, "x2"), y2 = p(ex, "y2");
      return [`From A to B, run = ${fmtNum(x2)} − ${paren(x1)} = ${x2 - x1} across.`, `Rise = ${fmtNum(y2)} − ${paren(y1)} = ${fmtNum(y2 - y1)}${y2 < y1 ? " (downhill, so negative)" : ""}.`, `Gradient = rise ÷ run = ${fmtNum(y2 - y1)} ÷ ${x2 - x1} = ${fmtNum((y2 - y1) / (x2 - x1))}`];
    }
    case "icpt": {
      const c = p(ex, "c");
      return ["The y-intercept is where the path crosses the y-axis, where x = 0.", `Follow the path to the y-axis: it crosses at y = ${fmtNum(c)}.`];
    }
    case "eqn":
      return eqnSteps(p(ex, "mm"), p(ex, "c"), p(ex, "x1"), p(ex, "y1"), p(ex, "x2"), p(ex, "y2"));
    case "meet": {
      const m1 = p(ex, "m1"), c1 = p(ex, "c1"), m2 = p(ex, "m2"), c2 = p(ex, "c2"), x0 = p(ex, "x0"), y0 = p(ex, "y0");
      return [`Where they cross, both y values are equal: ${rhs(m1, c1)} = ${rhs(m2, c2)}`, `Solve: x = ${fmtNum(x0)}`, `Then y = ${fmtNum(y0)}, so they cross at ${fmtPt(x0, y0)}.`];
    }
    case "para": {
      const mm = p(ex, "mm"), c2 = p(ex, "c2");
      return ["Parallel paths have the same gradient, so they never meet.", `The Gull's gradient is ${fmtNum(mm)}.`, `Only ${fmtLine(mm, c2)} has gradient ${fmtNum(mm)} too.`];
    }
    case "home":
      return finaleSteps(ex);
  }
}

function backSteps(b: number, who: string): string[] {
  const back = backBearing(b);
  return [`From ${who}, the lamp is on ${fmtBearing(b)}.`, "The way back is the opposite direction: half a turn, 180°.", `${b}° ${b < 180 ? "+" : "−"} 180° = ${deg(back)}, so turn the beam to ${fmtBearing(back)}`];
}
function finaleSteps(ex: Ex): string[] {
  const f = finaleOf(ex);
  switch (f) {
    case "fline": {
      const a = p(ex, "p2");
      return ["The three angles on the wall add up to 180°.", `The two equal angles share 180° − ${deg(a)} = ${deg(180 - a)}`, `x = ${deg(180 - a)} ÷ 2 = ${deg((180 - a) / 2)}`];
    }
    case "ftri": {
      const A = p(ex, "A"), e = p(ex, "ext"), B = 180 - e;
      return [`Straight line at the buoy: inside angle = 180° − ${deg(e)} = ${deg(B)}`, `Triangle: x = 180° − ${deg(A)} − ${deg(B)} = ${deg(180 - A - B)}`];
    }
    case "fback":
      return backSteps(p(ex, "b"), "Bobbo's boat");
    case "fchart": {
      const e = p(ex, "east"), n = p(ex, "north"), c = p(ex, "cmc"), k = p(ex, "k");
      return ["East and north meet at a right angle.", `On the chart: √(${e}² + ${n}²) = √${e * e + n * n} = ${c} cm`, `Real distance: ${c} cm × ${k} = ${c * k} km`];
    }
    case "fcourse":
      return eqnSteps(p(ex, "mm"), p(ex, "c"), p(ex, "x1"), p(ex, "y1"), p(ex, "x2"), p(ex, "y2"));
  }
}
function eqnSteps(mm: number, c: number, x1: number, y1: number, x2: number, y2: number): string[] {
  return [
    `Gradient = rise ÷ run = (${fmtNum(y2)} − ${paren(y1)}) ÷ (${fmtNum(x2)} − ${paren(x1)}) = ${fmtNum(mm)}`,
    `Intercept: ${fmtNum(y1)} = ${fmtNum(mm)} × ${paren(x1)} + c, so c = ${fmtNum(c)}`,
    `So the path is ${fmtLine(mm, c)}`,
  ];
}
const paren = (x: number) => (x < 0 ? `(${fmtNum(x)})` : fmtNum(x));
const rhs = (m: number, c: number) => fmtLine(m, c).replace(/^y = /, "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const THING: Record<(typeof LADDER_CTX)[number], string> = { ladder: "ladder", rope: "rope", stay: "storm wire", line: "line of sight" };
const thing = (ex: Ex) => THING[LADDER_CTX[p(ex, "ctx")] ?? "ladder"];

