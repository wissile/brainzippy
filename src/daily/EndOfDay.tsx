import { useEffect, useMemo, useState } from "react";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";
import { VOICE_LINES, renderLine } from "../audio/voiceLines";
import { DEFAULT_MONSTER, Monster } from "../characters/Monster";
import { getSkill } from "../content/registry";
import { Zzz } from "../game/scenes";
import { loadState } from "../services/storage";
import { AudioButtons, NavButton, SpeechBubble } from "../ui/controls";
import { Critter, hostOf } from "./critters";
import { tomorrowPreview, worldsPlayed } from "./store";
import "./daily.css";

/** Kid-language recap line for a world: its own `daily.recap.<world>` line, or a friendly generic one. */
export const recapLine = (worldId: string): string => (VOICE_LINES[`daily.recap.${worldId}`] ? `daily.recap.${worldId}` : "daily.recap.other");

/** Moon now, sun tomorrow: a gentle picture of "sleep, then come back" instead of a countdown clock. */
function MoonAndSun() {
  return (
    <svg className="eod-sky-arc" viewBox="0 0 320 130" role="img" aria-label="The moon is out now. The sun comes back tomorrow." data-testid="moon-sun">
      <path d="M44 104 Q160 -14 276 104" fill="none" stroke="#FFF3C4" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14" opacity="0.8" />
      <g className="eod-moon">
        <circle cx="44" cy="92" r="30" fill="#FFF6D0" />
        <circle cx="58" cy="82" r="27" fill="#2E2470" />
        <circle cx="30" cy="96" r="3.5" fill="#E9DDA8" />
      </g>
      <g className="eod-sun">
        <clipPath id="eod-horizon"><rect x="200" y="0" width="120" height="112" /></clipPath>
        <g clipPath="url(#eod-horizon)">
          <g stroke="#FFD43B" strokeWidth="5" strokeLinecap="round">
            {[-60, -30, 0, 30, 60].map((a) => (
              <line key={a} x1="276" y1="112" x2={276 + Math.sin((a * Math.PI) / 180) * 58} y2={112 - Math.cos((a * Math.PI) / 180) * 58} />
            ))}
          </g>
          <circle cx="276" cy="112" r="34" fill="#FFE066" stroke="#2B2140" strokeWidth="4" />
        </g>
        <line x1="222" y1="112" x2="320" y2="112" stroke="#FFF3C4" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      </g>
      {[[120, 30], [200, 22], [160, 62], [98, 70]].map(([x, y]) => (
        <path key={x} d={`M${x} ${y! - 6} L${x! + 2} ${y! - 2} L${x! + 6} ${y} L${x! + 2} ${y! + 2} L${x} ${y! + 6} L${x! - 2} ${y! + 2} L${x! - 6} ${y} L${x! - 2} ${y! - 2} Z`} fill="#FFE27A" />
      ))}
    </svg>
  );
}

/** Night sky with twinkling stars and dark hills (the moon lives in the moon-and-sun picture). */
function NightBackground() {
  return (
    <svg className="bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="eod-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B1440" /><stop offset="0.6" stopColor="#2E2470" /><stop offset="1" stopColor="#4B3A8F" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#eod-night)" />
      <g fill="#fff">{Array.from({ length: 44 }, (_, i) => <circle key={i} className="twinkle" cx={(i * 397) % 1600} cy={(i * 211) % 520} r={1.5 + (i % 3)} style={{ animationDelay: `${(i % 7) * 0.4}s` }} />)}</g>
      <path d="M0 640 Q260 560 520 610 T1060 590 T1600 610 L1600 900 L0 900 Z" fill="#2F5E4A" />
      <path d="M0 730 Q400 680 800 712 T1600 700 L1600 900 L0 900 Z" fill="#24503D" />
    </svg>
  );
}

/** "That's today's adventure!" — shown once today's limit is reached (map, and any /play URL). */
export function EndOfDay() {
  const { caption, reducedMotion } = useApp();
  const st = loadState();
  const monster = st.profile.monster ?? DEFAULT_MONSTER;
  const played = useMemo(() => worldsPlayed(), []);
  const teaser = useMemo(() => tomorrowPreview(), []);
  const [asleep, setAsleep] = useState(false);

  useEffect(() => {
    let alive = true;
    void audio.playMusic("island");
    const t = window.setTimeout(() => setAsleep(true), reducedMotion ? 1200 : 2600);
    void (async () => {
      await new Promise((r) => window.setTimeout(r, 450));
      const lines = ["daily.end.title", "daily.end.yawn", "daily.end.recap", ...played.slice(0, 3).map((w) => recapLine(w.id)), teaser?.isNew ? "daily.teaser.new" : "daily.teaser.more", "daily.end.tomorrow"];
      for (const id of lines) {
        if (!alive) return;
        await audio.speak(id);
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(t);
      audio.stopVoice();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="screen eod" data-testid="end-of-day">
      <div className="eod-bg" aria-hidden="true"><NightBackground /></div>
      <div className="eod-top">
        <NavButton to="/" label="Home" />
        <span />
        <AudioButtons />
      </div>
      <section className="eod-stage">
        <MoonAndSun />
        <div className={`eod-monster ${asleep ? "asleep" : "yawning"}`} data-testid="eod-monster" data-state={asleep ? "sleeping" : "yawning"}>
          <Monster config={monster} state={asleep ? "sleeping" : "greeting"} size="100%" label={`${st.profile.monsterName || "Your monster"} is ${asleep ? "fast asleep" : "yawning"}`} />
          {asleep && <Zzz x={72} y={8} />}
          <div className="eod-bed" aria-hidden="true" />
        </div>
      </section>
      <section className="eod-panel">
        <h1 className="eod-title">That's today's adventure!</h1>
        {played.length > 0 && (
          <ul className="eod-recap" data-testid="recap" aria-label="What you did today">
            {played.map((w) => (
              <li key={w.id} className="eod-recap-item">
                <span className="eod-critter" aria-hidden="true"><Critter id={hostOf(w)} /></span>
                <span className="eod-recap-text">
                  <b>{renderLine(recapLine(w.id))}</b>
                  <small>For grown-ups: {w.skills.map((s) => getSkill(s)?.title ?? s).join(" · ")}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
        {teaser && (
          <div className="eod-teaser" data-testid="teaser">
            <span className="eod-critter" aria-hidden="true"><Critter id={hostOf(teaser.world)} /></span>
            <span><b>Tomorrow{teaser.isNew ? ": something new!" : ""}</b><small>{teaser.world.title} is waiting for you.</small></span>
          </div>
        )}
        <p className="eod-come-back" data-testid="come-back">Come back tomorrow!</p>
      </section>
      <SpeechBubble text={caption} tail="down" className="eod-caption" />
    </main>
  );
}
