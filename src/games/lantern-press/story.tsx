import { useRef } from "react";
import { useApp } from "../../app/AppContext";
import { Hoot } from "../../characters/Crew";
import { Sarah } from "../../characters/library/Sarah";
import { type ActorRenderProps, type Dialogue, DialogueScene } from "../../dialogue";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { BoathouseScene, PressScene } from "./art";

/**
 * "The Lantern Press" — story around the world (docs/worlds/lantern-press.md §2). Older register: one cinematic
 * beat, then a short Sarah/Hoot conversation; calm idle, greeting, thinking and encouraging states only (no bouncing
 * celebrations). No deadline: the press waits for the editor. Sarah is referenced only through her component, so
 * a redesign drops in.
 */
const cast = (id: string, p: ActorRenderProps) => (id === "sarah" ? <Sarah size="100%" {...p} /> : <Hoot size="100%" {...p} />);
/** Restrained motion: the dialogue's poses never use the bouncy celebrating state. */
const calm = (s: ActorRenderProps["state"]): ActorRenderProps["state"] => (s === "celebrating" ? "encouraging" : s);
const castCalm = (id: string, p: ActorRenderProps) => cast(id, { ...p, state: calm(p.state) });
const beats = (lines: readonly [string, string, ActorRenderProps["state"]?][]) => lines.map(([speaker, line, emote]) => ({ speaker, line, ...(emote ? { emote } : {}) }));

export const INTRO_DIALOGUE: Dialogue = {
  id: "lantern-intro",
  beats: beats([
    ["sarah", "lp.dlg.in.1", "greeting"],
    ["sarah", "lp.dlg.in.2", "encouraging"],
    ["hoot", "lp.dlg.in.3", "thinking"],
    ["sarah", "lp.dlg.in.4", "encouraging"],
  ]),
};
/** First visit only: Sarah introduces Hoot (ENGLISH_PATH §4.4). */
export const FIRST_VISIT_DIALOGUE: Dialogue = {
  id: "lantern-handover",
  beats: [INTRO_DIALOGUE.beats[0]!, ...beats([["sarah", "lp.dlg.handover.1", "greeting"], ["hoot", "lp.dlg.handover.2", "thinking"]]), INTRO_DIALOGUE.beats[1]!, INTRO_DIALOGUE.beats[3]!],
};
export const OUTRO_DIALOGUE: Dialogue = {
  id: "lantern-outro",
  beats: beats([
    ["sarah", "lp.dlg.out.1", "encouraging"],
    ["hoot", "lp.dlg.out.2", "encouraging"],
    ["sarah", "lp.dlg.out.3", "greeting"],
  ]),
};

/** A story beat that plays a character conversation (same pattern as Wordroot Grove's). */
function ConversationBeat({ dialogue }: { dialogue: Dialogue }) {
  const { audioReady } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="scene lp-talk" ref={ref} onClick={(e) => e.stopPropagation()}>
      <PressScene />
      <DialogueScene
        dialogue={dialogue}
        play={audioReady}
        renderCharacter={castCalm}
        className="lp-dlg"
        onDone={() => ref.current?.closest<HTMLElement>('[data-testid="story"], [data-testid="outro"]')?.click()}
      />
    </div>
  );
}
const conversation = (d: Dialogue): StoryBeat => ({ line: "", holdMs: 120_000, scene: () => <ConversationBeat dialogue={d} /> });

export function storyFor(firstVisit: boolean) {
  const intro: StoryBeat[] = [
    {
      line: "lp.story.open",
      camera: "pan-left",
      scene: () => (
        <div className="scene">
          <BoathouseScene />
          <Actor x={30} y={93} w={13} enter="left"><Sarah state="idle" size="100%" /></Actor>
          <Actor x={19} y={93} w={9} enter="left"><Hoot state="idle" size="100%" /></Actor>
        </div>
      ),
    },
    conversation(firstVisit ? FIRST_VISIT_DIALOGUE : INTRO_DIALOGUE),
  ];
  const outro: StoryBeat[] = [
    {
      line: "lp.story.print",
      camera: "close",
      sfx: "complete",
      scene: () => (
        <div className="scene">
          <BoathouseScene printing />
        </div>
      ),
    },
    conversation(OUTRO_DIALOGUE),
  ];
  return { intro, outro, between: { 2: { line: "lp.mid.1" }, 4: { line: "lp.mid.2" }, 6: { line: "lp.mid.3" } } };
}
