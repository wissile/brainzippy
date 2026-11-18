import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MONSTER } from "../characters/Monster";
import { clearState, loadState } from "../services/storage";
import { linkDevice, syncNow, unlinkDevice } from "../services/accountSync";
import { guestToChildProgress } from "./merge";
import { api, type ChildChallenges, type ChildOut, type Friend, type LeaderboardEntry, type Me } from "./api";
import { AGE_BAND_IDS, WORLDS, ageBandLabel, skillLabel, worldName } from "./catalog";
import { currentStreak, localDay, roundPoints, weekSummary } from "./points";
import { DAILY_LIMIT_MAX, DAILY_LIMIT_MIN, MAX_CHILDREN, type ChildSettings } from "./schema";
import { MonsterArt, shareLink, Toggle } from "./ui";

const today = () => localDay(Date.now());

export function Dashboard({ me, refresh, onSignedOut }: { me: Me; refresh: () => Promise<void>; onSignedOut: () => void }) {
  const [linked, setLinked] = useState(() => loadState().account?.childId ?? null);
  const atLimit = me.children.length >= MAX_CHILDREN;

  const doLink = async (childId: string) => {
    await linkDevice(childId);
    setLinked(childId);
    await refresh();
  };

  return (
    <>
      <p className="pa-muted" data-testid="pa-signed-in">
        Signed in as <strong>{me.parent.email}</strong>
      </p>
      <DeviceLink me={me} linked={linked} onLink={doLink} onCreated={doLink} atLimit={atLimit} onUnlink={() => (unlinkDevice(), setLinked(null))} />
      {me.children.map((c) => (
        <ChildCard key={c.id} child={c} linked={linked === c.id} refresh={refresh} onDeleted={() => linked === c.id && (unlinkDevice(), setLinked(null))} />
      ))}
      {!atLimit && <AddChild onAdded={refresh} />}
      <AccountCard me={me} refresh={refresh} onSignedOut={onSignedOut} />
    </>
  );
}

/* ---------------- this device ---------------- */
function DeviceLink({ me, linked, onLink, onCreated, onUnlink, atLimit }: { me: Me; linked: string | null; onLink: (id: string) => Promise<void>; onCreated: (id: string) => Promise<void>; onUnlink: () => void; atLimit: boolean }) {
  const st = loadState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const linkedChild = me.children.find((c) => c.id === linked);
  const hasLocal = st.progress.roundsCompleted > 0 || st.profile.monster !== null;

  const createFromDevice = async () => {
    setBusy(true);
    setError("");
    const r = await api.addChild({
      monsterName: st.profile.monsterName || "Monster",
      monster: st.profile.monster ?? DEFAULT_MONSTER,
      ageBand: (AGE_BAND_IDS as readonly string[]).includes(st.ageBand ?? "") ? st.ageBand! : "ages-3-5",
      progress: guestToChildProgress(st.progress, st.history),
    });
    if (r.ok) await onCreated(r.child.id);
    else setError("We couldn't create the profile. Please try again.");
    setBusy(false);
  };

  if (linkedChild) {
    return (
      <section className="pa-card" data-testid="device-linked">
        <h2>This device</h2>
        <p>
          Progress on this device is saved to <strong>{linkedChild.monsterName}</strong> after every game.
        </p>
        <button type="button" className="pa-btn" onClick={onUnlink}>
          Stop saving this device
        </button>
      </section>
    );
  }
  if (!hasLocal && me.children.length === 0) return null;
  return (
    <section className="pa-card" data-testid="device-link">
      <h2>Save progress from this device</h2>
      <p>
        {hasLocal ? (
          <>
            This device has progress for <strong>{st.profile.monsterName || "a monster"}</strong> ({st.progress.roundsCompleted} game{st.progress.roundsCompleted === 1 ? "" : "s"}). Choose whose profile it belongs to. Nothing is lost: levels, stars and stickers keep the best of both.
          </>
        ) : (
          "Link this device to a child so their games are saved."
        )}
      </p>
      <p className="pa-muted">Your child's first name stays on this device. Only the monster, the monster name, the age group and game progress are saved to your account.</p>
      <div className="pa-row">
        {me.children.map((c) => (
          <button key={c.id} type="button" className="pa-btn primary" data-testid={`link-${c.monsterName}`} disabled={busy} onClick={() => (setBusy(true), void onLink(c.id).finally(() => setBusy(false)))}>
            Save to {c.monsterName}
          </button>
        ))}
        {hasLocal && !atLimit && (
          <button type="button" className="pa-btn" data-testid="create-from-device" disabled={busy} onClick={() => void createFromDevice()}>
            New profile for {st.profile.monsterName || "this monster"}
          </button>
        )}
      </div>
      {error && <p className="pa-error" role="alert">{error}</p>}
    </section>
  );
}

