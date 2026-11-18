import { act as rtlAct, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useReducer } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { type ExerciseEvent, exerciseReducer, initExercise } from "../../src/engine/session";
import type { Answer } from "../../src/engine/types";
import { OptionBoard, SequenceBoard } from "../../src/game/answer-boards";
import type { BoardProps } from "../../src/game/boards";
import { ANSWERS, exerciseWith } from "./answerFixtures";

/** Mount a default board wired to the real reducer, like GameRunner does (feedback is acknowledged by `done()`). */
function mount(Board: (p: BoardProps) => React.JSX.Element, answer: Answer) {
  const log: ExerciseEvent[] = [];
  let dispatch: (e: ExerciseEvent) => void = () => {};
  function Harness() {
    const [st, d] = useReducer(exerciseReducer, initExercise(exerciseWith(answer)));
    dispatch = (e) => {
      log.push(e);
      d(e);
    };
    return (
      <main data-phase={st.phase} data-stage={st.hintStage}>
        <Board st={st} act={dispatch} alongIndex={-1} ObjectArt={({ kind }) => <i data-art={kind} />} Basket={() => <i />} />
      </main>
    );
  }
  render(<Harness />);
  const main = () => screen.getByRole("main");
  return { log, main, done: () => rtlAct(() => dispatch({ type: "FEEDBACK_DONE" })) };
}
const option = (id: string) => document.querySelector(`[data-testid="choice"][data-value="${id}"]`) as HTMLButtonElement;
const check = () => screen.getByTestId("done");

afterEach(cleanup);

describe("default answer boards", () => {
  it("choice: tapping an option submits its id; a wrong pick is greyed out; picture and text render", () => {
    const b = mount(OptionBoard, ANSWERS.choice);
    expect(option("cat").querySelector('[data-art="cat"]')).not.toBeNull();
    expect(option("cat").getAttribute("aria-label")).toBe("cat");
    fireEvent.click(option("cat"));
    expect(b.log.at(-1)).toEqual({ type: "SUBMIT", value: "cat" });
    expect(b.main().dataset.phase).toBe("feedback");
    b.done();
    expect(option("cat").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(option("cat"));
    expect(b.log).toHaveLength(2); // the click on a greyed-out option did nothing
    fireEvent.click(option("ball"));
    expect(b.log.at(-1)).toEqual({ type: "SUBMIT", value: "ball" });
    expect(b.main().dataset.phase).toBe("feedback");
  });

  it("set: options toggle (aria-pressed) and the check button submits the selection", () => {
    const b = mount(OptionBoard, ANSWERS.set);
    expect(check().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(option("p1"));
    fireEvent.click(option("p2"));
    expect(option("p1").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(check());
    expect(b.log.at(-1)).toEqual({ type: "SUBMIT", value: ["p1", "p2"] });
    b.done();
    // the wrong pick is greyed out and dropped; the right one stays selected
    expect(option("p1").getAttribute("aria-disabled")).toBe("true");
    expect(option("p2").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(option("p3"));
    fireEvent.click(check());
    expect(b.log.at(-1)).toEqual({ type: "SUBMIT", value: ["p2", "p3"] });
  });

  it("sequence: pieces fill slots in order; after a miss the correct start stays; model shows on miss 2", () => {
    const b = mount(SequenceBoard, ANSWERS.sequence);
    for (const id of ["b", "o1", "k", "o2"]) fireEvent.click(option(id));
    expect(screen.getAllByTestId("placed").map((e) => e.getAttribute("data-value"))).toEqual(["b", "o1", "k", "o2"]);
    fireEvent.click(check());
    expect(b.log.at(-1)).toEqual({ type: "SUBMIT", value: ["b", "o1", "k", "o2"] });
    b.done();
    expect(screen.getAllByTestId("placed").map((e) => e.getAttribute("data-value"))).toEqual(["b", "o1"]);
    // take a placed piece back
    fireEvent.click(screen.getAllByTestId("placed")[1]!);
    expect(screen.getAllByTestId("placed")).toHaveLength(1);
    for (const id of ["k", "o1", "o2"]) fireEvent.click(option(id));
    fireEvent.click(check());
    b.done();
    expect(b.main().dataset.stage).toBe("2");
    expect(option("x").getAttribute("aria-disabled")).toBe("true"); // the distractor is out
    // the next correct piece pulses
    expect(option("o1").className).toContain("is-model");
  });
});
