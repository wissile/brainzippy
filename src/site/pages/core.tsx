import { GAMES, LEVEL_RANGE, SUBJECTS_NOW } from "../catalog";
import { Critter, GameCard, GuideCard, PageHead, RefList, Section, ages } from "../components";
import { SKILLS } from "../content/curriculum";
import { FAQ } from "../content/faq";
import { GAME_COPY } from "../content/games";
import { GUIDES } from "../content/guides";
import { REFERENCES, type RefKey } from "../content/references";
import { SITE } from "../entity";
import { PlayLink } from "../layout";

const C = ({ k }: { k: RefKey }) => <a className="cite" href={`#ref-${k}`}>({REFERENCES[k].short})</a>;

export function Landing({ agePaths, subjectPaths }: { agePaths: readonly { path: string; label: string }[]; subjectPaths: readonly { path: string; label: string }[] }) {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>Story-based learning games for kids</h1>
            <p className="lead">Rhyme, count, share and solve your way around Monster Island with the Critter Crew. Spoken instructions, gentle hints, no ads.</p>
            <PlayLink big label="Play" />
            <p className="hero-note">No account needed. For ages {SITE.agesNow.min}–{SITE.agesNow.max}. <a href="#grown-ups">Grown-ups, start here</a></p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <Critter c="zuzu" size={110} className="hero-side" />
            <Critter c="bobbo" size={170} className="hero-main" />
            <Critter c="gloop" size={104} className="hero-side" />
          </div>
        </div>
      </section>

      <Section title="What is BrainZippy?" id="grown-ups">
        <p className="lead-sm">{SITE.definition} Each game is a short adventure with one clear learning goal, a character who explains the idea, and feedback that helps rather than punishes.</p>
        <ul className="fact-list">
          {SITE.facts.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </Section>

      <Section title="The games" className="tinted">
        {SUBJECTS_NOW.map((sub) => (
          <div key={sub.id}>
            {SUBJECTS_NOW.length > 1 && <h3>{sub.title}</h3>}
            <div className="card-grid">
              {sub.games.map((g) => <GameCard key={g.id} game={g} headingLevel={SUBJECTS_NOW.length > 1 ? 4 : 3} />)}
            </div>
          </div>
        ))}
        <p><a className="text-link" href="/games">Compare all games by age and skill</a></p>
      </Section>

      <Section title="How a game works">
        <ol className="steps">
          <li><strong>A story sets up a problem.</strong> Bobbo has lost his breakfast; Hoot's lanterns won't glow. The problem gives the learning a reason.</li>
          <li><strong>Your child learns by doing.</strong> They touch, slide, drag and share objects on screen, not just pick from a list.</li>
          <li><strong>A helper explains the idea.</strong> “The last number you say tells how many.” “Rhyming words sound the same at the end.”</li>
          <li><strong>Mistakes lead to help.</strong> A hint first, then a worked example, then your child finishes the problem.</li>
        </ol>
        <p><a className="text-link" href="/how-it-works">How BrainZippy works, including the exact difficulty rules</a></p>
      </Section>

      <Section title="Built on research, described honestly" className="tinted">
        <p>Our designs follow well-studied ideas about how children learn, such as straight numbered tracks, worked examples for beginners, and praise for effort rather than ability. BrainZippy itself hasn't been tested in a formal study yet, so we don't claim it's proven. <a href="/research">Read the research and what we do with it</a>.</p>
      </Section>

      <Section title="Find games by age and subject">
        <ul className="pill-list">
          {[...agePaths, ...subjectPaths].map((a) => <li key={a.path}><a href={a.path}>{a.label}</a></li>)}
        </ul>
      </Section>

      <Section title="Guides for parents" className="tinted">
        <div className="card-grid">
          {GUIDES.slice(0, 4).map((g) => <GuideCard key={g.slug} guide={g} />)}
        </div>
        <p><a className="text-link" href="/guides">All parent guides</a></p>
      </Section>
    </>
  );
}

