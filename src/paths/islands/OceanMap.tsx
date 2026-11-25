import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import { VOICE_LINES } from "../../audio/voiceLines";
import { DEFAULT_MONSTER, Monster } from "../../characters/Monster";
import { Critter } from "../../daily/critters";
import { loadState } from "../../services/storage";
import { visiblePaths } from "../flags";
import { allPaths, type LearningPath } from "../registry";
import { boatAt, childBand, hasSailedTo, pickPath, setBoatAt } from "../state";
import { useSpeakOnMount } from "../useSpeak";
import { Boat } from "./Boat";
import { type Box, type Pt, artIdOf, dockOf, oceanLayout, sailPath, stopsForAge } from "./data";
import { artUrl, fogUrl, homeUrl } from "./art";
import { useBoxSize } from "./hooks";
import "./islands.css";

type Item = { kind: "path"; id: string; path: LearningPath } | { kind: "soon"; id: string; path: LearningPath };
type Phase = { at: "idle" } | { at: "sail" | "zoom"; to: string; d: string; dist: number; ms: number };

const pitchLine = (id: string) => `lib.${id}.pitch`;
const HOME = "home";

/**
 * The ocean map (D-041): one island per visible path, Monster Island (home, today's adventure) in the middle, and
 * the next path in fog. Tap an island to hear its journey; Sail! takes the monster's boat there (full ride the first
 * time, a short hop after, none with reduced motion; Skip ends it) and zooms in to that island.
 */
