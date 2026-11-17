import { useEffect, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { Bobbo } from "../characters/Bobbo";
import { Gloop, Hoot, Zuzu } from "../characters/Crew";
import { DEFAULT_MONSTER, Monster } from "../characters/Monster";
import { loadState } from "../services/storage";
import { NavButton, SoundButton, SpeechBubble } from "../ui/controls";
import { IconLock } from "../ui/icons";
import { useApp } from "./AppContext";

/** Monster Island: the child's monster travels between game stops. Stop 1 (Counting Meadow) is open. */
const STOPS = [
  { id: "counting-adventure", name: "Counting Meadow", x: 18, y: 70, open: true, critter: "bobbo" },
  { id: "letters", name: "Letter Hills", x: 42, y: 44, open: false, critter: "zuzu" },
  { id: "shapes", name: "Shape Lagoon", x: 66, y: 66, open: false, critter: "gloop" },
  { id: "stories", name: "Story Tree", x: 86, y: 34, open: false, critter: "hoot" },
] as const;

export function MapScreen() {
  const { navigate, caption } = useApp();
  const st = loadState();
  const p = st.profile;
  const monster = p.monster ?? DEFAULT_MONSTER;
  const [hopping, setHopping] = useState(false);
  const firstVisit = st.progress.roundsCompleted === 0;

  useEffect(() => {
    const t = window.setTimeout(() => void audio.speak(firstVisit ? "map.start" : "map.back"), 450);
    return () => window.clearTimeout(t);
  }, [firstVisit]);

  const go = (stop: (typeof STOPS)[number]) => {
    if (!stop.open) {
      audio.play("retry", { gain: 0.5 });
      void audio.speak("map.locked");
      return;
    }
    audio.play("whoosh");
    setHopping(true);
    window.setTimeout(() => navigate(`/play/${stop.id}`), 650);
  };

  return (
    <main className="map-screen" data-testid="map">
      <svg className="island" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FD3F7" /><stop offset="1" stopColor="#4FB3E8" /></linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#sea)" />
        <g fill="#fff" opacity="0.35">{[120, 520, 980, 1400].map((x, i) => <path key={x} d={`M${x} ${160 + i * 170} q20 -12 40 0 t40 0`} stroke="#fff" strokeWidth="6" fill="none" />)}</g>
        <path d="M120 760 C60 600 160 420 360 380 C520 250 760 180 980 260 C1200 160 1520 220 1520 420 C1560 600 1400 800 1120 820 C860 880 520 860 300 840 C200 830 140 800 120 760 Z" fill="#F7E3A8" />
        <path d="M150 740 C100 600 190 440 370 400 C530 280 760 210 975 290 C1190 200 1490 250 1490 430 C1520 590 1380 770 1110 790 C860 845 530 830 310 812 C220 805 170 780 150 740 Z" fill="#8FD88A" />
        <path d="M290 630 C420 520 560 460 670 400 C800 330 900 560 1060 590 C1200 610 1280 420 1380 310" fill="none" stroke="#FFF3C4" strokeWidth="26" strokeLinecap="round" strokeDasharray="2 40" />
        <g>{[[1220, 640], [520, 700], [880, 420]].map(([x, y]) => <g key={x}><rect x={x! - 8} y={y! - 10} width="16" height="60" rx="6" fill="#9A6234" /><circle cx={x} cy={y! - 30} r="48" fill="#4CB35E" /></g>)}</g>
      </svg>
      <div className="map-top">
        <NavButton to="/" label="Home" />
        <div className="map-hello">
          <span className="mini-monster" aria-hidden="true"><Monster config={monster} size={52} label="" /></span>
          <span>{p.kidName ? `Hi, ${p.kidName}!` : "Monster Island"}</span>
        </div>
        <SoundButton />
      </div>
      <div className="map-stops">
        {STOPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`stop ${s.open ? "open" : "locked"}`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            data-testid={`stop-${s.id}`}
            aria-label={s.open ? `${s.name}. Play` : `${s.name}. Coming soon`}
            onClick={() => go(s)}
          >
            <span className="stop-critter" aria-hidden="true">
              {s.critter === "bobbo" ? <Bobbo state="idle" size={84} /> : s.critter === "zuzu" ? <Zuzu size={74} /> : s.critter === "gloop" ? <Gloop size={74} /> : <Hoot size={74} />}
            </span>
            <span className="stop-name">{s.name}</span>
            {!s.open && <span className="stop-lock"><IconLock /></span>}
          </button>
        ))}
        <div className={`map-monster ${hopping ? "hop" : ""}`} style={{ left: `${STOPS[0].x + 9}%`, top: `${STOPS[0].y - 4}%` }} aria-hidden="true">
          <Monster config={monster} state={hopping ? "celebrating" : "greeting"} size={120} label="" />
          {p.monsterName && <span className="nameplate small">{p.monsterName}</span>}
        </div>
      </div>
      <SpeechBubble text={caption} tail="down" className="map-caption" />
    </main>
  );
}
