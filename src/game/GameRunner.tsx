import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { useApp } from "../app/AppContext";
import { applyResult, clampLevel, initialProgression, isRoundComplete, levelAfterRound, markPlayed, selectNextExercise, startDifficultyFor } from "../engine/progression";
import { hashSeed, randomSeed } from "../engine/rng";
import { buildRound } from "../engine/round";
import { choicesOf, targetOf } from "../engine/validation";
import { type GuestProgress } from "../engine/progressSchema";
import { type ExerciseEvent, type ExerciseState, exerciseReducer, initExercise, toResult } from "../engine/session";
import type { Exercise, GameDefinition, MascotState, ProgressionState, Round } from "../engine/types";
import { loadState, saveState } from "../services/storage";
import { Monster } from "../characters/Monster";
import { AudioButtons, NavButton, SpeechBubble } from "../ui/controls";
import { IconAgain, IconGrid, IconHand, IconPlay, IconReplay, IconStar } from "../ui/icons";
import { soundForTransition } from "./audioEvents";
import { defaultAnswerBoard } from "./answer-boards";
import { type BoardProps, ChoiceTray, CountField, DoneButton, MakeSetBoard } from "./boards";
import { HelperOverlay, type StoryBeat, StoryPlayer } from "./story";

export interface GameSkin {
  Background: () => React.JSX.Element;
  ObjectArt: (p: { kind: string }) => React.JSX.Element;
  Basket: () => React.JSX.Element;
  Sticker: () => React.JSX.Element;
  Mascot: (p: { state: MascotState; talking?: boolean; size?: number | string }) => React.JSX.Element;
  /** Custom play board for this game (renders objects, emits engine events). Default: built-in by interaction. */
  Board?: (p: BoardProps) => React.JSX.Element;
  /** Custom answer tray. Answer buttons must use data-testid="choice" data-value={n}. */
  Tray?: (p: BoardProps) => React.JSX.Element;
  /** Background music track id (public/audio/music/<id>.mp3). */
  music?: string;
  /** Cinematic story: intro before the first exercise, outro after the round, and short lines between exercises. */
  story?: { intro?: StoryBeat[]; outro?: StoryBeat[]; between?: Record<number, { line: string; vars?: Record<string, string | number> }> };
  /** A second character who pops in to explain the concept (first exercise) and on a first wrong answer. */
  helper?: { Character: GameSkin["Mascot"]; name: string; explainLine: string; hintLine?: string };
  /** Game-specific praise lines (vars: n = answer). Default: counting praise. */
  praise?: string[];
  /** Map engine hint voice ids (e.g. "hint.countAlong", "hint.modelTap") to game-specific lines. */
  hintVoice?: Partial<Record<string, string>>;
  /** Worked-example steps for the count-along / model hints and what number to say at each step. */
  alongSteps?: (ex: Exercise) => number;
  alongSay?: (ex: Exercise, i: number) => number | null;
  /** Number keys 1–9 answer directly (default true). Turn off when answering needs a manipulation first. */
  numberKeys?: boolean;
  /** Element the tutorial hand points at on the first exercise (default: first uncounted object). */
  tutorialTarget?: string;
  /** Intro/resume card line + caption (default: Bobbo's counting greeting). */
  intro?: { line: string; text: string; backLine?: string; backText?: string };
  /** Idle help: line to replay and element to point at while answering. */
  idle?: { line: string; target: string };
}

type Stage = "story" | "intro" | "play" | "complete" | "outro" | "reward";
interface Pointer {
  target: string;
  dragTo?: string;
}

const PROMPT_LINE: Record<Exercise["interaction"], string> = {
  "tap-count": "prompt.tap-count",
  "choose-count": "prompt.choose-count",
  "make-set": "prompt.make-set",
  choose: "prompt.choose-count",
};
const IDLE_MS = 9000;

/** `n` (the numeric answer) for voice templates, when the answer is a number. */
const nVar = (ex: Exercise): { n?: number } => (Number.isFinite(targetOf(ex)) ? { n: targetOf(ex) } : {});
const promptVars = (ex: Exercise) => ({ ...ex.prompt?.vars, kind: ex.objectKind, ...nVar(ex) });
/** Worked-example steps when the skin doesn't say: count to the number answer, or place each piece of a sequence. */
function defaultAlongSteps(ex: Exercise): number {
  const a = ex.answer;
  if (a.kind === "number") return a.value;
  if (a.kind === "sequence") return a.order.length;
  return 0;
}

