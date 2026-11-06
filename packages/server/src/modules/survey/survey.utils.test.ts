import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    surveyTeamMap: { findFirst: vi.fn() },
  },
}));

import prisma from "../../utils/prisma.js";
import {
  defaultVariablesForQuestion,
  getSurveysOrgId,
  getSurveyTeamMapIdFromShortId,
  isShortId,
} from "./survey.utils.js";
import { QuestionType, SurveyVariableType } from "../../types/enums.js";

const findFirstMock = prisma.surveyTeamMap.findFirst as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isShortId", () => {
  test("treats an 8-char id as a short url id", () => {
    expect(isShortId("abcd1234")).toBe(true);
  });

  test("rejects ids of any other length (e.g. uuids)", () => {
    expect(isShortId("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    expect(isShortId("short")).toBe(false);
    expect(isShortId("")).toBe(false);
  });
});

describe("getSurveysOrgId", () => {
  test("resolves the org through the survey's first team mapping", async () => {
    findFirstMock.mockResolvedValue({ team: { orgId: "org-1" } });

    await expect(getSurveysOrgId("survey-1")).resolves.toBe("org-1");
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { surveyId: "survey-1" },
      include: { team: true },
    });
  });

  test("throws when the survey has no team mapping", async () => {
    findFirstMock.mockResolvedValue(null);
    await expect(getSurveysOrgId("survey-1")).rejects.toThrow();
  });
});

describe("getSurveyTeamMapIdFromShortId", () => {
  test("returns the mapping id for a known short url id", async () => {
    findFirstMock.mockResolvedValue({ id: "map-1" });

    await expect(getSurveyTeamMapIdFromShortId("abcd1234")).resolves.toBe("map-1");
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { shortUrlId: "abcd1234" },
      select: { id: true },
    });
  });

  test("returns undefined instead of throwing for an unknown short url id", async () => {
    findFirstMock.mockResolvedValue(null);
    await expect(getSurveyTeamMapIdFromShortId("nope1234")).resolves.toBeUndefined();
  });
});

describe("defaultVariablesForQuestion", () => {
  test("names a simple question's variable by its 1-based position", () => {
    expect(defaultVariablesForQuestion({ id: "q1", type: QuestionType.Rating }, 2)).toEqual([
      { name: "Q3_response", value: "q1", type: SurveyVariableType.DEFAULT },
    ]);
  });

  test.each([
    QuestionType.Text,
    QuestionType.Date,
    QuestionType.LD,
    QuestionType.Number,
    QuestionType.Opinion,
    QuestionType.YN,
    QuestionType.Smiley,
    QuestionType.TextArea,
    QuestionType.TnC,
    QuestionType.WOP,
  ])("returns one variable for question type %s", (type) => {
    const variables = defaultVariablesForQuestion({ id: "q1", type }, 0);

    expect(variables.map((v) => v.name)).toEqual(["Q1_response"]);
  });

  test("returns name/phone/email variables for a Contact question", () => {
    const variables = defaultVariablesForQuestion({ id: "q1", type: QuestionType.Contact }, 0);

    expect(variables.map((v) => v.name)).toEqual([
      "Q1_name_response",
      "Q1_phone_response",
      "Q1_email_response",
    ]);
    expect(variables.every((v) => v.value === "q1")).toBe(true);
  });

  test("returns name/jobTitle/testimonial/rating variables for a Testimonial question", () => {
    const variables = defaultVariablesForQuestion({ id: "q1", type: QuestionType.Testimonial }, 4);

    expect(variables.map((v) => v.name)).toEqual([
      "Q5_name_response",
      "Q5_jobTitle_response",
      "Q5_testimonial_response",
      "Q5_rating_response",
    ]);
  });

  test("returns nothing for unsupported question types", () => {
    expect(defaultVariablesForQuestion({ id: "q1", type: QuestionType.Photo }, 0)).toEqual([]);
  });

  test("returns nothing when the question is missing", () => {
    expect(defaultVariablesForQuestion(undefined, 0)).toEqual([]);
  });
});
