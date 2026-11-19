import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { DEFAULT_MONSTER, Monster } from "../characters/Monster";
import { getWorld } from "../content/registry";
import { Critter, hostOf } from "../daily/critters";
import { EndOfDay } from "../daily/EndOfDay";
import { Explore } from "../daily/Explore";
import { type DailyStatus, bandOf, dailyStatus, setActiveStop } from "../daily/store";
import { useSpeakWhenReady } from "../daily/useSpeakWhenReady";
import { useToday } from "../daily/useToday";
import type { DailyPlanStop } from "../engine/progressSchema";
import { loadState } from "../services/storage";
import { AudioButtons, SpeechBubble } from "../ui/controls";
import { IconLock } from "../ui/icons";
import { useApp } from "./AppContext";
import "../daily/daily.css";

/**
 * Home: "Today's Adventure" on Monster Island. Today's plan (src/daily/planner.ts) is a trail of glowing stops;
 * the child's monster walks to the next one and each completed round lights a stop ("3 of 5"). Explore shows the
 * library shelves (src/daily/Explore.tsx, D-028). When today's rounds are done, the end-of-day scene replaces the
 * island until tomorrow.
 */
export function MapScreen({ view = "today" }: { view?: "today" | "explore" }) {
  const day = useToday();
  const status = dailyStatus(day);
  if (status.locked) return <EndOfDay key={day} />;
  return <Island key={day} status={status} view={view} />;
}

const KIND_LABEL: Record<DailyPlanStop["k"], string> = {
  review: "Remember this one",
  new: "Something new",
  practice: "Practice",
  stretch: "Star challenge",
  pick: "You choose",
};

/** Stop positions (% of the island) along a winding trail: left→right in landscape, top→bottom in portrait. */
export function trailPoints(n: number, portrait: boolean): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    // portrait: a serpentine over three columns, so neighbours never overlap even with 10 stops
    return portrait
      ? { x: [26, 50, 74, 50][i % 4]!, y: 27 + (n > 5 ? 59 : 46) * t } // short trails stay clear of the caption
      : { x: 9 + 82 * t, y: 58 + 18 * Math.sin(i * 1.05 + 0.5) };
  });
}

