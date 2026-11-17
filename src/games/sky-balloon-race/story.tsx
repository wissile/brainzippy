import { Bobbo } from "../../characters/Bobbo";
import { Gloop, Puff, Zuzu } from "../../characters/Crew";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { Island, NumberBalloon, RIDES, RainbowArch, RideArt, SkyBackground } from "./art";

/** "The Great Sky Balloon Race" — the story wrapper for Sky Balloon Race. */

function IslandArt() {
  return (
    <svg viewBox="0 0 300 220" aria-hidden="true">
      <defs>
        <linearGradient id="sb-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9C6BD8" />
          <stop offset="1" stopColor="#5B3A9A" />
        </linearGradient>
      </defs>
      <Island />
    </svg>
  );
}

function Bunting() {
  const flags = ["#FF5A4E", "#FFD43B", "#4D96FF", "#6BCB77", "#FF8FB1", "#8E6CEF"];
  return (
    <svg viewBox="0 0 300 80" aria-hidden="true">
      <path d="M8 76 L8 10 M292 76 L292 10" stroke="#2B2140" strokeWidth="6" strokeLinecap="round" />
      <path d="M8 14 Q150 56 292 14" fill="none" stroke="#2B2140" strokeWidth="3" />
      {flags.map((c, i) => {
        const x = 36 + i * 45;
        const y = 14 + Math.sin(((x - 8) / 284) * Math.PI) * 28;
        return <path key={c} d={`M${x - 12} ${y} L${x + 12} ${y + 1} L${x} ${y + 26} Z`} fill={c} stroke="#2B2140" strokeWidth="3" strokeLinejoin="round" />;
      })}
    </svg>
  );
}

const Ride = ({ who, state = "idle", talking = false, tied = 0, sag = false }: { who: "bobbo" | "zuzu" | "gloop"; state?: "idle" | "greeting" | "retry" | "celebrating" | "encouraging"; talking?: boolean; tied?: number; sag?: boolean }) => {
  const C = who === "bobbo" ? Bobbo : who === "zuzu" ? Zuzu : Gloop;
  return (
    <div className={`sb-ride sb-story-ride state-${state}`}>
      <div className="sb-ride-float">
        <RideArt id={`story-${who}`} palette={RIDES[who]} tied={tied} sag={sag} passenger={<C state={state} talking={talking} size="100%" />} />
      </div>
    </div>
  );
};

function BalloonBunch() {
  return (
    <div className="sb-bunch">
      {[7, 3, 9, 5, 8].map((n, i) => (
        <span key={n} className="sb-bunch-b" style={{ "--i": i } as React.CSSProperties}>
          <NumberBalloon n={n} color={i} />
        </span>
      ))}
    </div>
  );
}

export const skyIntro: StoryBeat[] = [
  {
    line: "sb.story.1",
    camera: "wide",
    scene: () => (
      <div className="scene sb-scene">
        <SkyBackground />
        <Actor x={28} y={96} w={46}><IslandArt /></Actor>
        <Actor x={26} y={72} w={30}><Bunting /></Actor>
        <Actor x={30} y={77} w={20}><Ride who="bobbo" state="greeting" /></Actor>
        <Actor x={60} y={58} w={17} float><Ride who="zuzu" state="greeting" /></Actor>
        <Actor x={82} y={44} w={14} float><Ride who="gloop" state="greeting" /></Actor>
      </div>
    ),
  },
  {
    line: "sb.story.2",
    camera: "close",
    sfx: "retry",
    scene: ({ speaking }) => (
      <div className="scene sb-scene">
        <SkyBackground />
        <Actor x={46} y={104} w={64}><IslandArt /></Actor>
        <Actor x={46} y={80} w={30}><Ride who="bobbo" state="retry" talking={speaking} sag /></Actor>
        <Actor x={80} y={34} w={11} float><Ride who="zuzu" /></Actor>
      </div>
    ),
  },
  {
    line: "sb.story.3",
    camera: "pan-right",
    sfx: "whoosh",
    scene: () => (
      <div className="scene sb-scene">
        <SkyBackground />
        <Actor x={30} y={104} w={60}><IslandArt /></Actor>
        <Actor x={30} y={80} w={28}><Ride who="bobbo" state="encouraging" sag /></Actor>
        <Actor x={70} y={78} w={28} enter="right"><div className="sb-puff-carry"><BalloonBunch /><Puff state="greeting" size="100%" /></div></Actor>
      </div>
    ),
  },
  {
    line: "sb.story.4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <div className="scene sb-scene">
        <SkyBackground />
        <Actor x={34} y={104} w={60}><IslandArt /></Actor>
        <Actor x={34} y={80} w={28}><Ride who="bobbo" state="greeting" /></Actor>
        <Actor x={66} y={74} w={26} float><div className="sb-puff-carry"><BalloonBunch /><Puff state="greeting" talking={speaking} size="100%" /></div></Actor>
      </div>
    ),
  },
];

export const skyOutro: StoryBeat[] = [
  {
    line: "sb.story.end1",
    camera: "rise",
    sfx: "complete",
    scene: ({ speaking }) => (
      <div className="scene sb-scene">
        <SkyBackground />
        <Actor x={52} y={74} w={70}><RainbowArch /></Actor>
        <Actor x={50} y={82} w={26} enter="left"><Ride who="bobbo" state="celebrating" talking={speaking} tied={8} /></Actor>
      </div>
    ),
  },
  {
    line: "sb.story.end2",
    camera: "wide",
    scene: () => (
      <div className="scene sb-scene">
        <SkyBackground />
        <Actor x={50} y={60} w={56}><RainbowArch flag={false} /></Actor>
        <Actor x={50} y={76} w={26}><Ride who="bobbo" state="celebrating" tied={8} /></Actor>
        <Actor x={20} y={80} w={15} float><Ride who="zuzu" state="celebrating" /></Actor>
        <Actor x={80} y={78} w={15} float><Ride who="gloop" state="celebrating" /></Actor>
        <Actor x={70} y={44} w={12} float><Puff state="celebrating" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "sb.story.end3",
    camera: "close",
    sfx: "achievement",
    scene: () => (
      <div className="scene sb-scene">
        <SkyBackground />
        <Actor x={36} y={86} w={26}><Ride who="bobbo" state="celebrating" tied={8} /></Actor>
        <Actor x={78} y={84} w={15} float><Puff state="celebrating" size="100%" /></Actor>
        <Spark x={66} y={40} size={16} />
      </div>
    ),
  },
];

export const skyBetween: Record<number, { line: string }> = {
  2: { line: "sb.mid.1" },
  4: { line: "sb.mid.2" },
  6: { line: "sb.mid.3" },
};
