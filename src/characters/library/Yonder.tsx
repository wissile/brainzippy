import { useId } from "react";
import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Yonder — Geography and world-cultures host (proposed as "Pico"; renamed, see docs/CHARACTER_SYSTEM.md).
 * A warm-brown hermit crab who carries a little globe as her shell, covered in travel stickers; big eyes on
 * short stalks and two round claws. The land shapes are invented blobs, not a real map.
 */
const BROWN = "#A8714A";
const BROWN_DK = "#7E512F";
const CLAW = "#C98A5C";
const OCEAN = "#4FA3E3";
const LAND = "#8CCB5E";

/** One strip of invented continents; drawn twice side by side so it can scroll for the spin. */
const Land = ({ dx = 0 }: { dx?: number }) => (
  <g transform={`translate(${dx} 0)`} fill={LAND} stroke={INK} strokeWidth="3">
    <path d="M62 70 C74 60 92 64 96 76 C100 88 88 92 90 104 C92 116 78 122 70 112 C62 102 52 96 54 84 C55 76 58 73 62 70 Z" />
    <path d="M116 112 C126 104 142 108 146 120 C150 132 140 146 128 148 C118 150 108 140 110 128 C111 120 112 116 116 112 Z" />
    <path d="M128 66 C136 60 150 62 154 70 C156 78 146 82 138 80 C132 79 126 72 128 66 Z" />
    <path d="M78 140 C86 136 96 140 96 148 C96 156 86 160 80 156 C74 152 72 144 78 140 Z" />
  </g>
);

export function Yonder({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  const clip = `yonder-globe-${useId().replace(/:/g, "")}`;
  return (
    <Frame id="yonder" label="Yonder, a brown hermit crab with a sticker-covered globe for a shell" state={state} size={size} className={className} blink={f.blink} talking={f.talking} shadowRx={72}>
      {/* globe shell */}
      <g className="shell">
        <clipPath id={clip}><circle cx="118" cy="110" r="62" /></clipPath>
        <circle cx="118" cy="110" r="62" fill={OCEAN} />
        <g clipPath={`url(#${clip})`}>
          <g className="globe-land">
            <Land /><Land dx={124} />
          </g>
          <path d="M118 48 C94 70 94 150 118 172 M118 48 C142 70 142 150 118 172 M56 110 H180" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" />
        </g>
        <circle cx="118" cy="110" r="62" fill="none" stroke={INK} strokeWidth="5.5" />
        <Shine d="M74 82 C78 68 88 58 100 54" o={0.6} />
        {/* travel stickers */}
        <g className="stickers">
          <path className="sticker" d="M150 64 L154 73 L164 74 L157 81 L159 91 L150 86 L141 91 L143 81 L136 74 L146 73 Z" fill="#FFD43B" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <g className="sticker">
            <rect x="152" y="112" width="22" height="22" rx="3" fill="#fff" stroke={INK} strokeWidth="3.5" strokeDasharray="4 2.2" />
            <circle cx="163" cy="123" r="5.5" fill="#FF6B6B" />
          </g>
          <path className="sticker" d="M106 66 C106 60 114 58 116 64 C118 58 126 60 126 66 C126 73 116 78 116 78 C116 78 106 73 106 66 Z" fill="#FF8FB1" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        </g>
      </g>
      {/* legs */}
      <g stroke={INK} strokeWidth="5" fill={BROWN_DK}>
        <ellipse cx="46" cy="204" rx="11" ry="7" /><ellipse cx="70" cy="207" rx="11" ry="7" />
        <ellipse cx="112" cy="207" rx="11" ry="7" /><ellipse cx="136" cy="204" rx="11" ry="7" />
      </g>
      {/* claws */}
      <g className="claw claw-l">
        <path d="M40 172 C20 176 6 160 12 142 C18 150 26 152 30 146 C30 136 42 132 50 140 C54 154 50 168 40 172 Z" fill={CLAW} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      </g>
      <g className="claw claw-r">
        <path d="M160 176 C180 180 194 164 188 146 C182 154 174 156 170 150 C170 140 158 136 150 144 C146 158 150 172 160 176 Z" fill={CLAW} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      </g>
      {/* body peeking out of the shell */}
      <path d="M30 178 C30 152 56 142 92 142 C128 142 156 154 156 180 C156 198 132 206 92 206 C52 206 30 198 30 178 Z" fill={BROWN} stroke={INK} strokeWidth="5.5" />
      <Shine d="M46 166 C50 158 58 152 68 150" w={5} o={0.45} />
      {/* eye stalks */}
      <g className="eyes">
        <g className="stalk stalk-l">
          <path d="M76 150 L72 120" stroke={INK} strokeWidth="13" strokeLinecap="round" />
          <path d="M76 150 L72 120" stroke={BROWN} strokeWidth="5.5" strokeLinecap="round" />
          <Eye cx={70} cy={110} r={17} asleep={f.asleep} />
        </g>
        <g className="stalk stalk-r">
          <path d="M108 150 L112 120" stroke={INK} strokeWidth="13" strokeLinecap="round" />
          <path d="M108 150 L112 120" stroke={BROWN} strokeWidth="5.5" strokeLinecap="round" />
          <Eye cx={114} cy={110} r={17} asleep={f.asleep} />
        </g>
      </g>
      <g className="face">
        <Cheeks y={170} l={62} r={124} rx={8} />
        <MouthShape mouth={f.mouth} cx={93} cy={174} s={0.85} />
      </g>
      {f.asleep && <Zz x={150} y={34} />}
    </Frame>
  );
}
