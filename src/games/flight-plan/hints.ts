import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { metarOf } from "./generator";
import {
  CALL_TEXT, CARD, type Call, type GroupKind, PILOT_SCENES, PLAN_ITEMS, PLAN_TITLE, RESERVE_MIN, STEPS, type WxFail, cardFails, ceilingOf, exactMinutes,
  fmtFeet, fmtHM, groundspeed, groupMeaning, legAnswer, legMistakes, metarGroups, modeOf, p,
} from "./logic";

/**
 * Helper (Dabble, Ziggy's science friend who tests everything twice), praise and worked-model steps — pure.
 * Round-start lines explain the METHOD of the first item's inner game; first-miss lines are diagnosed from the
 * miss (which misconception it most likely shows). Second miss: the board shows `modelSteps(ex)` one per runner
 * step (alongIndex) and marks the answer. Nothing names a level number or uses failure words.
 */

/** Round-start explanation (first exercise of a round), by mode. */
export function explainFor(ex: Pick<Exercise, "params">): string {
  const mode = modeOf(ex);
  if (mode === "time") return p(ex, "d2") > 0 ? "fp.help.total" : p(ex, "wind") !== 0 ? "fp.help.wind" : p(ex, "rnd") ? "fp.help.round" : "fp.help.leg";
  return `fp.help.${mode}`;
}

const pick = (st: Pick<ExerciseState, "lastAnswer">) => (typeof st.lastAnswer === "string" ? st.lastAnswer : "");

/** First-miss line, diagnosed from what the child did. */
export function hintFor(st: Pick<ExerciseState, "exercise" | "lastAnswer" | "check">): string {
  const ex = st.exercise;
  const mode = modeOf(ex);
  const v = pick(st);
  switch (mode) {
    case "find":
    case "flaps":
      return st.check?.reason === "too-high" ? "fp.hint.high" : "fp.hint.low";
    case "lift":
      return p(ex, "v") === 0 ? "fp.hint.lift.speed" : "fp.hint.lift.angle";
    case "speed":
      return v === "engine" ? "fp.hint.engine" : v === "fast" ? "fp.hint.anyspeed" : v === "slow" ? "fp.hint.slow" : "fp.hint.angle";
    case "engine":
      return v === "engine" ? "fp.hint.engine" : "fp.hint.anyspeed";
    case "recover":
      return v === "pull" ? "fp.hint.pullup" : "fp.hint.power";
    case "time": {
      const n = typeof st.lastAnswer === "number" ? st.lastAnswer : NaN;
      const s = { d: p(ex, "d"), tas: p(ex, "tas"), wind: p(ex, "wind"), d2: p(ex, "d2") };
      const why = legMistakes(s).find((x) => x.value === n)?.why;
      if (why) return `fp.hint.${why}`;
      if (p(ex, "rnd") && Math.abs(n - legAnswer(s)) === 1) return "fp.hint.round";
      return st.check?.reason === "too-high" ? "fp.hint.tsdHigh" : "fp.hint.tsdLow";
    }
    case "decode": {
      const ans = ex.answer.kind === "match" ? ex.answer : null;
      const given = st.lastAnswer && typeof st.lastAnswer === "object" && !Array.isArray(st.lastAnswer) ? (st.lastAnswer as Record<string, string>) : {};
      const parts = st.check?.parts ?? {};
      const wrong = ans?.items.find((it) => parts[it.id] === false);
      if (!wrong) return "fp.hint.decode";
      const k = wrong.id.replace(/^g-/, "") as GroupKind;
      const chosen = given[wrong.id] ?? "";
      if (chosen === `x-${k}`) return `fp.hint.${groupMeaning(k, metarOf(ex.params ?? {})).why}`;
      return `fp.hint.group.${k === "cloud2" ? "cloud" : k}`;
    }
    case "call":
      if (v === "ceiling" && p(ex, "trap") && ceilingOf(metarOf(ex.params ?? {}).layers) !== null) return "fp.hint.ceiling";
      if (v === "wind" || v === "gust") return "fp.hint.windCard";
      return "fp.hint.card";
    case "order": {
      const used = Array.isArray(st.lastAnswer) ? (st.lastAnswer as string[]) : [];
      return used.some((id) => id.startsWith("k")) ? "fp.hint.skip" : "fp.hint.order";
    }
    case "missed":
      return p(ex, "skipped") ? "fp.hint.local" : "fp.hint.missed";
    case "imsafe":
      return v === "push" ? "fp.hint.push" : v === "ready" ? "fp.hint.notready" : "fp.hint.imsafe";
    case "brief":
      return v === "pressure" ? "fp.hint.pressure" : v === "go" ? "fp.hint.brief.go" : "fp.hint.brief";
  }
}

/** Praise the process the item needed. */
export function praiseFor(ex: Pick<Exercise, "params">): string[] {
  const mode = modeOf(ex);
  if (mode === "time") return p(ex, "wind") !== 0 ? ["fp.praise.wind", "fp.praise.leg"] : ["fp.praise.leg", "fp.praise.leg2"];
  if (mode === "flaps") return ["fp.praise.find"];
  return [`fp.praise.${mode}`];
}

const fmtMin = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

