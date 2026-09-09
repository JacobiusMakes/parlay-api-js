# ParlayAPI JavaScript/TypeScript client

An open-source client for private sports odds research with [ParlayAPI](https://parlay-api.com). It uses native `fetch`, includes TypeScript types, and builds ESM and CommonJS modules. Live requests use your own API key and your account's credits. Available sports, bookmakers, markets and historical records vary by request.

## Install from source

The `parlay-api` package was not available from the public npm registry when checked on September 9, 2026. Build this repository locally with Node.js 18 or later:

```sh
git clone https://github.com/JacobiusMakes/parlay-api-js.git
cd parlay-api-js
npm install --ignore-scripts
npm run build
node examples/quickstart.mjs
```

The quickstart requests synthetic sandbox data without an API key. It does not show current sportsbook quotes. From another local project, install the built checkout with `npm install /absolute/path/to/parlay-api-js`.

## First request

```js
import { ParlayAPI } from "parlay-api";

const client = new ParlayAPI({ sandbox: true });
const odds = await client.odds("basketball_nba", {
  regions: "us",
  markets: ["h2h"],
});
console.log(odds[0]?.bookmakers ?? []);
```

For live data, create a client with your own key in a private server or local environment:

```js
const client = new ParlayAPI({ apiKey: process.env.PARLAYAPI_KEY });
```

Keep keys out of browser bundles and public repositories. This client does not grant permission to redistribute the underlying data publicly. See [API documentation](https://parlay-api.com/docs) for current endpoint availability, pricing and access requirements.

## API and local calculations

The source includes methods for sports, events, odds, props, historical queries and other API endpoints. A method's presence does not establish that data is available for a particular request. Inspect returned records and bookmaker timestamps before comparing quotes. Calculated opportunities are not guarantees of profit or execution.

Local helpers include `devig`, `edge`, `kellyStake` and odds-format conversions:

```js
import { devig } from "parlay-api";
const [homeProbability, awayProbability] = devig(-110, -110);
```

`toaCompat: true` selects compatible `/v4` routes for supported methods. Validate the endpoints, parameters and returned fields used by your application when migrating.

Sandbox mode only changes methods with a sandbox route; other methods can still use live endpoints. Start with the included quickstart rather than assuming every method is keyless.

## Errors and streaming

The client exposes typed errors and parses quota headers into `lastQuota`. Streaming access depends on the endpoint and account plan. `streamOdds` uses the runtime's global `WebSocket`; provide `options.webSocket` if your runtime lacks it.

## Development

```sh
npm run build
npm test
```

The build produces ESM, CommonJS and type declarations. The existing smoke test makes network requests to sandbox and public endpoints and checks an invalid-key response; it is not an offline test suite.

## License

MIT. The client source license does not license redistribution of API data.
