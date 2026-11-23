import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import { isBlocked } from "./blocklist";
import { BUILD_WORDS, COMPOUNDS, CVC, confusable, FAMILIES, NOTES_BUILD, NOTES_READ, PLURALS, READ_SETS, SORTS, SWAP_ONSETS, TAGS, sceneId } from "./content";
import { MODE, oneGraphemeApart, safeTiles } from "./logic";
import { KEYWORDS, REAL_WORDS, graphemes, word } from "./words";

/**
 * Paper Boat Post — procedural exercises. PURE and deterministic: same (level, rng, index) → same exercise.
 * Spec: docs/worlds/paper-boat-post.md §3. Level (0-based) → what the child does; time pressure is never a parameter.
 *   0 swap      change the first letter of a family word (2 letter tiles with keyword pictures)
 *   1 read      read a CVC word, send the boat to 1 of 2 pictures (far decoy)
 *   2 read/tag  read a CVC word, 3 pictures (vowel + final near misses); index % 4 == 2: critter name tags
 *   3 read/build  even index read (3 pictures), odd index hear and build a CVC word (3 slots + 2 decoy tiles)
 *   4 digraphs  read / build with single digraph tiles (s + h decoys)
 *   5 blends    read (dropped-consonant decoy) / build (4 slots)
 *   6 final -e  read the short/long pair / build with the quiet e
 *   7 vowel teams  read / sort four boats into two docks by spelling (match)
 *   8 long words  two-syllable read · plural read · compound build
 *   9 notes     even index read a note, choose the scene; odd index build the note for a picture
 * From level 4, items with index % 4 == 3 are review items from an earlier level (ENGLISH_PATH §3.2).
 * Words are spread over a round by index (one bucket per slot), so a band never repeats a target.
 */
export const SKILLS = {
  onsetRime: "english.phonics.onset-rime",
  cvc: "english.phonics.cvc",
  digraph: "english.phonics.digraph",
  blend: "english.phonics.blend",
  magicE: "english.phonics.magic-e",
  team: "english.phonics.vowel-team",
  multi: "english.phonics.multisyllable",
  readSentence: "english.read.sentence",
  buildSentence: "english.sentence.build",
} as const;
export const LEVEL_SKILL = [SKILLS.onsetRime, SKILLS.cvc, SKILLS.cvc, SKILLS.cvc, SKILLS.digraph, SKILLS.blend, SKILLS.magicE, SKILLS.team, SKILLS.multi, SKILLS.readSentence] as const;
export const PB_MAX_LEVEL = LEVEL_SKILL.length - 1;
export const PB_AGES = [6, 8] as const;

type Gen = Omit<Exercise, "difficulty">;

/** Pick from the slot's share of `list` (slot 0..slots-1); lists shorter than `slots` wrap. */
function bucketPick<T>(list: readonly T[], slot: number, slots: number, rng: Rng): T {
  const n = list.length;
  if (n <= slots) return list[slot % n]!;
  const lo = Math.floor((slot * n) / slots);
  const hi = Math.floor(((slot + 1) * n) / slots) - 1;
  return list[rng.int(lo, Math.max(lo, hi))]!;
}

const spell = (w: string) => graphemes(w).join(", ");
const picture = (w: string): AnswerOption => ({ id: w, art: w });

// ---------------------------------------------------------------- L0 swap
export interface SwapItem { from: string; to: string; rime: string; decoy: string }
const NO_TOGETHER = new Set(["b", "d", "p", "q"]);
export function swapDecoys(rime: string, from: string, to: string): string[] {
  const onset = (w: string) => w.slice(0, w.length - rime.length);
  return SWAP_ONSETS.filter((o) => {
    if (o === onset(from) || o === onset(to)) return false;
    if (NO_TOGETHER.has(o) && NO_TOGETHER.has(onset(to))) return false;
    const w = o + rime;
    return REAL_WORDS.has(w) && !isBlocked(w) && !!KEYWORDS[o];
  });
}
export const SWAP_PAIRS: readonly SwapItem[] = Object.entries(FAMILIES).flatMap(([rime, ws]) =>
  ws.flatMap((from) => ws.filter((to) => to !== from).flatMap((to) => {
    const d = swapDecoys(rime, from, to);
    return d.length ? [{ from, to, rime, decoy: d[0]! }] : [];
  })),
);
const SWAP_RIMES = [...new Set(SWAP_PAIRS.map((p) => p.rime))];

