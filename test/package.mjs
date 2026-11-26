// Run after npm run build. Exercise the packed distribution as a new consumer.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const consumer = mkdtempSync(join(tmpdir(), "parlay-js-consumer-"));
const npmCli = process.env.npm_execpath;
const node = (args, cwd) => execFileSync(process.execPath, args, { cwd, encoding: "utf8" });
const npm = (args, cwd) => npmCli
  ? node([npmCli, ...args], cwd)
  : execFileSync("npm", args, { cwd, encoding: "utf8" });

try {
  const [pack] = JSON.parse(npm(["pack", "--json", "--ignore-scripts", "--pack-destination", consumer], root));
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true }));
  npm(["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "./" + pack.filename], consumer);

  const check = [
    'assert.equal(VERSION, ' + JSON.stringify(pack.version) + ');',
    'assert.deepEqual(devig(-110, -110), [0.5, 0.5]);',
  ].join("\n");
  writeFileSync(join(consumer, "runtime.mjs"), 'import assert from "node:assert/strict";\nimport { VERSION, devig } from "parlay-api";\n' + check);
  writeFileSync(join(consumer, "runtime.cjs"), 'const assert = require("node:assert/strict");\nconst { VERSION, devig } = require("parlay-api");\n' + check);
  node(["runtime.mjs"], consumer);
  node(["runtime.cjs"], consumer);

  const types = 'import { ParlayAPI, devig } from "parlay-api";\n'
    + 'const client: ParlayAPI = new ParlayAPI({ sandbox: true });\n'
    + 'const fair: [number, number] = devig(-110, -110);\n';
  for (const name of ["consumer.mts", "consumer.cts"]) writeFileSync(join(consumer, name), types);
  node([join(root, "node_modules/typescript/bin/tsc"), "--noEmit", "--strict", "--module", "node16",
    "--target", "es2020", "consumer.mts", "consumer.cts"], consumer);
  console.log("Packed SDK installed offline. ESM, CommonJS and both TypeScript consumers passed.");
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
