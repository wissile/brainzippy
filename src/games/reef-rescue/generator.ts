import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  ACTIONS,
  ANIMALS,
  type Animal,
  CHAINS3,
  CHAINS4,
  CHAIN_NAMES,
  type ChainId,
  FACT_QS,
  FOODS,
  type FoodId,
  GRAZERS,
  GRAZER_NAMES,
  HARM_IDS,
  HELP_IDS,
  HOME_ITEMS,
  HOME_SETS_L0,
  HOME_SETS_L1,
  NOT_GRAZERS,
  PLANT_COUNT,
  SLOT_COND,
  SLOT_IDS,
  SLOT_TEXT,
  STORIES,
  USUAL_HIGH,
  WEEKS,
  ZONES,
  ZONE_IDS,
  type ZoneId,
  chartOk,
  homesFor,
  riskiestRun,
  runId,
  runsOf,
  weeksAbove,
  wrongFoods,
  zonesForL0,
} from "./facts";

/**
 * Ripple's Reef Rescue — procedural levels (pure: same level + rng + index → same exercise).
 * Spec: docs/curriculum/nature.md §4.4; pedagogy, sources and deviations: docs/worlds/reef-rescue.md.
 *
 * Level (0-based) → item                                                         answer
 *   0  who eats what (2 foods) · every 3rd item: 2 species → the zone meeting their needs   choice · match
 *   1  who eats what (3 foods, all 6 animals across a band) · every 3rd: 3 species, 4 zones  choice · match
 *   2  3-link food chain sun → producer → grazer (+ a reef-shark distractor card)    sequence
 *   3  4-link food chain sun → algae → small fish → reef shark                       sequence
 *   4  coral partnership facts (coral is an animal; what each partner gives; light)   choice
 *   5  bleaching cause chain / recovery chain (4 cards + a "bleach chemicals" card)   sequence
 *   6  sort 6 actions into Helps / Harms (2–4 of each)                               match
 *   7  algae is smothering coral: pick every algae eater out of 5 animals            set
 *   8  plant 4 coral pieces on an 8-slot frame (4 good spots, one problem per bad one) set
 *   9  12-week sea-temperature chart (example data): riskiest warm spell / weeks above choice · number
 */
export const REEF_AGES = [8, 12] as const;
export const SKILL = {
  needs: "nature.habitat.needs",
  chain: "nature.web.chain",
  change: "nature.web.change",
  coral: "nature.reef.coral",
  bleaching: "nature.reef.bleaching",
  restore: "nature.reef.restore",
} as const;

export const MODES = ["eats", "home", "chain", "fact", "story", "sort", "grazers", "plant", "risk", "count"] as const;
export type ModeName = (typeof MODES)[number];
export const MODE = Object.fromEntries(MODES.map((m, i) => [m, i])) as Record<ModeName, number>;
export const modeOf = (p: Readonly<Record<string, number>> | undefined): ModeName => MODES[p?.mode ?? 0] ?? "eats";

export interface LevelSpec {
  label: string;
  skill: string;
  mode: (index: number) => ModeName;
}
export const REEF_LEVELS: readonly LevelSpec[] = [
  { label: "Who eats what (2 foods); species to the zone that meets their needs", skill: SKILL.needs, mode: (i) => (i % 3 === 2 ? "home" : "eats") },
  { label: "Who eats what (3 foods); 3 species into 4 zones", skill: SKILL.needs, mode: (i) => (i % 3 === 2 ? "home" : "eats") },
  { label: "3-link food chain from the sun", skill: SKILL.chain, mode: () => "chain" },
  { label: "4-link food chain up to the reef shark", skill: SKILL.chain, mode: () => "chain" },
  { label: "Coral is an animal with algae partners", skill: SKILL.coral, mode: () => "fact" },
  { label: "Why coral turns white, and how it recovers", skill: SKILL.bleaching, mode: () => "story" },
  { label: "Help or harm: sort 6 actions", skill: SKILL.restore, mode: () => "sort" },
  { label: "Bring back the algae eaters", skill: SKILL.change, mode: () => "grazers" },
  { label: "Plant coral where it will grow", skill: SKILL.restore, mode: () => "plant" },
  { label: "Read a sea-temperature chart", skill: SKILL.bleaching, mode: (i) => (i % 2 === 0 ? "risk" : "count") },
];
export const REEF_MAX_LEVEL = REEF_LEVELS.length - 1;

type Base = Pick<Exercise, "ages" | "interaction" | "seed">;
const base = (seed: number): Base => ({ ages: REEF_AGES, interaction: "choose", seed });

/** Retry a deterministic draw until it satisfies `ok` (tests check every generated item). */
function draw<T>(make: () => T, ok: (v: T) => boolean, tries = 400): T {
  let v = make();
  for (let i = 0; i < tries && !ok(v); i++) v = make();
  return v;
}

