import { createRoot } from "react-dom/client";
import "../../../styles/tokens.css";
import "../../../styles/characters.css";
import type { MascotState } from "../../../engine/types";
import { Bobbo } from "../../Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../../Crew";
import { LIBRARY_HOSTS } from "../index";

/**
 * DEV-ONLY character gallery (not part of the app build; served by scripts/screenshot-characters.mjs).
 * ?view=grid&size=64      every library host × every state
 * ?view=lineup&size=120   the whole cast side by side (existing Crew + library hosts)
 * ?view=silhouette        lineup filled solid ink at 48 px (silhouette test)
 */
const STATES: MascotState[] = ["idle", "greeting", "talking", "thinking", "encouraging", "celebrating", "retry", "sleeping"];
const q = new URLSearchParams(location.search);
const view = q.get("view") ?? "grid";
const size = Number(q.get("size") ?? 120);
const only = q.get("only");

type C = React.ComponentType<{ state?: MascotState; talking?: boolean; size?: number | string }>;
const CREW: [string, C][] = [
  ["bobbo", (p) => <Bobbo state={p.state ?? "idle"} {...p} />],
  ["zuzu", Zuzu], ["gloop", Gloop], ["hoot", Hoot], ["rumble", Rumble], ["puff", Puff],
];
const HOSTS: [string, C][] = LIBRARY_HOSTS.map((h) => [h.id, h.Component]);

const css = `
  body { margin: 0; background: #FFF6DA; font: 600 13px/1.2 system-ui, sans-serif; color: #2B2140; }
  .row { display: flex; align-items: flex-end; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #0001; }
  .cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .name { width: 70px; font-size: 14px; align-self: center; }
  .sil svg.critter { filter: brightness(0); }
  .sil .cell span { visibility: hidden; }
`;

function Grid() {
  const list = only ? HOSTS.filter(([id]) => id === only) : HOSTS;
  return (
    <>
      {list.map(([id, Comp]) => (
        <div className="row" key={id} data-testid={`row-${id}`}>
          <div className="name">{id}</div>
          {STATES.map((s) => (
            <div className="cell" key={s}>
              <Comp state={s === "talking" ? "encouraging" : s} talking={s === "talking"} size={size} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function Lineup() {
  return (
    <>
      {[CREW, HOSTS.slice(0, 5), HOSTS.slice(5)].map((group, i) => (
        <div className="row" key={i}>
          {group.map(([id, Comp]) => (
            <div className="cell" key={id}>
              <Comp state="idle" size={size} />
              <span>{id}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <div className={view === "silhouette" ? "sil" : ""} data-testid="gallery">
    <style>{css}</style>
    {view === "grid" ? <Grid /> : <Lineup />}
  </div>,
);