function usePortrait() {
  const get = () => typeof window !== "undefined" && window.innerHeight > window.innerWidth;
  const [portrait, setPortrait] = useState(get);
  useEffect(() => {
    const on = () => setPortrait(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return portrait;
}

function SparkIcon() {
  return (
    <svg viewBox="-20 -20 40 40" aria-hidden="true" className="spark-icon">
      <circle r="17" fill="#FFE27A" opacity="0.45" />
      <path d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function KindBadge({ kind, done }: { kind: DailyPlanStop["k"]; done: boolean }) {
  if (done)
    return (
      <span className="stop-badge done" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    );
  if (kind === "new") return <span className="stop-badge new" aria-hidden="true">NEW</span>;
  if (kind === "stretch")
    return (
      <span className="stop-badge stretch" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 2.5 L14.8 8.6 L21.4 9.3 L16.4 13.7 L17.9 20.3 L12 16.9 L6.1 20.3 L7.6 13.7 L2.6 9.3 L9.2 8.6 Z" fill="currentColor" /></svg>
      </span>
    );
  if (kind === "review")
    return (
      <span className="stop-badge review" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M19 12 A7 7 0 1 1 15.5 6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" /><path d="M13.5 2.8 L17.2 6.2 L13.4 8.8" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    );
  return null;
}

function Island({ status, view }: { status: DailyStatus; view: "today" | "explore" }) {
  const { navigate, caption } = useApp();
  const st = loadState();
  const p = st.profile;
  const monster = p.monster ?? DEFAULT_MONSTER;
  const levels = st.progress.levels ?? {};
  const portrait = usePortrait();
  const { plan, lit, next, done, limit, learned } = status;
  const stops = plan.stops;
  const pts = trailPoints(stops.length, portrait);
  const [going, setGoing] = useState<number | null>(null);
  // the monster walks from the last lit stop to the next one
  const from = Math.max(0, next - 1);
  const [at, setAt] = useState(done > 0 && next > 0 ? from : Math.max(0, next));
  const firstEver = st.progress.roundsCompleted === 0 && done === 0;
  const goingRef = useRef(false);

  useEffect(() => {
    void audio.playMusic("island");
    const walk = window.setTimeout(() => setAt(going ?? Math.max(0, next)), 380);
    return () => window.clearTimeout(walk);
  }, [next, going]);

  // welcome line; queued until the first tap if audio is still locked (full page load), skipped if that tap opens a stop
  useSpeakWhenReady(
    () => [
      view === "explore" ? "daily.explore.hello"
      : firstEver ? "daily.map.first"
      : done === 0 ? "daily.map.hello"
      : stops[next]?.k === "pick" ? "daily.map.pick"
      : limit - done === 1 ? "daily.map.last"
      : "daily.map.next",
    ],
    () => goingRef.current,
  );

  const go = (index: number, world: string) => {
    audio.play("whoosh");
    setActiveStop(index, world);
    goingRef.current = true;
    setGoing(index);
    window.setTimeout(() => navigate(`/play/${world}`), 700);
  };

  const target = pts[at] ?? { x: 50, y: 50 };
  const monsterPos = portrait
    ? { left: `${target.x > 50 ? 24 : target.x < 50 ? 76 : 84}%`, top: `${target.y + 4}%` } // the free side of the serpentine
    : { left: `${target.x}%`, top: `${target.y - 11}%` };
  const pathD = pts.map((q, i) => (i === 0 ? `M${q.x} ${q.y}` : `L${q.x} ${q.y}`)).join(" ");
  const litUpTo = lit.lastIndexOf(true);
  const litD = pts.slice(0, Math.max(0, litUpTo) + 1).map((q, i) => (i === 0 ? `M${q.x} ${q.y}` : `L${q.x} ${q.y}`)).join(" ");

  return (
    <main className={`map-screen daily-map view-${view}`} data-testid="map" data-day={status.day}>
      <svg className="island" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FD3F7" /><stop offset="1" stopColor="#4FB3E8" /></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#sea)" />
        <g stroke="#fff" strokeWidth="6" fill="none" opacity="0.35">{[120, 520, 980, 1400].map((x, i) => <path key={x} className="wave" d={`M${x} ${150 + i * 180} q20 -12 40 0 t40 0`} />)}</g>
        <path d="M100 760 C40 560 160 300 420 230 C640 140 980 120 1220 220 C1460 300 1580 520 1500 700 C1420 860 1100 880 800 870 C500 860 180 880 100 760 Z" fill="#F7E3A8" />
        <path d="M140 740 C90 560 200 330 440 260 C650 175 970 160 1200 250 C1430 330 1530 530 1460 690 C1390 830 1090 845 800 835 C510 825 210 840 140 740 Z" fill="#8FD88A" />
        <g>{[[600, 700], [1050, 760], [560, 260], [1300, 330]].map(([x, y]) => <g key={x}><rect x={x! - 8} y={y! - 10} width="16" height="60" rx="6" fill="#9A6234" /><circle cx={x} cy={y! - 30} r="46" fill="#4CB35E" /></g>)}</g>
      </svg>

      <div className="map-top daily-top">
        {/* The map is the child's home; this corner is the way in for grown-ups (the page itself is parent-gated). */}
        <button type="button" className="icon-btn" data-testid="map-grown-ups" aria-label="For grown-ups" onClick={() => navigate("/grown-ups")}>
          <IconLock />
        </button>
        <div className="map-hello">
          <span className="mini-monster" aria-hidden="true"><Monster config={monster} size={52} label="" /></span>
          <span className="map-hello-name">{p.kidName ? `Hi, ${p.kidName}!` : "Monster Island"}</span>
        </div>
        <div className="daily-chips">
          <div className="today-progress" data-testid="today-progress" data-done={done} data-limit={limit} role="img" aria-label={`Today: ${done} of ${limit} games played`}>
            <span className="today-dots" aria-hidden="true">{Array.from({ length: limit }, (_, i) => <i key={i} className={i < done ? "on" : ""} />)}</span>
            <b>{done} of {limit}</b>
          </div>
          {learned > 0 && (
            <div className="days-learning" data-testid="days-learning" data-days={learned} role="img" aria-label={`${learned} ${learned === 1 ? "day" : "days"} learning`}>
              <SparkIcon /><b>{learned}</b><span className="days-word">{learned === 1 ? "day" : "days"}</span>
            </div>
          )}
        </div>
        <AudioButtons />
      </div>

      <nav className="view-tabs" aria-label="Choose a view">
        <button type="button" className={view === "today" ? "on" : ""} aria-pressed={view === "today"} data-testid="view-today" aria-label="Today's adventure" onClick={() => view !== "today" && navigate("/map")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19 C8 19 6 12 11 12 C16 12 14 5 20 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 4.5" /><circle cx="4" cy="19" r="2.6" fill="currentColor" /><circle cx="20" cy="5" r="2.6" fill="currentColor" /></svg>
          <span>Today</span>
        </button>
        <button type="button" className={view === "explore" ? "on" : ""} aria-pressed={view === "explore"} data-testid="view-explore" aria-label="Explore all adventures" onClick={() => view !== "explore" && navigate("/explore")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="currentColor" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="currentColor" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor" /></svg>
          <span>Explore</span>
        </button>
      </nav>

      {view === "explore" ? (
        <Explore band={bandOf(st.ageBand)} />
      ) : (
        <div className={`map-stops trail ${stops.length > (portrait ? 5 : 7) ? "crowded" : ""}`} data-testid="trail" data-stops={stops.length}>
          <svg className="trail-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={pathD} className="trail-line" vectorEffect="non-scaling-stroke" />
            {litUpTo >= 1 && <path d={litD} className="trail-line lit" vectorEffect="non-scaling-stroke" />}
          </svg>
          {stops.map((s, i) => {
            const pt = pts[i]!;
            const isNext = i === next;
            const state = lit[i] ? "done" : isNext ? "next" : "upcoming";
            const options = s.k === "pick" && s.o && s.o.length > 1 ? s.o : [s.w];
            return (
              <div key={i} className={`trail-stop ${state} kind-${s.k} ${options.length > 1 ? "pick" : ""}`} style={{ left: `${pt.x}%`, top: `${pt.y}%` }} data-index={i} data-state={state} data-kind={s.k}>
                <div className="trail-buttons">
                  {options.map((w) => {
                    const world = getWorld(w);
                    const lv = (levels[w] ?? 0) + 1;
                    return (
                      <button
                        key={w}
                        type="button"
                        className="stop-btn"
                        data-testid={`stop-${w}`}
                        data-index={i}
                        aria-label={`Stop ${i + 1} of ${stops.length}: ${world?.title ?? w}, level ${lv}. ${KIND_LABEL[s.k]}. ${lit[i] ? "Done! Play again" : "Play"}`}
                        onClick={() => go(i, w)}
                      >
                        <span className="stop-critter" aria-hidden="true"><Critter id={hostOf(world)} /></span>
                      </button>
                    );
                  })}
                </div>
                <KindBadge kind={s.k} done={lit[i]!} />
                {isNext && <span className="stop-name" aria-hidden="true">{options.length > 1 ? "You choose!" : (getWorld(s.w)?.title ?? s.w)}</span>}
              </div>
            );
          })}
          <div className={`map-monster daily-monster ${going !== null ? "hop" : ""}`} style={monsterPos} aria-hidden="true" data-testid="trail-monster" data-at={at}>
            <Monster config={monster} state={going !== null ? "celebrating" : "greeting"} size={100} label="" />
            {p.monsterName && <span className="nameplate small">{p.monsterName}</span>}
          </div>
        </div>
      )}
      <SpeechBubble text={caption} tail="down" className="map-caption" />
    </main>
  );
}
