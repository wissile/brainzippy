import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { useApp } from "../app/AppContext";
import { applyResult, initialProgression, isRoundComplete, markPlayed, selectNextExercise } from "../engine/progression";
import { type GuestProgress } from "../engine/progressSchema";
import { type ExerciseEvent, type ExerciseState, exerciseReducer, initExercise, toResult } from "../engine/session";
import type { Exercise, GameDefinition, MascotState, ProgressionState } from "../engine/types";
import { loadState, saveState } from "../services/storage";
import { NavButton, SoundButton, SpeechBubble } from "../ui/controls";
import { IconAgain, IconGrid, IconHand, IconPlay, IconReplay, IconStar } from "../ui/icons";
import { soundForTransition } from "./audioEvents";
import { ChoiceTray, CountField, DoneButton, MakeSetBoard } from "./boards";

export interface GameSkin {
  Background: () => React.JSX.Element;
  ObjectArt: (p: { kind: string }) => React.JSX.Element;
  Basket: () => React.JSX.Element;
  Sticker: () => React.JSX.Element;
  Mascot: (p: { state: MascotState; talking?: boolean; size?: number | string }) => React.JSX.Element;
}

type Stage = "intro" | "play" | "complete" | "reward";
interface Pointer {
  target: string;
  dragTo?: string;
}

const PROMPT_LINE: Record<Exercise["interaction"], string> = {
  "tap-count": "prompt.tap-count",
  "choose-count": "prompt.choose-count",
  "make-set": "prompt.make-set",
};
const IDLE_MS = 9000;

