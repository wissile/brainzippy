import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { useApp } from "../app/AppContext";
import { AGE_BANDS } from "../app/screens";
import { Bobbo } from "../characters/Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../characters/Crew";
import {
  ARMS, BODIES, COLORS, COLOR_HEX, DEFAULT_MONSTER, EYES, MOUTHS, Monster, type MonsterConfig, TOPS, randomMonster,
} from "../characters/Monster";
import { MeadowBackground } from "../games/counting-adventure/art";
import { type OnboardingStep, type Profile, cleanName, loadState, saveState } from "../services/storage";
import { SoundButton, SpeechBubble } from "../ui/controls";
import { IconCheck, IconPlay } from "../ui/icons";

/**
 * First-run flow: hook with story + play BEFORE asking anything, then let the child create something of their own.
 *   intro story → bubble-pop warm-up → build your monster → name it → your name (device-only) → age
 *   → grown-up step (parent gate + parent email with consent, skippable) → adventure map
 */
const ORDER: OnboardingStep[] = ["intro", "pop", "build", "name", "kid", "age", "grownup", "done"];
const MONSTER_NAMES = ["Ziggy", "Pip", "Mo", "Bloop", "Nova", "Fizz", "Taco", "Luna"];

function useProfile() {
  const [profile, setProfileState] = useState<Profile>(() => loadState().profile);
  // persist synchronously (not inside a state updater): a navigation in the same tick must not lose the save
  const update = useCallback((patch: Partial<Profile>) => {
    const next = { ...loadState().profile, ...patch };
    saveState({ profile: next });
    setProfileState(next);
  }, []);
  return [profile, update] as const;
}

export function Onboarding() {
  const { navigate, audioReady, unlockAudio } = useApp();
  const [profile, update] = useProfile();
  const step = profile.step;
  const next = useCallback(() => {
    const i = ORDER.indexOf(loadState().profile.step);
    const to = ORDER[Math.min(ORDER.length - 1, i + 1)]!;
    update({ step: to });
    if (to === "done") navigate("/map", { replace: true });
  }, [update, navigate]);

  useEffect(() => {
    if (step === "done") navigate("/map", { replace: true });
  }, [step, navigate]);

  if (!audioReady && step !== "done") {
    return (
      <main className="onb onb-tap">
        <MeadowBackground />
        <button type="button" className="big-play" data-testid="onb-begin" aria-label="Start" onClick={() => { unlockAudio(); audio.play("tap"); }}>
          <IconPlay />
        </button>
      </main>
    );
  }

  return (
    <main className={`onb step-${step}`} data-testid="onboarding" data-step={step}>
      <MeadowBackground />
      <div className="onb-top">
        <span className="onb-dots" aria-label={`Step ${ORDER.indexOf(step) + 1} of ${ORDER.length - 1}`}>
          {ORDER.slice(0, -1).map((s, i) => <i key={s} className={i <= ORDER.indexOf(step) ? "on" : ""} />)}
        </span>
        <SoundButton />
      </div>
      {step === "intro" && <IntroStory onDone={next} />}
      {step === "pop" && <BubblePop onDone={next} />}
      {step === "build" && <Builder initial={profile.monster} onDone={(m) => { update({ monster: m }); next(); }} />}
      {step === "name" && <NameMonster monster={profile.monster ?? DEFAULT_MONSTER} initial={profile.monsterName} onDone={(n) => { update({ monsterName: n }); next(); }} />}
      {step === "kid" && <KidName monster={profile.monster ?? DEFAULT_MONSTER} initial={profile.kidName} onDone={(n) => { update({ kidName: n }); next(); }} />}
      {step === "age" && <AgeStep onDone={() => next()} />}
      {step === "grownup" && <GrownUp onDone={(s) => { update({ parentSignup: s }); next(); }} />}
    </main>
  );
}

