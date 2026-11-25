import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import { VOICE_LINES } from "../../audio/voiceLines";
import { DEFAULT_MONSTER, Monster } from "../../characters/Monster";
import { Critter, hasCritterArt, hostOf } from "../../daily/critters";
import { setActiveStop } from "../../daily/store";
import { getCharacter } from "../../content/registry";
import { loadState } from "../../services/storage";
import type { LearningPath } from "../registry";
import { boatAt, childBand, currentPath, currentStop, preparePlay, setBoatAt, setPathPlay } from "../state";
import { useSpeakOnMount } from "../useSpeak";
import { artIdOf, spotsOf, stopWindow, stopsForAge, trailPoints, ISLAND_ASPECT } from "./data";
import { artUrl } from "./art";
import { useBoxSize } from "./hooks";
import "./islands.css";

/** Journey island (D-041): the chosen path's island. `todayLeft` = rounds the child can still play today. */
export function JourneyIsland({ todayLeft }: { todayLeft: number }) {
  const { navigate } = useApp();
  const path = currentPath();
  useEffect(() => {
    if (!path) navigate("/paths", { replace: true });
    else if (boatAt() !== path.id) setBoatAt(path.id); // arrived without a trip (e.g. after a path offer): the boat is here
  }, [path, navigate]);
  if (!path) return null;
  return <Island path={path} todayLeft={todayLeft} />;
}

