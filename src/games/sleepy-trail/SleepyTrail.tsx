import { useEffect, useState } from "react";
import { Gloop, Rumble } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BasketStub, FractionArt, TrailBackground, TrailMarkerSticker } from "./art";
import { TrailBoard, TrailTray } from "./Board";
import { sleepyTrail } from "./definition";
import { itemOf } from "./generator";
import { diagnose, explainFor, praiseFor } from "./logic";
import { trailStore } from "./store";
import { trailBetween, trailIntro, trailOutro } from "./story";

/** Rumble's Sleepy Trail — fractions as spots on a number line: walk Rumble equal jumps from zero to each nap spot. */
const skin: GameSkin = {
  intro: { line: "st.intro", text: "Rumble is sleepy. Will you help him find his nap spots?", backLine: "st.back", backText: "Welcome back! Rumble has more nap spots to find." },
  numberKeys: false,
  Background: TrailBackground,
  ObjectArt: FractionArt,
  Basket: BasketStub,
  Sticker: TrailMarkerSticker,
  Mascot: Rumble,
  Board: TrailBoard,
  Tray: TrailTray,
  music: "meadow",
  story: { intro: trailIntro, outro: trailOutro, between: trailBetween },
  helper: {
    Character: Gloop,
    name: "Gloop",
    explainLine: "st.help.start",
    explainFor,
    hintLine: "st.retry.1",
    hintFor: (s) => diagnose(s.exercise, s.lastAnswer, s.check),
  },
  praiseFor,
  hintVoice: {
    "retry.1": "st.retry.1",
    "hint.countAlong": "st.retry.1",
    "hint.model": "st.hint.model",
    "hint.show": "st.hint.model",
    "hint.modelTap": "st.hint.modelTap",
  },
  // worked example: Rumble walks the jumps from zero in the target's own unit (Bobbo's walk follows in compare)
  alongSteps: (ex) => {
    const it = itemOf(ex);
    return it.a + (it.mode === "compare" ? it.a2! : 0);
  },
  alongSay: (ex, i) => {
    const it = itemOf(ex);
    return it.mode === "compare" && i >= it.a ? i - it.a + 1 : i + 1;
  },
  tutorialTarget: '[data-testid="post"][data-value="1"]',
  idle: { line: "st.idle", target: '[data-testid="trail-start"]' },
};

export default function SleepyTrail() {
  // a fresh visit starts in the golden afternoon (reset before any child effect reads the store)
  useState(() => trailStore.reset());
  useEffect(() => () => trailStore.reset(), []);
  return <GameRunner game={sleepyTrail} skin={skin} />;
}