export function GameRunner({ game, skin }: { game: GameDefinition; skin: GameSkin }) {
  const { navigate, caption, speaking, reducedMotion, unlockAudio } = useApp();

  const [resume] = useState(() => {
    const r = loadState().round;
    if (!r || r.gameId !== game.id || isRoundComplete(r.progression, game.progression)) return null;
    const known = new Set(game.exercises.map((e) => e.id));
    if (!r.progression.played.every((id) => known.has(id)) || (r.currentId && !known.has(r.currentId))) return null;
    return r;
  });

  const [stage, setStage] = useState<Stage>("intro");
  const [prog, setProg] = useState<ProgressionState>(() => resume?.progression ?? initialProgression(game.progression));
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
    (ex: Exercise, p: ProgressionState) => {
      const next = initExercise(ex);
      stRef.current = next;
      setSt(next);
      setAlongIndex(-1);
      setPointer(null);
      // keep keyboard users in place: focus the first thing to act on (no visible ring for touch/mouse users)
      window.setTimeout(() => {
        const sel = ex.interaction === "make-set" ? '[data-testid="pile-object"]' : ex.interaction === "tap-count" ? '[data-testid="count-object"]' : '[data-testid="choice"]';
        (document.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true });
      }, 60);
      const marked = markPlayed(p, ex.id);
      setProg(marked);
      saveState({ round: { v: 1, gameId: game.id, progression: p, currentId: ex.id, savedAt: Date.now() } });
    },
    [game.id],
  );

  const startRound = useCallback(() => {
    unlockAudio();
    audio.play("whoosh");
    const p = resume?.progression ?? initialProgression(game.progression);
    const current = resume?.currentId ? game.exercises.find((e) => e.id === resume.currentId) : undefined;
    const ex = current ?? selectNextExercise(game, p);
    if (!ex) return;
    setStage("play");
    loadExercise(ex, p);
  }, [game, loadExercise, resume, unlockAudio]);

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
    const t = window.setTimeout(() => void audio.speak(resume ? "intro.back" : "intro.hello"), 400);
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
      await audio.speak(PROMPT_LINE[ex.interaction], { kind: ex.objectKind, n: ex.target });
      if (t !== token.current) return;
      setMascot("idle");
      lastInteraction.current = Date.now();
      if (ex.tutorial && stRef.current?.tapped.length === 0) setPointer({ target: '[data-testid="count-object"][data-counted="false"]' });
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
        if (document.activeElement?.getAttribute("data-testid") === "count-object") (document.querySelector('[data-testid="choice"]') as HTMLElement | null)?.focus({ preventScroll: true });
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
      const n = ex.target;
      for (let i = 0; i < n; i++) {
        setAlongIndex(i);
        audio.playCount(i + 1);
        audio.sayNumber(i + 1);
        if (!(await sleep(700, t))) return false;
      }
      return true;
    };

    void (async () => {
      if (fb.correct) {
        setBurst((b) => b + 1);
        window.setTimeout(() => t === token.current && audio.play("star"), 350);
        await Promise.all([audio.speak(fb.voice.id, { ...fb.voice.vars, kind: ex.objectKind }), sleep(1700, t)]);
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
        const next = selectNextExercise(game, p2);
        if (!next) {
          setStage("complete");
          return;
        }
        if (!(await sleep(300, t))) return;
        audio.play("whoosh");
        loadExercise(next, p2);
        return;
      }

      // Wrong answer: gentle retry → hint(s)
      await Promise.all([audio.speak(fb.voice.id, { ...fb.voice.vars, kind: ex.objectKind }), sleep(900, t)]);
      if (t !== token.current) return;
      if (fb.hints.includes("count-along")) {
        audio.play("hint");
        setMascot("encouraging");
        if (!(await countAlong())) return;
        if (fb.hints.includes("model-answer")) await audio.speak(ex.interaction === "make-set" ? "hint.modelSetTap" : "hint.modelTap", { n: ex.target });
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
      await Promise.all([audio.speak("round.complete"), sleep(2600, t)]);
      if (t !== token.current) return;
      setStage("reward");
    })();
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage !== "reward") return;
    const t = ++token.current;
    audio.play("achievement");
    void (async () => {
      await audio.speak("achievement.earned");
      if (!(await sleep(400, t))) return;
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
      if (stage !== "play" || !s || !/^[1-9]$/.test(e.key)) return;
      const v = Number(e.key);
      if (s.exercise.choices?.includes(v)) act({ type: "CHOOSE", value: v });
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
    else void audio.speak(PROMPT_LINE[s.exercise.interaction], { kind: s.exercise.objectKind, n: s.exercise.target });
  };

  const { Mascot, Background, ObjectArt, Basket, Sticker } = skin;
  const ex = st?.exercise;
  const doneCount = prog.results.length;
  const bubble = caption;

  // ---------- render ----------
  if (stage === "intro") {
    return (
      <main className="game intro-screen">
        <Background />
        <div className="game-top"><NavButton to="/play" kind="back" label="Back to games" /><span /><SoundButton /></div>
        <div className="intro-card">
          <div className="intro-mascot"><Mascot state={mascot} talking={speaking} size="100%" /></div>
          <SpeechBubble text={bubble || (resume ? "Welcome back! Let's keep counting!" : "Hi! I'm Bobbo! Will you help me count my snacks?")} tail="left" className="intro-bubble" />
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
        <div className="game-top"><NavButton to="/play" kind="back" label="Back to games" /><Stars total={game.progression.roundLength} done={doneCount} /><SoundButton /></div>
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
            <h2 className="reward-title">{game.achievement.title}</h2>
            <p className="reward-sub">{newSticker ? "New sticker!" : "Another great round!"}</p>
            <div className="reward-actions">
              <button
                type="button"
                className="big-btn again"
                data-testid="play-again"
                aria-label="Play again"
                onClick={() => {
                  audio.play("tap");
                  const p = initialProgression(game.progression);
                  const first = selectNextExercise(game, p);
                  if (!first) return;
                  setProg(p);
                  setNewSticker(false);
                  setStage("play");
                  loadExercise(first, p);
                }}
              >
                <IconAgain /><span>Again</span>
              </button>
              <button type="button" className="big-btn more" data-testid="more-games" aria-label="More games" onClick={() => { audio.play("tap"); navigate(`/play/${loadState().ageBand ?? "ages-3-5"}`); }}>
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
  const showTray = ex.interaction === "make-set" ? <DoneButton st={st} act={act} /> : <ChoiceTray st={st} act={act} />;
  const promptText =
    ex.interaction === "make-set" ? `Put ${ex.target} in the basket!` : st.phase === "counting" ? "Tap each one to count!" : "How many?";

  return (
    <main className={`game play-screen kind-${ex.interaction}`} data-testid="game-screen" data-exercise={ex.id} data-phase={st.phase}>
      <Background />
      <div className="game-top">
        <NavButton to="/play" kind="back" label="Back to games" />
        <Stars total={game.progression.roundLength} done={doneCount} />
        <SoundButton />
      </div>
      <div className="prompt-row">
        <div className="prompt-pill" data-testid="prompt">
          <span className="prompt-icon" aria-hidden="true"><ObjectArt kind={ex.objectKind} /></span>
          <span className="prompt-text">{promptText}</span>
          <button type="button" className="replay-btn" aria-label="Hear it again" data-testid="replay" onClick={replay}><IconReplay /></button>
        </div>
      </div>
      <section className="board" aria-label="Play area" key={ex.id}>
        {ex.interaction === "make-set" ? (
          <MakeSetBoard st={st} act={act} alongIndex={alongIndex} ObjectArt={ObjectArt} Basket={Basket} />
        ) : (
          <CountField st={st} act={act} alongIndex={alongIndex} ObjectArt={ObjectArt} Basket={Basket} />
        )}
        {st.phase === "feedback" && st.feedback?.correct && !reducedMotion && <Burst seed={burst} key={burst} />}
      </section>
      <div className="mascot-slot">
        <SpeechBubble text={bubble} tail="down" className="mascot-bubble" />
        <Mascot state={mascot} talking={speaking} size="100%" />
      </div>
      <div className="tray">{showTray}</div>
      {pointer && <HandPointer pointer={pointer} reducedMotion={reducedMotion} />}
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
