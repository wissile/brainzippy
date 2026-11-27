import { Hoot } from "../../characters/Crew";
import { Ripple } from "../../characters/library";
import type { Exercise, MascotState } from "../../engine/types";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { KeepersLampSticker, LnObject, NightHarbour, NoBasket } from "./art";
import { LighthouseBoard, LighthouseTray } from "./Board";
import { lighthouseNight } from "./definition";
import { explainFor, hintFor, modelSteps, praiseFor } from "./hints";
import { lnStory } from "./story";

/** Restrained motion for ages 12–14: calm nods instead of bouncing celebrations. */
const calm = (s: MascotState): MascotState => (s === "celebrating" ? "encouraging" : s);
type MascotProps = { state: MascotState; talking?: boolean; size?: number | string };
const Host = ({ state, ...p }: MascotProps) => <Hoot state={calm(state)} {...p} />;
const Helper = ({ state, ...p }: MascotProps) => <Ripple state={calm(state)} {...p} />;

const skin: GameSkin = {
  intro: {
    line: "ln.intro",
    text: "Storm's coming in, keeper. Let's light the way for every ship.",
    backLine: "ln.back",
    backText: "Welcome back to the lamp room, keeper. The ships are waiting.",
  },
  Background: () => <NightHarbour />,
  ObjectArt: LnObject,
  Basket: NoBasket,
  Sticker: KeepersLampSticker,
  Mascot: Host,
  Board: LighthouseBoard,
  Tray: LighthouseTray,
  music: "cave",
  story: lnStory,
  helper: { Character: Helper, name: "Ripple", explainLine: "ln.help.line", hintLine: "ln.help.line", explainFor, hintFor },
  praise: ["ln.praise.angle"],
  praiseFor,
  hintVoice: { "retry.1": "ln.retry", "hint.countAlong": "ln.retry", "hint.model": "ln.model", "hint.show": "ln.model", "hint.modelTap": "ln.model" },
  alongSteps: (ex: Exercise) => modelSteps(ex).length,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: ".ln-ang.is-unknown",
  idle: { line: "ln.idle", target: "[data-ln-idle]" },
};

/** Lighthouse Night — Hoot's lamp room on a stormy night; ages 12–14 (the last stop of the Maths journey). */
export default function LighthouseNight() {
  return <GameRunner game={lighthouseNight} skin={skin} />;
}
