import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";
import { renderLine } from "../audio/voiceLines";
import { Critter } from "../daily/critters";
import { libraryStyle } from "../daily/Explore";
import type { OfferReason, PathNote } from "../engine/pathProgress";
import { type RoundHooks, RoundHooksContext } from "../game/roundHooks";
import { pathsEnabled } from "./flags";
import type { LearningPath } from "./registry";
import { type PathRoundResult, isPathPlay, recordRound, setPathPlay } from "./state";
import "./paths.css";

/** Voice line for a path note. Kind words only: never framed as failure (tested). */
export function noteLine(note: PathNote | null): string | undefined {
  if (!note) return undefined;
  switch (note.kind) {
    case "skip":
      return "path.note.skip";
    case "next-world":
      return "path.note.next";
    case "down":
      return "path.note.down";
    case "path-end":
      return "path.note.end";
  }
}
/** The note as shown on the reward screen = exactly what is spoken. */
export const noteText = (note: PathNote | null): string | undefined => {
  const id = noteLine(note);
  return id ? renderLine(id) : undefined;
};

/** Quiet time (no speech) before the path speaks between rounds, so it never talks over the reward lines. */
export const QUIET_MS = 900;
/** It speaks at the latest after this long, even if something keeps talking. */
export const MAX_WAIT_MS = 12_000;

/**
 * Wraps every /play/<world> route inside DailyGate. When paths are visible it records each completed round in the
 * path rules (src/engine/pathProgress.ts), shows and speaks the rule's note on the reward screen, offers another path
 * between rounds when the rules say so, and sends back/"Games" to the path view for rounds started there. Without
 * visible paths it passes the daily hooks through unchanged.
 */
export function PathGate({ children }: { children: React.ReactNode }) {
  const parent = useContext(RoundHooksContext);
  const last = useRef<{ n: number; gameId: string; result: PathRoundResult | null } | null>(null);
  const hooks = useMemo<RoundHooks>(() => {
    if (!pathsEnabled()) return parent;
    return {
      ...parent,
      onRoundComplete: (r) => {
        parent.onRoundComplete?.(r);
        let result: PathRoundResult | null = null;
        try {
          result = recordRound(r);
        } catch {
          /* path bookkeeping never breaks a round */
        }
        last.current = { n: (last.current?.n ?? 0) + 1, gameId: r.gameId, result };
      },
      backTo: (g) => (isPathPlay(g) ? "/path" : parent.backTo?.(g)),
      levelNote: (g) => (last.current?.gameId === g ? noteText(last.current.result?.note ?? null) : undefined) ?? parent.levelNote?.(g),
      rewardExtra: (g) => {
        const l = last.current;
        const res = l && l.gameId === g ? l.result : null;
        const line = noteLine(res?.note ?? null);
        return (
          <>
            {parent.rewardExtra?.(g)}
            {res && (line || res.offer) && <PathBetween key={l!.n} path={res.path} line={line} offer={res.offer} />}
          </>
        );
      },
    };
  }, [parent]);
  return <RoundHooksContext.Provider value={hooks}>{children}</RoundHooksContext.Provider>;
}

/** Between rounds: once the reward lines are over, speak the path note, then (if the rules say so) open the offer. */
function PathBetween({ path, line, offer }: { path: LearningPath; line?: string; offer: OfferReason | null }) {
  const { speaking } = useApp();
  const [stage, setStage] = useState<"wait" | "note" | "offer">("wait");
  useEffect(() => {
    if (stage !== "wait") return;
    const t = window.setTimeout(() => setStage("note"), speaking ? MAX_WAIT_MS : QUIET_MS);
    return () => window.clearTimeout(t);
  }, [speaking, stage]);
  useEffect(() => {
    const cap = window.setTimeout(() => setStage((s) => (s === "wait" ? "note" : s)), MAX_WAIT_MS);
    return () => window.clearTimeout(cap);
  }, []);
  useEffect(() => {
    if (stage !== "note") return;
    let live = true;
    void (async () => {
      if (line) await audio.speak(line);
      if (live) setStage(offer ? "offer" : "note");
    })();
    return () => {
      live = false;
    };
  }, [stage === "note"]); // eslint-disable-line react-hooks/exhaustive-deps
  return stage === "offer" && offer ? <PathOffer path={path} reason={offer} /> : null;
}

/**
 * The host's "want to try another path?" offer. A modal dialog: the rest of the app is inert, focus starts on
 * "Keep going" (the default), Tab stays inside, Escape closes. It never moves the child by itself.
 */
export function PathOffer({ path, reason }: { path: LearningPath; reason: OfferReason }) {
  const { navigate } = useApp();
  const [closed, setClosed] = useState(false);
  const yes = useRef<HTMLButtonElement>(null);
  const no = useRef<HTMLButtonElement>(null);
  const before = useRef<Element | null>(null);
  const line = `path.offer.${reason}`;

  useEffect(() => {
    if (closed) return;
    before.current = document.activeElement;
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    no.current?.focus();
    void audio.speak(line);
    return () => {
      root?.removeAttribute("inert");
    };
  }, [closed, line]);

  if (closed) return null;
  const close = () => {
    audio.play("tap");
    audio.stopVoice();
    document.getElementById("root")?.removeAttribute("inert");
    setClosed(true);
    const b = before.current;
    window.setTimeout(() => (b instanceof HTMLElement && b.isConnected && b !== document.body ? b.focus() : document.querySelector<HTMLElement>('[data-testid="play-again"], [data-testid="more-games"]')?.focus()), 0);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault(); // two buttons: keep focus inside the dialog
      (document.activeElement === no.current ? yes.current : no.current)?.focus();
    }
  };
  return createPortal(
    <div className="path-offer-backdrop" data-testid="path-offer" data-reason={reason} onKeyDown={onKey}>
      <div className="path-offer" role="dialog" aria-modal="true" aria-labelledby="path-offer-text" style={libraryStyle(path.library)}>
        <span className="path-offer-host" aria-hidden="true"><Critter id={path.host} color={path.library.theme.main} /></span>
        {/* the full spoken line, so muted players and readers get exactly what the host says */}
        <p id="path-offer-text" className="path-offer-text" data-testid="path-offer-text">{renderLine(line)}</p>
        <div className="path-offer-actions">
          <button ref={no} type="button" className="path-offer-no" data-testid="path-offer-no" aria-label={`Keep going: ${path.title}`} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Keep going</span>
          </button>
          <button
            ref={yes}
            type="button"
            className="path-offer-yes"
            data-testid="path-offer-yes"
            aria-label="Choose another path"
            onClick={() => {
              audio.play("whoosh");
              document.getElementById("root")?.removeAttribute("inert");
              setPathPlay(null);
              navigate("/paths");
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8 H17 M13 4 L17 8 L13 12 M20 16 H7 M11 12 L7 16 L11 20" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Another path</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
