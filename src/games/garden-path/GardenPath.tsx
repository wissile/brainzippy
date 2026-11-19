import { Puff } from "../../characters/Crew";
import type { Exercise } from "../../engine/types";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { GardenBackground, GardenObject, GardenToggle, NoBasket, PathFinderSticker } from "./art";
import { GardenBoard, GardenTray, hintLineFor, modelSteps } from "./Board";
import { gardenPath } from "./definition";
import { type Mode, decodePuzzle } from "./logic";
import { gpStore } from "./store";
import { gardenBetween, gardenIntro, gardenOutro } from "./story";

const EXPLAIN: Record<Mode, string> = {
  build: "gp.help.step",
  via: "gp.help.plan",
  debug: "gp.help.debug",
  repeat: "gp.help.repeat",
  stairs: "gp.help.staircase",
  "debug-loop": "gp.help.debug",
};
const PRAISE: Record<Mode, string[]> = {
  build: ["gp.praise.plan", "gp.praise.count", "gp.praise.order"],
  via: ["gp.praise.via", "gp.praise.plan"],
  debug: ["gp.praise.debug", "gp.praise.watch"],
  repeat: ["gp.praise.repeat", "gp.praise.plan"],
  stairs: ["gp.praise.pattern", "gp.praise.repeat"],
  "debug-loop": ["gp.praise.loopFix", "gp.praise.watch"],
};
const modeOf = (ex: Exercise) => decodePuzzle(ex).mode;

/** Toggle's Garden Path — sequences, debugging and first loops with arrow-card programs. Ages 5–7. */
const skin: GameSkin = {
  intro: { line: "gp.ready", text: "Beep! Hi, I'm Toggle! Will you help me plan a path to the berries?", backLine: "gp.back", backText: "Welcome back! The berries are ripe and waiting." },
  Background: GardenBackground,
  ObjectArt: GardenObject,
  Basket: NoBasket,
  Sticker: PathFinderSticker,
  Mascot: GardenToggle,
  Board: GardenBoard,
  Tray: GardenTray,
  music: "meadow",
  story: { intro: gardenIntro, outro: gardenOutro, between: gardenBetween },
  helper: {
    Character: Puff,
    name: "Puff",
    explainLine: "gp.help.start",
    // the first two levels introduce "a program is a list of steps"; later rounds open with that level's idea
    explainFor: (ex) => (ex.difficulty <= 2 && modeOf(ex) === "build" ? "gp.help.start" : EXPLAIN[modeOf(ex)]),
    hintLine: "gp.help.step",
    hintFor: (s) => {
      const shared = gpStore.get();
      return hintLineFor(decodePuzzle(s.exercise), shared.exId === s.exercise.id ? shared.diagnosis : null);
    },
  },
  praiseFor: (ex) => PRAISE[modeOf(ex)],
  praise: PRAISE.build,
  hintVoice: { "retry.1": "gp.retry", "hint.show": "gp.hint.model", "hint.modelTap": "gp.hint.modelTap" },
  alongSteps: modelSteps,
  alongSay: (_ex, i) => i + 1,
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"]',
  idle: { line: "gp.idle", target: '[data-gp-next="true"]' },
};

export default function GardenPath() {
  return <GameRunner game={gardenPath} skin={skin} />;
}