/** The animal for an eats item at `index`: across indices 0,1,3,4,6,7 all six animals appear. */
export const eatsAnimalIndex = (index: number) => (index + Math.floor(index / 3)) % ANIMALS.length;

export function eatsExercise(a: Animal, foods: readonly FoodId[], opts: { id: string; seed: number; skillId: string; tutorial?: boolean }): Omit<Exercise, "difficulty"> {
  const options: AnswerOption[] = foods.map((f) => ({ id: f, text: FOODS[f].label, art: `food-${f}` }));
  return {
    ...base(opts.seed),
    id: opts.id,
    skillId: opts.skillId,
    objectKind: a.id,
    ...(opts.tutorial ? { tutorial: true } : {}),
    objective: `Match the ${a.name} to the food it eats (${FOODS[a.food].say})`,
    answer: { kind: "choice", correct: a.food, options },
    params: { mode: MODE.eats, a: ANIMALS.indexOf(a) },
    prompt: opts.tutorial
      ? { line: "rr.prompt.tutorial", text: "Drag the parrotfish to the food it eats." }
      : { line: "rr.prompt.eats", vars: { animal: a.name }, text: `What does the ${a.name} eat?` },
    a11yDescription: `A ${a.name} card and ${foods.length} food spots on the reef: ${foods.map((f) => FOODS[f].label).join(", ")}. Move the ${a.name} to the food it eats, then press Check.`,
  };
}

