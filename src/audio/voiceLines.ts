/**
 * Voice-line catalogue: every spoken line is also shown as a caption, so the game works with sound off.
 * `file` (optional) points at a prerecorded clip under /audio/voice/. When present it is preferred over
 * speech synthesis. Production plan: record all lines with a contracted voice actor (docs/ANIMATION_AUDIO.md).
 */
export interface VoiceLine {
  text: string;
  file?: string;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

export const OBJECT_NAMES: Record<string, { one: string; many: string }> = {
  apple: { one: "apple", many: "apples" },
  carrot: { one: "carrot", many: "carrots" },
  cookie: { one: "cookie", many: "cookies" },
  berry: { one: "strawberry", many: "strawberries" },
};

export const VOICE_LINES: Record<string, VoiceLine> = {
  "home.welcome": { text: "Welcome to BrainZippy! Tap the big button to play!" },
  "age.pick": { text: "How old are you? Tap your age!" },
  "games.pick": { text: "Tap a game to play!" },
  "games.later": { text: "New games for big kids are on the way! Let's go back." },

  "intro.hello": { text: "Hi! I'm Bobbo! I count everything... twice! Will you help me count my snacks?" },
  "intro.back": { text: "Welcome back! Let's keep counting!" },
  "intro.go": { text: "Tap the green button to start!" },

  "prompt.tap-count": { text: "Let's count the {many}! Tap each one." },
  "prompt.howMany": { text: "How many {many}?" },
  "prompt.choose-count": { text: "How many {many} do you see?" },
  "prompt.make-set": { text: "Put {nWord} {manyN} in my basket!" },

  "correct.1": { text: "Yes! {nWord}! You counted carefully!" },
  "correct.2": { text: "That's right, {nWord}! Great counting!" },
  "correct.3": { text: "{nWord}! You did it!" },
  "correct.4": { text: "Wow, {nWord}! You checked every one!" },

  "retry.1": { text: "Hmm, let's try again!" },
  "hint.lastNumber": { text: "Almost! The last number we said tells how many." },
  "hint.countAlong": { text: "Let's count them together!" },
  "hint.model": { text: "Let's count together!" },
  "hint.modelTap": { text: "It's {nWord}! Tap {nWord}." },
  "hint.tooMany": { text: "Oops, too many! Tap one in the basket to take it out." },
  "hint.tooFew": { text: "We need more! Let's add some." },
  "hint.empty": { text: "My basket is empty! Tap a snack to put it in." },
  "hint.slots": { text: "Fill every circle in my basket!" },

  "nudge.tap": { text: "Tap a {one}!" },
  "nudge.choose": { text: "Tap a number!" },
  "nudge.basket": { text: "Drag or tap a snack to put it in my basket!" },
  "nudge.done": { text: "Tap the check button when you're ready!" },

  "round.complete": { text: "You did it! You helped me count all my snacks!" },
  "achievement.earned": { text: "You earned the Counting Champ sticker!" },
  "end.choose": { text: "Play again, or try another game?" },
};

for (let n = 1; n <= 12; n++) VOICE_LINES[`number.${n}`] = { text: numberWord(n) };

export function renderLine(id: string, vars: Record<string, string | number> = {}): string {
  const line = VOICE_LINES[id];
  if (!line) return "";
  const kind = typeof vars.kind === "string" ? OBJECT_NAMES[vars.kind] : undefined;
  const n = typeof vars.n === "number" ? vars.n : undefined;
  const all: Record<string, string> = {
    ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)])),
    one: kind?.one ?? "snack",
    many: kind?.many ?? "snacks",
    manyN: n === 1 ? (kind?.one ?? "snack") : (kind?.many ?? "snacks"),
    nWord: n !== undefined ? numberWord(n) : "",
  };
  const text = line.text.replace(/\{(\w+)\}/g, (_, k: string) => all[k] ?? "");
  // Capitalise the first letter (e.g. "{nWord}! You did it!" -> "Four! You did it!")
  return text.charAt(0).toUpperCase() + text.slice(1);
}
