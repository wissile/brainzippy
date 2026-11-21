import { Dabble } from "../../characters/library/Dabble";
import { Ripple } from "../../characters/library/Ripple";
import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { NoBasket, ReefBackground, ReefGuardianSticker, ReefObject } from "./art";
import { ReefBoard, ReefTray, modelSteps } from "./Board";
import { reefRescue } from "./definition";
import { runsOf } from "./facts";
import { modeOf } from "./generator";
import { reefBetween, reefIntro, reefOutro } from "./story";
import "./reef-rescue.css";

/** Dabble's round-start explanation: the idea this item practises. */
export function explainFor(ex: Exercise): string {
  switch (modeOf(ex.params)) {
    case "eats":
      return "rr.help.eats";
    case "home":
      return "rr.help.home";
    case "chain":
      return ex.params?.len === 3 ? "rr.help.sun" : "rr.help.chain";
    case "fact":
      return "rr.help.coral";
    case "story":
      return ex.params?.s === 1 ? "rr.help.recover" : "rr.help.bleach";
    case "sort":
      return "rr.help.sort";
    case "grazers":
      return "rr.help.grazers";
    case "plant":
      return "rr.help.plant";
    case "risk":
      return "rr.help.chart";
    case "count":
      return "rr.help.count";
  }
}

/** Dabble's first-miss line, diagnosed from the miss (the misconception it most likely shows). */
export function hintFor(st: ExerciseState): string {
  const ex = st.exercise;
  const v = st.lastAnswer;
  const arr = Array.isArray(v) ? (v as string[]) : [];
  switch (modeOf(ex.params)) {
    case "chain": {
      if (arr.includes("shark") && ex.params?.len === 3) return "rr.hint.shark";
      if (arr[0] !== "sun") return "rr.help.sun";
      return "rr.help.chain";
    }
    case "story":
      if (arr.includes("chem") || arr.includes("wash")) return "rr.help.chem";
      return ex.params?.s === 1 ? "rr.help.recover" : "rr.help.bleach";
    case "grazers":
      return arr.includes("shark") ? "rr.hint.shark" : "rr.help.grazers";
    case "risk": {
      const temps = Array.from({ length: 12 }, (_, i) => ex.params?.[`t${i}`] ?? 0);
      const picked = runsOf(temps).find((r) => `run-${r.start + 1}-${r.end + 1}` === v);
      return picked?.hottest ? "rr.hint.hottest" : "rr.help.chart";
    }
    default:
      return explainFor(ex);
  }
}

/** Praise the process the item needed (never ability). */
export function praiseFor(ex: Exercise): string[] {
  switch (modeOf(ex.params)) {
    case "eats":
      return ["rr.praise.eats"];
    case "home":
      return ["rr.praise.home"];
    case "chain":
      return ["rr.praise.1"];
    case "fact":
      return ["rr.praise.2"];
    case "story":
      return ["rr.praise.bleach"];
    case "sort":
      return ["rr.praise.3"];
    case "grazers":
      return ["rr.praise.grazers"];
    case "plant":
      return ["rr.praise.plant"];
    case "risk":
    case "count":
      return ["rr.praise.4"];
  }
}

const skin: GameSkin = {
  intro: { line: "rr.ready", text: "Let's look closely and help the reef bloom again!", backLine: "rr.back", backText: "Welcome back to the reef! Ready to help?" },
  Background: ReefBackground,
  ObjectArt: ReefObject,
  Basket: NoBasket,
  Sticker: ReefGuardianSticker,
  Mascot: Ripple,
  Board: ReefBoard,
  Tray: ReefTray,
  music: "island",
  story: { intro: reefIntro, outro: reefOutro, between: reefBetween },
  helper: { Character: Dabble, name: "Dabble", explainLine: "rr.help.eats", hintLine: "rr.help.eats", explainFor, hintFor },
  praise: ["rr.praise.eats"],
  praiseFor,
  hintVoice: { "retry.1": "rr.retry.1", "hint.countAlong": "rr.retry.1", "hint.model": "rr.hint.model", "hint.show": "rr.hint.model", "hint.modelTap": "rr.hint.check" },
  alongSteps: modelSteps,
  alongSay: (ex, i) => (modeOf(ex.params) === "count" ? i + 1 : null),
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="parrotfish"]',
  idle: { line: "rr.idle", target: '[data-testid="shelf"]' },
};

/** Ripple's Reef Rescue — food chains, species' needs, coral partners, bleaching and restoration. Ages 8–12. */
export default function ReefRescue() {
  return <GameRunner game={reefRescue} skin={skin} />;
}
