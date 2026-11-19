import { type CSSProperties, useMemo, useState } from "react";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";
import { VOICE_LINES } from "../audio/voiceLines";
import { getCharacter, playableWorlds, registry, worldsByLibrary } from "../content/registry";
import type { Library, World } from "../content/types";
import { loadState } from "../services/storage";
import { Critter, hostOf } from "./critters";
import { type AgeRange } from "./planner";
import { setActiveStop } from "./store";

/** Worlds (or libraries) that suit a band (±1 year, like the planner's age window). */
export const fitsBand = (w: { ages: AgeRange }, band: AgeRange): boolean => w.ages[0] <= band[1] + 1 && w.ages[1] >= band[0] - 1;

/** A library's theme as CSS custom properties (`--lib-main`, `--lib-soft`, `--lib-deep`; defaults in daily.css). */
export const libraryStyle = (l: Library): CSSProperties => ({ "--lib-main": l.theme.main, "--lib-soft": l.theme.soft, "--lib-deep": l.theme.deep }) as CSSProperties;

const hostName = (l: Library) => getCharacter(l.host)?.name ?? l.host;
const pitchLine = (l: Library) => `lib.${l.id}.pitch`;

/**
 * Explore = the library shelves (D-029). Each live library is a shelf with its host, colour and kid title; its
 * worlds sit on a horizontally scrolling row (so 11 libraries × 10+ worlds stay one shelf tall each). Libraries
 * still being built appear last as quiet teaser tiles: you can hear what they're about, never open a game.
 * Default shows worlds for the child's age band; one button shows every age. Explore rounds count toward today's limit.
 */
export function Explore({ band }: { band: AgeRange }) {
  const { navigate } = useApp();
  const [allAges, setAllAges] = useState(false);
  const levels = loadState().progress.levels ?? {};
  const shelves = useMemo(
    () =>
      worldsByLibrary()
        .filter(({ library }) => library.status === "live")
        .map(({ library, worlds }) => ({ library, worlds: allAges ? worlds : worlds.filter((w) => fitsBand(w, band)) }))
        .filter((s) => s.worlds.length > 0),
    [allAges, band],
  );
  const teasers = useMemo(() => registry.libraries.filter((l) => l.status === "coming-soon" && (allAges || fitsBand(l, band))), [allAges, band]);
  const ageLabel = `Ages ${band[0]}–${band[1]}`;

  const play = (id: string) => {
    audio.play("whoosh");
    setActiveStop(null);
    navigate(`/play/${id}`);
  };
  const hear = (l: Library) => {
    audio.play("tap");
    if (VOICE_LINES[pitchLine(l)]) void audio.speak(pitchLine(l));
  };

  return (
    <section className="explore" data-testid="explore" data-total={playableWorlds().length} aria-label="Explore all adventures">
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
          {allAges ? "All ages" : ageLabel}
        </button>
      </div>
      <div className="explore-scroll">
        {shelves.map(({ library: l, worlds }) => (
          <section key={l.id} className="lib-shelf" style={libraryStyle(l)} data-testid={`shelf-${l.id}`} data-library={l.id} aria-labelledby={`shelf-${l.id}-title`}>
            <header className="lib-head">
              <button type="button" className="lib-host" data-testid={`shelf-hear-${l.id}`} aria-label={`Hear about ${l.kidTitle}`} onClick={() => hear(l)}>
                <span className="lib-host-art" aria-hidden="true"><Critter id={l.host} color={l.theme.main} /></span>
              </button>
              <div className="lib-titles">
                <h3 id={`shelf-${l.id}-title`}>{l.kidTitle}</h3>
                <p className="lib-pitch">{l.pitch}</p>
              </div>
            </header>
            <ul className="lib-row" role="list" aria-label={`${l.kidTitle} adventures`}>
              {worlds.map((w) => (
                <li key={w.id}>
                  <WorldCard w={w} level={(levels[w.id] ?? 0) + 1} library={l} onPlay={play} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {shelves.length === 0 && <p className="explore-empty">New adventures for your age are on the way! Tap “{ageLabel}” to see them all.</p>}
        {teasers.length > 0 && (
          <section className="lib-teasers" data-testid="explore-coming" aria-labelledby="explore-coming-title">
            <h3 id="explore-coming-title">Still being built</h3>
            <ul className="teaser-row" role="list">
              {teasers.map((l) => (
                <li key={l.id} className="lib-teaser" style={libraryStyle(l)} data-testid={`teaser-${l.id}`} data-status={l.status}>
                  <button type="button" className="teaser-btn" data-testid={`teaser-hear-${l.id}`} aria-label={`${l.kidTitle} with ${hostName(l)} is still being built. Hear about it`} onClick={() => hear(l)}>
                    <span className="teaser-host" aria-hidden="true"><Critter id={l.host} color={l.theme.main} /></span>
                    <span className="teaser-name" aria-hidden="true">{l.kidTitle}</span>
                    <span className="teaser-note" aria-hidden="true">with {hostName(l)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  );
}

function WorldCard({ w, level, library, onPlay }: { w: World; level: number; library: Library; onPlay: (id: string) => void }) {
  return (
    <button type="button" className="explore-card" data-testid={`explore-${w.id}`} data-library={library.id} aria-label={`${w.title}, in ${library.kidTitle}, ages ${w.ages[0]} to ${w.ages[1]}, level ${level}. Play`} onClick={() => onPlay(w.id)}>
      <span className="explore-critter" aria-hidden="true"><Critter id={hostOf(w)} color={library.theme.main} /></span>
      <span className="explore-name">{w.title}</span>
      <span className="explore-meta">Ages {w.ages[0]}–{w.ages[1]} · <b>Lv {level}</b></span>
    </button>
  );
}
