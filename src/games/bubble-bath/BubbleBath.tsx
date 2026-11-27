import { useState } from "react";
import { Bobbo } from "../../characters/Bobbo";
import { Gloop } from "../../characters/Crew";
import type { MascotState } from "../../engine/types";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BathBackground, BathIcon, BubbleBuddySticker, NoBasket } from "./art";
import { BathBoard, BathTray } from "./Board";
import { bubbleBath } from "./definition";
import { alongSayFor, alongStepsFor, explainFor, hintFor, praiseFor } from "./logic";
import { resetStores } from "./shared";
import { bathBetween, bathIntro, bathOutro } from "./story";

/** Bobbo as the helper (Bobbo's own props differ slightly from the Crew's: state is required). */
const BobboHelper = ({ state, talking, size }: { state: MascotState; talking?: boolean; size?: number | string }) => <Bobbo state={state} talking={talking} size={size} />;

/** Gloop's Bubble Bath — five inner games in Gloop's bathtub. Ages 3–4, first stop of the Maths journey. */
const skin: GameSkin = {
  intro: { line: "gb.ready", text: "Hi, I'm Gloop! Will you help with my bubble bath?", backLine: "gb.back", backText: "Welcome back! The bubbles are waiting for you." },
  numberKeys: false, // Quick Look's choices wake up only after the bubbles have been shown; the tray's buttons handle keys
  Background: BathBackground,
  ObjectArt: BathIcon,
  Basket: NoBasket,
  Sticker: BubbleBuddySticker,
  Mascot: Gloop,
  Board: BathBoard,
  Tray: BathTray,
  music: "sky",
  story: { intro: bathIntro, outro: bathOutro, between: bathBetween },
  helper: { Character: BobboHelper, name: "Bobbo", explainLine: "gb.help.sort", explainFor, hintLine: "gb.retry", hintFor },
  praise: ["gb.praise.sort.1"],
  praiseFor,
  hintVoice: { "retry.1": "gb.retry", "hint.countAlong": "gb.retry", "hint.model": "gb.hint.countAlong", "hint.show": "gb.hint.show", "hint.modelTap": "gb.hint.yourTurn" },
  alongSteps: alongStepsFor,
  alongSay: alongSayFor,
  tutorialTarget: "[data-gb-tutorial]",
  idle: { line: "gb.idle", target: "[data-gb-idle]" },
};

export default function BubbleBath() {
  useState(() => resetStores());
  return <GameRunner game={bubbleBath} skin={skin} />;
}