/* ---------------- add a child ---------------- */
function AddChild({ onAdded }: { onAdded: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [band, setBand] = useState<string>("ages-3-5");
  const [color, setColor] = useState<string>("teal");
  const [error, setError] = useState("");
  if (!open)
    return (
      <div>
        <button type="button" className="pa-btn" data-testid="add-child" onClick={() => setOpen(true)}>
          Add a child profile
        </button>
      </div>
    );
  return (
    <form
      className="pa-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const r = await api.addChild({ monsterName: name, monster: { ...DEFAULT_MONSTER, color }, ageBand: band });
        if (!r.ok) return setError(r.error === "too_many_children" ? `You can add up to ${MAX_CHILDREN} children.` : "Please give the monster a name made of letters.");
        setOpen(false);
        setName("");
        await onAdded();
      }}
    >
      <h2>Add a child profile</h2>
      <p className="pa-muted">Profiles use a monster name, not your child's real name. Your child can redesign the monster in the game.</p>
      <div className="pa-field">
        <label htmlFor="add-name">Monster name</label>
        <input id="add-name" type="text" data-testid="add-child-name" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="pa-row">
        <div className="pa-field">
          <label htmlFor="add-band">Age group</label>
          <select id="add-band" data-testid="add-child-band" value={band} onChange={(e) => setBand(e.target.value)}>
            {AGE_BAND_IDS.map((b) => (
              <option key={b} value={b}>
                {ageBandLabel(b)}
              </option>
            ))}
          </select>
        </div>
        <div className="pa-field">
          <label htmlFor="add-color">Monster colour</label>
          <select id="add-color" value={color} onChange={(e) => setColor(e.target.value)}>
            {["orange", "purple", "teal", "green", "blue", "pink", "yellow", "red"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="pa-error" role="alert">{error}</p>}
      <div className="pa-row">
        <button type="submit" className="pa-btn primary" data-testid="add-child-save">
          Add profile
        </button>
        <button type="button" className="pa-btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ---------------- one child ---------------- */
function ChildCard({ child, linked, refresh, onDeleted }: { child: ChildOut; linked: boolean; refresh: () => Promise<void>; onDeleted: () => void }) {
  const p = child.progress;
  const week = weekSummary(p.history, today());
  const streak = currentStreak(p.history, today());
  const skills = Object.entries(p.skills).sort((a, b) => b[1].completed - a[1].completed);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="pa-card" data-testid={`child-${child.monsterName}`} aria-labelledby={`child-${child.id}`}>
      <div className="pa-child-head">
        <MonsterArt monster={child.monster} size={72} />
        <div>
          <h2 id={`child-${child.id}`}>
            {child.monsterName}
            {linked && <span className="pa-badge">This device</span>}
          </h2>
          <p className="pa-muted">
            {ageBandLabel(child.ageBand)}
            {child.nickname ? ` · nickname: ${child.nickname}` : ""}
          </p>
        </div>
      </div>

      <ul className="pa-stats" aria-label="This week">
        <li>
          <b data-testid="stat-points">{week.points}</b>
          <span>points this week</span>
        </li>
        <li>
          <b data-testid="stat-streak">{streak}</b>
          <span>day streak</span>
        </li>
        <li>
          <b data-testid="stat-minutes">{week.minutes}</b>
          <span>minutes this week</span>
        </li>
        <li>
          <b data-testid="stat-rounds">{week.rounds}</b>
          <span>games this week</span>
        </li>
      </ul>
      <p className="pa-muted">Points: 10 per star plus 2 for each first-try answer, and a daily bonus for playing on consecutive days. Mistakes never cost points.</p>

      <h3>Worlds</h3>
      <table className="pa-table" data-testid="worlds">
        <thead>
          <tr>
            <th scope="col">World</th>
            <th scope="col">Level</th>
            <th scope="col">Best stars</th>
          </tr>
        </thead>
        <tbody>
          {WORLDS.map((w) => {
            const wp = p.worlds[w.id];
            return (
              <tr key={w.id} data-testid={`world-${w.id}`}>
                <td>{w.name}</td>
                <td>{wp ? `${Math.min(wp.level, w.maxLevel) + 1} of ${w.maxLevel + 1}` : "Not started"}</td>
                <td>{wp?.stars ? `${wp.stars} of 3` : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>Skills practised</h3>
      {skills.length === 0 ? (
        <p className="pa-muted">No games yet.</p>
      ) : (
        <ul className="pa-list" data-testid="skills">
          {skills.map(([id, t]) => (
            <li key={id}>
              <span>{skillLabel(id)}</span>
              <span className="pa-muted">{t.completed} puzzles</span>
            </li>
          ))}
        </ul>
      )}

      <Settings child={child} linked={linked} />
      <Nickname child={child} refresh={refresh} />
      <Friends child={child} />
      <Challenges child={child} />

      <div className="pa-section">
        <h3>Delete this profile</h3>
        <p className="pa-muted">Removes {child.monsterName}'s profile, progress, friends and challenges from our servers straight away. Progress saved on a device stays on that device.</p>
        {confirmDelete ? (
          <div className="pa-row">
            <button
              type="button"
              className="pa-btn danger confirm"
              data-testid="delete-child-confirm"
              onClick={async () => {
                const r = await api.deleteChild(child.id);
                if (r.ok) {
                  onDeleted();
                  await refresh();
                }
              }}
            >
              Yes, delete {child.monsterName}
            </button>
            <button type="button" className="pa-btn" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="pa-btn danger" data-testid="delete-child" onClick={() => setConfirmDelete(true)}>
            Delete profile
          </button>
        )}
      </div>
    </section>
  );
}

function Settings({ child, linked }: { child: ChildOut; linked: boolean }) {
  const [s, setS] = useState<ChildSettings>(child.settings);
  const [saved, setSaved] = useState(false);
  const save = async (patch: Partial<ChildSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    setSaved(false);
    const r = await api.putSettings(child.id, patch);
    if (r.ok) {
      setS(r.settings);
      setSaved(true);
      if (linked) void syncNow(); // apply on this device straight away
    }
  };
  return (
    <div className="pa-section">
      <h3>Settings</h3>
      <div className="pa-field">
        <label htmlFor={`limit-${child.id}`}>Games per day</label>
        <select id={`limit-${child.id}`} data-testid="daily-limit" value={s.dailyLimit} onChange={(e) => void save({ dailyLimit: Number(e.target.value) })}>
          {Array.from({ length: DAILY_LIMIT_MAX - DAILY_LIMIT_MIN + 1 }, (_, i) => DAILY_LIMIT_MIN + i).map((n) => (
            <option key={n} value={n}>
              {n}
              {n === 5 ? " (recommended)" : ""}
            </option>
          ))}
        </select>
        <small className="pa-muted">After this many games, your child is invited to come back tomorrow.</small>
      </div>
      <Toggle label="Sound effects and voice" checked={s.sound} onChange={(v) => void save({ sound: v })} testId="setting-sound" />
      <Toggle label="Music" checked={s.music} onChange={(v) => void save({ music: v })} testId="setting-music" />
      {saved && (
        <p className="pa-ok" role="status">
          Saved.
        </p>
      )}
    </div>
  );
}

function Nickname({ child, refresh }: { child: ChildOut; refresh: () => Promise<void> }) {
  const [on, setOn] = useState(child.nickname !== null);
  const [value, setValue] = useState(child.nickname ?? "");
  const [error, setError] = useState("");
  return (
    <div className="pa-section">
      <h3>Nickname</h3>
      <Toggle
        label="Show a nickname on my dashboard and emails"
        hint="Off by default. When on, the nickname is stored on our servers. Friends never see it."
        checked={on}
        testId="nickname-toggle"
        onChange={async (v) => {
          setOn(v);
          if (!v && child.nickname !== null) {
            await api.updateChild(child.id, { nickname: null });
            setValue("");
            await refresh();
          }
        }}
      />
      {on && (
        <form
          className="pa-row"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await api.updateChild(child.id, { nickname: value });
            if (!r.ok) return setError("Use letters only, up to 16.");
            setError("");
            await refresh();
          }}
        >
          <label htmlFor={`nick-${child.id}`} className="sr-only">
            Nickname
          </label>
          <input id={`nick-${child.id}`} type="text" maxLength={16} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="submit" className="pa-btn">
            Save nickname
          </button>
          {error && <span className="pa-error">{error}</span>}
        </form>
      )}
    </div>
  );
}

/* ---------------- friends ---------------- */
function Friends({ child }: { child: ChildOut }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [invite, setInvite] = useState<{ code: string; link: string } | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [f, l] = await Promise.all([api.friends(child.id), api.leaderboard(child.id, today())]);
    if (f.ok) setFriends(f.friends);
    if (l.ok) setBoard(l.entries);
  }, [child.id]);
  useEffect(() => void load(), [load]);

  const share = async () => {
    if (!invite) return;
    const r = await shareLink("BrainZippy friend invite", "Our children can be friends on BrainZippy: they'll see each other's monster and weekly points, and nothing else. Accept here:", invite.link);
    setNote(r === "copied" ? "Link copied." : r === "shared" ? "Shared." : "Copy the link below.");
  };

  return (
    <div className="pa-section" data-testid="friends">
      <h3>Friends</h3>
      <p className="pa-muted">Friends are added by invite only, and both parents approve. Friends see {child.monsterName}'s monster, monster name and weekly points. No chat, no profiles.</p>
      {friends.length > 0 && (
        <ul className="pa-list">
          {friends.map((f) => (
            <li key={f.id} data-testid={`friend-${f.monsterName}`} data-status={f.status}>
              <span className="pa-mini">
                <MonsterArt monster={f.monster} size={36} />
                {f.monsterName}
                <span className="pa-muted">{f.status === "active" ? "Friends" : f.status === "waiting-for-them" ? "Waiting for the other parent" : "Asks to be friends"}</span>
              </span>
              <span className="pa-row">
                {f.status === "needs-your-approval" && (
                  <button type="button" className="pa-btn primary" data-testid={`approve-${f.monsterName}`} onClick={async () => (await api.approveFriend(f.id), await load())}>
                    Approve
                  </button>
                )}
                <button type="button" className="pa-btn" onClick={async () => (await api.removeFriend(f.id), await load())}>
                  {f.status === "needs-your-approval" ? "Decline" : "Remove"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="pa-row">
        <button
          type="button"
          className="pa-btn"
          data-testid="create-invite"
          onClick={async () => {
            const r = await api.createInvite(child.id);
            if (r.ok) setInvite({ code: r.code, link: r.link });
          }}
        >
          Invite a friend
        </button>
        {invite && (
          <button type="button" className="pa-btn primary" onClick={() => void share()}>
            Share invite
          </button>
        )}
      </div>
      {invite && (
        <div className="pa-field">
          <label htmlFor={`invite-${child.id}`}>
            Invite link (code <strong data-testid="invite-code">{invite.code}</strong>, works once, 7 days)
          </label>
          <input id={`invite-${child.id}`} className="pa-code" readOnly value={invite.link} data-testid="invite-link" onFocus={(e) => e.currentTarget.select()} />
          {note && <span role="status">{note}</span>}
        </div>
      )}
      <h3>This week's leaderboard</h3>
      <table className="pa-table" data-testid="leaderboard">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Monster</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {board.map((e, i) => (
            <tr key={e.key} className={e.me ? "me" : ""} data-testid="leaderboard-row">
              <td>{i + 1}</td>
              <td>
                <span className="pa-mini">
                  <MonsterArt monster={e.monster} size={32} />
                  {e.monsterName}
                </span>
              </td>
              <td>{e.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- challenges ---------------- */
function Challenges({ child }: { child: ChildOut }) {
  const played = WORLDS.filter((w) => child.progress.history.some((r) => r.gameId === w.id));
  const [world, setWorld] = useState<string>(played[0]?.id ?? "");
  const [made, setMade] = useState<{ link: string; text: string } | null>(null);
  const [list, setList] = useState<ChildChallenges | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const r = await api.childChallenges(child.id);
    if (r.ok) setList(r);
  }, [child.id]);
  useEffect(() => void load(), [load]);

  const create = async () => {
    const rounds = child.progress.history.filter((r) => r.gameId === world);
    const best = Math.max(0, ...rounds.map(roundPoints));
    const level = Math.min(child.progress.worlds[world]?.level ?? 0, WORLDS.find((w) => w.id === world)?.maxLevel ?? 0);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]! & 0x7fffffff;
    const r = await api.createChallenge({ childId: child.id, worldId: world, level, seed, score: best });
    if (r.ok) setMade({ link: r.link, text: `Can you beat my score of ${best} in ${worldName(world)}? Play my round on BrainZippy:` });
  };

  return (
    <div className="pa-section" data-testid="challenges">
      <h3>Challenges</h3>
      {played.length === 0 ? (
        <p className="pa-muted">After {child.monsterName} plays a world, you can challenge friends to beat that score in the same round.</p>
      ) : (
        <div className="pa-row">
          <label htmlFor={`ch-world-${child.id}`}>Beat my score in</label>
          <select id={`ch-world-${child.id}`} data-testid="challenge-world" value={world} onChange={(e) => setWorld(e.target.value)}>
            {played.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button type="button" className="pa-btn" data-testid="create-challenge" onClick={() => void create()}>
            Create challenge link
          </button>
        </div>
      )}
      {made && (
        <div className="pa-field">
          <label htmlFor={`ch-link-${child.id}`}>Challenge link (friends only, 14 days)</label>
          <input id={`ch-link-${child.id}`} className="pa-code" readOnly value={made.link} data-testid="challenge-link" onFocus={(e) => e.currentTarget.select()} />
          <span className="pa-row">
            <button type="button" className="pa-btn primary" onClick={async () => setNote((await shareLink("BrainZippy challenge", made.text, made.link)) === "copied" ? "Link copied." : "")}>
              Share challenge
            </button>
            {note && <span role="status">{note}</span>}
          </span>
        </div>
      )}
      {list && (list.sent.length > 0 || list.played.length > 0) && (
        <ul className="pa-list" data-testid="challenge-list">
          {list.sent.map((c) => (
            <li key={c.id}>
              <span>
                {worldName(c.worldId)}: {child.monsterName} scored {c.score}
              </span>
              <span className="pa-muted">{c.results.length ? c.results.map((r) => `${r.monsterName} ${r.score}${r.beat ? " (beat it!)" : ""}`).join(", ") : "No one has played yet"}</span>
            </li>
          ))}
          {list.played.map((c) => (
            <li key={`p-${c.id}`} data-testid="challenge-played">
              <span>
                {c.from}'s challenge in {worldName(c.worldId)}
              </span>
              <span className="pa-muted">
                {child.monsterName} scored {c.score} (target {c.target}){c.beat ? " and beat it!" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- account ---------------- */
function AccountCard({ me, refresh, onSignedOut }: { me: Me; refresh: () => Promise<void>; onSignedOut: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  if (deleted)
    return (
      <section className="pa-card" role="status">
        <h2>Account deleted</h2>
        <p>Your account and your children's profiles have been deleted from our servers.</p>
      </section>
    );
  return (
    <section className="pa-card" data-testid="account">
      <h2>Your account</h2>
      <Toggle
        label="Daily progress email"
        hint="A short evening summary of today's games, skills and streak. Sent only on days your child plays. One-click unsubscribe."
        checked={me.parent.digestOptIn}
        testId="digest-toggle"
        onChange={async (v) => {
          await api.setDigest(v);
          await refresh();
        }}
      />
      <div className="pa-section">
        <h3>Your data</h3>
        <p className="pa-muted">Download everything we store for your account, or delete it. Deleting removes it from our live database immediately; the database's point-in-time recovery history keeps a copy for up to 30 days, then it is gone.</p>
        <div className="pa-row">
          <a className="pa-btn" href="/api/me/export" download="brainzippy-export.json" data-testid="export-data">
            Download my data (JSON)
          </a>
          {confirm ? (
            <>
              <button
                type="button"
                className="pa-btn danger confirm"
                data-testid="delete-account-confirm"
                onClick={async () => {
                  const r = await api.deleteAccount();
                  if (r.ok) {
                    unlinkDevice();
                    setDeleted(true);
                  }
                }}
              >
                Yes, delete my account
              </button>
              <button type="button" className="pa-btn" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="pa-btn danger" data-testid="delete-account" onClick={() => setConfirm(true)}>
              Delete account
            </button>
          )}
        </div>
      </div>
      <div className="pa-section pa-row">
        <button
          type="button"
          className="pa-btn"
          data-testid="sign-out"
          onClick={async () => {
            await api.logout();
            onSignedOut();
          }}
        >
          Sign out
        </button>
        <button
          type="button"
          className="pa-btn"
          onClick={() => {
            if (window.confirm("Remove all BrainZippy progress stored on this device?")) clearState();
          }}
        >
          Clear this device
        </button>
      </div>
    </section>
  );
}