/* ---------------- 1. Intro story ---------------- */
function IntroStory({ onDone }: { onDone: () => void }) {
  const { caption, speaking, reducedMotion } = useApp();
  const [beat, setBeat] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      audio.play("whoosh");
      await audio.speak("onb.crew1");
      if (!alive) return;
      setBeat(1);
      audio.play("star");
      await audio.speak("onb.crew2");
      if (!alive) return;
      setBeat(2);
      await audio.speak("onb.crew3");
      if (alive) setReady(true);
    })();
    const t = window.setTimeout(() => alive && setReady(true), 2500); // button is never held hostage by audio
    return () => {
      alive = false;
      window.clearTimeout(t);
      audio.stopVoice();
    };
  }, []);
  return (
    <section className="onb-stage intro-story">
      <div className={`crew-parade beat-${beat} ${reducedMotion ? "still" : ""}`} aria-hidden="true">
        <span className="pc p1"><Zuzu size={110} /></span>
        <span className="pc p2"><Gloop size={104} /></span>
        <span className="pc hero"><Bobbo state={speaking ? "greeting" : "idle"} talking={speaking} size={190} /></span>
        <span className="pc p3"><Hoot size={104} /></span>
        <span className="pc p4"><Rumble size={110} /></span>
        <span className="pc p5"><Puff size={104} /></span>
      </div>
      <SpeechBubble text={caption || "Hello, hello! Welcome to BrainZippy!"} tail="down" className="onb-bubble" />
      <button type="button" className={`big-play onb-next ${ready ? "" : "dim"}`} data-testid="onb-next" aria-label="Let's play" onClick={() => { audio.play("tap"); onDone(); }}>
        <IconPlay /><span>Play!</span>
      </button>
    </section>
  );
}

/* ---------------- 2. Bubble pop warm-up ---------------- */
const POP_GOAL = 8;
const BUBBLE_FACES = ["bobbo", "zuzu", "gloop", "hoot", "rumble", "puff"] as const;
const FACE_COLOR: Record<string, string> = { bobbo: "#FF9F43", zuzu: "#8E6CEF", gloop: "#2EC4B6", hoot: "#6BCB77", rumble: "#4D96FF", puff: "#FF8FB1" };

function BubblePop({ onDone }: { onDone: () => void }) {
  const { caption, reducedMotion } = useApp();
  const [popped, setPopped] = useState(0);
  const [bubbles, setBubbles] = useState(() => Array.from({ length: 5 }, (_, i) => makeBubble(i)));
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number; c: string }[]>([]);
  const done = popped >= POP_GOAL;
  const nextId = useRef(100);

  useEffect(() => {
    void audio.speak("pop.start");
  }, []);
  useEffect(() => {
    if (popped === 4) void audio.speak("pop.more");
    if (done) {
      audio.play("correct");
      let alive = true;
      void (async () => {
        await Promise.all([audio.speak("pop.done"), new Promise((r) => window.setTimeout(r, 1500))]);
        if (alive) onDone();
      })();
      return () => {
        alive = false;
      };
    }
  }, [popped, done, onDone]);

  const pop = (id: number, el: HTMLElement) => {
    if (done) return;
    const r = el.getBoundingClientRect();
    const b = bubbles.find((x) => x.id === id);
    audio.playCount(popped + 1);
    audio.play("tap", { gain: 0.5 });
    setBursts((xs) => [...xs, { id: nextId.current++, x: r.left + r.width / 2, y: r.top + r.height / 2, c: FACE_COLOR[b?.face ?? "bobbo"]! }]);
    setPopped((p) => p + 1);
    setBubbles((xs) => xs.map((x) => (x.id === id ? makeBubble(nextId.current++) : x)));
  };

  return (
    <section className="onb-stage bubble-pop">
      <div className="pop-count" aria-label={`${popped} of ${POP_GOAL} bubbles popped`}>
        {Array.from({ length: POP_GOAL }, (_, i) => <i key={i} className={i < popped ? "on" : ""} />)}
      </div>
      <div className="bubble-field">
        {!done &&
          bubbles.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`bubble ${reducedMotion ? "still" : ""}`}
              data-testid="bubble"
              aria-label="Bubble. Press to pop"
              style={{ left: `${b.x}%`, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, "--size": `${b.size}px`, "--sway": `${b.sway}px`, "--sy": `${b.still}%` } as React.CSSProperties}
              onClick={(e) => pop(b.id, e.currentTarget)}
              onAnimationIteration={() => setBubbles((xs) => xs.map((x) => (x.id === b.id ? { ...x, x: 8 + Math.random() * 84 } : x)))}
            >
              <span className="bubble-face" style={{ background: FACE_COLOR[b.face] }}>
                <i /><i /><b />
              </span>
            </button>
          ))}
      </div>
      {bursts.map((bu) => (
        <div key={bu.id} className="pop-burst" style={{ left: bu.x, top: bu.y, "--c": bu.c } as React.CSSProperties} onAnimationEnd={() => setBursts((xs) => xs.filter((x) => x.id !== bu.id))} aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ "--a": `${i * 36}deg` } as React.CSSProperties} />)}
        </div>
      ))}
      <SpeechBubble text={caption} tail="down" className="onb-bubble low" />
    </section>
  );
}

