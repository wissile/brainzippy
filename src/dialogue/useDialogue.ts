import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeaker } from "../audio/cast";
import { renderLine } from "../audio/voiceLines";
import { audioVoice } from "./audioVoice";
import { playDialogue, type DialogueHandle } from "./player";
import type { Dialogue, DialogueCaption, DialogueEnd, DialogueVoice } from "./types";

export interface DialogueState {
  /** Caption for the current beat (null before the first beat and after the end). */
  caption: DialogueCaption | null;
  /** True while the current line is being spoken (or read, when muted); false in the pause after it. */
  talking: boolean;
  /** Set once the dialogue has stopped. */
  ended: DialogueEnd | null;
  next: () => void;
  skip: () => void;
}

export interface UseDialogueOptions {
  /** Default true. When false, nothing plays until it becomes true. */
  play?: boolean;
  voice?: DialogueVoice;
  onDone?: (reason: DialogueEnd) => void;
}

/**
 * Plays a dialogue while the component is mounted. Restarts when the dialogue id changes; cancels on unmount
 * (onDone is not called for an unmount, so a parent never navigates from an unmounted scene).
 */
export function useDialogue(dialogue: Dialogue | undefined, { play = true, voice = audioVoice, onDone }: UseDialogueOptions = {}): DialogueState {
  const [caption, setCaption] = useState<DialogueCaption | null>(null);
  const [talking, setTalking] = useState(false);
  const [ended, setEnded] = useState<DialogueEnd | null>(null);
  const handle = useRef<DialogueHandle | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  const id = dialogue?.id;
  useEffect(() => {
    if (!dialogue || !play) return;
    let live = true;
    setEnded(null);
    setCaption(null);
    const h = playDialogue(dialogue, {
      voice: voiceRef.current,
      render: renderLine,
      speakerInfo: (sid) => {
        const s = getSpeaker(sid);
        return { id: sid, name: s.name, color: s.color };
      },
      onBeat: (c) => {
        if (!live) return;
        setCaption(c);
        setTalking(true);
      },
      onLineEnd: () => live && setTalking(false),
      onEnd: (reason) => {
        if (!live) return;
        setTalking(false);
        setCaption(null);
        setEnded(reason);
        onDoneRef.current?.(reason);
      },
    });
    handle.current = h;
    return () => {
      live = false;
      h.cancel();
      if (handle.current === h) handle.current = null;
    };
    // keyed by the dialogue's id on purpose: a new object with the same id must not replay the conversation
  }, [id, play]);

  const next = useCallback(() => handle.current?.next(), []);
  const skip = useCallback(() => handle.current?.skip(), []);
  return { caption, talking, ended, next, skip };
}
