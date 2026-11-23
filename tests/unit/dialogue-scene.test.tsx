import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderLine } from "../../src/audio/voiceLines";
import { DialogueScene, type ActorRenderProps } from "../../src/dialogue/DialogueScene";
import { readingTimeMs } from "../../src/dialogue/player";
import type { DialogueVoice } from "../../src/dialogue/types";

function voice(muted: boolean, lineMs = 1500) {
  return {
    isMuted: () => muted,
    speak: vi.fn(() => new Promise<void>((r) => setTimeout(r, lineMs))),
    stop: vi.fn(),
  } satisfies DialogueVoice;
}

const actor = (id: string, p: ActorRenderProps) => <div data-testid={`actor-${id}`} data-state={p.state} data-talking={String(p.talking)} />;
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DialogueScene", () => {
  it("captions each beat with the speaker's name in an aria-live region (muted)", async () => {
    render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} />);
    await tick(0);
    const region = screen.getByTestId("dialogue-caption");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toContain("Bobbo");
    expect(region.textContent).toContain(renderLine("dlg.welcome.1"));
    expect(screen.getByTestId("actor-bobbo").dataset).toMatchObject({ state: "greeting", talking: "true" });
    expect(screen.getByTestId("actor-zuzu").dataset).toMatchObject({ state: "idle", talking: "false" });
    expect(screen.getByTestId("actor-gloop").dataset.state).toBe("idle");

    await tick(readingTimeMs(renderLine("dlg.welcome.1")));
    expect(screen.getByTestId("actor-bobbo").dataset.talking).toBe("false"); // pause after the line
    await tick(400);
    expect(region.textContent).toContain("Zuzu");
    expect(screen.getByTestId("actor-zuzu").dataset).toMatchObject({ state: "celebrating", talking: "true" });
    expect(screen.getByTestId("actor-bobbo").dataset.state).toBe("idle");
  });

  it("puts the characters on stage in order of first line, at most three", async () => {
    render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} />);
    const ids = [...document.querySelectorAll(".dlg-actor")].map((n) => (n as HTMLElement).dataset.speaker);
    expect(ids).toEqual(["bobbo", "zuzu", "gloop"]);
  });

  it("Skip is a labelled button that ends the dialogue and reports 'skipped'", async () => {
    const onDone = vi.fn();
    const v = voice(false);
    render(<DialogueScene dialogue="pilot-intro" renderCharacter={actor} voice={v} onDone={onDone} />);
    await tick(200);
    const skip = screen.getByTestId("dialogue-skip");
    expect(skip.tagName).toBe("BUTTON");
    expect(skip.getAttribute("aria-label")).toBe("Skip the conversation");
    fireEvent.click(skip);
    expect(onDone).toHaveBeenCalledWith("skipped");
    expect(v.stop).toHaveBeenCalled();
    await tick(0);
    expect(screen.queryByTestId("dialogue-skip")).toBeNull();
    expect(screen.getByTestId("dialogue-caption").textContent).toBe("");
  });

  it("Escape skips from the keyboard and marks the event handled", async () => {
    const onDone = vi.fn();
    render(<DialogueScene dialogue="english-intro" renderCharacter={actor} voice={voice(true)} onDone={onDone} />);
    await tick(0);
    const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    window.dispatchEvent(e);
    expect(onDone).toHaveBeenCalledWith("skipped");
    expect(e.defaultPrevented).toBe(true);
  });

  it("Escape is ignored when already handled, on key repeat, while typing, or while a modal is open", async () => {
    const onDone = vi.fn();
    render(
      <>
        <input data-testid="field" />
        <DialogueScene dialogue="english-intro" renderCharacter={actor} voice={voice(true)} onDone={onDone} />
      </>,
    );
    await tick(0);
    const handled = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    fireEvent.keyDown(window, { key: "Escape", repeat: true });
    fireEvent.keyDown(screen.getByTestId("field"), { key: "Escape" });
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDone).not.toHaveBeenCalled();
    modal.remove();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDone).toHaveBeenCalledWith("skipped");
  });

  it("Next (64px button) and tapping the caption advance to the next line", async () => {
    render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} />);
    await tick(0);
    const nextBtn = screen.getByTestId("dialogue-next");
    expect(nextBtn.tagName).toBe("BUTTON");
    expect(nextBtn.getAttribute("aria-label")).toBe("Next line");
    fireEvent.click(nextBtn);
    await tick(0);
    expect(screen.getByTestId("dialogue-caption").textContent).toContain("Zuzu");
    fireEvent.click(screen.getByTestId("dialogue-caption"));
    await tick(0);
    expect(screen.getByTestId("dialogue-caption").textContent).toContain("Gloop");
  });

  it("hovering the caption holds the line; leaving resumes auto-advance", async () => {
    render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} />);
    await tick(0);
    const panel = document.querySelector(".dlg-panel")!;
    fireEvent.pointerEnter(panel, { pointerType: "mouse" });
    await tick(60000);
    expect(screen.getByTestId("dialogue-caption").textContent).toContain("Bobbo");
    fireEvent.pointerLeave(panel, { pointerType: "mouse" });
    await tick(readingTimeMs(renderLine("dlg.welcome.1")) + 400);
    expect(screen.getByTestId("dialogue-caption").textContent).toContain("Zuzu");
  });

  it("focusing Next holds the line until focus leaves the panel", async () => {
    render(
      <>
        <button data-testid="outside">elsewhere</button>
        <DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} />
      </>,
    );
    await tick(0);
    act(() => screen.getByTestId("dialogue-next").focus());
    await tick(60000);
    expect(screen.getByTestId("dialogue-caption").textContent).toContain("Bobbo");
    act(() => screen.getByTestId("outside").focus());
    await tick(readingTimeMs(renderLine("dlg.welcome.1")) + 400);
    expect(screen.getByTestId("dialogue-caption").textContent).toContain("Zuzu");
  });

  it("after Skip, keyboard focus moves to the scene instead of dropping to <body>", async () => {
    render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} />);
    await tick(0);
    const skip = screen.getByTestId("dialogue-skip");
    act(() => skip.focus());
    fireEvent.click(skip);
    await tick(0);
    expect(screen.queryByTestId("dialogue-skip")).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("dialogue-scene"));
    expect(screen.getByTestId("dialogue-scene").getAttribute("tabindex")).toBe("-1");
  });

  it("on completion focus moves to the scene only if it was inside, and never overrides onDone's own focus", async () => {
    const { unmount } = render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} />);
    await tick(0);
    act(() => screen.getByTestId("dialogue-next").focus());
    act(() => screen.getByTestId("dialogue-next").blur()); // let it auto-advance, focus on body
    await tick(120000);
    expect(document.activeElement).toBe(document.body);
    unmount();

    const target = document.createElement("button");
    document.body.appendChild(target);
    render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(true)} onDone={() => target.focus()} />);
    await tick(0);
    act(() => screen.getByTestId("dialogue-skip").focus());
    fireEvent.click(screen.getByTestId("dialogue-skip"));
    await tick(0);
    expect(document.activeElement).toBe(target);
    target.remove();
  });

  it("completes and reports 'completed' when every beat has played", async () => {
    const onDone = vi.fn();
    render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={voice(false, 1200)} onDone={onDone} />);
    await tick(60000);
    expect(onDone).toHaveBeenCalledWith("completed");
  });

  it("unmounting stops the voice without calling onDone", async () => {
    const onDone = vi.fn();
    const v = voice(false);
    const { unmount } = render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={v} onDone={onDone} />);
    await tick(300);
    unmount();
    expect(v.stop).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("does nothing until play is true", async () => {
    const v = voice(false);
    const { rerender } = render(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={v} play={false} />);
    await tick(5000);
    expect(v.speak).not.toHaveBeenCalled();
    rerender(<DialogueScene dialogue="welcome" renderCharacter={actor} voice={v} play />);
    await tick(0);
    expect(v.speak).toHaveBeenCalledWith("dlg.welcome.1", undefined);
  });
});

describe("dialogue.css", () => {
  it("focus rings use ink (>= 3:1 on paper), not --rumble", () => {
    const ring = /\.dlg-next:focus-visible \{ outline: 4px solid var\(--ink\)/;
    expect(css).toMatch(ring);
    expect(css).toMatch(/\.dlg-skip:focus-visible,/);
    expect(css).not.toMatch(/outline:[^;]*--rumble/);
  });
  const css = readFileSync("src/dialogue/dialogue.css", "utf8");
  it("prefixes keyframes with dlg- and has a reduced-motion path", () => {
    const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n).toMatch(/^dlg-/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.dlg-actor\.is-speaking \.dlg-body[\s\S]*animation: none/);
  });
  it("Skip and Next meet the 64px child tap target", () => {
    expect(css).toMatch(/\.dlg-skip \{[^}]*min-width: var\(--tap-min\)[^}]*min-height: var\(--tap-min\)/);
    expect(css).toMatch(/\.dlg-next \{[^}]*min-width: var\(--tap-min\)[^}]*min-height: var\(--tap-min\)/);
    expect(readFileSync("src/styles/tokens.css", "utf8")).toMatch(/--tap-min:\s*64px/);
  });
});
