import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  ALL_MESSAGES, BANK, CLUE_LABEL, type ClueId, type Msg, REVIEW_BANK, addressOf, cluePartIds, cluesOf, indexOfMsg, msgAt, msgLine, partsOf,
} from "./messages";

/**
 * Fenn's Message Mystery — exercise generator (docs/curriculum/cyber.md §4.4; docs/worlds/message-mystery.md).
 * Pure: same (level, rng, index) → same exercise. Messages are AUTHORED (each has a voice clip and an expert
 * check); the generator only chooses which message goes where.
 *
 * Index = position in the round (the engine plays a band in index order), so the trick/safe pattern per level
 * is fixed by index and the rng picks the message inside that slot's bucket. Buckets are disjoint
 * (bank position % slots), so a message never repeats within a band. Every pattern has at least two safe
 * messages and never three tricks in a row.
 *
 * Level (0-based) → content:
 *   0  sort · asks for a password / personal info, said plainly            cyber.scam.clues
 *   1  sort · prize too good to be true                                    cyber.scam.clues
 *   2  sort · tries to rush you                                            cyber.scam.clues
 *   3  sort · "don't tell" / gift card                                     cyber.scam.clues
 *   4  sort + magnifier · neat tricks, the sender is the clue              cyber.scam.clues
 *   5  sort + magnifier · link goes elsewhere / unexpected file            cyber.scam.clues
 *   6  clue mode · tap every clue (2–3), or "no clues"                      cyber.scam.clues
 *   7  action · the safest thing to do (review bank)                       cyber.scam.action
 *   8  check another way · real-address tricks vs urgent-but-safe          cyber.scam.verify
 *   9  inbox · sort four messages at once (review bank)                    cyber.scam.action
 */

export const MM_AGES = [7, 11] as const;
export const SKILL = { clues: "cyber.scam.clues", action: "cyber.scam.action", verify: "cyber.scam.verify" } as const;

export type Mode = "sort" | "clues" | "action" | "verify" | "inbox";
export const MODES: readonly Mode[] = ["sort", "clues", "action", "verify", "inbox"];
const T = true, S = false;

export interface LevelSpec {
  label: string;
  mode: Mode;
  skill: string;
  /** Sender address (and link destination) hidden until magnified. */
  fold: boolean;
  /** Clue types this level is about (hints point at these first). */
  focus: readonly ClueId[];
  /** Trick (true) / safe (false) by index. */
  pattern: readonly boolean[];
  bank: readonly Msg[];
}
export const LEVELS: readonly LevelSpec[] = [
  { label: "asks for a password or personal info", mode: "sort", skill: SKILL.clues, fold: false, focus: ["secret"], pattern: [T, S, T, S, S, T, S, T], bank: BANK.l0 },
  { label: "prize too good to be true", mode: "sort", skill: SKILL.clues, fold: false, focus: ["prize", "secret"], pattern: [S, T, T, S, T, S, S, T], bank: BANK.l1 },
  { label: "tries to rush you", mode: "sort", skill: SKILL.clues, fold: false, focus: ["urgent"], pattern: [T, S, S, T, S, T, T, S], bank: BANK.l2 },
  { label: "says don't tell / wants a gift card", mode: "sort", skill: SKILL.clues, fold: false, focus: ["keepSecret", "giftCard"], pattern: [S, T, S, T, T, S, T, S], bank: BANK.l3 },
  { label: "neat tricks: check the real sender (magnifier)", mode: "sort", skill: SKILL.clues, fold: true, focus: ["sender", "lookAlike"], pattern: [T, S, T, S, S, T, S, T], bank: BANK.l4 },
  { label: "link goes elsewhere / unexpected file (magnifier)", mode: "sort", skill: SKILL.clues, fold: true, focus: ["link", "file"], pattern: [S, T, T, S, T, S, S, T], bank: BANK.l5 },
  { label: "clue mode: tap every clue", mode: "clues", skill: SKILL.clues, fold: false, focus: [], pattern: [T, T, S, T, T, S, T, T], bank: BANK.l6 },
  { label: "the safest thing to do", mode: "action", skill: SKILL.action, fold: false, focus: [], pattern: [T, S, T, T, S, T, S, T], bank: REVIEW_BANK },
  { label: "check another way: real-address tricks vs urgent-but-safe", mode: "verify", skill: SKILL.verify, fold: false, focus: [], pattern: [S, T, S, S, T, S, T, S], bank: BANK.l8 },
  { label: "inbox: sort four messages", mode: "inbox", skill: SKILL.action, fold: false, focus: [], pattern: [], bank: REVIEW_BANK },
];
export const MM_MAX_LEVEL = LEVELS.length - 1;
export const INBOX_SIZE = 4;

