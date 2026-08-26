// Smoke test against the LIVE sandbox endpoints (keyless, no credits).
// Run after `npm run build`: node test/smoke.mjs
import assert from "node:assert/strict";
import {
  ParlayAPI,
  devig,
  edge,
  kellyStake,
  americanToDecimal,
  decimalToAmerican,
  impliedToAmerican,
} from "../dist/esm/index.js";

let passed = 0;
const check = (name, condition) => {
  assert.ok(condition, name);
  passed += 1;
  console.log(`ok ${passed} ${name}`);
};

// ---- offline math ----
const [fo, fu] = devig(-110, -110);
check("devig -110/-110 is 50/50", Math.abs(fo - 0.5) < 1e-9 && Math.abs(fu - 0.5) < 1e-9);
const [po] = devig(-1500, 700, "power");
check("power devig returns a probability", po > 0 && po < 1);
check("edge(+100, 0.55) is +5 pts", Math.abs(edge(100, 0.55) - 0.05) < 1e-9);
check("kellyStake -EV clamps to 0", kellyStake(0.4, -110) === 0);
check("american<->decimal round trip", decimalToAmerican(americanToDecimal(-135)) === -135);
check("impliedToAmerican(0.5) is -100", impliedToAmerican(0.5) === -100);

// ---- constructor forms ----
const byString = new ParlayAPI("test_key");
check("string constructor sets apiKey", byString.apiKey === "test_key");
const sandbox = new ParlayAPI({ sandbox: true });
check("sandbox client is keyless-safe", sandbox.sandbox === true);
const toa = new ParlayAPI({ toaCompat: true });
check("toaCompat flag stored", toa.toaCompat === true);
check(
  "websocketUrl shape",
  sandbox.websocketUrl("basketball_nba").startsWith("wss://parlay-api.com/ws/odds/basketball_nba")
);

// ---- live sandbox endpoints (keyless) ----
const sports = await sandbox.sports();
check("sandbox sports returns rows", Array.isArray(sports) && sports.length > 0);
check("sport rows have keys", typeof sports[0].key === "string");

const odds = await sandbox.odds("basketball_nba", {
  markets: ["h2h", "spreads", "totals"],
});
check("sandbox odds returns events", Array.isArray(odds) && odds.length > 0);
const event = odds[0];
check("event has bookmakers", Array.isArray(event.bookmakers) && event.bookmakers.length > 0);
check(
  "bookmaker has h2h outcomes",
  event.bookmakers[0].markets.some((m) => m.key === "h2h" && m.outcomes.length >= 2)
);

const props = await sandbox.props("basketball_nba");
check("sandbox props returns rows", Array.isArray(props) && props.length > 0);

const arbs = await sandbox.arbitrage("basketball_nba");
check("sandbox arbitrage responds", arbs !== null && typeof arbs === "object");

const evs = await sandbox.ev("basketball_nba");
check("sandbox ev responds", evs !== null && typeof evs === "object");

const events = await sandbox.events("basketball_nba");
check("sandbox events responds", Array.isArray(events));

const consensus = await sandbox.consensus("basketball_nba");
check("sandbox consensus responds", consensus !== null && typeof consensus === "object");

const futures = await sandbox.futures("basketball_nba");
check("sandbox futures responds", futures !== null && typeof futures === "object");

const scores = await sandbox.scores("basketball_nba");
check("sandbox scores responds", scores !== null && typeof scores === "object");

// ---- live keyless endpoints ----
const live = new ParlayAPI();
const liveSports = await live.sports();
check("live /v1/sports keyless", Array.isArray(liveSports) && liveSports.length > 50);

const toaSports = await toa.sports();
check("toaCompat /v4/sports works", Array.isArray(toaSports) && toaSports.length > 0);

// ---- error mapping ----
const bad = new ParlayAPI({ apiKey: "definitely_not_a_key" });
let errName = "none";
try {
  await bad.usage();
} catch (err) {
  errName = err.name;
}
check(
  "bad key maps to a typed error",
  ["InvalidAPIKeyError", "TierGatedError", "CreditLimitExceededError", "ParlayAPIError"].includes(errName)
);

console.log(`\nSMOKE OK: ${passed} checks passed`);
