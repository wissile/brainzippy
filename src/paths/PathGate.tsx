import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";
import { getWorld } from "../content/registry";
import { Critter } from "../daily/critters";
import { libraryStyle } from "../daily/Explore";
import type { OfferReason, PathNote } from "../engine/pathProgress";
import { type RoundHooks, RoundHooksContext } from "../game/roundHooks";
import { pathsEnabled } from "./flags";
import type { LearningPath } from "./registry";
import { type PathRoundResult, isPathPlay, recordRound, setPathPlay } from "./state";
import "./paths.css";

/** Reward-screen line for a path rule that changed the level or the stop. Kind words only: never framed as failure. */
export function noteText(note: PathNote | null): string | undefined {
  if (!note) return undefined;
  const title = getWorld(note.world)?.title ?? note.world;
  switch (note.kind) {
    case "skip":
      return `Zoom! You're ready for Level ${note.level + 1}!`;
    case "next-world":
      return `Next stop on your path: ${title}!`;
    case "down":
      return `Great practice! Next time: a warm-up on Level ${note.level + 1}.`;
    case "back-world":
      return `Great practice! Next time: a warm-up in ${title}.`;
    case "path-end":
      return "You explored the whole path!";
  }
}

/**
 * Wraps every /play/<world> route inside DailyGate. When paths are visible it records each completed round in the
 * path rules (src/engine/pathProgress.ts), shows the rule's note on the reward screen, offers another path between
 * rounds when the rules say so, and sends "Games" back to the path view for rounds started there. Without visible
 * paths it passes the daily hooks through unchanged.
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
        const offer = l && l.gameId === g ? l.result?.offer : null;
        return (
          <>
            {parent.rewardExtra?.(g)}
            {offer && l?.result && <PathOffer key={l.n} path={l.result.path} reason={offer} />}
          </>
        );
      },
    };
  }, [parent]);
  return <RoundHooksContext.Provider value={hooks}>{children}</RoundHooksContext.Provider>;
}

/** Quiet time (no speech) before the offer appears, so it never talks over the reward lines. */
export const OFFER_QUIET_MS = 900;
/** The offer appears at the latest after this long, even if something keeps talking. */
export const OFFER_MAX_WAIT_MS = 12_000;

/**
 * The host's "want to try another path?" offer, between rounds. A dialog with two big choices; "Keep going" (or
 * Escape) closes it. It never moves the child by itself.
 */
export function PathOffer({ path, reason }: { path: LearningPath; reason: OfferReason }) {
  const { navigate, speaking } = useApp();
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  const yes = useRef<HTMLButtonElement>(null);
  const no = useRef<HTMLButtonElement>(null);
  const before = useRef<Element | null>(null);

  useEffect(() => {
    if (open || closed) return;
    const t = window.setTimeout(() => setOpen(true), speaking ? OFFER_MAX_WAIT_MS : OFFER_QUIET_MS);
    return () => window.clearTimeout(t);
  }, [speaking, open, closed]);
  useEffect(() => {
    const cap = window.setTimeout(() => setOpen((o) => o || !closed), OFFER_MAX_WAIT_MS);
    return () => window.clearTimeout(cap);
  }, [closed]);
  useEffect(() => {
    if (!open) return;
    before.current = document.activeElement;
    yes.current?.focus();
    void audio.speak(`path.offer.${reason}`);
  }, [open, reason]);

  if (!open || closed) return null;
  const close = () => {
    audio.play("tap");
    audio.stopVoice();
    setClosed(true);
    const b = before.current;
    window.setTimeout(() => (b instanceof HTMLElement && b.isConnected ? b.focus() : document.querySelector<HTMLElement>('[data-testid="play-again"], [data-testid="more-games"]')?.focus()), 0);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // two buttons: keep focus inside the dialog
      e.preventDefault();
      (document.activeElement === yes.current ? no.current : yes.current)?.focus();
    }
  };
  const text = reason === "end" ? "You explored this whole path!" : reason === "tricky" ? "Shall we try another path for a bit?" : "Want to try another path for a while?";
  return createPortal(
    <div className="path-offer-backdrop" data-testid="path-offer" data-reason={reason} onKeyDown={onKey}>
      <div className="path-offer" role="dialog" aria-modal="true" aria-labelledby="path-offer-text" style={libraryStyle(path.library)}>
        <span className="path-offer-host" aria-hidden="true"><Critter id={path.host} color={path.library.theme.main} /></span>
        <p id="path-offer-text" className="path-offer-text">{text}</p>
        <div className="path-offer-actions">
          <button
            ref={yes}
            type="button"
            className="path-offer-yes"
            data-testid="path-offer-yes"
            aria-label="Choose another path"
            onClick={() => {
              audio.play("whoosh");
              setPathPlay(null);
              navigate("/paths");
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8 H17 M13 4 L17 8 L13 12 M20 16 H7 M11 12 L7 16 L11 20" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Another path</span>
          </button>
          <button ref={no} type="button" className="path-offer-no" data-testid="path-offer-no" aria-label={`Keep going: ${path.title}`} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Keep going</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