function genSwap(rng: Rng, index: number, tag: string, base: Partial<Gen>): Gen {
  const rime = bucketPick(SWAP_RIMES, index % 8, 8, rng);
  const pair = rng.pick(SWAP_PAIRS.filter((p) => p.rime === rime));
  const decoy = rng.pick(swapDecoys(rime, pair.from, pair.to));
  const on = pair.to.slice(0, pair.to.length - rime.length);
  const tiles = rng.shuffle([on, decoy]).map((l) => ({ id: l, text: l, art: KEYWORDS[l]! }));
  return {
    ...base,
    id: `pb-swap-${pair.from}-${pair.to}-${tag}`,
    objective: `Change the first letter of ${pair.from} to make ${pair.to}`,
    answer: { kind: "choice", correct: on, options: tiles },
    objectKind: pair.from,
    params: { m: MODE.swap },
    prompt: { line: `pb.prompt.swap.${pair.from}`, vars: { from: pair.from, to: pair.to }, text: `This is ${pair.from === "ten" ? "" : "a "}${pair.from}. Can you make ${pair.to}?` },
    a11yDescription: `A boat card shows a ${pair.from}, spelled ${spell(pair.from)}. The sail shows a gap, then ${rime.split("").join(", ")}. Two letter tiles: ${tiles.map((t) => `${t.text} for ${t.art}`).join(" and ")}. Put the first letter of ${pair.to} in the gap.`,
  } as Gen;
}

// ---------------------------------------------------------------- reading items
/** CVC near-miss sets (L2–L3): target + one vowel-only and one final-only decoy, all pictured. */
const pinPen = (a: string, b: string) => {
  const ga = graphemes(a);
  const gb = graphemes(b);
  return ga[1] !== gb[1] && ["e", "i"].includes(ga[1]!) && ["e", "i"].includes(gb[1]!) && ["m", "n"].includes(ga[2]!);
};
export function nearMisses(target: string): { vowel: string[]; final: string[] } {
  const g = graphemes(target);
  const vowel = CVC.filter((w) => w !== target && !confusable(w, target) && graphemes(w)[0] === g[0] && graphemes(w)[2] === g[2] && !pinPen(target, w));
  const final = CVC.filter((w) => w !== target && !confusable(w, target) && graphemes(w)[0] === g[0] && graphemes(w)[1] === g[1]);
  return { vowel, final };
}
export const NEAR_TARGETS: readonly string[] = CVC.filter((w) => {
  const n = nearMisses(w);
  return n.vowel.length > 0 && n.final.length > 0;
});

function readItem(target: string, decoys: readonly string[], rng: Rng, tag: string, base: Partial<Gen>, why: string): Gen {
  const words = rng.shuffle([target, ...decoys]);
  return {
    ...base,
    id: `pb-read-${target}-${tag}`,
    objective: `Read ${target} ${why}`,
    answer: { kind: "choice", correct: target, options: words.map(picture) },
    objectKind: "boat",
    params: { m: MODE.read },
    prompt: { line: "pb.prompt.read", text: "Read the word. Who should get it?" },
    a11yDescription: `A boat with ${target.length} letters on its sail: ${target.split("").join(", ")}. ${words.length} docks with pictures: ${words.join(", ")}. Choose the dock that matches the word.`,
  } as Gen;
}

function genRead(level: number, rng: Rng, slot: number, slots: number, tag: string, base: Partial<Gen>, list?: readonly string[]): Gen {
  if (level === 1) {
    const target = bucketPick(list ?? CVC, slot, slots, rng);
    const far = CVC.filter((w) => w !== target && !confusable(w, target) && !graphemes(w).some((g) => graphemes(target).includes(g)));
    return readItem(target, [rng.pick(far)], rng, tag, base, "and match it to its picture");
  }
  if (level <= 3) {
    const target = bucketPick(list ?? NEAR_TARGETS, slot, slots, rng);
    const n = nearMisses(target);
    const vowel = rng.pick(n.vowel);
    const finals = n.final.filter((w) => !confusable(w, vowel));
    return readItem(target, [vowel, rng.pick(finals.length ? finals : n.final)], rng, tag, base, "and tell it from words one letter away");
  }
  const sets = READ_SETS[level]!;
  const target = bucketPick(list ?? sets.map((s) => s[0]), slot, slots, rng);
  const set = sets.find((s) => s[0] === target)!;
  return readItem(target, [set[1], set[2]], rng, tag, base, "and tell it from look-alike words");
}

