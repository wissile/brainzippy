import { beforeEach, describe, expect, it } from "vitest";
import { clearState, deriveRoundRecord, loadState, onRoundRecorded, saveState, type RoundSnapshot } from "../../src/services/storage";
import type { RoundRecord } from "../../src/account/schema";

const snap = (gameId: string): RoundSnapshot => ({ v: 1, gameId, progression: { difficulty: 1, streak: 0, played: [], results: [] }, currentId: "x", savedAt: 0 });

describe("round records derived from the game runtime's storage writes", () => {
  beforeEach(() => {
    localStorage.clear();
    clearState();
  });

  it("records one round from start snapshot → snapshot cleared → progress write, with tally deltas", () => {
    const seen: RoundRecord[] = [];
    const off = onRoundRecorded((r) => seen.push(r));
    saveState({ progress: { v: 1, stickers: [], roundsCompleted: 2, skills: { "math.count.subitize": { attempts: 5, firstTry: 2, completed: 3 } }, levels: { "counting-adventure": 1 } } });
    saveState({ round: snap("counting-adventure") });
    saveState({ round: snap("counting-adventure") }); // later exercise: same round
    saveState({ round: null }); // runtime clears the snapshot first…
    saveState({
      progress: {
        v: 1,
        stickers: ["counting-champ"],
        roundsCompleted: 3,
        skills: { "math.count.subitize": { attempts: 10, firstTry: 5, completed: 6 }, "math.count.make-set": { attempts: 7, firstTry: 3, completed: 5 } },
        levels: { "counting-adventure": 2 },
      },
      round: null,
    }); // …then writes progress
    off();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ gameId: "counting-adventure", level: 1, exercises: 8, firstTry: 6, stars: 2, skills: ["math.count.make-set", "math.count.subitize"] });
    expect(loadState().history).toHaveLength(1);
    expect(loadState().currentRound).toBeNull();
  });

  it("ignores writes that are not round completions (e.g. account sync folding progress in)", () => {
    const prev = { ...loadState(), currentRound: { gameId: "glow-cave-hops", startedAt: 0 } };
    const progress = { v: 1 as const, stickers: [], roundsCompleted: 5, skills: { a: { attempts: 1, firstTry: 1, completed: 1 } } };
    expect(deriveRoundRecord(prev, { progress }, 1000)).toBeNull(); // no `round` key
    expect(deriveRoundRecord({ ...prev, currentRound: null }, { progress, round: null }, 1000)).toBeNull(); // no round in play
    expect(deriveRoundRecord(prev, { progress: { ...progress, roundsCompleted: 0 }, round: null }, 1000)).toBeNull(); // count not raised
    expect(deriveRoundRecord(prev, { progress, round: null }, 61_000)).toMatchObject({ gameId: "glow-cave-hops", seconds: 61, exercises: 1, stars: 3 });
  });
});
