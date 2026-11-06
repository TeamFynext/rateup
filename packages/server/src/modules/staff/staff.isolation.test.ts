import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * The staff console and the customer app must not share an auth path: a SuperTokens session
 * must never admit anyone to /api/staff, and the staff guards must never end up gating a
 * customer route (where a staff cookie would then work).
 */

const SRC = join(import.meta.dirname, "..", "..");
const STAFF_DIR = join(SRC, "modules", "staff");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sourceFiles(path);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".d.ts")
      ? [path]
      : [];
  });
}

const imports = (file: string) =>
  [...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

describe("staff console isolation", () => {
  test("nothing in modules/staff uses SuperTokens or the customer session checks", () => {
    const offenders = sourceFiles(STAFF_DIR).flatMap((file) =>
      imports(file)
        .filter((spec) => /supertokens|checkSession|authz\/authorize/.test(spec))
        .map((spec) => `${relative(SRC, file)} → ${spec}`),
    );
    expect(offenders).toEqual([]);
  });

  test("nothing outside modules/staff imports the staff guards or plugin internals", () => {
    const allowedOutside = new Set([
      // Mounts the plugin.
      "registerRoutes.ts",
      // The nightly session purge.
      ["workers", "bullmq", "processors", "scheduledJobs.processor.ts"].join(sep),
    ]);
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.startsWith(STAFF_DIR + sep))
      .flatMap((file) =>
        imports(file)
          .filter((spec) => spec.includes("modules/staff/") || spec.startsWith("../staff/"))
          .map((spec) => ({ file: relative(SRC, file), spec })),
      )
      .filter(({ file }) => !allowedOutside.has(file));
    expect(offenders).toEqual([]);
  });
});
