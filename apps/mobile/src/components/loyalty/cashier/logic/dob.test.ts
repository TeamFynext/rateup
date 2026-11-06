import { describe, expect, test } from "vitest";

import { dobToDisplay, formatDobInput, parseDob } from "./dob";

const NOW = new Date(2026, 8, 10); // 10 September 2026

describe("formatDobInput", () => {
  test("inserts the slashes as the digits are reached", () => {
    expect(formatDobInput("0")).toBe("0");
    expect(formatDobInput("04")).toBe("04");
    expect(formatDobInput("0407")).toBe("04/07");
    expect(formatDobInput("04071988")).toBe("04/07/1988");
  });

  test("ignores anything that is not a digit, and stops at eight", () => {
    expect(formatDobInput("04/07/1988")).toBe("04/07/1988");
    expect(formatDobInput("040719889999")).toBe("04/07/1988");
  });
});

describe("parseDob", () => {
  test("a complete date becomes a calendar date", () => {
    expect(parseDob("04/07/1988", NOW)).toBe("1988-07-04");
    expect(parseDob("29/02/2024", NOW)).toBe("2024-02-29");
  });

  test("an incomplete date is not a date yet", () => {
    expect(parseDob("04/07", NOW)).toBeNull();
    expect(parseDob("", NOW)).toBeNull();
  });

  // `new Date(1988, 1, 31)` silently becomes 2 March, which would store a birthday nobody
  // typed — so the day is checked against the month's real length.
  test("a day the month does not have is rejected, not rolled forward", () => {
    expect(parseDob("31/02/1988", NOW)).toBeNull();
    expect(parseDob("29/02/2023", NOW)).toBeNull();
    expect(parseDob("31/04/1988", NOW)).toBeNull();
  });

  test("a month out of range is rejected", () => {
    expect(parseDob("04/13/1988", NOW)).toBeNull();
    expect(parseDob("04/00/1988", NOW)).toBeNull();
  });

  test("a birthday in the future or before 1900 is rejected", () => {
    expect(parseDob("11/09/2026", NOW)).toBeNull();
    expect(parseDob("04/07/2027", NOW)).toBeNull();
    expect(parseDob("04/07/1899", NOW)).toBeNull();
  });

  // A date is stored as a calendar date rather than `toISOString()`, because local midnight
  // east of Greenwich serialises to the previous day — and a birthday message then goes out
  // a day early, every year.
  test("the stored value carries no time and no zone", () => {
    expect(parseDob("01/01/1990", NOW)).toBe("1990-01-01");
  });
});

describe("dobToDisplay", () => {
  test("reads back both shapes the API returns", () => {
    expect(dobToDisplay("1988-07-04")).toBe("04/07/1988");
    expect(dobToDisplay("1988-07-04T00:00:00.000Z")).toBe("04/07/1988");
  });

  test("an absent or unparseable birthday shows as empty", () => {
    expect(dobToDisplay(null)).toBe("");
    expect(dobToDisplay(undefined)).toBe("");
    expect(dobToDisplay("not a date")).toBe("");
  });
});