function Island({ path, todayLeft }: { path: LearningPath; todayLeft: number }) {
  const { navigate } = useApp();
  const st = loadState();
  const monster = st.profile.monster ?? DEFAULT_MONSTER;
  const { world, index, level } = currentStop(path);
  const n = stopsForAge(childBand(st.ageBand));
  // stops behind the current one: only levels of this world the child really played on the path (no ticks for skipped ones)
  const played = st.paths.by[path.id]?.w === world.id ? (st.paths.by[path.id]?.n ?? 0) : 0;
  const stops = stopWindow(path, { index, level }, n, todayLeft, Math.min(2, played, level));
  const artId = artIdOf(path.id);
  const pts = trailPoints(artId, stops.length);
  const here = stops.findIndex((x) => x.state === "here");
  const atEnd = index === path.worlds.length - 1 && level >= world.maxLevel;
  const friendId = path.worlds.map((w) => hostOf(w)).find((h) => h !== path.host && hasCritterArt(h)) ?? null;
  const spots = spotsOf(artId);

  // stage: the island keeps its aspect; it never gets so small that stops (≥56px, ≥64px for the youngest) touch,
  // so on phones it scrolls sideways (and on short landscape phones down) and starts centred on the monster
  const wrap = useRef<HTMLDivElement>(null);
  const size = useBoxSize(wrap);
  const minGap = Math.min(...pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, (p.y - pts[i]!.y) / ISLAND_ASPECT)), 0.2);
  const want = n <= 7 ? 64 : 56; // 64 px up to age 8 (under-7s included), 56 px for 9+
  // ≥ 960 px: scripts/gen_islands.py checks the monster and the people against the island at that size (2 px per unit)
  const minW = Math.max(960, Math.ceil(want / 0.86 / minGap));
  const stageW = size.w ? Math.max(minW, Math.min(size.w, size.h * ISLAND_ASPECT)) : 0;
  const stageH = stageW / ISLAND_ASPECT;
  const stop = Math.round(Math.min(88, Math.max(want, minGap * stageW * 0.86)));
  // centre the glowing stop once the stage is laid out (it can report 0×0 for a frame after mounting), and again on
  // size changes, until the child scrolls or taps themselves
  const userMoved = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const centreRef = useRef<() => void>(() => {});
  centreRef.current = () => {
    const el = wrap.current;
    const p = pts[here];
    if (!el || !p || !stageW || userMoved.current) return;
    el.scrollLeft = Math.max(0, p.x * stageW - el.clientWidth / 2);
    el.scrollTop = Math.max(0, p.y * stageH - el.clientHeight / 2);
  };
  useLayoutEffect(() => centreRef.current(), [stageW, size.w, size.h]);
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => centreRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const stop = () => (userMoved.current = true);
    // keyboard focus: always bring the focused stop or character fully into view (WCAG 2.4.11)
    const onFocus = (e: FocusEvent) => {
      userMoved.current = true;
      const t = e.target as HTMLElement;
      const b = t.getBoundingClientRect(), w = el.getBoundingClientRect();
      if (b.left < w.left || b.right > w.right) el.scrollLeft += b.left + b.width / 2 - (w.left + w.width / 2);
      if (b.top < w.top || b.bottom > w.bottom) el.scrollTop += b.top + b.height / 2 - (w.top + w.height / 2);
    };
    el.addEventListener("pointerdown", stop);
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("focusin", onFocus);
    return () => { el.removeEventListener("pointerdown", stop); el.removeEventListener("wheel", stop); el.removeEventListener("focusin", onFocus); };
  }, []);

  const moved = useRef(false);
  useSpeakOnMount(() => [{ id: path.line, vars: { host: path.hostName } }, { id: atEnd ? "path.view.end" : "path.view.hello" }], () => moved.current);
  useLayoutEffect(() => document.getElementById("path-title")?.focus({ preventScroll: true }), []);
  const [hop, setHop] = useState<string | null>(null);

  const speak = (id: string, vars?: Record<string, string>) => {
    moved.current = true;
    if (VOICE_LINES[id]) void audio.speak(id, vars, { interrupt: true });
  };
  const play = () => {
    moved.current = true;
    audio.play("whoosh");
    const id = preparePlay(path);
    setActiveStop(null); // like Explore: the round lights the first matching stop on today's trail
    setPathPlay(id);
    navigate(`/play/${id}`);
  };
  const replay = (worldId: string) => {
    moved.current = true;
    audio.play("whoosh");
    setActiveStop(null);
    setPathPlay(null); // replays that game at its stored level (the game's own level, not the stop's); "back" returns here via /map
    navigate(`/play/${worldId}`);
  };
  const talk = (who: string, line: string, vars?: Record<string, string>) => {
    audio.play("tap");
    setHop(who);
    window.setTimeout(() => setHop((h) => (h === who ? null : h)), 700);
    speak(line, vars);
  };
  const hear = () => {
    audio.play("tap");
    speak(path.line, { host: path.hostName });
  };

  const trail = pts.map((p) => `${(p.x * 480).toFixed(1)},${(p.y * 300).toFixed(1)}`).join(" ");
  const hostSpot = spots[0]!, friendSpot = spots[1]!;
  const friendName = friendId ? (getCharacter(friendId)?.name ?? friendId) : "";

  return (
    <section className="journey" style={{ ["--lib-main" as string]: path.library.theme.main, ["--lib-deep" as string]: path.library.theme.deep }} data-testid="path-view" data-path={path.id} data-world={world.id} data-level={level} aria-labelledby="path-title">
      <header className="journey-plaque">
        <button type="button" className="journey-hear" data-testid="path-hear" aria-label={`Hear: ${path.title}`} onClick={hear}>
          <span aria-hidden="true"><Critter id={path.host} color={path.library.theme.main} /></span>
        </button>
        <div className="journey-plaque-text">
          <span className="journey-island-name">{path.library.kidTitle}</span>
          <h2 id="path-title" data-testid="path-title" tabIndex={-1}>{path.title}</h2>
        </div>
      </header>
      <div className="journey-wrap" ref={wrap}>
        <div className="journey-stage" ref={stage} style={{ width: stageW, height: stageH, ["--stop" as string]: `${stop}px` }}>
          <img className="journey-art" src={artUrl(artId)} alt="" draggable={false} />
          <svg className="journey-trail" viewBox="0 0 480 300" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={trail} />
          </svg>
          <ol className="journey-stops" aria-label={`${path.library.kidTitle}: ${stops.length} stops`}>
            {stops.map((s, i) => {
              const p = pts[i]!;
              const label = `Stop ${i + 1}: ${s.world.title}, level ${s.level + 1}${s.last ? ", the last stop" : ""}`;
              const common = { left: `${p.x * 100}%`, top: `${p.y * 100}%` };
              return (
                <li key={`${s.world.id}-${s.level}`} className={`journey-stop ${s.state} ${s.last ? "last" : ""}`} style={common} data-state={s.state} data-world={s.world.id} data-level={s.level} aria-current={s.state === "here" ? "step" : undefined}>
                  <button
                    type="button"
                    data-testid={s.state === "here" ? "path-play" : `path-stop-${i}`}
                    data-index={i}
                    aria-label={s.state === "here" ? `Play ${s.world.title}, level ${s.level + 1}` : s.state === "done" ? `Stop ${i + 1}: ${s.world.title}, done. Play this game again` : `${label}, ${s.state === "today" ? "coming up today" : "another day"}`}
                    onClick={() => (s.state === "here" ? play() : s.state === "done" ? replay(s.world.id) : speak(s.state === "today" ? "island.stop.wait" : "island.stop.later"))}
                  >
                    <span className="journey-stop-critter" aria-hidden="true"><Critter id={hostOf(s.world)} color={path.library.theme.main} /></span>
                  </button>
                  {s.state === "done" && (
                    <span className="journey-badge done" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                  {s.last && s.state !== "done" && (
                    <span className="journey-badge star" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M12 2.5 L14.8 8.6 L21.4 9.3 L16.4 13.7 L17.9 20.3 L12 16.9 L6.1 20.3 L7.6 13.7 L2.6 9.3 L9.2 8.6 Z" fill="currentColor" /></svg>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {here >= 0 && (
            <span className="journey-monster" style={{ left: `${pts[here]!.x * 100}%`, top: `${pts[here]!.y * 100}%` }} aria-hidden="true" data-testid="journey-monster">
              <Monster config={monster} state="greeting" size={92} label="" />
            </span>
          )}
          {/* zero-size anchors at the spot: the button's real box is where it is drawn, so focus scrolls it fully into view */}
          <span className="journey-person-anchor" style={{ left: `${hostSpot.x * 100}%`, top: `${hostSpot.y * 100}%` }}>
            <button type="button" className={`journey-person ${hop === path.host ? "hop" : ""}`} data-testid="journey-host" aria-label={`Talk to ${path.hostName}`} onClick={() => talk(path.host, `lib.${path.id}.pitch`)}>
              <span className="journey-person-art" aria-hidden="true"><Critter id={path.host} color={path.library.theme.main} /></span>
              <span className="journey-person-name" aria-hidden="true">{path.hostName}</span>
            </button>
          </span>
          {friendId && (
            <span className="journey-person-anchor" style={{ left: `${friendSpot.x * 100}%`, top: `${friendSpot.y * 100}%` }}>
              <button type="button" className={`journey-person ${hop === friendId ? "hop" : ""}`} data-testid="journey-friend" aria-label={`Talk to ${friendName}`} onClick={() => talk(friendId, "island.friend", { name: friendName })}>
                <span className="journey-person-art" aria-hidden="true"><Critter id={friendId} /></span>
                <span className="journey-person-name" aria-hidden="true">{friendName}</span>
              </button>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
