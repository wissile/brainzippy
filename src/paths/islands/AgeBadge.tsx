import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ParentGate, useParentGate } from "../../account/ui";
import { AGE_BANDS } from "../../app/screens";
import { loadState, saveState } from "../../services/storage";

/**
 * The child's age group, shown next to the grown-ups lock (D-041). Changing it is for grown-ups: the parent gate
 * (once per session) comes first. The new age changes the stops on every island at once; progress is kept.
 */
export function AgeBadge({ onChange }: { onChange?: () => void }) {
  const band = AGE_BANDS.find((b) => b.id === loadState().ageBand) ?? null;
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    window.setTimeout(() => opener.current?.focus({ preventScroll: true }), 0);
  };
  return (
    <>
      <button
        ref={opener}
        type="button"
        className="age-badge"
        data-testid="age-badge"
        aria-label={`Age group: ${band ? `${band.min} to ${band.max}` : "not set"}. For grown-ups: change it`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="age-badge-word">Age </span>{band ? band.label : ""}
      </button>
      {/* a portal: the top bar is its own stacking layer, under the island views */}
      {open && createPortal(<AgeDialog current={band?.id ?? null} onClose={close} onSaved={() => { close(); onChange?.(); }} />, document.body)}
    </>
  );
}

function AgeDialog({ current, onClose, onSaved }: { current: string | null; onClose: () => void; onSaved: () => void }) {
  const { passed, pass } = useParentGate();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const b = box.current;
    (b?.querySelector<HTMLElement>("input") ?? b?.querySelector<HTMLElement>("button[aria-pressed='true']") ?? b?.querySelector<HTMLElement>("button"))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation(); // only the dialog closes, not a card behind it
        onClose();
      }
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("button, input")].filter((el) => !el.hasAttribute("disabled"));
      if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [passed]); // eslint-disable-line react-hooks/exhaustive-deps
  // the app behind is inert while the dialog is open (like the path offer)
  useEffect(() => {
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    return () => {
      root?.removeAttribute("inert");
    };
  }, []);
  return (
    <div className="age-dialog-backdrop" data-testid="age-dialog" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="age-dialog" role="dialog" aria-modal="true" aria-labelledby={passed ? "age-dialog-title" : "pa-gate-title"} ref={box}>
        {!passed ? (
          <ParentGate onPass={pass} onCancel={onClose} />
        ) : (
          <>
            <h2 id="age-dialog-title">Your child's age</h2>
            <p>This sets how many stops each island shows and where new journeys start. Progress is kept.</p>
            <div className="age-choices">
              {AGE_BANDS.map((b) => (
                <button key={b.id} type="button" className="age-choice" data-testid={`age-choice-${b.id}`} aria-pressed={current === b.id} onClick={() => { saveState({ ageBand: b.id }); onSaved(); }}>
                  {b.label}
                </button>
              ))}
            </div>
            <button type="button" className="ocean-btn" data-testid="age-dialog-close" onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
