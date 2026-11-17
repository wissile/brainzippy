import { useEffect, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { Bobbo } from "../characters/Bobbo";
import { Gloop, Puff, Rumble } from "../characters/Crew";
import { DEFAULT_MONSTER, Monster } from "../characters/Monster";
import { SparkTree } from "../game/scenes";
import { loadState } from "../services/storage";
import { AudioButtons, NavButton, SpeechBubble } from "../ui/controls";
import { useApp } from "./AppContext";

/** Monster Island: each world hides a lost Brain Spark. Winning a round brings one back and levels the game up. */
const STOPS = [
  { id: "counting-adventure", name: "Bobbo's Breakfast", ages: "4–6", x: 20, y: 72, critter: "bobbo" },
  { id: "glow-cave-hops", name: "Glow Cave Hops", ages: "5–7", x: 26, y: 38, critter: "gloop" },
  { id: "sky-balloon-race", name: "Sky Balloon Race", ages: "6–8", x: 76, y: 30, critter: "puff" },
  { id: "cookie-kitchen", name: "Cookie Kitchen", ages: "7–9", x: 80, y: 70, critter: "rumble" },
] as const;

const Critter = ({ c }: { c: (typeof STOPS)[number]["critter"] }) =>
  c === "bobbo" ? <Bobbo state="idle" size="100%" /> : c === "gloop" ? <Gloop size="100%" /> : c === "puff" ? <Puff size="100%" /> : <Rumble size="100%" />;

export function MapScreen() {
  const { navigate, caption } = useApp();
  const st = loadState();
  const p = st.profile;
  const monster = p.monster ?? DEFAULT_MONSTER;
  const levels = st.progress.levels ?? {};
  const sparks = STOPS.reduce((n, s) => n + Math.min(4, levels[s.id] ?? 0), 0);
  const [going, setGoing] = useState<string | null>(null);
  const firstVisit = st.progress.roundsCompleted === 0;

  useEffect(() => {
    void audio.playMusic("island");
    const t = window.setTimeout(() => void audio.speak(firstVisit ? "map.start" : "map.back"), 450);
    return () => window.clearTimeout(t);
  }, [firstVisit]);

  const go = (id: string) => {
    audio.play("whoosh");
    setGoing(id);
    window.setTimeout(() => navigate(`/play/${id}`), 700);
  };
  const target = STOPS.find((s) => s.id === going) ?? STOPS[0];
  const portrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;

  return (
    <main className="map-screen" data-testid="map">
      <svg className="island" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FD3F7" /><stop offset="1" stopColor="#4FB3E8" /></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#sea)" />
        <g stroke="#fff" strokeWidth="6" fill="none" opacity="0.35">{[120, 520, 980, 1400].map((x, i) => <path key={x} className="wave" d={`M${x} ${150 + i * 180} q20 -12 40 0 t40 0`} />)}</g>
        <path d="M100 760 C40 560 160 300 420 230 C640 140 980 120 1220 220 C1460 300 1580 520 1500 700 C1420 860 1100 880 800 870 C500 860 180 880 100 760 Z" fill="#F7E3A8" />
        <path d="M140 740 C90 560 200 330 440 260 C650 175 970 160 1200 250 C1430 330 1530 530 1460 690 C1390 830 1090 845 800 835 C510 825 210 840 140 740 Z" fill="#8FD88A" />
        <path d="M320 640 C380 520 400 420 420 340 M420 340 C620 300 800 330 800 450 M800 450 C980 360 1120 280 1220 270 M800 450 C1000 520 1150 600 1280 630" fill="none" stroke="#FFF3C4" strokeWidth="24" strokeLinecap="round" strokeDasharray="2 38" />
        <g>{[[600, 700], [1050, 760], [560, 260]].map(([x, y]) => <g key={x}><rect x={x! - 8} y={y! - 10} width="16" height="60" rx="6" fill="#9A6234" /><circle cx={x} cy={y! - 30} r="46" fill="#4CB35E" /></g>)}</g>
      </svg>
      <div className="map-tree" aria-label={`${sparks} sparks brought back`} data-testid="spark-tree" data-sparks={sparks}>
        <SparkTree lit={sparks / 16} />
        <span className="spark-count">✦ {sparks} / 16</span>
      </div>
      <div className="map-top">
        <NavButton to="/" label="Home" />
        <div className="map-hello">
          <span className="mini-monster" aria-hidden="true"><Monster config={monster} size={52} label="" /></span>
          <span>{p.kidName ? `Hi, ${p.kidName}!` : "Monster Island"}</span>
        </div>
        <AudioButtons />
      </div>
      <div className="map-stops">
        {STOPS.map((s) => {
          const lv = (levels[s.id] ?? 0) + 1;
          return (
            <button key={s.id} type="button" className="stop open" style={{ left: `${s.x}%`, top: `${s.y}%` }} data-testid={`stop-${s.id}`} aria-label={`${s.name}, ages ${s.ages}, level ${lv}. Play`} onClick={() => go(s.id)}>
              <span className="stop-critter" aria-hidden="true"><Critter c={s.critter} /></span>
              <span className="stop-name">{s.name}</span>
              <span className="stop-meta">Ages {s.ages} · <b>Lv {lv}</b></span>
            </button>
          );
        })}
        <div
          className={`map-monster ${going ? "hop" : ""}`}
          // portrait: stand above the stop; landscape: beside it (never on top of a button)
          style={portrait ? { left: `${target.x}%`, top: `${target.y - 11}%` } : { left: `${target.x + 9}%`, top: `${target.y - 2}%` }}
          aria-hidden="true"
        >
          <Monster config={monster} state={going ? "celebrating" : "greeting"} size={110} label="" />
          {p.monsterName && <span className="nameplate small">{p.monsterName}</span>}
        </div>
      </div>
      <SpeechBubble text={caption} tail="down" className="map-caption" />
    </main>
  );
}
