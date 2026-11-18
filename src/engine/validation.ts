import type { Answer, AnswerKey, AnswerOption, AnswerValue, Exercise, ValidationResult } from "./types";

/**
 * Answer validation for every answer kind. Pure; the correct answer is DATA in `exercise.answer`.
 * Boards submit `{ type: "SUBMIT", value }`; the reducer calls `isSubmittable` then `validateAnswer`.
 */

const isStrArr = (v: unknown): v is readonly string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isRecord = (v: unknown): v is Readonly<Record<string, string>> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "string");
const ids = (opts: readonly AnswerOption[]) => opts.map((o) => o.id);

/** Is `value` the right SHAPE for this answer (and made only of its options)? Malformed submissions are ignored, never "wrong". */
export function isSubmittable(answer: Answer, value: AnswerValue): boolean {
  switch (answer.kind) {
    case "number":
      return typeof value === "number" && Number.isFinite(value) && (!answer.choices || answer.choices.includes(value));
    case "numeric":
      return typeof value === "number" && Number.isFinite(value);
    case "choice":
      return typeof value === "string" && ids(answer.options).includes(value);
    case "set": {
      const known = ids(answer.options);
      return isStrArr(value) && value.every((v) => known.includes(v));
    }
    case "sequence": {
      const known = ids(answer.pieces);
      return isStrArr(value) && value.length > 0 && value.every((v) => known.includes(v)) && new Set(value).size === value.length;
    }
    case "match": {
      if (!isRecord(value)) return false;
      const items = ids(answer.items);
      const targets = ids(answer.targets);
      return Object.entries(value).every(([k, v]) => items.includes(k) && targets.includes(v));
    }
  }
}

/** Sequence pieces compare by their visible text (so two "o" tiles are interchangeable), else by id. */
const pieceValue = (answer: Extract<Answer, { kind: "sequence" }>, id: string) => {
  const p = answer.pieces.find((x) => x.id === id);
  return p?.text ?? id;
};

export function validateAnswer(answer: Answer, value: AnswerValue): ValidationResult {
  switch (answer.kind) {
    case "number": {
      const v = value as number;
      if (v === answer.value) return { correct: true, reason: "correct" };
      if (answer.choices) return { correct: false, reason: "wrong-number" };
      return { correct: false, reason: v > answer.value ? "too-high" : "too-low" };
    }
    case "numeric": {
      const v = value as number;
      if (Math.abs(v - answer.value) <= answer.tolerance + 1e-9) return { correct: true, reason: "correct" };
      return { correct: false, reason: v > answer.value ? "too-high" : "too-low" };
    }
    case "choice":
      return value === answer.correct ? { correct: true, reason: "correct" } : { correct: false, reason: "wrong-choice" };
    case "set": {
      const picked = [...new Set(value as readonly string[])];
      const parts = Object.fromEntries(picked.map((id) => [id, answer.correct.includes(id)]));
      const wrong = picked.filter((id) => !answer.correct.includes(id)).length;
      const missing = answer.correct.filter((id) => !picked.includes(id)).length;
      if (wrong === 0 && missing === 0) return { correct: true, reason: "correct", parts };
      if (picked.length === 0) return { correct: false, reason: "incomplete", parts };
      return { correct: false, reason: wrong > 0 ? "too-many" : "too-few", parts };
    }
    case "sequence": {
      const v = value as readonly string[];
      const parts = Object.fromEntries(v.map((id, i) => [String(i), i < answer.order.length && pieceValue(answer, id) === pieceValue(answer, answer.order[i]!)]));
      const allRight = v.length === answer.order.length && Object.values(parts).every(Boolean);
      if (allRight) return { correct: true, reason: "correct", parts };
      return { correct: false, reason: v.length < answer.order.length ? "incomplete" : "wrong-order", parts };
    }
    case "match": {
      const v = value as Readonly<Record<string, string>>;
      const parts = Object.fromEntries(Object.entries(v).map(([item, target]) => [item, answer.pairs[item] === target]));
      const complete = answer.items.every((it) => v[it.id] !== undefined);
      if (complete && Object.values(parts).every(Boolean)) return { correct: true, reason: "correct", parts };
      return { correct: false, reason: complete ? "wrong-match" : "incomplete", parts };
    }
  }
}