export function OceanMap() {
  const { navigate, reducedMotion: reduce } = useApp();
  const st = loadState();
  const monster = st.profile.monster ?? DEFAULT_MONSTER;
  const paths = visiblePaths();
  const soon = allPaths().find((p) => p.library.path?.soon && !paths.some((q) => q.id === p.id));
  const items: Item[] = [...paths.map((path) => ({ kind: "path" as const, id: path.id, path })), ...(soon ? [{ kind: "soon" as const, id: soon.id, path: soon }] : [])];
  const at = boatAt(paths);
  const nStops = stopsForAge(childBand(st.ageBand));

  const wrap = useRef<HTMLDivElement>(null);
  const size = useBoxSize(wrap);
  const portrait = size.h > size.w * 1.05;
  const layout = oceanLayout(items.length, portrait);
  const baseH = portrait ? 1600 : 900;
  const s = size.w ? (layout.stage.h > baseH ? size.w / layout.stage.w : Math.min(size.w / layout.stage.w, size.h / layout.stage.h)) : 0;
  const stageW = layout.stage.w * s, stageH = layout.stage.h * s;
  const off = { x: Math.max(0, (size.w - stageW) / 2), y: Math.max(0, (size.h - stageH) / 2) };
  const px = (b: Box) => ({ left: b.x * s, top: b.y * s, width: b.w * s, height: b.h * s });
  const boxOf = (id: string): Box => (id === HOME ? layout.home : layout.islands[items.findIndex((i) => i.id === id)] ?? layout.home);
  const dock = (id: string): Pt => {
    const d = dockOf(boxOf(id), id === HOME);
    return { x: d.x * s, y: d.y * s };
  };

  const [sel, setSel] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const moved = useRef(false);
  const timers = useRef<number[]>([]);
  const lastIsland = useRef<string | null>(null);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useSpeakOnMount(() => [{ id: "ocean.hello" }], () => moved.current);

  const item = items.find((i) => i.id === sel) ?? null;
  const say = (lines: { id: string; vars?: Record<string, string> }[]) => {
    void (async () => {
      for (const [k, l] of lines.entries()) {
        if (!VOICE_LINES[l.id]) continue;
        await audio.speak(l.id, l.vars, { interrupt: k === 0 });
      }
    })();
  };
  const choose = (id: string) => {
    if (phase.at !== "idle") return;
    moved.current = true;
    audio.play("tap");
    lastIsland.current = id;
    setSel(id);
    const it = items.find((i) => i.id === id);
    if (id === HOME) say([{ id: "ocean.home" }]);
    else if (it?.kind === "soon") say([{ id: "ocean.soon" }]);
    else if (it) say([{ id: it.path.line, vars: { host: it.path.hostName } }, { id: pitchLine(it.id) }]);
  };
  const close = () => {
    setSel(null);
    const back = lastIsland.current;
    window.setTimeout(() => document.querySelector<HTMLElement>(`[data-island="${back}"]`)?.focus({ preventScroll: true }), 0);
  };

  const arrive = (to: string) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (to === HOME) {
      setBoatAt(HOME);
      navigate("/map");
      return;
    }
    const it = items.find((i) => i.id === to);
    if (!it || it.kind !== "path") return;
    pickPath(it.path);
    setBoatAt(to);
    navigate("/path");
  };
  const sail = () => {
    if (!sel || phase.at !== "idle") return;
    const to = sel;
    setSel(null);
    audio.play("whoosh");
    if (reduce || to === at) {
      arrive(to);
      return;
    }
    const ms = hasSailedTo(to) ? 1200 : 2400;
    setPhase({ at: "sail", to, d: sailPath(dock(at), dock(to)), dist: 0, ms });
    const t1 = window.setTimeout(() => setPhase((p) => (p.at === "sail" ? { ...p, dist: 100 } : p)), 40);
    const t2 = window.setTimeout(() => setPhase((p) => (p.at === "sail" ? { ...p, at: "zoom" } : p)), ms + 120);
    const t3 = window.setTimeout(() => arrive(to), ms + 120 + 750);
    timers.current.push(t1, t2, t3);
  };
  const skip = () => {
    if (phase.at !== "idle") arrive(phase.to);
  };

  // Escape closes the card; focus moves into it when it opens
  useEffect(() => {
    if (!sel) return;
    document.querySelector<HTMLElement>('[data-testid="path-go"], [data-testid="ocean-card-close"]')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    document.getElementById("ocean-title")?.focus({ preventScroll: true });
  }, []);

  // zoom: move the target island to the middle of the view and scale it up
  let zoom: React.CSSProperties = {};
  if (phase.at === "zoom") {
    const b = px(boxOf(phase.to));
    const k = Math.min(3.2, (size.w * 0.86) / b.width);
    const scrollY = wrap.current?.scrollTop ?? 0;
    const tx = size.w / 2 - off.x - (b.left + b.width / 2) * k;
    const ty = size.h / 2 + scrollY - off.y - (b.top + b.height / 2) * k;
    zoom = { transform: `translate(${tx}px, ${ty}px) scale(${k})`, transition: "transform 0.75s cubic-bezier(.5,0,.3,1), opacity 0.75s", opacity: 0.9 };
  }
  const moving = phase.at !== "idle";
  const boatW = Math.max(72, Math.min(124, 150 * s));
  const boatStyle = { width: boatW, height: boatW * 0.83 };
  const docked = dock(at);
  const selBox = sel ? px(boxOf(sel)) : null;
  const cardSide = portrait ? "bottom" : selBox && off.x + selBox.left + selBox.width / 2 < size.w / 2 ? "right" : "left";
  const here = (id: string) => at === id;

  return (
    <section className={`ocean ${moving ? "is-moving" : ""}`} data-testid="path-picker" data-boat={at} aria-labelledby="ocean-title">
      <h2 id="ocean-title" className="sr-only" tabIndex={-1}>Choose an island</h2>
      <div className="ocean-wrap" ref={wrap}>
        <div className="ocean-stage" style={{ width: stageW, height: stageH, marginLeft: off.x, marginTop: off.y, ...zoom }} inert={moving || undefined}>
          <button
            type="button"
            className={`ocean-island ocean-home ${sel && sel !== HOME ? "dim" : ""} ${sel === HOME ? "on" : ""}`}
            style={px(layout.home)}
            data-island={HOME}
            data-testid="ocean-home"
            aria-pressed={sel === HOME}
            aria-label={`Monster Island: today's adventure${here(HOME) ? ", you are here" : ""}. Hear it and choose`}
            onClick={() => choose(HOME)}
          >
            <img src={homeUrl} alt="" draggable={false} />
            <span className="ocean-plaque small" aria-hidden="true"><b>Monster Island</b></span>
          </button>
          {items.map((it, i) => {
            const b = layout.islands[i]!;
            const lib = it.path.library;
            const isSoon = it.kind === "soon";
            return (
              <button
                key={it.id}
                type="button"
                className={`ocean-island ${isSoon ? "soon" : ""} ${sel && sel !== it.id ? "dim" : ""} ${sel === it.id ? "on" : ""}`}
                style={px(b)}
                data-island={it.id}
                data-testid={`path-card-${it.id}`}
                aria-pressed={sel === it.id}
                aria-label={isSoon ? `${lib.kidTitle}: coming soon` : `${lib.kidTitle}: ${it.path.title}${here(it.id) ? ", you are here" : ""}. Hear it and choose`}
                onClick={() => choose(it.id)}
              >
                <img src={artUrl(artIdOf(it.id))} alt="" draggable={false} />
                {isSoon && <img className="ocean-fog" src={fogUrl} alt="" draggable={false} />}
                <span className="ocean-plaque" aria-hidden="true">
                  {!isSoon && <span className="ocean-plaque-host"><Critter id={it.path.host} color={lib.theme.main} /></span>}
                  <span className="ocean-plaque-text">
                    <b>{lib.kidTitle}</b>
                    <small style={{ color: lib.theme.deep }}>{isSoon ? "Coming soon" : it.path.title}</small>
                  </span>
                </span>
                {here(it.id) && <span className="ocean-here" aria-hidden="true">You are here</span>}
              </button>
            );
          })}
          {!moving && (
            <span className="ocean-boat docked" style={{ ...boatStyle, left: docked.x - boatW / 2, top: docked.y - (boatW * 0.83) / 2 }} data-testid="ocean-boat">
              <span className="boat-bob"><Boat monster={monster} /></span>
            </span>
          )}
          {moving && (
            <span
              className="ocean-boat sailing"
              data-testid="ocean-boat-sailing"
              style={{ ...boatStyle, offsetPath: `path('${phase.d}')`, offsetDistance: `${phase.dist}%`, transition: phase.dist ? `offset-distance ${phase.ms}ms cubic-bezier(.45,.05,.35,1)` : "none" }}
            >
              <span className="boat-bob"><Boat monster={monster} /></span>
            </span>
          )}
        </div>
      </div>

      {item || sel === HOME ? (
        <div className={`ocean-card side-${cardSide}`} role="dialog" aria-labelledby="ocean-card-title" data-testid="ocean-card" data-island={sel}>
          {sel === HOME ? (
            <>
              <div className="ocean-card-head">
                <span className="ocean-card-host" aria-hidden="true"><Monster config={monster} size={96} label="" /></span>
                <div><h3 id="ocean-card-title">Monster Island</h3><p className="ocean-card-journey">Today's adventure</p></div>
              </div>
              <p className="ocean-card-blurb">A mix of games picked for you today.</p>
              <CardButtons go={sail} close={close} ashore={here(HOME)} />
            </>
          ) : item!.kind === "soon" ? (
            <>
              <div className="ocean-card-head">
                <div><h3 id="ocean-card-title">{item!.path.library.kidTitle}</h3><p className="ocean-card-journey">Coming soon</p></div>
              </div>
              <p className="ocean-card-blurb">This island is still being built. Come back soon!</p>
              <div className="ocean-card-actions">
                <button type="button" className="ocean-btn" data-testid="ocean-card-close" onClick={close}>OK</button>
              </div>
            </>
          ) : (
            <>
              <div className="ocean-card-head">
                <span className="ocean-card-host" aria-hidden="true"><Critter id={item!.path.host} color={item!.path.library.theme.main} /></span>
                <div>
                  <h3 id="ocean-card-title">{item!.path.library.kidTitle}</h3>
                  <p className="ocean-card-journey" style={{ color: item!.path.library.theme.deep }}>{item!.path.title}</p>
                </div>
              </div>
              <p className="ocean-card-blurb">{item!.path.library.pitch}</p>
              <p className="ocean-card-chips"><span data-testid="ocean-card-stops">{nStops} stops for you</span></p>
              <CardButtons go={sail} close={close} ashore={here(item!.id)} />
            </>
          )}
        </div>
      ) : null}

      {moving && (
        <button type="button" className="ocean-skip ocean-btn" data-testid="ocean-skip" onClick={skip}>Skip</button>
      )}
    </section>
  );
}

function CardButtons({ go, close, ashore }: { go: () => void; close: () => void; ashore: boolean }) {
  return (
    <div className="ocean-card-actions">
      <button type="button" className="ocean-btn primary" data-testid="path-go" onClick={go}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M12 4l6 9h-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 16h18l-2.5 4h-13z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /></svg>
        <span>{ashore ? "Go ashore" : "Sail!"}</span>
      </button>
      <button type="button" className="ocean-btn" data-testid="ocean-card-close" onClick={close}>Not now</button>
    </div>
  );
}