function genTag(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const [rhyme, name, a, b] = bucketPick(TAGS, slot, 2, rng);
  const opts = rng.shuffle([name, a, b]).map((t) => ({ id: t, text: t }));
  return {
    ...base,
    id: `pb-tag-${name}-${tag}`,
    objective: `Read made-up names and find the one that rhymes with ${rhyme}`,
    answer: { kind: "choice", correct: name, options: opts },
    objectKind: "critter",
    params: { m: MODE.tag },
    prompt: { line: "pb.prompt.tag", vars: { word: rhyme }, text: `This critter's name rhymes with ${rhyme}. Which tag is it?` },
    a11yDescription: `A made-up critter waits for its name tag. Three tags: ${opts.map((o) => o.text.split("").join(" ")).join("; ")}. Choose the tag that rhymes with ${rhyme}.`,
  } as Gen;
}

// ---------------------------------------------------------------- build (spelling) items
const VOWEL_SWAP: Readonly<Record<string, readonly string[]>> = { a: ["e", "o"], e: ["a", "i"], i: ["e", "a"], o: ["u", "a"], u: ["o", "a"] };
const LOOK_ALIKE: Readonly<Record<string, string>> = { b: "d", d: "b", p: "q", q: "p", n: "u", m: "w", w: "m" };
const SPARE = ["t", "s", "m", "r", "n", "d"];
const SPLIT: Readonly<Record<string, readonly string[]>> = { sh: ["s", "h"], ch: ["c", "h"], th: ["t", "h"], ck: ["c"], ll: ["l"] };

/** Decoy tiles for a spelling item (§3 table), in preference order; the first safe set wins. */
export function buildDecoys(w: string, level: number, rng: Rng): string[] {
  const x = word(w);
  const g = x.g;
  const has = new Set(g);
  const vowel = g.find((t) => VOWEL_SWAP[t]) ?? "a";
  const after = g[g.indexOf(vowel) + 1];
  // e/i is never offered before m/n (pin/pen merge in many US accents)
  const vowels = (VOWEL_SWAP[vowel] ?? ["o"]).filter((v) => !has.has(v) && !(["m", "n"].includes(after ?? "") && ["e", "i"].includes(v) && ["e", "i"].includes(vowel)));
  const looks = g.map((t) => LOOK_ALIKE[t]).filter((t): t is string => !!t && !has.has(t));
  const spare = rng.shuffle(SPARE.filter((t) => !has.has(t)));
  const options: string[][] = [];
  if (level === 4) {
    const dg = g.find((t) => SPLIT[t]);
    const split = dg ? SPLIT[dg]!.filter((t) => !has.has(t)) : [];
    for (const v of vowels) options.push(split.length >= 2 ? [...split] : [...split, v]);
  } else if (level === 6) {
    for (const v of vowels) options.push([v]);
  } else {
    for (const v of vowels) for (const c of [...looks, ...spare]) options.push([v, c]);
  }
  for (const set of options) if (safeTiles([...g, ...set], g.length, !!x.magic)) return set;
  return [];
}

function genBuild(level: number, rng: Rng, slot: number, slots: number, tag: string, base: Partial<Gen>, list?: readonly string[]): Gen {
  const w = bucketPick(list ?? BUILD_WORDS[level]!, slot, slots, rng);
  const g = graphemes(w);
  const decoys = buildDecoys(w, level, rng);
  const pieces = rng.shuffle([...g.map((t, i) => ({ id: `t${i}`, text: t })), ...decoys.map((t, i) => ({ id: `x${i}`, text: t }))]);
  return {
    ...base,
    id: `pb-build-${w}-${tag}`,
    objective: `Hear ${w} and spell it with ${g.length} tiles`,
    answer: { kind: "sequence", order: g.map((_, i) => `t${i}`), pieces },
    objectKind: w,
    params: { m: MODE.build, n: g.length, e: word(w).magic ? 1 : 0 },
    prompt: { line: "pb.prompt.build", vars: { word: w }, text: `Build ${w}!` },
    a11yDescription: `A picture of a ${w} and an empty sail with ${g.length} spaces. Letter tiles: ${pieces.map((p) => p.text).join(", ")}. Put the tiles for ${w} on the sail in order, then press Send.`,
  } as Gen;
}

