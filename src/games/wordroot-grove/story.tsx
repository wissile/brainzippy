import { useRef } from "react";
import { useApp } from "../../app/AppContext";
import { Gloop } from "../../characters/Crew";
import { Sarah } from "../../characters/library/Sarah";
import { type ActorRenderProps, type Dialogue, DialogueScene } from "../../dialogue";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { GroveScene, LeafShape, Magnifier } from "./art";

/**
 * "Wordroot Grove" — story around the world (docs/worlds/wordroot-grove.md §2).
 * Problem (kid-sized, concrete): a gentle storm shook leaves loose in Sarah's Leaf Library and smudged their labels;
 * the islanders can't borrow words until every leaf is relabelled. Sarah (host) and Gloop (helper) talk in their
 * own voices in a DialogueScene; a short cinematic beat sets the scene before and after the round. The register is
 * a little older than band B (fewer exclamation marks). Sarah is referenced only through her component (design
 * pending approval), so a redesign drops in.
 */
const cast = (id: string, p: ActorRenderProps) => (id === "sarah" ? <Sarah size="100%" {...p} /> : <Gloop size="100%" {...p} />);
const beats = (lines: readonly [string, string, ActorRenderProps["state"]?][]) => lines.map(([speaker, line, emote]) => ({ speaker, line, ...(emote ? { emote } : {}) }));

export const INTRO_DIALOGUE: Dialogue = {
  id: "wordroot-intro",
  beats: beats([
    ["sarah", "wg.dlg.in.1", "greeting"],
    ["gloop", "wg.dlg.in.2", "celebrating"],
    ["sarah", "wg.dlg.in.3", "retry"],
    ["gloop", "wg.dlg.in.4", "thinking"],
    ["sarah", "wg.dlg.in.5", "encouraging"],
  ]),
};
/** First visit only: Sarah introduces Gloop (ENGLISH_PATH §4.4). */
export const FIRST_VISIT_DIALOGUE: Dialogue = {
  id: "wordroot-handover",
  beats: [INTRO_DIALOGUE.beats[0]!, ...beats([["sarah", "wg.dlg.handover.1", "greeting"], ["gloop", "wg.dlg.handover.2", "celebrating"]]), ...INTRO_DIALOGUE.beats.slice(1)],
};
export const OUTRO_DIALOGUE: Dialogue = {
  id: "wordroot-outro",
  beats: beats([
    ["sarah", "wg.dlg.out.1", "celebrating"],
    ["gloop", "wg.dlg.out.2", "encouraging"],
    ["sarah", "wg.dlg.out.3", "celebrating"],
  ]),
};

/** A story beat that plays a character conversation (same pattern as Paper Boat Post's). */
function ConversationBeat({ dialogue }: { dialogue: Dialogue }) {
  const { audioReady } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="scene wg-talk" ref={ref} onClick={(e) => e.stopPropagation()}>
      <GroveScene />
      <DialogueScene
        dialogue={dialogue}
        play={audioReady}
        renderCharacter={cast}
        className="wg-dlg"
        onDone={() => ref.current?.closest<HTMLElement>('[data-testid="story"], [data-testid="outro"]')?.click()}
      />
    </div>
  );
}
const conversation = (d: Dialogue): StoryBeat => ({ line: "", holdMs: 120_000, scene: () => <ConversationBeat dialogue={d} /> });

const LABELS = ["unlock", "careful", "telescope", "kindness", "portable"];
const Leaves = ({ fallen }: { fallen: boolean }) => (
  <>
    {LABELS.map((w, i) => {
      const x = 10 + i * 13;
      const y = fallen ? 80 + (i % 2) * 6 : 26 + ((i * 13) % 20);
      return (
        <Actor key={w} x={x} y={y} w={11}>
          <svg className={`wg-story-leaf ${fallen ? "" : "falls"}`} style={{ animationDelay: `${i * 0.3}s` }} viewBox="0 0 100 100" aria-hidden="true"><LeafShape fill={i % 2 ? "#F2C14E" : "#9ED983"} /></svg>
        </Actor>
      );
    })}
    {LABELS.map((w, i) => (
      <span key={`l${w}`} className={`wg-story-label ${fallen ? "smudged" : ""}`} style={{ left: `${4 + i * 13}%`, top: fallen ? `${60 + (i % 2) * 7}%` : `${10 + ((i * 13) % 20)}%` }} aria-hidden="true">{w}</span>
    ))}
  </>
);

export function storyFor(firstVisit: boolean) {
  const intro: StoryBeat[] = [
    {
      line: "wg.story.storm",
      camera: "pan-left",
      sfx: "whoosh",
      scene: () => (
        <div className="scene">
          <GroveScene />
          <Leaves fallen />
          <Actor x={89} y={94} w={18} enter="right"><Sarah state="retry" size="100%" /></Actor>
          <Actor x={75} y={94} w={11} enter="right">
            <div style={{ position: "relative" }}>
              <Gloop state="thinking" size="100%" />
              <div style={{ position: "absolute", right: "-30%", top: "-10%", width: "60%" }}><Magnifier /></div>
            </div>
          </Actor>
        </div>
      ),
    },
    conversation(firstVisit ? FIRST_VISIT_DIALOGUE : INTRO_DIALOGUE),
  ];
  const outro: StoryBeat[] = [
    {
      line: "wg.story.open",
      camera: "close",
      sfx: "complete",
      scene: () => (
        <div className="scene">
          <GroveScene />
          <Leaves fallen={false} />
        </div>
      ),
    },
    conversation(OUTRO_DIALOGUE),
  ];
  return { intro, outro, between: { 2: { line: "wg.mid.1" }, 4: { line: "wg.mid.2" }, 6: { line: "wg.mid.3" } } };
}
