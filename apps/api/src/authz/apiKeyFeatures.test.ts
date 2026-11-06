import { describe, expect, test } from "vite-plus/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  API_KEY_FEATURE_NAMES,
  API_KEY_FEATURES,
  featuresForScopes,
  permissionsForFeatures,
  scopesAllowWidget,
} from "./apiKeyFeatures.js";
import { KEY_ONLY_PERMISSIONS } from "./permissions.js";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

/** Every permission an external route declares, as written in the route files. */
function externalRoutePermissions(): Set<string> {
  const found = new Set<string>();
  for (const file of filesUnder("src/external")) {
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(
      /\b(?:permission|read|write): (\[[^\]]*\]|"[a-z_]+\.[a-z_]+")/g,
    )) {
      for (const p of m[1].matchAll(/"([a-z_]+\.[a-z_]+)"/g)) found.add(p[1]);
    }
  }
  return found;
}

describe("API key features", () => {
  const covered = new Set(Object.values(API_KEY_FEATURES).flat());

  test("every permission an external route can require is in some feature", () => {
    // Write-only declarations on modules with no write route (teams.manage, surveys.manage)
    // never reach a request, so they need no feature.
    const unreachable = new Set(["teams.manage", "surveys.manage"]);
    const missing = [...externalRoutePermissions()].filter(
      (p) => !covered.has(p as never) && !unreachable.has(p),
    );
    expect(missing).toEqual([]);
  });

  test("features expand to their permissions, without duplicates", () => {
    expect(permissionsForFeatures(["loyalty"])).toEqual(["loyalty.read", "loyalty.cashier"]);
    expect(permissionsForFeatures([])).toEqual([]);
    const all = permissionsForFeatures(API_KEY_FEATURE_NAMES);
    expect(new Set(all).size).toBe(all.length);
  });

  test("a full-access key covers every feature", () => {
    expect(featuresForScopes([])).toEqual(API_KEY_FEATURE_NAMES);
  });

  test("a feature is listed only when all its permissions are held", () => {
    expect(featuresForScopes(["contacts.read", "contacts.manage", "loyalty.read"])).toEqual([
      "contacts",
    ]);
    expect(featuresForScopes(permissionsForFeatures(["whatsapp", "surveys"]))).toEqual([
      "surveys",
      "whatsapp",
    ]);
  });

  test("the widget feature holds only the key-only widget permission", () => {
    expect(permissionsForFeatures(["widget"])).toEqual(["widget.connect"]);
    expect(KEY_ONLY_PERMISSIONS.has("widget.connect")).toBe(true);
    expect(featuresForScopes(["widget.connect"])).toEqual(["widget"]);
  });

  test("only a full-access key or one with the widget feature may run the widget", () => {
    expect(scopesAllowWidget([])).toBe(true);
    expect(scopesAllowWidget(permissionsForFeatures(["widget"]))).toBe(true);
    expect(scopesAllowWidget(permissionsForFeatures(["contacts", "widget"]))).toBe(true);
    expect(scopesAllowWidget(permissionsForFeatures(["contacts"]))).toBe(false);
    expect(scopesAllowWidget(permissionsForFeatures(["campaigns", "whatsapp", "loyalty"]))).toBe(
      false,
    );
  });
});
