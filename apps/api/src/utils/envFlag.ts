import { log } from "./logger.js";

type Env = Record<string, string | undefined>;

const warned = new Set<string>();

/**
 * Reads an on/off env variable. Its value is `true` or `false` (any letter case); unset
 * gives `fallback`. Anything else (`1`, `yes`, a typo) also gives `fallback`, with a
 * warning naming the variable, so a wrong value is visible instead of silently ignored.
 */
export function envFlag(name: string, fallback = false, env: Env = process.env): boolean {
  const value = env[name]?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value && !warned.has(name)) {
    warned.add(name);
    log.warn(`${name}=${env[name]} is not true or false; using ${fallback}`);
  }
  return fallback;
}
