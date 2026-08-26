// Quickstart: sandbox mode needs NO API key and costs no credits.
// Run: node examples/quickstart.mjs
import { ParlayAPI } from "parlay-api";

const client = new ParlayAPI({ sandbox: true });

const sports = await client.sports();
console.log(`sports available: ${sports.length}`);
console.log(sports.slice(0, 5).map((s) => s.key));

const odds = await client.odds("basketball_nba", {
  regions: "us",
  markets: ["h2h", "spreads", "totals"],
});
const first = odds[0];
console.log(`\n${first.away_team} @ ${first.home_team}`);
for (const book of first.bookmakers.slice(0, 3)) {
  const h2h = book.markets.find((m) => m.key === "h2h");
  if (h2h) {
    console.log(
      ` ${book.key}: ${h2h.outcomes.map((o) => `${o.name} ${o.price}`).join(" / ")}`
    );
  }
}

// When you are ready for live data, sign up for a free key
// (1,000 credits/month, no card) and drop sandbox mode:
//   const live = new ParlayAPI({ apiKey: process.env.PARLAYAPI_KEY });