export const generateReefRescue: ExerciseGenerator = (level, rng, index): Omit<Exercise, "difficulty"> => {
  const lv = Math.max(0, Math.min(REEF_MAX_LEVEL, level));
  const spec = REEF_LEVELS[lv]!;
  const mode = spec.mode(index);
  const seed = rng.int(1, 999_999);
  const sfx = `l${lv}n${index}`;
  const skillId = spec.skill;
  const b = base(seed);

  switch (mode) {
    case "eats": {
      const a = ANIMALS[eatsAnimalIndex(index)]!;
      const wrong = rng.shuffle(wrongFoods(a)).slice(0, lv === 0 ? 1 : 2);
      const foods = rng.shuffle([a.food, ...wrong]);
      return eatsExercise(a, foods, { id: `rr-eats-${a.id}-${sfx}`, seed, skillId });
    }

    case "home": {
      const k = Math.floor(index / 3);
      const items = lv === 0 ? HOME_SETS_L0[k % HOME_SETS_L0.length]! : HOME_SETS_L1[k % HOME_SETS_L1.length]!;
      const zones: ZoneId[] = rng.shuffle(lv === 0 ? zonesForL0(items) : ZONE_IDS);
      const pairs = Object.fromEntries(items.map((it) => [it, homesFor(it, zones)[0]!]));
      return {
        ...b, objectKind: "coral", id: `rr-home-${items.join("-")}-${sfx}`, skillId,
        objective: "Place each species where its needs (light, the right ground, shelter) are met",
        answer: {
          kind: "match",
          pairs,
          items: rng.shuffle(items).map((it) => ({ id: it, text: HOME_ITEMS[it].label, art: it })),
          targets: zones.map((z) => ({ id: z, text: ZONES[z].label, art: `zone-${z}` })),
        },
        params: { mode: MODE.home, lv },
        prompt: { line: "rr.prompt.home", text: "Put each one where it gets what it needs." },
        a11yDescription: `${items.map((i) => HOME_ITEMS[i].label).join(", ")}. Reef zones: ${zones.map((z) => ZONES[z].label).join(", ")}. Move each one to the zone that meets its needs, then press Check.`,
      };
    }

    case "chain": {
      const chain = lv === 2 ? CHAINS3[index % CHAINS3.length]! : CHAINS4[index % CHAINS4.length]!;
      const pieces: ChainId[] = lv === 2 ? [...chain, "shark"] : [...chain];
      return {
        ...b, objectKind: "chain", id: `rr-chain-${chain.join("-")}-${sfx}`, skillId,
        objective: `Build the food chain ${chain.map((c) => CHAIN_NAMES[c]).join(" → ")} (arrows: gives energy to)`,
        answer: { kind: "sequence", order: [...chain], pieces: rng.shuffle(pieces).map((p) => ({ id: p, text: CHAIN_NAMES[p], art: p })) },
        params: { mode: MODE.chain, len: chain.length },
        prompt: { line: "rr.prompt.chain", text: "Build the food chain, starting with the sun." },
        a11yDescription: `${chain.length} spaces joined by arrows that mean "gives energy to". Cards: ${pieces.map((p) => CHAIN_NAMES[p]).join(", ")}. Put the cards in order from the sun, then press Check.`,
      };
    }

    case "fact": {
      const q = index % FACT_QS.length;
      const f = FACT_QS[q]!;
      return {
        ...b, objectKind: "polyp", id: `rr-fact-${f.q}-${sfx}`, skillId,
        objective: "Explain that coral is an animal whose algae partners make food and give colour",
        answer: { kind: "choice", correct: f.correct, options: rng.shuffle(f.options).map((o) => ({ id: o.id, text: o.text })) },
        params: { mode: MODE.fact, q },
        prompt: { line: f.line, text: f.ask },
        a11yDescription: `A sentence with a gap: "${f.stem}" Cards: ${f.options.map((o) => o.text).join(", ")}. Move the card that completes it into the gap, then press Check.`,
      };
    }

    case "story": {
      const s = index % STORIES.length;
      const st = STORIES[s]!;
      const ids = rng.shuffle([...st.order, st.distractor]);
      return {
        ...b, objectKind: "thermo", id: `rr-story-${st.key}-${sfx}`, skillId,
        objective: st.key === "bleach" ? "Order the bleaching cause chain: too-warm water → algae pushed out → white → weak" : "Order the recovery chain: cooler water → algae return → colour back → coral grows",
        answer: { kind: "sequence", order: [...st.order], pieces: ids.map((id) => ({ id, text: st.cards[id]!, art: `story-${id}` })) },
        params: { mode: MODE.story, s },
        prompt: { line: st.line, text: st.key === "bleach" ? "Put the story of the white coral in order." : "Put the story of the coral's recovery in order." },
        a11yDescription: `4 story spaces joined by arrows. Cards: ${ids.map((id) => st.cards[id]).join("; ")}. One card does not belong. Put the story in order, then press Check.`,
      };
    }

    case "sort": {
      const helpN = 2 + (index % 3);
      const ids = rng.shuffle([...rng.shuffle(HELP_IDS).slice(0, helpN), ...rng.shuffle(HARM_IDS).slice(0, 6 - helpN)]);
      return {
        ...b, objectKind: "shell", id: `rr-sort-${ids.join("-")}-${sfx}`, skillId,
        objective: "Sort actions into those that help a reef recover and those that harm it",
        answer: {
          kind: "match",
          pairs: Object.fromEntries(ids.map((id) => [id, ACTIONS[id].helps ? "help" : "harm"])),
          items: ids.map((id) => ({ id, text: ACTIONS[id].text, art: `act-${id}` })),
          targets: [{ id: "help", text: "Helps the reef" }, { id: "harm", text: "Harms the reef" }],
        },
        params: { mode: MODE.sort },
        prompt: { line: "rr.prompt.sort", text: "Does each one help the reef or harm it?" },
        a11yDescription: `6 cards: ${ids.map((id) => ACTIONS[id].text).join("; ")}. Two bins: Helps the reef, Harms the reef. Sort every card, then press Check.`,
      };
    }

    case "grazers": {
      const k = 2 + (index % 2);
      const eaters = rng.shuffle(GRAZERS).slice(0, k);
      const others = k === 3 ? ["shark", rng.pick(NOT_GRAZERS.filter((x) => x !== "shark"))] : [...NOT_GRAZERS];
      const all = rng.shuffle([...eaters, ...others]);
      return {
        ...b, objectKind: "parrotfish", id: `rr-grazers-${all.join("-")}-${sfx}`, skillId,
        objective: "Predict that bringing back algae-eating grazers stops algae smothering coral",
        answer: { kind: "set", correct: eaters, options: all.map((id) => ({ id, text: GRAZER_NAMES[id]!, art: id })) },
        params: { mode: MODE.grazers },
        prompt: { line: "rr.prompt.grazers", text: "Algae is covering this coral. Which animals keep the algae in check?" },
        a11yDescription: `Algae is growing over a coral patch. Animals: ${all.map((id) => GRAZER_NAMES[id]).join(", ")}. Move every animal that eats algae onto the reef, then press Check.`,
      };
    }

    case "plant": {
      const conds = draw(
        () => {
          const good = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, PLANT_COUNT);
          const bad = rng.shuffle([1, 2, 3, 4]);
          let j = 0;
          return Array.from({ length: SLOT_IDS.length }, (_, i) => (good.includes(i) ? 0 : bad[j++]!));
        },
        // never all four good spots in one row: the child has to check each slot
        (c) => ![0, 4].some((r) => c.slice(r, r + 4).every((x) => x === 0)),
      );
      const p: Record<string, number> = { mode: MODE.plant };
      conds.forEach((c, i) => (p[`s${i}`] = c));
      const correct = SLOT_IDS.filter((_, i) => conds[i] === 0);
      return {
        ...b, objectKind: "coral", id: `rr-plant-${conds.join("")}-${sfx}`, skillId,
        objective: "Choose restoration spots where new coral gets light, clean water and a steady base",
        answer: { kind: "set", correct: [...correct], options: SLOT_IDS.map((id, i) => ({ id, text: `Spot ${i + 1}: ${SLOT_TEXT[SLOT_COND[conds[i]!]!].label}` })) },
        params: p,
        prompt: { line: "rr.prompt.plant", text: "Plant the 4 coral pieces where they'll grow best." },
        a11yDescription: `A reef frame with 8 spots: ${conds.map((c, i) => `spot ${i + 1} ${SLOT_TEXT[SLOT_COND[c]!]!.label}`).join(", ")}. Plant 4 coral pieces, then press Check.`,
      };
    }

    case "risk":
    case "count": {
      const distinct = mode === "risk" ? Math.floor(index / 2) % 3 !== 2 : rng.chance(0.5);
      const temps = drawChart(rng, distinct);
      const p: Record<string, number> = { mode: MODE[mode], line: USUAL_HIGH };
      temps.forEach((t, i) => (p[`t${i}`] = t));
      const runs = runsOf(temps);
      const table = temps.map((t, i) => `week ${i + 1}: ${t} °C${t > USUAL_HIGH ? ", above the usual high" : ""}`).join("; ");
      if (mode === "risk") {
        const best = riskiestRun(temps)!;
        return {
          ...b, objectKind: "thermo", id: `rr-risk-${temps.join("-")}-${sfx}`, skillId,
          objective: "Read a temperature chart: the longest warm spell above the usual high is the riskiest for coral",
          answer: { kind: "choice", correct: runId(best), options: runs.map((r) => ({ id: runId(r), text: r.len === 1 ? `Week ${r.start + 1}` : `Weeks ${r.start + 1} to ${r.end + 1}` })) },
          params: p,
          prompt: { line: "rr.prompt.chart", text: "When was the reef most at risk?" },
          a11yDescription: `Example sea temperatures for 12 weeks, with a dashed usual summer high of ${USUAL_HIGH} °C. ${table}. Choose the warm spell when the coral was most at risk, then press Check.`,
        };
      }
      const n = weeksAbove(temps);
      const longest = Math.max(...runs.map((r) => r.len));
      const choices = rng.shuffle([...new Set([n, longest, n + 1, n - 1])].filter((x) => x >= 1).slice(0, 4));
      return {
        ...b, objectKind: "thermo", id: `rr-count-${temps.join("-")}-${sfx}`, skillId,
        objective: "Read a temperature chart: count the weeks above the usual summer high",
        answer: { kind: "number", value: n, choices },
        params: p,
        prompt: { line: "rr.prompt.count", text: "How many weeks was the water above the dashed line?" },
        a11yDescription: `Example sea temperatures for 12 weeks, with a dashed usual summer high of ${USUAL_HIGH} °C. ${table}. Choose how many weeks were above the line, then press Check.`,
      };
    }
  }
};