const words = ["zero", "one", "two", "three", "four", "five"];
/** "Two first-try answers in a row (three in Balance Scale Island)", from each game's progression rules. */
function stepUpNote() {
  const counts = GAMES.map((g) => g.stepUpAfter);
  const usual = [...counts].sort((a, b) => counts.filter((c) => c === b).length - counts.filter((c) => c === a).length)[0] ?? 2;
  const odd = GAMES.filter((g) => g.stepUpAfter !== usual);
  const w = (n: number) => words[n] ?? String(n);
  const base = `${w(usual).charAt(0).toUpperCase()}${w(usual).slice(1)} first-try answers in a row`;
  return odd.length ? `${base} (${odd.map((g) => `${w(g.stepUpAfter)} in ${g.title}`).join(", ")})` : base;
}
function roundNote() {
  const lens = [...new Set(GAMES.map((g) => g.roundLength))].sort((a, b) => a - b);
  return lens.length === 1 ? `${lens[0]} puzzles` : `${lens[0]}–${lens.at(-1)} puzzles`;
}

export function HowItWorks() {
  return (
    <>
      <PageHead title="How BrainZippy works" lead="Short story adventures where children learn by doing, with a helper character, feedback that explains, and difficulty rules we publish in full." art="hoot" />
      <Section title="From story to skill">
        <p>BrainZippy starts with a story. A storm has scattered the Brain Sparks of Monster Island, and your child is the friend who brings them back. Each game is one place on the island with one problem to solve, and every finished round returns a Brain Spark.</p>
        <ol className="steps">
          <li><strong>The story sets up the problem.</strong> A short animated scene gives the learning a purpose: Bobbo needs his breakfast, the cookies must be shared fairly.</li>
          <li><strong>A demonstration comes first.</strong> The first puzzle in a new game shows what to do with a pointing hand. Then your child tries.</li>
          <li><strong>Children act on objects.</strong> They touch snacks to count them, slide a cart along a number line, move rhyming lanterns together or take weights off a balance scale. The idea is something they do, not just words on a page.</li>
          <li><strong>A helper names the idea.</strong> A Critter Crew helper explains the trick in one sentence, such as “Start with the bigger number, then count on.”</li>
          <li><strong>Feedback helps.</strong> Right answers are celebrated and the idea is named. A wrong answer brings a hint; a second brings a worked example, and your child makes the final tap.</li>
        </ol>
      </Section>
      <Section title="How difficulty changes" className="tinted">
        <p>Every game has several levels (between {LEVEL_RANGE.min} and {LEVEL_RANGE.max}). These rules are the same for every child, so you can always tell why a puzzle got harder or easier:</p>
        <table className="table">
          <thead><tr><th scope="col">When</th><th scope="col">What happens</th></tr></thead>
          <tbody>
            <tr><td>First time in a game</td><td>The first level, starting with a demonstration puzzle.</td></tr>
            <tr><td>{stepUpNote()}</td><td>The next puzzles in the round get a little harder.</td></tr>
            <tr><td>A puzzle needs three or more tries</td><td>The next puzzles in the round get a little easier.</td></tr>
            <tr><td>Right on the second try</td><td>The level stays the same and the streak starts again.</td></tr>
            <tr><td>Choosing the next puzzle</td><td>An unplayed puzzle at the current level, with a different kind of interaction from the last one where possible.</td></tr>
            <tr><td>End of a round ({roundNote()})</td><td>A Brain Spark comes back. If at least half the puzzles were right first time, the next round starts one level higher; otherwise your child plays the same level again.</td></tr>
          </tbody>
        </table>
        <p>We never use answer speed to judge a child, and there are no countdown timers. Speed isn't the same as understanding.</p>
      </Section>
      <Section title="What we deliberately leave out">
        <ul>
          <li><strong>No prize shop or coins.</strong> Expected rewards can reduce children's own interest in an activity <C k="deci1999" />. Stars and Brain Sparks mark progress; there's nothing to spend them on.</li>
          <li><strong>No ads or purchase prompts for children.</strong> Most apps for young children contain advertising <C k="meyer2019" />. BrainZippy has none, and anything about money sits behind a grown-up check.</li>
          <li><strong>No busy backgrounds during questions.</strong> Visual clutter can pull young children's attention away from learning <C k="fisher2014" />, so scenes stay calm while your child is answering.</li>
          <li><strong>No “you're so smart”.</strong> Praise describes what your child did, such as “You counted every one!” <C k="cimpian2007" />.</li>
        </ul>
      </Section>
      <Section title="Made for every child" className="tinted">
        <ul>
          <li>Every instruction is spoken and shown as a caption, and can be replayed.</li>
          <li>Every game works with touch, mouse or keyboard. Drag-and-drop always has a tap alternative.</li>
          <li>Games work with the sound off, and respect your device's reduced-motion setting.</li>
          <li>Buttons are large: at least 44 pixels, and bigger in games for younger children.</li>
        </ul>
      </Section>
      <Section title="References">
        <RefList keys={["deci1999", "meyer2019", "fisher2014", "cimpian2007"]} />
      </Section>
    </>
  );
}

