# parlay-api

Official JavaScript/TypeScript SDK for [ParlayAPI](https://parlay-api.com): real-time sports odds across 30+ sportsbooks and sources, 90+ sports and leagues, player props, arbitrage and +EV detection, prediction markets (Kalshi, Polymarket), and closing-line history back to 2005.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/JacobiusMakes/parlay-api-js?file=examples%2Fquickstart.mjs)

Try it without installing anything: the button above boots the repo in your browser and runs the quickstart against the keyless sandbox. No account, no API key.

- Zero runtime dependencies. Native `fetch`. Works in Node.js 18+ and modern browsers.
- TypeScript types included. Ships ESM and CommonJS builds.
- Drop-in compatible with the-odds-api (`toaCompat` mode uses the same `/v4` paths and response shapes).
- Sandbox mode: explore realistic data with NO API key and no credit cost.
- Mirrors the official Python SDK (`pip install parlay-api`), same methods, same semantics.

## Install

```bash
npm install parlay-api
```

## Quickstart (no key needed)

```js
import { ParlayAPI } from "parlay-api";

const client = new ParlayAPI({ sandbox: true });

const sports = await client.sports();
const odds = await client.odds("basketball_nba", {
  regions: "us",
  markets: ["h2h", "spreads", "totals"],
});
console.log(odds[0].bookmakers[0].markets[0].outcomes);
```

Sandbox mode serves realistic synthetic data from the live API's `/v1/sandbox` endpoints: perfect for development and CI. When you are ready for live odds, [grab a free key](https://parlay-api.com/signup) (free tier: 1,000 credits/month, no card) and drop the flag:

```js
const client = new ParlayAPI({ apiKey: process.env.PARLAYAPI_KEY });
// or just: new ParlayAPI("YOUR_KEY")
```

## What you can do

```js
// Player props across books (DFS pick'em lines included)
const props = await client.props("baseball_mlb", {
  markets: ["player_strikeouts", "player_total_bases"],
  bookmakers: ["draftkings", "pinnacle", "fanduel"],
});

// Guaranteed-profit arbitrage, 3-way soccer markets included
const arbs = await client.arbitrage("soccer_england_premier_league", {
  minProfit: 1.0,
});

// +EV bets vs a sharp book's no-vig fair line
const evBets = await client.ev("basketball_nba", { minEdge: 2.5 });

// Prediction markets mapped onto the same sport keys
const pm = await client.predictionMarkets("americanfootball_nfl", {
  sources: ["kalshi", "polymarket"],
});

// Historical snapshots and closing lines (game lines from 2005)
const snap = await client.historicalOdds("basketball_nba", "2024-06-01T00:00:00Z");
const closers = await client.closingOdds("baseball_mlb", { season: 2024 });

// Grade one bet: fair price, best book, EV, Kelly, BET/LEAN/FAIR/PASS
const call = await client.verdict({
  sport: "basketball_nba",
  team: "Boston Celtics",
  side: "Boston Celtics",
  market: "h2h",
  bankroll: 1000,
});

// Devig math helpers, no network needed
import { devig, edge, kellyStake } from "parlay-api";
const [fairOver, fairUnder] = devig(-110, -110);
```

Full method list: `sports`, `odds`, `events`, `scores`, `historicalOdds`, `closingOdds`, `props`, `propMarkets`, `futures`, `predictionMarkets`, `searchPredictionMarkets`, `arbitrage`, `ev`, `consensus`, `middles`, `verdict`, `parlayVerdict`, `bestBets`, `setBettableBooks`, `bettableBooks`, `usage`, `websocketUrl`, `streamOdds`, plus the odds-math helpers (`americanToImplied`, `americanToDecimal`, `decimalToAmerican`, `impliedToAmerican`, `devig`, `edge`, `kellyStake`).

## Migrating from the-odds-api

```js
import { OddsAPI } from "parlay-api"; // alias for ParlayAPI

const client = new OddsAPI({ apiKey: KEY, toaCompat: true });
// Same /v4 paths, same response shapes, same x-requests-* quota headers.
const odds = await client.odds("baseball_mlb", { markets: "h2h,spreads,totals" });
console.log(client.lastQuota); // { requestsUsed, requestsRemaining, requestsLast }
```

## Streaming

WebSocket and SSE streaming require Business tier or above (see [pricing](https://parlay-api.com/pricing)).

```js
for await (const frame of client.streamOdds("basketball_nba")) {
  console.log(frame); // full snapshot on connect, then pushed updates
}
```

`streamOdds` uses the runtime's global `WebSocket` (browsers, Node 22+). On older Node, pass an implementation via `options.webSocket` or build the URL yourself with `client.websocketUrl(sportKey)`.

## Errors and quota

Typed errors mirror the Python SDK: `InvalidAPIKeyError` (401), `CreditLimitExceededError` and `TierGatedError` (403), `RateLimitedError` (429), `ParlayAPIError` for everything else. Every successful call refreshes `client.lastQuota` from the `x-requests-*` response headers.

## The data behind it

Verified against the live API and production database, as of 2026-08:

- 90+ sports and leagues (`GET /v1/sports` lists all of them)
- 30+ sportsbooks and sources, sub-5-second freshness on major books
- 4,000+ distinct player-prop markets
- 1.7M+ historical game closing lines, continuous from 2005
- 30M+ prop closing lines archived since 2022
- 200 API endpoints ([openapi.json](https://api.parlay-api.com/openapi.json))
- Free tier: 1,000 credits/month, no card required; paid tiers at [parlay-api.com/pricing](https://parlay-api.com/pricing)

Prefer an agent to write this code for you? ParlayAPI also ships a 22-tool MCP server: `pip install parlayapi-mcp`.

## Examples

The [`examples/`](./examples) folder has runnable scripts (sandbox by default, no key needed):

```bash
node examples/quickstart.mjs
node examples/arb_finder.mjs
node examples/ev_scanner.mjs
```

## Development

```bash
npm install     # dev dependency: typescript only
npm run build   # emits dist/esm, dist/cjs, dist/types
npm test        # smoke test against the live sandbox endpoints
```

## License

MIT
