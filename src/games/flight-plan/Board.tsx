import type { BoardProps } from "../../game/boards";
import { BriefBoard } from "./boards/Brief";
import { ChecklistBoard } from "./boards/Checklist";
import { LegBoard } from "./boards/Leg";
import { TunnelBoard } from "./boards/Tunnel";
import { WeatherBoard } from "./boards/Weather";
import { gameOf } from "./logic";
import "./flight-plan.css";

/**
 * Ziggy's Flight Plan board (skin.Board): the flight-planning room with four inner games and the closing briefing.
 * Each inner game renders its own scene + panel; the tray row is hidden (controls live on the board).
 * Every control is a <button> (or a native range input) with an action label; drag is always optional.
 */
export function FlightBoard(props: BoardProps) {
  switch (gameOf(props.st.exercise)) {
    case "tunnel":
      return <TunnelBoard {...props} />;
    case "leg":
      return <LegBoard {...props} />;
    case "wx":
      return <WeatherBoard {...props} />;
    case "check":
      return <ChecklistBoard {...props} />;
    case "brief":
      return <BriefBoard {...props} />;
  }
}

export const FlightTray = () => <div className="fp-tray" aria-hidden="true" />;