/** Worked model (second miss): one line per runner step. */
export function modelSteps(ex: Pick<Exercise, "params" | "answer">): string[] {
  const mode = modeOf(ex);
  const crit = p(ex, "crit");
  switch (mode) {
    case "find":
    case "flaps":
      return [
        "Lift climbs as the angle grows.",
        `It peaks at ${crit}°: the critical angle.`,
        `Past ${crit}° the smoke breaks away: stalled.${mode === "flaps" ? " Flaps give more lift but stall at a smaller angle." : ""}`,
      ];
    case "lift":
      return p(ex, "v") === 0
        ? ["Same angle, faster air: the wing turns more air downward every second.", "More speed → more lift."]
        : ["Below the stall, a bigger angle turns more air downward.", `More angle → more lift, up to the critical angle (${crit}°).`];
    case "speed": {
      const aoa = p(ex, "aoa");
      return ["A stall depends on the angle of attack, not the speed.", aoa > crit ? `${aoa}° is past the critical angle (${crit}°): it stalls, even when fast.` : `${aoa}° is below the critical angle (${crit}°): smooth air, just less lift.`];
    }
    case "engine":
      return ["This model has no engine, and it still stalled.", "A stall = the wing passes its critical angle and the smooth airflow breaks away."];
    case "recover":
      return ["Lower the nose: a smaller angle of attack.", `Below ${crit}° the smoke flows smoothly again.`];
    case "time": {
      const d = p(ex, "d"), tas = p(ex, "tas"), wind = p(ex, "wind"), d2 = p(ex, "d2");
      const gs = groundspeed(tas, wind);
      const out: string[] = [];
      if (wind !== 0) out.push(`Groundspeed = ${tas} ${wind < 0 ? "−" : "+"} ${Math.abs(wind)} = ${gs} kt (${wind < 0 ? "headwind slows us" : "tailwind speeds us up"})`);
      out.push(`Time = distance ÷ speed = ${d} ÷ ${gs} of an hour`);
      const e1 = exactMinutes(d, gs);
      out.push(`Minutes = ${d} × 60 ÷ ${gs} = ${fmtMin(e1)}${Number.isInteger(e1) ? "" : ` → ${Math.round(e1)}`}`);
      if (d2 > 0) {
        const e2 = exactMinutes(d2, gs);
        out.push(`Leg 2: ${d2} × 60 ÷ ${gs} = ${fmtMin(e2)}`);
        out.push(`Total = ${Math.round(e1)} + ${Math.round(e2)} = ${legAnswer({ d, tas, wind, d2 })} min`);
      }
      return out;
    }
    case "decode": {
      if (ex.answer.kind !== "match") return [];
      const x = metarOf(ex.params ?? {});
      const groups = metarGroups(x);
      return ex.answer.items.map((it) => {
        const k = it.id.replace(/^g-/, "") as GroupKind;
        return `${groups.find((g) => g.kind === k)?.text ?? it.text} → ${groupMeaning(k, x).right}`;
      });
    }
    case "call": {
      const x = metarOf(ex.params ?? {});
      const gust = p(ex, "gr") === 1;
      const fails = cardFails(x, gust);
      const c = ceilingOf(x.layers);
      const lines: string[] = [];
      if (p(ex, "cl")) lines.push(c === null ? "Ceiling: no broken or overcast layer, so no ceiling. OK" : `Ceiling ${fmtFeet(c)} ft vs ${fmtFeet(CARD.ceiling)} ft: ${fails.includes("ceiling") ? "too low" : "OK"}`);
      lines.push(`Visibility ${x.vis} mi vs ${CARD.vis} mi: ${fails.includes("vis") ? "too low" : "OK"}`);
      lines.push(`Wind ${x.wspd} kt vs ${CARD.wind} kt: ${fails.includes("wind") ? "too strong" : "OK"}${gust && x.gust ? ` · gusts ${x.gust} vs ${CARD.gust}: ${fails.includes("gust") ? "too strong" : "OK"}` : ""}`);
      lines.push(fails.length ? "One line is outside the card: wait." : "Every line is inside the card: fly.");
      return lines;
    }
    case "order":
      return ex.answer.kind === "sequence" ? ex.answer.order.map((id, i) => `${i + 1}. ${STEPS[Number(id.slice(1))] ?? id}`) : [];
    case "missed": {
      const miss = PLAN_ITEMS[p(ex, "miss")] ?? "weather";
      return ["Match each note to a line on the card.", `No note covers: ${PLAN_TITLE[miss]}.${p(ex, "skipped") ? " Even a short hop needs the weather." : ""}`];
    }
    case "imsafe": {
      const sc = PILOT_SCENES[p(ex, "sc")]!;
      return ["Check each letter: I-M-S-A-F-E.", sc.why === "ready" ? "Every letter is fine: Ziggy is ready." : `${sc.why}: Ziggy isn't fit to fly today, however experienced he is.`];
    }
    case "brief": {
      const x = metarOf(ex.params ?? {});
      const trip = p(ex, "trip"), fuel = p(ex, "fuel");
      const lines: string[] = [];
      lines.push(`Route: ${fmtHM(trip)} + ${RESERVE_MIN} min reserve = ${fmtHM(trip + RESERVE_MIN)}; fuel ${fmtHM(fuel)}: ${fuel >= trip + RESERVE_MIN ? "OK" : "not enough"}`);
      if (p(ex, "fw")) lines.push(`Weather: ${cardFails(x, false).length ? `outside the card (${cardFails(x, false).join(", ")})` : "inside the card"}`);
      if (p(ex, "fpi")) lines.push(`Pilot: ${PILOT_SCENES[p(ex, "sc")]!.why === "ready" ? "fit to fly" : "not fit today"}`);
      if (p(ex, "fpl")) lines.push(`Plane: ${p(ex, "pb") ? "needs fixing" : "all fine"}`);
      const correct = ex.answer.kind === "choice" ? (ex.answer.correct as Call) : "go";
      lines.push(`So: ${CALL_TEXT[correct]}.`);
      return lines;
    }
  }
}

/** The briefing's correct call (used by the board to tell the story which way the flight went). */
export const briefCall = (ex: Pick<Exercise, "answer">): Call => (ex.answer.kind === "choice" ? (ex.answer.correct as Call) : "go");
export type { WxFail };
