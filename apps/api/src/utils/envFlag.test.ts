import { describe, expect, it } from "vite-plus/test";
import { envFlag } from "./envFlag.js";

describe("envFlag", () => {
  it.each(["true", "TRUE", " True "])("reads %j as on", (value) => {
    expect(envFlag("X", false, { X: value })).toBe(true);
  });
  it.each(["false", "FALSE"])("reads %j as off", (value) => {
    expect(envFlag("X", true, { X: value })).toBe(false);
  });
  it("uses the fallback when unset or empty", () => {
    expect(envFlag("X", true, {})).toBe(true);
    expect(envFlag("X", false, { X: "" })).toBe(false);
  });
  it.each(["1", "0", "yes", "off", "maybe"])("ignores %j and uses the fallback", (value) => {
    expect(envFlag("Y", true, { Y: value })).toBe(true);
    expect(envFlag("Z", false, { Z: value })).toBe(false);
  });
});
