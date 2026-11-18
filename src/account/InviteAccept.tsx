import { useEffect, useState } from "react";
import { api, type Me } from "./api";
import type { MonsterSpec } from "./schema";
import { MonsterArt } from "./ui";

/** Accepting a friend invite: the accepting parent picks one of their children. The inviting parent approves next. */
export function InviteAccept({ code, me, onDone }: { code: string; me: Me; onDone: () => void }) {
  const [from, setFrom] = useState<{ monsterName: string; monster: MonsterSpec } | null | "loading" | "own">("loading");
  const [childId, setChildId] = useState(me.children[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    void api.peekInvite(code).then((r) => setFrom(r.ok ? (r.ownChild ? "own" : r.from) : null));
  }, [code]);

  if (from === "loading") return <p className="pa-muted">Loading the invite…</p>;
  if (from === null) return <InviteMessage title="This invite has expired" text="Invites work once and last 7 days. Ask the other parent for a new one." onDone={onDone} />;
  if (from === "own") return <InviteMessage title="This is your own invite" text="Share it with another parent so their child can become a friend." onDone={onDone} />;

  const accept = async () => {
    setStatus("busy");
    const r = await api.acceptInvite(code, childId);
    if (r.ok) return setStatus("done");
    setStatus("error");
    setError(r.error === "already_friends" ? "These two are already friends." : r.error === "too_many_friends" ? "One of the children has reached the friend limit." : "We couldn't accept this invite. It may have expired.");
  };

  return (
    <section className="pa-card" data-testid="invite-accept">
      <div className="pa-child-head">
        <MonsterArt monster={from.monster} size={72} />
        <div>
          <h2>Friend invite from {from.monsterName}</h2>
          <p className="pa-muted">Friends see only each other's monster name, monster picture and weekly points. There is no chat.</p>
        </div>
      </div>
      {status === "done" ? (
        <>
          <p className="pa-ok" role="status" data-testid="invite-accepted">
            Done! The other parent will be asked to approve too. You'll see {from.monsterName} on the leaderboard once they do.
          </p>
          <button type="button" className="pa-btn primary" onClick={onDone}>
            Back to the dashboard
          </button>
        </>
      ) : me.children.length === 0 ? (
        <p>Add a child profile on your dashboard first, then open this link again.</p>
      ) : (
        <>
          <div className="pa-field">
            <label htmlFor="invite-child">Which of your children?</label>
            <select id="invite-child" data-testid="invite-child" value={childId} onChange={(e) => setChildId(e.target.value)}>
              {me.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname ? `${c.monsterName} (${c.nickname})` : c.monsterName}
                </option>
              ))}
            </select>
          </div>
          {status === "error" && (
            <p className="pa-error" role="alert">
              {error}
            </p>
          )}
          <div className="pa-row">
            <button type="button" className="pa-btn primary" data-testid="invite-accept-btn" disabled={status === "busy"} onClick={() => void accept()}>
              Accept and approve
            </button>
            <button type="button" className="pa-btn" onClick={onDone}>
              Not now
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function InviteMessage({ title, text, onDone }: { title: string; text: string; onDone: () => void }) {
  return (
    <section className="pa-card">
      <h2>{title}</h2>
      <p>{text}</p>
      <button type="button" className="pa-btn" onClick={onDone}>
        Back to the dashboard
      </button>
    </section>
  );
}
