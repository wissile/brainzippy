import { useEffect, useRef, useState } from "react";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";
import { Critter, hostOf } from "../daily/critters";
import { libraryStyle } from "../daily/Explore";
import { setActiveStop } from "../daily/store";
import { loadState } from "../services/storage";
import { IconPlay } from "../ui/icons";
import { visiblePaths } from "./flags";
import type { LearningPath } from "./registry";
import { currentPath, currentStop, pickPath, preparePlay, setPathPlay } from "./state";
import { SubjectIcon } from "./SubjectIcon";
import { useSpeakOnMount } from "./useSpeak";
import "./paths.css";

const sayTitle = (p: LearningPath) => ({ id: p.line, vars: { host: p.hostName } });

/** "Choose your adventure": one big host card per visible path. Tap = hear the title and select; Go = start. */
export function PathPicker() {
  const { navigate } = useApp();
  const paths = visiblePaths();
  const cur = loadState().paths.cur;
  const [sel, setSel] = useState<string | null>(paths.some((p) => p.id === cur) ? cur : null);
  const moved = useRef(false);
  useSpeakOnMount(() => [{ id: "path.pick.hello" }], () => moved.current);
  const chosen = paths.find((p) => p.id === sel) ?? null;
  // screen change: focus the selected card, else the heading (keyboard and screen-reader users land in the new screen)
  useEffect(() => {
    const card = sel ? document.querySelector<HTMLElement>(`[data-testid="path-card-${sel}"]`) : null;
    (card ?? document.getElementById("path-picker-title"))?.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (p: LearningPath) => {
    moved.current = true;
    audio.play("tap");
    setSel(p.id);
    void audio.speak(p.line, { host: p.hostName });
  };
  const go = () => {
    if (!chosen) return;
    audio.play("whoosh");
    pickPath(chosen);
    navigate("/path");
  };

  return (
    <section className="paths-panel path-picker" data-testid="path-picker" aria-labelledby="path-picker-title">
      <h2 id="path-picker-title" className="paths-heading" tabIndex={-1}>Choose your adventure</h2>
      <ul className="path-cards" role="list">
        {paths.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`path-card ${sel === p.id ? "on" : ""}`}
              style={libraryStyle(p.library)}
              data-testid={`path-card-${p.id}`}
              data-host={p.host}
              aria-pressed={sel === p.id}
              aria-label={`${p.title}${cur === p.id ? ", your path" : ""}. Hear it and choose`}
              onClick={() => choose(p)}
            >
              <span className="path-card-host" aria-hidden="true">
                <Critter id={p.host} color={p.library.theme.main} />
                <span className="path-card-subject"><SubjectIcon id={p.id} /></span>
              </span>
              <span className="path-card-title" aria-hidden="true">{p.title}</span>
              {cur === p.id && <span className="path-card-badge" aria-hidden="true">Your path</span>}
              {sel === p.id && (
                <span className="path-card-tick" aria-hidden="true" data-testid="path-card-tick">
                  <svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="paths-foot">
        <button type="button" className="path-go" data-testid="path-go" disabled={!chosen} aria-label={chosen ? `Start: ${chosen.title}` : "Tap a path first"} onClick={go}>
          <IconPlay />
          <span>{chosen ? "Let's go!" : "Pick a path"}</span>
        </button>
      </div>
    </section>
  );
}

/** "Your path": the host and title, the trail of worlds with the current stop, Play and Change path. */
export function PathView() {
  const { navigate } = useApp();
  const path = currentPath();
  useEffect(() => {
    if (!path) navigate("/paths", { replace: true });
  }, [path, navigate]);
  if (!path) return null;
  return <PathViewFor path={path} />;
}

function PathViewFor({ path }: { path: LearningPath }) {
  const { navigate } = useApp();
  const { world, index, level } = currentStop(path);
  const atEnd = index === path.worlds.length - 1 && level >= world.maxLevel;
  const moved = useRef(false);
  const trail = useRef<HTMLOListElement>(null);
  useSpeakOnMount(() => [sayTitle(path), { id: atEnd ? "path.view.end" : "path.view.hello" }], () => moved.current);
  useEffect(() => document.getElementById("path-title")?.focus({ preventScroll: true }), []);

  // keep the current stop in view on the sideways trail (without scrolling the page)
  useEffect(() => {
    const ol = trail.current;
    const li = ol?.querySelector<HTMLElement>('[aria-current="step"]');
    if (ol && li) ol.scrollLeft = Math.max(0, li.offsetLeft - (ol.clientWidth - li.offsetWidth) / 2);
  }, [index]);

  const play = () => {
    moved.current = true;
    audio.play("whoosh");
    const id = preparePlay(path);
    setActiveStop(null); // like Explore: the round lights the first matching stop on today's trail
    setPathPlay(id);
    navigate(`/play/${id}`);
  };
  const hear = () => {
    audio.play("tap");
    void audio.speak(path.line, { host: path.hostName });
  };

  return (
    <section className="paths-panel path-view" style={libraryStyle(path.library)} data-testid="path-view" data-path={path.id} data-world={world.id} data-level={level} aria-labelledby="path-title">
      <header className="path-hero">
        <button type="button" className="path-hero-host" data-testid="path-hear" aria-label={`Hear: ${path.title}`} onClick={hear}>
          <Critter id={path.host} color={path.library.theme.main} />
        </button>
        <h2 id="path-title" className="path-title" data-testid="path-title" tabIndex={-1}>{path.title}</h2>
      </header>
      <ol className="path-trail" ref={trail} aria-label={`Your path: ${path.worlds.length} stops`} data-testid="path-trail">
        {path.worlds.map((w, i) => {
          const state = i < index ? "done" : i === index ? "here" : "later";
          return (
            <li key={w.id} className={`path-stop ${state}`} data-testid={`path-stop-${w.id}`} data-state={state} aria-current={i === index ? "step" : undefined}>
              <span className="path-stop-art" aria-hidden="true"><Critter id={hostOf(w)} color={path.library.theme.main} /></span>
              <span className="path-stop-name">{w.title}</span>
              <span className="sr-only">{state === "done" ? ", visited" : state === "here" ? `, you are here, level ${level + 1}` : ", coming up"}</span>
              {state === "here" && <span className="path-here" aria-hidden="true">Lv {level + 1}</span>}
              {state === "done" && (
                <span className="path-tick" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="path-actions">
        <button type="button" className="path-play" data-testid="path-play" aria-label={`Play ${world.title}, level ${level + 1}`} onClick={play}>
          <IconPlay />
          <span>Play</span>
        </button>
        <button type="button" className="path-change" data-testid="path-change" aria-label="Change path" onClick={() => { audio.play("tap"); navigate("/paths"); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8 H17 M13 4 L17 8 L13 12 M20 16 H7 M11 12 L7 16 L11 20" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>Change path</span>
        </button>
      </div>
    </section>
  );
}
