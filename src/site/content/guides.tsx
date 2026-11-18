/**
 * Parent guides (/guides/<slug>). Original writing; every research claim carries an in-text <Cite>
 * that links to the reference list rendered under the guide. Rules: docs/CONTENT_QUALITY.md.
 */
import type { ReactNode } from "react";
import { REFERENCES, type RefKey } from "./references";

export function Cite({ k }: { k: RefKey }) {
  return (
    <a className="cite" href={`#ref-${k}`}>
      ({REFERENCES[k].short})
    </a>
  );
}

export interface Guide {
  slug: string;
  title: string;
  /** Shorter heading used in cards and breadcrumbs. */
  short: string;
  description: string;
  published: string;
  updated: string;
  ages: string;
  games: readonly string[];
  takeaways: readonly string[];
  body: () => ReactNode;
  refs: readonly RefKey[];
}

const G = (g: Guide) => g;

export const GUIDES: readonly Guide[] = [
  G({
    slug: "teaching-counting-to-preschoolers",
    title: "How to teach counting to a 3, 4 or 5 year old (beyond reciting numbers)",
    short: "Teaching counting to preschoolers",
    description: "Reciting 1 to 10 isn't the same as counting. The five counting principles, the “how many?” test, and simple daily activities that help preschoolers really count.",
    published: "2026-11-17",
    updated: "2026-11-17",
    ages: "3–5",
    games: ["counting-adventure"],
    takeaways: [
      "Saying the numbers in order is only one part of counting.",
      "Ask “So how many?” after your child counts. It shows whether they know the last number is the total.",
      "Practise “give me N” as well as “how many?”: stopping at the right number is its own skill.",
    ],
    refs: ["gelman1978", "lecorre2007", "clements1999"],
    body: () => (
      <>
        <p>Many parents are surprised when a child who can happily recite “one, two, three… ten” can't tell them how many crackers are on the plate. That isn't a problem. Reciting the number words is a song your child has learned. Counting is a set of ideas that take time to fit together.</p>
        <h2>What counting really involves</h2>
        <p>Researchers Rochel Gelman and Randy Gallistel described the principles behind counting <Cite k="gelman1978" />. In everyday terms:</p>
        <ol>
          <li><strong>One number for each thing.</strong> Every object gets exactly one number word, with none skipped and none counted twice.</li>
          <li><strong>Always the same order.</strong> The numbers are said in the same sequence every time.</li>
          <li><strong>The last number tells how many.</strong> When you finish counting, the last number you said is the size of the group.</li>
          <li><strong>Anything can be counted.</strong> Apples, claps and jumps all count the same way.</li>
          <li><strong>Order doesn't matter.</strong> You can start with any object, and you'll get the same answer.</li>
        </ol>
        <p>Children don't learn these all at once. Studies that ask children to “give me three fish” find that most learn the meaning of “one”, then “two”, then “three” (sometimes “four”), one at a time, before the big idea clicks that counting tells you the total. On average that happens around age four, with a wide normal range <Cite k="lecorre2007" />.</p>
        <h2>The “how many?” test</h2>
        <p>Here's a simple way to see where your child is. Put five blocks in a row and ask them to count. When they finish, ask: “So how many blocks are there?”</p>
        <ul>
          <li>If they say “five” straight away, they understand that the last number is the answer.</li>
          <li>If they count again from the start, or say a different number, they're still building that idea. Model it warmly: “One, two, three, four, five. <em>Five</em> blocks!”</li>
        </ul>
        <p>Then try the harder direction: “Can you give me four blocks?” A child who grabs a handful, or keeps counting past four, is showing you that making a set is still new. This is why BrainZippy's counting game includes both kinds of puzzle.</p>
        <h2>Seeing small amounts at a glance</h2>
        <p>Alongside counting, children learn to recognise one, two or three objects instantly, without counting. This is called subitizing, and it helps children check their counting and see bigger numbers as smaller parts <Cite k="clements1999" />. Dice, dominoes and finger patterns are a great way to practise. There's more in our <a href="/guides/what-is-subitizing">guide to subitizing</a>.</p>
        <h2>Everyday ways to practise</h2>
        <ul>
          <li><strong>Count things that move.</strong> Stairs, jumps and claps make one-number-per-thing physical.</li>
          <li><strong>Touch as you count.</strong> Encourage your child to touch or move each object as they say its number. Moving counted items to one side stops double counting.</li>
          <li><strong>Mix it up and count again.</strong> Spread the same five toys out, then bunch them up. Is it still five? This builds the idea that arrangement doesn't change the number.</li>
          <li><strong>Make sets at mealtimes.</strong> “Please put three spoons on the table.” Then check together.</li>
          <li><strong>Keep it short.</strong> A few minutes, a few times a day, beats one long session.</li>
        </ul>
        <h2>How BrainZippy helps</h2>
        <p>In <a href="/games/counting-adventure">Bobbo's Breakfast</a>, each snack lights up and says its number when your child touches it, so there's one number per object. After counting, the game asks “How many?”, and “Give me N” puzzles ask your child to fill Bobbo's basket and stop at the right number. If your child gets stuck, Hoot counts along with them, then lets them make the final tap.</p>
        <p>A game can give practice and feedback, but counting with you, about real things, matters just as much. Use the game as one of many ways to count, not the only one.</p>
      </>
    ),
  }),
  G({
    slug: "what-is-subitizing",
    title: "What is subitizing? Helping children see “how many” at a glance",
    short: "What is subitizing?",
    description: "Subitizing means knowing how many objects there are without counting. What it is, why it matters for early maths, and easy dice, finger and ten-frame games to try.",
    published: "2026-11-17",
    updated: "2026-11-18",
    ages: "3–6",
    games: ["counting-adventure"],
    takeaways: [
      "Subitizing is recognising small amounts (about 1 to 4 or 5) instantly, without counting.",
      "Larger amounts can be “seen” as parts, such as 5 and 2 in a ten frame.",
      "Quick-look games with dice, fingers and ten frames are easy ways to practise.",
    ],
    refs: ["clements1999", "gelman1978"],
    body: () => (
      <>
        <p>Glance at three coins on a table and you know there are three. You didn't count them. That instant recognition is called <strong>subitizing</strong>, and it's one of the building blocks of number sense.</p>
        <h2>Two kinds of subitizing</h2>
        <p>Mathematics educator Douglas Clements describes two kinds <Cite k="clements1999" />:</p>
        <ul>
          <li><strong>Perceptual subitizing</strong> is seeing a small amount, up to about four or five, and just knowing how many.</li>
          <li><strong>Conceptual subitizing</strong> is seeing a bigger amount as smaller parts you recognise. On a domino with six dots arranged as two rows of three, you might see “three and three make six”.</li>
        </ul>
        <p>Conceptual subitizing is where counting starts to turn into adding. A child who sees seven in a ten frame as “a row of five and two more” is already thinking about how numbers are made.</p>
        <h2>Why it matters</h2>
        <p>Subitizing gives children a way to check their counting (“I counted four, and it looks like four”) and helps them understand that a number is a whole amount, not just the last word in a list. It also makes later strategies faster: a child who instantly sees five on one hand only needs to count on the extra fingers.</p>
        <p>Counting and subitizing support each other. Counting gives children a reliable method for any amount, built on principles such as one number for each thing and the last number telling how many <Cite k="gelman1978" />. Subitizing gives them quick, structured pictures of small amounts <Cite k="clements1999" />.</p>
        <h2>Simple quick-look games</h2>
        <ul>
          <li><strong>Flash and hide.</strong> Show a few objects under your hand for two seconds, then cover them. “How many did you see?” Start with one to three.</li>
          <li><strong>Dice spotting.</strong> Roll a die and call out the number without counting the dots. Dice patterns are ideal because they're always arranged the same way.</li>
          <li><strong>Finger flash.</strong> Hold up fingers for a moment. Later, use two hands: “five and two”.</li>
          <li><strong>Egg-box ten frame.</strong> Cut an egg box to ten cups (two rows of five) and drop in pasta pieces. Fill the top row first, so seven looks like a full row and two more.</li>
          <li><strong>Talk about how they saw it.</strong> “How did you know it was six?” “I saw three and three.” That conversation is the real learning.</li>
        </ul>
        <h2>What if my child counts instead?</h2>
        <p>That's completely fine. Recognising very small groups usually comes first, and bigger or structured amounts come later with practice. If your child counts dots one by one, try showing the same arrangement again a few times, then ask them to “just look” before they count. Over time the counting becomes a way to check, not the only way to know. If they guess wildly, go back to one, two and three, and use the same dice or finger patterns each time.</p>
        <h2>How BrainZippy uses it</h2>
        <p>Some puzzles in <a href="/games/counting-adventure">Bobbo's Breakfast</a> show a small scattered group or a ten frame and ask how many, without asking your child to touch each one. The number buttons show dot patterns as well as numerals, so children connect the pattern, the word and the written number. Easier levels use small amounts; ten-frame puzzles appear at the higher levels.</p>
        <p>Keep it playful. If your child needs to count instead, that's fine. Counting is the reliable method, and quick recognition grows with practice.</p>
      </>
    ),
  }),
  G({
    slug: "number-lines-for-kids",
    title: "Why number lines help children understand adding",
    short: "Number lines for kids",
    description: "How straight, evenly spaced number lines help young children understand numbers and addition, what the research found, and board games and activities to try at home.",
    published: "2026-11-17",
    updated: "2026-11-17",
    ages: "4–8",
    games: ["glow-cave-hops"],
    takeaways: [
      "A number line shows that numbers have an order and a size: 8 is further along than 3.",
      "Short sessions with a straight, numbered board game improved preschoolers' number knowledge in experiments.",
      "Watch for the common slip of counting the starting square as a hop.",
    ],
    refs: ["siegler2004", "siegler2008", "hirshpasek2015"],
    body: () => (
      <>
        <p>A number line is just numbers placed in order, evenly spaced, along a straight line. It looks simple, but it carries a powerful idea: numbers have a <em>size</em>, and bigger numbers are further along.</p>
        <h2>The mental number line</h2>
        <p>Psychologists Robert Siegler and Julie Booth asked children to mark where numbers belong on a line with 0 at one end and 100 at the other <Cite k="siegler2004" />. Young children tended to bunch the bigger numbers together, as if 60 and 90 were about the same. As children got older their estimates spread out evenly, and children whose estimates were more accurate also tended to score higher on maths achievement tests. That's a correlation, not proof that number lines cause better maths, but it shows how closely the two are linked.</p>
        <h2>What a board game can do</h2>
        <p>In a well-known experiment, Siegler and Geetha Ramani had preschoolers from low-income backgrounds play a simple board game with squares numbered 1 to 10 in a straight line <Cite k="siegler2008" />. Children said the numbers aloud as they moved. After four short sessions of about 15 minutes, their number knowledge improved compared with children who played the same game with coloured squares instead of numbers. Two details matter: the track was <strong>straight</strong> and <strong>numbered</strong>, and children <strong>said the numbers</strong> as they moved.</p>
        <h2>From moving to adding</h2>
        <p>A number line turns adding into movement. “4 + 3” becomes: start on 4, hop forward three times, land on 7. Each hop is one more. That gives children a picture of addition they can see and check, before they learn number facts by heart.</p>
        <p>The most common slip is counting the starting square as the first hop (“four, five, six”, landing on 6). If your child's answers are often one short, have them say the <em>next</em> number on each hop: “four… five, six, seven”.</p>
        <h2>Ideas to try at home</h2>
        <ul>
          <li><strong>Play straight-track board games</strong> and have your child count each square as they move their piece.</li>
          <li><strong>Make a floor number line</strong> with tape or chalk from 0 to 10, and jump along it: “Start on 2, jump 3. Where are you?”</li>
          <li><strong>Use a ruler or tape measure</strong> as a ready-made number line.</li>
          <li><strong>Ask “which is bigger?”</strong> about two numbers, then find them on the line to check.</li>
        </ul>
        <h2>How BrainZippy uses number lines</h2>
        <p>In <a href="/games/glow-cave-hops">Glow Cave Hops</a> your child moves a mine cart along a straight, evenly spaced track with every stop numbered. The puzzle “Hop 3 spaces from 4” asks them to count on, and each hop lights a crystal. The track grows from 0–5 up to 0–20 as your child progresses. We designed it this way because of the board game research above and the wider finding that learning apps work best when children are actively thinking, not just tapping <Cite k="hirshpasek2015" />.</p>
        <p>BrainZippy's own game hasn't been tested in a study, so we don't claim it produces the same results. But the design follows what the research suggests matters.</p>
      </>
    ),
  }),
  G({
    slug: "making-ten-addition-strategy",
    title: "Making ten: the addition strategy that unlocks sums to 20",
    short: "The making ten strategy",
    description: "How the “make ten” strategy helps children add numbers like 8 + 5, why counting on comes first, and ten-frame and finger games to practise at home.",
    published: "2026-11-17",
    updated: "2026-11-18",
    ages: "5–8",
    games: ["sky-balloon-race"],
    takeaways: [
      "Counting on from the bigger number comes first: 8… 9, 10, 11, 12, 13.",
      "Making ten splits a sum: 8 + 5 = 8 + 2 + 3 = 10 + 3 = 13.",
      "Children need to know the pairs that make ten before the strategy feels easy.",
    ],
    refs: ["ccss", "sweller2019"],
    body: () => (
      <>
        <p>Once children can count reliably, adding usually starts with <strong>counting all</strong>: to work out 8 + 5, they count out eight, count out five, and then count everything from one. It works, but it's slow, and it's easy to lose track. Two strategies make addition much easier.</p>
        <h2>Step 1: counting on</h2>
        <p>Instead of starting from one, start from the bigger number and count on the rest: “eight… nine, ten, eleven, twelve, thirteen.” Two tips help:</p>
        <ul>
          <li><strong>Start with the bigger number.</strong> 2 + 9 is easier as 9 + 2. Adding works in either order, and that's worth pointing out.</li>
          <li><strong>Don't count the start number twice.</strong> The first number said aloud after “eight” is “nine”.</li>
        </ul>
        <h2>Step 2: making ten</h2>
        <p>Our number system is built on tens, so getting to ten first makes sums that cross ten much easier. For 8 + 5:</p>
        <ol>
          <li>How many more does 8 need to make 10? <strong>2.</strong></li>
          <li>Take 2 from the 5. That leaves <strong>3</strong>.</li>
          <li>10 and 3 make <strong>13</strong>.</li>
        </ol>
        <p>US first-grade standards name exactly this approach, with the example 8 + 6 = 8 + 2 + 4 = 10 + 4 = 14, alongside counting on <Cite k="ccss" />. It turns a hard fact into two easy ones.</p>
        <h2>What children need first</h2>
        <p>Making ten relies on knowing the <strong>pairs that make ten</strong> (1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5) and on being able to split a small number (5 is 2 and 3). If those are shaky, practise them first. Otherwise the strategy feels like extra steps rather than a shortcut.</p>
        <h2>Games to play at home</h2>
        <ul>
          <li><strong>Ten frames.</strong> Draw two rows of five boxes. Put 8 counters in, then add 5 more: watch the first frame fill to ten and the rest spill into a second frame.</li>
          <li><strong>Fingers to ten.</strong> Hold up some fingers. Your child shows how many more make ten.</li>
          <li><strong>Egg boxes.</strong> A ten-cup egg box makes “how many more to fill it?” very visual.</li>
          <li><strong>Talk it through.</strong> “How did you work out 9 + 4?” Children who explain their strategy understand it better than children who just give answers.</li>
        </ul>
        <h2>How BrainZippy builds it</h2>
        <p>In <a href="/games/sky-balloon-race">Sky Balloon Race</a>, sums start small, so counting on is easy to learn, then grow to sums from 6 to 10, then to sums that cross ten, and finally to teen numbers up to 20. If your child misses, Puff reminds them to start with the bigger number. After a second miss, the game shows a worked example in two ten frames: the bigger number fills in, then the rest are counted on, so your child sees the first ten fill before the count continues. Worked examples like this help beginners, though most of that research is with older students <Cite k="sweller2019" />. Your child only sees one after two misses, so the support fades away as they start getting answers right first time.</p>
      </>
    ),
  }),
  G({
    slug: "fair-sharing-introduction-to-division",
    title: "Fair sharing: how young children start to understand division",
    short: "Fair sharing and early division",
    description: "Long before division facts, children share things fairly by dealing them out. How fair sharing builds the idea of division, and simple sharing games for ages 5–9.",
    published: "2026-11-17",
    updated: "2026-11-17",
    ages: "5–9",
    games: ["cookie-kitchen"],
    takeaways: [
      "Dealing out one at a time is a child's first division strategy.",
      "Knowing that fair shares hold the same number, and checking it, develops gradually.",
      "Leftovers are a great conversation starter, not a mistake.",
    ],
    refs: ["frydman1988", "ccss"],
    body: () => (
      <>
        <p>Give a young child some sweets and two friends, and you'll often see them deal: “one for you, one for you, one for me…”. That's division in action, long before anyone mentions the word.</p>
        <h2>Sharing comes before division facts</h2>
        <p>Division asks two related questions. If 12 cookies are shared between 3 plates, how many go on each plate? (That's sharing.) And how many plates of 4 can you make from 12 cookies? (That's grouping.) Children usually meet the sharing idea first, through everyday fairness.</p>
        <p>Research on how young children share shows that many can deal out items fairly from an early age, but understanding <em>what it means</em> takes longer. In studies by Olivia Frydman and Peter Bryant, young children who had shared items out fairly didn't always realise that, if they counted one share, every other share would hold the same number <Cite k="frydman1988" />. Making that link is an important step.</p>
        <h2>From “fair” to “how many each?”</h2>
        <p>Three questions help children move from dealing to thinking:</p>
        <ul>
          <li><strong>“Is it fair?”</strong> Can they check that every plate has the same?</li>
          <li><strong>“How do you know?”</strong> Counting one plate and comparing the rest is real mathematical reasoning.</li>
          <li><strong>“How many does each friend get?”</strong> This is the answer to a division problem: 12 shared between 3 is 4 each.</li>
        </ul>
        <p>In the US, third-grade standards describe division in exactly these terms: 56 ÷ 8 can be read as the number of objects in each share when 56 objects are split equally into 8 shares <Cite k="ccss" />. Fair sharing is the foundation for that.</p>
        <h2>Common moves to look out for</h2>
        <p>Some children give out handfuls rather than one at a time, then move items between plates until it looks even. That's a reasonable strategy, so ask them to count each plate to check. Others deal carefully but then count <em>all</em> the items again to answer “how many each?”. Gently point to one plate: “How many on this one? So how many on the others?” That small question is the link between sharing and division.</p>
        <h2>What about leftovers?</h2>
        <p>Try sharing 7 crackers between 2 plates. Your child deals out three each and has one left. What should happen? Break it in half? Save it? There's no wrong answer. This is a natural first look at remainders and even fractions.</p>
        <h2>Sharing games to play at home</h2>
        <ul>
          <li><strong>Teddy picnic.</strong> Share snacks or blocks between toys. Ask your child to predict how many each will get before dealing.</li>
          <li><strong>Change the number of plates.</strong> Share 12 between 2, then 3, then 4. What happens to each share as there are more plates?</li>
          <li><strong>Card games.</strong> Dealing a deck of cards to players is sharing practice in disguise.</li>
        </ul>
        <h2>How BrainZippy uses fair sharing</h2>
        <p>In <a href="/games/cookie-kitchen">Cookie Kitchen</a>, your child shares Rumble's cookies between party plates by dragging (or tapping) them one at a time. When every plate has the same, the game asks how many each plate gets. If the plates aren't fair, it says so and invites your child to move a cookie. Puzzles start with 2 plates and up to 8 cookies and grow to 5 plates and up to 20 cookies.</p>
      </>
    ),
  }),
  G({
    slug: "daily-learning-habit",
    title: "Building a short daily learning habit (that your child actually enjoys)",
    short: "Building a daily learning habit",
    description: "Why little and often beats long sessions for young learners, what research on spacing and habits suggests, and practical tips for a five-to-ten-minute daily routine.",
    published: "2026-11-17",
    updated: "2026-11-18",
    ages: "4–9",
    games: [],
    takeaways: [
      "Short, spaced practice tends to stick better than one long session.",
      "Tie the routine to something that already happens every day.",
      "Stop while it's still fun. Ending on a high makes tomorrow easier.",
    ],
    refs: ["cepeda2006", "vlach2012", "fazio2019", "lally2010", "deci1999"],
    body: () => (
      <>
        <p>Children don't need long study sessions to make progress. For young learners, a few focused minutes on most days often achieves more than an hour once a week, and it's far easier to keep up.</p>
        <h2>Why little and often works</h2>
        <p>One of the most reliable findings in learning research is the <strong>spacing effect</strong>: practice spread out over time is remembered better than the same amount crammed together. A large review of hundreds of experiments found this consistently, mostly in adults <Cite k="cepeda2006" />. It also holds for young children. In one study, 5- to 7-year-olds who had science lessons spread across several days were better at applying what they'd learned a week later than children who had the same lessons all at once <Cite k="vlach2012" />.</p>
        <p>A second helpful idea is <strong>retrieval practice</strong>: recalling something you learned earlier helps it stick, especially when it takes a little effort but you succeed. The research with young children is promising but still limited <Cite k="fazio2019" />. In practice, that just means revisiting yesterday's skill for a minute before moving on.</p>
        <h2>How habits form</h2>
        <p>In a study of adults building new daily habits, it took a median of about 66 days for a behaviour to feel automatic, with a huge range from 18 to 254 days. Missing a single day didn't derail the process <Cite k="lally2010" />. The research was with adults, but the practical lessons carry over: be patient, attach the habit to a regular cue, and don't worry about the odd missed day.</p>
        <h2>Practical tips</h2>
        <ul>
          <li><strong>Anchor it.</strong> Link learning time to something that already happens, like after breakfast or before bath time.</li>
          <li><strong>Keep it short.</strong> Five to ten minutes is plenty for young children. Stop while they still want more.</li>
          <li><strong>Mix old and new.</strong> Start with something your child can already do, then try something a little harder.</li>
          <li><strong>Notice effort, not speed.</strong> “You kept trying on that hard one” is more useful than “you're so fast”.</li>
          <li><strong>Avoid bribes.</strong> Promising a treat for playing can make the activity feel like a chore. A large review found that expected rewards reduced children's own interest in an activity <Cite k="deci1999" />.</li>
          <li><strong>Mix screen and real-world maths.</strong> Count stairs, share snacks, play board games. A game is one tool among many.</li>
        </ul>
        <h2>How BrainZippy supports a routine</h2>
        <p>BrainZippy games are built around short rounds of eight puzzles. Within a round, puzzles get harder after a few first-try answers in a row and easier if your child needs three tries, and after a round with at least half the answers right first time, the next round starts one level higher, so practice keeps moving without getting stuck. Each day's plan is a short trail of games (5 by default; grown-ups can choose 3 to 10) that mixes new material with review of earlier skills, then ends with “come back tomorrow” rather than endless play. Stars and Brain Sparks mark progress, but there's no prize shop and nothing to buy with them, so the game itself stays the reason to play.</p>
      </>
    ),
  }),
  G({
    slug: "screen-time-and-learning-games",
    title: "Screen time and learning games: finding a healthy balance",
    short: "Screen time and learning games",
    description: "What the AAP and WHO recommend for young children's screen time, what makes a learning app worth the time, and how to fit games into a balanced day.",
    published: "2026-11-17",
    updated: "2026-11-18",
    ages: "3–9",
    games: [],
    takeaways: [
      "For ages 2–5, the AAP suggests about an hour a day of high-quality media, ideally used together.",
      "Quality matters: look for apps that make children think, not just tap, with no ads.",
      "Screens shouldn't replace sleep, active play, or talking and playing with you.",
    ],
    refs: ["aap2016", "who2019", "hirshpasek2015", "meyer2019", "fisher2014"],
    body: () => (
      <>
        <p>“How much screen time is OK?” is one of the most common questions parents ask. There isn't one perfect number, but there is helpful guidance, and the quality of what children do on screens matters as much as the minutes.</p>
        <h2>What the guidance says</h2>
        <ul>
          <li><strong>American Academy of Pediatrics (AAP):</strong> for children aged 2 to 5, limit screen use to about one hour a day of high-quality programming, and watch or play together where you can. For children 6 and older, set consistent limits so that media doesn't take the place of sleep, physical activity and other healthy behaviours <Cite k="aap2016" />.</li>
          <li><strong>World Health Organization (WHO):</strong> for 2- to 4-year-olds, sedentary screen time should be no more than one hour a day, and less is better. Children of this age should also get plenty of active play and good sleep <Cite k="who2019" />.</li>
        </ul>
        <p>Both stress the same thing: screen time should fit around sleep, movement and time with people, not replace them.</p>
        <h2>What makes a learning app worth the time</h2>
        <p>A group of learning scientists suggested four questions for judging educational apps <Cite k="hirshpasek2015" />:</p>
        <ol>
          <li><strong>Is my child actively thinking?</strong> Making decisions and solving problems, rather than just tapping and watching.</li>
          <li><strong>Are they engaged with the learning?</strong> Or distracted by flashy extras, pop-ups and side games?</li>
          <li><strong>Is it meaningful?</strong> Does it connect to things your child knows and cares about?</li>
          <li><strong>Is it social?</strong> Can they talk about it with you, or does the app respond to what they do?</li>
        </ol>
        <p>Ads are worth checking for too. A study of apps used by children aged 5 and under found that 95% contained advertising, some of it using characters to pressure children into purchases <Cite k="meyer2019" />. Visual clutter can also pull attention away from learning: in one classroom study, young children were more distracted and learned less in a heavily decorated room than in a plain one <Cite k="fisher2014" />.</p>
        <h2>Fitting games into a balanced day</h2>
        <ul>
          <li><strong>Use screens on purpose.</strong> A short learning session at a set time is different from screens as background filler.</li>
          <li><strong>Play together sometimes.</strong> Ask your child to show you how a game works. Explaining is learning.</li>
          <li><strong>Bring it off-screen.</strong> If a game practised counting, count stairs on the way to bed.</li>
          <li><strong>Keep screens out of the hour before sleep</strong> and out of bedrooms overnight if you can.</li>
          <li><strong>Make a family media plan</strong> so everyone knows the rules, including the grown-ups.</li>
        </ul>
        <h2>How BrainZippy approaches screen time</h2>
        <p>We designed BrainZippy around those four questions. Every puzzle asks your child to make a real decision, about numbers, shapes or the sounds of words. Scenes stay calm while your child is answering. There are no ads, no chat and no purchase prompts for children. Rounds are short, and the daily plan ends after a few games (5 by default; grown-ups can choose 3 to 10). We'd rather your child plays for ten good minutes and then goes outside.</p>
      </>
    ),
  }),
  G({
    slug: "when-your-child-gets-it-wrong",
    title: "What to say when your child gets a maths question wrong",
    short: "When your child gets it wrong",
    description: "How to respond to mistakes in ways that keep children trying: praising effort and strategy, giving hints before answers, and using worked examples.",
    published: "2026-11-17",
    updated: "2026-11-18",
    ages: "3–9",
    games: ["counting-adventure", "glow-cave-hops", "sky-balloon-race", "cookie-kitchen"],
    takeaways: [
      "Praise what your child did (“you counted carefully”), not who they are (“you're so smart”).",
      "Give a hint before the answer, then show a worked example if they're still stuck.",
      "Let your child finish the problem themselves, even after you've shown them how.",
    ],
    refs: ["cimpian2007", "macnamara2023", "fyfe2015", "sweller2019"],
    body: () => (
      <>
        <p>Mistakes are a normal part of learning maths. What happens next, in the moments after a wrong answer, can make the difference between a child who tries again and one who gives up.</p>
        <h2>Praise the process, not the person</h2>
        <p>In a small experiment, young children who were told “you did a good job drawing” coped better with later setbacks than children told “you are a good drawer” <Cite k="cimpian2007" />. Praise about a fixed trait suggests that a mistake means you're not good at something. Praise about what you <em>did</em> suggests that trying again can work.</p>
        <p>So instead of “You're so clever!”, try:</p>
        <ul>
          <li>“You counted every one carefully.”</li>
          <li>“You tried a different way when the first one didn't work.”</li>
          <li>“You started from the bigger number. Good thinking!”</li>
        </ul>
        <p>A note of caution: larger programmes that try to teach children a “growth mindset” have shown little or no effect on school results overall <Cite k="macnamara2023" />. The aim here is simpler: everyday words that point to effort and strategy rather than labels.</p>
        <h2>Hint first, then show</h2>
        <p>When your child gets something wrong, resist giving the answer straight away. A useful sequence is:</p>
        <ol>
          <li><strong>A nudge.</strong> “Let's check. Can you count them again, touching each one?”</li>
          <li><strong>A hint about the idea.</strong> “Remember, the last number you say tells how many.”</li>
          <li><strong>A worked example.</strong> Do it together, step by step, out loud.</li>
          <li><strong>Hand it back.</strong> Let your child give the final answer themselves.</li>
        </ol>
        <p>Worked examples are especially helpful for beginners, who can get overloaded trying to work out a method and an answer at the same time. As learners become more skilled, the benefit fades, and solving problems on their own works better <Cite k="sweller2019" />. Most of this research is with older students, so for young children treat it as a sensible guide, not a fixed rule.</p>
        <h2>What it can sound like</h2>
        <p>Your child counts six apples as seven. Instead of “No, it's six”, try: “Hmm, let's check together. Can you touch each one as you count?” They count again and touch one apple twice. “Oops, that one got two numbers. Let's move each apple to the side once we've counted it.” This time they get six. “You checked carefully and found it. Six!” The mistake became the lesson, and your child still found the answer.</p>
        <h2>Less feedback as skills grow</h2>
        <p>Detailed feedback helps most when a skill is new. One study with second and third graders found that feedback helped children who didn't yet have a strategy, but could actually get in the way for children who already had one <Cite k="fyfe2015" />. As your child gets more confident, step back: a simple “yes” or “let's check that one” is often enough.</p>
        <h2>Things to avoid</h2>
        <ul>
          <li>Sighing, rushing or finishing the problem for them.</li>
          <li>Comparing with siblings or friends.</li>
          <li>Saying “I was never good at maths either”. It can suggest maths ability is fixed.</li>
        </ul>
        <h2>How BrainZippy handles mistakes</h2>
        <p>Every BrainZippy game follows the same pattern. A wrong answer is never punished: no buzzer, no lost lives. The first miss brings a gentle hint that names the idea. A second miss brings a step-by-step worked example from a helper character, and then your child makes the final tap themselves. Praise in the games always describes what your child did, such as “You counted on from the bigger number!”, and never says “you're so smart”.</p>
      </>
    ),
  }),
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
