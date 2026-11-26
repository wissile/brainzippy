import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { BoardProps } from "../../../game/boards";
import { metarOf } from "../generator";
import { CARD, type GroupKind, ceilingOf, fmtFeet, metarGroups, metarSpeech, modeOf, p } from "../logic";
import { ModelSteps, Options, Tab, flags, useDrag, useKeyboardFlag, useSubmit } from "./shared";

/**
 * Weather Brief (pilot.wx.metar). A practice weather report (fictional station, made-up weather) on the briefing
 * board; "Read it to me" reads it group by group the way pilots say it ("wind two seven zero at ten knots").
 *   decode  match each highlighted group to its plain-language tile: tap a group then a tile (or the other way
 *           round), drag a tile onto a group, or use Tab + Enter. Then Check.
 *   call    compare the report with Ziggy's practice card (not real legal minimums) and choose fly or wait.
 * First miss: right pairs stay (gold), the others come back. Second miss: every pair but the last is filled in and
 * the last tile glows, and the worked lines show each group's meaning.
 */
const BADGE = ["A", "B", "C", "D", "E", "F"];

export function MetarStrip({ params, items, selected, pairs, ok, onPick, hot, zone, dragProps }: {
  params: Readonly<Record<string, number>>;
  items?: readonly string[];
  selected?: string | null;
  pairs?: Record<string, string>;
  ok?: Record<string, boolean>;
  onPick?: (id: string, e: React.MouseEvent) => void;
  hot?: string | null;
  zone?: boolean;
  dragProps?: (id: string, label: string) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}) {
  const x = metarOf(params);
  const groups = metarGroups(x);
  const [saying, setSaying] = useState(false);
  const token = useRef(0);
  useEffect(() => () => {
    token.current++;
  }, []);
  const read = async () => {
    const my = ++token.current;
    setSaying(true);
    for (const [line, vars] of metarSpeech(x)) {
      if (my !== token.current) return;
      await audio.speak(line, vars);
    }
    if (my === token.current) setSaying(false);
  };
  const letter = (id: string) => BADGE[(items ?? []).indexOf(id)] ?? "";
  return (
    <div className="fp-metar">
      <div className="fp-metar-head">
        <span className="fp-metar-title">Practice weather report <em>(made up)</em></span>
        <button type="button" className={`fp-hear ${saying ? "is-saying" : ""}`} data-testid="fp-hear" aria-label="Read the weather report to me" onClick={() => void read()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" /><path d="M16 9 Q18 12 16 15 M18.5 6.5 Q22 12 18.5 17.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
      <p className="fp-metar-code" aria-label={`Weather report: ${groups.map((g) => g.text).join(" ")}`}>
        {groups.map((g, i) => {
          const id = `g-${g.kind}`;
          const isItem = items?.includes(id);
          if (!isItem || !onPick) return <span key={i} className={`fp-group ${items ? "is-dim" : ""}`} aria-hidden="true">{g.text}</span>;
          const paired = !!pairs?.[id];
          return (
            <button
              key={i}
              type="button"
              className={`fp-group is-item ${selected === id ? "is-picked" : ""} ${paired ? "is-paired" : ""} ${ok?.[id] ? "is-ok" : ""} ${hot === id ? "is-hot" : ""}`}
              data-testid="choice"
              data-value={id}
              data-fp-zone={zone ? id : undefined}
              aria-pressed={selected === id}
              aria-label={`Weather group ${g.text}${paired ? `, matched to meaning ${letter(id)}` : ""}. Pick it, then pick its meaning.`}
              onClick={(e) => onPick(id, e)}
              {...(dragProps ? dragProps(id, g.text) : {})}
            >
              <span className="fp-group-text">{g.text}</span>
              <span className="fp-badge" aria-hidden="true">{letter(id)}</span>
            </button>
          );
        })}
      </p>
    </div>
  );
}

export function WeatherBoard(props: BoardProps) {
  return modeOf(props.st.exercise) === "decode" ? <DecodeBoard {...props} /> : <CallBoard {...props} />;
}

function DecodeBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const a = ex.answer;
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const kb = useKeyboardFlag();
  const items = a.kind === "match" ? a.items.map((i) => i.id) : [];
  const targets = a.kind === "match" ? a.targets : [];
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [selTarget, setSelTarget] = useState<string | null>(null);
  const parts = st.check?.parts ?? {};
  const ok = Object.fromEntries(items.map((i) => [i, st.hintStage >= 1 && parts[i] === true && pairs[i] === (a.kind === "match" ? a.pairs[i] : "")]));
  const modelPairs = f.modelOn && st.model && typeof st.model === "object" && !Array.isArray(st.model) ? (st.model as Record<string, string>) : null;
  const lastItem = items[items.length - 1];

  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    setSelected(null);
    setSelTarget(null);
    if (modelPairs) setPairs(Object.fromEntries(Object.entries(modelPairs).filter(([k]) => k !== lastItem)));
    else setPairs((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => parts[k] === true)));
    if (kb.current) window.setTimeout(() => (document.querySelector('.fp-metar [data-testid="choice"]:not(.is-paired)') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = (item: string) => ok[item] || (modelPairs !== null && item !== lastItem);
  const assign = (item: string, target: string) => {
    if (!f.canAct || locked(item)) return;
    const owner = Object.entries(pairs).find(([, v]) => v === target)?.[0];
    if (owner && owner !== item && locked(owner)) return;
    busy?.();
    audio.play("drop", { gain: 0.45 });
    setPairs((cur) => {
      const next = { ...cur };
      for (const [k, v] of Object.entries(next)) if (v === target && !locked(k)) delete next[k];
      next[item] = target;
      return next;
    });
    setSelected(null);
    setSelTarget(null);
    if (kb.current) {
      window.setTimeout(() => {
        const nextItem = document.querySelector('.fp-metar [data-testid="choice"]:not(.is-paired)') as HTMLElement | null;
        (nextItem ?? (document.querySelector('[data-testid="done"]') as HTMLElement | null))?.focus({ preventScroll: true });
      }, 40);
    }
  };
  const drag = useDrag((id, zone) => {
    // a tile dropped on a group, or a group dropped on a tile
    if (items.includes(zone)) assign(zone, id);
    else if (items.includes(id)) assign(id, zone);
  }, f.canAct, busy);
  const pickItem = (id: string, e: React.MouseEvent) => {
    if (drag.wasDrag(e) || !f.canAct || locked(id)) return;
    if (selTarget) return assign(id, selTarget);
    audio.play("pickup", { gain: 0.3 });
    setSelected((s) => (s === id ? null : id));
    if (kb.current) window.setTimeout(() => (document.querySelector('.fp-tiles [data-testid="target"]:not(.is-used):not([aria-disabled="true"])') as HTMLElement | null)?.focus({ preventScroll: true }), 30);
  };
  const takenBy = (t: string) => Object.entries(pairs).find(([, v]) => v === t)?.[0];
  const pickTarget = (id: string, e: React.MouseEvent) => {
    if (drag.wasDrag(e) || !f.canAct) return;
    const owner = takenBy(id);
    if (owner && locked(owner)) return;
    if (selected) return assign(selected, id);
    audio.play("pickup", { gain: 0.3 });
    setSelTarget((s) => (s === id ? null : id));
  };
  const complete = items.every((i) => pairs[i]);
  const usedBy = (t: string) => Object.entries(pairs).find(([, v]) => v === t)?.[0];
  const letterOf = (item: string) => BADGE[items.indexOf(item)] ?? "";

  return (
    <div className="fp-stage game-wx mode-decode" data-testid="fp-board" data-mode="decode" data-game="wx">
      <Tab game="wx" sub="Decode the report" />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Weather report">
          <MetarStrip params={ex.params ?? {}} items={items} selected={selected} pairs={pairs} ok={ok} onPick={pickItem} hot={drag.hot} zone dragProps={drag.dragProps} />
          {f.hinted && <p className="fp-method">Each group's last letters give its job: <b>Z</b> time · <b>KT</b> wind · <b>SM</b> visibility · <b>FEW/SCT/BKN/OVC</b> clouds · <b>/</b> temperature</p>}
        </section>
        <section className="fp-panel" aria-label="Meanings">
          <div className="fp-tiles" role="group" aria-label="Meanings" data-fp-idle="true">
            {targets.map((t) => {
              const user = usedBy(t.id);
              const isModel = modelPairs !== null && f.canAct && lastItem !== undefined && modelPairs[lastItem] === t.id && !pairs[lastItem];
              const okT = user ? ok[user] : false;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`fp-tile ${user ? "is-used" : ""} ${okT ? "is-ok" : ""} ${selTarget === t.id ? "is-picked" : ""} ${isModel ? "is-model" : ""} ${drag.hot === t.id ? "is-hot" : ""} ${f.solved && user ? "is-right" : ""}`}
                  data-testid="target"
                  data-value={t.id}
                  data-fp-zone={t.id}
                  aria-pressed={selTarget === t.id}
                  aria-disabled={!f.canAct || (user ? locked(user) : false)}
                  aria-label={`Meaning: ${t.text}${user ? `, matched to group ${letterOf(user)}` : ""}`}
                  onClick={(e) => pickTarget(t.id, e)}
                  {...drag.dragProps(t.id, t.text ?? "", f.canAct)}
                >
                  <span className="fp-badge" aria-hidden="true">{user ? letterOf(user) : ""}</span>
                  <span className="fp-tile-text">{t.text}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`fp-check ${f.solved ? "is-right" : ""} ${modelPairs && complete && f.canAct ? "is-model" : ""}`}
            data-testid="done"
            aria-label="Check my matches"
            aria-disabled={!f.canAct || !complete}
            onClick={() => {
              if (!f.canAct || !complete) return;
              audio.play("tap", { gain: 0.4 });
              submit(pairs);
            }}
          >
            Check
          </button>
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} title="What each group means" />
        </section>
      </div>
      {drag.ghost}
    </div>
  );
}

function CallBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const x = metarOf(ex.params ?? {});
  const clouds = p(ex, "cl") === 1;
  const gust = p(ex, "gr") === 1;
  const c = ceilingOf(x.layers);
  const f = flags(st);
  return (
    <div className="fp-stage game-wx mode-call" data-testid="fp-board" data-mode="call" data-game="wx">
      <Tab game="wx" sub="Fly or wait?" />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Weather and the practice card">
          <MetarStrip params={ex.params ?? {}} />
          <div className="fp-card" data-testid="fp-card">
            <p className="fp-card-title">Ziggy's practice card <em>(made up for this game, not real legal minimums)</em></p>
            <ul>
              {clouds && <li><span>Ceiling (lowest BKN or OVC)</span><b>at least {fmtFeet(CARD.ceiling)} ft</b></li>}
              <li><span>Visibility</span><b>at least {CARD.vis} SM</b></li>
              <li><span>Wind</span><b>{CARD.wind} kt or less</b></li>
              {gust && <li><span>Gusts</span><b>{CARD.gust} kt or less</b></li>}
            </ul>
            {(f.hinted || f.solved) && clouds && <p className="fp-card-note">{c === null ? "No broken or overcast layer: no ceiling." : `Ceiling today: ${fmtFeet(c)} ft.`}</p>}
          </div>
        </section>
        <section className="fp-panel" aria-label="Fly or wait">
          {ex.answer.kind === "choice" && <Options st={st} act={act} busy={busy} options={ex.answer.options} />}
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} title="Line by line" />
        </section>
      </div>
    </div>
  );
}

export type { GroupKind };
