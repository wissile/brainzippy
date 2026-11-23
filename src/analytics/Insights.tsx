import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorld } from "../content/registry";
import { breakdown, dailySeries, funnel, hardestExercises, perGame, skillLadder, summary, type InsightsData } from "./insights";
import "./insights.css";

/**
 * /insights — the owner's dashboard of anonymous play statistics (D-033). Not linked from anywhere a child goes,
 * `noindex` (app shell), and useless without the ANALYTICS_TOKEN secret: the key is typed here and kept only in this tab
 * (sessionStorage). Everything shown is aggregate counts; there is nothing about any one child to show.
 */
const KEY = "bz.insights.key";
const RANGES = [7, 30, 90, 365] as const;
const title = (id: string) => getWorld(id)?.title ?? id;
const STEP_LABEL: Record<string, string> = { intro: "Story", pop: "Bubble pop", build: "Build a monster", name: "Name it", kid: "Your name", age: "Age", grownup: "Grown-up step", done: "Finished" };

export default function Insights() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) ?? "");
  const [draft, setDraft] = useState("");
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<InsightsData | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "denied" | "error">("idle");

  useEffect(() => {
    document.title = "Insights — BrainZippy"; // the app shell (index.html) is already noindex
  }, []);

  const load = useCallback(async (k: string, d: number) => {
    setState("loading");
    try {
      const res = await fetch(`/api/insights?days=${d}`, { headers: { authorization: `Bearer ${k}` }, credentials: "omit" });
      if (res.status === 404) {
        sessionStorage.removeItem(KEY);
        setKey("");
        setState("denied");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as InsightsData);
      setState("idle");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (key) void load(key, days);
  }, [key, days, load]);

  if (!key) {
    return (
      <main className="insights">
        <h1>Insights</h1>
        <form
          className="ins-key"
          onSubmit={(e) => {
            e.preventDefault();
            const k = draft.trim();
            if (!k) return;
            sessionStorage.setItem(KEY, k);
            setKey(k);
          }}
        >
          <label htmlFor="ins-key">Owner key</label>
          <input id="ins-key" data-testid="insights-key" type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className="ins-btn" data-testid="insights-open">Open</button>
        </form>
        {state === "denied" && <p role="alert" data-testid="insights-denied">That key didn't work, or statistics aren't switched on for this site yet.</p>}
        <p className="ins-note">Anonymous counts only: no names, ids, cookies or IP addresses are collected.</p>
      </main>
    );
  }

  return (
    <main className="insights" data-testid="insights">
      <header className="ins-head">
        <h1>Insights</h1>
        <div className="ins-filters" role="group" aria-label="Date range">
          {RANGES.map((d) => (
            <button key={d} type="button" className={`ins-chip ${d === days ? "on" : ""}`} aria-pressed={d === days} onClick={() => setDays(d)}>
              {d === 365 ? "1 year" : `${d} days`}
            </button>
          ))}
          <button type="button" className="ins-chip" onClick={() => { sessionStorage.removeItem(KEY); setKey(""); setData(null); }}>Lock</button>
        </div>
      </header>
      {state === "loading" && !data && <p>Loading…</p>}
      {state === "error" && <p role="alert">Couldn't load the numbers. Check your connection and try again.</p>}
      {data && <Report data={data} />}
    </main>
  );
}

function Report({ data }: { data: InsightsData }) {
  const s = useMemo(() => summary(data.rows), [data]);
  const f = useMemo(() => funnel(data.rows), [data]);
  const games = useMemo(() => perGame(data.rows), [data]);
  const hard = useMemo(() => hardestExercises(data.rows), [data]);
  const ladder = useMemo(() => skillLadder(data.rows), [data]);
  const sessions = useMemo(() => dailySeries(data.perDay, "session", data.from, data.days), [data]);
  const rounds = useMemo(() => dailySeries(data.perDay, "round_done", data.from, data.days), [data]);

  if (data.rows.length === 0) return <p data-testid="insights-empty">No plays counted in this period yet.</p>;
  return (
    <>
      <p className="ins-note">From {data.from} (UTC), {data.days} days. Counts are anonymous and can't be linked to a child or a device: one child playing twice counts twice.{data.truncated ? " Only the largest rows are shown." : ""}</p>
      <section className="ins-tiles" aria-label="Summary">
        <Tile label="App opens" value={s.sessions} />
        <Tile label="Rounds started" value={s.roundsStarted} />
        <Tile label="Rounds finished" value={s.roundsDone} sub={`${s.finishRate}% of started`} />
        <Tile label="Average round" value={`${s.avgRoundMin} min`} />
        <Tile label="Exercises solved" value={s.exercisesSolved} sub={`${s.firstTryRate}% on the first try`} />
      </section>

      <section>
        <h2>Every day</h2>
        <div className="ins-two">
          <DayBars title="App opens per day" series={sessions} />
          <DayBars title="Rounds finished per day" series={rounds} />
        </div>
      </section>

      <section>
        <h2>First-run journey</h2>
        <p className="ins-help">How many children reached each onboarding step. A big drop between two steps is where children give up.</p>
        <Bars items={f.map((x) => ({ key: STEP_LABEL[x.step] ?? x.step, count: x.count, label: `${x.count} · ${x.pct}%${x.skipped ? ` · ${x.skipped} skipped` : ""}` }))} testid="insights-funnel" />
      </section>

      <section>
        <h2>Games</h2>
        <p className="ins-help">Finish rate = rounds finished ÷ started. First try = exercises solved without a miss. After model = solved only once the answer was shown (too hard).</p>
        <Table
          testid="insights-games"
          head={["Game", "Started", "Finished", "Finish rate", "Left early (after 0 / 1–2 / 3–5 / 6+ solved)", "Avg min", "Solved", "First try", "After model", "Level-ups"]}
          rows={games.map((g) => [title(g.game), g.started, g.done, `${g.finishRate}%`, `${g.quit} (${["0", "1-2", "3-5", "6+"].map((b) => g.quitAfter[b] ?? 0).join(" / ")})`, g.avgMin, g.solved, `${g.firstTryRate}%`, `${g.afterModelRate}%`, g.levelUps])}
        />
      </section>

      <section>
        <h2>Hardest exercises</h2>
        <p className="ins-help">Exercises solved at least 10 times, lowest first-try rate first, with the most common wrong answers. Look here first when improving a game.</p>
        {hard.length === 0 ? <p>Not enough plays yet (each exercise needs 10 solves).</p> : (
          <Table
            testid="insights-hardest"
            head={["Game", "Exercise", "Solved", "First try", "After model", "Avg seconds", "Hints", "Common wrong answers"]}
            rows={hard.map((e) => [title(e.game), e.id, e.solved, `${e.firstTryRate}%`, `${e.afterModelRate}%`, e.avgSec, e.hints, e.wrong.map((w) => `${w.answer} (${w.count})`).join(", ") || "—"])}
          />
        )}
      </section>

      <section>
        <h2>Difficulty steps</h2>
        <p className="ins-help">First-try rate per skill and difficulty level. It should fall gently as difficulty rises; a cliff means the step is too big.</p>
        {ladder.length === 0 ? <p>Not enough plays yet.</p> : (
          <Table head={["Game", "Skill", "Difficulty", "Solved", "First try", "Avg seconds"]} rows={ladder.map((l) => [title(l.game), l.skill, l.difficulty, l.solved, `${l.firstTryRate}%`, l.avgSec])} />
        )}
      </section>

      <section className="ins-grid">
        <Breakdown title="Hints shown" items={breakdown(data.rows, "hint", "k2")} />
        <Breakdown title="Thinking time before the first answer" items={breakdown(data.rows, "think", "k1")} />
        <Breakdown title="Devices" items={breakdown(data.rows, "session", "k1")} />
        <Breakdown title="Age bands" items={breakdown(data.rows, "age_band", "k1")} />
        <Breakdown title="Sound on at start" items={breakdown(data.rows, "setting", "k2", (r) => r[2] === "sound")} />
        <Breakdown title="Music on at start" items={breakdown(data.rows, "setting", "k2", (r) => r[2] === "music")} />
        <Breakdown title="Reduced motion" items={breakdown(data.rows, "setting", "k2", (r) => r[2] === "reduced-motion")} />
        <Breakdown title="Installed as an app" items={breakdown(data.rows, "setting", "k2", (r) => r[2] === "installed")} />
        <Breakdown title="Start-up time" items={breakdown(data.rows, "load", "k1")} />
        <Breakdown title="Screens opened" items={breakdown(data.rows, "screen", "k1")} />
        <Breakdown title="Rounds started from" items={breakdown(data.rows, "round_start", "k2")} />
        <Breakdown title="Daily learning" items={breakdown(data.rows, "daily", "k1")} />
        <Breakdown title="Daily limit chosen" items={breakdown(data.rows, "daily", "k2", (r) => r[2] === "limit-changed")} />
        <Breakdown title="Crash screens" items={breakdown(data.rows, "error", "k2")} />
      </section>
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="ins-tile">
      <span className="ins-tile-label">{label}</span>
      <strong className="ins-tile-value">{typeof value === "number" ? value.toLocaleString() : value}</strong>
      {sub && <span className="ins-tile-sub">{sub}</span>}
    </div>
  );
}

/** Horizontal bars, one hue (magnitude only). Each bar is labelled with its value; the table view is the text itself. */
function Bars({ items, testid }: { items: { key: string; count: number; label?: string }[]; testid?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="ins-bars" data-testid={testid}>
      {items.map((i) => (
        <li key={i.key} title={`${i.key}: ${i.label ?? i.count}`}>
          <span className="ins-bar-key">{i.key}</span>
          <span className="ins-bar-track"><span className="ins-bar" style={{ width: `${(i.count / max) * 100}%` }} /></span>
          <span className="ins-bar-val">{i.label ?? i.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function Breakdown({ title: t, items }: { title: string; items: { key: string; count: number; pct: number }[] }) {
  return (
    <div className="ins-card">
      <h3>{t}</h3>
      {items.length === 0 ? <p className="ins-help">No data yet.</p> : <Bars items={items.slice(0, 8).map((i) => ({ key: i.key, count: i.count, label: `${i.count.toLocaleString()} · ${i.pct}%` }))} />}
    </div>
  );
}

/** Vertical day bars (single series, so no legend: the title names it). Hover shows the exact value. */
function DayBars({ title: t, series }: { title: string; series: { day: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(0, ...series.map((d) => d.count));
  const max = Math.max(1, peak);
  const W = 600;
  const H = 160;
  const bw = W / series.length;
  const shown = hover !== null ? series[hover] : null;
  return (
    <figure className="ins-card ins-chart">
      <figcaption><h3>{t}</h3><span className="ins-readout" aria-live="polite">{shown ? `${shown.day}: ${shown.count}` : `highest ${peak}`}</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`${t}. Highest ${peak}.`} onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={W} y1={H} y2={H} className="ins-axis" />
        {series.map((d, i) => {
          const h = (d.count / max) * (H - 8);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {d.count > 0 && <rect className={`ins-col ${hover === i ? "hot" : ""}`} x={i * bw + Math.min(2, bw * 0.15)} y={H - h} width={Math.max(1, bw - Math.min(4, bw * 0.3))} height={h} rx={Math.min(4, bw / 4)} />}
              <title>{`${d.day}: ${d.count}`}</title>
            </g>
          );
        })}
        <text x={0} y={H + 14} className="ins-tick">{series[0]?.day}</text>
        <text x={W} y={H + 14} className="ins-tick" textAnchor="end">{series[series.length - 1]?.day}</text>
      </svg>
    </figure>
  );
}

function Table({ head, rows, testid }: { head: string[]; rows: (string | number)[][]; testid?: string }) {
  return (
    <div className="ins-table-wrap">
      <table className="ins-table" data-testid={testid}>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{typeof c === "number" ? c.toLocaleString() : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
