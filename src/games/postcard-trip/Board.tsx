import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import { Yonder } from "../../characters/library";
import type { AnswerOption } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { Balloon, Boat, CompassRose, FeatureSymbol, IslandGround, PinIcon, Postcard, WorldMap } from "./art";
import {
  ANCHOR, CONTINENT_NAME, CONTINENTS, DIR_WORD, type Dir, type LonLat, MAP_H, MAP_W, OCEANS, OPPOSITE, PACIFIC_WEST, type RegionId,
  flightFrom, isOcean, project, regionName,
} from "./geo";
import { type IslandMission, type Mission, type WorldMission, decodeMission, reaches } from "./generator";
import { COLS, COL_LETTERS, FEATURES, FEATURE_NAME, type Feature, ROWS, rc, refOf, walk } from "./island";
import { pcStore, usePc } from "./store";
import "./postcard-trip.css";

/**
 * Yonder's Postcard Trip play board.
 *
 * Island (levels 1–5): the 6×6 Monster Island map with its key. Steering missions: the child adds compass moves
 * with the N/E/S/W buttons around the compass rose (tray) — or the arrow keys — and Yonder walks the plan (one
 * move walks at once; a longer route walks on "Walk"). Key missions: tap the square with the symbol. Grid
 * missions: choose the reference (tray).
 * World (levels 6–10): an Equal Earth world map. Postcards and the boat are dragged onto the map, or tapped and
 * then a place tapped, or picked up with Enter and dropped with Enter on a place in the list of map places.
 * Direction / hemisphere / season questions use big buttons in the tray; trips drop postcards into stop slots.
 * Every answer is checked by the engine against the mission's computed answer (./generator).
 */

const wait = (ms: number, alive: () => boolean) => new Promise<boolean>((res) => window.setTimeout(() => res(alive()), ms));
const DIR_KEY: Record<string, Dir> = { ArrowUp: "n", ArrowRight: "e", ArrowDown: "s", ArrowLeft: "w" };
const DIR_LETTER: Record<Dir, string> = { n: "N", e: "E", s: "S", w: "W" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

const isSolved = (st: BoardProps["st"]) => st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);

export function PostcardBoard(props: BoardProps) {
  const ex = props.st.exercise;
  const m = useMemo(() => decodeMission(ex), [ex]);
  return m.kind === "island" ? <IslandBoard {...props} m={m} /> : <WorldBoard {...props} m={m} />;
}

/** Postcards collected this round (one per finished mission). */
function Album({ n }: { n: number }) {
  return (
    <div className="pc-album" data-testid="pc-album" data-count={n} role="img" aria-label={`${n} ${n === 1 ? "postcard" : "postcards"} collected`}>
      <span className="pc-album-stack" aria-hidden="true"><Postcard placeId="" /></span>
      <b aria-hidden="true">{n}</b>
    </div>
  );
}

// ================================================================ island

type Pose = "idle" | "walk" | "bump" | "happy" | "sit";