// ---------------------------------------------------------------- answers

export const BIN_OPTIONS: readonly AnswerOption[] = [
  { id: "safe", text: "Safe", say: "mm.bin.safe" },
  { id: "ask", text: "Ask a grown-up", say: "mm.bin.ask" },
];
/** Level 7: the same three cards every time (so the card count never gives the answer away). */
export const ACTION_OPTIONS: readonly AnswerOption[] = [
  { id: "tell", text: "Don't tap or reply. Show a grown-up.", say: "mm.act.tell" },
  { id: "stop", text: "Reply and say stop.", say: "mm.act.stop" },
  { id: "read", text: "Read it. Reply if you want.", say: "mm.act.read" },
];
/** Level 8. */
export const VERIFY_OPTIONS: readonly AnswerOption[] = [
  { id: "ok", text: "It was expected and asks for nothing secret. Read it.", say: "mm.act.ok" },
  { id: "check", text: "Check another way, with a grown-up.", say: "mm.act.check" },
  { id: "reply", text: "Reply to the message to check.", say: "mm.act.reply" },
];
export const NONE = "none";

const PROMPT: Record<Mode, { line: string; text: string }> = {
  sort: { line: "mm.prompt.sort", text: "Safe, or ask a grown-up?" },
  clues: { line: "mm.prompt.clues", text: "Tap every clue you can find." },
  action: { line: "mm.prompt.action", text: "What's the safest thing to do?" },
  verify: { line: "mm.prompt.verify", text: "What should you do?" },
  inbox: { line: "mm.prompt.inbox", text: "Sort all four messages." },
};
const MAGNIFY_PROMPT = { line: "mm.prompt.magnify", text: "Check the real address. Safe, or ask?" };

function describe(m: Msg, fold: boolean): string {
  const from = fold ? `From ${m.from} (use the magnifier to see the real address).` : `From ${m.from}, ${addressOf(m)}.`;
  const link = m.link ? ` Link: ${m.link.text}${fold ? "" : `, really goes to ${m.link.to}.example`}.` : "";
  const file = m.file ? ` File: ${m.file.name}.` : "";
  return `${from} ${m.body.map((p) => p.text).join(" ")}${link}${file}`;
}

/** Build one single-message exercise (sort / clues / action / verify). */
export function messageExercise(m: Msg, level: number, opts: { id: string; seed: number; tutorial?: boolean }): Omit<Exercise, "difficulty"> {
  const spec = LEVELS[level]!;
  const mode = spec.mode;
  const prompt = opts.tutorial ? { line: "mm.prompt.tutorial", text: "Tap Ask a grown-up!" } : spec.fold ? MAGNIFY_PROMPT : PROMPT[mode];
  const base = {
    id: opts.id,
    skillId: spec.skill,
    ages: MM_AGES,
    interaction: "choose" as const,
    seed: opts.seed,
    prompt,
    params: { mode: MODES.indexOf(mode), level, fold: spec.fold ? 1 : 0, m: indexOfMsg(m), trick: m.safe ? 0 : 1 },
    ...(opts.tutorial ? { tutorial: true } : {}),
  };
  const msgDesc = describe(m, spec.fold);
  switch (mode) {
    case "clues": {
      const parts = partsOf(m);
      const correct = m.safe ? [NONE] : cluePartIds(m);
      return {
        ...base,
        objective: "Find every clue that a message is a trick.",
        objectKind: "magnifier",
        answer: { kind: "set", correct, options: [...parts.map((p) => ({ id: p.id, text: p.text })), { id: NONE, text: "No clues: it looks safe" }] },
        a11yDescription: `A message. ${msgDesc} Press each part that is a clue, or No clues, then Done.`,
      };
    }
    case "action":
      return {
        ...base,
        objective: "Choose the safest thing to do with a message.",
        objectKind: "action",
        answer: { kind: "choice", correct: m.safe ? "read" : "tell", options: ACTION_OPTIONS },
        a11yDescription: `A message. ${msgDesc} Choose the safest thing to do.`,
      };
    case "verify":
      return {
        ...base,
        objective: "Check a surprising message another way before acting on it.",
        objectKind: "action",
        answer: { kind: "choice", correct: m.safe ? "ok" : "check", options: VERIFY_OPTIONS },
        a11yDescription: `A message. ${msgDesc} Choose what to do.`,
      };
    default:
      return {
        ...base,
        objective: "Spot clues that a message is a trick and send it to a grown-up.",
        objectKind: "letter",
        answer: { kind: "choice", correct: m.safe ? "safe" : "ask", options: BIN_OPTIONS },
        a11yDescription: `A message. ${msgDesc} Put it in Safe, or in Ask a grown-up.`,
      };
  }
}