/**
 * Example data: 2–3 warm spells (runs above 29 °C) separated by cooler weeks; one unique hottest week (32 °C).
 * `distinct`: the hottest week sits in a SHORTER spell (the "hottest single week" misconception is testable).
 */
export function drawChart(rng: Rng, distinct: boolean): number[] {
  return draw(
    () => {
      const longest = rng.int(3, 5);
      const n = rng.int(2, 3);
      const lens = [longest, ...Array.from({ length: n - 1 }, () => rng.int(1, longest - 1))];
      const order = rng.shuffle(lens.map((len, k) => ({ len, k })));
      const used = lens.reduce((s, l) => s + l, 0) + (n - 1);
      let spare = WEEKS - used;
      const temps: number[] = [];
      const cool = () => rng.int(26, 28);
      const lead = rng.int(0, Math.min(spare, 3));
      for (let i = 0; i < lead; i++) temps.push(cool());
      spare -= lead;
      let hotAt = -1;
      const hotRun = distinct ? rng.int(1, n - 1) : 0;
      order.forEach((r, idx) => {
        if (idx > 0) {
          const gap = 1 + rng.int(0, Math.min(spare, 2));
          spare -= gap - 1;
          for (let i = 0; i < gap; i++) temps.push(cool());
        }
        const startAt = temps.length;
        for (let i = 0; i < r.len; i++) temps.push(r.k === 0 ? (rng.chance(0.75) ? 31 : 30) : rng.chance(0.25) ? 31 : 30);
        if (r.k === hotRun) hotAt = startAt + rng.int(0, r.len - 1);
      });
      while (temps.length < WEEKS) temps.push(cool());
      if (hotAt >= 0) temps[hotAt] = 32;
      return temps.slice(0, WEEKS);
    },
    (t) => {
      if (!chartOk(t)) return false;
      const best = riskiestRun(t)!;
      return distinct ? !best.hottest : best.hottest;
    },
  );
}
