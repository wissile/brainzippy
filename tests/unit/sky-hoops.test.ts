import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { createRng } from "../../src/engine/rng";
import { getLibrary, getWorld } from "../../src/content";
import { renderLine } from "../../src/audio/voiceLines";
import { shTutorial, skyHoops } from "../../src/games/sky-hoops/definition";
import { LEVELS, MOVE_SAY, PATTERNS, SH_MAX_LEVEL, WHERE, generateSkyHoops } from "../../src/games/sky-hoops/generator";
import { EXPLAIN_BY_LEVEL, explainFor, hintFor, praiseFor } from "../../src/games/sky-hoops/hints";
import {
  CTLS, CTL_AXIS, DIAGRAM_FORCES, HOOPS, HOOP_CTL, STICKS, TEMPLATE_OPTIONS, TEMPLATES, type Ctl, type Diagram, type Scenario,
  correctFor, decode, demoPose, encode, sceneOf,
} from "../../src/games/sky-hoops/logic";
import { ON_WHEELS_Y, REST, bodyToWorld, passOf, planePolys, CAMERAS, poseAt, simulate } from "../../src/games/sky-hoops/flight";
import { shBetween, shIntro, shOutro } from "../../src/games/sky-hoops/story";
import voice from "../../src/games/sky-hoops/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, string[]> }>;
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 5);
const words = (s: string) => s.trim().split(/\s+/).length;
const all = () => {
  const out = [];
  for (const seed of SEEDS) for (let level = 0; level <= SH_MAX_LEVEL; level++) out.push(...generateBand(skyHoops, level, seed, 8));
  return out;
};

describe("flight physics: correct cause and effect (FAA-H-8083-25, Flight Controls)", () => {
  const end = (c: Ctl) => poseAt(simulate([{ ctl: c, dur: 1 }]), 0.6);
  it("stick back → nose up and climbs; forward → nose down", () => {
    const up = poseAt(simulate([{ ctl: "back", dur: 1 }]), 0.3);
    expect(up.pitch).toBeGreaterThan(0);
    expect(up.elev).toBeGreaterThanOrEqual(0); // elevator trailing edge up
    expect(end("back").y).toBeGreaterThan(2);
    expect(end("fwd").y).toBeLessThan(-2);
  });
  it("stick left → left aileron up, roll left, and the bank turns the path left", () => {
    const p = poseAt(simulate([{ ctl: "left", dur: 1 }]), 0.15);
    expect(p.ail).toBeGreaterThan(0);
    expect(end("left").roll).toBeLessThan(0);
    expect(end("left").x).toBeLessThan(-2);
    expect(end("right").x).toBeGreaterThan(2);
  });
  it("left pedal → rudder left, nose yaws left, with only a small skid (no bank)", () => {
    const p = end("lpedal");
    expect(p.rud).toBeGreaterThan(0);
    expect(p.yaw).toBeLessThan(-0.2);
    expect(p.roll).toBe(0);
    expect(Math.abs(p.x)).toBeLessThan(1.5);
  });
  it("demos move the matching surface first", () => {
    expect(demoPose("back", 0.12).elev).toBeGreaterThan(0);
    expect(demoPose("left", 0.12).ail).toBeGreaterThan(0);
    expect(demoPose("rpedal", 0.12).rud).toBeLessThan(0);
  });
  it("the plane renders from every camera", () => {
    for (const cam of Object.values(CAMERAS)) expect(planePolys(REST, cam).length).toBeGreaterThan(20);
    expect(bodyToWorld([0, 0, 1], { ...REST, yaw: Math.PI / 2 })[0]).toBeCloseTo(1);
  });
});