function makeBubble(id: number) {
  return {
    id,
    x: 8 + Math.random() * 84,
    size: 92 + Math.round(Math.random() * 40),
    dur: 7 + Math.random() * 4,
    delay: -Math.random() * 6,
    sway: 20 + Math.round(Math.random() * 30),
    still: 20 + Math.round(Math.random() * 60),
    face: BUBBLE_FACES[id % BUBBLE_FACES.length]!,
  };
}

/* ---------------- 3. Monster builder ---------------- */
type Cat = "body" | "color" | "eyes" | "mouth" | "arms" | "top";
const CATS: { id: Cat; label: string; options: readonly string[] }[] = [
  { id: "body", label: "Body", options: BODIES },
  { id: "color", label: "Color", options: COLORS },
  { id: "eyes", label: "Eyes", options: EYES },
  { id: "mouth", label: "Mouth", options: MOUTHS },
  { id: "arms", label: "Arms", options: ARMS },
  { id: "top", label: "Top", options: TOPS },
];
const OPTION_LABEL: Record<string, string> = {
  egg: "egg", round: "round", bean: "tall", jelly: "jelly", block: "block",
  two: "two eyes", one: "one big eye", three: "three eyes", sleepy: "sleepy eyes", specs: "glasses",
  smile: "smile", laugh: "big laugh", fang: "fang grin", o: "little o", tongue: "silly tongue",
  tiny: "tiny arms", wave: "waving arm", claws: "claws", wings: "wings", noodle: "noodle arms",
  horns: "horns", ears: "bunny ears", antenna: "antenna", leaves: "leaves", none: "nothing",
};

function Builder({ initial, onDone }: { initial: MonsterConfig | null; onDone: (m: MonsterConfig) => void }) {
  const { caption, speaking } = useApp();
  const [m, setM] = useState<MonsterConfig>(initial ?? DEFAULT_MONSTER);
  const [cat, setCat] = useState<Cat>("body");
  const [picks, setPicks] = useState(0);
  const [cheer, setCheer] = useState(false);

  useEffect(() => {
    void (async () => {
      await audio.speak("build.start");
      void audio.speak("build.body");
    })();
  }, []);

  const choose = (key: Cat, value: string) => {
    audio.play("tap");
    audio.play("pickup", { gain: 0.4 });
    setM((x) => ({ ...x, [key]: value }));
    const n = picks + 1;
    setPicks(n);
    setCheer(true);
    window.setTimeout(() => setCheer(false), 900);
    if (n % 3 === 0) void audio.speak(`build.react.${((n / 3 - 1) % 5) + 1}`);
  };

  const options = CATS.find((c) => c.id === cat)!;
  return (
    <section className="onb-stage builder">
      <div className="builder-stage">
        <div className="podium" aria-hidden="true" />
        <Monster config={m} state={cheer ? "greeting" : "idle"} size="100%" />
        <SpeechBubble text={speaking ? caption : ""} tail="down" className="onb-bubble builder-bubble" />
      </div>
      <div className="builder-panel">
        <div className="cat-tabs" role="tablist" aria-label="Monster parts">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              className={`cat-tab ${cat === c.id ? "on" : ""}`}
              data-testid={`cat-${c.id}`}
              onClick={() => {
                audio.play("tap", { gain: 0.5 });
                setCat(c.id);
                void audio.speak(`build.${c.id}`);
              }}
            >
              <CatIcon cat={c.id} m={m} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <div className="option-grid" role="tabpanel" aria-label={`${options.label} choices`}>
          {options.options.map((o) => {
            const selected = m[cat] === o;
            return (
              <button
                key={o}
                type="button"
                className={`option ${selected ? "on" : ""}`}
                aria-pressed={selected}
                aria-label={cat === "color" ? o : OPTION_LABEL[o]}
                data-testid={`opt-${cat}-${o}`}
                onClick={() => choose(cat, o)}
              >
                {cat === "color" ? (
                  <span className="swatch" style={{ background: COLOR_HEX[o as keyof typeof COLOR_HEX] }} />
                ) : (
                  <Monster config={{ ...m, [cat]: o }} size="100%" label="" className="thumb" />
                )}
              </button>
            );
          })}
        </div>
        <div className="builder-actions">
          <button type="button" className="round-btn dice" data-testid="build-random" aria-label="Surprise me" onClick={() => { audio.play("whoosh"); setM(randomMonster()); void audio.speak("build.random"); }}>
            <Dice />
          </button>
          <button type="button" className="round-btn go" data-testid="build-done" aria-label="Done" onClick={() => { audio.play("correct"); void audio.speak("build.done"); onDone(m); }}>
            <IconCheck />
          </button>
        </div>
      </div>
    </section>
  );
}

