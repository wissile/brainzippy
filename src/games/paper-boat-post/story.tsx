import { useRef } from "react";
import { useApp } from "../../app/AppContext";
import { Hoot, Zuzu } from "../../characters/Crew";
import { Sarah } from "../../characters/library/Sarah";
import { type ActorRenderProps, type Dialogue, DialogueScene } from "../../dialogue";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { PICTURES, PaperBoat, RiverPost } from "./art";

/**
 * "The Paper Boat Post" — story around the world (docs/worlds/paper-boat-post.md §2).
 * Problem (kid-sized, concrete): a gust tipped Sarah's post bag, the letters floated off the sails, and the boats
 * don't know which friend's dock to go to. Sarah (host) and Zuzu (helper) talk in their own voices in a
 * DialogueScene; a short cinematic beat sets the scene before it and after the round.
 * Sarah is referenced only through her component (her design is pending approval), so a redesign drops in.
 */
const cast = (id: string, p: ActorRenderProps) =>
  id === "sarah" ? <Sarah size="100%" {...p} /> : id === "hoot" ? <Hoot size="100%" {...p} /> : <Zuzu size="100%" {...p} />;

const beats = (lines: readonly [string, string, ActorRenderProps["state"]?][]) =>
  lines.map(([speaker, line, emote]) => ({ speaker, line, ...(emote ? { emote } : {}) }));

export const INTRO_DIALOGUE: Dialogue = {
  id: "paper-boat-intro",
  beats: beats([
    ["sarah", "pb.dlg.in.1", "greeting"],
    ["zuzu", "pb.dlg.in.2", "celebrating"],
    ["sarah", "pb.dlg.in.3", "retry"],
    ["zuzu", "pb.dlg.in.4", "thinking"],
    ["sarah", "pb.dlg.in.5", "encouraging"],
    ["zuzu", "pb.dlg.in.6", "celebrating"],
  ]),
};
/** First visit only (no level stored yet): Hoot hands over from Rhyme Lanterns (ENGLISH_PATH §4.4). */
export const FIRST_VISIT_DIALOGUE: Dialogue = {
  id: "paper-boat-handover",
  beats: [...beats([["hoot", "pb.dlg.hoot", "greeting"], ["sarah", "pb.dlg.handover", "greeting"]]), ...INTRO_DIALOGUE.beats.slice(1)],
};
export const OUTRO_DIALOGUE: Dialogue = {
  id: "paper-boat-outro",
  beats: beats([
    ["sarah", "pb.dlg.out.1", "celebrating"],
    ["zuzu", "pb.dlg.out.2", "encouraging"],
    ["sarah", "pb.dlg.out.3", "celebrating"],
  ]),
};

/**
 * A story beat that plays a character conversation. The StoryPlayer speaks nothing for it (empty line) and waits;
 * when the conversation ends (or Escape skips it) the beat advances the story with the player's own tap handler.
 * Taps inside the conversation (Next, the caption) stay inside it; the StoryPlayer's Skip still skips everything.
 */
function ConversationBeat({ dialogue }: { dialogue: Dialogue }) {
  const { audioReady } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="scene pb-talk" ref={ref} onClick={(e) => e.stopPropagation()}>
      <RiverPost />
      <DialogueScene
        dialogue={dialogue}
        play={audioReady}
        renderCharacter={cast}
        className="pb-dlg"
        onDone={() => ref.current?.closest<HTMLElement>('[data-testid="story"], [data-testid="outro"]')?.click()}
      />
    </div>
  );
}
const conversation = (d: Dialogue): StoryBeat => ({ line: "", holdMs: 120_000, scene: () => <ConversationBeat dialogue={d} /> });

const Boats = ({ home = false }: { home?: boolean }) => (
  <>
    {[18, 42, 66].map((x, i) => (
      <Actor key={x} x={home ? 20 + i * 30 : x} y={home ? 86 : 80 + (i % 2) * 6} w={home ? 13 : 15} float={!home}>
        <svg className="pb-story-boat" viewBox="0 0 100 100" aria-hidden="true"><PaperBoat star={home} /></svg>
      </Actor>
    ))}
  </>
);
const LETTERS = ["c", "a", "t", "s", "h", "i", "p"];

export function storyFor(firstVisit: boolean) {
  const intro: StoryBeat[] = [
    {
      line: "pb.story.wind",
      camera: "rise",
      sfx: "whoosh",
      scene: () => (
        <div className="scene">
          <RiverPost />
          <Boats />
          {LETTERS.map((l, i) => (
            <span key={l + i} className="pb-story-letter" style={{ left: `${12 + i * 12}%`, top: `${30 + ((i * 17) % 30)}%`, animationDelay: `${i * 0.25}s` }} aria-hidden="true">{l}</span>
          ))}
          <Actor x={86} y={92} w={22} enter="right"><Sarah state="retry" size="100%" /></Actor>
        </div>
      ),
    },
    conversation(firstVisit ? FIRST_VISIT_DIALOGUE : INTRO_DIALOGUE),
  ];
  const outro: StoryBeat[] = [
    {
      line: "pb.story.home",
      camera: "close",
      sfx: "complete",
      scene: () => (
        <div className="scene">
          <RiverPost />
          <Boats home />
          <Actor x={20} y={70} w={10}><svg viewBox="0 0 100 100" aria-hidden="true">{PICTURES.dock}</svg></Actor>
          <Actor x={50} y={70} w={10}><svg viewBox="0 0 100 100" aria-hidden="true">{PICTURES.dock}</svg></Actor>
          <Actor x={80} y={70} w={10}><svg viewBox="0 0 100 100" aria-hidden="true">{PICTURES.dock}</svg></Actor>
        </div>
      ),
    },
    conversation(OUTRO_DIALOGUE),
  ];
  return { intro, outro, between: { 2: { line: "pb.mid.1" }, 4: { line: "pb.mid.2" }, 6: { line: "pb.mid.3" } } };
}
