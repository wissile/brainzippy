/**
 * Ripple's Reef Rescue — the authored, reviewed fact table and the small ecosystem model every level is
 * generated from (pure data + pure functions; no React). Sources and simplifications: docs/worlds/reef-rescue.md.
 *
 * Rules that keep every generated item true:
 *  - An animal's food question never offers, as a WRONG option, something it really eats (`alsoEats`):
 *    green sea turtles also graze algae, so algae is never a turtle distractor; some parrotfish, surgeonfish
 *    and urchins nibble seagrass, so seagrass is never their distractor.
 *  - A habitat item has exactly one zone among the offered zones that meets all of its needs (`zoneMeets`).
 *  - A food chain is valid when every link is "food → eater" in the table (`eatsFood`).
 *  - A planting slot is good only if it is shallow (light), unshaded, free of algae and on a steady frame.
 *  - In a temperature chart the riskiest warm spell is the longest run above the usual high AND the one with
 *    the most heat above it (a simplified NOAA Coral Reef Watch "degree heating weeks" idea).
 */

// ---------------------------------------------------------------- species and foods

export type FoodId = "algae" | "seagrass" | "fish" | "sand";
export type AnimalId = "parrotfish" | "surgeonfish" | "urchin" | "turtle" | "shark" | "cucumber";
export type ChainId = "sun" | "algae" | "seagrass" | "parrotfish" | "surgeonfish" | "urchin" | "turtle" | "damselfish" | "shark";

export interface Animal {
  id: AnimalId;
  name: string;
  /** Spoken/written with "the": "the green sea turtle". */
  food: FoodId;
  /** Foods it really eats as well (never offered as a wrong option). */
  alsoEats: readonly FoodId[];
  /** Dabble's zoom-lens clue (a feature, not the answer). */
  clue: string;
  /** One true sentence shown after a correct answer. */
  fact: string;
}

export const ANIMALS: readonly Animal[] = [
  { id: "parrotfish", name: "parrotfish", food: "algae", alsoEats: ["seagrass"], clue: "Beak-like teeth for scraping rocks", fact: "Parrotfish scrape algae off the reef rocks with their beaks." },
  { id: "surgeonfish", name: "surgeonfish", food: "algae", alsoEats: ["seagrass"], clue: "A small mouth for nibbling all day", fact: "Surgeonfish graze algae, like tiny lawnmowers." },
  { id: "urchin", name: "sea urchin", food: "algae", alsoEats: ["seagrass"], clue: "Five little teeth underneath for scraping", fact: "Sea urchins scrape algae with five teeth on their underside." },
  { id: "turtle", name: "green sea turtle", food: "seagrass", alsoEats: ["algae"], clue: "A sharp beak for cropping grass", fact: "Grown-up green sea turtles graze seagrass (and some algae)." },
  { id: "shark", name: "reef shark", food: "fish", alsoEats: [], clue: "Sharp teeth for catching", fact: "Reef sharks hunt small fish." },
  { id: "cucumber", name: "sea cucumber", food: "sand", alsoEats: [], clue: "Tentacles that scoop up sand", fact: "Sea cucumbers eat tiny bits in the sand and leave the sand cleaner." },
];

export const FOODS: Record<FoodId, { label: string; say: string }> = {
  algae: { label: "Algae on rocks", say: "algae" },
  seagrass: { label: "Seagrass", say: "seagrass" },
  fish: { label: "Small fish", say: "small fish" },
  sand: { label: "Bits in the sand", say: "tiny bits in the sand" },
};
export const FOOD_IDS = Object.keys(FOODS) as FoodId[];

export const animal = (id: string): Animal | undefined => ANIMALS.find((a) => a.id === id);

/** Foods that may be offered as WRONG answers for this animal (never its food, never something it also eats). */
export function wrongFoods(a: Animal): FoodId[] {
  return FOOD_IDS.filter((f) => f !== a.food && !a.alsoEats.includes(f));
}

// ---------------------------------------------------------------- food chains (energy flows food → eater)

export const CHAIN_NAMES: Record<ChainId, string> = {
  sun: "Sun",
  algae: "Algae",
  seagrass: "Seagrass",
  parrotfish: "Parrotfish",
  surgeonfish: "Surgeonfish",
  urchin: "Sea urchin",
  turtle: "Green sea turtle",
  damselfish: "Damselfish",
  shark: "Reef shark",
};

