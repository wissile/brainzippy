import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { initExercise, exerciseReducer } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { renderLine } from "../../src/audio/voiceLines";
import { getWorld } from "../../src/content";
import { messageMystery, mmTutorial } from "../../src/games/message-mystery/definition";
import { LEVELS, MM_MAX_LEVEL, NONE, decode, generateMessageMystery, pickInbox, pickMessage } from "../../src/games/message-mystery/generator";
import { EXPLAIN_BY_LEVEL, HELP_FOR_CLUE, explainFor, hintFor, praiseFor } from "../../src/games/message-mystery/hints";
import {
  ALL_MESSAGES, BANK, CLUES, DOMAINS, type Msg, REVIEW_BANK, TOWN, cluePartIds, cluesOf, linkIsClue, linkTextDomain, msgLine, sayOf,
} from "../../src/games/message-mystery/messages";
import { mmBetween, mmIntro, mmOutro } from "../../src/games/message-mystery/story";
import { createRng } from "../../src/engine/rng";
import voice from "../../src/games/message-mystery/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, string[]> }>;
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 3);
const words = (s: string) => s.trim().split(/\s+/).length;
const allGenerated = () => {
  const out = [];
  for (const seed of SEEDS) for (let level = 0; level <= MM_MAX_LEVEL; level++) out.push(...generateBand(messageMystery, level, seed, 8));
  return out;
};

