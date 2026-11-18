import { useEffect, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { useApp } from "../app/AppContext";
import { loadState } from "../services/storage";
import { postChallengeResult, startChallenge } from "../services/accountSync";
import { IconPlay } from "../ui/icons";
import { api, type ChallengeView } from "./api";
import { worldName } from "./catalog";
import { MonsterArt } from "./ui";
import "./parents.css";

/**
 * /challenge/:token — a friend's "beat my score" round. Child-facing: big monster, the number to beat, one Play button.
 * Opening it needs a signed-in parent on this device whose child is an approved friend (nothing is shown otherwise).
 * Results are framed as practice: beating the score is celebrated, not beating it is never a failure.
 */
export default function ChallengeScreen({ token }: { token: string }) {
  const { navigate, unlockAudio } = useApp();
  const [view, setView] = useState<ChallengeView | "loading" | "signin" | "missing">("loading");
  const [player, setPlayer] = useState<string>("");
  const local = loadState().challenge;
  const mineLocal = local?.token === token ? local : null;

  useEffect(() => {
    void (async () => {
      await postChallengeResult(); // retry an unposted result first
      const r = await api.challenge(token);
      if (r.ok) {
        setView(r);
        const linked = loadState().account?.childId;
        setPlayer(r.players.find((p) => p.id === linked)?.id ?? r.players[0]?.id ?? "");
      } else setView(r.status === 401 ? "signin" : "missing");
    })();
  }, [token]);

  const play = () => {
    if (typeof view !== "object" || !player) return;
    unlockAudio();
    audio.play("tap");
    startChallenge({ token, gameId: view.worldId, level: view.level, seed: view.seed, target: view.score, childId: player });
    navigate(`/play/${view.worldId}`);
  };

  return (
    <main className="ch-screen" data-testid="challenge">
      {view === "loading" && <p aria-busy="true">Loading…</p>}
      {view === "signin" && (
        <div className="ch-card">
          <h1>Ask a grown-up</h1>
          <p>A grown-up needs to sign in on this device to open this challenge.</p>
          <button type="button" className="pa-btn primary" onClick={() => navigate("/parents")}>
            Grown-ups: sign in
          </button>
        </div>
      )}
      {view === "missing" && (
        <div className="ch-card" data-testid="challenge-missing">
          <h1>This challenge has ended</h1>
          <button type="button" className="pa-btn primary" onClick={() => navigate("/map")}>
            Back to the island
          </button>
        </div>
      )}
      {typeof view === "object" && (
        <div className="ch-card">
          <MonsterArt monster={view.from.monster} size={150} label={view.from.publicName} />
          <h1>
            {view.mine ? "Your challenge" : `${view.from.publicName}'s challenge`}
          </h1>
          <p>{worldName(view.worldId)}</p>
          <p aria-label={`Score to beat: ${view.score}`}>
            <span className="ch-score" data-testid="challenge-target">
              {view.score}
            </span>
            <br />
            points to beat
          </p>
          {mineLocal?.result && (
            <p role="status" data-testid="challenge-result" data-beat={String(mineLocal.result.beat)}>
              <strong>You scored {mineLocal.result.score}!</strong> {mineLocal.result.beat ? "You beat it!" : "Great practice. Want another go?"}
            </p>
          )}
          {view.mine ? (
            <p>Share this challenge from the parent area. Results appear there.</p>
          ) : (
            <>
              {view.players.length > 1 && (
                <div className="ch-players" role="group" aria-label="Who is playing?">
                  {view.players.map((p) => (
                    <button key={p.id} type="button" className="pa-btn" aria-pressed={player === p.id} onClick={() => setPlayer(p.id)}>
                      {p.publicName}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="big-play small" data-testid="challenge-play" aria-label={mineLocal?.result ? "Play again" : "Play the challenge"} onClick={play}>
                <IconPlay />
                <span>{mineLocal?.result ? "Again" : "Play"}</span>
              </button>
            </>
          )}
          {view.results.length > 0 && (
            <ul className="pa-list" aria-label="Results">
              {view.results.map((r, i) => (
                <li key={i}>
                  <span>{r.publicName}</span>
                  <span>
                    {r.score}
                    {r.beat ? " ★" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
