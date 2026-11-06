#!/usr/bin/env node
/**
 * Enforces the one dependency rule this codebase cares about:
 *
 *   src/backend/** and src/store/** must never import from src/components/**
 *
 * The data layer and the shared state layer sit *below* the UI. When a query module reaches
 * up into a component for a type, a constant or a store, that domain can no longer be read,
 * tested or code-split without dragging the UI along — and it creates genuine import cycles.
 *
 * This exists as a script rather than a lint rule because oxlint (the linter this repo uses)
 * does not implement `no-restricted-imports`; it silently ignores unknown rules, so a config
 * entry would look like a guard while enforcing nothing.
 *
 * Where things belong instead:
 *   - API contracts  -> the domain's own `*.api.ts` / `*.types.ts` under src/backend
 *   - shared constants -> src/utils
 *   - shared state     -> src/store
 *
 * Usage: node scripts/check-layers.mjs   (exits 1 on violation)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const GUARDED_DIRS = ["src/backend", "src/store"];
const FORBIDDEN = /from\s+["'](?:@\/components\/|(?:\.\.\/)+components\/)/;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const violations = [];
for (const dir of GUARDED_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (FORBIDDEN.test(line)) {
        violations.push(`${relative(ROOT, file)}:${i + 1}  ${line.trim()}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error(
    `\n✗ Layer violation: ${violations.length} import(s) from the UI layer inside ${GUARDED_DIRS.join(" / ")}\n`,
  );
  for (const v of violations) console.error("  " + v);
  console.error(
    "\n  API contracts belong in the domain's own *.api.ts / *.types.ts,\n" +
      "  shared constants in @/utils, shared state in @/store.\n",
  );
  process.exit(1);
}

console.log(`✓ No UI-layer imports inside ${GUARDED_DIRS.join(" / ")}`);