/** Track input modality so focus is only moved programmatically for keyboard users. */
let keyboardUser = false;
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Enter" || e.key === " ") keyboardUser = true;
  }, true);
  window.addEventListener("pointerdown", () => {
    keyboardUser = false;
  }, true);
}

export interface GameRunnerProps {
  game: GameDefinition;
  skin: GameSkin;
  /** Seed for generated content (e.g. a daily-learning seed). Default: a fresh random seed per round. */
  seed?: number;
}

const storedLevel = (game: GameDefinition) => clampLevel(loadState().progress.levels?.[game.id] ?? 0, game.progression);

export function GameRunner({ game, skin, seed }: GameRunnerProps) {
  const { navigate, caption, speaking, reducedMotion, unlockAudio } = useApp();

  // A saved round resumes only if its exercises can be rebuilt exactly (same game, level and seed).
  const [resume] = useState(() => {
    const r = loadState().round;
    if (!r || r.gameId !== game.id || isRoundComplete(r.progression, game.progression)) return null;
    const round = buildRound(game, { level: r.level ?? storedLevel(game), seed: r.seed ?? 0 });
    const known = new Set(round.exercises.map((e) => e.id));
    if (!r.progression.played.every((id) => known.has(id)) || (r.currentId && !known.has(r.currentId))) return null;
    return { ...r, round };
  });

  // Level-ups (R0): a round at level L starts at difficulty L + 1; tutorials play on level 0 only (buildRound).
  const [round, setRound] = useState<Round>(() => resume?.round ?? buildRound(game, { level: storedLevel(game), seed: seed ?? randomSeed() }));
  const level = round.level;
  const againCount = useRef(0);
  const freshProgression = useCallback((r: Round) => initialProgression(game.progression, startDifficultyFor(r.level, game.progression)), [game]);
  const [stage, setStage] = useState<Stage>(() => (resume || !skin.story?.intro?.length ? "intro" : "story"));
  const [prog, setProg] = useState<ProgressionState>(() => resume?.progression ?? freshProgression(round));
  const [leveledUp, setLeveledUp] = useState(false);
  const [helper, setHelper] = useState<{ id: number; line: string; vars?: Record<string, string | number>; done: () => void } | null>(null);
  const helperRef = useRef<{ id: number; done: () => void } | null>(null);
  const helperSeq = useRef(0);
  /** Show the helper; a newer helper replaces (and releases) an older one, so no sequence can wait forever. */
  const showHelper = (line: string, vars?: Record<string, string | number>) =>
    new Promise<void>((resolve) => {
      if (!skin.helper) return resolve();
      helperRef.current?.done();
      const h = { id: ++helperSeq.current, line, vars, done: resolve };
      helperRef.current = h;
      setHelper(h);
    });
  const finishHelper = (id: number) => {
    const h = helperRef.current;
    if (!h || h.id !== id) return;
    helperRef.current = null;
    setHelper(null);
    h.done();
  };
  useEffect(() => {
    void audio.playMusic(skin.music ?? "meadow");
  }, [skin.music]);
  const [st, setSt] = useState<ExerciseState | null>(null);
  const stRef = useRef<ExerciseState | null>(null);
  const [mascot, setMascot] = useState<MascotState>("greeting");
  const [alongIndex, setAlongIndex] = useState(-1);
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [burst, setBurst] = useState(0);
  const [newSticker, setNewSticker] = useState(false);
  const token = useRef(0); // invalidates async presentation sequences
  const lastInteraction = useRef(Date.now());

  const sleep = (ms: number, t: number) =>
    new Promise<boolean>((res) => window.setTimeout(() => res(t === token.current), ms));

  // ---------- exercise lifecycle ----------
  const loadExercise = useCallback(
    (ex: Exercise, p: ProgressionState, r: Round) => {
      const next = initExercise(ex);
      stRef.current = next;
      setSt(next);
      setAlongIndex(-1);
      setPointer(null);
      // keep keyboard users in place: focus the first thing to act on (no visible ring for touch/mouse users)
      window.setTimeout(() => {
        if (!keyboardUser) return; // mouse/touch users don't get a focus ring on an answer (it can look like a suggestion)
        const sel = ex.interaction === "make-set" ? '[data-testid="pile-object"]' : ex.interaction === "tap-count" ? '[data-testid="count-object"]' : '[data-testid="choice"]';
        (document.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true });
      }, 60);
      const marked = markPlayed(p, ex.id);
      setProg(marked);
      saveState({ round: { v: 1, gameId: game.id, progression: p, currentId: ex.id, savedAt: Date.now(), level: r.level, seed: r.seed } });
    },
    [game.id],
  );

  const startRound = useCallback(() => {
    unlockAudio();
    audio.play("whoosh");
    const p = resume?.progression ?? freshProgression(round);
    const current = resume?.currentId ? round.exercises.find((e) => e.id === resume.currentId) : undefined;
    const ex = current ?? selectNextExercise(round, p);
    if (!ex) return;
    setStage("play");
    loadExercise(ex, p, round);
  }, [loadExercise, resume, unlockAudio, freshProgression, round]);

  const act = useCallback((ev: ExerciseEvent) => {
    const prev = stRef.current;
    if (!prev) return;
    lastInteraction.current = Date.now();
    setPointer(null);
    const next = exerciseReducer(prev, ev);
    soundForTransition(ev, prev, next);
    if (next !== prev) {
      stRef.current = next;
      setSt(next);
    }
  }, []);

  // Intro greeting
  useEffect(() => {
    if (stage !== "intro") return;
    setMascot("greeting");
    const t = window.setTimeout(() => void audio.speak(resume ? (skin.intro?.backLine ?? "intro.back") : (skin.intro?.line ?? "intro.hello")), 400);
    const nudge = window.setTimeout(() => {
      void audio.speak("intro.go");
      setPointer({ target: '[data-testid="start-game"]' });
    }, 8000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(nudge);
    };
  }, [stage, resume]);

  // Prompt on each new exercise (+ tutorial pointer)
  const exId = st?.exercise.id;
  useEffect(() => {
    const s = stRef.current;
    if (stage !== "play" || !s) return;
    const t = ++token.current;
    const ex = s.exercise;
    setMascot("encouraging");
    void (async () => {
      if (!(await sleep(450, t))) return;
      await audio.speak(ex.prompt?.line ?? PROMPT_LINE[ex.interaction], promptVars(ex));
      if (t !== token.current) return;
      // a helper character explains the concept at the start of each round
      if (skin.helper && (stRef.current === s || stRef.current?.exercise.id === ex.id) && prog.results.length === 0 && stRef.current?.attempts === 0) {
        await showHelper(skin.helper.explainLine, { ...ex.params, ...nVar(ex) });
        if (t !== token.current) return;
      }
      setMascot("idle");
      lastInteraction.current = Date.now();
      if (ex.tutorial && stRef.current?.tapped.length === 0) setPointer({ target: skin.tutorialTarget ?? '[data-testid="count-object"][data-counted="false"]' });
    })();
  }, [exId, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // tap-count: once everything is counted, ask the cardinality question
  const phase = st?.phase;
  const wasCounting = useRef(false);
  useEffect(() => {
    if (!st || st.exercise.interaction !== "tap-count") return;
    if (phase === "counting") wasCounting.current = true;
    if (phase === "answering" && wasCounting.current) {
      wasCounting.current = false;
      const t = ++token.current;
      void (async () => {
        if (!(await sleep(700, t))) return;
        setMascot("thinking");
        if (keyboardUser && document.activeElement?.getAttribute("data-testid") === "count-object") (document.querySelector('[data-testid="choice"]') as HTMLElement | null)?.focus({ preventScroll: true });
        await audio.speak("prompt.howMany", { kind: st.exercise.objectKind });
        if (t === token.current) setMascot("idle");
      })();
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- feedback presentation ----------
  const fbSeq = st?.feedback?.seq;
  useEffect(() => {
    const s = stRef.current;
    if (!s?.feedback || s.phase !== "feedback") return;
    const fb = s.feedback;
    const ex = s.exercise;
    const t = ++token.current;
    setPointer(null);
    audio.play(fb.sfx);
    setMascot(fb.mascot);

    const countAlong = async () => {
      const n = skin.alongSteps?.(ex) ?? defaultAlongSteps(ex);
      for (let i = 0; i < n; i++) {
        setAlongIndex(i);
        audio.playCount(i + 1);
        const say = skin.alongSay ? skin.alongSay(ex, i) : i + 1;
        if (say !== null) audio.sayNumber(say);
        if (!(await sleep(700, t))) return false;
      }
      return true;
    };

    void (async () => {
      const vars = { ...ex.params, ...fb.voice.vars, kind: ex.objectKind };
      if (fb.correct) {
        setBurst((b) => b + 1);
        window.setTimeout(() => t === token.current && audio.play("star"), 350);
        const praise = skin.praise?.length ? skin.praise[(ex.seed + s.attempts) % skin.praise.length]! : fb.voice.id;
        await Promise.all([audio.speak(praise, vars), sleep(1700, t)]);
        if (t !== token.current) return;
        act({ type: "FEEDBACK_DONE" });
        const result = toResult(stRef.current ?? s);
        const p2 = applyResult(prog, result, game.progression);
        setProg(p2);
        if (isRoundComplete(p2, game.progression)) {
          saveState({ round: null });
          setStage("complete");
          return;
        }
        const beat = skin.story?.between?.[p2.results.length];
        if (beat) {
          await audio.speak(beat.line, beat.vars ?? {});
          if (t !== token.current) return;
        }
        const next = selectNextExercise(round, p2);
        if (!next) {
          setStage("complete");
          return;
        }
        if (!(await sleep(300, t))) return;
        audio.play("whoosh");
        loadExercise(next, p2, round);
        return;
      }

      // Wrong answer: gentle retry → hint(s). On the first miss a helper character may pop in to explain.
      if (skin.helper?.hintLine && s.attempts === 1 && ex.interaction !== "make-set") {
        await showHelper(skin.helper.hintLine, vars);
      } else {
        await Promise.all([audio.speak(skin.hintVoice?.[fb.voice.id] ?? fb.voice.id, vars), sleep(900, t)]);
      }
      if (t !== token.current) return;
      if (fb.hints.includes("count-along")) {
        audio.play("hint");
        setMascot("encouraging");
        if (!(await countAlong())) return;
        if (fb.hints.includes("model-answer")) {
          const id = ex.interaction === "make-set" ? "hint.modelSetTap" : "hint.modelTap";
          // number answers have a default "It's five! Tap five." line; other kinds speak only if the game maps one
          const line = skin.hintVoice?.[id] ?? (ex.answer.kind === "number" ? id : undefined);
          if (line) await audio.speak(line, vars);
        }
        else await sleep(400, t);
        if (t !== token.current) return;
      }
      if (fb.hints.includes("show-slots") && !fb.hints.includes("model-answer")) {
        audio.play("hint");
        await audio.speak("hint.slots");
        if (t !== token.current) return;
      }
      setMascot("idle");
      act({ type: "FEEDBACK_DONE" });
      lastInteraction.current = Date.now();
      // keep count-along numbers visible briefly as a worked example, then clear
      window.setTimeout(() => t === token.current && setAlongIndex(-1), fb.hints.includes("model-answer") ? 60000 : 2500);
    })();
  }, [fbSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- round complete → reward ----------
  useEffect(() => {
    if (stage !== "complete") return;
    const t = ++token.current;
    setMascot("celebrating");
    audio.play("complete");
    // record progress (anonymous)
    const state = loadState();
    const progress: GuestProgress = structuredClone(state.progress);
    const had = progress.stickers.includes(game.achievement.id);
    if (!had) progress.stickers.push(game.achievement.id);
    progress.roundsCompleted += 1;
    // R0: level up only when at least half the round was solved first try; otherwise practise this level again
    const after = levelAfterRound(level, prog.results, game.progression);
    setLeveledUp(after.leveledUp);
    progress.levels = { ...progress.levels, [game.id]: after.level };
    for (const r of prog.results) {
      const tally = (progress.skills[r.skillId] ??= { attempts: 0, firstTry: 0, completed: 0 });
      tally.attempts += r.attempts;
      tally.firstTry += r.firstTry ? 1 : 0;
      tally.completed += 1;
    }
    saveState({ progress, round: null });
    setNewSticker(!had);
    // Server backup (services/sync.ts) is intentionally OFF until a parent-controlled restore path exists:
    // storing data that can never be restored to the child would breach data minimisation (DECISIONS D-011).
    void (async () => {
      await Promise.all([audio.speak(skin.story?.outro?.length ? "round.completeShort" : "round.complete"), sleep(skin.story?.outro?.length ? 1400 : 2600, t)]);
      if (t !== token.current) return;
      setStage(skin.story?.outro?.length ? "outro" : "reward");
    })();
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage !== "reward") return;
    const t = ++token.current;
    audio.play("achievement");
    void (async () => {
      await audio.speak("achievement.earned");
      if (!(await sleep(300, t))) return;
      if (loadState().profile.monster) await audio.speak("monster.cheer");
      if (!(await sleep(300, t))) return;
      await audio.speak("end.choose");
    })();
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- idle help: replay instruction + show where to act ----------
  useEffect(() => {
    if (stage !== "play") return;
    const id = window.setInterval(() => {
      const s = stRef.current;
      if (!s || (s.phase !== "counting" && s.phase !== "answering")) return;
      if (Date.now() - lastInteraction.current < IDLE_MS || speaking) return;
      lastInteraction.current = Date.now();
      const ex = s.exercise;
      if (s.phase === "counting") {
        void audio.speak("nudge.tap", { kind: ex.objectKind });
        setPointer({ target: '[data-testid="count-object"][data-counted="false"]' });
      } else if (ex.interaction === "make-set") {
        if (s.basket.length > 0) {
          void audio.speak("nudge.done");
          setPointer({ target: '[data-testid="done"]' });
        } else {
          void audio.speak("nudge.basket");
          setPointer({ target: '[data-testid="pile-object"]', dragTo: '[data-testid="basket"]' });
        }
      } else if (skin.idle) {
        void audio.speak(skin.idle.line, { ...ex.params, kind: ex.objectKind });
        setPointer({ target: skin.idle.target });
      } else {
        // never point at a number (that would give away or bias the answer) — point at the objects to count
        void audio.speak("nudge.howMany", { kind: ex.objectKind });
        setPointer({ target: ".blanket" });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [stage, speaking]);

  // Keyboard shortcut: number keys pick a choice
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stRef.current;
      if (stage !== "play" || !s || skin.numberKeys === false || !/^[1-9]$/.test(e.key)) return;
      const v = Number(e.key);
      if (s.exercise.answer.kind === "number" && choicesOf(s.exercise).includes(v)) act({ type: "SUBMIT", value: v });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, act]);

  useEffect(() => () => {
    token.current++;
    audio.stopVoice();
  }, []);

  const replay = () => {
    const s = stRef.current;
    if (!s) return;
    lastInteraction.current = Date.now();
    if (s.phase === "answering" && s.exercise.interaction === "tap-count") void audio.speak("prompt.howMany", { kind: s.exercise.objectKind });
    else void audio.speak(s.exercise.prompt?.line ?? PROMPT_LINE[s.exercise.interaction], promptVars(s.exercise));
  };

  const { Mascot, Background, ObjectArt, Basket, Sticker } = skin;
  const profile = loadState().profile;
  const backTo = profile.step === "done" ? "/map" : `/play/${loadState().ageBand ?? "ages-3-5"}`;
  const ex = st?.exercise;
  const doneCount = prog.results.length;
  const bubble = helper ? "" : caption; // while a helper talks, only the helper's bubble shows

  // ---------- render ----------
  if (stage === "story" && skin.story?.intro) {
    return (
      <main className="game story-screen">
        <StoryPlayer beats={skin.story.intro} onDone={startRound} label={`${game.title} story`} />
      </main>
    );
  }
  if (stage === "outro" && skin.story?.outro) {
    return (
      <main className="game story-screen">
        <StoryPlayer beats={skin.story.outro} onDone={() => setStage("reward")} label={`${game.title} ending`} testId="outro" />
      </main>
    );
  }
  if (stage === "intro") {
    return (
      <main className="game intro-screen">
        <Background />
        <div className="game-top"><NavButton to={backTo} kind="back" label="Back to the map" /><span className="level-chip" data-testid="level">Level {level + 1}</span><AudioButtons /></div>
        <div className="intro-card">
          <div className="intro-mascot"><Mascot state={mascot} talking={speaking} size="100%" /></div>
          <SpeechBubble text={bubble || (resume ? (skin.intro?.backText ?? "Welcome back! Let's keep counting!") : (skin.intro?.text ?? "Hi! I'm Bobbo! Will you help me count my snacks?"))} tail="left" className="intro-bubble" />
        </div>
        <button type="button" className="big-play intro-go" data-testid="start-game" aria-label={resume ? "Keep playing" : "Start"} onClick={startRound}>
          <IconPlay />
        </button>
        {pointer && <HandPointer pointer={pointer} reducedMotion={reducedMotion} />}
      </main>
    );
  }

  if (stage === "reward" || stage === "complete") {
    return (
      <main className={`game reward-screen stage-${stage}`}>
        <Background />
        <div className="game-top"><NavButton to={backTo} kind="back" label="Back to the map" /><Stars total={game.progression.roundLength} done={doneCount} /><AudioButtons /></div>
        {stage === "complete" ? (
          <div className="complete-wrap">
            <div className="complete-mascot"><Mascot state="celebrating" talking={speaking} size="100%" /></div>
            <SpeechBubble text={bubble || "You did it!"} tail="down" />
            {!reducedMotion && <Burst seed={99} big />}
          </div>
        ) : (
          <div className="reward-wrap" data-testid="achievement">
            <div className={`sticker ${reducedMotion ? "" : "reveal"}`}>
              <div className="rays" aria-hidden="true" />
              <Sticker />
            </div>
            {profile.monster && (
              <div className="reward-monster" data-testid="reward-monster">
                <Monster config={profile.monster} state="celebrating" size="100%" label={`${profile.monsterName || "Your monster"} is cheering`} />
              </div>
            )}
            <h2 className="reward-title">{game.achievement.title}</h2>
            <p className="level-up" data-testid="level-up">{leveledUp ? `Level up! Next time: Level ${level + 2}` : "Great practice! Let's play this level again."}</p>
            <p className="reward-sub">{profile.monsterName ? `${profile.monsterName} is so proud of you!` : newSticker ? "New sticker!" : "Another great round!"}</p>
            <div className="reward-actions">
              <button
                type="button"
                className="big-btn again"
                data-testid="play-again"
                aria-label="Play again"
                onClick={() => {
                  audio.play("tap");
                  againCount.current += 1;
                  const r = buildRound(game, { level: storedLevel(game), seed: seed !== undefined ? hashSeed(seed, "again", againCount.current) : randomSeed() });
                  const p = freshProgression(r);
                  const first = selectNextExercise(r, p);
                  if (!first) return;
                  setRound(r);
                  setProg(p);
                  setNewSticker(false);
                  setStage("play");
                  loadExercise(first, p, r);
                }}
              >
                <IconAgain /><span>Again</span>
              </button>
              <button type="button" className="big-btn more" data-testid="more-games" aria-label="More games" onClick={() => { audio.play("tap"); navigate(backTo); }}>
                <IconGrid /><span>Games</span>
              </button>
            </div>
            {!reducedMotion && <Burst seed={7} big />}
          </div>
        )}
      </main>
    );
  }

  if (!st || !ex) return <main className="game" />;
  const boardProps: BoardProps = {
    st, act, alongIndex, ObjectArt, Basket,
    progress: { done: doneCount, total: game.progression.roundLength },
    busy: () => {
      lastInteraction.current = Date.now();
      setPointer(null);
    },
  };
  const AnswerBoard = ex.answer.kind === "number" ? null : defaultAnswerBoard(ex.answer.kind);
  const showTray = skin.Tray ? <skin.Tray {...boardProps} /> : ex.interaction === "make-set" ? <DoneButton st={st} act={act} /> : ex.answer.kind === "number" ? <ChoiceTray st={st} act={act} /> : <div className="choice-tray placeholder" aria-hidden="true" />;
  const promptText =
    ex.prompt?.text ?? (ex.interaction === "make-set" ? `Put ${targetOf(ex)} in the basket!` : st.phase === "counting" ? "Tap each one to count!" : "How many?");

  return (
    <main className={`game play-screen kind-${ex.interaction}`} data-testid="game-screen" data-exercise={ex.id} data-phase={st.phase}>
      <Background />
      <div className="game-top">
        <NavButton to={backTo} kind="back" label="Back to the map" />
        <span className="top-mid"><span className="level-chip" data-testid="level">Lv {level + 1}</span><Stars total={game.progression.roundLength} done={doneCount} /></span>
        <AudioButtons />
      </div>
      <div className="prompt-row">
        <div className="prompt-pill" data-testid="prompt">
          <span className="prompt-icon" aria-hidden="true"><ObjectArt kind={ex.objectKind} /></span>
          <span className="prompt-text">{promptText}</span>
          <button type="button" className="replay-btn" aria-label="Hear it again" data-testid="replay" onClick={replay}><IconReplay /></button>
        </div>
      </div>
      <section className="board" aria-label="Play area" key={ex.id}>
        {skin.Board ? (
          <skin.Board {...boardProps} />
        ) : AnswerBoard ? (
          <AnswerBoard {...boardProps} />
        ) : ex.interaction === "make-set" ? (
          <MakeSetBoard st={st} act={act} alongIndex={alongIndex} ObjectArt={ObjectArt} Basket={Basket} />
        ) : (
          <CountField st={st} act={act} alongIndex={alongIndex} ObjectArt={ObjectArt} Basket={Basket} />
        )}
        {st.phase === "feedback" && st.feedback?.correct && !reducedMotion && <Burst seed={burst} key={burst} />}
      </section>
      <div className="mascot-slot">
        <SpeechBubble text={bubble} tail="down" className="mascot-bubble" />
        <Mascot state={helper ? "thinking" : mascot} talking={speaking && !helper} size="100%" />
      </div>
      <div className="tray">{showTray}</div>
      {pointer && <HandPointer pointer={pointer} reducedMotion={reducedMotion} />}
      {helper && skin.helper && (
        <HelperOverlay
          key={helper.id}
          Character={skin.helper.Character}
          name={skin.helper.name}
          line={helper.line}
          vars={helper.vars}
          onDone={() => finishHelper(helper.id)}
        />
      )}
    </main>
  );
}

function Stars({ total, done }: { total: number; done: number }) {
  return (
    <div className="stars" role="img" aria-label={`${done} of ${total} stars`} data-testid="stars" data-done={done}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`star-slot ${i < done ? "filled" : ""}`}><IconStar filled={i < done} /></span>
      ))}
    </div>
  );
}

const BURST_COLORS = ["#FF9F43", "#8E6CEF", "#2EC4B6", "#6BCB77", "#4D96FF", "#FF8FB1", "#FFD43B"];
function Burst({ seed, big = false }: { seed: number; big?: boolean }) {
  const n = big ? 40 : 26;
  return (
    <div className={`burst ${big ? "big" : ""}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + seed;
        const d = (big ? 260 : 170) * (0.6 + ((i * 37 + seed * 13) % 40) / 100);
        const style = {
          "--dx": `${Math.cos(a) * d}px`,
          "--dy": `${Math.sin(a) * d - 60}px`,
          "--rot": `${(i * 47) % 360}deg`,
          background: BURST_COLORS[i % BURST_COLORS.length],
          animationDelay: `${(i % 5) * 20}ms`,
        } as React.CSSProperties;
        return <i key={i} className={i % 3 === 0 ? "round" : ""} style={style} />;
      })}
    </div>
  );
}

function HandPointer({ pointer, reducedMotion }: { pointer: Pointer; reducedMotion: boolean }) {
  const [pos, setPos] = useState<{ x: number; y: number; tx?: number; ty?: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const el = document.querySelector(pointer.target);
      if (!el) return setPos(null);
      const r = el.getBoundingClientRect();
      const to = pointer.dragTo ? document.querySelector(pointer.dragTo)?.getBoundingClientRect() : undefined;
      setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2, tx: to ? to.left + to.width / 2 : undefined, ty: to ? to.top + to.height / 2 : undefined });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pointer]);
  if (!pos) return null;
  const style = {
    left: pos.x,
    top: pos.y,
    "--tx": pos.tx !== undefined ? `${pos.tx - pos.x}px` : "0px",
    "--ty": pos.ty !== undefined ? `${pos.ty - pos.y}px` : "0px",
  } as React.CSSProperties;
  return (
    <div className={`hand-pointer ${pointer.dragTo ? "drag" : "tap"} ${reducedMotion ? "still" : ""}`} style={style} aria-hidden="true" data-testid="hand-pointer">
      <IconHand />
    </div>
  );
}
