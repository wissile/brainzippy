import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { BoardProps } from "../../../game/boards";
import { type BarSlot, barSlots, decode, storyText } from "../logic";
import { Keypad, ModelSteps, Tab, checkText, flags, useBoardKeys, useEntry, useKeyboardFlag, useSubmit } from "./shared";

/**
 * Bar-Model Orders (math.solve.bar-model): a two-step word problem on an order card, drawn as bars (roughly to scale;
 * very small parts keep a minimum width so they can be tapped). The child first puts each number tag on the bar it
 * belongs to — tap a tag then a bar, drag the tag, or Enter on each — then types the answer. A tag dropped on the wrong
 * bar slides back with a nudge (never counted as a miss); after two slips it settles on its bar by itself, so nobody
 * gets stuck. Engine misses are diagnosed from the typed answer (one step only, wrong operation, the wrong part).
 */
type Seg = { grow: number; slot?: string; text?: string; cls?: string };
interface Row { name: string; segs: Seg[]; chip?: string }

export function BarBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = decode(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const en = useEntry(st);
  const kb = useKeyboardFlag();
  const slots = barSlots(s);
  const [placed, setPlaced] = useState<Record<string, string>>({}); // slot id → tag id (the tag's home slot)
  const [picked, setPicked] = useState<string | null>(null);
  const [slips, setSlips] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [bump, setBump] = useState<string | null>(null);
  const allPlaced = slots.every((sl) => placed[sl.id]);

  useEffect(() => {
    if (f.modelOn) setPlaced(Object.fromEntries(slots.map((sl) => [sl.id, sl.id])));
  }, [f.modelOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const tagUsed = (tagId: string) => Object.values(placed).includes(tagId);
  const slotOf = (id: string) => slots.find((x) => x.id === id)!;
  const place = (tagId: string, slotId: string) => {
    if (!f.canAct || placed[slotId] || tagUsed(tagId)) return;
    busy?.();
    const tag = slotOf(tagId);
    const slot = slotOf(slotId);
    if (tag.tag === slot.tag) {
      audio.play("drop", { gain: 0.35 });
      setPlaced((p) => ({ ...p, [slotId]: tagId }));
      setPicked(null);
      setNote("");
      if (kb.current) window.setTimeout(() => (document.querySelector('[data-testid="bk-tag"]:not([aria-disabled="true"]), [data-testid="key"]') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
      return;
    }
    audio.play("tap", { gain: 0.25, rate: 0.8 });
    const n = (slips[tagId] ?? 0) + 1;
    setSlips((x) => ({ ...x, [tagId]: n }));
    setBump(slotId);
    window.setTimeout(() => setBump(null), 450);
    if (n >= 2) {
      // errorless after two slips: the tag settles on its own bar
      const home = slots.find((x) => x.tag === tag.tag && !placed[x.id]);
      if (home) setPlaced((p) => ({ ...p, [home.id]: tagId }));
      setPicked(null);
      setNote(`${tag.tag} goes on "${home?.name ?? tag.name}".`);
    } else {
      setPicked(null); // the tag slides back to the row
      setNote(`${tag.tag} belongs on a different bar. Read the order again.`);
    }
  };
  const tapTag = (id: string) => {
    if (!f.canAct || tagUsed(id)) return;
    audio.play("tap", { gain: 0.3 });
    const next = picked === id ? null : id;
    setPicked(next);
    // keyboard users: the bars come before the tags in tab order, so take focus to the first empty bar
    if (next && kb.current) window.setTimeout(() => (document.querySelector('[data-testid="bk-slot"][aria-disabled="false"]') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
  };
  const tapSlot = (id: string) => {
    if (picked) place(picked, id);
  };

  // ---- drag a tag onto a bar ----
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; active: boolean } | null>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; active: boolean } | null>(null);
  const suppress = useRef(-Infinity);
  useEffect(() => {
    if (!drag) return;
    const zoneAt = (x: number, y: number) => {
      for (const el of document.elementsFromPoint(x, y)) {
        const z = (el as HTMLElement).closest?.("[data-bk-zone]") as HTMLElement | null;
        if (z) return z.dataset.bkZone ?? null;
      }
      return null;
    };
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      d.active = d.active || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10;
      if (d.active) setDrag({ id: d.id, x: e.clientX, y: e.clientY, active: true });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d?.active) return;
      suppress.current = e.timeStamp;
      const z = zoneAt(e.clientX, e.clientY);
      if (z) place(d.id, z);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = () => {
    const v = en.modelValue ?? en.value;
    if (v === null || !f.canAct || !allPlaced) return;
    submit(v);
  };
  useBoardKeys({ digit: allPlaced ? en.type : undefined, back: allPlaced ? en.back : undefined, enter: check });

  // ---- the bars ----
  const val = (slotId: string) => (placed[slotId] ? slotOf(slotId).tag : "");
  const rows: Row[] = (() => {
    const { a, b, c } = s;
    switch (s.kind) {
      case "pw": return s.v === 1
        ? [
          { name: "Baked", segs: [{ grow: a, text: "? baked", cls: "is-unknown" }] },
          { name: "Sold, left", segs: [{ grow: b, slot: "p1" }, { grow: c, slot: "p2" }, { grow: a - b - c, slot: "left" }] },
        ]
        : [
          { name: "Baked", segs: [{ grow: a, slot: "whole" }] },
          { name: "Sold, left", segs: [{ grow: b, slot: "p1" }, { grow: c, slot: "p2" }, { grow: a - b - c, text: "? left", cls: "is-unknown" }] },
        ];
      case "cmpb": return s.v === 0
        ? [
          { name: "Puff", segs: [{ grow: a, slot: "puff" }, { grow: b, cls: "is-space" }] },
          { name: "Bobbo", segs: [{ grow: a, text: val("puff"), cls: "is-copy" }, { grow: b, slot: "more" }] },
        ]
        : [
          { name: "Bobbo", segs: [{ grow: a, slot: "bobbo" }] },
          { name: "Puff", segs: [{ grow: a - b, text: "?", cls: "is-unknown" }, { grow: b, slot: "more", cls: "is-gap" }] },
        ];
      case "mulb": return [
        { name: "Trays", segs: [{ grow: a, slot: "one" }, ...Array.from({ length: b - 1 }, () => ({ grow: a, text: val("one"), cls: "is-copy" })), { grow: c, slot: "extra", cls: "is-extra" }], chip: "trays" },
      ];
      case "timesb": return [
        { name: "Puff", segs: [{ grow: a, slot: "puff" }, { grow: a * (b - 1), cls: "is-space" }] },
        { name: "Bobbo", segs: Array.from({ length: b }, (_, i) => ({ grow: a, text: val("puff"), cls: `is-copy ${s.v === 1 && i > 0 ? "is-more" : ""}` })), chip: "times" },
      ];
      case "fracb": return [
        { name: "All", segs: [{ grow: 1, slot: "whole" }] },
        { name: "Parts", segs: [{ grow: a, slot: "cin", cls: "is-cin" }, { grow: s.b - a, text: "? plain", cls: "is-unknown" }] },
      ];
      default: return [];
    }
  })();
  const question = (() => {
    switch (s.kind) {
      case "pw": return s.v === 1 ? "Baked: ?" : "Left: ?";
      case "cmpb": return s.v === 2 ? "Puff: ?" : "Altogether: ?";
      case "mulb": return "Total: ?";
      case "timesb": return s.v === 0 ? "Altogether: ?" : "How many more: ?";
      case "fracb": return "Plain: ?";
      default: return "";
    }
  })();

  const slotBtn = (sl: BarSlot, cls = "") => {
    const v = val(sl.id);
    const model = f.modelOn && f.canAct;
    return (
      <button
        type="button"
        key={sl.id}
        className={`bk-slot ${cls} ${v ? "is-filled" : ""} ${picked && !v ? "is-target" : ""} ${bump === sl.id ? "is-bump" : ""} ${model ? "is-ok" : ""}`}
        data-testid="bk-slot"
        data-value={sl.id}
        data-bk-zone={sl.id}
        aria-label={v ? `${sl.name}: ${v}` : `${sl.name} bar: ${picked ? `put ${slotOf(picked).tag} here` : "choose a number tag first"}`}
        aria-disabled={!f.canAct || !!v}
        onClick={() => tapSlot(sl.id)}
      >
        <span className="bk-slot-name">{sl.name}</span>
        <span className="bk-slot-val">{v || " "}</span>
      </button>
    );
  };
  const segStyle = (g: number, parts?: number) => ({ flexGrow: Math.max(g, 0.0001), ...(parts ? { "--parts": parts } : {}) }) as React.CSSProperties;

  const bars = (
    <div className={`bk-bars kind-${s.kind}`} data-testid="bk-bars">
      {rows.map((r) => (
        <div className="bk-barrow" key={r.name}>
          <span className="bk-barrow-name">{r.name}</span>
          <div className="bk-bar">
            {r.segs.map((sg, i) => sg.slot
              ? <div key={i} className={`bk-seg is-slot ${sg.cls ?? ""}`} style={segStyle(sg.grow, sg.slot === "cin" ? s.a : undefined)}>{slotBtn(slotOf(sg.slot))}</div>
              : <div key={i} className={`bk-seg ${sg.cls ?? ""}`} style={segStyle(sg.grow, sg.cls?.includes("is-unknown") && s.kind === "fracb" ? s.b - s.a : undefined)}><span>{sg.text}</span></div>)}
          </div>
        </div>
      )).flatMap((el, i) => {
        const chip = rows[i]!.chip;
        // the number of equal parts sits under its bar, like a brace: "Trays: [ ]" / "× [ ]"
        return chip
          ? [el, <div className="bk-barrow is-chiprow" key={`chip-${chip}`}><span className="bk-barrow-name" /><div className="bk-chip">{chip === "times" ? "×" : ""}{slotBtn(slotOf(chip), "is-chip")}</div></div>]
          : [el];
      })}
      <p className="bk-question" data-testid="bk-question">{question}</p>
    </div>
  );

  const tags = (
    <div className="bk-tags" role="group" aria-label="Number tags">
      {[...slots].sort((x, y) => parseFloat(x.tag) - parseFloat(y.tag)).map((sl) => {
        const used = tagUsed(sl.id);
        return (
          <button
            key={sl.id}
            type="button"
            className={`bk-tag ${picked === sl.id ? "is-picked" : ""} ${used ? "is-used" : ""} ${drag?.id === sl.id ? "is-dragging" : ""}`}
            data-testid="bk-tag"
            data-value={sl.id}
            data-tag={sl.tag}
            aria-label={used ? `${sl.tag} is on its bar` : `Number tag ${sl.tag}: ${picked === sl.id ? "now choose its bar" : "pick it up"}`}
            aria-pressed={picked === sl.id}
            aria-disabled={!f.canAct || used}
            onPointerDown={(e) => {
              if (!f.canAct || used || e.button !== 0) return;
              dragRef.current = { id: sl.id, sx: e.clientX, sy: e.clientY, active: false };
              setDrag({ id: sl.id, x: e.clientX, y: e.clientY, active: false });
            }}
            onClick={(e) => {
              if (e.timeStamp - suppress.current < 80) return;
              tapTag(sl.id);
            }}
          >
            {sl.tag}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`bk-stage mode-bar kind-${s.kind}`} data-testid="bk-board" data-mode="bar" data-kind={s.kind} data-value={en.entry} data-placed={Object.keys(placed).length}>
      <Tab mode="bar" sub="Order card" />
      <div className="bk-layout">
        <section className="bk-scene" aria-label="Order card and bar model">
          <p className="bk-story" data-testid="bk-story">{storyText(s)}</p>
          {bars}
        </section>
        <section className="bk-panel" aria-label="Your answer">
          {!f.modelOn && !allPlaced && tags}
          {note && !allPlaced && <p className="bk-note" data-testid="bk-note">{note}</p>}
          {/* always mounted, so screen readers announce each slip note when its text changes */}
          <p className="sr-only" aria-live="polite" data-testid="bk-note-live">{allPlaced ? "" : note}</p>
          <Keypad st={st} entry={en.entry} onType={en.type} onBack={en.back} onCheck={check} label={question.replace(": ?", "")} disabled={!allPlaced}
            checkLabel={checkText(en.entry)} />
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
      {drag?.active && <div className="bk-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{slotOf(drag.id).tag}</div>}
    </div>
  );
}
