#!/usr/bin/env node
/**
 * Keeps the authenticated app on Design System V2.
 *
 * `src/styles/foundation.css` already defines the whole system: the brand navy as
 * `ru-blue-600` wired to `--primary`, full `ru-*` ramps, and a `.dark` scope. The gap is
 * adoption — pre-V2 call sites still compile because the old names survive as aliases, and
 * light-only colour keeps reappearing because nothing catches it.
 *
 * This is a script rather than a lint rule for the same reason `check-layers.mjs` is: oxlint
 * does not implement the rules this would need and silently ignores unknown ones, so a config
 * entry would look like a guard while enforcing nothing.
 *
 * Marketing is deliberately out of scope. Those pages carry per-product sub-brands, load their
 * own stylesheet, and are light-only by design.
 *
 * Usage:
 *   node scripts/check-design-tokens.mjs            # fail if worse than the baseline
 *   node scripts/check-design-tokens.mjs --list     # print every offending line
 *   node scripts/check-design-tokens.mjs --update   # re-baseline after real cleanup
 *
 * The baseline exists so the build never breaks on debt that already exists, but the count can
 * only go down. Lower the numbers in `design-tokens.baseline.json` as you clean; never raise them.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const BASELINE = join(ROOT, "scripts/design-tokens.baseline.json");

/** The authenticated app. Everything else is marketing or public-facing. */
const SCANNED = [
  "src/components/dashboard",
  "src/components/whatsapp",
  "src/components/settings",
  "src/components/pipeline",
  "src/components/loyalty",
  "src/components/LoyaltyComponents",
  "src/components/Contacts",
  "src/components/Campaign",
  "src/components/Survey",
  "src/components/Form",
  "src/components/admin",
  "src/components/common",
  "src/components/Layout",
  "src/components/ui",
  "src/routes/dashboard",
];

/**
 * Surfaces whose palette is fixed by something outside the theme: a rendering of another
 * product's UI, or artwork that will be printed on paper. Flipping these to dark tokens would
 * make them wrong, not consistent.
 */
const FIXED_PALETTE = [
  "src/components/ui/phone-preview.tsx",
  "src/components/whatsapp/whatsapp-preview-shell.tsx",
  "src/components/whatsapp/MessageComponents.tsx",
  "src/components/whatsapp/automation/components/flowbot-phone-preview.tsx",
  "src/components/whatsapp/flows/FlowShare/index.tsx",
  "src/components/dashboard/campaign/wizard/CampaignTemplatePreview.tsx",
  "src/components/dashboard/instagram/instagram-preview.tsx",
  "src/components/dashboard/loyalty/poster/QrPoster.tsx",
  "src/components/dashboard/loyalty/poster/Brochure.tsx",
  "src/components/dashboard/loyalty/materials/BrochureEditor.tsx",
  "src/components/Survey/ShareSurvey/FlowShareTemplateEditor.tsx",
  "src/components/whatsapp/templates/Details/CardCarousel.tsx",
  "src/components/common/facebook-brand-button.tsx",
];

const RULES = [
  {
    id: "absolute-colour",
    // An opaque fill or border painted white or black is a dark-mode bug the moment the
    // theme flips; `--background` / `--card` / `--border` already cover them.
    //
    // Two things are deliberately not flagged. `text-white`, because white type on a
    // saturated fill (an avatar, a status pill, a primary button) is right in both themes,
    // and `primary-on-white` catches the case that is not. And the translucent forms
    // (`bg-black/40`, `bg-white/10`), because those are scrims and tints over a surface
    // whose own colour is already fixed, so they read correctly either way.
    test: (line) =>
      /(?<![\w-])(?:bg|border|ring|divide)-(?:white|black)(?![\w-/])/.test(line) &&
      !/(?<![\w-])dark:/.test(line),
    hint: "use bg-background / bg-card / border-border, or add a dark: counterpart",
  },
  {
    id: "dead-alias",
    // The V1 names were deleted once every call site moved to the `ru-*` ramps. Tailwind emits
    // nothing for a class it cannot resolve, so one of these reappearing is invisible: the
    // element simply loses its colour.
    test: /(?<![\w-])(?:bg|text|border|ring|divide|from|to|via|fill|stroke)-(?:rateup-orange|rateup-graytext|rateup-darkblue|rateup-blue-4|ink-\d{2,3})(?![\w-])/,
    hint: "use the ru-* ramps: ru-amber-500, ru-n-600, ru-blue-900, ru-blue-600, ru-n-*",
  },
  {
    id: "raw-destructive",
    // One colour means danger. `--destructive` already flips with the theme, so a red from the
    // Tailwind ramp is both a second answer and a light-only one.
    //
    // `ring-` and gradient stops are left out: a ring is how the avatar and the availability
    // pill carry a hue from a scale, where red means busy rather than dangerous.
    test: /(?<![\w-])(?:bg|text|border|divide)-red-\d{2,3}(?![\w-])/,
    hint: "use text-destructive / bg-destructive/10 / border-destructive/30",
  },
  {
    id: "raw-neutral",
    test: /(?<![\w-])(?:bg|text|border|ring|divide)-(?:gray|slate|zinc|neutral)-\d{2,3}(?![\w-])/,
    hint: "use the semantic neutrals: text-foreground, text-muted-foreground, bg-muted, border-border",
  },
  {
    id: "primary-on-white",
    // `--primary-foreground` is near-black in dark, so `text-white` here is a contrast bug.
    test: /bg-primary(?![\w-])(?=.*(?<![\w-])text-white(?![\w-]))/,
    hint: "pair bg-primary with text-primary-foreground",
  },
  {
    id: "accent-without-dark",
    // An accent tuned for a light page and left without a dark counterpart.
    //
    // Only the ends of a ramp are flagged. A tint at 50-200 is a wash meant to sit on white
    // and turns into a glare on a dark canvas; a shade at 700-950 is type meant to sit on
    // that wash and goes unreadable. The middle of the ramp (300-600) is saturated enough to
    // read on either canvas, which is why a status dot or an avatar fill needs no pair.
    test: (line) =>
      /(?<![\w-])(?:bg|text|border)-(?:red|green|blue|amber|emerald|orange|yellow|indigo|violet|purple|pink|rose|teal|cyan|lime|sky|fuchsia)-(?:50|100|200|700|800|900|950)(?![\w-])/.test(
        line,
      ) && !/(?<![\w-])dark:/.test(line),
    hint: "add a dark: counterpart, e.g. text-amber-700 dark:text-amber-500",
  },
];