/** Who gets energy from whom in this world (eater → foods). The sun gives energy to producers. */
export const EATS: Record<ChainId, readonly ChainId[]> = {
  sun: [],
  algae: ["sun"],
  seagrass: ["sun"],
  parrotfish: ["algae"],
  surgeonfish: ["algae"],
  urchin: ["algae"],
  turtle: ["seagrass", "algae"],
  damselfish: ["algae"], // many reef damselfish "farm" and eat algae
  shark: ["damselfish", "parrotfish", "surgeonfish"],
};
export const eatsFood = (eater: ChainId, food: ChainId) => EATS[eater].includes(food);
export const isProducer = (id: ChainId) => EATS[id].length === 1 && EATS[id][0] === "sun";

/** A chain is valid when it starts with the sun and each link is "food → eater". */
export function chainValid(chain: readonly ChainId[]): boolean {
  return chain.length >= 2 && chain[0] === "sun" && chain.every((id, i) => i === 0 || eatsFood(id, chain[i - 1]!));
}

/** The 3-link chains of level 2 (sun → producer → grazer). */
export const CHAINS3: readonly (readonly ChainId[])[] = [
  ["sun", "algae", "parrotfish"],
  ["sun", "algae", "surgeonfish"],
  ["sun", "algae", "urchin"],
  ["sun", "seagrass", "turtle"],
];
/** The 4-link chains of level 3 (sun → algae → small grazing fish → reef shark). */
export const CHAINS4: readonly (readonly ChainId[])[] = [
  ["sun", "algae", "damselfish", "shark"],
  ["sun", "algae", "parrotfish", "shark"],
  ["sun", "algae", "surgeonfish", "shark"],
];

// ---------------------------------------------------------------- habitats (needs)

export type Need = "light" | "hard" | "soft" | "shelter";
export type ZoneId = "rock" | "sand" | "crevice" | "deep";
export type HomeItemId = "coral" | "seagrass" | "cucumber" | "shrimp";

export const NEED_LABEL: Record<Need, string> = { light: "sunlight", hard: "hard ground", soft: "soft sand", shelter: "a place to hide" };

export const ZONES: Record<ZoneId, { label: string; gives: readonly Need[] }> = {
  rock: { label: "Sunny reef rock", gives: ["light", "hard"] },
  sand: { label: "Sunny sandy shallows", gives: ["light", "soft"] },
  crevice: { label: "Shady reef crack", gives: ["hard", "shelter"] },
  deep: { label: "Deep, dark open water", gives: [] },
};
export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

export const HOME_ITEMS: Record<HomeItemId, { label: string; needs: readonly Need[]; why: string }> = {
  coral: { label: "Coral piece", needs: ["light", "hard"], why: "Coral needs sunlight for its algae and hard ground to grow on." },
  seagrass: { label: "Seagrass", needs: ["light", "soft"], why: "Seagrass needs sunlight and soft sand for its roots." },
  cucumber: { label: "Sea cucumber", needs: ["soft"], why: "Sea cucumbers need soft sand to eat from." },
  shrimp: { label: "Cleaner shrimp", needs: ["shelter"], why: "Cleaner shrimp need a crack to hide in, where fish come to be cleaned." },
};
export const HOME_IDS = Object.keys(HOME_ITEMS) as HomeItemId[];

export const zoneMeets = (zone: ZoneId, item: HomeItemId) => HOME_ITEMS[item].needs.every((n) => ZONES[zone].gives.includes(n));
/** Zones (among `zones`) that meet every need of `item`. */
export const homesFor = (item: HomeItemId, zones: readonly ZoneId[] = ZONE_IDS) => zones.filter((z) => zoneMeets(z, item));

/** Habitat item sets by level (index rotation). Every item has exactly one meeting zone (checked in tests). */
export const HOME_SETS_L0: readonly (readonly HomeItemId[])[] = [["coral", "seagrass"], ["shrimp", "cucumber"], ["coral", "shrimp"], ["seagrass", "shrimp"]];
export const HOME_SETS_L1: readonly (readonly HomeItemId[])[] = [["coral", "seagrass", "shrimp"], ["coral", "cucumber", "shrimp"], ["seagrass", "cucumber", "coral"], ["shrimp", "seagrass", "cucumber"]];
/** Zones offered at L0: the items' homes (topped up to two) + deep water = 3; L1 offers all four. */
export const zonesForL0 = (items: readonly HomeItemId[]): ZoneId[] => {
  const homes = [...new Set(items.flatMap((i) => homesFor(i, ["rock", "sand", "crevice"])))];
  const extra = (["rock", "sand", "crevice"] as ZoneId[]).find((z) => !homes.includes(z));
  const out: ZoneId[] = [...homes, ...(homes.length < 2 && extra ? [extra] : []), "deep"];
  return out;
};