describe("message bank: fictional, accurate, short", () => {
  it("ids are unique, kebab-case without dots", () => {
    const ids = ALL_MESSAGES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it("every address and link uses a reserved .example domain; no real top-level domains anywhere", () => {
    for (const m of ALL_MESSAGES) {
      expect(DOMAINS).toContain(m.domain);
      const text = [m.from, ...m.body.map((p) => p.text), m.link?.text ?? "", m.file?.name ?? ""].join(" ");
      expect(text, m.id).not.toMatch(/\.(com|net|org|io|co|uk|gov|edu|app)\b/i);
      expect(text, m.id).not.toMatch(/https?:|www\./i);
      if (m.link) expect(linkTextDomain(m.link.text), m.id).not.toBeNull();
    }
  });
  it("safe messages come from the town's real address, ask for nothing secret, and have no clue", () => {
    for (const m of ALL_MESSAGES.filter((x) => x.safe)) {
      expect(m.domain, m.id).toBe(TOWN);
      expect(cluesOf(m), m.id).toEqual([]);
      if (m.link) expect(m.link.to, m.id).toBe(TOWN);
      if (m.file) expect(m.file.name, m.id).not.toMatch(/\.exe$/);
      expect(m.body.map((p) => p.text).join(" "), m.id).not.toMatch(/password|secret code|gift card|address|phone number/i);
    }
  });
  it("every trick carries at least one clue, and its sender/link clues match the data", () => {
    for (const m of ALL_MESSAGES.filter((x) => !x.safe)) {
      expect(cluesOf(m).length, m.id).toBeGreaterThan(0);
      // a sender clue means the address is not the town's; a link clue means its words and destination differ
      if (m.senderClue) expect(m.domain, m.id).not.toBe(TOWN);
      if (m.link) expect(linkIsClue(m), m.id).toBe(linkTextDomain(m.link.text) !== m.link.to);
      if (m.file?.clue) expect(m.file.name, m.id).toMatch(/\.exe$/);
    }
  });
  it("bodies are short enough for a 7-year-old (≤ 16 words) and threats stay mild", () => {
    for (const m of ALL_MESSAGES) {
      const body = m.body.map((p) => p.text).join(" ");
      expect(words(body), m.id).toBeLessThanOrEqual(16);
      expect(body, m.id).not.toMatch(/\b(kill|hurt|die|police|arrest|jail|scary|danger|hack|virus|stranger|meet me|photo of you)\b/i);
    }
  });
  it("each sort level's tricks are about that level's clue", () => {
    const need: Record<string, string[]> = { l0: ["secret"], l1: ["prize"], l2: ["urgent"], l3: ["keepSecret", "giftCard"], l4: ["sender", "lookAlike"], l5: ["link", "file"] };
    for (const [k, clues] of Object.entries(need)) {
      for (const m of BANK[k as keyof typeof BANK].filter((x) => !x.safe)) expect(cluesOf(m).some((c) => clues.includes(c)), `${k} ${m.id}`).toBe(true);
    }
    // clue mode: two or three clues per trick; level 8 tricks come from REAL town addresses (check another way)
    for (const m of BANK.l6.filter((x) => !x.safe)) expect(cluesOf(m).length, m.id).toBeGreaterThanOrEqual(2);
    for (const m of BANK.l8.filter((x) => !x.safe)) expect(m.domain, m.id).toBe(TOWN);
    // every clue type is taught somewhere
    for (const c of CLUES) expect(ALL_MESSAGES.some((m) => cluesOf(m).includes(c)), c).toBe(true);
  });
  it("each level bank has enough messages for its pattern without repeats", () => {
    for (const [i, spec] of LEVELS.entries()) {
      if (spec.mode === "inbox") continue;
      const tricks = spec.pattern.filter(Boolean).length;
      const safes = spec.pattern.length - tricks;
      expect(spec.bank.filter((m) => !m.safe).length, `level ${i}`).toBeGreaterThanOrEqual(tricks);
      expect(spec.bank.filter((m) => m.safe).length, `level ${i}`).toBeGreaterThanOrEqual(safes);
      expect(safes, `level ${i}: at least two safe messages`).toBeGreaterThanOrEqual(2);
      expect(spec.pattern.map((p) => (p ? "T" : "S")).join(""), `level ${i}: never three tricks in a row`).not.toContain("TTT");
    }
  });
});

describe("generator", () => {
  it("every generated exercise at every level × 60 seeds passes lint, has a declared skill and decodes back", () => {
    const problems: string[] = [];
    for (const ex of allGenerated()) {
      problems.push(...lintExercise(ex));
      if (!messageMystery.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: undeclared skill`);
      const d = decode(ex);
      if (d.mode !== LEVELS[d.level]!.mode) problems.push(`${ex.id}: mode mismatch`);
      if (ex.prompt && !lines[ex.prompt.line]) problems.push(`${ex.id}: prompt line ${ex.prompt.line} missing`);
      for (const m of d.msgs) if (!lines[msgLine(m)]) problems.push(`${ex.id}: no read-aloud for ${m.id}`);
    }
    for (const ex of messageMystery.exercises) problems.push(...lintExercise(ex));
    expect(problems).toEqual([]);
  });
  it("same seed → same round; ids are unique in every round", () => {
    for (let level = 0; level <= MM_MAX_LEVEL; level++) {
      expect(buildRound(messageMystery, { level, seed: 11 })).toEqual(buildRound(messageMystery, { level, seed: 11 }));
      for (const seed of SEEDS.slice(0, 10)) expect(() => buildRound(messageMystery, { level, seed })).not.toThrow();
    }
  });
  it("a band never repeats a message, follows its trick/safe pattern, and picks from the right bank", () => {
    for (const seed of SEEDS) {
      for (let level = 0; level <= MM_MAX_LEVEL; level++) {
        const spec = LEVELS[level]!;
        const band = generateBand(messageMystery, level, seed, 8);
        const msgs = band.flatMap((ex) => decode(ex).msgs.map((m) => m.id));
        expect(new Set(msgs).size, `level ${level} seed ${seed}`).toBe(msgs.length);
        if (spec.mode === "inbox") {
          for (const ex of band) {
            const d = decode(ex);
            expect(d.msgs.length).toBe(4);
            expect(d.msgs.filter((m) => m.safe).length).toBe(2);
            for (const m of d.msgs) expect(REVIEW_BANK).toContain(m);
          }
          continue;
        }
        band.forEach((ex, i) => {
          const m = decode(ex).msgs[0]!;
          expect(m.safe, `${ex.id}`).toBe(!spec.pattern[i]);
          expect(spec.bank).toContain(m);
        });
      }
    }
  });
  it("different seeds give different messages on the sort levels (daily variety)", () => {
    for (let level = 0; level <= 5; level++) {
      const sets = new Set(SEEDS.map((seed) => generateBand(messageMystery, level, seed, 8).map((e) => decode(e).msgs[0]!.id).join(",")));
      expect(sets.size, `level ${level}`).toBeGreaterThan(1);
    }
  });
  it("pickMessage / pickInbox are pure functions of (level, rng, index)", () => {
    expect(pickMessage(2, createRng(9), 3)).toBe(pickMessage(2, createRng(9), 3));
    expect(pickInbox(createRng(4), 2).map((m) => m.id)).toEqual(pickInbox(createRng(4), 2).map((m) => m.id));
    expect(generateMessageMystery(7, createRng(1), 0)).toEqual(generateMessageMystery(7, createRng(1), 0));
  });
});

describe("answers", () => {
  const ex = (level: number, pred: (m: Msg) => boolean) => {
    for (const seed of SEEDS) for (const e of generateBand(messageMystery, level, seed, 8)) if (pred(decode(e).msgs[0]!)) return e;
    throw new Error("none");
  };
  it("sort: trick → Ask a grown-up, safe → Safe; asking about a safe one is a gentle miss", () => {
    const trick = ex(0, (m) => !m.safe);
    const safe = ex(0, (m) => m.safe);
    expect(validateAnswer(trick.answer, "ask").correct).toBe(true);
    expect(validateAnswer(trick.answer, "safe").correct).toBe(false);
    expect(validateAnswer(safe.answer, "safe").correct).toBe(true);
    let s = exerciseReducer(initExercise(safe), { type: "SUBMIT", value: "ask" });
    expect(s.feedback?.correct).toBe(false);
    expect(hintFor(s)).toBe("mm.hint.askOk"); // never "wrong to ask": asking is always OK
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    expect(s.eliminated).toEqual(["ask"]);
    s = exerciseReducer(s, { type: "SUBMIT", value: "safe" });
    expect(s.feedback?.correct).toBe(true);
  });
  it("clue mode: the exact set of clue parts, or 'none' for a safe message", () => {
    for (const m of BANK.l6) {
      const e = generateBand(messageMystery, 6, 1, 8).find((x) => decode(x).msgs[0]!.id === m.id)!;
      expect(e, m.id).toBeDefined();
      const want = m.safe ? [NONE] : cluePartIds(m);
      expect(validateAnswer(e.answer, [...want].reverse()).correct, m.id).toBe(true);
      if (!m.safe) {
        expect(validateAnswer(e.answer, want.slice(1)).correct).toBe(false);
        expect(validateAnswer(e.answer, [...want, "b0"].filter((v, i, a) => a.indexOf(v) === i)).correct).toBe(want.includes("b0"));
      }
    }
  });
  it("action and verify: the same three cards every time", () => {
    const a = ex(7, (m) => !m.safe);
    const b = ex(7, (m) => m.safe);
    expect(a.answer.kind === "choice" && a.answer.options.map((o) => o.id)).toEqual(["tell", "stop", "read"]);
    expect(validateAnswer(a.answer, "tell").correct).toBe(true);
    expect(validateAnswer(b.answer, "read").correct).toBe(true);
    const v = ex(8, (m) => !m.safe);
    expect(validateAnswer(v.answer, "check").correct).toBe(true);
    expect(validateAnswer(ex(8, (m) => m.safe).answer, "ok").correct).toBe(true);
    expect(validateAnswer(ex(8, (m) => m.safe).answer, "reply").correct).toBe(false);
    expect(validateAnswer(v.answer, "ok").correct).toBe(false);
  });
  it("asking is never wrong: 'check another way, with a grown-up' is accepted on every item at every level", () => {
    let offered = 0;
    for (const e of [...allGenerated(), mmTutorial]) {
      if (e.answer.kind !== "choice" || !e.answer.options.some((o) => o.id === "check")) continue;
      offered++;
      expect(validateAnswer(e.answer, "check").correct, e.id).toBe(true);
    }
    // level 8 offers it on every item (so the check above is not vacuous)
    for (const seed of SEEDS) for (const e of generateBand(messageMystery, 8, seed, 8)) {
      expect(e.answer.kind === "choice" && e.answer.options.map((o) => o.id)).toContain("check");
    }
    expect(offered).toBeGreaterThanOrEqual(SEEDS.length * 8);
  });
  it("level 8 safe messages fit what the child knows and never push them to go somewhere now", () => {
    for (const m of BANK.l8.filter((x) => x.safe)) {
      const text = m.body.map((p) => p.text).join(" ");
      expect(text, m.id).not.toMatch(/\b(hurry|quick|now|come (outside|to))\b/i);
    }
    expect(BANK.l8.map((m) => m.id)).not.toContain("owl-show");
    expect(BANK.l8.map((m) => m.id)).not.toContain("rainbow");
  });
  it("inbox: every message into its bin; a miss marks the wrong ones", () => {
    const e = generateBand(messageMystery, 9, 5, 8)[0]!;
    const d = decode(e);
    const right = Object.fromEntries(d.msgs.map((m) => [m.id, m.safe ? "safe" : "ask"]));
    expect(validateAnswer(e.answer, right).correct).toBe(true);
    const wrong = { ...right, [d.msgs[0]!.id]: right[d.msgs[0]!.id] === "safe" ? "ask" : "safe" };
    const res = validateAnswer(e.answer, wrong);
    expect(res.correct).toBe(false);
    expect(res.parts?.[d.msgs[0]!.id]).toBe(false);
    expect(res.parts?.[d.msgs[1]!.id]).toBe(true);
  });
});

describe("helper, praise and voice", () => {
  it("first-miss lines diagnose the miss", () => {
    const find = (level: number, pred: (m: Msg) => boolean) => generateBand(messageMystery, level, 3, 8).find((e) => pred(decode(e).msgs[0]!))!;
    const miss = (e: ReturnType<typeof find>, value: string | string[]) => exerciseReducer(initExercise(e), { type: "SUBMIT", value });
    expect(hintFor(miss(find(2, (m) => !m.safe), "safe"))).toBe("mm.help.rush");
    expect(hintFor(miss(find(4, (m) => !m.safe), "safe"))).toBe("mm.hint.polish");
    expect(hintFor(miss(find(7, (m) => !m.safe), "stop"))).toBe("mm.hint.reply");
    expect(hintFor(miss(find(8, (m) => !m.safe), "reply"))).toBe("mm.hint.friend");
    expect(hintFor(miss(find(8, (m) => m.safe), "reply"))).toBe("mm.hint.expected");
    const clue = find(6, (m) => m.id === "gems-hurry");
    expect(hintFor(miss(clue, ["b0"]))).toBe("mm.help.rush"); // the first clue they missed
    expect(explainFor(mmTutorial)).toBe("mm.help.start");
  });
  it("every line the world can say exists; praise is about process, never ability", () => {
    const ids = new Set<string>([
      ...Object.values(HELP_FOR_CLUE), ...EXPLAIN_BY_LEVEL, "mm.hint.askOk", "mm.hint.reply", "mm.hint.friend", "mm.hint.expected", "mm.hint.polish", "mm.hint.missed",
      "mm.retry", "mm.hint.model", "mm.idle", "mm.ready", "mm.back", "mm.zoom.file",
      ...CLUES.map((c) => `mm.clue.${c}`),
      ...[...mmIntro, ...mmOutro].map((b) => b.line), ...Object.values(mmBetween).map((b) => b.line),
      ...ALL_MESSAGES.map(msgLine),
    ]);
    for (const ex of allGenerated()) {
      for (const p of praiseFor(ex)) ids.add(p);
      const a = ex.answer;
      if (a.kind === "choice") for (const o of a.options) if (o.say) ids.add(o.say);
    }
    const missing = [...ids].filter((id) => !lines[id]);
    expect(missing).toEqual([]);
    for (const [id, l] of Object.entries(lines)) {
      if (id.startsWith("mm.praise")) expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|proud of you/);
      if (!id.startsWith("mm.msg.")) expect(words(l.text), id).toBeLessThanOrEqual(16);
      expect(l.text, id).not.toMatch(/\b(scary|danger|hacker|virus|steal)\b/i);
    }
  });
  it("read-aloud lines match the messages exactly; magnifier lines cover every domain", () => {
    for (const m of ALL_MESSAGES) expect(lines[msgLine(m)]?.text, m.id).toBe(sayOf(m));
    for (const id of ["mm.zoom.from", "mm.zoom.to"]) expect(lines[id]!.vary!.addr).toEqual(DOMAINS.map((d) => `${d}.example`));
    expect(renderLine("mm.zoom.from", { addr: "bytebery.example" })).toBe("It really comes from bytebery.example.");
  });
  it("the world is registered in the live cyber library", () => {
    const w = getWorld("message-mystery")!;
    expect(w.subject).toBe("cyber");
    expect(w.maxLevel).toBe(MM_MAX_LEVEL);
    expect(w.characters[0]).toBe("fenn");
  });
});
