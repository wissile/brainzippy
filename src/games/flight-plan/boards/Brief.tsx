import { useEffect } from "react";
import type { BoardProps } from "../../../game/boards";
import { metarOf } from "../generator";
import { briefCall } from "../hints";
import { CARD, OUTCOME_OF, PILOT_SCENES, PLANE_NOTES, RESERVE_MIN, cardFails, fmtFeet, fmtHM, p } from "../logic";
import { outcomeStore } from "../store";
import { MetarStrip } from "./Weather";
import { ModelSteps, Options, Tab, flags } from "./shared";

/**
 * Go / No-go briefing (pilot.adm.risk) — the closer of every round (engine R5a). The board brings the round's
 * planning together: route (trip time vs fuel + reserve), weather (report vs the practice card), pilot (IMSAFE)
 * and plane (walk-around), plus, from level 5, Bobbo's "we can't be late" (get-there-itis). One problem is enough
 * to change the plan. Second miss: each row is marked OK / problem in turn.
 */
export function BriefBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const f = flags(st);
  const x = metarOf(ex.params ?? {});
  const trip = p(ex, "trip"), fuel = p(ex, "fuel");
  const scene = PILOT_SCENES[p(ex, "sc")]!;
  const rows = [
    { key: "route", on: p(ex, "fr") === 1, title: "Route", ok: fuel >= trip + RESERVE_MIN },
    { key: "wx", on: p(ex, "fw") === 1, title: "Weather", ok: cardFails(x, false).length === 0 },
    { key: "pilot", on: p(ex, "fpi") === 1, title: "Pilot", ok: scene.why === "ready" },
    { key: "plane", on: p(ex, "fpl") === 1, title: "Plane", ok: p(ex, "pb") === 0 },
  ].filter((r) => r.on);
  // the model marks one row per runner step; then all of them
  const marked = (i: number) => f.modelOn && (alongIndex >= 0 ? i <= alongIndex : f.canAct || f.solved);
  useEffect(() => {
    if (f.solved) outcomeStore.set(OUTCOME_OF[briefCall(ex)]);
  }, [f.solved]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fp-stage game-brief mode-brief" data-testid="fp-board" data-mode="brief" data-game="brief">
      <Tab game="brief" sub="The final call" />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Briefing board">
          <div className="fp-briefing">
            {rows.map((r, i) => (
              <div key={r.key} className={`fp-row row-${r.key} ${marked(i) ? (r.ok ? "is-okrow" : "is-badrow") : ""}`}>
                <span className="fp-row-title">{r.title}</span>
                <div className="fp-row-body">
                  {r.key === "route" && <p>Trip <b>{fmtHM(trip)}</b> · fuel on board <b>{fmtHM(fuel)}</b> <span className="fp-rule">(needs trip + {RESERVE_MIN} min reserve)</span></p>}
                  {r.key === "wx" && (
                    <>
                      <MetarStrip params={ex.params ?? {}} />
                      <p className="fp-rule">Card: ceiling ≥ {fmtFeet(CARD.ceiling)} ft · visibility ≥ {CARD.vis} SM · wind ≤ {CARD.wind} kt</p>
                    </>
                  )}
                  {r.key === "pilot" && <p>{scene.text}</p>}
                  {r.key === "plane" && <p>{PLANE_NOTES[p(ex, "pb") ? "bad" : "ok"][p(ex, "pn")] ?? PLANE_NOTES.ok[0]}</p>}
                </div>
                {marked(i) && (
                  <span className="fp-row-mark" data-testid="fp-row-mark">
                    <span aria-hidden="true">{r.ok ? "✓" : "✗"}</span>
                    <span className="sr-only">{r.ok ? "OK" : "Problem"}</span>
                  </span>
                )}
              </div>
            ))}
            {p(ex, "pr") === 1 && <p className="fp-pressure">Bobbo: “Please, we can't be late for the festival!”</p>}
          </div>
        </section>
        <section className="fp-panel" aria-label="Your call">
          {ex.answer.kind === "choice" && <Options st={st} act={act} busy={busy} options={ex.answer.options} label="Call" />}
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} title="Row by row" />
        </section>
      </div>
    </div>
  );
}
