import { Bobbo } from "../../characters/Bobbo";
import { Hoot } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BasketArt, ChampSticker, MeadowBackground, SnackArt } from "./art";
import { countingAdventure } from "./definition";
import { breakfastBetween, breakfastIntro, breakfastOutro } from "./story";

const skin: GameSkin = {
  Background: MeadowBackground,
  ObjectArt: SnackArt,
  Basket: BasketArt,
  Sticker: ChampSticker,
  Mascot: Bobbo,
  music: "meadow",
  story: { intro: breakfastIntro, outro: breakfastOutro, between: breakfastBetween },
  helper: { Character: Hoot, name: "Hoot", explainLine: "ca.help.explain", hintLine: "ca.help.hint" },
};

export default function CountingAdventure() {
  return <GameRunner game={countingAdventure} skin={skin} />;
}