describe("hoops: the right move threads the hoop; every wrong move passes clearly beside it (never touches)", () => {
  it("single hoops (levels 0–3)", () => {
    for (const hoop of HOOPS) {
      const sc = sceneOf({ mode: "hoop", level: 3, hoop });
      for (const c of STICKS) expect(passOf(sc.track(c), sc.hoops[0]!).kind, `${hoop} ${c}`).toBe(c === HOOP_CTL[hoop] ? "through" : "clear");
    }
  });
  it("turn hoops (level 7): only tipping the wings gets there", () => {
    for (const side of ["left", "right"] as const) {
      const sc = sceneOf({ mode: "turn", level: 7, side });
      for (const c of CTLS) expect(passOf(sc.track(c), sc.hoops[0]!).kind, `${side} ${c}`).toBe(c === side ? "through" : "clear");
    }
  });
  it("courses (level 9): the plan threads all three; any wrong plan never touches a hoop", () => {
    for (const a of HOOPS) for (const b of HOOPS) for (const c of HOOPS) {
      if (new Set([a, b, c]).size < 3) continue;
      const sc = sceneOf({ mode: "course", level: 9, course: [a, b, c] });
      const right = [a, b, c].map((h) => HOOP_CTL[h]);
      expect(sc.hoops.map((h) => passOf(sc.track(right), h).kind)).toEqual(["through", "through", "through"]);
      for (const p1 of STICKS) for (const p2 of STICKS) for (const p3 of STICKS) {
        const t = sc.track([p1, p2, p3]);
        for (const h of sc.hoops) expect(passOf(t, h).kind).not.toBe("touch");
      }
    }
  });
  it("runway (level 6) is ON THE GROUND: the right pedal steers the nose wheel straight; the wrong one steers further away", () => {
    for (const nose of ["left", "right"] as const) {
      const sc = sceneOf({ mode: "line", level: 6, nose });
      expect(sc.camera).toBe("ground");
      const start = Math.abs(poseAt(sc.track("lpedal"), 0).yaw);
      const r = correctFor({ mode: "line", level: 6, nose }) as Ctl;
      expect(Math.abs(poseAt(sc.track(r), 0.7).yaw)).toBeLessThan(0.08);
      const wrong: Ctl = r === "lpedal" ? "rpedal" : "lpedal";
      expect(Math.abs(poseAt(sc.track(wrong), 0.7).yaw)).toBeGreaterThan(start);
      for (const c of CTLS) {
        const t = sc.track(c);
        // wheels stay on the runway: no climb, no bank, and the runway (half-width 5.5) is never left
        for (const p of t.poses) {
          expect(p.y).toBeCloseTo(ON_WHEELS_Y, 6);
          expect(p.pitch).toBe(0);
          expect(Math.abs(p.roll)).toBeLessThan(0.05);
          expect(Math.abs(p.x)).toBeLessThan(5);
        }
      }
      // on the ground the stick does not steer: the heading stays where it was (the plane keeps drifting)
      for (const c of ["left", "right", "back", "fwd"] as Ctl[]) expect(Math.abs(poseAt(sc.track(c), 0.9).yaw)).toBeCloseTo(start, 6);
      // the path follows the nose: after the right pedal the plane rolls parallel to the centre line
      const tr = sc.track(r);
      const a = poseAt(tr, 0.75), b = poseAt(tr, 0.95);
      expect(Math.abs(b.x - a.x)).toBeLessThan(0.05 * Math.abs(b.z - a.z));
    }
  });
});

