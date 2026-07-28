#!/usr/bin/env node
/** `npm run routes` — what the mock answers, without starting it. */
import { fixtures } from "../src/fixtures.mjs";
import { createGraphRoutes } from "../src/graph-routes.mjs";

const filter = process.argv[2];

const handlers = createGraphRoutes({
  state: { flows: new Map(), templates: new Map() },
  mintId: () => "1",
  publicUrl: () => "http://localhost",
});

const pretty = (regex) =>
  regex.source
    .replace(/^\^/, "")
    .replace(/\$$/, "")
    .replaceAll("\\/", "/")
    .replace(/\(\?<(\w+)>[^)]*\)/g, "{$1}");

const matches = (text) => !filter || text.toLowerCase().includes(filter.toLowerCase());

console.log(`\nSTATEFUL (${handlers.length}) — src/graph-routes.mjs, these run first\n`);
for (const rule of handlers) {
  const line = `${rule.method.padEnd(7)}${pretty(rule.match)}`;
  if (matches(line)) console.log(`  ${line}${rule.when ? "   (conditional)" : ""}`);
}

for (const collection of fixtures.collections) {
  const mine = fixtures.routes.filter((route) => route.api === collection.api);
  console.log(`\n${collection.name.toUpperCase()} (${mine.length}) — Meta's example responses\n`);
  for (const route of mine) {
    const path = route.path + (route.select ? `?${route.select}` : "");
    const line = `${route.method.padEnd(7)}${path.padEnd(46)}${route.name}`;
    if (matches(line)) console.log(`  ${line}`);
  }

  const hooks = fixtures.webhooks.filter((hook) => hook.api === collection.api);
  console.log(`\n${collection.name.toUpperCase()} WEBHOOKS (${hooks.length})\n`);
  for (const hook of hooks) {
    const name = hook.qualifiedName ?? hook.name;
    if (matches(name)) console.log(`  ${name}`);
  }
}

console.log(`\nAnything else gets a generic Graph-shaped reply, recorded as matched: false.`);
console.log(`Full table with folders and gaps: ROUTES.md\n`);
