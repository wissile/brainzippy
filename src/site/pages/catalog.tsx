import { GAMES, overlapYears, type SiteGame } from "../catalog";
import { Critter, GameCard, GuideCard, PageHead, RefList, Section, ages } from "../components";
import { SKILLS, type AgeBandInfo, type SubjectInfo } from "../content/curriculum";
import { GAME_COPY } from "../content/games";
import { GUIDES, guideBySlug } from "../content/guides";
import { REFERENCES } from "../content/references";
import { PlayIcon } from "../layout";

export const screenshotPath = (id: string) => `/og/shots/${id}.jpg`;

export function GamesHub() {
  return (
    <>
      <PageHead title="All BrainZippy games" lead="Every game available today, with the ages it's designed for and the skills it teaches. Each one has four levels that adjust to your child." art="bobbo" />
      <Section title="Maths games">
        <div className="card-grid">
          {GAMES.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      </Section>
      <Section title="At a glance" className="tinted">
        <table className="table">
          <thead><tr><th scope="col">Game</th><th scope="col">Ages</th><th scope="col">Skills</th><th scope="col">Puzzles</th></tr></thead>
          <tbody>
            {GAMES.map((g) => (
              <tr key={g.id}>
                <td><a href={`/games/${g.id}`}>{g.title}</a></td>
                <td>{ages(g.ages)}</td>
                <td>{g.skillIds.map((s) => SKILLS[s]?.name ?? s).join(", ")}</td>
                <td>{g.exerciseCount} across {g.levels.length} levels</td>
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
            <li>Maths</li>
            <li>{game.levels.length} levels</li>
            <li>No reading needed</li>
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
        <p>{game.title} has {game.exerciseCount} puzzles across {game.levels.length} levels, played in rounds of {game.roundLength}. Two first-try answers in a row move up a level; needing three tries moves down, and each finished round starts one level higher.</p>
        <table className="table">
          <thead><tr><th scope="col">Level</th><th scope="col">What changes</th><th scope="col">Example puzzles</th></tr></thead>
          <tbody>
            {game.levels.map((l) => (
              <tr key={l.difficulty}>
                <td>{l.difficulty}</td>
                <td>{c.levelNames[l.difficulty - 1] ?? ""} <span className="muted">(answers {l.answerRange[0]}–{l.answerRange[1]})</span></td>
                <td>{l.examples.join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="When your child gets stuck">
        <p>{c.mistakes}</p>
      </Section>
      <Section title="Tips for parents" className="tinted">
        <ul>
          {c.tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <h3>Try it away from the screen</h3>
        <p>{c.offScreen}</p>
      </Section>
      <Section title="Why it's designed this way">
        <p>{c.why.text} {c.why.refs.map((k) => <a key={k} className="cite" href={`#ref-${k}`}>({REFERENCES[k].short})</a>)}</p>
        <p><a className="text-link" href="/research">More on the research behind BrainZippy</a></p>
      </Section>
      {guides.length > 0 && (
        <Section title="Related guides" className="tinted">
          <div className="card-grid">{guides.map((g) => <GuideCard key={g.slug} guide={g} />)}</div>
        </Section>
      )}
      <Section title="Ready to play?">
        <p><a className="play play-big" href={game.playPath}><PlayIcon /><span>Play {game.title}</span></a></p>
        <p>Free to try, no account needed. Works on tablets, phones and computers.</p>
      </Section>
      <Section title="References" className="tinted">
        <RefList keys={c.why.refs} />
      </Section>
    </>
  );
}

export function SubjectPage({ subject, games }: { subject: SubjectInfo; games: readonly SiteGame[] }) {
  const skills = [...new Set(games.flatMap((g) => g.skillIds))];
  const guides = GUIDES.filter((g) => g.games.some((id) => games.some((x) => x.id === id)));
  return (
    <>
      <PageHead title={`${subject.name} games for kids`} lead={subject.intro} art="bobbo" />
      <Section title={`${subject.name} games available now`}>
        <p>{subject.now}</p>
        <div className="card-grid">{games.map((g) => <GameCard key={g.id} game={g} />)}</div>
      </Section>
      <Section title="What's covered" className="tinted">
        {subject.strands.map((s) => (
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
      <Section title="Coming next" className="tinted">
        <p>{subject.next}</p>
      </Section>
      {guides.length > 0 && (
        <Section title={`${subject.name} guides for parents`}>
          <div className="card-grid">{guides.map((g) => <GuideCard key={g.slug} guide={g} />)}</div>
        </Section>
      )}
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
      <Section title={`What children aged ${band.label} are learning in maths`} className="tinted">
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
