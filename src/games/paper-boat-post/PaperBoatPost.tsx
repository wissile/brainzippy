import { useMemo } from "react";
import { Zuzu } from "../../characters/Crew";
import { Sarah } from "../../characters/library/Sarah";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { loadState } from "../../services/storage";
import { NoBasket, PaperBoatObject, RiverPost, RiverReaderSticker } from "./art";
import { BoatBoard, BoatTray } from "./Board";
import { paperBoatPost } from "./definition";
import { explainFor, hintFor, praiseFor } from "./hints";
import { modelSteps } from "./logic";
import { storyFor } from "./story";

function makeSkin(firstVisit: boolean): GameSkin {
  return {
    intro: {
      line: "pb.intro",
      text: "Hello! The paper boats are ready. Will you help me read them?",
      backLine: "pb.back",
      backText: "Welcome back! More paper boats are waiting for a reader.",
    },
    Background: RiverPost,
    ObjectArt: PaperBoatObject,
    Basket: NoBasket,
    Sticker: RiverReaderSticker,
    Mascot: Sarah,
    Board: BoatBoard,
    Tray: BoatTray,
    music: "meadow",
    story: storyFor(firstVisit),
    helper: { Character: Zuzu, name: "Zuzu", explainLine: "pb.help.start", hintLine: "pb.hint.read.1", explainFor, hintFor },
    praise: ["pb.praise.sort"],
    praiseFor,
    hintVoice: { "hint.show": "pb.hint.show", "hint.modelTap": "pb.hint.model", "retry.1": "pb.retry.1" },
    // second miss: one step per letter/word of the sail (the board speaks the slowed word), plus the whole word
    alongSteps: modelSteps,
    alongSay: () => null,
    numberKeys: false,
    tutorialTarget: '[data-testid="choice"][data-value="h"]',
    idle: { line: "pb.idle", target: "[data-pb-idle]" },
  };
}

/** Paper Boat Post — decoding and spelling, ages 6–8 (English path, band B), host Sarah, helper Zuzu. */
export default function PaperBoatPost() {
  const skin = useMemo(() => {
    const p = loadState().progress;
    const firstVisit = p.levels?.[paperBoatPost.id] === undefined && !p.stickers.includes(paperBoatPost.achievement.id);
    // Hoot's hand-over only makes sense for a child who has actually played his Rhyme Lanterns
    const cameFromRhymes = p.levels?.["rhyme-lanterns"] !== undefined || p.stickers.includes("lantern-keeper");
    return makeSkin(firstVisit && cameFromRhymes);
  }, []);
  return <GameRunner game={paperBoatPost} skin={skin} />;
}
