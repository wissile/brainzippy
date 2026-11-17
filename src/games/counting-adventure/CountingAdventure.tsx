import { Bobbo } from "../../characters/Bobbo";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BasketArt, ChampSticker, MeadowBackground, SnackArt } from "./art";
import { countingAdventure } from "./definition";

const skin: GameSkin = {
  Background: MeadowBackground,
  ObjectArt: SnackArt,
  Basket: BasketArt,
  Sticker: ChampSticker,
  Mascot: Bobbo,
};

export default function CountingAdventure() {
  return <GameRunner game={countingAdventure} skin={skin} />;
}
