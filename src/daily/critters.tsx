import { Bobbo } from "../characters/Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../characters/Crew";
import { LIBRARY_HOSTS } from "../characters/library";
import type { World } from "../content/types";

/** Host character art for a world (first character); unknown hosts (new packs) fall back to Bobbo. */
const CRITTERS: Record<string, (p: { size: string }) => React.JSX.Element> = {
  bobbo: (p) => <Bobbo state="idle" {...p} />,
  gloop: Gloop,
  puff: Puff,
  rumble: Rumble,
  zuzu: Zuzu,
  hoot: Hoot,
  ...Object.fromEntries(LIBRARY_HOSTS.map(({ id, Component }) => [id, (p: { size: string }) => <Component state="idle" {...p} />])),
};

export function Critter({ id }: { id: string }) {
  const C = CRITTERS[id] ?? CRITTERS.bobbo!;
  return <C size="100%" />;
}

export const hostOf = (w: World | undefined): string => w?.characters[0] ?? "bobbo";
