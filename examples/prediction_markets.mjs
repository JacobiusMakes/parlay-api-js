// Prediction markets (Kalshi, Polymarket) mapped to sport keys.
// This endpoint is live (no sandbox twin); keyless exploration works on
// several meta endpoints, but this one may require a free API key.
// Run: PARLAYAPI_KEY=your_key node examples/prediction_markets.mjs
import { ParlayAPI } from "parlay-api";

const client = new ParlayAPI(); // reads PARLAYAPI_KEY from the environment

const markets = await client.predictionMarkets("americanfootball_nfl", {
  sources: ["kalshi", "polymarket"],
});
console.log(JSON.stringify(markets, null, 2).slice(0, 2000));