function CatIcon({ cat, m }: { cat: Cat; m: MonsterConfig }) {
  if (cat === "color") return <span className="cat-ic swatch" style={{ background: COLOR_HEX[m.color] }} />;
  const sample: Record<Cat, Partial<MonsterConfig>> = { body: {}, color: {}, eyes: {}, mouth: {}, arms: {}, top: {} };
  return <span className="cat-ic"><Monster config={{ ...m, ...sample[cat] }} size="100%" label="" className={`thumb focus-${cat}`} /></span>;
}

const Dice = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <rect x="5" y="5" width="22" height="22" rx="6" fill="#fff" stroke="currentColor" strokeWidth="3" />
    {[[11, 11], [21, 21], [16, 16], [21, 11], [11, 21]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.3" fill="currentColor" />)}
  </svg>
);

/* ---------------- 4. Name the monster ---------------- */
function NameMonster({ monster, initial, onDone }: { monster: MonsterConfig; initial: string; onDone: (n: string) => void }) {
  const { caption, speaking } = useApp();
  const [name, setName] = useState(initial);
  useEffect(() => {
    void audio.speak("name.monster");
  }, []);
  return (
    <section className="onb-stage naming">
      <div className="name-hero">
        <Monster config={monster} state={speaking ? "greeting" : "idle"} size="100%" />
        <div className="nameplate" data-testid="nameplate">{name || "?"}</div>
      </div>
      <div className="name-panel">
        <SpeechBubble text={caption || "What's your monster's name?"} tail="down" className="onb-bubble inline" />
        <div className="name-chips">
          {MONSTER_NAMES.map((n) => (
            <button key={n} type="button" className={`chip ${name === n ? "on" : ""}`} data-testid={`name-${n}`} onClick={() => { audio.play("tap"); setName(n); void audio.speak(`name.chip.${n}`); }}>
              {n}
            </button>
          ))}
        </div>
        <label className="name-input">
          <span className="sr-only">Type a name</span>
          <input data-testid="monster-name-input" value={name} maxLength={12} placeholder="Or type a name…" autoComplete="off" autoCapitalize="words" onChange={(e) => setName(cleanName(e.target.value).slice(0, 12))} />
        </label>
        <button type="button" className="round-btn go" data-testid="name-done" aria-label="Done" aria-disabled={!name.trim()} onClick={() => { if (!name.trim()) return; audio.play("correct"); void audio.speak("name.nice"); onDone(name.trim()); }}>
          <IconCheck />
        </button>
      </div>
    </section>
  );
}

/* ---------------- 5. Child's name (device only) ---------------- */
function KidName({ monster, initial, onDone }: { monster: MonsterConfig; initial: string; onDone: (n: string) => void }) {
  const { caption } = useApp();
  const [name, setName] = useState(initial);
  useEffect(() => {
    void audio.speak("name.kid");
  }, []);
  return (
    <section className="onb-stage naming">
      <div className="name-hero small">
        <Monster config={monster} state="encouraging" size="100%" />
      </div>
      <div className="name-panel">
        <SpeechBubble text={caption || "And what's your name?"} tail="down" className="onb-bubble inline" />
        <label className="name-input big">
          <span className="sr-only">Your name</span>
          <input data-testid="kid-name-input" value={name} maxLength={16} placeholder="Your name" autoComplete="off" autoCapitalize="words" onChange={(e) => setName(cleanName(e.target.value))} />
        </label>
        <p className="device-note">Only saved on this device.</p>
        <div className="row">
          <button type="button" className="text-btn" data-testid="kid-skip" onClick={() => onDone("")}>Skip</button>
          <button type="button" className="round-btn go" data-testid="kid-done" aria-label="Done" aria-disabled={!name.trim()} onClick={() => { if (!name.trim()) return; audio.play("correct"); onDone(name.trim()); }}>
            <IconCheck />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 6. Age ---------------- */
function AgeStep({ onDone }: { onDone: () => void }) {
  const { caption } = useApp();
  useEffect(() => {
    void audio.speak("age.pick");
  }, []);
  return (
    <section className="onb-stage age-step">
      <SpeechBubble text={caption || "How old are you?"} tail="down" className="onb-bubble inline" />
      <div className="age-grid">
        {AGE_BANDS.map((b) => (
          <button key={b.id} type="button" className={`age-tile tile-${b.critter}`} data-testid={`age-${b.id}`} aria-label={`Ages ${b.label.replace("–", " to ")}`} onClick={() => { audio.play("tap"); saveState({ ageBand: b.id }); onDone(); }}>
            <span className="age-label" aria-hidden="true">{Array.from({ length: b.max - b.min + 1 }, (_, k) => <b key={k}>{b.min + k}</b>)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 7. Grown-up step ---------------- */
function GrownUp({ onDone }: { onDone: (s: "pending" | "skipped") => void }) {
  const { caption } = useApp();
  const [phase, setPhase] = useState<"gate" | "form" | "sent">("gate");
  const gate = useMemo(() => ({ a: 6 + Math.floor(Math.random() * 4), b: 5 + Math.floor(Math.random() * 4) }), []);
  const [answer, setAnswer] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void audio.speak("grownup.ask");
  }, []);

  const submit = async () => {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (!consent) return setError("Please tick the box to give consent.");
    setBusy(true);
    try {
      const res = await fetch("/api/parent-signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim(), consent: true }) });
      const body = (await res.json().catch(() => ({}))) as { devVerifyUrl?: string; error?: string };
      if (!res.ok) {
        setError(body.error === "email_delivery_not_configured" ? "Email sign-up isn't available yet. You can skip this step for now." : "Something went wrong. Please try again, or skip for now.");
        return;
      }
      setDevLink(body.devVerifyUrl ?? "");
      setPhase("sent");
      void audio.speak("grownup.thanks");
    } catch {
      setError("We couldn't reach BrainZippy. Check your connection, or skip for now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="onb-stage grownup">
      {phase === "gate" && (
        <div className="grownup-card">
          <SpeechBubble text={caption || "Ask a grown-up to help with the next step!"} tail="down" className="onb-bubble inline" />
          <form
            className="gate"
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(answer) === gate.a + gate.b) setPhase("form");
              else setAnswer("");
            }}
          >
            <label htmlFor="onb-gate">Grown-ups: what is {gate.a} + {gate.b}?</label>
            <input id="onb-gate" data-testid="onb-gate-answer" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            <button type="submit" className="pill-btn" data-testid="onb-gate-ok">OK</button>
          </form>
          <button type="button" className="text-btn" data-testid="grownup-skip" onClick={() => onDone("skipped")}>Skip for now</button>
        </div>
      )}
      {phase === "form" && (
        <form className="grownup-card parent-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <h2>Hello, grown-up!</h2>
          <p>Add <strong>your</strong> email to save your child's progress and get a short note when they earn a new sticker. We never ask for your child's email.</p>
          <label htmlFor="parent-email">Your email</label>
          <input id="parent-email" type="email" data-testid="parent-email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          <label className="consent">
            <input type="checkbox" data-testid="parent-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I'm this child's parent or guardian, and I agree to the <a href="/grown-ups" target="_blank" rel="noreferrer">privacy notice</a>. Your child's name stays on this device.</span>
          </label>
          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="row">
            <button type="button" className="text-btn" data-testid="parent-skip" onClick={() => onDone("skipped")}>Skip for now</button>
            <button type="submit" className="pill-btn" data-testid="parent-submit" disabled={busy}>Send confirmation</button>
          </div>
        </form>
      )}
      {phase === "sent" && (
        <div className="grownup-card">
          <h2>Check your inbox</h2>
          <p>We sent a confirmation link to <strong>{email.trim()}</strong>. Your child can start playing now.</p>
          {devLink && (
            <p className="dev-note">Development mode: no email is sent. <a href={devLink} target="_blank" rel="noreferrer" data-testid="dev-verify-link">Open the confirmation link</a></p>
          )}
          <button type="button" className="big-play small" data-testid="grownup-done" aria-label="Start the adventure" onClick={() => onDone("pending")}>
            <IconPlay /><span>Go!</span>
          </button>
        </div>
      )}
    </section>
  );
}
