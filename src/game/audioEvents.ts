import { audio } from "../audio/AudioEngine";
import type { ExerciseEvent, ExerciseState } from "../engine/session";

/**
 * Audio-event rules: maps an accepted state transition to sound. Kept apart from rendering and
 * from the reducer so sound design can change without touching game logic or views.
 */
export function soundForTransition(ev: ExerciseEvent, prev: ExerciseState, next: ExerciseState): void {
  if (prev === next) {
    if (ev.type === "TAP_OBJECT") audio.play("tap", { gain: 0.35 });
    return;
  }
  switch (ev.type) {
    case "TAP_OBJECT": {
      const n = next.tapped.length;
      audio.playCount(n);
      audio.sayNumber(n);
      break;
    }
    case "ADD_TO_BASKET": {
      const n = next.basket.length;
      audio.play("drop", { gain: 0.6 });
      audio.playCount(n);
      audio.sayNumber(n);
      break;
    }
    case "REMOVE_FROM_BASKET":
      audio.play("pickup");
      break;
    case "CHOOSE":
    case "SUBMIT_SET":
      audio.play("tap");
      break;
    case "FEEDBACK_DONE":
      break;
  }
}
