import type { BoardProps } from "../../game/boards";
import { BeamBoard } from "./boards/Beam";
import { ChartBoard } from "./boards/Chart";
import { GridBoard } from "./boards/Grid";
import { LadderBoard } from "./boards/Ladder";
import { GAME_OF, boardOf } from "./logic";
import "./lighthouse-night.css";

/**
 * Lighthouse Night board (skin.Board): Hoot's lamp room with four inner games (Beam Angles, Ladder & Tower, Chart
 * Scale, Ship Paths); the finale (Last Ship Home) borrows the board of the game its maths comes from. The tray row is
 * hidden: every control lives on the board, as a <button> (or a focusable dial / grid) with an action label.
 */
export function LighthouseBoard(props: BoardProps) {
  switch (GAME_OF[boardOf(props.st.exercise)]) {
    case "beam":
      return <BeamBoard {...props} />;
    case "ladder":
      return <LadderBoard {...props} />;
    case "chart":
      return <ChartBoard {...props} />;
    default:
      return <GridBoard {...props} />;
  }
}

export const LighthouseTray = () => <div className="ln-tray" aria-hidden="true" />;
