import type { ContentPack } from "../../types";

/**
 * Money library (Market Square). Plan: docs/curriculum/money.md. Live with its first world, Budge's Lemonade Stand.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 * Metadata only — game code and data load lazily.
 */
const pack: ContentPack = {
  id: "library-money",
  title: "Money library",
  libraries: [
    {
      id: "money",
      title: "Money",
      kidTitle: "Market Square",
      host: "budge",
      theme: { main: "#E9A93B", soft: "#FCF1DC", deep: "#7A5310" },
      ages: [7, 14],
      pitch: "Count coins and make plans with Budge.",
      description: "US coins and bills, needs and wants, saving goals and smart choices, aligned with the National Standards for Personal Financial Education. No real money, purchases or product recommendations.",
      status: "live",
      order: 7,
    },
  ],
  topics: [
    { id: "money.coins", subject: "money", title: "Coins, paying and change", description: "Recognise US coins by value, pay exact amounts and make change by counting up." },
    { id: "money.biz", subject: "money", title: "Running a small business", description: "Cost, revenue and profit, and how price affects how much sells." },
  ],
  skills: [
    {
      id: "money.coins.pay",
      title: "Paying with coins",
      topic: "money.coins",
      ages: [7, 8],
      prerequisites: ["math.add.within-20"],
      objective: "Pay an exact amount up to $1 with pennies, nickels, dimes, quarters and a dollar bill, counting the value of the coins rather than how many there are.",
    },
    {
      id: "money.coins.change",
      title: "Making change",
      topic: "money.coins",
      ages: [7, 9],
      prerequisites: ["money.coins.pay"],
      objective: "Give change from one dollar by counting up from the price.",
    },
    {
      id: "money.biz.profit",
      title: "Cost, revenue and profit",
      topic: "money.biz",
      ages: [8, 11],
      prerequisites: ["money.coins.pay"],
      objective: "Add supply costs, find revenue as cups × price, and work out profit = revenue − cost, including a loss when costs are bigger.",
    },
    {
      id: "money.biz.pricing",
      title: "Choosing a price",
      topic: "money.biz",
      ages: [10, 13],
      prerequisites: ["money.biz.profit"],
      objective: "Use a demand table to choose the price that makes the most profit, seeing that a higher price sells fewer cups.",
    },
  ],
  worlds: [
    {
      id: "lemonade-stand",
      subject: "money",
      topic: "money.coins",
      skills: ["money.coins.pay", "money.coins.change", "money.biz.profit", "money.biz.pricing"],
      ages: [7, 10],
      maxLevel: 9,
      title: "Budge's Lemonade Stand",
      gameType: "money game",
      blurb: "Help Budge run her beach lemonade stand and save for a telescope!",
      parentDescription:
        "Children run a pretend lemonade stand with US coins: they pay exact amounts, give change from a dollar by counting up, add up the cost of supplies, serve customers to find the money that came in, and save the profit in a jar. Later levels include a rainy day that ends in a loss and choosing a price from a simple survey. Play money only: no real purchases, brands or product recommendations.",
      characters: ["budge", "puff", "bobbo"],
      load: () => import("../../../games/lemonade-stand/LemonadeStand"),
      loadDefinition: () => import("../../../games/lemonade-stand/definition").then((m) => m.lemonadeStand),
      voice: "src/games/lemonade-stand/voice.json",
    },
  ],
};

export default pack;
