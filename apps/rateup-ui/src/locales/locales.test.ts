import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, test } from "vitest";

type Dictionary = { [key: string]: string | Dictionary };

const DIR = import.meta.dirname;
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function leaves(dict: Dictionary, path: string[] = []): Array<[string[], string]> {
  return Object.entries(dict).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[[...path, key], value] as [string[], string]]
      : leaves(value, [...path, key]),
  );
}

/** Argument names a message reads, e.g. `total` in `{total, plural, …}`. */
function argumentNames(message: string): Set<string> {
  const names = new Set<string>();
  const walk = (elements: unknown[]) => {
    for (const element of elements as Array<Record<string, unknown>>) {
      if (typeof element.value === "string" && element.type !== 0) names.add(element.value);
      for (const option of Object.values(
        (element.options ?? {}) as Record<string, { value: unknown[] }>,
      )) {
        walk(option.value);
      }
      if (Array.isArray(element.children)) walk(element.children);
    }
  };
  walk(new IntlMessageFormat(message, "en", undefined, { ignoreTag: true }).getAst());
  return names;
}

const locales = readdirSync(DIR).filter((file) => file.endsWith(".json"));

// i18next-icu formats every value as ICU (with ignoreTag, as here) and does no `_one`/`_other`
// suffix lookup, so a suffixed key is never read and a value that fails to parse renders raw.
describe.each(locales)("%s", (file) => {
  const entries = leaves(JSON.parse(readFileSync(join(DIR, file), "utf8")) as Dictionary);

  test("every value is valid ICU MessageFormat", () => {
    const broken = entries.filter(([, value]) => {
      try {
        new IntlMessageFormat(value, "en", undefined, { ignoreTag: true });
        return false;
      } catch {
        return true;
      }
    });
    expect(broken.map(([path, value]) => `${path.join(" › ")} => ${value}`)).toEqual([]);
  });

  test("no key carries an i18next plural suffix", () => {
    const suffixed = entries.filter(([path]) => PLURAL_SUFFIX.test(path.at(-1) ?? ""));
    expect(suffixed.map(([path]) => path.join(" › "))).toEqual([]);
  });

  test("a translation reads only the arguments its source key has", () => {
    const renamed = entries.filter(([path, value]) => {
      if (path[0] !== "translation" || path.length !== 2) return false;
      try {
        const allowed = argumentNames(path[1]);
        return [...argumentNames(value)].some((name) => !allowed.has(name));
      } catch {
        return false;
      }
    });
    expect(renamed.map(([path, value]) => `${path[1]} => ${value}`)).toEqual([]);
  });
});