const PRINCIPLES: readonly { title: string; finding: string; design: string; strength: string; refs: readonly RefKey[] }[] = [
  {
    title: "Asking “how many?” after counting",
    finding: "Children typically learn the meanings of one, two and three in turn before they understand that the last number counted is the total, often around age four.",
    design: "Counting puzzles ask “How many?” after the child counts, and “give me N” puzzles ask them to count out a set and stop.",
    strength: "Strong, replicated developmental finding.",
    refs: ["lecorre2007", "gelman1978"],
  },
  {
    title: "Straight, numbered tracks",
    finding: "Four short sessions playing a straight board game numbered 1 to 10 improved low-income preschoolers' number knowledge; the same game with colours instead of numbers did not.",
    design: "Glow Cave Hops uses an evenly spaced track with every stop numbered, and the child counts each hop.",
    strength: "Moderate to strong: randomised experiments, replicated mainly by the same research group.",
    refs: ["siegler2008", "siegler2004"],
  },
  {
    title: "Listening for rhyme before reading",
    finding: "In a long-term study, preschoolers' skill at hearing rhyme and first sounds predicted their reading and spelling years later, and practice in sorting words by sound helped most when it was combined with letters.",
    design: "Hoot's Rhyme Lanterns uses only pictures and spoken words, and its decoys share the first sound or the middle sound so children learn to listen to the end of the word.",
    strength: "Classic longitudinal and training study; later research suggests rhyme is an early step and that working with individual sounds and letters matters more for reading itself.",
    refs: ["bradley1983"],
  },
  {
    title: "Spotting what repeats",
    finding: "In a study that followed 517 children from low-income families from age 4 to 11, pattern knowledge in preschool was one of the stronger predictors of maths achievement in fifth grade.",
    design: "Puff's Pattern Parade asks children to find the unit that repeats, then continue, complete, copy and grow patterns.",
    strength: "Moderate: a large longitudinal study, but correlational, so it doesn't show that pattern practice causes later gains.",
    refs: ["rittlejohnson2017"],
  },
  {
    title: "Fractions as numbers on a line",
    finding: "A practice guide from the US Institute of Education Sciences recommends number lines as a central way to show that fractions are numbers with a size.",
    design: "In Rumble's Sleepy Trail every fraction is a spot on an evenly split trail, and children count equal jumps from zero.",
    strength: "Expert panel recommendation that draws on the research available in 2010.",
    refs: ["siegler2010"],
  },
  {
    title: "The equals sign as a balance",
    finding: "Middle school students who understood the equals sign as “both sides are the same amount” were more successful at solving equations, even after taking their maths scores into account.",
    design: "Balance Scale Island turns each equation into a scale that tips when the sides differ, and writes every balanced step as algebra beside it.",
    strength: "Moderate; correlational, with middle school students.",
    refs: ["knuth2006"],
  },
  {
    title: "Active, engaged, meaningful, social",
    finding: "A review of the science of learning suggested that apps teach best when children are mentally active, engaged with the learning goal, making meaningful connections, and interacting socially.",
    design: "Every puzzle needs a decision with numbers; characters respond to what the child does; animation is there to explain or give feedback.",
    strength: "Expert review and framework, not a single trial.",
    refs: ["hirshpasek2015"],
  },
  {
    title: "Worked examples for beginners",
    finding: "Studying worked examples reduces overload for beginners; the benefit fades, and can reverse, as learners gain expertise.",
    design: "After a second miss, a helper shows a step-by-step example, and the child then makes the final move themselves.",
    strength: "Strong for older learners; there is little direct evidence for children under seven (our assumption).",
    refs: ["sweller2019"],
  },
  {
    title: "Feedback that fits the learner",
    finding: "Feedback helped children who did not yet have a strategy but hindered some who already had one.",
    design: "Feedback is richest for early puzzles and after mistakes. Fading feedback as accuracy rises is planned.",
    strength: "Moderate; studied with older primary children (generalising to younger children is an assumption).",
    refs: ["fyfe2015"],
  },
  {
    title: "Praise for effort and strategy",
    finding: "Praise for what a child did (“you did a good job”) rather than who they are (“you're good at this”) helped young children persist after setbacks. Broad growth-mindset programmes, however, show little or no effect on achievement.",
    design: "Every spoken praise line describes an action or strategy. We don't claim BrainZippy builds a “growth mindset”.",
    strength: "Small experiments; mixed evidence for wider interventions.",
    refs: ["cimpian2007", "macnamara2023"],
  },
  {
    title: "No expected prizes",
    finding: "A meta-analysis of 128 studies found that expected tangible rewards reduced people's own interest in an activity, with larger effects for children.",
    design: "No coins, shop or “do this to earn that”. Stars and Brain Sparks only show progress.",
    strength: "Strong meta-analysis; the size of the effect is debated.",
    refs: ["deci1999"],
  },
  {
    title: "Practice spread over days",
    finding: "Children aged 5 to 7 who had lessons spread across days generalised what they learned better a week later than children who had them all at once. Recalling earlier material also helps, though research with young children is still limited.",
    design: "Rounds are short and each day's plan is a handful of games. The plan mixes review of earlier skills with new material, and a skill only counts as mastered after success on more than one day.",
    strength: "Moderate for children; consistent with a large adult literature.",
    refs: ["vlach2012", "cepeda2006", "fazio2019"],
  },
];