/** The correct answer as a submittable value (used for the modelled answer). */
export function correctValue(answer: Answer): AnswerValue {
  switch (answer.kind) {
    case "number":
    case "numeric":
      return answer.value;
    case "choice":
      return answer.correct;
    case "set":
      return answer.correct;
    case "sequence":
      return answer.order;
    case "match":
      return answer.pairs;
  }
}

/** Keys a hint may grey out: number choices, or option / piece ids. Empty for numeric and match. */
export function answerKeys(answer: Answer): AnswerKey[] {
  switch (answer.kind) {
    case "number":
      return [...(answer.choices ?? [])];
    case "choice":
    case "set":
      return ids(answer.options);
    case "sequence":
      return ids(answer.pieces);
    case "numeric":
    case "match":
      return [];
  }
}

/** Keys that are part of the correct answer (never eliminated). */
export function correctKeys(answer: Answer): AnswerKey[] {
  switch (answer.kind) {
    case "number":
      return [answer.value];
    case "choice":
      return [answer.correct];
    case "set":
      return [...answer.correct];
    case "sequence": {
      // any piece whose text is needed somewhere in the order counts as correct
      const needed = new Set(answer.order.map((id) => pieceValue(answer, id)));
      return answer.pieces.filter((p) => needed.has(p.text ?? p.id)).map((p) => p.id);
    }
    case "numeric":
    case "match":
      return [];
  }
}

/** The key a gentle first-miss hint greys out (the wrong pick), or null when there is nothing safe to remove. */
export function nudgeKey(answer: Answer, value: AnswerValue): AnswerKey | null {
  const right = correctKeys(answer);
  switch (answer.kind) {
    case "number":
      return answer.choices && typeof value === "number" && !right.includes(value) ? value : null;
    case "choice":
      return typeof value === "string" && !right.includes(value) ? value : null;
    case "set":
    case "sequence":
      return isStrArr(value) ? (value.find((id) => !right.includes(id)) ?? null) : null;
    case "numeric":
    case "match":
      return null;
  }
}

// ---------------------------------------------------------------- convenience for number games

/** The numeric answer (number / numeric kinds); NaN for other kinds. */
export function targetOf(ex: Exercise): number {
  return ex.answer.kind === "number" || ex.answer.kind === "numeric" ? ex.answer.value : NaN;
}
/** Number choices (number kind); empty otherwise. */
export function choicesOf(ex: Exercise): readonly number[] {
  return ex.answer.kind === "number" ? (ex.answer.choices ?? []) : [];
}

/** Validate a numeric choice (tap-count after counting, choose-count, number boards). */
export function validateChoice(exercise: Exercise, chosen: number): ValidationResult {
  return validateAnswer(exercise.answer, chosen);
}

/** Validate a make-set submission by the number of objects in the basket. */
export function validateSet(exercise: Exercise, basketCount: number): ValidationResult {
  const target = targetOf(exercise);
  if (basketCount === target) return { correct: true, reason: "correct" };
  if (basketCount === 0) return { correct: false, reason: "incomplete" };
  return { correct: false, reason: basketCount > target ? "too-many" : "too-few" };
}

// ---------------------------------------------------------------- lint

const COUNTING = new Set(["tap-count", "choose-count", "make-set"]);

function lintOptions(id: string, label: string, opts: readonly AnswerOption[], min: number): string[] {
  const p: string[] = [];
  if (opts.length < min) p.push(`${id}: needs at least ${min} ${label}`);
  if (new Set(ids(opts)).size !== opts.length) p.push(`${id}: duplicate ${label} ids`);
  for (const o of opts) if (!o.text?.trim() && !o.art) p.push(`${id}: ${label} "${o.id}" needs text or art`);
  return p;
}

