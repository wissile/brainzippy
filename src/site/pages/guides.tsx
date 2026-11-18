import { gameById } from "../catalog";
import { GameCard, GuideCard, PageHead, RefList, Section } from "../components";
import { GUIDES, type Guide } from "../content/guides";

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export function GuidesHub() {
  return (
    <>
      <PageHead title="Guides for parents" lead="Practical, research-based guides to early maths at home: what children are learning at each age, and simple things you can do together." art="hoot" />
      <Section title="All guides">
        <div className="card-grid">{GUIDES.map((g) => <GuideCard key={g.slug} guide={g} />)}</div>
      </Section>
      <Section title="How we write these guides" className="tinted">
        <p>Every guide is original, cites its sources, and separates what research found from what we suggest. We say “built on research”, never “proven”. If you spot a mistake, we want to fix it.</p>
      </Section>
    </>
  );
}

export function GuidePage({ guide }: { guide: Guide }) {
  const games = guide.games.map(gameById).filter((g) => g !== undefined);
  const more = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);
  return (
    <>
      <article className="guide">
        <div className="wrap narrow">
          <h1>{guide.title}</h1>
          <p className="lead">{guide.description}</p>
          <p className="byline">
            By the BrainZippy team · For ages {guide.ages} · Updated <time dateTime={guide.updated}>{fmt(guide.updated)}</time>
          </p>
          <aside className="takeaways" aria-labelledby="takeaways">
            <h2 id="takeaways">Key points</h2>
            <ul>{guide.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>
          </aside>
          <div className="prose">{guide.body()}</div>
          <h2 id="references">References</h2>
          <RefList keys={guide.refs} />
        </div>
      </article>
      {games.length > 0 && (
        <Section title={games.length === 1 ? "Try the game" : "Try the games"} className="tinted">
          <div className="card-grid">{games.map((g) => <GameCard key={g.id} game={g} />)}</div>
        </Section>
      )}
      <Section title="More guides">
        <div className="card-grid">{more.map((g) => <GuideCard key={g.slug} guide={g} />)}</div>
      </Section>
    </>
  );
}
