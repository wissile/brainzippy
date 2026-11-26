import { Dabble, Ziggy } from "../../characters/library";
import type { Exercise, MascotState } from "../../engine/types";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { ClipboardSticker, FpObject, NoBasket, PlanningRoom } from "./art";
import { FlightBoard, FlightTray } from "./Board";
import { flightPlan } from "./definition";
import { explainFor, hintFor, modelSteps, praiseFor } from "./hints";
import { fpStory } from "./story";

/** Restrained motion for ages 12–14: calm nods instead of bouncing celebrations. */
const calm = (s: MascotState): MascotState => (s === "celebrating" ? "encouraging" : s);
type MascotProps = { state: MascotState; talking?: boolean; size?: number | string };
const Host = ({ state, ...p }: MascotProps) => <Ziggy state={calm(state)} {...p} />;
const Helper = ({ state, ...p }: MascotProps) => <Dabble state={calm(state)} {...p} />;

const skin: GameSkin = {
  intro: {
    line: "fp.intro",
    text: "Ready to plan tomorrow's flight, co-pilot? Remember: this is a learning game, not real flight training.",
    backLine: "fp.back",
    backText: "Welcome back, co-pilot. The planning table is ready.",
  },
  Background: PlanningRoom,
  ObjectArt: FpObject,
  Basket: NoBasket,
  Sticker: ClipboardSticker,
  Mascot: Host,
  Board: FlightBoard,
  Tray: FlightTray,
  music: "sky",
  story: fpStory,
  helper: { Character: Helper, name: "Dabble", explainLine: "fp.help.find", hintLine: "fp.hint.card", explainFor, hintFor },
  praise: ["fp.praise.brief"],
  praiseFor,
  hintVoice: { "retry.1": "fp.retry", "hint.countAlong": "fp.retry", "hint.model": "fp.model", "hint.show": "fp.model", "hint.modelTap": "fp.model" },
  // second miss: one runner step per worked line; the board shows each one (sequences: one per placed step)
  alongSteps: (ex: Exercise) => (ex.answer.kind === "sequence" ? ex.answer.order.length : modelSteps(ex).length),
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="fp-aoa"]',
  idle: { line: "fp.idle", target: "[data-fp-idle]" },
};

/** Ziggy's Flight Plan — the flight-planning room; ages 12–14 (Pilot journey, Sky School). */
export default function FlightPlan() {
  return <GameRunner game={flightPlan} skin={skin} />;
}