/**
 * A hex written where a token would do: a Tailwind arbitrary value, `bg-[#1c518e]`.
 *
 * Only that form is flagged. A hex passed to the PDF renderer, drawn onto a canvas, stored as
 * a programme's brand colour or asserted in a test is a value, not a class, and there is no
 * token to put in its place.
 */
function tokenHexes() {
  const css = readFileSync(join(ROOT, "src/styles/foundation.css"), "utf8");
  const map = new Map();
  for (const m of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    map.set(m[2].toLowerCase(), m[1]);
  }
  return map;
}

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

const HEXES = tokenHexes();
const found = Object.fromEntries(RULES.map((r) => [r.id, []]));
found["token-hex"] = [];
found["module-css"] = [];

for (const dir of SCANNED) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file);
    if (FIXED_PALETTE.includes(rel)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
        const at = `${rel}:${i + 1}  ${line.trim().slice(0, 120)}`;
        for (const rule of RULES) {
          const hit = typeof rule.test === "function" ? rule.test(line) : rule.test.test(line);
          if (hit) found[rule.id].push(at);
        }
        for (const m of line.matchAll(/\[(#[0-9a-fA-F]{6})\]/g)) {
          const token = HEXES.get(m[1].toLowerCase());
          if (token) found["token-hex"].push(`${at}   → ${token}`);
        }
      });
  }
}

// A new scoped stylesheet is a whole parallel colour system; the tree is meant to shrink.
const moduleCss = [];
(function collectModules(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectModules(full);
    else if (entry.endsWith(".module.css")) moduleCss.push(relative(ROOT, full));
  }
})(join(ROOT, "src"));
found["module-css"] = moduleCss;

const counts = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.length]));

if (process.argv.includes("--list")) {
  for (const [id, hits] of Object.entries(found)) {
    if (!hits.length) continue;
    const rule = RULES.find((r) => r.id === id);
    console.log(`\n── ${id} (${hits.length})${rule ? ` — ${rule.hint}` : ""}`);
    for (const h of hits) console.log("  " + h);
  }
  process.exit(0);
}

if (process.argv.includes("--update") || !existsSync(BASELINE)) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + "\n");
  console.log("✓ Design-token baseline written:", JSON.stringify(counts));
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const worse = Object.entries(counts).filter(([id, n]) => n > (baseline[id] ?? 0));
const better = Object.entries(counts).filter(([id, n]) => n < (baseline[id] ?? 0));

if (worse.length > 0) {
  console.error("\n✗ Design-token debt increased in the app surface:\n");
  for (const [id, n] of worse) {
    const rule = RULES.find((r) => r.id === id);
    console.error(`  ${id}: ${baseline[id] ?? 0} → ${n}${rule ? `\n      ${rule.hint}` : ""}`);
  }
  console.error("\n  Run with --list to see the offending lines.");
  console.error(
    "  Marketing (products/, HomePage/, RateupHomePage/, routes/(marketing)) is not scanned.\n",
  );
  process.exit(1);
}

if (better.length > 0) {
  console.log("✓ Design-token debt reduced:");
  for (const [id, n] of better) console.log(`    ${id}: ${baseline[id]} → ${n}`);
  console.log("  Run --update to lock in the lower numbers.");
} else {
  console.log("✓ Design-token debt held at the baseline:", JSON.stringify(counts));
}