function IslandBoard({ st, act, alongIndex, busy, progress, m }: BoardProps & { m: IslandMission }) {
  const ex = st.exercise;
  const sh = usePc(ex);
  const { reducedMotion } = useApp();
  const steering = m.mode === "step" || m.mode === "route";
  const slots = m.moves.length;
  const canAct = st.phase === "answering" && !sh.running;
  const solved = isSolved(st);
  const model = steering && st.hintStage >= 2;
  const [walker, setWalker] = useState<{ cell: number; pose: Pose; face: "l" | "r" }>({ cell: m.start, pose: "idle", face: "r" });
  const [trail, setTrail] = useState<number[]>([]);
  const [collected, setCollected] = useState(false);
  const [say, setSay] = useState("");
  const token = useRef(0);
  const set = (p: Parameters<typeof pcStore.set>[1]) => pcStore.set(ex.id, p);
  useEffect(() => () => {
    token.current++;
  }, []);

  const home = () => {
    token.current++;
    setWalker({ cell: m.start, pose: "idle", face: "r" });
    setTrail([]);
  };

  // ---------- steering ----------
  const walkPlan = async (plan: readonly Dir[]) => {
    if (st.phase !== "answering" || pcStore.get().running || plan.length < slots) return;
    busy?.();
    const tk = ++token.current;
    const alive = () => tk === token.current;
    set({ running: true });
    void audio.speak("pc.walk.go");
    const w = walk(m.start, plan);
    setTrail([]);
    let face: "l" | "r" = "r";
    const stepMs = reducedMotion ? 200 : 480;
    if (!(await wait(reducedMotion ? 60 : 260, alive))) return set({ running: false });
    for (let i = 0; i < plan.length; i++) {
      const d = plan[i]!;
      if (d === "e") face = "r";
      if (d === "w") face = "l";
      if (w.bump === i) {
        setWalker((x) => ({ ...x, face, pose: "bump" }));
        audio.play("drop", { rate: 0.6, gain: 0.5 });
        if (!(await wait(700, alive))) return set({ running: false });
        break;
      }
      setWalker({ cell: w.cells[i + 1]!, pose: "walk", face });
      setTrail(w.cells.slice(1, i + 2));
      audio.playCount(i + 1);
      if (!(await wait(stepMs, alive))) return set({ running: false });
    }
    const ok = reaches(m, plan);
    const diagnosis = ok ? null : w.bump >= 0 ? "pc.help.edge" : slots === 1 ? (plan[0] === OPPOSITE[m.moves[0]!] ? "pc.help.opposite" : "pc.help.turn") : "pc.help.route";
    setWalker((x) => ({ ...x, pose: ok ? "happy" : "sit" }));
    if (ok) {
      setCollected(true);
      audio.play("pickup", { gain: 0.6 });
    }
    setSay(ok ? `Yonder reached the ${FEATURE_NAME[m.targetFeature]} and collected a postcard.` : `Yonder walked ${plan.map((d) => DIR_WORD[d]).join(", ")} and stopped at ${refOf(w.end)}.`);
    set({ running: false, diagnosis });
    await wait(260, () => true);
    act({ type: "SUBMIT", value: ok ? ["start", "goal"] : ["start"] });
  };

  const press = (d: Dir) => {
    if (!steering || !canAct) return;
    const plan = pcStore.get().plan;
    if (plan.length >= slots) {
      void audio.speak("pc.walk.full");
      return;
    }
    if (model && m.moves[plan.length] !== d) return;
    busy?.();
    if (walker.cell !== m.start || trail.length) home();
    audio.play("tap", { gain: 0.5 });
    void audio.speak(`pc.dir.${d}`);
    const next = [...plan, d];
    set({ plan: next });
    setSay(`Plan: ${next.map((x) => DIR_WORD[x]).join(", ")}.${next.length < slots ? ` ${slots - next.length} more.` : slots > 1 ? " Press Walk." : ""}`);
    if (slots === 1) window.setTimeout(() => void walkPlan(next), reducedMotion ? 120 : 380);
  };
  const removeAt = (i: number) => {
    if (!canAct) return;
    const plan = pcStore.get().plan;
    if (i < 0 || i >= plan.length) return;
    audio.play("pickup", { gain: 0.4 });
    const next = plan.filter((_, k) => k !== i);
    set({ plan: next });
    setSay(next.length ? `Plan: ${next.map((x) => DIR_WORD[x]).join(", ")}.` : "The plan is empty.");
  };

  // ---------- key ----------
  const chooseFeature = (f: Feature) => {
    if (m.mode !== "key" || !canAct || st.eliminated.includes(f)) return;
    busy?.();
    audio.play("tap", { gain: 0.5 });
    act({ type: "SUBMIT", value: f });
  };
  const choose = (id: string) => {
    if (!canAct || st.eliminated.includes(id)) return;
    if (m.mode === "key") return chooseFeature(id as Feature);
    if (m.mode !== "grid") return;
    busy?.();
    audio.play("tap", { gain: 0.5 });
    act({ type: "SUBMIT", value: id });
  };

  // register the tray's actions (latest closures)
  const apiRef = useRef({ press, removeAt, walkPlan, choose });
  apiRef.current = { press, removeAt, walkPlan, choose };
  useEffect(() => {
    pcStore.setApi({
      press: (d) => apiRef.current.press(d),
      removeAt: (i) => apiRef.current.removeAt(i),
      walk: () => void apiRef.current.walkPlan(pcStore.get().plan),
      pick: () => {},
      drop: () => {},
      choose: (id) => apiRef.current.choose(id),
    });
    return () => pcStore.setApi(null);
  }, []);

  // after a miss: Yonder hops home, the plan clears, the compass rose glows; the model shows ghost cards
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    home();
    if (steering) set({ plan: [], roseGlow: true });
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (solved) setWalker((x) => ({ ...x, pose: "happy" }));
  }, [solved]);

  // keyboard: arrow keys = compass moves, Backspace takes the last move out, Enter on the map is a normal button press
  useEffect(() => {
    if (!steering) return;
    const onKey = (e: KeyboardEvent) => {
      const d = DIR_KEY[e.key];
      if (d && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        apiRef.current.press(d);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        apiRef.current.removeAt(pcStore.get().plan.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steering]);

  // ---------- layout ----------
  const [rootRef, root] = useSize<HTMLDivElement>();
  const wide = root.w > root.h * 1.2;
  const keyBox = wide ? { w: Math.min(220, root.w * 0.3), h: 0 } : { w: 0, h: 104 };
  const head = 26;
  const tile = Math.max(34, Math.min(96, Math.floor(Math.min((root.w - keyBox.w - head - 24) / COLS, (root.h - keyBox.h - head - 16) / ROWS))));

  const modelPath = useMemo(() => walk(m.start, m.moves).cells.slice(1), [m]);
  const showFeet = model ? (alongIndex >= 0 ? alongIndex + 1 : modelPath.length) : 0;
  const footAt = new Map<number, number>();
  trail.forEach((c, i) => footAt.set(c, i + 1));
  const modelAt = new Map<number, number>();
  modelPath.slice(0, showFeet).forEach((c, i) => modelAt.set(c, i + 1));
  const at = new Map<number, Feature>();
  for (const f of FEATURES) if (m.features[f] !== undefined) at.set(m.features[f]!, f);
  const [wr, wc] = rc(walker.cell);
  const [tr, tc] = rc(m.target);
  const cross = m.mode === "grid" && st.hintStage >= 1;
  const showCard = steering && (m.marked || collected || solved);
  const keyGlow = m.mode === "key" && st.hintStage >= 1 ? m.targetFeature : null;
  const done = (progress?.done ?? 0) + (solved ? 1 : 0);

  return (
    <div
      ref={rootRef}
      className={`pc-stage is-island mode-${m.mode} ${wide ? "is-wide" : "is-tall"} ${reducedMotion ? "still" : ""} ${solved ? "is-solved" : ""} ${model ? "is-model" : ""}`}
      data-testid="pc-board" data-mode={m.mode} data-yonder={walker.cell} data-running={sh.running ? "true" : "false"}
      style={{ "--tile": `${tile}px` } as React.CSSProperties}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <Album n={done} />
      <div className="pc-island-wrap">
        <div className="pc-island">
          <div className="pc-colhead" aria-hidden="true">{COL_LETTERS.map((l, c) => <span key={l} className={cross && c === tc ? "is-hl" : ""}>{l}</span>)}</div>
          <div className="pc-rowhead" aria-hidden="true">{Array.from({ length: ROWS }, (_, r) => <span key={r} className={cross && r === tr ? "is-hl" : ""}>{r + 1}</span>)}</div>
          <div className="pc-grid" role={m.mode === "key" ? "group" : "img"} aria-label={m.mode === "key" ? "Island map: choose a square" : `Island map. Yonder is at ${refOf(walker.cell)}.`}>
            <IslandGround />
            {cross && <><span className="pc-cross-col" style={{ left: tc * tile }} /><span className="pc-cross-row" style={{ top: tr * tile }} /></>}
            {Array.from({ length: COLS * ROWS }, (_, cell) => {
              const f = at.get(cell);
              const [r, c] = rc(cell);
              const style = { left: c * tile, top: r * tile } as React.CSSProperties;
              const feet = modelAt.get(cell) ?? footAt.get(cell);
              const inner = (
                <>
                  {f && <span className="pc-tile-sym"><FeatureSymbol f={f} /></span>}
                  {feet !== undefined && <span className={`pc-foot ${modelAt.has(cell) ? "is-model" : ""}`} data-testid={modelAt.has(cell) ? "pc-model-step" : undefined} aria-hidden="true">{feet}</span>}
                </>
              );
              if (m.mode === "key" && f) {
                const out = st.eliminated.includes(f);
                const isModel = st.model === f;
                const wrong = st.lastAnswer === f && !solved && !out;
                return (
                  <button
                    key={cell} type="button" style={style}
                    className={`pc-tile is-feature ${out ? "is-out" : ""} ${isModel ? "is-model" : ""} ${wrong ? "is-wrong" : ""} ${solved && f === m.targetFeature ? "is-right" : ""}`}
                    data-testid="choice" data-value={f} data-cell={cell}
                    aria-label={`Square ${refOf(cell)}: ${FEATURE_NAME[f]} symbol. Press to choose it`}
                    aria-disabled={!canAct || out}
                    onClick={() => chooseFeature(f)}
                  >{inner}</button>
                );
              }
              return (
                <span key={cell} style={style} className={`pc-tile ${f ? "is-feature" : ""} ${cross && cell === m.target ? "is-ring" : ""}`} data-cell={cell} data-feature={f ?? undefined}>
                  {inner}
                </span>
              );
            })}
            {showCard && (
              <span className={`pc-island-card ${collected || solved ? "is-collected" : ""}`} data-testid="pc-island-card" style={{ left: tc * tile, top: tr * tile }} aria-hidden="true">
                <Postcard placeId="" />
              </span>
            )}
            <span className={`pc-walker pose-${walker.pose} face-${walker.face}`} data-testid="pc-yonder" style={{ transform: `translate(${wc * tile}px, ${wr * tile}px)` }} aria-hidden="true">
              <span className="pc-walker-body">
                <Yonder state={walker.pose === "happy" ? "celebrating" : walker.pose === "sit" || walker.pose === "bump" ? "retry" : walker.pose === "walk" ? "encouraging" : "idle"} size={Math.round(tile * 0.95)} />
              </span>
            </span>
          </div>
        </div>
        <div className="pc-key" role="list" aria-label="Map key" data-testid="pc-key" data-pc-next={m.mode === "key" && canAct ? "true" : undefined}>
          <span className="pc-key-title" aria-hidden="true">Key</span>
          {FEATURES.filter((f) => m.features[f] !== undefined).map((f) => (
            <button
              key={f} type="button" role="listitem" className={`pc-key-item ${keyGlow === f ? "is-glow" : ""}`} data-testid="pc-key-item" data-value={f}
              aria-label={`Key: this symbol means ${FEATURE_NAME[f]}. Press to hear it`}
              onClick={() => void audio.speak(`pc.sym.${f}`)}
            >
              <span className="pc-key-sym"><FeatureSymbol f={f} /></span>
              <span className="pc-key-word">{cap(FEATURE_NAME[f])}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite" data-testid="pc-say">{say}</p>
    </div>
  );
}

// ================================================================ world

const SINGLE: Record<string, string> = { continent: "postcard", ocean: "boat" };
const regionsFor = (m: WorldMission): "continents" | "oceans" | "none" =>
  m.mode === "continent" || m.mode === "cards" ? "continents" : m.mode === "ocean" || m.mode === "side" ? "oceans" : "none";
/** The half of the map (as a rectangle in map units) that holds a point: the first-miss "look over here" glow. */
function quadrant(ll: LonLat): [number, number, number, number] {
  const [x, y] = project(ll);
  return [x < MAP_W / 2 ? 0 : MAP_W / 2, y < MAP_H / 2 ? 0 : MAP_H / 2, MAP_W / 2, MAP_H / 2];
}
const toPct = (ll: LonLat) => {
  const [x, y] = project(ll);
  return { x: ((x + 4) / (MAP_W + 8)) * 100, y: ((y + 4) / (MAP_H + 8)) * 100 };
};
const pinsFor = (kind: "continents" | "oceans"): { id: RegionId; at: LonLat; key: string }[] =>
  kind === "continents"
    ? CONTINENTS.map((c) => ({ id: c, at: ANCHOR[c], key: c }))
    : [...OCEANS.map((o) => ({ id: o as RegionId, at: ANCHOR[o], key: o })), { id: "pacific", at: PACIFIC_WEST, key: "pacific-w" }];

/** Where a picked-up item is dropped: a map place, a trip slot, land (boats), or nothing. */
function dropAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as Element | null;
  const t = el?.closest<HTMLElement | SVGElement>("[data-drop],[data-region]");
  return (t?.getAttribute("data-drop") ?? t?.getAttribute("data-region")) || null;
}

function WorldBoard({ st, act, busy, progress, m }: BoardProps & { m: WorldMission }) {
  const ex = st.exercise;
  const sh = usePc(ex);
  const { reducedMotion } = useApp();
  const canAct = st.phase === "answering" && !sh.running;
  const solved = isSolved(st);
  const model = st.hintStage >= 2;
  const kind = regionsFor(m);
  const set = (p: Parameters<typeof pcStore.set>[1]) => pcStore.set(ex.id, p);
  const [say, setSay] = useState("");
  const [posted, setPosted] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [hop, setHop] = useState<Dir | null>(null);
  const [flown, setFlown] = useState(0);
  const answer = ex.answer;

  // ---------- placing ----------
  const items: readonly AnswerOption[] = answer.kind === "match" ? answer.items : answer.kind === "sequence" ? answer.pieces : [];
  const modelPairs = answer.kind === "match" && model ? answer.pairs : null;
  const modelOrder = answer.kind === "sequence" && model ? answer.order : null;

  const submitPlaced = (placed: Record<string, string>) => {
    if (m.mode === "cards" && items.every((it) => placed[it.id])) {
      window.setTimeout(() => act({ type: "SUBMIT", value: placed }), 260);
    }
    if (m.mode === "trip" && [0, 1, 2].every((i) => placed[String(i)])) {
      window.setTimeout(() => act({ type: "SUBMIT", value: [0, 1, 2].map((i) => placed[String(i)]!) }), 260);
    }
  };

  const drop = (target: string, card?: string) => {
    if (!canAct) return;
    const held = card ?? pcStore.get().held;
    if (target === "land") {
      void audio.speak("pc.help.land");
      set({ held: null });
      return;
    }
    if (m.mode === "continent" || m.mode === "ocean" || m.mode === "side") {
      if (!isRegionOk(target)) return;
      if (st.eliminated.includes(target) || (model && target !== st.model)) {
        audio.play("tap", { gain: 0.3, rate: 0.8 });
        return;
      }
      busy?.();
      audio.play("drop", { gain: 0.55 });
      setPosted(target);
      set({ held: null });
      setSay(`${m.mode === "continent" ? "Postcard" : "Boat"} on ${regionName(target as RegionId)}.`);
      window.setTimeout(() => act({ type: "SUBMIT", value: target }), 240);
      return;
    }
    if (m.mode === "cards") {
      if (!isRegionOk(target)) return;
      let c = held;
      if (modelPairs) c = items.find((it) => !pcStore.get().placed[it.id] && modelPairs[it.id] === target)?.id ?? null;
      if (!c) return;
      busy?.();
      audio.play("drop", { gain: 0.55 });
      const placed = { ...pcStore.get().placed, [c]: target };
      set({ placed, held: null });
      setSay(`${items.find((it) => it.id === c)?.text} posted to ${regionName(target as RegionId)}.`);
      submitPlaced(placed);
      return;
    }
    if (m.mode === "trip" && target.startsWith("slot-")) {
      const slot = target.slice(5);
      const cur = { ...pcStore.get().placed };
      let c = held;
      if (modelOrder) c = cur[slot] ? null : modelOrder[Number(slot)] ?? null;
      if (!c) {
        // tapping a filled slot with nothing in hand takes that card back
        if (cur[slot] && !modelOrder) {
          delete cur[slot];
          audio.play("pickup", { gain: 0.4 });
          set({ placed: cur });
        }
        return;
      }
      for (const k of Object.keys(cur)) if (cur[k] === c) delete cur[k];
      cur[slot] = c;
      busy?.();
      audio.play("drop", { gain: 0.55 });
      set({ placed: cur, held: null });
      setSay(`Stop ${Number(slot) + 1}: ${items.find((it) => it.id === c)?.text}.`);
      submitPlaced(cur);
    }
  };
  const isRegionOk = (r: string) => (kind === "continents" ? (CONTINENTS as readonly string[]).includes(r) : kind === "oceans" ? isOcean(r) : false);

  const pick = (id: string | null) => {
    if (!canAct) return;
    if (id && pcStore.get().held === id) return set({ held: null });
    busy?.();
    if (id) audio.play("pickup", { gain: 0.45 });
    set({ held: id });
    if (!id) return;
    if (m.mode === "cards") {
      const it = items.find((x) => x.id === id);
      if (it?.say) void audio.speak(it.say);
    } else if (m.mode === "trip") {
      void audio.speak(`pc.cont.${id.slice(2)}`);
    } else if (m.mode === "continent") void audio.speak(`pc.card.${m.place!.id}`);
    setSay(`Picked up ${m.mode === "ocean" ? "the boat" : "a postcard"}. Now choose a place.`);
  };
  const choose = (id: string) => {
    if (!canAct || st.eliminated.includes(id)) return;
    if (model && st.model !== id) return;
    busy?.();
    audio.play("tap", { gain: 0.5 });
    if (m.mode === "fly" && id !== m.flight!.dir) {
      setHop(id as Dir);
      window.setTimeout(() => setHop(null), reducedMotion ? 300 : 900);
    }
    act({ type: "SUBMIT", value: id });
  };
  const tapRegion = (r: string) => {
    if (m.mode === "side") return drop(r);
    const held = pcStore.get().held;
    if (m.mode === "continent" || m.mode === "ocean") return drop(r, held ?? SINGLE[m.mode]);
    if (m.mode === "cards") return drop(r);
  };

  const apiRef = useRef({ drop, pick, choose });
  apiRef.current = { drop, pick, choose };
  useEffect(() => {
    pcStore.setApi({
      press: (d) => apiRef.current.choose(d),
      removeAt: () => {},
      walk: () => {},
      pick: (id) => apiRef.current.pick(id),
      drop: (t, c) => apiRef.current.drop(t, c),
      choose: (id) => apiRef.current.choose(id),
    });
    return () => pcStore.setApi(null);
  }, []);

  // after a miss: wrong cards come back to the tray (right ones stay), a single card comes home
  const fbSeq = st.feedback?.seq;
  useEffect(() => {
    if (st.phase !== "feedback" || st.feedback?.correct) return;
    const parts = st.check?.parts ?? {};
    const t = window.setTimeout(() => {
      setPosted(null);
      if (m.mode === "cards") {
        const keep = Object.fromEntries(Object.entries(pcStore.get().placed).filter(([k]) => parts[k]));
        set({ placed: keep, held: null });
      } else if (m.mode === "trip") {
        const keep = Object.fromEntries(Object.entries(pcStore.get().placed).filter(([k]) => parts[k]));
        set({ placed: keep, held: null });
      }
    }, reducedMotion ? 200 : 650);
    return () => window.clearTimeout(t);
  }, [fbSeq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (st.hintStage >= 1 && (m.mode === "fly" || m.mode === "side")) set({ roseGlow: true });
  }, [st.hintStage]); // eslint-disable-line react-hooks/exhaustive-deps

  // success: the balloon flies its route (trip: leg by leg)
  useEffect(() => {
    if (!solved) return;
    if (m.mode === "trip") {
      let i = 0;
      const id = window.setInterval(() => {
        i++;
        setFlown(i);
        if (i >= m.legs.length) window.clearInterval(id);
      }, reducedMotion ? 60 : 700);
      return () => window.clearInterval(id);
    }
    setFlown(1);
  }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape puts a held card down
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pcStore.get().held) set({ held: null });
      if (m.mode === "fly" && DIR_KEY[e.key] && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        apiRef.current.choose(DIR_KEY[e.key]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- layout ----------
  const [areaRef, area] = useSize<HTMLDivElement>();
  const ratio = (MAP_W + 8) / (MAP_H + 8);
  const mapW = Math.max(200, Math.floor(Math.min(area.w, area.h * ratio)));
  const mapH = Math.floor(mapW / ratio);
  const pinPx = Math.max(44, Math.min(64, Math.round(mapW / 13)));

  const correctRegion = answer.kind === "choice" && kind !== "none" ? answer.correct : null;
  const glowArea = st.hintStage === 1 && !solved
    ? m.mode === "continent" ? quadrant(ANCHOR[m.place!.continent]) : m.mode === "ocean" ? quadrant(ANCHOR[m.ocean!]) : m.mode === "side" ? quadrant(m.side!.boat) : null
    : null;
  const dim = kind !== "none" ? st.eliminated.map(String) : [];
  const glow = model && correctRegion ? [correctRegion] : modelPairs ? items.filter((it) => !sh.placed[it.id]).map((it) => modelPairs[it.id]!) : [];
  const held = sh.held;
  const pins = kind === "none" ? [] : pinsFor(kind);
  const labels = solved || m.mode === "trip";

  // balloon / boat position
  const traveller = ((): { at: LonLat; what: "balloon" | "boat" } | null => {
    if (m.mode === "fly") return { at: flown ? m.flight!.b : m.flight!.a, what: "balloon" };
    if (m.mode === "side") {
      const a = ANCHOR[m.side!.continent];
      const b = m.side!.boat;
      return { at: flown ? b : [(a[0] + b[0] * 2) / 3, (a[1] + b[1] * 2) / 3], what: "boat" };
    }
    if (m.mode === "trip") {
      const route = [m.start!, ...m.stops];
      const legIdx = Math.min(flown, m.legs.length);
      return { at: legIdx === 0 ? ANCHOR[m.start!] : flightFrom(route[legIdx - 1]!, m.legs[legIdx - 1]!)!.b, what: "balloon" };
    }
    return null;
  })();
  const routes = ((): [LonLat, LonLat][] => {
    if (m.mode === "fly" && flown) return [[m.flight!.a, m.flight!.b]];
    if (m.mode === "trip") {
      const route = [m.start!, ...m.stops];
      return m.legs.slice(0, flown).map((d, i) => {
        const f = flightFrom(route[i]!, d)!;
        return [f.a, f.b] as [LonLat, LonLat];
      });
    }
    return [];
  })();
  const done = (progress?.done ?? 0) + (solved ? 1 : 0);
  const showEquator = m.mode === "hemi" || m.mode === "season";
  const px = (ll: LonLat) => {
    const p = toPct(ll);
    return { left: `${p.x}%`, top: `${p.y}%` };
  };

  return (
    <div
      className={`pc-stage is-world mode-${m.mode} ${reducedMotion ? "still" : ""} ${solved ? "is-solved" : ""} ${model ? "is-model" : ""} ${held ? "is-holding" : ""}`}
      data-testid="pc-board" data-mode={m.mode} data-flown={flown} data-running={sh.running ? "true" : "false"}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <Album n={done} />
      <div className="pc-map-area" ref={areaRef}>
        <div className="pc-map" style={{ width: mapW, height: mapH, "--pin": `${pinPx}px` } as React.CSSProperties} data-testid="pc-map">
          <WorldMap active={kind} equator={showEquator} dim={dim} glow={glow} area={glowArea} hot={hot} onRegion={tapRegion} />
          {routes.length > 0 && (
            <svg className="pc-routes" viewBox={`-4 -4 ${MAP_W + 8} ${MAP_H + 8}`} aria-hidden="true">
              {routes.map(([a, b], i) => {
                const [x1, y1] = project(a);
                const [x2, y2] = project(b);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="pc-route" />;
              })}
            </svg>
          )}
          {showEquator && (
            <>
              <span className="pc-eq-label" style={px([-178, 0])} aria-hidden="true">Equator</span>
              {st.hintStage >= 1 && <><span className="pc-hemi-label is-n" style={px([-150, 22])} aria-hidden="true">North</span><span className="pc-hemi-label is-s" style={px([-150, -22])} aria-hidden="true">South</span></>}
            </>
          )}
          {(m.mode === "hemi" || m.mode === "season") && (
            <span className="pc-place-pin" style={px(m.place!.at)} data-testid="pc-place-pin" aria-hidden="true"><PinIcon /></span>
          )}
          {m.mode === "fly" && (
            <span className="pc-dest" style={px(m.flight!.b)} data-testid="pc-dest" aria-hidden="true"><Postcard placeId="" /></span>
          )}
          {m.mode === "trip" && (
            <span className="pc-start-flag" style={px(ANCHOR[m.start!])} aria-hidden="true">Start</span>
          )}
          {/* places on the map: one button per continent / ocean (the list of regions for keyboard and screen readers) */}
          {pins.length > 0 && (
            <div className="pc-pins" role="list" aria-label={kind === "continents" ? "Continents on the map" : "Oceans on the map"}>
              {pins.map((p) => {
                const out = dim.includes(p.id);
                const isModel = glow.includes(p.id);
                const right = solved && (correctRegion === p.id || (m.mode === "cards" && Object.values(sh.placed).includes(p.id)));
                return (
                  <button
                    key={p.key} type="button" role="listitem"
                    className={`pc-pin ${isOcean(p.id) ? "is-ocean" : "is-land"} ${out ? "is-out" : ""} ${isModel ? "is-model" : ""} ${right ? "is-right" : ""} ${hot === p.id ? "is-hot" : ""}`}
                    style={px(p.at)} data-testid="pc-region" data-value={p.id} data-region={p.id}
                    aria-label={`${regionName(p.id)}${held || m.mode === "side" || m.mode === "continent" || m.mode === "ocean" ? `. ${m.mode === "side" ? "Choose this ocean" : m.mode === "ocean" ? "Sail the boat here" : "Post the card here"}` : ""}`}
                    aria-disabled={!canAct || out}
                    onClick={() => tapRegion(p.id)}
                  >
                    <span className="pc-pin-dot" aria-hidden="true" />
                    {labels && <span className="pc-pin-label" aria-hidden="true">{regionName(p.id)}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {/* postcards / boat posted on the map */}
          {posted && (m.mode === "continent" || m.mode === "ocean") && (
            <span className={`pc-posted ${solved ? "is-right" : ""}`} style={px(posted === "pacific" && m.mode === "ocean" ? ANCHOR.pacific : ANCHOR[posted as RegionId])} data-testid="pc-posted" aria-hidden="true">
              {m.mode === "ocean" ? <Boat small /> : <Postcard placeId={m.place!.id} />}
            </span>
          )}
          {m.mode === "cards" && items.map((it, i) => {
            const r = sh.placed[it.id];
            if (!r) return null;
            const ok = solved || st.check?.parts?.[it.id];
            return (
              <span key={it.id} className={`pc-posted ${ok ? "is-right" : ""}`} style={{ ...px(ANCHOR[r as RegionId]), "--nudge": `${(i - 1) * 14}px` } as React.CSSProperties} data-testid="pc-posted" aria-hidden="true">
                <Postcard placeId={it.art!.slice(3)} />
              </span>
            );
          })}
          {modelPairs && items.filter((it) => !sh.placed[it.id]).map((it) => (
            <button key={it.id} type="button" className="pc-ghost-card" style={px(ANCHOR[modelPairs[it.id] as RegionId])} data-testid="pc-ghost" aria-label={`${it.text}: it goes to ${regionName(modelPairs[it.id] as RegionId)}. Press to post it`} onClick={() => drop(modelPairs[it.id]!)}>
              <Postcard placeId={it.art!.slice(3)} />
            </button>
          ))}
          {model && correctRegion && (m.mode === "continent" || m.mode === "ocean") && (
            <button type="button" className="pc-ghost-card" style={px(ANCHOR[correctRegion as RegionId])} data-testid="pc-ghost" aria-label={`It goes to ${regionName(correctRegion as RegionId)}. Press to put it there`} onClick={() => drop(correctRegion, SINGLE[m.mode])}>
              {m.mode === "ocean" ? <Boat small /> : <Postcard placeId={m.place!.id} />}
            </button>
          )}
          {traveller && (
            <span className={`pc-traveller is-${traveller.what} ${hop ? `hop-${hop}` : ""}`} style={px(traveller.at)} data-testid="pc-traveller" aria-hidden="true">
              {traveller.what === "balloon" ? <Balloon /> : <Boat small />}
            </span>
          )}
        </div>
      </div>
      {m.mode === "trip" && <TripStops m={m} st={st} held={held} placed={sh.placed} items={items} model={modelOrder} onSlot={(i) => drop(`slot-${i}`)} canAct={canAct} />}
      <DragLayer onHot={setHot} />
      <p className="sr-only" aria-live="polite" data-testid="pc-say">{say}</p>
    </div>
  );
}

function TripStops({ m, st, held, placed, items, model, onSlot, canAct }: {
  m: WorldMission; st: BoardProps["st"]; held: string | null; placed: Record<string, string>; items: readonly AnswerOption[]; model: readonly string[] | null;
  onSlot: (i: number) => void; canAct: boolean;
}) {
  const solved = isSolved(st);
  return (
    <ol className="pc-stops" aria-label="Trip stops" data-testid="pc-stops">
      <li className="pc-stop-start"><span className="pc-stop-from">{CONTINENT_NAME[m.start!]}</span></li>
      {m.legs.map((d, i) => {
        const c = placed[String(i)];
        const it = items.find((x) => x.id === c);
        const ghost = !c && model ? items.find((x) => x.id === model[i]) : null;
        const ok = st.check?.parts?.[String(i)] === true;
        return (
          <li key={i} className="pc-leg">
            <button type="button" className="pc-leg-arrow" data-testid="pc-leg" data-dir={d} aria-label={`${i === 0 ? "First" : "Then"} fly ${DIR_WORD[d]}. Press to hear it`} onClick={() => void audio.speak(i === 0 ? "pc.leg.first" : "pc.leg.then", { dir: DIR_WORD[d] })}>
              <span className={`pc-arrow dir-${d}`} aria-hidden="true">➜</span>
              <b>{DIR_LETTER[d]}</b>
            </button>
            <button
              type="button"
              className={`pc-slot ${c ? "is-filled" : ""} ${ghost ? "has-ghost" : ""} ${solved || (ok && c) ? "is-right" : ""} ${held ? "is-target" : ""}`}
              data-testid="pc-slot" data-slot={i} data-drop={`slot-${i}`} data-card={c ?? ""}
              aria-label={`Stop ${i + 1}: ${it ? it.text : ghost ? `empty. Glowing card: ${ghost.text}. Press to put it here` : held ? "empty. Press to put the card here" : "empty"}`}
              aria-disabled={!canAct}
              onClick={() => onSlot(i)}
            >
              {it ? <><Postcard placeId={it.art!.slice(3)} /><span className="pc-slot-name">{it.text}</span></> : ghost ? <span className="pc-slot-ghost"><Postcard placeId={ghost.art!.slice(3)} /><span className="pc-slot-name">{ghost.text}</span></span> : <span className="pc-slot-n">{i + 1}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ================================================================ drag (tray → map)

interface Drag { id: string; art: React.ReactNode; sx: number; sy: number; x: number; y: number; active: boolean }
let dragState: Drag | null = null;
const dragListeners = new Set<(d: Drag | null) => void>();
const setDrag = (d: Drag | null) => {
  dragState = d;
  for (const l of dragListeners) l(d);
};
let suppressUntil = 0;
const isTap = (e: React.MouseEvent) => e.timeStamp >= suppressUntil;

/** The floating card that follows the pointer; mounted by the board, fed by the tray. */
function DragLayer({ onHot }: { onHot: (r: string | null) => void }) {
  const [d, setD] = useState<Drag | null>(dragState);
  useEffect(() => {
    dragListeners.add(setD);
    return () => {
      dragListeners.delete(setD);
    };
  }, []);
  useEffect(() => {
    onHot(d?.active ? dropAt(d.x, d.y) : null);
  }, [d?.x, d?.y, d?.active]); // eslint-disable-line react-hooks/exhaustive-deps
  return d?.active ? createPortal(<div className="pc-drag-ghost" style={{ left: d.x, top: d.y }} aria-hidden="true">{d.art}</div>, document.body) : null;
}

function startDrag(e: React.PointerEvent, id: string, art: React.ReactNode) {
  if (e.button !== 0) return;
  setDrag({ id, art, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, active: false });
  const move = (ev: PointerEvent) => {
    const d = dragState;
    if (!d) return;
    const active = d.active || Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 10;
    if (active && !d.active) audio.play("pickup", { gain: 0.4 });
    setDrag({ ...d, x: ev.clientX, y: ev.clientY, active });
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    const d = dragState;
    setDrag(null);
    if (!d?.active) return;
    suppressUntil = ev.timeStamp + 80;
    if (ev.type !== "pointerup") return;
    const t = dropAt(ev.clientX, ev.clientY);
    if (t) pcStore.api()?.drop(t, d.id);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

// ================================================================ tray

export function PostcardTray({ st }: BoardProps) {
  const ex = st.exercise;
  const m = useMemo(() => decodeMission(ex), [ex]);
  const sh = usePc(ex);
  if (m.kind === "island") {
    if (m.mode === "step" || m.mode === "route") return <CompassPad m={m} st={st} sh={sh} />;
    if (m.mode === "grid") return <OptionButtons st={st} sh={sh} className="pc-refs" />;
    return <RosePanel glow={false} />;
  }
  switch (m.mode) {
    case "fly":
      return <CompassPad m={m} st={st} sh={sh} />;
    case "hemi":
    case "season":
      return <OptionButtons st={st} sh={sh} className="pc-answers" />;
    case "side":
      return <RosePanel glow={sh.roseGlow} />;
    default:
      return <CardTray m={m} st={st} sh={sh} />;
  }
}

function RosePanel({ glow }: { glow: boolean }) {
  return (
    <div className="pc-tray pc-rose-panel" data-testid="pc-rose" data-pc-next="true">
      <CompassRose glow={glow} />
      <span className="pc-rose-n" aria-hidden="true">N</span>
    </div>
  );
}

const PAD: { d: Dir; cls: string }[] = [{ d: "n", cls: "at-n" }, { d: "w", cls: "at-w" }, { d: "e", cls: "at-e" }, { d: "s", cls: "at-s" }];

function CompassPad({ m, st, sh }: { m: Mission; st: BoardProps["st"]; sh: ReturnType<typeof usePc> }) {
  const island = m.kind === "island";
  const slots = island ? m.moves.length : 0;
  const canAct = st.phase === "answering" && !sh.running;
  const solved = isSolved(st);
  const model = st.hintStage >= 2;
  const nextModel: Dir | null = island ? (model ? m.moves[sh.plan.length] ?? null : null) : model ? (st.model as Dir) : null;
  const full = island && sh.plan.length >= slots;
  return (
    <div className={`pc-tray pc-pad-wrap ${island ? "is-island" : "is-world"}`} data-testid="pc-pad">
      <div className="pc-pad" data-pc-next={!island && canAct ? "true" : undefined}>
        <span className="pc-pad-rose"><CompassRose glow={sh.roseGlow && !solved} /></span>
        {PAD.map(({ d, cls }) => {
          const out = island ? (model && nextModel !== d) || (full && !solved) : st.eliminated.includes(d) || (model && nextModel !== d);
          const wrong = !island && st.lastAnswer === d && !solved && !st.eliminated.includes(d);
          return (
            <button
              key={d} type="button"
              className={`pc-dir ${cls} ${out ? "is-out" : ""} ${nextModel === d && canAct ? "is-model" : ""} ${wrong ? "is-wrong" : ""} ${solved && !island && st.lastAnswer === d ? "is-right" : ""}`}
              data-testid="choice" data-value={d}
              aria-label={island ? `${cap(DIR_WORD[d])}: plan one step ${DIR_WORD[d]}` : `Fly ${DIR_WORD[d]}`}
              aria-disabled={!canAct || out}
              onClick={() => canAct && !out && pcStore.api()?.press(d)}
            >
              <span className="pc-dir-letter">{DIR_LETTER[d]}</span>
              <span className="pc-dir-word">{cap(DIR_WORD[d])}</span>
            </button>
          );
        })}
      </div>
      {island && (
        <div className="pc-plan-row">
          <div className="pc-plan" role="list" aria-label={`Plan: ${slots} ${slots === 1 ? "step" : "steps"}`} data-testid="pc-plan" data-pc-next={!full && canAct ? "true" : undefined}>
            {Array.from({ length: slots }, (_, i) => {
              const d = sh.plan[i];
              const ghost = !d && model ? m.moves[i] : undefined;
              return (
                <button
                  key={i} type="button" role="listitem"
                  className={`pc-plan-slot ${d ? "is-filled" : ""} ${ghost ? "has-ghost" : ""} ${solved && d ? "is-right" : ""}`}
                  data-testid="pc-plan-slot" data-slot={i} data-dir={d ?? ""}
                  aria-label={`Step ${i + 1} of ${slots}: ${d ? `${DIR_WORD[d]}. Press to take it out` : ghost ? `empty. Glowing: ${DIR_WORD[ghost]}` : "empty"}`}
                  aria-disabled={!canAct || !d}
                  onClick={() => d && pcStore.api()?.removeAt(i)}
                >
                  {d ? <span className={`pc-arrow dir-${d}`} aria-hidden="true">➜</span> : ghost ? <span className={`pc-arrow dir-${ghost} is-ghost`} aria-hidden="true">➜</span> : <span className="pc-plan-n" aria-hidden="true">{i + 1}</span>}
                </button>
              );
            })}
          </div>
          {slots > 1 && (
            <button
              type="button" className={`pc-walk ${full && canAct ? "is-ready" : ""} ${solved ? "is-right" : ""}`}
              data-testid="done" data-pc-next={full && canAct ? "true" : undefined}
              aria-label="Walk! Yonder follows the plan" aria-disabled={!canAct || !full}
              onClick={() => canAct && full && pcStore.api()?.walk()}
            >
              Walk
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OptionButtons({ st, sh, className }: { st: BoardProps["st"]; sh: ReturnType<typeof usePc>; className: string }) {
  const answer = st.exercise.answer;
  if (answer.kind !== "choice") return null;
  const canAct = st.phase === "answering" && !sh.running;
  const solved = isSolved(st);
  return (
    <div className={`pc-tray ${className}`} role="group" aria-label="Answers" data-pc-next={canAct ? "true" : undefined}>
      {answer.options.map((o) => {
        const out = st.eliminated.includes(o.id);
        const isModel = st.model === o.id;
        const wrong = st.lastAnswer === o.id && !solved && !out;
        return (
          <button
            key={o.id} type="button"
            className={`pc-answer ${out ? "is-out" : ""} ${isModel && canAct ? "is-model" : ""} ${wrong ? "is-wrong" : ""} ${solved && o.id === answer.correct ? "is-right" : ""}`}
            data-testid="choice" data-value={o.id}
            aria-label={`${o.text}. Press to choose it`} aria-disabled={!canAct || out}
            onClick={() => {
              if (!canAct || out) return;
              if (o.say) void audio.speak(o.say);
              pcStore.api()?.choose(o.id);
            }}
          >
            <AnswerIcon id={o.id} />
            <span>{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}
function AnswerIcon({ id }: { id: string }) {
  if (id === "north" || id === "south") return <span className={`pc-answer-icon is-${id}`} aria-hidden="true">{id === "north" ? "▲" : "▼"}</span>;
  if (id === "summer") return <svg className="pc-answer-icon" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="8" fill="#FFD43B" stroke="#2B2140" strokeWidth="3" /><path d="M20 3v6M20 31v6M3 20h6M31 20h6M8 8l4 4M28 28l4 4M8 32l4-4M28 12l4-4" stroke="#F2B200" strokeWidth="3" strokeLinecap="round" /></svg>;
  if (id === "winter") return <svg className="pc-answer-icon" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4v32M6 12l28 16M6 28l28-16M16 6l4 4 4-4M16 34l4-4 4 4" stroke="#4FA3E3" strokeWidth="3.5" strokeLinecap="round" fill="none" /></svg>;
  return null;
}

function CardTray({ m, st, sh }: { m: WorldMission; st: BoardProps["st"]; sh: ReturnType<typeof usePc> }) {
  const answer = st.exercise.answer;
  const canAct = st.phase === "answering" && !sh.running;
  const solved = isSolved(st);
  const cards: { id: string; label: string; art: React.ReactNode; aria: string }[] =
    m.mode === "continent"
      ? [{ id: "postcard", label: m.place!.name === "a science station" ? "Antarctica" : cap(m.place!.name), art: <Postcard placeId={m.place!.id} />, aria: `Postcard from ${m.place!.id === "antarctica" ? "Antarctica" : m.place!.name}, showing ${m.place!.shows}` }]
      : m.mode === "ocean"
        ? [{ id: "boat", label: "Boat", art: <Boat />, aria: `Yonder's boat, going to the ${m.ocean ? regionName(m.ocean) : ""}` }]
        : (answer.kind === "match" ? answer.items : answer.kind === "sequence" ? answer.pieces : []).map((it) => ({
            id: it.id, label: it.text ?? "", art: <Postcard placeId={it.art!.slice(3)} />, aria: it.text ?? "",
          }));
  const placedIds = new Set(Object.values(sh.placed).concat(m.mode === "cards" ? Object.keys(sh.placed) : []));
  return (
    <div className={`pc-tray pc-cards n-${cards.length}`} role="group" aria-label={m.mode === "ocean" ? "The boat" : "Postcards"} data-testid="pc-cards">
      {cards.map((c) => {
        const gone = placedIds.has(c.id) || (solved && (m.mode === "continent" || m.mode === "ocean"));
        const heldNow = sh.held === c.id;
        return (
          <button
            key={c.id} type="button"
            className={`pc-card ${heldNow ? "is-held" : ""} ${gone ? "is-gone" : ""} ${m.mode === "ocean" ? "is-boat" : ""}`}
            data-testid="pc-card" data-value={c.id} data-pc-next={!gone && canAct && !sh.held ? "true" : undefined}
            aria-label={`${c.aria}. ${heldNow ? "Picked up: now choose a place" : "Press to pick it up, or drag it to the map"}`}
            aria-pressed={heldNow}
            aria-disabled={!canAct || gone}
            onPointerDown={(e) => canAct && !gone && startDrag(e, c.id, c.art)}
            onClick={(e) => {
              if (!isTap(e) || !canAct || gone) return;
              pcStore.api()?.pick(c.id);
            }}
          >
            <span className="pc-card-art">{c.art}</span>
            <span className="pc-card-label">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** For e2e and docs: the region a continent/ocean/trip mission expects, and the moves of a steering mission. */
export const regionAnswer = (m: WorldMission): string | null =>
  m.mode === "continent" ? m.place!.continent : m.mode === "ocean" ? m.ocean : m.mode === "side" ? m.side!.ocean : null;
