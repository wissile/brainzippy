import { useState } from "react";
import { clearState, loadState } from "../services/storage";
import { NavButton } from "../ui/controls";
import { useApp } from "./AppContext";
import { useFeatures } from "./features";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "./support";
import { EARLY_ACCESS_LINE } from "../billing/copy";
import { ReminderSettings } from "../pwa/ReminderSettings";
import { disableReminders } from "../pwa/push";
import { DailyLimitSetting } from "../daily/DailyLimitSetting";
import { joinAnd, liveSubjects, playableWorlds } from "../content/registry";

export const AGE_BANDS = [
  { id: "ages-3-5", label: "3–5", min: 3, max: 5, critter: "bobbo" },
  { id: "ages-6-8", label: "6–8", min: 6, max: 8, critter: "zuzu" },
  { id: "ages-9-11", label: "9–11", min: 9, max: 11, critter: "hoot" },
  { id: "ages-12-14", label: "12–14", min: 12, max: 14, critter: "rumble" },
] as const;

export function GrownUpsScreen() {
  const { navigate } = useApp();
  const { accounts, billing, friends } = useFeatures();
  const [status, setStatus] = useState<"idle" | "gate" | "deleted" | "failed">("idle");
  const [answer, setAnswer] = useState("");
  // Parent gate: multiplication beyond the games' range (a speed bump for children, not a security boundary).
  const [gate] = useState(() => ({ a: 13 + Math.floor(Math.random() * 7), b: 6 + Math.floor(Math.random() * 4) }));

  const doDelete = async () => {
    const id = loadState().serverId;
    if (id) {
      const ok = await fetch(`/api/guest/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) => r.ok).catch(() => false);
      if (!ok) {
        setStatus("failed"); // keep the id so deletion can be retried
        return;
      }
    }
    // Deleting progress also removes this device's reminder subscription (best effort; never blocks deletion).
    await disableReminders().catch(() => undefined);
    clearState();
    setStatus("deleted");
  };

  return (
    <main className="screen grownups">
      <div className="screen-top"><NavButton to="/" label="Home" /><h1 className="screen-title">For grown-ups</h1><span /></div>
      <article className="prose">
        <p className="lead" data-testid="grownups-lead">
          BrainZippy turns learning into short story adventures: {playableWorlds().length} worlds so far in {joinAnd(liveSubjects().map((x) => x.title))}, with more worlds on the way. Your child is the hero who brings back the lost Brain Sparks of Monster Island, with the Critter Crew as guides.
        </p>

        <h2>The goal</h2>
        <p>To help children aged 3–14 build real understanding and confidence through play they choose to come back to: one clear learning goal per game, no ads, no reading needed for the youngest players, and nothing that punishes mistakes.</p>

        <h2>How it works</h2>
        <ol>
          <li><strong>A story sets up a problem worth solving.</strong> Bobbo needs his breakfast, Gloop's cave has gone dark, the cookies must be shared fairly. Short animated scenes give each game a reason.</li>
          <li><strong>Children learn by doing.</strong> They touch, drag, slide and share objects on screen, so the idea is something they do with their hands, not only words on a page.</li>
          <li><strong>A helper character explains the idea.</strong> Hoot, Zuzu or Puff pops in to show the trick (for example, "the last number you say tells how many", or "each hop is plus one").</li>
          <li><strong>Every answer gets useful feedback.</strong> Right answers are celebrated and the idea is named. A wrong answer brings a gentle hint that explains the idea; a second one brings a step-by-step worked example, and the child still makes the final tap.</li>
        </ol>

        <h2>How the difficulty grows</h2>
        <p>Each game has several levels (6 to 10), and its puzzles are made fresh each day. Within a round, first-try answers make the next puzzles a little harder and puzzles that need several tries make them easier, so no child gets stuck. After a round where at least half the answers were right first time, the next round starts one level higher; otherwise your child plays the same level again. The rules are the same for every child and are published here, so you always know why a puzzle got harder or easier.</p>

        <DailyLimitSetting />

        <h2>What children learn</h2>
        <table className="learn-table">
          <thead><tr><th>Game</th><th>Ages</th><th>Learns</th></tr></thead>
          <tbody>
            <tr><td>Bobbo's Breakfast</td><td>4–6</td><td>Counting objects one by one, knowing the last number tells how many, recognising small amounts, counting out a set</td></tr>
            <tr><td>Glow Cave Hops</td><td>5–7</td><td>Adding as moving forward on a number line; counting on</td></tr>
            <tr><td>Sky Balloon Race</td><td>6–8</td><td>Adding within 20 by counting on and making ten</td></tr>
            <tr><td>Cookie Kitchen</td><td>7–9</td><td>Sharing equally into groups: the start of division</td></tr>
          </tbody>
        </table>

        <h2>The research behind it</h2>
        <p>BrainZippy's design follows learning principles with good research support:</p>
        <ul className="refs">
          <li><strong>Counting with a "how many?" question</strong> builds the idea that the last number counted is the total (Le Corre &amp; Carey, 2007).</li>
          <li><strong>Number-line games:</strong> playing a numbered, straight-line board game for four short sessions improved young children's number knowledge (Siegler &amp; Ramani, 2008).</li>
          <li><strong>Active, engaged, meaningful, social:</strong> the "four pillars" of learning with apps (Hirsh-Pasek et al., 2015), which is why our characters respond to what your child does and animations stay purposeful.</li>
          <li><strong>Worked examples</strong> reduce overload for beginners (Sweller et al., 2019); we show them after mistakes, then step back.</li>
          <li><strong>Praising effort and strategy</strong> ("you counted carefully") rather than ability supports persistence after setbacks (Cimpian et al., 2007).</li>
          <li><strong>No reward shop:</strong> expected prizes can reduce children's own interest (Deci et al., 1999), so stars and stickers mark progress only.</li>
          <li><strong>Practice spread over days</strong> helps learning stick (Vlach &amp; Sandhofer, 2012); our mastery tracking across sessions is next on the roadmap.</li>
        </ul>
        <p className="honest"><strong>An honest note:</strong> these principles are well researched, but BrainZippy itself has not yet been tested in a formal study, so we don't claim it is "proven". We plan to measure learning with families who opt in, and we'll publish what we find.</p>

        <ReminderSettings />

        <h2>Privacy</h2>
        {accounts ? (
          <p>Guest play needs no account and there are no ads, chat, or third-party trackers. Your child's first name (optional), their monster and their progress are stored only in this browser and are never sent to us. The only thing that can be sent is <strong>your</strong> email, if you choose to add it in the grown-up step, with your consent. We never ask for photos or location.</p>
        ) : (
          <p data-testid="privacy-guest">BrainZippy is guest play only: no account, no ads, no chat and no third-party trackers. Your child's first name (optional), their monster and their progress are stored only in this browser and are never sent to us. We don't ask for anyone's email, photos or location.</p>
        )}
        <h2>Parent account</h2>
        {accounts ? (
          <p>An optional parent account (email sign-in, no password) shows your child's progress, sets a daily game limit{friends ? ", saves progress across devices and lets you add friends by invite" : " and saves progress across devices"}. <a href="/parents" data-testid="open-parents" onClick={(e) => { e.preventDefault(); navigate("/parents"); }}>Open the parent area</a></p>
        ) : (
          <p data-testid="accounts-coming-soon">Grown-up accounts are coming soon. Progress is saved on this device.</p>
        )}
        {!billing && (
          <>
            <h2>Cost</h2>
            <p data-testid="early-access">{EARLY_ACCESS_LINE}. Every game is open, with no card and nothing to buy.</p>
          </>
        )}
        <h2>Contact</h2>
        <p>Questions, feedback or a problem? Email us at <a href={SUPPORT_MAILTO} data-testid="support-email">{SUPPORT_EMAIL}</a>.</p>
        {status === "idle" && (
          <p><button type="button" className="pill-btn danger" data-testid="reset-progress" onClick={() => setStatus("gate")}>Delete all progress on this device</button></p>
        )}
        {status === "gate" && (
          <form
            className="gate"
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(answer) === gate.a * gate.b) void doDelete();
              else setAnswer("");
            }}
          >
            <label htmlFor="gate-answer">Grown-ups only: what is {gate.a} × {gate.b}?</label>
            <input id="gate-answer" data-testid="gate-answer" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            <button type="submit" className="pill-btn danger" data-testid="gate-confirm">Delete</button>
            <button type="button" className="pill-btn" onClick={() => setStatus("idle")}>Cancel</button>
          </form>
        )}
        {status === "deleted" && <p role="status" data-testid="reset-done">Progress on this device has been deleted.</p>}
        {status === "failed" && (
          <p role="alert">We couldn't reach our server to finish deleting. Nothing was removed yet — please try again when you're online. <button type="button" className="pill-btn" onClick={() => void doDelete()}>Try again</button></p>
        )}
      </article>
    </main>
  );
}