// ---------------------------------------------------------------- coral partnership facts (level 4)

export interface FactQ {
  q: string;
  line: string;
  /** Prompt text (same words as the voice line). */
  ask: string;
  stem: string;
  correct: string;
  options: readonly { id: string; text: string }[];
}
/** Each wrong option is a common misconception (coral is a rock/plant; the algae build the skeleton; ...). */
export const FACT_QS: readonly FactQ[] = [
  {
    q: "coral",
    line: "rr.prompt.coral",
    ask: "What is coral?",
    stem: "Coral is a kind of…",
    correct: "animal",
    options: [{ id: "animal", text: "animal" }, { id: "rock", text: "rock" }, { id: "plant", text: "plant" }],
  },
  {
    q: "partner",
    line: "rr.prompt.partner",
    ask: "What do the tiny algae give the coral?",
    stem: "The tiny algae inside give the coral…",
    correct: "food",
    options: [{ id: "food", text: "food and colour" }, { id: "skeleton", text: "a hard skeleton" }, { id: "shade", text: "shade from the sun" }],
  },
  {
    q: "gives",
    line: "rr.prompt.gives",
    ask: "What does the coral give its tiny algae?",
    stem: "The coral gives its tiny algae…",
    correct: "home",
    options: [{ id: "home", text: "a safe home" }, { id: "sunlight", text: "sunlight" }, { id: "colour", text: "its colour" }],
  },
  {
    q: "light",
    line: "rr.prompt.light",
    ask: "Why does reef coral grow in clear, shallow water?",
    stem: "Reef coral grows in clear, shallow water because…",
    correct: "sun",
    options: [{ id: "sun", text: "its algae need sunlight" }, { id: "cold", text: "the water is colder there" }, { id: "hide", text: "fish can't find it there" }],
  },
];

// ---------------------------------------------------------------- bleaching and recovery stories (level 5)

export interface Story {
  key: "bleach" | "recover";
  line: string;
  order: readonly string[];
  distractor: string;
  cards: Record<string, string>;
}
export const STORIES: readonly Story[] = [
  {
    key: "bleach",
    line: "rr.prompt.bleach",
    order: ["warm", "expel", "white", "weak"],
    distractor: "chem",
    cards: {
      warm: "The water stays too warm",
      expel: "Coral pushes out its algae",
      white: "Coral turns white",
      weak: "Coral is hungry and weak",
      chem: "Bleach chemicals spill",
    },
  },
  {
    key: "recover",
    line: "rr.prompt.recover",
    order: ["cool", "return", "colour", "grow"],
    distractor: "wash",
    cards: {
      cool: "The water cools down",
      return: "Algae move back into the coral",
      colour: "Coral gets its colour back",
      grow: "Coral can feed and grow again",
      wash: "The bleach washes away",
    },
  },
];

// ---------------------------------------------------------------- help or harm (level 6)

export type ActionId =
  | "less-runoff" | "protect-grazers" | "mooring" | "nursery" | "clean-energy"
  | "heatwave" | "runoff" | "overfishing" | "anchor" | "touch";
export const ACTIONS: Record<ActionId, { text: string; helps: boolean; why: string }> = {
  "less-runoff": { text: "Less pollution washing into the sea", helps: true, why: "clearer water lets light reach the coral" },
  "protect-grazers": { text: "Protecting fish that eat algae", helps: true, why: "grazers stop algae smothering coral" },
  mooring: { text: "Boats tie up to a buoy, not an anchor", helps: true, why: "no anchor breaks the coral" },
  nursery: { text: "Growing new coral in nurseries", helps: true, why: "nursery coral is planted back on the reef" },
  "clean-energy": { text: "Clean energy, so the ocean warms less", helps: true, why: "less warming means fewer bleaching summers" },
  heatwave: { text: "Very warm water for many weeks", helps: false, why: "long heat makes coral push out its algae" },
  runoff: { text: "Muddy, dirty water from the land", helps: false, why: "cloudy water blocks the light" },
  overfishing: { text: "Catching too many algae-eating fish", helps: false, why: "algae can grow over the coral" },
  anchor: { text: "Dropping anchors on coral", helps: false, why: "anchors break coral" },
  touch: { text: "Touching or standing on coral", helps: false, why: "coral polyps are soft and easily hurt" },
};
export const HELP_IDS = (Object.keys(ACTIONS) as ActionId[]).filter((k) => ACTIONS[k].helps);
export const HARM_IDS = (Object.keys(ACTIONS) as ActionId[]).filter((k) => !ACTIONS[k].helps);

