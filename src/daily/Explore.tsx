import { useMemo, useState } from "react";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";
import { getSubject, worldsBySubject } from "../content/registry";
import type { World } from "../content/types";
import { loadState } from "../services/storage";
import { Critter, hostOf } from "./critters";
import { type AgeRange } from "./planner";
import { setActiveStop } from "./store";

/** Worlds that suit a band (±1 year, like the planner's age window). */
export const fitsBand = (w: World, band: AgeRange): boolean => w.ages[0] <= band[1] + 1 && w.ages[1] >= band[0] - 1;

/**
 * Explore: every world, grouped by subject, as a scrolling shelf of cards (scales to dozens of worlds).
 * Default shows worlds for the child's age; one tap shows all ages. Explore rounds count toward today's limit.
 */
export function Explore({ band }: { band: AgeRange }) {
  const { navigate } = useApp();
  const [allAges, setAllAges] = useState(false);
  const levels = loadState().progress.levels ?? {};
  const groups = useMemo(
    () =>
      [...worldsBySubject()]
        .map(([subject, worlds]) => ({ subject, title: getSubject(subject)?.title ?? subject, worlds: allAges ? worlds : worlds.filter((w) => fitsBand(w, band)) }))
        .filter((g) => g.worlds.length > 0),
    [allAges, band],
  );

  const play = (id: string) => {
    audio.play("whoosh");
    setActiveStop(null);
    navigate(`/play/${id}`);
  };

  return (
    <section className="explore" data-testid="explore" aria-label="Explore all adventures">
      <div className="explore-head">
        <h2>Explore</h2>
        <button
          type="button"
          className={`explore-ages ${allAges ? "on" : ""}`}
          data-testid="explore-all-ages"
          aria-pressed={allAges}
          aria-label={allAges ? "Showing all ages. Show adventures for my age" : "Show adventures for all ages"}
          onClick={() => {
            audio.play("tap");
            setAllAges((a) => !a);
          }}
        >
          {allAges ? "All ages" : `Ages ${band[0]}–${band[1]}`}
        </button>
      </div>
      <div className="explore-scroll">
        {groups.map((g) => (
          <div key={g.subject} className="explore-group" data-testid={`explore-subject-${g.subject}`}>
            <h3>{g.title}</h3>
            <div className="explore-grid">
              {g.worlds.map((w) => {
                const lv = (levels[w.id] ?? 0) + 1;
                return (
                  <button key={w.id} type="button" className="explore-card" data-testid={`explore-${w.id}`} aria-label={`${w.title}, ages ${w.ages[0]} to ${w.ages[1]}, level ${lv}. Play`} onClick={() => play(w.id)}>
                    <span className="explore-critter" aria-hidden="true"><Critter id={hostOf(w)} /></span>
                    <span className="explore-name">{w.title}</span>
                    <span className="explore-meta">Ages {w.ages[0]}–{w.ages[1]} · <b>Lv {lv}</b></span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="explore-empty">New adventures for your age are on the way! Tap “{`Ages ${band[0]}–${band[1]}`}” to see them all.</p>}
      </div>
    </section>
  );
}