describe("generator", () => {
  it("every exercise at every level × 50 seeds lints, has a declared skill, and decodes back", () => {
    const problems: string[] = [];
    for (const ex of [...all(), shTutorial]) {
      problems.push(...lintExercise(ex));
      if (!skyHoops.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: undeclared skill`);
      const s = decode(ex);
      const { scaffold: _s, ...p } = ex.params ?? {};
      void _s;
      expect(encode(s)).toEqual(p);
      if (!lines[ex.prompt!.line]) problems.push(`${ex.id}: no line ${ex.prompt!.line}`);
      const right = correctFor(s);
      const a = ex.answer;
      if (a.kind === "choice") expect(a.correct, ex.id).toBe(right);
      else if (a.kind === "sequence") expect(a.order, ex.id).toEqual(right);
      else problems.push(`${ex.id}: unexpected answer kind`);
    }
    expect(problems).toEqual([]);
  });
  it("each level uses its own mode and skill", () => {
    const modes = ["hoop", "hoop", "hoop", "hoop", "name", "part", "line", "turn", "force", "course"];
    for (let level = 0; level <= SH_MAX_LEVEL; level++) {
      for (const ex of generateBand(skyHoops, level, 3, 8)) {
        expect(decode(ex).mode).toBe(modes[level]);
        expect(ex.skillId).toBe(LEVELS[level]!.skill);
      }
    }
  });
  it("same seed → same round; ids unique", () => {
    for (let level = 0; level <= SH_MAX_LEVEL; level++) {
      expect(buildRound(skyHoops, { level, seed: 11 })).toEqual(buildRound(skyHoops, { level, seed: 11 }));
      for (const seed of SEEDS.slice(0, 10)) expect(() => buildRound(skyHoops, { level, seed })).not.toThrow();
    }
    expect(generateSkyHoops(9, createRng(4), 2)).toEqual(generateSkyHoops(9, createRng(4), 2));
  });
  it("bands cover both directions of every axis and never ask for the same input three times in a row", () => {
    for (let level = 0; level <= 7; level++) {
      const band = generateBand(skyHoops, level, 7, 8);
      const rights = band.map((e) => String(correctFor(decode(e))));
      for (let i = 2; i < rights.length; i++) expect(rights[i] === rights[i - 1] && rights[i] === rights[i - 2], `level ${level}`).toBe(false);
      if (level <= 3 || level === 6 || level === 7) {
        const axes = new Set(band.map((e) => (decode(e).mode === "hoop" ? CTL_AXIS[correctFor(decode(e)) as Ctl] : "x")));
        void axes;
        expect(new Set(rights).size, `level ${level}`).toBe(level === 3 ? 4 : 2);
      }
    }
    expect(PATTERNS.axis.filter((a) => a !== "pitch").length / PATTERNS.axis.length).toBeGreaterThanOrEqual(0.5); // roll↔yaw ≥ 50%
    expect(PATTERNS.part.filter((c) => !c.includes("pedal")).length).toBeGreaterThan(4); // stick inputs most often
  });
  it("courses use three different stick moves; forces never ask about climbing", () => {
    for (const seed of SEEDS) for (const ex of generateBand(skyHoops, 9, seed, 8)) {
      const s = decode(ex) as Extract<Scenario, { mode: "course" }>;
      expect(new Set(s.course).size).toBe(3);
    }
    for (const ex of generateBand(skyHoops, 8, 1, 8)) expect(ex.prompt!.text).not.toMatch(/climb/i);
    expect(TEMPLATES).not.toContain("climb");
  });
  it("forces pictures are physically right", () => {
    const F = DIAGRAM_FORCES;
    expect(F.balanced.lift).toBe(F.balanced.weight);
    expect(F.balanced.thrust).toBe(F.balanced.drag);
    expect(F.thrustWins.thrust).toBeGreaterThan(F.thrustWins.drag);
    expect(F.dragWins.drag).toBeGreaterThan(F.dragWins.thrust);
    expect(TEMPLATE_OPTIONS.level[0]).toBe("balanced");
    expect(TEMPLATE_OPTIONS.faster[0]).toBe("thrustWins");
    expect(TEMPLATE_OPTIONS.slower[0]).toBe("dragWins");
    expect(TEMPLATE_OPTIONS.down[0]).toBe("weight");
    expect(TEMPLATE_OPTIONS.up[0]).toBe("lift");
    void (null as unknown as Diagram);
  });
});

describe("hints, praise and voice", () => {
  const find = (level: number, pred: (s: Scenario) => boolean) => generateBand(skyHoops, level, 3, 8).find((e) => pred(decode(e)))!;
  const miss = (e: ReturnType<typeof find>, value: string) => exerciseReducer(initExercise(e), { type: "SUBMIT", value });
  it("first-miss lines diagnose the misconception", () => {
    expect(hintFor(miss(find(7, () => true), (decode(find(7, () => true)) as { side: string }).side === "left" ? "lpedal" : "rpedal"))).toBe("sh.hint.boat");
    expect(hintFor(miss(find(6, () => true), "left"))).toBe("sh.hint.stickTips");
    const l6 = find(6, () => true);
    expect(hintFor(miss(l6, (decode(l6) as { nose: string }).nose === "right" ? "rpedal" : "lpedal"))).toBe("sh.help.taxi");
    expect(hintFor(miss(find(4, (s) => s.mode === "name" && s.axis === "roll"), "yaw"))).toBe("sh.hint.rollYaw");
    expect(hintFor(miss(find(8, (s) => s.mode === "force" && s.t === "level"), "thrustWins"))).toBe("sh.hint.steady");
    expect(hintFor(miss(find(8, (s) => s.mode === "force" && s.t === "up"), "thrust"))).toBe("sh.hint.engine");
    expect(explainFor(shTutorial)).toBe("sh.help.pitch");
  });
  it("two-choice items: the first miss greys the other option; a four-choice item models on the second miss", () => {
    let st = miss(find(1, () => true), "fwd");
    const right = (st.exercise.answer as { correct: string }).correct;
    if (right === "fwd") st = miss(find(1, () => true), "back");
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    expect(st.eliminated.length).toBe(1);
    const e3 = find(3, () => true);
    if (e3.answer.kind !== "choice") throw new Error("choice expected");
    const wrong = e3.answer.options.map((o) => o.id).filter((id) => id !== (e3.answer as { correct: string }).correct);
    let s3 = exerciseReducer(initExercise(e3), { type: "SUBMIT", value: wrong[0]! });
    s3 = exerciseReducer(s3, { type: "FEEDBACK_DONE" });
    s3 = exerciseReducer(s3, { type: "SUBMIT", value: wrong[1]! });
    expect(s3.hintStage).toBe(2);
    expect(s3.model).toBe((e3.answer as { correct: string }).correct);
    expect(validateAnswer(e3.answer, (e3.answer as { correct: string }).correct).correct).toBe(true);
  });
  it("every line the world can say exists, is short, and praise is about process", () => {
    const ids = new Set<string>([
      ...EXPLAIN_BY_LEVEL, "sh.help.lift", "sh.retry.1", "sh.hint.model", "sh.idle", "sh.ready", "sh.back", "sh.plan.full",
      "sh.hint.rollYaw", "sh.hint.elevator", "sh.hint.ailerons", "sh.hint.rudder", "sh.hint.stickTips", "sh.hint.boat", "sh.help.taxi", "sh.hint.steady",
      "sh.hint.liftEq", "sh.hint.faster", "sh.hint.slower", "sh.hint.dragBack", "sh.hint.liftUp", "sh.hint.engine",
      ...[...shIntro, ...shOutro].map((b) => b.line), ...Object.values(shBetween).map((b) => b.line),
    ]);
    for (const ex of all()) {
      for (const p of praiseFor(ex)) ids.add(p);
      if (ex.answer.kind === "choice") for (const o of ex.answer.options) if (o.say) ids.add(o.say);
      const v = ex.prompt!.vars ?? {};
      for (const [k, val] of Object.entries(v)) expect(lines[ex.prompt!.line]!.vary![k], `${ex.id} ${k}`).toContain(val);
    }
    expect([...ids].filter((id) => !lines[id])).toEqual([]);
    for (const [id, l] of Object.entries(lines)) {
      expect(words(l.text), id).toBeLessThanOrEqual(14);
      if (id.startsWith("sh.praise")) expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant/);
      expect(l.text, id).not.toMatch(/crash|danger|scary|emergency/i); // no crashes or emergencies for under-10s
    }
    expect(lines["sh.prompt.hoop"]!.vary!.where).toEqual(Object.values(WHERE));
    expect(lines["sh.prompt.part"]!.vary!.move).toEqual(Object.values(MOVE_SAY));
    expect(renderLine("sh.prompt.turn", { side: "left" })).toBe("The next hoop is far to the left. What does Zephy do first?");
  });
  it("levels 6 and 7 agree: pedals steer ON THE GROUND (L6); IN THE AIR a plane turns by banking (L7)", () => {
    for (const ex of generateBand(skyHoops, 6, 1, 8)) {
      expect(ex.prompt!.text).toMatch(/rolling down the runway/);
      expect(ex.objective).toMatch(/^On the ground/);
    }
    expect(lines["sh.help.taxi"]!.text).toMatch(/^On the ground/);
    expect(lines["sh.hint.stickTips"]!.text).toMatch(/^On the ground/);
    expect(lines["sh.help.turn"]!.text).toMatch(/^In the air/);
    expect(lines["sh.hint.boat"]!.text).toMatch(/^In the air/);
    // no line claims that a pedal steers in flight
    for (const [id, l] of Object.entries(lines)) if (/steer/i.test(l.text)) expect(id === "sh.prompt.line" || /ground|runway/i.test(l.text), id).toBe(true);
  });
  it("lift is never explained with the equal-transit-time myth", () => {
    const text = Object.values(lines).map((l) => l.text).join(" ").toLowerCase();
    expect(text).not.toMatch(/same time|equal time|meet at the back|longer path|travels farther/);
    expect(lines["sh.help.lift"]!.text).toMatch(/push air down/);
  });
  it("the world is registered in the live pilot library", () => {
    const w = getWorld("sky-hoops")!;
    expect(w.subject).toBe("pilot");
    expect(w.maxLevel).toBe(SH_MAX_LEVEL);
    expect(w.characters[0]).toBe("zephy");
    expect(getLibrary("pilot")!.status).toBe("live");
    expect(w.parentDescription).toMatch(/not flight training/);
  });
});