// ---------------------------------------------------------------- L7 sort
function genSort(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const s = SORTS[slot % SORTS.length]!;
  const left = rng.shuffle(s.aWords).slice(0, 2);
  const right = rng.shuffle(s.bWords).slice(0, 2);
  const items = rng.shuffle([...left, ...right]).map((w) => ({ id: w, text: w, art: w }));
  const label = (t: string) => t.replace("_", "-");
  return {
    ...base,
    id: `pb-sort-${s.a}-${left.join("-")}-${right.join("-")}-${tag}`,
    objective: `Sort words by how their vowel sound is spelled: ${label(s.a)} or ${label(s.b)}`,
    answer: { kind: "match", items, targets: [{ id: s.a, text: label(s.a) }, { id: s.b, text: label(s.b) }], pairs: Object.fromEntries([...left.map((w) => [w, s.a]), ...right.map((w) => [w, s.b])]) },
    objectKind: "boat",
    params: { m: MODE.sort, p: SORTS.indexOf(s) },
    prompt: { line: "pb.prompt.sort", text: "Sort the boats by their letters." },
    a11yDescription: `Four boats: ${items.map((i) => i.text).join(", ")}. Two docks: ${label(s.a)} and ${label(s.b)}. Send each boat to the dock with the same letters, then press Send.`,
  } as Gen;
}

// ---------------------------------------------------------------- L8 long words
function genPlural(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const plural = bucketPick(Object.keys(PLURALS), slot, 2, rng);
  const [one, alike] = PLURALS[plural]!;
  const alikeMany = rng.chance(0.5);
  const opts = rng.shuffle([`${one}*3`, `${one}*1`, `${alike}*${alikeMany ? 3 : 1}`]).map((id) => ({ id, art: id }));
  const name = (id: string) => (id.endsWith("*3") ? `three ${Object.keys(PLURALS).find((p) => PLURALS[p]![0] === id.slice(0, -2))}` : `one ${id.slice(0, -2)}`);
  return {
    ...base,
    id: `pb-plural-${plural}-${tag}`,
    objective: `Read the plural ${plural} and tell it from ${one}`,
    answer: { kind: "choice", correct: `${one}*3`, options: opts },
    objectKind: "boat",
    params: { m: MODE.plural },
    prompt: { line: "pb.prompt.read", text: "Read the word. Who should get it?" },
    a11yDescription: `A boat with ${plural.length} letters on its sail: ${plural.split("").join(", ")}. Three docks: ${opts.map((o) => name(o.id)).join(", ")}. Choose the dock that matches the word.`,
  } as Gen;
}

function genCompound(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const w = bucketPick(Object.keys(COMPOUNDS), slot, 4, rng);
  const [a, b, c, d] = COMPOUNDS[w]!;
  const pieces = rng.shuffle([a, b, c, d]).map((t) => ({ id: t, text: t }));
  return {
    ...base,
    id: `pb-compound-${w}-${tag}`,
    objective: `Build the compound word ${w} from two smaller words`,
    answer: { kind: "sequence", order: [a, b], pieces },
    objectKind: w,
    params: { m: MODE.compound, n: 2 },
    prompt: { line: "pb.prompt.compound", vars: { word: w }, text: "Make a word for this picture with two cards." },
    a11yDescription: `A picture of a ${w} and an empty sail with two spaces. Word cards: ${pieces.map((p) => p.text).join(", ")}. Put two cards in order to make the word for the picture, then press Send.`,
  } as Gen;
}

// ---------------------------------------------------------------- L9 notes
function genNoteRead(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const note = bucketPick(NOTES_READ, slot, 4, rng);
  const scenes = rng.shuffle([note.scene, ...note.decoys]);
  const s = NOTES_READ.indexOf(note);
  const say = (sc: (typeof scenes)[number]) => `${sc.who} ${sc.rel === "has" ? "has a" : `${sc.rel} the`} ${sc.what}`;
  return {
    ...base,
    skillId: SKILLS.readSentence,
    id: `pb-note-${note.id}-${tag}`,
    objective: `Read the note "${note.text}" and choose the picture it describes`,
    answer: { kind: "choice", correct: sceneId(note.scene), options: scenes.map((sc) => ({ id: sceneId(sc), art: `scene:${sceneId(sc)}` })) },
    objectKind: "note",
    params: { m: MODE.noteRead, s },
    prompt: { line: "pb.prompt.note.read", text: "Read the note. Which picture matches?" },
    a11yDescription: `A note on the sail with ${note.words.length} words. Word by word: ${note.words.map((w) => w.split("").join(" ")).join("; ")}; end mark ${note.text.endsWith("?") ? "question mark" : "full stop"}. Three pictures: ${scenes.map(say).join("; ")}. Choose the picture the note describes.`,
  } as Gen;
}

