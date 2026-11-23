import type { ComponentType } from "react";
import "./library-characters.css";
import type { HostProps } from "./kit";
import { Brix } from "./Brix";
import { Budge } from "./Budge";
import { Dabble } from "./Dabble";
import { Fenn } from "./Fenn";
import { Ripple } from "./Ripple";
import { Sarah } from "./Sarah";
import { Snug } from "./Snug";
import { Toggle } from "./Toggle";
import { Yonder } from "./Yonder";
import { Zephy } from "./Zephy";
import { Ziggy } from "./Ziggy";

/**
 * Library hosts: one recurring host per subject library (docs/curriculum/CHARACTERS.md, docs/CHARACTER_SYSTEM.md).
 * `id` matches the Character id declared in src/content/packs/library-hosts, so worlds can list them in
 * `characters` and the map/cards can draw them (src/daily/critters.tsx).
 */
export interface LibraryHost {
  id: string;
  name: string;
  /** Library id from docs/curriculum/README.md (cs, pilot, money, ...). */
  library: string;
  Component: ComponentType<HostProps>;
}

export const LIBRARY_HOSTS: readonly LibraryHost[] = [
  { id: "toggle", name: "Toggle", library: "cs", Component: Toggle },
  { id: "zephy", name: "Zephy", library: "pilot", Component: Zephy },
  { id: "budge", name: "Budge", library: "money", Component: Budge },
  { id: "fenn", name: "Fenn", library: "cyber", Component: Fenn },
  { id: "dabble", name: "Dabble", library: "sci", Component: Dabble },
  { id: "yonder", name: "Yonder", library: "geo", Component: Yonder },
  { id: "snug", name: "Snug", library: "sel", Component: Snug },
  { id: "brix", name: "Brix", library: "engr", Component: Brix },
  { id: "ripple", name: "Ripple", library: "nature", Component: Ripple },
  // Path hosts (owner decision): drawn and registered, not yet wired as hosts; library-pilot / library-english
  // still name zephy / hoot until the integrator swaps them.
  { id: "ziggy", name: "Ziggy", library: "pilot", Component: Ziggy },
  { id: "sarah", name: "Sarah", library: "english", Component: Sarah },
];

export const getLibraryHost = (id: string): LibraryHost | undefined => LIBRARY_HOSTS.find((h) => h.id === id);

export { Brix, Budge, Dabble, Fenn, Ripple, Sarah, Snug, Toggle, Yonder, Zephy, Ziggy };
export type { HostProps };
