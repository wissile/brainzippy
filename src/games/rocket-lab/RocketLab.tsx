import { Rumble } from "../../characters/Crew";
import { Dabble } from "../../characters/library/Dabble";
import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { LabBackground, LaunchPatchSticker, NoBasket, RocketObject } from "./art";
import { RocketBoard, RocketTray, modelSteps } from "./Board";
import { rocketLab } from "./definition";
import { engineThrust, outcomeOf, resultOf, scenarioOf } from "./logic";
import { rocketBetween, rocketIntro, rocketOutro } from "./story";
import "./rocket-lab.css";

/** Rumble's round-start explanation: the idea this experiment tests. */
export function explainFor(ex: Exercise): string {
  switch (scenarioOf(ex.params).mode) {
    case "weight":
    case "engineKg":
      return "rl.help.mass";
    case "moonMass":
    case "moonEngine":
      return "rl.help.moon";
    case "rank":
    case "fuelNet":
      return "rl.help.net";
    case "fuelChange":
      return "rl.help.fuel";
    case "mission":
      return "rl.help.plan";
    default:
      return "rl.help.start";
  }
}

/** Rumble's first-miss line, diagnosed from the miss (which misconception it most likely shows). */
export function hintFor(st: ExerciseState): string {
  const s = scenarioOf(st.exercise.params);
  const v = st.lastAnswer;
  switch (s.mode) {
    case "lift":
      return s.t === s.w ? "rl.help.balanced" : "rl.help.start";
    case "engine":
    case "engineKg": {
      const t = typeof v === "string" ? engineThrust(v) : 0;
      return s.mode === "engineKg" ? "rl.help.mass" : outcomeOf(t, s.w) === "balanced" ? "rl.help.balanced" : "rl.help.start";
    }
    case "cargo": {
      const n = typeof v === "number" ? v : 0;
      const o = outcomeOf(s.t, s.w + n * s.c);
      return o === "lift" ? "rl.hint.more" : o === "balanced" ? "rl.help.balanced" : "rl.help.start";
    }
    case "weight":
      return "rl.help.mass";
    case "moonMass":
      return "rl.help.moon";
    case "moonEngine": {
      const t = typeof v === "string" ? engineThrust(v) : 0;
      return outcomeOf(t, s.w) === "lift" ? "rl.hint.smaller" : "rl.help.moon";
    }
    case "rank":
    case "fuelNet":
      return "rl.help.net";
    case "fuelChange":
      return s.change === "load" ? "rl.help.load" : s.change === "throttle" ? "rl.help.throttle" : "rl.help.fuel";
    case "mission": {
      const r = resultOf(s, v);
      if (r.kind !== "mission") return "rl.help.plan";
      return r.band < s.target ? "rl.hint.short" : r.cost > s.budget ? "rl.hint.budget" : "rl.help.plan";
    }
  }
}

/** Praise the process the experiment needed. */
export function praiseFor(ex: Exercise): string[] {
  const s = scenarioOf(ex.params);
  switch (s.mode) {
    case "lift":
      return s.t === s.w ? ["rl.praise.2"] : ["rl.praise.1"];
    case "engine":
      return ["rl.praise.engine", "rl.praise.1"];
    case "cargo":
      return ["rl.praise.cargo"];
    case "weight":
    case "engineKg":
      return ["rl.praise.weight"];
    case "moonMass":
    case "moonEngine":
      return ["rl.praise.3"];
    case "rank":
      return ["rl.praise.rank"];
    case "fuelNet":
      return ["rl.praise.4"];
    case "fuelChange":
      return s.change === "load" ? ["rl.praise.slower"] : s.change === "throttle" ? ["rl.praise.same"] : ["rl.praise.4"];
    case "mission":
      return ["rl.praise.plan"];
  }
}

const skin: GameSkin = {
  intro: { line: "rl.ready", text: "What do you think will happen? Let's test it!", backLine: "rl.back", backText: "Welcome back to the Rocket Lab!" },
  Background: LabBackground,
  ObjectArt: RocketObject,
  Basket: NoBasket,
  Sticker: LaunchPatchSticker,
  Mascot: Dabble,
  Board: RocketBoard,
  Tray: RocketTray,
  music: "sky",
  story: { intro: rocketIntro, outro: rocketOutro, between: rocketBetween },
  helper: { Character: Rumble, name: "Rumble", explainLine: "rl.help.start", hintLine: "rl.help.start", explainFor, hintFor },
  praise: ["rl.praise.1"],
  praiseFor,
  hintVoice: { "retry.1": "rl.retry.1", "hint.countAlong": "rl.retry.1", "hint.model": "rl.hint.model", "hint.show": "rl.hint.model", "hint.modelTap": "rl.hint.modelTap" },
  alongSteps: modelSteps,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="part"][data-part="engine"]',
  idle: { line: "rl.idle", target: '[data-testid="rocket"]' },
};

/** Dabble's Rocket Lab — forces, mass and gravity through build-predict-launch experiments. Ages 8–12. */
export default function RocketLab() {
  return <GameRunner game={rocketLab} skin={skin} />;
}
