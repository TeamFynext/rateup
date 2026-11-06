/**
 * Staged-file tasks.
 *
 * Was a JSON map of glob → commands. It became a function so `.agents/` can be filtered
 * out: that directory is vendored Expo skill documentation, not this project's code, and
 * linting it broke commits — `list-components.js` ships a `catch (_) {}` that trips
 * `no-unused-vars`, and nobody here can fix a file that upstream owns. Formatting it was
 * just as wrong, rewriting ~40 vendored docs into a diff nobody reads.
 *
 * Filtering here rather than in `.oxlintrc`/`.oxfmtrc` alone, because oxfmt exits 2 with
 * "Expected at least one target file" when its ignore rules exclude everything it was
 * handed — so a commit touching only vendored docs would still fail. Files the tools never
 * receive cannot fail.
 */
const VENDORED = /(^|[/])\.agents[/]/;

const keep = (files) => files.filter((file) => !VENDORED.test(file));
const quote = (files) => files.map((file) => JSON.stringify(file)).join(" ");

export default {
  "*.{ts,tsx,js,jsx,mjs,cjs}": (files) => {
    const targets = keep(files);
    if (targets.length === 0) return [];
    return [`oxlint --fix ${quote(targets)}`, `oxfmt ${quote(targets)}`];
  },
  "*.{json,jsonc,md,css}": (files) => {
    const targets = keep(files);
    if (targets.length === 0) return [];
    return [`oxfmt ${quote(targets)}`];
  },
};
