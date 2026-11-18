import { Rumble } from "../../characters/Crew";
import { INK } from "../../characters/palette";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { BI, BagArt, BalanceKeeperSticker, HarbourBackground, StallBobbo } from "./art";

/** "Bobbo's Night Market" — the story wrapper for Balance Scale Island. */

/** A small static market scale for story scenes. `tilt` in degrees (positive = right pan down). */
function StoryScale({ tilt = 0, left, right }: { tilt?: number; left: React.ReactNode; right: React.ReactNode }) {
  const dy = Math.sin((tilt * Math.PI) / 180) * 110;
  return (
    <div className="bi-story-scale">
      <svg viewBox="0 0 300 260" aria-hidden="true">
        <rect x="142" y="60" width="16" height="170" rx="5" fill={BI.brassDark} stroke={INK} strokeWidth="5" />
        <path d="M96 230 L204 230 L214 252 L86 252 Z" fill="#7A4B2A" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <g transform={`rotate(${tilt} 150 60)`}>
          <rect x="34" y="52" width="232" height="14" rx="7" fill={BI.brass} stroke={INK} strokeWidth="5" />
        </g>
        <circle cx="150" cy="60" r="13" fill={BI.brass} stroke={INK} strokeWidth="5" />
        {[{ x: 40, d: -dy }, { x: 260, d: dy }].map(({ x, d }) => (
          <g key={x} transform={`translate(0 ${d})`}>
            <path d={`M${x} 60 L${x - 38} 160 M${x} 60 L${x + 38} 160`} stroke={INK} strokeWidth="2.5" strokeDasharray="6 4" />
            <path d={`M${x - 46} 160 L${x + 46} 160 Q${x + 40} 178 ${x} 178 Q${x - 40} 178 ${x - 46} 160 Z`} fill={BI.brass} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          </g>
        ))}
      </svg>
      <div className="bi-story-load l" style={{ transform: `translateY(${(-dy / 260) * 100}%)` }}>{left}</div>
      <div className="bi-story-load r" style={{ transform: `translateY(${(dy / 260) * 100}%)` }}>{right}</div>
    </div>
  );
}

const Bag = ({ tag }: { tag?: string }) => (
  <span className="bi-story-bag"><BagArt tag={tag} tagState={tag ? "known" : undefined} /></span>
);
const Weights = ({ n }: { n: number }) => (
  <span className="bi-story-weights">{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>
);

function BagPile({ labels = false }: { labels?: boolean }) {
  return (
    <div className="bi-story-pile">
      {["3", "7", "5", "4"].map((t, i) => (
        <span key={t} style={{ "--i": i } as React.CSSProperties}><BagArt tag={labels ? `${t} kg` : "?"} tagState={labels ? "known" : "test"} /></span>
      ))}
    </div>
  );
}

export const balanceIntro: StoryBeat[] = [
  {
    line: "bi.story.1",
    camera: "wide",
    scene: () => (
      <div className="scene bi-scene">
        <HarbourBackground />
        <Actor x={50} y={90} w={34}><StoryScale left={<Bag />} right={<Weights n={4} />} /></Actor>
        <Actor x={22} y={92} w={18}><StallBobbo state="greeting" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "bi.story.2",
    camera: "close",
    sfx: "retry",
    scene: ({ speaking }) => (
      <div className="scene bi-scene">
        <HarbourBackground />
        <Actor x={36} y={90} w={22}><StallBobbo state="retry" talking={speaking} size="100%" /></Actor>
        <Actor x={66} y={88} w={28}><BagPile /></Actor>
      </div>
    ),
  },
  {
    line: "bi.story.3",
    camera: "pan-right",
    scene: () => (
      <div className="scene bi-scene">
        <HarbourBackground />
        <Actor x={50} y={90} w={34}><StoryScale tilt={-10} left={<><Bag tag="?" /><Bag tag="?" /></>} right={<Weights n={3} />} /></Actor>
        <Actor x={18} y={92} w={16}><StallBobbo state="thinking" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "bi.story.4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <div className="scene bi-scene">
        <HarbourBackground />
        <Actor x={32} y={90} w={18}><StallBobbo state="encouraging" size="100%" /></Actor>
        <Actor x={62} y={88} w={20} enter="right"><Rumble state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const balanceOutro: StoryBeat[] = [
  {
    line: "bi.story.end1",
    camera: "close",
    sfx: "complete",
    scene: ({ speaking }) => (
      <div className="scene bi-scene">
        <HarbourBackground />
        <Actor x={34} y={90} w={22}><StallBobbo state="celebrating" talking={speaking} size="100%" /></Actor>
        <Actor x={66} y={88} w={28}><BagPile labels /></Actor>
      </div>
    ),
  },
  {
    line: "bi.story.end2",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene bi-scene">
        <HarbourBackground />
        <Actor x={50} y={90} w={30}><StoryScale left={<Bag tag="4 kg" />} right={<Weights n={4} />} /></Actor>
        <Actor x={80} y={90} w={16}><Rumble state="celebrating" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "bi.story.end3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene bi-scene">
        <HarbourBackground />
        <Actor x={50} y={78} w={30}><BalanceKeeperSticker /></Actor>
        <Spark x={50} y={22} size={12} />
      </div>
    ),
  },
];

export const balanceBetween: Record<number, { line: string }> = {
  2: { line: "bi.story.mid1" },
  4: { line: "bi.story.mid2" },
  6: { line: "bi.story.mid3" },
};
