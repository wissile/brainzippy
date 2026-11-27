import type { BoardProps } from "../../game/boards";
import { BarBoard } from "./boards/Bar";
import { FracBoard } from "./boards/Frac";
import { GridBoard } from "./boards/Grid";
import { OrderBoard } from "./boards/Order";
import { TrayBoard } from "./boards/Tray";
import { decode, modeOf } from "./logic";
import "./bakery.css";

/**
 * Bobbo's Bakery board (skin.Board): four baking stations and the festival order sheet. Each inner game renders its own
 * scene + answer panel; the tray row is hidden (controls live on the board). Every control is a <button> with an
 * action label; drag (tray corner, tray edge, cake slices, number tags) is always optional.
 */
export function BakeryBoard(props: BoardProps) {
  switch (modeOf(decode(props.st.exercise))) {
    case "tray":
      return <TrayBoard {...props} />;
    case "grid":
      return <GridBoard {...props} />;
    case "frac":
      return <FracBoard {...props} />;
    case "bar":
      return <BarBoard {...props} />;
    case "order":
      return <OrderBoard {...props} />;
  }
}

export const BakeryTray = () => <div className="bk-traybar" aria-hidden="true" />;
