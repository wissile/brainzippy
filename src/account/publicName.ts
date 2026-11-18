/**
 * Public names: what OTHER families see for a child (friends, leaderboard, challenges). Built only from the two
 * curated pick lists below, so it can never contain a real name or anything a child typed. The child's own screens
 * keep the monster name they typed; that name stays on the device and is never sent to the server.
 *
 * - Default: derived deterministically from the child profile id (same id → same name, on server and client).
 * - The parent can pick another combination in the /parents dashboard (validated against these lists server-side).
 * - Lists are curated: kind, playful words only; tests/unit/public-name.test.ts checks that no combination contains a
 *   blocked word (across the word boundary too) and that initials don't spell anything.
 * Append new words at the END of a list only: reordering would change every child's default name.
 */
export const PUBLIC_ADJECTIVES = [
  "Sparkly", "Bouncy", "Cosy", "Giggly", "Jolly", "Breezy", "Sunny", "Twinkly", "Zippy", "Snappy",
  "Twirly", "Fluffy", "Cheery", "Dreamy", "Glowy", "Happy", "Lucky", "Merry", "Peppy", "Plucky",
  "Rosy", "Shiny", "Snoozy", "Starry", "Swirly", "Toasty", "Hoppy", "Zesty", "Frosty", "Minty",
  "Misty", "Mellow", "Nimble", "Brave", "Cosmic", "Gentle", "Curious", "Friendly", "Calm", "Bright",
] as const;

export const PUBLIC_CREATURES = [
  "Gloop-a-saur", "Wigglewump", "Puffaroo", "Zoomkin", "Bramblebug", "Fizzlewing", "Muddlepup", "Huggamoth", "Bobblefin", "Noodlehorn",
  "Pebblebeak", "Jumblejay", "Flutterfox", "Drizzledrake", "Crumblecrab", "Tumbleturtle", "Nibblenewt", "Wobblewhale", "Rocketsnail", "Quibblequail",
  "Doodledragon", "Mumblemouse", "Hammocksloth", "Hopscotch-hare", "Ziggleyak", "Cuddlecricket", "Puddlepenguin", "Glimmerowl", "Rumbleroo", "Ripplefish",
  "Marshmole", "Picklepuff", "Waffleworm", "Jellyjumper", "Cloudcamel", "Biscuitbadger", "Mosslemoose", "Thistlethrush", "Pompomgoat", "Lanternlizard",
] as const;

export type PublicAdjective = (typeof PUBLIC_ADJECTIVES)[number];
export type PublicCreature = (typeof PUBLIC_CREATURES)[number];

/** FNV-1a 32-bit + murmur3 finaliser: tiny, deterministic, identical in the Worker and the browser. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // murmur3 fmix32 finaliser: FNV's low bits barely depend on the last characters, and `% 40` reads low bits.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export const formatPublicName = (adjective: string, creature: string) => `${adjective} ${creature}`;

/** The default public name for a child profile id (stable forever for the same id). */
export function defaultPublicName(childId: string): string {
  const a = PUBLIC_ADJECTIVES[fnv1a(`adj:${childId}`) % PUBLIC_ADJECTIVES.length]!;
  const c = PUBLIC_CREATURES[fnv1a(`cre:${childId}`) % PUBLIC_CREATURES.length]!;
  return formatPublicName(a, c);
}

/** Splits a public name into its two parts, or null unless it is exactly "<listed adjective> <listed creature>". */
export function splitPublicName(x: unknown): { adjective: PublicAdjective; creature: PublicCreature } | null {
  if (typeof x !== "string" || x.length > 40) return null;
  const i = x.indexOf(" ");
  if (i < 0) return null;
  const adjective = x.slice(0, i);
  const creature = x.slice(i + 1);
  if (!(PUBLIC_ADJECTIVES as readonly string[]).includes(adjective) || !(PUBLIC_CREATURES as readonly string[]).includes(creature)) return null;
  return { adjective: adjective as PublicAdjective, creature: creature as PublicCreature };
}

/** Canonical public name, or null if it isn't a combination from the pick lists. */
export function parsePublicName(x: unknown): string | null {
  const p = splitPublicName(x);
  return p ? formatPublicName(p.adjective, p.creature) : null;
}

/** The public name to show for a stored row: the parent's valid choice, otherwise the deterministic default. */
export const publicNameFor = (childId: string, stored: string | null | undefined): string => parsePublicName(stored) ?? defaultPublicName(childId);
