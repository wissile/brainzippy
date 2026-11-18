/**
 * Open Graph card designs (1200×630) and the square logo, as static HTML documents. Rendered to PNG
 * by scripts/prerender-images.mjs with Playwright's Chromium and committed under public/og/.
 * All art is the original Critter Crew.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { GAMES } from "./catalog";
import { Critter, type CritterId } from "./components";
import { SKILLS } from "./content/curriculum";
import { GAME_COPY } from "./content/games";
import { GUIDES } from "./content/guides";
import { SITE } from "./entity";

export interface OgJob {
  file: string;
  width: number;
  height: number;
  html: string;
}

const css = (fontFace: string) => `${fontFace}
*{box-sizing:border-box}body{margin:0}
.card{width:1200px;height:630px;position:relative;overflow:hidden;background:linear-gradient(#8FD3FF 0%,#CDEBFF 55%,#FFF6DA 100%);font-family:"Baloo 2",sans-serif;color:#2B2140}
.hill{position:absolute;left:0;bottom:0}
.copy{position:absolute;left:72px;top:64px;width:640px}
.brand{font-size:56px;font-weight:800;line-height:1;margin-bottom:34px}
.b{color:#fff;-webkit-text-stroke:3px #2B2140;paint-order:stroke fill;text-shadow:0 4px 0 #2B2140}
.z{color:#FFD43B;-webkit-text-stroke:3px #2B2140;paint-order:stroke fill;text-shadow:0 4px 0 #2B2140}
h1{font-size:68px;line-height:1.02;margin:0 0 22px;font-weight:800;letter-spacing:-0.01em}
h1.long{font-size:56px}
.tag{display:inline-block;font:700 30px/1 Nunito,sans-serif;background:#fff;border:4px solid #2B2140;border-radius:999px;padding:12px 26px}
.art{position:absolute;right:56px;bottom:40px;display:flex;align-items:flex-end;gap:8px}
.art .critter-art{line-height:0}
.logo{width:512px;height:512px;background:#FFF6DA;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Baloo 2",sans-serif;border-radius:0}
.logo .brand{font-size:76px;margin:6px 0 0}`;

function doc(fontFace: string, body: React.ReactNode) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(fontFace)}</style></head><body>${renderToStaticMarkup(<>{body}</>)}</body></html>`;
}

const Brand = () => (
  <div className="brand"><span className="b">Brain</span><span className="z">Zippy</span></div>
);

function Card({ title, tag, critters }: { title: string; tag: string; critters: readonly { c: CritterId; size: number }[] }) {
  return (
    <div className="card">
      <svg className="hill" width="1200" height="180" viewBox="0 0 1200 180" aria-hidden="true"><ellipse cx="600" cy="390" rx="700" ry="380" fill="#8FD88A" stroke="#2B2140" strokeWidth="6" /></svg>
      <div className="copy">
        <Brand />
        <h1 className={title.length > 38 ? "long" : undefined}>{title}</h1>
        <span className="tag">{tag}</span>
      </div>
      <div className="art">{critters.map((k, i) => <Critter key={i} c={k.c} size={k.size} />)}</div>
    </div>
  );
}

export function ogJobs(fontFace: string): OgJob[] {
  const jobs: OgJob[] = [];
  const card = (file: string, el: React.ReactNode) => jobs.push({ file, width: 1200, height: 630, html: doc(fontFace, el) });
  card("default.png", <Card title="Story-based maths games for kids" tag={`Ages ${SITE.agesNow.min}–${SITE.agesNow.max} · No ads`} critters={[{ c: "zuzu", size: 150 }, { c: "bobbo", size: 250 }, { c: "gloop", size: 140 }]} />);
  for (const g of GAMES) {
    const c = GAME_COPY[g.id];
    if (!c) continue;
    card(`games/${g.id}.png`, <Card title={g.title} tag={`Ages ${g.ages[0]}–${g.ages[1]} · ${SKILLS[g.skillIds[g.skillIds.length > 1 ? 1 : 0]!]?.name ?? "Maths"}`} critters={[{ c: c.critter, size: 300 }]} />);
  }
  for (const g of GUIDES) card(`guides/${g.slug}.png`, <Card title={g.short} tag="Guide for parents" critters={[{ c: "hoot", size: 270 }]} />);
  jobs.push({
    file: "logo.png",
    width: 512,
    height: 512,
    html: doc(fontFace, <div className="logo"><Critter c="bobbo" size={300} /><Brand /></div>),
  });
  return jobs;
}
