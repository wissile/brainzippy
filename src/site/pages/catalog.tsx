import { GAMES, overlapYears, type SiteGame, type SiteSubject } from "../catalog";
import { Critter, GameCard, GuideCard, PageHead, RefList, Section, ages } from "../components";
import { SKILLS, type AgeBandInfo, type SubjectInfo } from "../content/curriculum";
import { GAME_COPY } from "../content/games";
import { registry } from "../../content";
import { GUIDES, guideBySlug } from "../content/guides";
import { REFERENCES } from "../content/references";
import { PlayIcon } from "../layout";

export const screenshotPath = (id: string) => `/og/shots/${id}.jpg`;

export function GamesHub({ subjects }: { subjects: readonly SiteSubject[] }) {
  return (
    <>
      <PageHead title="All BrainZippy games" lead="Every game available today, with the ages it's designed for and the skills it teaches. Each one has several levels and adjusts to your child round by round." art="bobbo" />
      {subjects.map((s) => (
        <Section key={s.id} title={`${s.title} games`}>
          <div className="card-grid">
            {s.games.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
        </Section>
      ))}
      <Section title="At a glance" className="tinted">
        <table className="table">
          <thead><tr><th scope="col">Game</th><th scope="col">Ages</th><th scope="col">Subject</th><th scope="col">Skills</th><th scope="col">Levels</th></tr></thead>
          <tbody>
            {GAMES.map((g) => (
              <tr key={g.id}>
                <td><a href={`/games/${g.id}`}>{g.title}</a></td>
                <td>{ages(g.ages)}</td>
                <td>{subjects.find((s) => s.id === g.subject)?.title ?? g.subject}</td>
                <td>{g.skillIds.map((s) => SKILLS[s]?.name ?? s).join(", ")}</td>
                <td>{g.levelCount} levels</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Ages are a guide, not a rule. Children develop at different speeds, and every game starts easy and adjusts.</p>
      </Section>
    </>
  );
}

export function GamePage({ game }: { game: SiteGame }) {
  const c = GAME_COPY[game.id];
  if (!c) throw new Error(`No editorial copy for game ${game.id}`);
  const guides = c.guides.map(guideBySlug).filter((g) => g !== undefined);
  return (
    <>
      <div className={`wrap page-head game-head tint-${c.critter}`}>
        <div>
          <h1>{game.title}</h1>
          <p className="lead">{c.oneLine}</p>
          <ul className="badges" aria-label="Game facts">
            <li>Ages {ages(game.ages)}</li>
            <li>{registry.subjects.find((x) => x.id === game.subject)?.title ?? game.subject}</li>
            <li>{game.levelCount} levels</li>
            {c.noReading && <li>No reading needed</li>}
          </ul>
          <a className="play play-big" href={game.playPath} data-testid="game-play"><PlayIcon /><span>Play {game.title}</span></a>
        </div>
        <Critter c={c.critter} size={150} className="head-art" />
      </div>
      <div className="wrap">
        <figure className="shot">
          <img src={screenshotPath(game.id)} width={960} height={600} alt={c.screenshotAlt} decoding="async" />
          <figcaption>A puzzle from {game.title}, as your child sees it.</figcaption>
        </figure>
      </div>
      <Section title="What your child learns">
        <p className="lead-sm">{game.learningObjective}</p>
        <ul className="skill-list">
          {game.skillIds.map((id) => {
            const s = SKILLS[id];
            return <li key={id}><strong>{s?.name ?? id}:</strong> {s?.plain}</li>;
          })}
        </ul>
      </Section>
      <Section title="The story" className="tinted">
        <p>{c.story}</p>
      </Section>
      <Section title="How to play">
        <ol className="steps">
          {c.howToPlay.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Section>
      <Section title="How the difficulty grows" className="tinted">
        <p>{game.title} has {game.levelCount} levels, played in rounds of {game.roundLength} puzzles. {game.generated ? "Puzzles are made fresh each day." : "Each level has its own set of hand-made puzzles."} Within a round, {game.stepUpAfter} first-try answers in a row make the next puzzles a little harder, and a puzzle that needs three or more tries makes them easier. After a round where at least half the answers were right first time, the next round starts one level higher.</p>
        <table className="table">
          <thead><tr><th scope="col">Level</th><th scope="col">What changes</th><th scope="col">Example puzzles</th></tr></thead>
          <tbody>
            {game.levels.map((l) => (
              <tr key={l.difficulty}>
                <td>{l.difficulty}</td>
                <td>{c.levelNames[l.difficulty - 1] ?? ""} {l.answerRange && c.answerLabel !== null && <span className="muted">({c.answerLabel ?? "answers"} {l.answerRange[0]}–{l.answerRange[1]})</span>}</td>
                <td>{l.examples.join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Common mix-ups it looks for">
        <p>Wrong answers in {game.title} aren't random: the choices and hints are built around mistakes children often make.</p>
        <ul>
          {c.misconceptions.map((m) => <li key={m.idea}><strong>{m.idea}.</strong> {m.how}</li>)}
        </ul>
      </Section>
      <Section title="When your child gets stuck" className="tinted">
        <p>{c.mistakes}</p>
      </Section>
      <Section title="Tips for parents">
        <ul>
          {c.tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <h3>Try it away from the screen</h3>
        <p>{c.offScreen}</p>
      </Section>
      <Section title="Why it's designed this way" className="tinted">
        <p>{c.why.text} {c.why.refs.map((k) => <a key={k} className="cite" href={`#ref-${k}`}>({REFERENCES[k].short})</a>)}</p>
        <p><a className="text-link" href="/research">More on the research behind BrainZippy</a></p>
      </Section>
      {guides.length > 0 && (
        <Section title="Related guides">
          <div className="card-grid">{guides.map((g) => <GuideCard key={g.slug} guide={g} />)}</div>
        </Section>
      )}
      <Section title="Ready to play?" className="tinted">
        <p><a className="play play-big" href={game.playPath}><PlayIcon /><span>Play {game.title}</span></a></p>
        <p>Free to try, no account needed. Works on tablets, phones and computers.</p>
      </Section>
      <Section title="References">
        <RefList keys={c.why.refs} />
      </Section>
    </>
  );
}

export function SubjectPage({ subject, games }: { subject: SubjectInfo; games: readonly SiteGame[] }) {
  const skills = [...new Set(games.flatMap((g) => g.skillIds))];
  const strands = subject.strands.filter((st) => skills.some((id) => id.startsWith(st.skills)));
  const min = Math.min(...games.map((g) => g.ages[0]));
  const max = Math.max(...games.map((g) => g.ages[1]));
  const guides = GUIDES.filter((g) => g.games.some((id) => games.some((x) => x.id === id)));
  return (
    <>
      <PageHead title={`${subject.name} games for kids`} lead={subject.intro} art="bobbo" />
      <Section title={`${subject.name} games available now`}>
        <p>{games.length === 1 ? "One game" : `${games.length} games`} today, for ages {min}–{max}. {subject.now}</p>
        <div className="card-grid">{games.map((g) => <GameCard key={g.id} game={g} />)}</div>
      </Section>
      <Section title="What's covered" className="tinted">
        {strands.map((s) => (
          <div key={s.name}>
            <h3>{s.name}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </Section>
      <Section title="Skills">
        <ul className="skill-list">
          {skills.map((id) => <li key={id}><strong>{SKILLS[id]?.name ?? id}:</strong> {SKILLS[id]?.plain}</li>)}
        </ul>
      </Section>
      <Section title="How to help at home" className="tinted">
        <ul>{subject.atHome.map((t) => <li key={t}>{t}</li>)}</ul>
      </Section>
      <Section title="What the research says">
        <p>{subject.evidence.text}</p>
        <p><a className="text-link" href="/research">More on the research behind BrainZippy</a></p>
      </Section>
      <Section title="Coming next" className="tinted">
        <p>{subject.next}</p>
      </Section>
      {guides.length > 0 && (
        <Section title={`${subject.name} guides for parents`}>
          <div className="card-grid">{guides.map((g) => <GuideCard key={g.slug} guide={g} />)}</div>
        </Section>
      )}
      <Section title="References" className={guides.length > 0 ? "tinted" : ""}>
        <RefList keys={subject.evidence.refs} />
      </Section>
    </>
  );
}

export function AgePage({ band, main, stretch }: { band: AgeBandInfo; main: readonly SiteGame[]; stretch: readonly SiteGame[] }) {
  return (
    <>
      <PageHead title={`Learning games for ages ${band.label}`} lead={band.intro} art={band.min < 6 ? "bobbo" : "zuzu"} />
      <Section title={`Games for ages ${band.label}`}>
        <div className="card-grid">{main.map((g) => <GameCard key={g.id} game={g} />)}</div>
        {stretch.length > 0 && (
          <p>Also worth a try: {stretch.map((g, i) => <span key={g.id}>{i > 0 && ", "}<a href={`/games/${g.id}`}>{g.title}</a> (ages {ages(g.ages)})</span>)}.</p>
        )}
      </Section>
      <Section title={`What children aged ${band.label} are learning`} className="tinted">
        <ul>{band.development.map((d) => <li key={d}>{d}</li>)}</ul>
      </Section>
      <Section title="How to help at home">
        <ul>{band.howToHelp.map((d) => <li key={d}>{d}</li>)}</ul>
      </Section>
      <Section title={`How BrainZippy is designed for ${band.label}s`} className="tinted">
        <p>{band.designNotes}</p>
      </Section>
      {band.refs.length > 0 && (
        <Section title="References">
          <RefList keys={band.refs} />
        </Section>
      )}
    </>
  );
}

/** Games whose age range shares at least `years` years with the band. */
export const gamesForBand = (band: { min: number; max: number }, years: number) => GAMES.filter((g) => overlapYears(g.ages, band) >= years);
