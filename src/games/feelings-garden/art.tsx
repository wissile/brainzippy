import { CREW, INK } from "../../characters/palette";
import { type ActionId, type FaceId, type FeelingId, type FriendId, type PropId, isAction, isFeeling } from "./bank";
import { Face, FriendIcon, Sparkle, Sweat, Tear } from "./critters";

/**
 * Snug's Feelings Garden — original scene art (SVG only; no fonts, stock or emoji): the garden, feeling flowers,
 * the "what happened" scene pictures, idea cards, flower beds, the breathing flower and the Bloom Badge sticker.
 * Petal colours follow a flower's POSITION on the board, never its feeling (colour never carries meaning).
 */
export const PETALS = ["#FF9EC4", "#FFC75A", "#9FD8FF", "#C7B2FF", "#9BE3B5", "#FFB08A"] as const;
const PEACH = "#FFBE98";
const PLUM = "#7A3E6B";
const SOIL = "#8A5A3C";
const LEAF = "#5DBB63";

// ------------------------------------------------------------------ background

export function GardenBg() {
  return (
    <svg className="scene-bg fg-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="fg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BFE6FF" />
          <stop offset="1" stopColor="#FFF4E6" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#fg-sky)" />
      <circle cx="1360" cy="150" r="74" fill="#FFE27A" />
      <circle cx="1360" cy="150" r="104" fill="#FFE27A" opacity="0.25" />
      <g className="cloud" fill="#fff" opacity="0.9"><ellipse cx="300" cy="140" rx="90" ry="34" /><ellipse cx="360" cy="120" rx="60" ry="36" /></g>
      <g className="cloud c2" fill="#fff" opacity="0.85"><ellipse cx="900" cy="90" rx="80" ry="28" /><ellipse cx="950" cy="74" rx="50" ry="30" /></g>
      <path d="M0 560 Q300 440 640 520 Q980 600 1260 480 Q1460 420 1600 470 L1600 900 L0 900 Z" fill="#A8DD8E" />
      <path d="M0 640 Q420 560 820 630 Q1200 690 1600 600 L1600 900 L0 900 Z" fill="#8BCF73" />
      {/* picket fence */}
      <g fill="#FFF8EE" stroke="#C9A98A" strokeWidth="4">
        <rect x="0" y="618" width="1600" height="14" />
        <rect x="0" y="664" width="1600" height="14" />
        {Array.from({ length: 34 }, (_, i) => (
          <path key={i} d={`M${i * 48 + 10} 700 L${i * 48 + 10} 600 L${i * 48 + 24} 584 L${i * 48 + 38} 600 L${i * 48 + 38} 700 Z`} />
        ))}
      </g>
      <rect x="0" y="700" width="1600" height="200" fill="#7CC765" />
      {/* distant flowers */}
      {Array.from({ length: 22 }, (_, i) => (
        <g key={i} transform={`translate(${(i * 173) % 1600} ${730 + (i % 4) * 40})`}>
          <path d="M0 0 L0 30" stroke="#4E9E4A" strokeWidth="5" />
          <circle cx="0" cy="0" r="11" fill={PETALS[i % PETALS.length]} />
          <circle cx="0" cy="0" r="4.5" fill="#FFE27A" />
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ feeling flowers

/** Simple flower-face positions (Snug-style simple faces). */
const FLOWER_EYES = [
  { cx: -12, cy: -4, r: 8.5, s: -1 as const },
  { cx: 12, cy: -4, r: 8.5, s: 1 as const },
];

export function FlowerFace({ feeling, petal, open = 1 }: { feeling: FaceId; petal: string; open?: number }) {
  return (
    <svg className="fg-flower-svg" viewBox="-62 -62 124 148" aria-hidden="true">
      <path d="M0 30 C2 50 -3 70 0 90" fill="none" stroke="#3E8E41" strokeWidth="7" strokeLinecap="round" />
      <path d="M1 66 C14 50 34 52 40 58 C30 70 14 72 1 66 Z" fill={LEAF} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M-1 76 C-14 62 -32 64 -38 70 C-28 82 -12 82 -1 76 Z" fill={LEAF} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <g className="fg-petals" style={{ transform: `scale(${open})` }}>
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-40" rx="17" ry="22" transform={`rotate(${i * 45})`} fill={petal} stroke={INK} strokeWidth="3.5" />
        ))}
      </g>
      <circle cx="0" cy="0" r="31" fill="#FFF3C4" stroke={INK} strokeWidth="4" />
      <g transform="translate(0 0) scale(0.95)">
        <Face face={feeling} eyes={FLOWER_EYES} mouth={{ x: 0, y: 13, s: 0.62 }} skin="#FFF3C4" cheeks={[[-19, 8], [19, 8]]} />
      </g>
      {(feeling === "sad" || feeling === "lonely") && <Tear x={-14} y={9} s={0.6} />}
      {(feeling === "scared" || feeling === "nervous") && <Sweat x={24} y={-16} s={0.6} />}
      {(feeling === "proud" || feeling === "excited") && <Sparkle x={28} y={-28} s={0.7} />}
    </svg>
  );
}

// ------------------------------------------------------------------ mini figures for idea cards

/** Snug, tiny: low peach loaf, rounded ears, plum nose. */
function MiniSnug({ x, y, s = 1, mood = "smile", flip = false }: { x: number; y: number; s?: number; mood?: "smile" | "laugh" | "calm" | "o"; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="-15" cy="-20" rx="9" ry="11" fill={PEACH} stroke={INK} strokeWidth="3" transform="rotate(-25 -15 -20)" />
      <ellipse cx="15" cy="-20" rx="9" ry="11" fill={PEACH} stroke={INK} strokeWidth="3" transform="rotate(25 15 -20)" />
      <path d="M0 -20 C20 -20 28 -8 28 4 C28 14 20 18 0 18 C-20 18 -28 14 -28 4 C-28 -8 -20 -20 0 -20 Z" fill={PEACH} stroke={INK} strokeWidth="3.5" />
      <circle cx="-9" cy="-4" r="3" fill={INK} /><circle cx="9" cy="-4" r="3" fill={INK} />
      <ellipse cx="0" cy="3" rx="5" ry="3.4" fill={PLUM} />
      {mood === "laugh" && <path d="M-6 8 Q0 16 6 8 Z" fill="#4A2545" stroke={INK} strokeWidth="2" />}
      {mood === "smile" && <path d="M-5 9 Q0 13 5 9" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {mood === "calm" && <path d="M-4 10 L4 10" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {mood === "o" && <circle cx="0" cy="11" r="3" fill="#4A2545" />}
    </g>
  );
}
/** A friend, tiny: a round blob in a friend colour (the card is about what Snug does). */
function MiniPal({ x, y, s = 1, colour = CREW.zuzu, mood = "sad" }: { x: number; y: number; s?: number; colour?: string; mood?: "sad" | "smile" | "angry" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -24 C16 -24 22 -10 22 4 C22 16 14 20 0 20 C-14 20 -22 16 -22 4 C-22 -10 -16 -24 0 -24 Z" fill={colour} stroke={INK} strokeWidth="3.5" />
      <circle cx="-7" cy="-6" r="3" fill={INK} /><circle cx="7" cy="-6" r="3" fill={INK} />
      {mood === "sad" && <path d="M-5 8 Q0 3 5 8" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {mood === "smile" && <path d="M-5 5 Q0 10 5 5" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {mood === "angry" && <path d="M-11 -13 L-3 -10 M11 -13 L3 -10 M-5 8 Q0 4 5 8" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
    </g>
  );
}
const Heart = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 6 C-10 -2 -10 -10 -4 -10 C-1 -10 0 -7 0 -6 C0 -7 1 -10 4 -10 C10 -10 10 -2 0 6 Z" fill="#FF6B8B" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
);
const Blocks = ({ x, y, fallen = false }: { x: number; y: number; fallen?: boolean }) => (
  <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth="3">
    {fallen ? (
      <><rect x="-22" y="-10" width="16" height="12" rx="2" fill="#FF9F43" transform="rotate(-20 -14 -4)" /><rect x="-2" y="-8" width="16" height="12" rx="2" fill="#4D96FF" transform="rotate(15 6 -2)" /><rect x="14" y="-12" width="16" height="12" rx="2" fill="#FFD43B" transform="rotate(40 22 -6)" /></>
    ) : (
      <><rect x="-8" y="-12" width="16" height="12" rx="2" fill="#FF9F43" /><rect x="-8" y="-24" width="16" height="12" rx="2" fill="#4D96FF" /><rect x="-8" y="-36" width="16" height="12" rx="2" fill="#FFD43B" /></>
    )}
  </g>
);
/** A grown-up critter: tall and gentle, with a heart badge (generic, not a person). */
const GrownUp = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 -40 C14 -40 18 -26 18 -10 L18 22 L-18 22 L-18 -10 C-18 -26 -14 -40 0 -40 Z" fill="#B48CF0" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    <circle cx="-6" cy="-22" r="2.8" fill={INK} /><circle cx="6" cy="-22" r="2.8" fill={INK} />
    <path d="M-5 -12 Q0 -8 5 -12" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    <Heart x={0} y={6} s={0.8} />
  </g>
);

const CARD: Record<ActionId, React.ReactNode> = {
  sit: (<><MiniPal x={40} y={52} colour={CREW.hoot} mood="sad" /><MiniSnug x={80} y={56} s={0.9} /><Heart x={60} y={20} /></>),
  fix: (<><path d="M30 64 L52 34 L66 50 Z" fill="#FF8FB1" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><rect x="50" y="40" width="22" height="9" rx="3" fill="#FFF0B3" stroke={INK} strokeWidth="2.5" transform="rotate(-35 61 44)" /><MiniSnug x={90} y={58} s={0.8} /></>),
  share: (<><circle cx="44" cy="44" r="15" fill="#E6B27A" stroke={INK} strokeWidth="3" /><circle cx="76" cy="44" r="15" fill="#E6B27A" stroke={INK} strokeWidth="3" /><path d="M44 29 L44 59 M76 29 L76 59" stroke={INK} strokeWidth="2" strokeDasharray="3 3" /><path d="M52 70 Q60 78 68 70" fill="none" stroke={INK} strokeWidth="3" markerEnd="" /><MiniSnug x={22} y={70} s={0.55} /><MiniPal x={100} y={70} s={0.55} colour={CREW.puff} mood="smile" /></>),
  play: (<><circle cx="60" cy="58" r="12" fill="#FFD43B" stroke={INK} strokeWidth="3" /><path d="M48 58 L72 58 M60 46 Q66 58 60 70" stroke={INK} strokeWidth="2.5" fill="none" /><MiniSnug x={28} y={56} s={0.7} /><MiniPal x={94} y={56} s={0.7} colour={CREW.zuzu} mood="smile" /><path d="M24 20 Q40 8 56 20" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>),
  pickup: (<><g stroke={INK} strokeWidth="2.5">{["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD43B"].map((c, i) => <rect key={c} x={24 + i * 14} y={64 - (i % 2) * 6} width="20" height="6" rx="3" fill={c} transform={`rotate(${i * 25 - 30} ${34 + i * 14} 67)`} />)}</g><MiniSnug x={90} y={50} s={0.8} /></>),
  grownup: (<><GrownUp x={84} y={46} /><MiniSnug x={36} y={60} s={0.75} /><path d="M52 40 L66 40" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M62 34 L68 40 L62 46" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>),
  askok: (<><MiniSnug x={36} y={60} s={0.8} /><MiniPal x={92} y={60} s={0.8} colour={CREW.hoot} mood="sad" /><path d="M48 14 L80 14 Q88 14 88 22 L88 32 Q88 40 80 40 L60 40 L52 48 L54 40 L48 40 Q40 40 40 32 L40 22 Q40 14 48 14 Z" fill="#fff" stroke={INK} strokeWidth="3" /><path d="M58 27 L62 31 L70 22" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>),
  kindwords: (<><MiniSnug x={34} y={62} s={0.8} /><path d="M50 12 L94 12 Q102 12 102 20 L102 34 Q102 42 94 42 L70 42 L60 50 L62 42 L58 42 Q50 42 50 34 Z" fill="#fff" stroke={INK} strokeWidth="3" /><Heart x={76} y={29} s={1.1} /></>),
  build: (<><Blocks x={60} y={70} /><MiniSnug x={28} y={62} s={0.65} /><MiniPal x={94} y={62} s={0.65} colour={CREW.rumble} mood="smile" /></>),
  breathe: (<><MiniSnug x={42} y={60} s={0.9} mood="o" /><path d="M66 50 Q80 40 76 30 Q72 22 80 18 M70 60 Q90 56 92 44" fill="none" stroke="#7CB7E8" strokeWidth="4" strokeLinecap="round" /><g transform="translate(96 30)"><circle r="7" fill={PETALS[0]} stroke={INK} strokeWidth="2.5" /><circle r="3" fill="#FFE27A" /></g></>),
  pause: (<><path d="M70 74 L70 34 L104 54 Z" fill="#9FD8FF" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><ellipse cx="86" cy="72" rx="16" ry="6" fill="#C7B2FF" stroke={INK} strokeWidth="2.5" /><MiniSnug x={36} y={58} s={0.8} mood="calm" /><path d="M24 26 L24 14 M24 26 L32 22" stroke={INK} strokeWidth="3" strokeLinecap="round" /><circle cx="24" cy="24" r="12" fill="none" stroke={INK} strokeWidth="3" /></>),
  tell: (<><GrownUp x={88} y={46} /><MiniPal x={40} y={58} s={0.8} colour={CREW.bobbo} mood="angry" /><path d="M54 30 Q62 22 70 30" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>),
  count: (<><MiniSnug x={30} y={60} s={0.75} mood="calm" />{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={56 + i * 12} cy={40} r="5" fill={i < 5 ? "#FFD43B" : "none"} stroke={INK} strokeWidth="2.5" />)}<path d="M54 56 L106 56" stroke={INK} strokeWidth="2" strokeDasharray="4 4" /></>),
  stone: (<><MiniSnug x={36} y={60} s={0.85} mood="calm" /><ellipse cx="84" cy="50" rx="18" ry="13" fill="#A8E6CF" stroke={INK} strokeWidth="3.5" /><path d="M76 46 Q82 42 88 44" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></>),
  sayfeel: (<><MiniPal x={34} y={62} s={0.85} colour={CREW.puff} mood="angry" /><path d="M52 12 L96 12 Q104 12 104 20 L104 36 Q104 44 96 44 L70 44 L60 52 L62 44 L60 44 Q52 44 52 36 Z" fill="#fff" stroke={INK} strokeWidth="3" /><g transform="translate(78 28) scale(0.32)"><Face face="angry" eyes={[{ cx: -14, cy: -6, r: 10, s: -1 }, { cx: 14, cy: -6, r: 10, s: 1 }]} mouth={{ x: 0, y: 16, s: 0.8 }} skin="#fff" /></g></>),
  askhelp: (<><MiniSnug x={34} y={60} s={0.8} /><GrownUp x={90} y={48} s={0.9} /><path d="M50 30 L50 18 M46 22 L50 18 L54 22" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>),
  laugh: (<><MiniSnug x={40} y={58} s={0.9} mood="laugh" /><MiniPal x={92} y={60} s={0.75} colour={CREW.hoot} mood="sad" /><path d="M62 30 l6 -6 M66 38 l9 -3 M58 24 l2 -8" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>),
  walk: (<><MiniPal x={34} y={58} s={0.75} colour={CREW.zuzu} mood="sad" /><MiniSnug x={82} y={58} s={0.75} flip /><path d="M100 30 L114 30 M108 24 L114 30 L108 36" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>),
  ignore: (<><MiniPal x={34} y={58} s={0.75} colour={CREW.puff} mood="sad" /><MiniSnug x={84} y={58} s={0.75} flip mood="calm" /><path d="M64 26 L80 42 M80 26 L64 42" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>),
  throw: (<><MiniPal x={36} y={60} s={0.8} colour={CREW.bobbo} mood="angry" /><Blocks x={88} y={40} fallen /><path d="M56 44 Q70 30 80 34" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="4 4" /></>),
  shout: (<><MiniPal x={36} y={60} s={0.8} colour={CREW.zuzu} mood="angry" /><path d="M60 40 L100 22 M60 50 L104 50 M60 60 L100 78" stroke={INK} strokeWidth="4" strokeLinecap="round" /></>),
  knock: (<><MiniPal x={34} y={60} s={0.8} colour={CREW.rumble} mood="angry" /><Blocks x={86} y={70} fallen /><path d="M60 54 l10 4 M60 64 l12 0" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>),
  push: (<><MiniPal x={40} y={60} s={0.75} colour={CREW.zuzu} mood="angry" /><MiniPal x={82} y={60} s={0.75} colour={CREW.gloop} mood="sad" /><path d="M58 52 L66 52 M62 46 L68 52 L62 58" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>),
};

export function IdeaCard({ id }: { id: ActionId }) {
  return (
    <svg className="fg-card-svg" viewBox="0 0 120 90" aria-hidden="true">
      <rect x="3" y="3" width="114" height="84" rx="14" fill="#FFFDF6" stroke={INK} strokeWidth="4" />
      {CARD[id]}
    </svg>
  );
}

// ------------------------------------------------------------------ scene pictures ("what happened")

const ground = <path d="M6 76 Q60 70 114 76 L114 86 L6 86 Z" fill="#9BD67F" />;
const sand = <path d="M6 72 Q60 66 114 72 L114 86 L6 86 Z" fill="#F7D9A0" />;
const cloud = (x: number, y: number, s = 1, fill = "#fff") => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke={INK} strokeWidth="3"><path d="M-22 6 C-30 6 -30 -6 -20 -6 C-20 -16 -6 -18 -2 -10 C2 -20 18 -18 18 -6 C28 -6 28 6 20 6 Z" /></g>
);
const sun = (x: number, y: number) => (
  <g transform={`translate(${x} ${y})`}><circle r="10" fill="#FFD43B" stroke={INK} strokeWidth="3" />{[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M0 -15 L0 -20" transform={`rotate(${a})`} stroke={INK} strokeWidth="3" strokeLinecap="round" />)}</g>
);
const balloon = (x: number, y: number, c: string) => (
  <g transform={`translate(${x} ${y})`}><ellipse rx="10" ry="12" fill={c} stroke={INK} strokeWidth="3" /><path d="M0 12 Q-4 22 2 32" fill="none" stroke={INK} strokeWidth="2" /></g>
);
const paper = (x: number, y: number, w = 44, h = 34, extra?: React.ReactNode, rot = 0) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx="3" fill="#fff" stroke={INK} strokeWidth="3" />{extra}</g>
);
const doodle = <><circle cx="-6" cy="-3" r="6" fill="#FFD43B" /><path d="M4 8 L12 -6 L16 8 Z" fill="#6BCB77" /></>;
const kid = (x: number, y: number, c: string, s = 0.6) => <MiniPal x={x} y={y} s={s} colour={c} mood="smile" />;

const PROP_ART: Record<PropId, React.ReactNode> = {
  gift: (<><rect x="38" y="36" width="44" height="38" rx="4" fill="#FF8FB1" stroke={INK} strokeWidth="3.5" /><rect x="55" y="36" width="10" height="38" fill="#FFD43B" stroke={INK} strokeWidth="3" /><path d="M60 36 C46 18 36 30 60 36 C84 30 74 18 60 36 Z" fill="#FFD43B" stroke={INK} strokeWidth="3" /></>),
  icecream: (<>{ground}<path d="M40 74 L58 66 L50 54 Z" fill="#E6B27A" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><ellipse cx="72" cy="72" rx="20" ry="7" fill="#FFB3D1" stroke={INK} strokeWidth="3" /><circle cx="66" cy="68" r="2" fill="#FF6B6B" /></>),
  bubbles: (<>{sun(98, 18)}{[[40, 40, 12], [62, 26, 9], [70, 52, 14], [30, 64, 7], [90, 62, 8]].map(([x, y, r]) => <g key={`${x}`}><circle cx={x} cy={y} r={r} fill="#E8F6FF" stroke={INK} strokeWidth="2.5" /><path d={`M${x! - r! * 0.4} ${y! - r! * 0.4} q2 -3 5 -3`} stroke="#fff" strokeWidth="2" fill="none" /></g>)}</>),
  balloon: (<>{cloud(36, 64, 0.8)}{balloon(78, 26, "#FF6B6B")}<path d="M74 70 l4 -6 M84 72 l2 -8" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
  swing: (<><path d="M20 10 L100 10" stroke="#8A5A3C" strokeWidth="6" strokeLinecap="round" /><path d="M48 10 L36 60 M72 10 L60 60" stroke={INK} strokeWidth="3" /><rect x="30" y="58" width="36" height="7" rx="3" fill="#FF9F43" stroke={INK} strokeWidth="3" /><path d="M76 56 q10 -4 14 -14 M80 66 q12 -2 18 -12" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
  crayon: (<><g transform="rotate(-20 40 46)"><rect x="18" y="40" width="30" height="12" rx="2" fill="#4D96FF" stroke={INK} strokeWidth="3" /><path d="M18 40 L8 46 L18 52 Z" fill="#4D96FF" stroke={INK} strokeWidth="3" strokeLinejoin="round" /></g><g transform="rotate(25 82 46)"><rect x="64" y="40" width="34" height="12" rx="2" fill="#4D96FF" stroke={INK} strokeWidth="3" /></g><path d="M56 36 l4 -8 M60 52 l6 6" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
  rainbow: (<>{[["#FF6B6B", 40], ["#FFD43B", 33], ["#6BCB77", 26], ["#4D96FF", 19]].map(([c, r]) => <path key={c as string} d={`M${60 - (r as number)} 70 A${r} ${r} 0 0 1 ${60 + (r as number)} 70`} fill="none" stroke={c as string} strokeWidth="7" />)}{cloud(22, 70, 0.6)}{cloud(98, 70, 0.6)}</>),
  sandcastle: (<>{sand}<path d="M40 70 L40 52 L48 52 L48 46 L56 46 L56 52 L64 52 L64 70 Z" fill="#E8C27A" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M60 72 Q78 50 104 60 Q90 62 86 72 Z" fill="#7CC8F0" stroke={INK} strokeWidth="3" strokeLinejoin="round" /></>),
  book: (<><path d="M24 30 L60 36 L96 30 L96 70 L60 76 L24 70 Z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" /><path d="M60 36 L60 76" stroke={INK} strokeWidth="3" /><Sparkle x={42} y={52} s={0.8} /><Sparkle x={98} y={20} s={0.8} /></>),
  boat: (<><ellipse cx="60" cy="66" rx="46" ry="12" fill="#9ED8FF" stroke={INK} strokeWidth="3" /><g transform="rotate(24 60 56)"><path d="M42 56 L78 56 L70 64 L50 64 Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M60 56 L60 40 L72 56" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" /></g><circle cx="40" cy="62" r="3" fill="none" stroke={INK} strokeWidth="2" /></>),
  music: (<><g fill={INK}><ellipse cx="40" cy="62" rx="9" ry="7" /><ellipse cx="78" cy="54" rx="9" ry="7" /></g><path d="M48 62 L48 26 L86 18 L86 54" fill="none" stroke={INK} strokeWidth="4" /><path d="M48 30 L86 22" stroke={INK} strokeWidth="6" /></>),
  thunder: (<>{cloud(60, 30, 1.4, "#B9C3D6")}<path d="M60 46 L50 64 L60 64 L54 82 L72 58 L62 58 L68 46 Z" fill="#FFD43B" stroke={INK} strokeWidth="3" strokeLinejoin="round" /></>),
  popup: (<><rect x="40" y="50" width="40" height="28" rx="3" fill="#FF9F43" stroke={INK} strokeWidth="3.5" /><path d="M60 50 l-6 -6 l12 -4 l-12 -4 l12 -4" fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><circle cx="60" cy="22" r="10" fill="#FFD43B" stroke={INK} strokeWidth="3" /><circle cx="56" cy="20" r="1.8" fill={INK} /><circle cx="64" cy="20" r="1.8" fill={INK} /><path d="M38 20 l-8 -4 M82 20 l8 -4" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
  footprint: (<>{paper(60, 46, 64, 50, doodle)}{[[48, 40], [66, 56]].map(([x, y]) => <g key={x} fill="#8A5A3C"><ellipse cx={x} cy={y} rx="6" ry="9" /><circle cx={x! - 4} cy={y! - 12} r="2.5" /><circle cx={x} cy={y! - 13} r="2.5" /><circle cx={x! + 4} cy={y! - 12} r="2.5" /></g>)}</>),
  shell: (<>{sand}<path d="M40 66 Q60 22 80 66 Z" fill="#FFC1D6" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M60 64 L60 34 M50 64 L56 36 M70 64 L64 36" stroke={INK} strokeWidth="2.5" /><Sparkle x={90} y={30} s={0.8} /></>),
  kite: (<><path d="M22 86 L28 50 M28 50 Q18 36 30 24 M28 50 Q40 40 48 46" fill="none" stroke="#8A5A3C" strokeWidth="5" strokeLinecap="round" /><circle cx="36" cy="30" r="20" fill="#7CC765" stroke={INK} strokeWidth="3" /><path d="M66 20 L82 36 L66 52 L50 36 Z" fill="#FF6B6B" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M66 52 Q74 64 66 72 Q60 80 68 86" fill="none" stroke={INK} strokeWidth="2" /></>),
  dog: (<><ellipse cx="54" cy="56" rx="26" ry="16" fill="#C98B52" stroke={INK} strokeWidth="3.5" /><circle cx="82" cy="42" r="14" fill="#C98B52" stroke={INK} strokeWidth="3.5" /><path d="M76 30 Q70 20 78 22 Z" fill="#8A5A3C" stroke={INK} strokeWidth="2.5" /><circle cx="86" cy="40" r="2.5" fill={INK} /><path d="M90 48 Q94 52 90 54" fill="#4A2545" stroke={INK} strokeWidth="2" /><path d="M100 30 l8 -6 M102 40 l10 0 M100 50 l8 6" stroke={INK} strokeWidth="3" strokeLinecap="round" /><path d="M36 70 L36 78 M64 70 L64 78" stroke={INK} strokeWidth="4" /></>),
  confetti: (<>{Array.from({ length: 16 }, (_, i) => <rect key={i} x={12 + ((i * 37) % 96)} y={10 + ((i * 23) % 64)} width="7" height="4" rx="1" fill={PETALS[i % 6]} stroke={INK} strokeWidth="1.5" transform={`rotate(${i * 40} ${15 + ((i * 37) % 96)} ${12 + ((i * 23) % 64)})`} />)}</>),
  truck: (<><rect x="30" y="40" width="40" height="24" rx="3" fill="#FF6B6B" stroke={INK} strokeWidth="3" /><path d="M70 48 L84 48 L90 58 L90 64 L70 64 Z" fill="#FFD43B" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><circle cx="42" cy="68" r="6" fill={INK} /><circle cx="80" cy="68" r="6" fill={INK} /><path d="M96 30 Q108 30 108 44" fill="none" stroke={INK} strokeWidth="3" /><path d="M104 40 L108 46 L112 40" fill="none" stroke={INK} strokeWidth="3" /></>),
  dark: (<><rect x="6" y="6" width="108" height="80" rx="8" fill="#2B2F5C" /><rect x="70" y="16" width="30" height="30" rx="3" fill="#3E4A86" stroke="#9AA6E0" strokeWidth="3" /><circle cx="85" cy="31" r="7" fill="#FFF6D0" /><circle cx="88" cy="28" r="6" fill="#3E4A86" /></>),
  letter: (<><rect x="28" y="30" width="64" height="42" rx="4" fill="#fff" stroke={INK} strokeWidth="3.5" /><path d="M28 30 L60 56 L92 30" fill="none" stroke={INK} strokeWidth="3" /><Heart x={60} y={64} s={1.1} /></>),
  spider: (<><path d="M60 4 L60 40" stroke={INK} strokeWidth="2" /><ellipse cx="60" cy="48" rx="10" ry="9" fill="#5B4A7A" stroke={INK} strokeWidth="3" /><path d="M50 44 l-12 -6 M50 50 l-12 2 M50 54 l-10 8 M70 44 l12 -6 M70 50 l12 2 M70 54 l10 8" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /><circle cx="56" cy="47" r="2.5" fill="#fff" /><circle cx="64" cy="47" r="2.5" fill="#fff" /></>),
  cake: (<><rect x="32" y="46" width="56" height="30" rx="5" fill="#FFC1D6" stroke={INK} strokeWidth="3.5" /><path d="M32 56 Q46 64 60 56 Q74 64 88 56" fill="none" stroke="#fff" strokeWidth="4" /><g stroke={INK} strokeWidth="2.5">{[46, 60, 74].map((x) => <rect key={x} x={x - 3} y="30" width="6" height="16" fill="#9FD8FF" />)}</g>{[46, 60, 74].map((x) => <path key={`f${x}`} d={`M${x} 20 Q${x + 5} 26 ${x} 30 Q${x - 5} 26 ${x} 20 Z`} fill="#FFD43B" stroke={INK} strokeWidth="2" />)}</>),
  sandwich: (<><path d="M10 74 Q60 62 110 74 L110 86 L10 86 Z" fill="#8A5A3C" /><g transform="rotate(-12 60 62)"><path d="M36 60 L84 60 L60 44 Z" fill="#F3D08A" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M38 60 L82 60" stroke="#6BCB77" strokeWidth="4" /></g><circle cx="40" cy="74" r="4" fill="#6B4430" /><circle cx="86" cy="76" r="5" fill="#6B4430" /></>),
  blocks: (<><Blocks x={42} y={76} /><Blocks x={78} y={76} fallen /><path d="M64 30 l-6 -8 M74 26 l2 -10" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
  bee: (<><ellipse cx="60" cy="46" rx="16" ry="11" fill="#FFD43B" stroke={INK} strokeWidth="3" /><path d="M56 36 L56 56 M64 36 L64 56" stroke={INK} strokeWidth="4" /><ellipse cx="54" cy="32" rx="8" ry="6" fill="#E8F6FF" stroke={INK} strokeWidth="2.5" /><ellipse cx="66" cy="32" rx="8" ry="6" fill="#E8F6FF" stroke={INK} strokeWidth="2.5" /><path d="M20 60 Q30 40 40 58 Q48 70 44 50" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="3 4" /></>),
  invite: (<><circle cx="44" cy="56" r="16" fill="#FFD43B" stroke={INK} strokeWidth="3.5" /><path d="M28 56 L60 56 M44 40 Q54 56 44 72" fill="none" stroke={INK} strokeWidth="3" /><path d="M78 60 Q76 40 86 30 M86 30 l-2 -10 M86 30 l6 -8 M86 30 l10 -2" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" /><circle cx="86" cy="30" r="8" fill="#B48CF0" stroke={INK} strokeWidth="3" /></>),
  lolly: (<><ellipse cx="62" cy="72" rx="28" ry="8" fill="#FFB3D1" stroke={INK} strokeWidth="3" /><path d="M54 70 L74 30" stroke="#E6B27A" strokeWidth="6" strokeLinecap="round" />{sun(24, 22)}</>),
  ball: (<><circle cx="82" cy="40" r="16" fill="#FF6B6B" stroke={INK} strokeWidth="3.5" /><path d="M66 40 L98 40 M82 24 Q92 40 82 56" fill="none" stroke="#fff" strokeWidth="3" /><path d="M40 56 Q56 50 66 46" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" /><circle cx="36" cy="58" r="8" fill="#C7B2FF" stroke={INK} strokeWidth="3" /></>),
  wave: (<>{sand}<path d="M10 60 Q30 20 60 30 Q86 38 80 58 Q72 46 60 50 Q50 54 52 68 L10 68 Z" fill="#7CC8F0" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M60 30 Q70 24 76 30" stroke="#fff" strokeWidth="3" fill="none" /></>),
  puzzle: (<><g stroke={INK} strokeWidth="3">{[[30, 26], [60, 26], [30, 54], [60, 54]].map(([x, y], i) => <rect key={i} x={x} y={y} width="30" height="28" rx="3" fill={PETALS[i]} />)}</g><Sparkle x={100} y={24} s={0.8} /></>),
  tower: (<><Blocks x={34} y={78} /><g transform="rotate(30 74 60)"><Blocks x={74} y={78} /></g><path d="M96 28 q6 -4 10 0 M92 40 q8 -2 12 4" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
  party: (<><rect x="62" y="14" width="40" height="66" rx="3" fill="#FFF8EE" stroke={INK} strokeWidth="3" /><path d="M10 14 Q30 30 50 14 Q70 30 90 14" fill="none" stroke={INK} strokeWidth="2.5" />{[[20, 22, "#FF6B6B"], [40, 22, "#FFD43B"], [70, 22, "#4D96FF"]].map(([x, y, c]) => <path key={x as number} d={`M${x} ${y} l6 10 l-12 0 Z`} fill={c as string} stroke={INK} strokeWidth="2" />)}{balloon(30, 50, "#FF8FB1")}{balloon(48, 46, "#9FD8FF")}</>),
  teddy: (<><rect x="22" y="48" width="76" height="22" rx="6" fill="#9FD8FF" stroke={INK} strokeWidth="3" /><rect x="26" y="40" width="22" height="12" rx="5" fill="#fff" stroke={INK} strokeWidth="3" /><g fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="3 4"><circle cx="76" cy="36" r="10" /><circle cx="68" cy="26" r="4" /><circle cx="84" cy="26" r="4" /></g><path d="M100 24 q4 -10 10 -4 q2 6 -6 8 l0 4" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
  home: (<><circle cx="88" cy="28" r="18" fill="#fff" stroke={INK} strokeWidth="3.5" /><path d="M88 28 L88 16 M88 28 L96 32" stroke={INK} strokeWidth="3" strokeLinecap="round" /><rect x="14" y="56" width="56" height="20" rx="4" fill="#F7D9A0" stroke={INK} strokeWidth="3" /><path d="M30 56 L34 44 L38 56" fill="#FF6B6B" stroke={INK} strokeWidth="2.5" /><circle cx="52" cy="54" r="5" fill="#4D96FF" stroke={INK} strokeWidth="2.5" /></>),
  fireworks: (<><rect x="6" y="6" width="108" height="80" rx="8" fill="#2B2F5C" />{[[38, 34, "#FFD43B"], [80, 28, "#FF8FB1"], [64, 60, "#9FD8FF"]].map(([x, y, c]) => <g key={x as number} transform={`translate(${x} ${y})`} stroke={c as string} strokeWidth="3" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M0 -5 L0 -13" transform={`rotate(${a})`} />)}</g>)}</>),
  seat: (<><path d="M40 30 L40 76 M76 54 L76 76 M40 54 L76 54" stroke={INK} strokeWidth="4" strokeLinecap="round" /><rect x="36" y="50" width="44" height="8" rx="3" fill="#FF9F43" stroke={INK} strokeWidth="3" /><rect x="36" y="22" width="10" height="34" rx="3" fill="#FF9F43" stroke={INK} strokeWidth="3" /><rect x="52" y="34" width="22" height="18" rx="4" fill="#6BCB77" stroke={INK} strokeWidth="3" /><path d="M58 34 Q63 26 68 34" fill="none" stroke={INK} strokeWidth="2.5" /></>),
  drawing: (<>{paper(60, 46, 66, 52, <><Heart x={0} y={0} s={1.6} /><Sparkle x={-22} y={-14} s={0.6} /></>, -4)}</>),
  wind: (<>{paper(84, 30, 34, 26, doodle, 25)}<path d="M10 40 Q34 30 50 40 Q60 46 56 52 M14 56 Q38 50 54 58" fill="none" stroke="#7CB7E8" strokeWidth="4" strokeLinecap="round" /></>),
  van: (<>{ground}<rect x="52" y="34" width="50" height="34" rx="6" fill="#fff" stroke={INK} strokeWidth="3.5" /><path d="M64 34 Q77 22 90 34" fill="#FFB3D1" stroke={INK} strokeWidth="3" /><circle cx="64" cy="70" r="6" fill={INK} /><circle cx="92" cy="70" r="6" fill={INK} /><path d="M20 50 L40 50 M24 60 L42 60" stroke={INK} strokeWidth="3" strokeLinecap="round" /></>),
  beach: (<>{sand}<path d="M6 54 Q60 48 114 54 L114 66 Q60 60 6 66 Z" fill="#7CC8F0" />{sun(96, 20)}<path d="M36 70 L40 50 L56 50 L60 70 Z" fill="#FF6B6B" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M40 50 Q48 38 56 50" fill="none" stroke={INK} strokeWidth="2.5" /><path d="M72 72 L82 40" stroke="#8A5A3C" strokeWidth="4" /><path d="M80 40 L90 36 L86 46 Z" fill="#FFD43B" stroke={INK} strokeWidth="2.5" /></>),
  crayons: (<><g stroke={INK} strokeWidth="2.5">{["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD43B", "#C7B2FF"].map((c, i) => <rect key={c} x={18 + i * 18} y={52 + (i % 2) * 10} width="26" height="8" rx="3" fill={c} transform={`rotate(${i * 37 - 50} ${30 + i * 18} ${56 + (i % 2) * 10})`} />)}</g><rect x="70" y="18" width="30" height="22" rx="3" fill="#FFD43B" stroke={INK} strokeWidth="3" transform="rotate(-20 85 29)" /></>),
  alone: (<>{ground}{kid(78, 54, CREW.zuzu, 0.5)}{kid(100, 56, CREW.bobbo, 0.5)}<circle cx="90" cy="30" r="6" fill="#FF6B6B" stroke={INK} strokeWidth="2.5" /><path d="M14 60 L54 60" stroke={INK} strokeWidth="2" strokeDasharray="4 5" /></>),
  knee: (<><ellipse cx="60" cy="48" rx="34" ry="24" fill="#FFE2CC" stroke={INK} strokeWidth="3.5" /><rect x="46" y="40" width="28" height="14" rx="5" fill="#FFF0B3" stroke={INK} strokeWidth="3" /><path d="M54 47 L66 47 M60 42 L60 52" stroke="#FF9F43" strokeWidth="2.5" /></>),
  snack: (<><rect x="28" y="36" width="64" height="38" rx="8" fill="#9FD8FF" stroke={INK} strokeWidth="3.5" /><rect x="34" y="42" width="52" height="26" rx="5" fill="#E8F6FF" stroke={INK} strokeWidth="2.5" /><path d="M48 30 Q60 20 72 30" fill="none" stroke={INK} strokeWidth="3.5" /></>),
  game: (<><rect x="20" y="24" width="80" height="54" rx="6" fill="#FFF0B3" stroke={INK} strokeWidth="3.5" />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={28 + i * 14} y={60 - i * 7} width="12" height="10" rx="2" fill={PETALS[i]} stroke={INK} strokeWidth="2" />)}<rect x="80" y="30" width="14" height="14" rx="3" fill="#fff" stroke={INK} strokeWidth="2.5" /><circle cx="87" cy="37" r="2" fill={INK} /></>),
  shoelace: (<><path d="M24 70 L24 48 Q24 36 40 36 L62 36 Q96 44 98 70 Z" fill="#4D96FF" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" /><path d="M50 40 Q40 26 30 32 M56 40 Q72 22 82 32 Q74 44 60 46 Q52 30 44 40" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" /><path d="M50 40 Q40 26 30 32 M56 40 Q72 22 82 32" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" /></>),
  slide: (<>{ground}<path d="M28 76 L28 22 M44 76 L44 22 M28 34 L44 34 M28 50 L44 50" stroke={INK} strokeWidth="3.5" /><path d="M44 22 Q70 30 96 74" fill="none" stroke="#FF9F43" strokeWidth="9" strokeLinecap="round" />{kid(24, 64, CREW.gloop, 0.4)}{kid(10, 66, CREW.rumble, 0.35)}</>),
  scribble: (<>{paper(60, 46, 66, 52, <><circle cx="-12" cy="-6" r="8" fill="#FFD43B" /><path d="M-26 10 q10 -18 18 0 t18 0 t18 -6 M-20 -16 q14 10 26 -4 q8 14 18 4" fill="none" stroke="#5B4A7A" strokeWidth="3" strokeLinecap="round" /></>)}</>),
  swingline: (<><path d="M70 10 L110 10" stroke="#8A5A3C" strokeWidth="5" strokeLinecap="round" /><path d="M82 10 L80 50 M100 10 L98 50" stroke={INK} strokeWidth="2.5" /><rect x="76" y="48" width="26" height="6" rx="2" fill="#FF9F43" stroke={INK} strokeWidth="2.5" />{ground}{kid(18, 64, CREW.puff, 0.4)}{kid(36, 64, CREW.bobbo, 0.4)}{kid(54, 64, CREW.hoot, 0.4)}</>),
  paint: (<><rect x="14" y="66" width="92" height="10" rx="3" fill="#C98B52" stroke={INK} strokeWidth="3" /><g transform="rotate(70 44 52)"><path d="M32 40 L56 40 L52 62 L36 62 Z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" /></g><path d="M50 62 Q64 50 84 60 Q100 62 92 66 L50 66 Z" fill="#4D96FF" stroke={INK} strokeWidth="3" strokeLinejoin="round" /></>),
  school: (<><path d="M24 76 L24 38 L60 18 L96 38 L96 76 Z" fill="#FFC75A" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" /><rect x="50" y="52" width="20" height="24" rx="2" fill="#8A5A3C" stroke={INK} strokeWidth="3" /><circle cx="60" cy="36" r="7" fill="#fff" stroke={INK} strokeWidth="2.5" /><rect x="78" y="56" width="22" height="20" rx="5" fill="#FF6B6B" stroke={INK} strokeWidth="3" /></>),
  medal: (<><path d="M48 10 L60 36 L72 10" fill="none" stroke="#4D96FF" strokeWidth="7" /><circle cx="60" cy="50" r="16" fill="#FFD43B" stroke={INK} strokeWidth="3.5" /><path d="M60 40 L63 47 L70 47 L64 52 L66 59 L60 55 L54 59 L56 52 L50 47 L57 47 Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M10 80 L110 80" stroke={INK} strokeWidth="3" strokeDasharray="8 6" /></>),
  rain: (<>{cloud(60, 22, 1.3, "#B9C3D6")}<g stroke="#4D96FF" strokeWidth="3" strokeLinecap="round">{[30, 46, 62, 78, 94].map((x, i) => <path key={x} d={`M${x} ${42 + (i % 2) * 6} l-3 8`} />)}</g><path d="M18 74 L102 74 L94 84 L26 84 Z" fill="#FF8FB1" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M40 74 L46 84 M62 74 L62 84 M82 74 L76 84" stroke="#fff" strokeWidth="3" /></>),
  fair: (<><circle cx="60" cy="40" r="28" fill="none" stroke={INK} strokeWidth="3.5" />{[0, 60, 120, 180, 240, 300].map((a, i) => <g key={a} transform={`rotate(${a} 60 40)`}><path d="M60 40 L60 12" stroke={INK} strokeWidth="2" /><rect x="54" y="6" width="12" height="9" rx="2" fill={PETALS[i]} stroke={INK} strokeWidth="2" /></g>)}<path d="M50 80 L60 40 L70 80" fill="none" stroke={INK} strokeWidth="3.5" /></>),
  bike: (<><circle cx="36" cy="62" r="16" fill="none" stroke={INK} strokeWidth="4" /><circle cx="86" cy="62" r="16" fill="none" stroke={INK} strokeWidth="4" /><path d="M36 62 L54 40 L76 40 L86 62 M54 40 L62 62 L76 40 M50 34 L60 34 M76 40 L80 28" fill="none" stroke="#FF6B6B" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /><Sparkle x={104} y={22} s={0.7} /></>),
  stage: (<><rect x="6" y="6" width="108" height="80" rx="6" fill="#FFE9C2" /><path d="M6 6 L44 6 Q30 46 40 86 L6 86 Z M114 6 L76 6 Q90 46 80 86 L114 86 Z" fill="#E5484D" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M60 46 L60 76" stroke={INK} strokeWidth="3" /><ellipse cx="60" cy="42" rx="5" ry="7" fill="#5B4A7A" stroke={INK} strokeWidth="2.5" /></>),
  tag: (<>{ground}{kid(56, 54, CREW.zuzu, 0.45)}{kid(78, 50, CREW.puff, 0.45)}{kid(100, 54, CREW.rumble, 0.45)}<path d="M64 38 l8 -2 M88 34 l8 -2" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /><path d="M14 64 L40 64" stroke={INK} strokeWidth="2" strokeDasharray="4 5" /></>),
  suitcase: (<><rect x="30" y="34" width="60" height="42" rx="6" fill="#4D96FF" stroke={INK} strokeWidth="3.5" /><path d="M50 34 L50 26 L70 26 L70 34" fill="none" stroke={INK} strokeWidth="3.5" /><path d="M30 50 L90 50" stroke="#fff" strokeWidth="3" /><path d="M96 20 Q110 30 104 46" fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="3 4" /></>),
  helper: (<><circle cx="78" cy="40" r="18" fill="#FFD43B" stroke={INK} strokeWidth="3.5" /><path d="M78 30 L81 37 L88 37 L82 42 L84 49 L78 45 L72 49 L74 42 L68 37 L75 37 Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M70 58 L66 76 M86 58 L90 76" stroke="#FF6B6B" strokeWidth="5" />{kid(30, 56, CREW.zuzu, 0.55)}</>),
  cupcake: (<><path d="M40 52 L80 52 L74 78 L46 78 Z" fill="#9FD8FF" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" /><path d="M38 52 Q38 32 60 30 Q82 32 82 52 Z" fill="#FFC1D6" stroke={INK} strokeWidth="3.5" /><circle cx="60" cy="26" r="5" fill="#FF6B6B" stroke={INK} strokeWidth="2.5" /><ellipse cx="60" cy="80" rx="34" ry="5" fill="#fff" stroke={INK} strokeWidth="2.5" /></>),
  pool: (<><rect x="10" y="40" width="100" height="40" rx="8" fill="#7CC8F0" stroke={INK} strokeWidth="3.5" /><path d="M18 56 Q30 50 42 56 T66 56 T90 56 T112 56" fill="none" stroke="#fff" strokeWidth="3" /><path d="M90 40 L90 18 M100 40 L100 18 M90 26 L100 26 M90 34 L100 34" stroke={INK} strokeWidth="3" /></>),
  picnic: (<>{cloud(60, 22, 1.2, "#B9C3D6")}<g stroke="#4D96FF" strokeWidth="3" strokeLinecap="round">{[34, 52, 70, 88].map((x) => <path key={x} d={`M${x} 42 l-3 8`} />)}</g><rect x="30" y="58" width="60" height="22" rx="4" fill="#FFC75A" stroke={INK} strokeWidth="3" /><path d="M48 58 Q60 48 72 58" fill="none" stroke={INK} strokeWidth="3" /></>),
  puppy: (<><ellipse cx="56" cy="60" rx="22" ry="13" fill="#E6B27A" stroke={INK} strokeWidth="3.5" /><circle cx="80" cy="46" r="13" fill="#E6B27A" stroke={INK} strokeWidth="3.5" /><path d="M72 36 Q64 40 70 50 Z" fill="#8A5A3C" stroke={INK} strokeWidth="2.5" /><circle cx="84" cy="44" r="2.5" fill={INK} /><path d="M84 52 Q88 58 92 52" fill="#FF8FB1" stroke={INK} strokeWidth="2" /><path d="M34 56 Q24 46 28 40" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" /><path d="M18 32 l-6 -4 M22 26 l-2 -8" stroke={INK} strokeWidth="2.5" strokeLinecap="round" /></>),
};

export function ScenePicture({ id }: { id: PropId }) {
  return (
    <svg className="fg-prop-svg" viewBox="0 0 120 90" aria-hidden="true">
      {PROP_ART[id]}
    </svg>
  );
}

// ------------------------------------------------------------------ flower beds

/** A friend's flower bed: buds that open when the friend feels understood. */
export function FlowerBed({ bloom, colour }: { bloom: boolean; colour: string }) {
  const tones = [colour, "#FFD43B", PETALS[0], colour, PETALS[2]];
  return (
    <svg className={`fg-bed-svg ${bloom ? "is-bloom" : ""}`} viewBox="0 0 220 90" aria-hidden="true">
      <ellipse cx="110" cy="74" rx="104" ry="16" fill={SOIL} stroke={INK} strokeWidth="4" />
      <ellipse cx="110" cy="70" rx="92" ry="9" fill="#A06E4C" />
      {[30, 70, 110, 150, 190].map((x, i) => (
        <g key={x} className="fg-bud" style={{ "--i": i } as React.CSSProperties} transform={`translate(${x} ${66 - (i % 2) * 6})`}>
          <path d="M0 0 L0 -26" stroke="#3E8E41" strokeWidth="5" strokeLinecap="round" />
          <path d="M0 -12 C8 -20 16 -18 18 -14 C12 -8 6 -8 0 -12 Z" fill={LEAF} stroke={INK} strokeWidth="2.5" />
          <g className="fg-bud-closed" transform="translate(0 -30)"><path d="M0 -12 C8 -6 8 6 0 8 C-8 6 -8 -6 0 -12 Z" fill="#7CC765" stroke={INK} strokeWidth="3" /></g>
          <g className="fg-bud-open" transform="translate(0 -32)">
            {Array.from({ length: 6 }, (_, k) => <ellipse key={k} cx="0" cy="-10" rx="7" ry="10" transform={`rotate(${k * 60})`} fill={tones[i]} stroke={INK} strokeWidth="2.5" />)}
            <circle r="6" fill="#FFE27A" stroke={INK} strokeWidth="2.5" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** The garden row: one little bed per friend helped this round. */
export function GardenRow({ done, total }: { done: number; total: number }) {
  return (
    <div className="fg-row" role="img" aria-label={`${done} of ${total} flower beds blooming`} data-testid="garden-row" data-done={done}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} className={`fg-mini-bed ${i < done ? "is-bloom" : ""}`} viewBox="0 0 40 30" aria-hidden="true">
          <ellipse cx="20" cy="25" rx="17" ry="5" fill={SOIL} stroke={INK} strokeWidth="2" />
          {i < done ? (
            <g transform="translate(20 13)">
              {Array.from({ length: 5 }, (_, k) => <ellipse key={k} cx="0" cy="-5" rx="4" ry="5" transform={`rotate(${k * 72})`} fill={PETALS[i % PETALS.length]} stroke={INK} strokeWidth="1.5" />)}
              <circle r="3" fill="#FFE27A" stroke={INK} strokeWidth="1.5" />
            </g>
          ) : (
            <path d="M20 22 L20 14 M20 16 q4 -4 7 -2" stroke="#3E8E41" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          )}
        </svg>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ breathing flower

export function BreathFlowerArt({ breaths }: { breaths: number }) {
  return (
    <svg className="fg-breath-svg" viewBox="-110 -110 220 220" aria-hidden="true">
      <g className="fg-breath-petals">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-58" rx="26" ry="40" transform={`rotate(${i * 45})`} fill={i < Math.min(8, Math.round((breaths * 8) / 3)) ? PETALS[i % 3] : "#FFE6D6"} stroke={INK} strokeWidth="4" />
        ))}
      </g>
      <circle r="40" fill="#FFF3C4" stroke={INK} strokeWidth="5" />
      <Face face="content" eyes={[{ cx: -13, cy: -6, r: 8, s: -1 }, { cx: 13, cy: -6, r: 8, s: 1 }]} mouth={{ x: 0, y: 14, s: 0.7 }} skin="#FFF3C4" cheeks={[[-24, 8], [24, 8]]} />
    </svg>
  );
}

/** The breathing-flower button icon (a closed tulip). */
export function TulipIcon() {
  return (
    <svg className="fg-tulip" viewBox="0 0 60 60" aria-hidden="true">
      <path d="M30 34 L30 56" stroke="#3E8E41" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 48 C38 40 46 42 48 44 C42 52 36 52 30 48 Z" fill={LEAF} stroke={INK} strokeWidth="2.5" />
      <path d="M16 14 L23 22 L30 10 L37 22 L44 14 C46 30 40 38 30 38 C20 38 14 30 16 14 Z" fill={PETALS[0]} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ sticker + skin stubs

/** Bloom Badge: a round flower with Snug's ears as two of its petals. */
export function BloomBadge() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-svg" role="img" aria-label="Bloom Badge sticker: a flower with Snug's ears as two petals">
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="100" fill="#FFF1E8" />
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx="120" cy="64" rx="24" ry="34" transform={`rotate(${60 + i * 48} 120 124)`} fill={PETALS[i]} stroke={INK} strokeWidth="5" />
      ))}
      {/* Snug's ears: the two top petals */}
      <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
        <path d="M96 92 C66 82 60 46 80 38 C102 30 118 60 116 84 Z" fill={PEACH} />
        <path d="M144 92 C174 82 180 46 160 38 C138 30 122 60 124 84 Z" fill={PEACH} />
      </g>
      <path d="M100 82 C80 74 76 52 86 48 C98 44 108 62 108 78 Z" fill={PLUM} />
      <path d="M140 82 C160 74 164 52 154 48 C142 44 132 62 132 78 Z" fill={PLUM} />
      <circle cx="120" cy="124" r="40" fill={PEACH} stroke={INK} strokeWidth="5" />
      <circle cx="106" cy="116" r="6" fill={INK} /><circle cx="134" cy="116" r="6" fill={INK} />
      <circle cx="108" cy="114" r="2" fill="#fff" /><circle cx="136" cy="114" r="2" fill="#fff" />
      <ellipse cx="120" cy="130" rx="10" ry="6.5" fill={PLUM} />
      <path d="M110 142 Q120 150 130 142" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="96" cy="136" rx="7" ry="4" fill="#FF8A7A" opacity="0.7" /><ellipse cx="144" cy="136" rx="7" ry="4" fill="#FF8A7A" opacity="0.7" />
      <Sparkle x={46} y={60} /><Sparkle x={196} y={182} s={0.8} />
    </svg>
  );
}

/** Prompt-pill icon and option art lookup. */
export function FgObject({ kind }: { kind: string }) {
  if (kind.startsWith("fg-")) return <FriendIcon friend={kind.slice(3) as FriendId} />;
  if (kind.startsWith("flower-") && isFeeling(kind.slice(7))) return <FlowerFace feeling={kind.slice(7) as FeelingId} petal={PETALS[0]} />;
  if (kind.startsWith("card-") && isAction(kind.slice(5))) return <IdeaCard id={kind.slice(5) as ActionId} />;
  return <TulipIcon />;
}
export function NoBasket() {
  return <svg viewBox="0 0 10 10" aria-hidden="true" />;
}
