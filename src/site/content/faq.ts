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
        a: "BrainZippy is a website of story-based learning games for children. The games available today teach early maths: counting, adding on a number line, adding within 20 and fair sharing. Each game is a short adventure on Monster Island with a friendly character who explains the idea.",
        link: { href: "/how-it-works", label: "How BrainZippy works" },
      },
      {
        q: "What ages is BrainZippy for?",
        a: "Today's games are designed for children aged about 4 to 9. Every instruction is spoken aloud, so children don't need to read. We are building games for ages 3 to 14, and we will add them only when they are finished and tested.",
        link: { href: "/ages/3-5", label: "Games for ages 3–5" },
      },
      {
        q: "Which subjects does BrainZippy cover?",
        a: "Maths, for now. Reading, spelling, science and logic games are planned. We would rather publish one subject done well than many half-finished ones.",
        link: { href: "/subjects/math", label: "Maths games" },
      },
      {
        q: "Does my child need to be able to read?",
        a: "No. Every instruction is spoken and also shown as a caption, number buttons show dot patterns as well as numerals, and each game starts with a character showing what to do.",
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
        a: "Each game has four levels. Within a round of eight puzzles, two first-try answers in a row move to harder puzzles, and needing three tries moves back to easier ones. Each finished round starts the next round one level higher. The same published rules apply to every child.",
        link: { href: "/how-it-works", label: "The difficulty rules" },
      },
      {
        q: "What happens when my child gets an answer wrong?",
        a: "Nothing bad. The first wrong answer brings a hint that explains the idea. A second brings a step-by-step worked example, and then your child makes the final tap themselves. There are no buzzers, lost lives or timers.",
        link: { href: "/guides/when-your-child-gets-it-wrong", label: "What to say when your child gets it wrong" },
      },
      {
        q: "Is BrainZippy proven to improve maths?",
        a: "Not yet, and we won't claim it is. The design is built on research about how children learn number, such as number-line board games, worked examples and praise for effort. BrainZippy itself has not been tested in a formal study. We plan to measure learning with families who opt in and publish what we find.",
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
      {
        q: "Is BrainZippy free?",
        a: "Guest play is free to try today. We plan to offer a family subscription later; prices will be shown clearly to grown-ups before anything is charged, and children never see purchase prompts.",
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
        a: "Yes, in guest mode on classroom devices, with no student accounts and no student data collected. Classroom features such as class codes and teacher reports are not available yet.",
        link: { href: "/for-teachers", label: "BrainZippy for teachers" },
      },
    ],
  },
];
