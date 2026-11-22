import { LEVEL_RANGE, LIBRARIES_NOW } from "../catalog";
import { SITE } from "../entity";

const AGES = `${SITE.agesNow.min} to ${SITE.agesNow.max}`;
const ONE_GAME = LIBRARIES_NOW.filter((l) => l.games.length === 1 && l.id !== "english").length;
const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
/** "Nine libraries" (counted from data), for the subjects answer. */
const NEW_LIBRARIES = `${WORDS[ONE_GAME] ?? ONE_GAME} other ${ONE_GAME === 1 ? "library" : "libraries"}`;

/**
 * Frequently asked questions. Answers are plain text so the same words appear on the page and in
 * the FAQPage JSON-LD (which must match visible content). Keep every answer consistent with entity.ts.
 */
export interface Faq {
  q: string;
  a: string;
  link?: { href: string; label: string };
}

export interface FaqGroup {
  name: string;
  items: readonly Faq[];
}

export const FAQ: readonly FaqGroup[] = [
  {
    name: "About BrainZippy",
    items: [
      {
        q: "What is BrainZippy?",
        a: `${SITE.definition} Each game is a short adventure on Monster Island with a friendly character who explains the idea.`,
        link: { href: "/how-it-works", label: "How BrainZippy works" },
      },
      {
        q: "What ages is BrainZippy for?",
        a: `Today's games are designed for children aged about ${AGES}. Every instruction is spoken aloud and captioned. We are building games for ages ${SITE.agesPlanned.min} to ${SITE.agesPlanned.max}, and we add them only when they are finished and tested.`,
        link: { href: "/ages/3-5", label: "Games for ages 3–5" },
      },
      {
        q: "Which subjects does BrainZippy cover?",
        a: `Today there are ${LIBRARIES_NOW.length} learning libraries: ${SITE.subjectsPhrase}. The maths games run from counting to fractions and equations, and English starts with listening games about rhyme. ${NEW_LIBRARIES} started with one story game each, from coding with Toggle to naming feelings with Snug. More games are planned in every library, including reading and spelling. We would rather publish a few games done well than many half-finished ones.`,
        link: { href: "/games", label: "All games by subject" },
      },
      {
        q: "Does my child need to be able to read?",
        a: "Not for the games for younger children. Every instruction is spoken and also shown as a caption, answers are pictures, shapes or numbers, and each game starts with a character showing what to do. Games for older children use more text, such as written fractions and equations, budgets and test results, and short pretend messages to inspect in Fenn's Message Mystery (each one can be read aloud). The top level of Balance Scale Island has short written word stories.",
      },
      {
        q: "Does it work on tablets and phones?",
        a: "Yes. BrainZippy runs in the web browser on tablets, phones, laptops and desktop computers, with no app to install. It works with touch, mouse or keyboard.",
      },
    ],
  },
  {
    name: "Learning",
    items: [
      {
        q: "How does BrainZippy decide what my child plays next?",
        a: `Each game has between ${LEVEL_RANGE.min} and ${LEVEL_RANGE.max} levels. Within a round of eight puzzles, a few first-try answers in a row move to harder puzzles, and needing three tries moves back to easier ones. After a round where at least half the answers were right first time, the next round starts one level higher. Each day's short plan also mixes in review of earlier skills. The same published rules apply to every child.`,
        link: { href: "/how-it-works", label: "The difficulty rules" },
      },
      {
        q: "What happens when my child gets an answer wrong?",
        a: "Nothing bad. The first wrong answer brings a hint that explains the idea. A second brings a step-by-step worked example, and then your child makes the final tap themselves. There are no buzzers, lost lives or timers.",
        link: { href: "/guides/when-your-child-gets-it-wrong", label: "What to say when your child gets it wrong" },
      },
      {
        q: "Is BrainZippy proven to improve learning?",
        a: "Not yet, and we won't claim it is. The design is built on research about how children learn, such as number-line board games, worked examples and praise for effort. BrainZippy itself has not been tested in a formal study. We plan to measure learning with families who opt in and publish what we find.",
        link: { href: "/research", label: "The research behind BrainZippy" },
      },
      {
        q: "Does BrainZippy use speed to judge my child?",
        a: "No. Answer speed is never used to decide your child's level, and there are no countdown timers. Children can take as long as they need.",
      },
    ],
  },
  {
    name: "Privacy and safety",
    items: [
      {
        q: "Does BrainZippy show ads?",
        a: "No. There are no ads, no third-party trackers and no chat between children.",
      },
      {
        q: "Do children need an account?",
        a: "No. Children can play as guests. In guest play, a child's first name (if you enter one), their monster and their progress are stored only in that browser on that device.",
        link: { href: "/for-parents", label: "Privacy for parents" },
      },
      {
        q: "Will my child see purchase prompts?",
        a: "No. Children never see purchase prompts. Anything about accounts or money sits behind a grown-up check.",
      },
      SITE.billing
        ? {
            q: "Is BrainZippy free?",
            a: "Every device gets 14 days of free play with no account or card. Then a grown-up can add a card for a 14-day free trial, after which the family plan costs $6.99 a month until you cancel. Cancel anytime from the parent page; children never see prices or purchase prompts. Free-access codes, which need no card, are available for schools and some promotions.",
            link: { href: "/pricing", label: "Pricing and renewal terms" },
          }
        : {
            q: "Is BrainZippy free?",
            a: "Yes, BrainZippy is free while we're in early access. Every game is open, with no account, no card and nothing to buy, and children never see prices or purchase prompts. If that changes, we'll say so clearly on this site first.",
          },
      {
        q: "How do I delete my child's progress?",
        a: "Open the grown-ups page inside the game, answer the grown-up check, and choose to delete all progress on the device. Clearing your browser's site data for brainzippy.com also removes it.",
        link: { href: "/grown-ups", label: "Open the grown-ups page" },
      },
    ],
  },
  {
    name: "Classrooms",
    items: [
      {
        q: "Can teachers use BrainZippy in class?",
        a: SITE.billing
          ? `Yes, in guest mode on classroom devices, with no student accounts and no student data collected. Each device gets the same free play and trial as a family, and schools can ask us for a free school code at ${SITE.email}. Classroom features such as class codes and teacher reports are not available yet.`
          : `Yes, in guest mode on classroom devices, with no student accounts and no student data collected. It's free while we're in early access. Classroom features such as class codes and teacher reports are not available yet; tell us what your class needs at ${SITE.email}.`,
        link: { href: "/for-teachers", label: "BrainZippy for teachers" },
      },
    ],
  },
  {
    name: "Contact",
    items: [
      {
        q: "How do I contact BrainZippy?",
        a: `Email us at ${SITE.email} with questions, feedback or a problem. We read every message. Please don't include your child's full name or other personal details about them.`,
      },
    ],
  },
];
