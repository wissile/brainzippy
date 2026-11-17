import { useEffect, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { Bobbo } from "../characters/Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../characters/Crew";
import { clearState, loadState, saveState } from "../services/storage";
import { NavButton, SoundButton, SpeechBubble } from "../ui/controls";
import { IconLock, IconPlay } from "../ui/icons";
import { useApp } from "./AppContext";

export const AGE_BANDS = [
  { id: "ages-3-5", label: "3–5", min: 3, max: 5, critter: "bobbo" },
  { id: "ages-6-8", label: "6–8", min: 6, max: 8, critter: "zuzu" },
  { id: "ages-9-11", label: "9–11", min: 9, max: 11, critter: "hoot" },
  { id: "ages-12-14", label: "12–14", min: 12, max: 14, critter: "rumble" },
] as const;

function useSpeakOnEnter(id: string, enabled = true) {
  const { audioReady } = useApp();
  useEffect(() => {
    if (!enabled || !audioReady) return;
    const t = window.setTimeout(() => void audio.speak(id), 350);
    return () => window.clearTimeout(t);
  }, [id, audioReady, enabled]);
}

export function HomeScreen() {
  const { navigate, unlockAudio } = useApp();
  return (
    <main className="screen home">
      <div className="screen-top">
        <span />
        <SoundButton />
      </div>
      <h1 className="logo" aria-label="BrainZippy">
        <span className="logo-brain">Brain</span>
        <span className="logo-zippy">Zippy</span>
        <svg className="logo-zap" viewBox="0 0 40 60" aria-hidden="true"><path d="M24 2 L6 34 H20 L14 58 L34 22 H20 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="4" strokeLinejoin="round" /></svg>
      </h1>
      <div className="home-crew" aria-hidden="true">
        <Zuzu size={120} className="crew-a" />
        <Bobbo state="greeting" size={170} className="crew-hero" />
        <Gloop size={115} className="crew-b" />
      </div>
      <button
        type="button"
        className="big-play"
        data-testid="home-play"
        aria-label="Play"
        onClick={() => {
          unlockAudio();
          audio.play("tap");
          navigate("/play");
        }}
      >
        <IconPlay />
        <span>Play</span>
      </button>
      <footer className="home-foot">
        <a
          href="/grown-ups"
          onClick={(e) => {
            e.preventDefault();
            navigate("/grown-ups");
          }}
        >
          For grown-ups
        </a>
      </footer>
    </main>
  );
}

const CRITTER = { zuzu: Zuzu, hoot: Hoot, rumble: Rumble, gloop: Gloop, puff: Puff } as const;

export function AgeScreen() {
  const { navigate, caption } = useApp();
  useSpeakOnEnter("age.pick");
  return (
    <main className="screen ages">
      <div className="screen-top">
        <NavButton to="/" label="Home" />
        <h1 className="screen-title">How old are you?</h1>
        <SoundButton />
      </div>
      <div className="age-grid" role="list">
        {AGE_BANDS.map((b, i) => {
          const C = b.critter === "bobbo" ? null : CRITTER[b.critter];
          return (
            <button
              key={b.id}
              type="button"
              role="listitem"
              className={`age-tile tile-${b.critter}`}
              style={{ animationDelay: `${i * 70}ms` }}
              data-testid={`age-${b.id}`}
              aria-label={`Ages ${b.label.replace("–", " to ")}`}
              onClick={() => {
                audio.play("tap");
                saveState({ ageBand: b.id });
                navigate(`/play/${b.id}`);
              }}
            >
              <span className="age-critter" aria-hidden="true">
                {C ? <C size={100} /> : <Bobbo state="idle" size={110} />}
              </span>
              <span className="age-label">{b.label}</span>
            </button>
          );
        })}
      </div>
      <SpeechBubble text={caption} className="menu-caption" tail="down" />
    </main>
  );
}

export function GamesScreen({ bandId }: { bandId: string }) {
  const { navigate, caption } = useApp();
  const band = AGE_BANDS.find((b) => b.id === bandId);
  const suitable = band ? band.min <= 6 && band.max >= 4 : false;
  useSpeakOnEnter(suitable ? "games.pick" : "games.later", Boolean(band));

  if (!band) {
    return (
      <main className="screen games">
        <div className="screen-top"><NavButton to="/play" kind="back" label="Back" /><span /><SoundButton /></div>
        <p className="empty-note">Let's pick your age first!</p>
      </main>
    );
  }

  return (
    <main className="screen games">
      <div className="screen-top">
        <NavButton to="/play" kind="back" label="Back to ages" />
        <h1 className="screen-title">Ages {band.label}</h1>
        <SoundButton />
      </div>
      {suitable ? (
        <div className="game-row">
          <button
            type="button"
            className="game-tile featured"
            data-testid="game-counting-adventure"
            aria-label="Counting Adventure with Bobbo. Ages 4 to 6."
            onClick={() => {
              audio.play("tap");
              navigate("/play/counting-adventure");
            }}
          >
            <span className="game-art meadow-mini" aria-hidden="true">
              <Bobbo state="idle" size={150} />
              <span className="mini-apples"><i /><i /><i /></span>
            </span>
            <span className="game-name">Counting Adventure</span>
            <span className="game-meta">Ages 4–6 · Counting to 10</span>
            <span className="game-go" aria-hidden="true"><IconPlay /></span>
          </button>
          <div className="game-tile soon" aria-label="Spelling with Zuzu, coming soon">
            <span className="game-art" aria-hidden="true"><Zuzu size={110} /></span>
            <span className="game-name">Letter Hunt</span>
            <span className="soon-badge"><IconLock /> Soon</span>
          </div>
          <div className="game-tile soon" aria-label="Shapes with Gloop, coming soon">
            <span className="game-art" aria-hidden="true"><Gloop size={105} /></span>
            <span className="game-name">Shape Squish</span>
            <span className="soon-badge"><IconLock /> Soon</span>
          </div>
        </div>
      ) : (
        <div className="later">
          <Puff size={170} />
          <p>New games for big kids are on the way!</p>
          <button type="button" className="pill-btn" onClick={() => navigate("/play")}>Back</button>
        </div>
      )}
      <SpeechBubble text={caption} className="menu-caption" tail="down" />
    </main>
  );
}

export function GrownUpsScreen() {
  const [deleted, setDeleted] = useState(false);
  return (
    <main className="screen grownups">
      <div className="screen-top"><NavButton to="/" label="Home" /><h1 className="screen-title">For grown-ups</h1><span /></div>
      <article className="prose">
        <h2>What is BrainZippy?</h2>
        <p>BrainZippy is a collection of short learning games for children aged 3 to 14. Each game has one clear learning goal, spoken instructions, and gentle hints, so young children can play without reading.</p>
        <h2>Counting Adventure (ages 4–6)</h2>
        <p>Children help Bobbo count his snacks. They practise touching each object once while counting, learn that the last number said tells how many, recognise small amounts at a glance, and count out an amount from a larger group. Difficulty rises from 1–3 objects up to 10 based on simple, published rules: two first-try answers in a row move up a level; needing three tries moves down a level.</p>
        <h2>Privacy</h2>
        <p>Guest play needs no account and collects no names, emails, photos, or location. Progress is stored on this device; an anonymous random ID may back it up to our servers so it survives a browser reset. There are no ads, no chat, and no third-party trackers.</p>
        <p>
          <button type="button" className="pill-btn danger" data-testid="reset-progress" onClick={() => {
            void (async () => {
              const id = loadState().serverId;
              if (id) await fetch(`/api/guest/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
              clearState();
              setDeleted(true);
            })();
          }}>Delete all progress on this device</button>
        </p>
        {deleted && <p role="status">Progress on this device has been deleted.</p>}
      </article>
    </main>
  );
}