export function Research() {
  const all = PRINCIPLES.flatMap((p) => p.refs);
  return (
    <>
      <PageHead title="The research behind BrainZippy" lead="What the studies found, what we do because of them, and how strong the evidence is. Built on research, not proven by it: here's the difference." art="hoot" />
      <Section title="An honest note first">
        <p>The learning principles below are well researched. <strong>BrainZippy itself has not been tested in a formal study</strong>, so we don't claim it is proven to improve learning. We plan to measure learning with families who opt in, and to publish what we find, whatever it shows.</p>
      </Section>
      {PRINCIPLES.map((p, i) => (
        <Section key={p.title} title={p.title} className={i % 2 === 0 ? "tinted" : ""}>
          <dl className="evidence">
            <dt>What the research found</dt>
            <dd>{p.finding} {p.refs.map((k) => <C key={k} k={k} />)}</dd>
            <dt>What we do</dt>
            <dd>{p.design}</dd>
            <dt>How strong is the evidence?</dt>
            <dd>{p.strength}</dd>
          </dl>
        </Section>
      ))}
      <Section title="References">
        <RefList keys={all} />
      </Section>
    </>
  );
}

export function ForParents() {
  return (
    <>
      <PageHead title="BrainZippy for parents" lead="What your child learns, how we keep them safe, and simple ways to help at home." art="bobbo" />
      <Section title="What your child learns">
        <table className="table">
          <thead><tr><th scope="col">Game</th><th scope="col">Ages</th><th scope="col">Learns</th></tr></thead>
          <tbody>
            {GAMES.map((g) => (
              <tr key={g.id}>
                <td><a href={`/games/${g.id}`}>{g.title}</a></td>
                <td>{ages(g.ages)}</td>
                <td>{g.skillIds.map((s) => SKILLS[s]?.plain ?? s).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Privacy and safety" className="tinted">
        <ul>
          <li><strong>No ads, no chat, no third-party trackers.</strong> Children can't contact or be contacted by anyone.</li>
          <li><strong>Guest play needs no account.</strong> Your child's first name (optional), their monster and their progress are stored only in this browser on this device, and are not sent to us.</li>
          <li><strong>No purchase prompts for children.</strong> Anything about accounts or money sits behind a grown-up check (a multiplication question beyond the games' level).</li>
          <li><strong>We never ask for photos or location.</strong></li>
          <li><strong>You're in control.</strong> You can turn sound and music off, and delete all progress on the device from the <a href="/grown-ups">grown-ups page</a>.</li>
        </ul>
        <p>Parent accounts, which will let you keep progress across devices, are being built with consent and deletion controls designed in from the start.</p>
      </Section>
      <Section title="How to help at home">
        <ul>
          <li><strong>Play together sometimes.</strong> Ask your child to show you how a game works. Explaining is learning.</li>
          <li><strong>Little and often.</strong> A few minutes most days works better than a long session once a week. BrainZippy's daily plan stops after a few games (5 by default; you can choose 3 to 10 on the grown-ups page). See <a href="/guides/daily-learning-habit">building a daily learning habit</a>.</li>
          <li><strong>Take it off-screen.</strong> Each game page has an activity to try with everyday objects.</li>
          <li><strong>Praise the effort.</strong> “You counted carefully” rather than “you're so clever”. See <a href="/guides/when-your-child-gets-it-wrong">what to say when your child gets it wrong</a>.</li>
        </ul>
      </Section>
      <Section title="Guides for parents" className="tinted">
        <div className="card-grid">
          {GUIDES.map((g) => <GuideCard key={g.slug} guide={g} />)}
        </div>
      </Section>
    </>
  );
}

export function ForTeachers() {
  const skills = [...new Set(GAMES.flatMap((g) => g.skillIds))];
  const stdRefs = [...new Set(skills.flatMap((id) => SKILLS[id]?.standards.map((st) => st.ref) ?? []))];
  return (
    <>
      <PageHead title="BrainZippy for teachers" lead={`Short, ad-free ${SITE.subjectsPhrase} games for ages ${SITE.agesNow.min} to ${SITE.agesNow.max}, with spoken instructions, published difficulty rules and no student data collected.`} art="zuzu" />
      <Section title="Using BrainZippy in class today">
        <ul>
          <li><strong>Guest mode only.</strong> Open BrainZippy in the browser on a classroom tablet or computer. No sign-up, no student accounts, no student data sent to us. Progress stays on that device.</li>
          <li><strong>Good for stations and small groups.</strong> Rounds are eight puzzles long, instructions are spoken, and a helper character gives hints, so children can work independently.</li>
          <li><strong>Headphones recommended.</strong> Every spoken line is also captioned, and games work with sound off.</li>
          <li><strong>Not available yet:</strong> class codes, teacher dashboards and reports. We'll design these with privacy reviews before launch.</li>
        </ul>
      </Section>
      <Section title="Curriculum links (Common Core)" className="tinted">
        <p>Our own mapping of each skill to the Common Core State Standards {stdRefs.map((k) => <C key={k} k={k} />)}. “Builds toward” means the game practises an early form or a part of the idea, not the full standard. This is not an official alignment review, and it has not yet been checked by an independent educator.</p>
        <table className="table">
          <thead><tr><th scope="col">Skill</th><th scope="col">Game</th><th scope="col">Standards</th></tr></thead>
          <tbody>
            {skills.map((id) => {
              const s = SKILLS[id];
              const games = GAMES.filter((g) => g.skillIds.includes(id));
              return (
                <tr key={id}>
                  <td><strong>{s?.name ?? id}</strong><br />{s?.plain}</td>
                  <td>{games.map((g, i) => <span key={g.id}>{i > 0 && ", "}<a href={`/games/${g.id}`}>{g.title}</a></span>)}</td>
                  <td>{s?.standards.map((st) => <span key={st.code} className="std"><abbr title={st.text}>{st.code}</abbr>{st.fit === "foundation" ? " (builds toward)" : ""} </span>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
      <Section title="Lesson ideas">
        <ul>
          {GAMES.map((g) => {
            const c = GAME_COPY[g.id];
            return c ? <li key={g.id}><strong><a href={`/games/${g.id}`}>{g.title}</a>:</strong> {c.offScreen}</li> : null;
          })}
        </ul>
      </Section>
      <Section title="References" className="tinted">
        <RefList keys={stdRefs} />
      </Section>
    </>
  );
}

export function FaqPage() {
  return (
    <>
      <PageHead title="Frequently asked questions" lead="Straight answers about BrainZippy's games, learning approach, privacy and price." />
      {FAQ.map((grp, i) => (
        <Section key={grp.name} title={grp.name} className={i % 2 ? "tinted" : ""}>
          <div className="faq">
            {grp.items.map((f) => (
              <div key={f.q} className="faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
                {f.link && <p><a className="text-link" href={f.link.href}>{f.link.label}</a></p>}
              </div>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

export function About() {
  return (
    <>
      <PageHead title="About BrainZippy" lead={SITE.definition} art="puff" />
      <Section title="Why we're building it">
        <p>Many apps for young children are full of ads, timers and prize shops, and few explain what a child is actually learning. BrainZippy aims to be the opposite: one clear learning goal per game, feedback that teaches, and nothing that pressures children to keep playing or to buy things.</p>
      </Section>
      <Section title="What we believe" className="tinted">
        <ul>
          <li><strong>Learning should be something children do</strong>, with their hands and their heads, not something they watch.</li>
          <li><strong>Mistakes are part of learning.</strong> No buzzers, no lost lives.</li>
          <li><strong>Parents deserve straight answers.</strong> We publish our difficulty rules and the research we rely on, and we say what hasn't been tested yet.</li>
          <li><strong>Children's privacy comes first.</strong> No ads, no trackers, no chat, and as little data as possible.</li>
          <li><strong>Everything is original.</strong> Our characters, art, music and voice lines are made for BrainZippy.</li>
        </ul>
      </Section>
      <Section title="Where we are now">
        <p>BrainZippy is in early access. Today there are {GAMES.length} games ({SUBJECTS_NOW.map((s) => `${s.games.length} ${s.title === "English" ? s.title : s.title.toLowerCase()}`).join(", ")}) for ages {SITE.agesNow.min} to {SITE.agesNow.max}. We're working on more maths and English, including reading and spelling, then science and logic, for ages {SITE.agesPlanned.min} to {SITE.agesPlanned.max}. We add a game only when it's finished and tested.</p>
        <p>Meet the Critter Crew: Bobbo, Zuzu, Gloop, Hoot, Rumble and Puff, the friends who guide children around Monster Island.</p>
        <div className="crew-row" aria-hidden="true">
          {(["bobbo", "zuzu", "gloop", "hoot", "rumble", "puff"] as const).map((c) => <Critter key={c} c={c} size={84} />)}
        </div>
      </Section>
      <Section title="Find out more" className="tinted">
        <ul className="pill-list">
          <li><a href="/how-it-works">How it works</a></li>
          <li><a href="/research">Research</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/games">All games</a></li>
        </ul>
      </Section>
    </>
  );
}