/** Structural checks for authored or generated exercise data. Returns a list of problems (empty = valid). */
export function lintExercise(ex: Exercise): string[] {
  const problems: string[] = [];
  const a = ex.answer;
  if (!ex.id || !/^[a-z0-9][a-z0-9.\-]*$/.test(ex.id)) problems.push(`${ex.id}: id must be lowercase a-z0-9 . -`);
  if (!ex.skillId) problems.push(`${ex.id}: missing skillId`);
  if (!ex.objective.trim()) problems.push(`${ex.id}: missing objective`);
  if (ex.ages[0] > ex.ages[1]) problems.push(`${ex.id}: ages reversed`);
  if (!Number.isInteger(ex.difficulty) || ex.difficulty < 1) problems.push(`${ex.id}: difficulty must be an integer ≥ 1`);
  if (ex.prompt && (!ex.prompt.line || !ex.prompt.text)) problems.push(`${ex.id}: prompt needs line and text`);
  if (!ex.a11yDescription.trim()) problems.push(`${ex.id}: missing a11y description`);
  if (COUNTING.has(ex.interaction) && a.kind !== "number") problems.push(`${ex.id}: ${ex.interaction} needs a number answer`);

  switch (a.kind) {
    case "number": {
      if (!Number.isInteger(a.value)) problems.push(`${ex.id}: number answer must be a whole number`);
      if (COUNTING.has(ex.interaction) && (a.value < 1 || a.value > 20)) problems.push(`${ex.id}: target out of range`);
      if (ex.interaction === "make-set") {
        if (!ex.poolSize || ex.poolSize <= a.value) problems.push(`${ex.id}: poolSize must exceed target`);
      } else if (COUNTING.has(ex.interaction) && !a.choices) problems.push(`${ex.id}: needs at least 2 choices`);
      if (a.choices) {
        if (a.choices.length < 2) problems.push(`${ex.id}: needs at least 2 choices`);
        if (!a.choices.includes(a.value)) problems.push(`${ex.id}: choices must include target`);
        if (new Set(a.choices).size !== a.choices.length) problems.push(`${ex.id}: duplicate choices`);
      }
      break;
    }
    case "numeric":
      if (!Number.isFinite(a.value)) problems.push(`${ex.id}: numeric value must be finite`);
      if (!(a.tolerance >= 0)) problems.push(`${ex.id}: tolerance must be ≥ 0`);
      if (a.min !== undefined && a.max !== undefined && a.min >= a.max) problems.push(`${ex.id}: min must be < max`);
      if ((a.min !== undefined && a.value < a.min) || (a.max !== undefined && a.value > a.max)) problems.push(`${ex.id}: value outside min..max`);
      break;
    case "choice":
      problems.push(...lintOptions(ex.id, "options", a.options, 2));
      if (!ids(a.options).includes(a.correct)) problems.push(`${ex.id}: correct option missing`);
      break;
    case "set":
      problems.push(...lintOptions(ex.id, "options", a.options, 2));
      if (a.correct.length === 0) problems.push(`${ex.id}: set needs at least one correct option`);
      if (a.correct.some((c) => !ids(a.options).includes(c))) problems.push(`${ex.id}: correct option missing`);
      if (new Set(a.correct).size !== a.correct.length) problems.push(`${ex.id}: duplicate correct options`);
      break;
    case "sequence":
      problems.push(...lintOptions(ex.id, "pieces", a.pieces, 2));
      if (a.order.length < 2) problems.push(`${ex.id}: sequence needs at least 2 steps`);
      if (a.order.some((c) => !ids(a.pieces).includes(c))) problems.push(`${ex.id}: order uses unknown piece`);
      if (new Set(a.order).size !== a.order.length) problems.push(`${ex.id}: order repeats a piece`);
      break;
    case "match": {
      problems.push(...lintOptions(ex.id, "items", a.items, 2), ...lintOptions(ex.id, "targets", a.targets, 2));
      const items = ids(a.items);
      const targets = ids(a.targets);
      if (items.some((i) => !(i in a.pairs))) problems.push(`${ex.id}: every item needs a target`);
      if (Object.entries(a.pairs).some(([i, t]) => !items.includes(i) || !targets.includes(t))) problems.push(`${ex.id}: pairs use unknown ids`);
      break;
    }
  }
  return problems;
}

/** Narrow a submitted/model value to a number (number boards), else null. */
export function asNumber(v: AnswerValue | null | undefined): number | null {
  return typeof v === "number" ? v : null;
}
