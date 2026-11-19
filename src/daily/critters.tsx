import { Bobbo } from "../characters/Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../characters/Crew";
import { LIBRARY_HOSTS } from "../characters/library";
import type { World } from "../content/types";

/**
 * Host character art by character id. Hosts whose art isn't wired here yet (new library hosts drawn on another
 * branch) show a neutral egg in the library's colour instead of borrowing another character's face.
 * New library hosts are wired through LIBRARY_HOSTS (src/characters/library, branch p2-characters) or `<id>: Component` below.
 */
const CRITTERS: Record<string, (p: { size: string }) => React.JSX.Element> = {
  bobbo: (p) => <Bobbo state="idle" {...p} />,
  gloop: Gloop,
  puff: Puff,
  rumble: Rumble,
  zuzu: Zuzu,
  hoot: Hoot,
  ...Object.fromEntries(LIBRARY_HOSTS.map(({ id, Component }) => [id, (p: { size: string }) => <Component state="idle" {...p} />])),
};

export const hasCritterArt = (id: string): boolean => id in CRITTERS;

/** A soft, original "still hatching" egg: the stand-in for a host without art yet. Decorative (aria-hidden by callers). */
export function HostEgg({ color = "#FFD43B" }: { color?: string }) {
  return (
    <svg className="critter host-egg" viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true" focusable="false">
      <ellipse cx="100" cy="186" rx="52" ry="9" fill="#2B2140" opacity="0.15" />
      <g className="host-egg-body">
        <path d="M100 22 C146 22 170 92 170 126 C170 164 139 184 100 184 C61 184 30 164 30 126 C30 92 54 22 100 22 Z" fill={color} stroke="#2B2140" strokeWidth="5.5" strokeLinejoin="round" />
        <path d="M64 70 C72 50 84 40 96 37" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.7" />
        <path d="M44 118 L66 106 L82 122 L100 104 L118 122 L134 106 L156 118" fill="none" stroke="#2B2140" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="78" cy="146" r="7" fill="#fff" opacity="0.55" />
        <circle cx="124" cy="156" r="5" fill="#fff" opacity="0.55" />
      </g>
    </svg>
  );
}

export function Critter({ id, color }: { id: string; color?: string }) {
  const C = CRITTERS[id];
  return C ? <C size="100%" /> : <HostEgg color={color} />;
}

export const hostOf = (w: World | undefined): string => w?.characters[0] ?? "bobbo";
