// Arbitrage scanner: sandbox mode by default, keyless.
// Run: node examples/arb_finder.mjs
import { ParlayAPI } from "parlay-api";

const client = new ParlayAPI({ sandbox: true });

const result = await client.arbitrage("basketball_nba", { minProfit: 0.5 });
const arbs = Array.isArray(result) ? result : result.opportunities ?? [];
console.log(`arbitrage opportunities: ${arbs.length}`);
for (const arb of arbs.slice(0, 5)) {
  console.log(JSON.stringify(arb, null, 2));
}

// Live scanning: new ParlayAPI({ apiKey: process.env.PARLAYAPI_KEY })
// and the same call. minProfit is a percent (0.5 means 0.5%).
