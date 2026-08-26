// Positive-EV scanner + devig math helpers. Sandbox by default, keyless.
// Run: node examples/ev_scanner.mjs
import { ParlayAPI, devig, edge, kellyStake } from "parlay-api";

const client = new ParlayAPI({ sandbox: true });

const result = await client.ev("basketball_nba", { minEdge: 1.0 });
const bets = Array.isArray(result) ? result : result.opportunities ?? [];
console.log(`+EV candidates: ${bets.length}`);
for (const bet of bets.slice(0, 3)) {
  console.log(JSON.stringify(bet, null, 2));
}

// The math helpers work offline:
const [fairOver, fairUnder] = devig(-110, -110);
console.log(`\nfair probs for -110/-110: ${fairOver.toFixed(3)}/${fairUnder.toFixed(3)}`);
console.log(`edge of +105 vs 52% fair: ${(edge(105, 0.52) * 100).toFixed(2)} pts`);
console.log(`quarter-Kelly stake at 55% win, +100: ${(kellyStake(0.55, 100) * 100).toFixed(2)}% of bankroll`);
