import { useMemo } from "react";
import { Hoot } from "../../characters/Crew";
import { Sarah } from "../../characters/library/Sarah";
import type { MascotState } from "../../engine/types";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { loadState } from "../../services/storage";
import { EditorsPen, NoBasket, PressObject, PressScene } from "./art";
import { PressBoard, PressTray } from "./Board";
import { lanternPress } from "./definition";
import { explainFor, hintFor, praiseFor } from "./hints";
import { modelSteps, optId } from "./logic";
import { storyFor } from "./story";

/** Restrained motion for ages 12–14 (docs §2): calm nods instead of bouncing celebrations. */
const calm = (s: MascotState): MascotState => (s === "celebrating" ? "encouraging" : s);
type MascotProps = { state: MascotState; talking?: boolean; size?: number | string };
const Editor = ({ state, ...p }: MascotProps) => <Sarah state={calm(state)} {...p} />;
const FactChecker = ({ state, ...p }: MascotProps) => <Hoot state={calm(state)} {...p} />;

function makeSkin(firstVisit: boolean): GameSkin {
  return {
    intro: {
      line: "lp.intro",
      text: "The press is ready whenever you are. Tonight's pages are on your desk.",
      backLine: "lp.back",
      backText: "Welcome back, editor. A fresh page is waiting.",
    },
    Background: PressScene,
    ObjectArt: PressObject,
    Basket: NoBasket,
    Sticker: EditorsPen,
    Mascot: Editor,
    Board: PressBoard,
    Tray: PressTray,
    music: "island",
    story: storyFor(firstVisit),
    helper: { Character: FactChecker, name: "Hoot", explainLine: "lp.help.combine", hintLine: "lp.hint.relation", explainFor, hintFor },
    praise: ["lp.praise.1"],
    praiseFor,
    hintVoice: { "hint.show": "lp.hint.show", "hint.modelTap": "lp.hint.model", "retry.1": "lp.retry.1" },
    // second miss: one step per line of the worked steps (sorting: one per card); the board shows each step
    alongSteps: modelSteps,
    alongSay: () => null,
    numberKeys: false,
    tutorialTarget: `[data-testid="choice"][data-value="${optId("because")}"]`,
    idle: { line: "lp.idle", target: "[data-lp-idle]" },
  };
}

/** The Lantern Press — editing the island's evening paper; ages 12–14 (English path, band D). */
export default function LanternPress() {
  const skin = useMemo(() => {
    const p = loadState().progress;
    const firstVisit = p.levels?.[lanternPress.id] === undefined && !p.stickers.includes(lanternPress.achievement.id);
    return makeSkin(firstVisit);
  }, []);
  return <GameRunner game={lanternPress} skin={skin} />;
}