// ---------------------------------------------------------------- algae eaters (level 7)

export const GRAZERS = ["parrotfish", "surgeonfish", "urchin"] as const;
export const NOT_GRAZERS = ["shark", "cucumber", "shrimp"] as const;
export const GRAZER_NAMES: Record<string, string> = { parrotfish: "Parrotfish", surgeonfish: "Surgeonfish", urchin: "Sea urchin", shark: "Reef shark", cucumber: "Sea cucumber", shrimp: "Cleaner shrimp" };
export const NOT_GRAZER_WHY: Record<string, string> = { shark: "Reef sharks hunt fish, not algae.", cucumber: "Sea cucumbers eat bits in the sand.", shrimp: "Cleaner shrimp eat pests off fish." };

// ---------------------------------------------------------------- planting frame (level 8)

/** Slot conditions: 0 good (shallow, sunny, clean, steady); 1–4 one problem each. */
export const SLOT_COND = ["good", "deep", "shade", "algae", "sand"] as const;
export type SlotCond = (typeof SLOT_COND)[number];
export const SLOT_TEXT: Record<SlotCond, { label: string; why: string }> = {
  good: { label: "sunny and clear", why: "Sunny, clean and steady: a great spot." },
  deep: { label: "deep and dark", why: "Too deep and dark: the coral's algae need sunlight." },
  shade: { label: "under a rock ledge", why: "In the shade of the ledge: not enough light." },
  algae: { label: "covered in algae", why: "Algae would smother the new coral." },
  sand: { label: "on shifting sand", why: "Shifting sand would bury the new coral." },
};
export const SLOT_IDS = ["slot-a", "slot-b", "slot-c", "slot-d", "slot-e", "slot-f", "slot-g", "slot-h"] as const;
export const PLANT_COUNT = 4;
export const slotGood = (c: SlotCond) => c === "good";

// ---------------------------------------------------------------- temperature chart (level 9, example data)

export const WEEKS = 12;
/** The dashed "usual summer high" line (°C). Weeks strictly above it count as warm weeks. */
export const USUAL_HIGH = 29;

export interface Run {
  start: number; // 0-based week index
  end: number; // inclusive
  len: number;
  heat: number; // sum of °C above the usual high
  hottest: boolean; // contains the single hottest week
}
export const runId = (r: Pick<Run, "start" | "end">) => `run-${r.start + 1}-${r.end + 1}`;

/** Runs of consecutive weeks strictly above the usual high. */
export function runsOf(temps: readonly number[], line = USUAL_HIGH): Run[] {
  const max = Math.max(...temps);
  const runs: Run[] = [];
  let i = 0;
  while (i < temps.length) {
    if (temps[i]! > line) {
      let j = i;
      while (j + 1 < temps.length && temps[j + 1]! > line) j++;
      const slice = temps.slice(i, j + 1);
      runs.push({ start: i, end: j, len: j - i + 1, heat: slice.reduce((s, t) => s + (t - line), 0), hottest: slice.includes(max) });
      i = j + 1;
    } else i++;
  }
  return runs;
}
export const weeksAbove = (temps: readonly number[], line = USUAL_HIGH) => temps.filter((t) => t > line).length;
export const hottestWeek = (temps: readonly number[]) => temps.indexOf(Math.max(...temps));

/** The riskiest warm spell: longest, with the most heat; null if that isn't one unique run. */
export function riskiestRun(temps: readonly number[], line = USUAL_HIGH): Run | null {
  const runs = runsOf(temps, line);
  if (!runs.length) return null;
  const longest = Math.max(...runs.map((r) => r.len));
  const top = runs.filter((r) => r.len === longest);
  if (top.length !== 1) return null;
  const r = top[0]!;
  return runs.every((o) => o === r || o.heat < r.heat) ? r : null;
}

/** A chart is fair when: 2–3 runs, the riskiest run is unique (longest AND most heat), one unique hottest week,
 *  at least one cool week between runs, and nothing sits exactly on the line. */
export function chartOk(temps: readonly number[], line = USUAL_HIGH): boolean {
  if (temps.length !== WEEKS || temps.some((t) => t === line)) return false;
  const runs = runsOf(temps, line);
  if (runs.length < 2 || runs.length > 3) return false;
  const max = Math.max(...temps);
  if (temps.filter((t) => t === max).length !== 1) return false;
  return riskiestRun(temps, line) !== null;
}