function genNoteBuild(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const note = bucketPick(NOTES_BUILD, slot, 4, rng);
  const s = NOTES_BUILD.indexOf(note);
  const pieces = rng.shuffle([...note.cards.map((t, i) => ({ id: `c${i}`, text: t })), { id: "cx", text: note.extra }]);
  return {
    ...base,
    skillId: SKILLS.buildSentence,
    id: `pb-notebuild-${note.id}-${tag}`,
    objective: `Build a sentence with a capital letter and an end mark to match a picture`,
    answer: { kind: "sequence", order: note.cards.map((_, i) => `c${i}`), pieces },
    objectKind: "note",
    params: { m: MODE.noteBuild, s, n: note.cards.length },
    prompt: { line: "pb.prompt.note.build", text: "Build the note that matches the picture." },
    a11yDescription: `A picture: ${note.scene.who} ${note.scene.rel === "has" ? "has a" : `${note.scene.rel} the`} ${note.scene.what}. An empty note with ${note.cards.length} spaces. Word cards: ${pieces.map((p) => (p.text === "." ? "full stop" : p.text === "?" ? "question mark" : p.text)).join(", ")}. Put the cards in order to make a sentence that matches the picture, then press Send.`,
  } as Gen;
}

// ---------------------------------------------------------------- the generator
function generateAt(level: number, rng: Rng, index: number, tag: string): Gen {
  const base: Partial<Gen> = { ages: PB_AGES, skillId: LEVEL_SKILL[level], interaction: "choose", seed: rng.int(1, 999_999) };
  const slot8 = index % 8;
  const even = index % 2 === 0;
  switch (level) {
    case 0:
      return genSwap(rng, index, tag, base);
    case 1:
      return genRead(1, rng, slot8, 8, tag, base);
    case 2: {
      if (index % 4 === 2) return genTag(rng, Math.floor(index / 4) % 2, tag, base);
      const slot = [0, 1, -1, 2, 3, 4, -1, 5][slot8]!;
      return genRead(2, rng, slot, 6, tag, base);
    }
    case 3:
    case 4:
    case 5:
    case 6: {
      // read slot k and build slot k use different quarters of the list (k vs k + 2), so a band never repeats a
      // word while every word can be read in one round and built in another
      const list = level === 3 ? NEAR_TARGETS : BUILD_WORDS[level]!;
      const k = slot8 >> 1;
      return even ? genRead(level, rng, k, 4, tag, base, list) : genBuild(level, rng, (k + 2) % 4, 4, tag, base, list);
    }
    case 7:
      return even ? genRead(7, rng, slot8 >> 1, 4, tag, base) : genSort(rng, slot8 >> 1, tag, base);
    case 8:
      if (!even) return genCompound(rng, slot8 >> 1, tag, base);
      return index % 4 === 0 ? genRead(8, rng, slot8 >> 2, 2, tag, base) : genPlural(rng, slot8 >> 2, tag, base);
    default:
      return even ? genNoteRead(rng, slot8 >> 1, tag, base) : genNoteBuild(rng, slot8 >> 1, tag, base);
  }
}

export const generatePaperBoat: ExerciseGenerator = (level, rng, index): Gen => {
  const lv = Math.max(0, Math.min(PB_MAX_LEVEL, level));
  const tag = `l${lv}n${index}`;
  if (lv >= 4 && index % 4 === 3) {
    // interleaved review: an item from an earlier level, stamped with that level's skill (ENGLISH_PATH §3.2)
    const src = rng.int(Math.max(1, lv - 4), lv - 1);
    return generateAt(src, rng, index, `r${src}-${tag}`);
  }
  return generateAt(lv, rng, index, tag);
};

/** Every word a level can put in front of the child as a target (tests: voice coverage, gating, pictures). */
export function targetsOf(level: number): string[] {
  switch (level) {
    case 0: return [...new Set(SWAP_PAIRS.map((p) => p.to))];
    case 1: return [...CVC];
    case 2: case 3: return [...NEAR_TARGETS];
    case 4: case 5: case 6: return [...BUILD_WORDS[level]!];
    case 7: return READ_SETS[7]!.map((s) => s[0]);
    case 8: return [...READ_SETS[8]!.map((s) => s[0]), ...Object.keys(PLURALS), ...Object.keys(COMPOUNDS)];
    default: return [];
  }
}
export { oneGraphemeApart };
