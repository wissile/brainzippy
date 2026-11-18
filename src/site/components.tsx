import { Bobbo } from "../characters/Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../characters/Crew";
import type { SiteGame } from "./catalog";
import { GAME_COPY } from "./content/games";
import type { Guide } from "./content/guides";
import { REFERENCES, type RefKey } from "./content/references";
import { SKILLS } from "./content/curriculum";
import { PlayIcon } from "./layout";

export type CritterId = "bobbo" | "gloop" | "puff" | "rumble" | "zuzu" | "hoot";

/** Original Critter Crew art, rendered to static inline SVG (decorative: hidden from assistive tech). */
export function Critter({ c, size = 120, className = "" }: { c: CritterId; size?: number; className?: string }) {
  const art =
    c === "bobbo" ? <Bobbo state="idle" size={size} /> :
    c === "gloop" ? <Gloop size={size} /> :
    c === "puff" ? <Puff size={size} /> :
    c === "rumble" ? <Rumble size={size} /> :
    c === "zuzu" ? <Zuzu size={size} /> : <Hoot size={size} />;
  return <span className={`critter-art ${className}`} aria-hidden="true">{art}</span>;
}

export const ages = (a: readonly [number, number]) => `${a[0]}–${a[1]}`;

export function GameCard({ game, headingLevel = 3 }: { game: SiteGame; headingLevel?: 2 | 3 | 4 }) {
  const copy = GAME_COPY[game.id];
  const H = headingLevel === 2 ? "h2" : headingLevel === 4 ? "h4" : "h3";
  return (
    <article className={`card game-card tint-${copy?.critter ?? "bobbo"}`}>
      <Critter c={copy?.critter ?? "bobbo"} size={96} />
      <div className="card-body">
        <H><a href={`/games/${game.id}`}>{game.title}</a></H>
        <p className="meta">Ages {ages(game.ages)} · {game.skillIds.map((s) => SKILLS[s]?.name ?? s).join(", ")}</p>
        <p>{copy?.oneLine ?? game.learningObjective}</p>
        <p className="card-actions">
          <a className="text-link tap-link" href={`/games/${game.id}`}>About this game</a>
          <a className="play play-small" href={game.playPath}><PlayIcon /><span>Play</span></a>
        </p>
      </div>
    </article>
  );
}

export function GuideCard({ guide, headingLevel = 3 }: { guide: Guide; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="card guide-card">
      <H><a href={`/guides/${guide.slug}`}>{guide.short}</a></H>
      <p className="meta">For ages {guide.ages}</p>
      <p>{guide.description}</p>
    </article>
  );
}

export function RefList({ keys, id = "references" }: { keys: readonly RefKey[]; id?: string }) {
  const sorted = [...new Set(keys)].sort((a, b) => REFERENCES[a].authors.localeCompare(REFERENCES[b].authors));
  return (
    <ol className="refs" aria-labelledby={id}>
      {sorted.map((k) => {
        const r = REFERENCES[k];
        return (
          <li key={k} id={`ref-${k}`}>
            {r.authors} ({r.year}). <cite>{r.title}</cite>. {r.venue}. <a href={r.url} rel="noopener">Source</a>
          </li>
        );
      })}
    </ol>
  );
}

export function Section({ title, id, children, className = "" }: { title: string; id?: string; children: React.ReactNode; className?: string }) {
  const hid = id ?? `s-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return (
    <section className={`section ${className}`} aria-labelledby={hid}>
      <div className="wrap">
        <h2 id={hid}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function PageHead({ title, lead, art }: { title: string; lead?: string; art?: CritterId }) {
  return (
    <div className="wrap page-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {art && <Critter c={art} size={130} className="head-art" />}
    </div>
  );
}