/** Inbox (level 9): four messages at once, each into a bin (match answer). */
export function inboxExercise(msgs: readonly Msg[], level: number, opts: { id: string; seed: number }): Omit<Exercise, "difficulty"> {
  const pairs: Record<string, string> = {};
  for (const m of msgs) pairs[m.id] = m.safe ? "safe" : "ask";
  const params: Record<string, number> = { mode: MODES.indexOf("inbox"), level, fold: 0, n: msgs.length };
  msgs.forEach((m, i) => (params[`m${i}`] = indexOfMsg(m)));
  return {
    id: opts.id,
    skillId: LEVELS[level]!.skill,
    objective: "Sort a whole inbox: safe messages, and messages to show a grown-up.",
    ages: MM_AGES,
    interaction: "choose",
    seed: opts.seed,
    objectKind: "inbox",
    prompt: PROMPT.inbox,
    params,
    answer: { kind: "match", pairs, items: msgs.map((m) => ({ id: m.id, text: m.from, say: msgLine(m) })), targets: BIN_OPTIONS },
    a11yDescription: `An inbox with ${msgs.length} messages. ${msgs.map((m, i) => `Message ${i + 1}: ${describe(m, false)}`).join(" ")} Put each one in Safe or Ask a grown-up, then press Done.`,
  };
}

// ---------------------------------------------------------------- selection

/** The k-th of `slots` disjoint buckets of a list (position % slots === k). */
const bucket = <T,>(list: readonly T[], k: number, slots: number) => list.filter((_, j) => j % slots === k);
const slotOf = (pattern: readonly boolean[], index: number, trick: boolean) => pattern.slice(0, index).filter((p) => p === trick).length;

export function pickMessage(level: number, rng: Rng, index: number): Msg {
  const spec = LEVELS[level]!;
  const i = index % spec.pattern.length;
  const trick = spec.pattern[i]!;
  const pool = spec.bank.filter((m) => m.safe !== trick);
  const slots = spec.pattern.filter((p) => p === trick).length;
  return rng.pick(bucket(pool, slotOf(spec.pattern, i, trick) % slots, slots));
}

export function pickInbox(rng: Rng, index: number, slots = 8): Msg[] {
  const tricks = bucket(REVIEW_BANK.filter((m) => !m.safe), index % slots, slots);
  const safe = bucket(REVIEW_BANK.filter((m) => m.safe), index % slots, slots);
  const two = (list: Msg[]) => rng.shuffle(list).slice(0, 2);
  return rng.shuffle([...two(tricks), ...two(safe)]);
}

export const generateMessageMystery: ExerciseGenerator = (level, rng, index) => {
  const seed = rng.int(1, 1_000_000);
  if (LEVELS[level]!.mode === "inbox") {
    const msgs = pickInbox(rng, index);
    return inboxExercise(msgs, level, { id: `mm-inbox-${msgs.map((m) => indexOfMsg(m)).join("-")}-l${level}n${index}`, seed });
  }
  const m = pickMessage(level, rng, index);
  return messageExercise(m, level, { id: `mm-${LEVELS[level]!.mode}-${m.id}-l${level}n${index}`, seed });
};

// ---------------------------------------------------------------- decoding (board side)

export interface Decoded {
  mode: Mode;
  level: number;
  fold: boolean;
  msgs: Msg[];
}
export function decode(ex: Pick<Exercise, "params">): Decoded {
  const q = ex.params ?? {};
  const mode = MODES[q.mode ?? 0] ?? "sort";
  const msgs = mode === "inbox" ? Array.from({ length: q.n ?? 0 }, (_, i) => msgAt(q[`m${i}`] ?? 0)) : [msgAt(q.m ?? 0)];
  return { mode, level: q.level ?? 0, fold: q.fold === 1, msgs };
}

/** The clue a hint should point at for this exercise's message (null for a safe one). */
export function hintClue(ex: Pick<Exercise, "params">, m: Msg): ClueId | null {
  const d = decode(ex);
  const all = cluesOf(m);
  if (!all.length) return null;
  const focus = LEVELS[d.level]?.focus ?? [];
  return focus.find((c) => all.includes(c)) ?? all[0]!;
}
export const clueLabel = (c: ClueId) => CLUE_LABEL[c];
export const messageCount = ALL_MESSAGES.length;
