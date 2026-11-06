import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../prisma.js", () => ({
  default: { surveyTeamMap: { findUnique: vi.fn() } },
  excludeFields: vi.fn(),
}));

import prisma from "../prisma.js";
import { getSurveyIdfromMap, getSurveyTeamIdFromMap } from "./mapActions.js";

type Mock = ReturnType<typeof vi.fn>;

const findUnique = (prisma as unknown as { surveyTeamMap: { findUnique: Mock } }).surveyTeamMap
  .findUnique;

const VALID_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue({ id: VALID_ID, teamId: "team-1", surveyId: "survey-1" });
});

describe("getSurveyTeamIdFromMap", () => {
  test("returns the team the mapping points at", async () => {
    await expect(getSurveyTeamIdFromMap(VALID_ID)).resolves.toBe("team-1");
    expect(findUnique).toHaveBeenCalledWith({ where: { id: VALID_ID } });
  });

  test("returns null when the mapping does not exist", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getSurveyTeamIdFromMap(VALID_ID)).resolves.toBeNull();
  });
});

describe("getSurveyIdfromMap", () => {
  test("returns the survey the mapping points at", async () => {
    await expect(getSurveyIdfromMap(VALID_ID)).resolves.toBe("survey-1");
  });

  test("returns null when the mapping does not exist", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getSurveyIdfromMap(VALID_ID)).resolves.toBeNull();
  });
});

// The id reaches these helpers straight from a public URL, so anything that is not a
// UUID is rejected before it can be handed to Postgres as a uuid-typed parameter.
describe("rejecting ids that are not UUIDs", () => {
  const bad: [string, unknown][] = [
    ["an empty string", ""],
    ["undefined", undefined],
    ["null", null],
    ["a plain word", "not-a-uuid"],
    ["a number", "12345"],
    ["a UUID missing a section", "3f2504e0-4f89-11d3-0305e82c3301"],
    ["a UUID with a non-hex character", "3f2504e0-4f89-11d3-9a0c-0305e82c330z"],
    ["a UUID with trailing text", `${VALID_ID}-extra`],
    ["a SQL fragment", "' OR 1=1 --"],
  ];

  test.each(bad)("getSurveyTeamIdFromMap returns null for %s", async (_name, input) => {
    await expect(getSurveyTeamIdFromMap(input as any)).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  test.each(bad)("getSurveyIdfromMap returns null for %s", async (_name, input) => {
    await expect(getSurveyIdfromMap(input as any)).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("accepts an upper-case UUID", async () => {
    await expect(getSurveyTeamIdFromMap(VALID_ID.toUpperCase())).resolves.toBe("team-1");
  });
});
