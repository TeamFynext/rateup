import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    surveyTeamMap: { findFirst: vi.fn() },
  },
}));
vi.mock("./survey.service.js", () => ({
  createSurveyVariable: vi.fn(),
  getSurveyById: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { createSurveyVariable, getSurveyById } from "./survey.service.js";
import {
  createSurveyDefaultVariableForQuestion,
  getSurveysOrgId,
  getSurveyTeamMapIdFromShortId,
  isShortId,
} from "./survey.utils.js";
import { QuestionType, SurveyType, SurveyVariableType } from "../../types/enums.js";

const findFirstMock = prisma.surveyTeamMap.findFirst as unknown as ReturnType<typeof vi.fn>;
const getSurveyByIdMock = getSurveyById as unknown as ReturnType<typeof vi.fn>;
const createVariableMock = createSurveyVariable as unknown as ReturnType<typeof vi.fn>;

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

describe("createSurveyDefaultVariableForQuestion", () => {
  test("does nothing for non-web surveys", async () => {
    getSurveyByIdMock.mockResolvedValue({ type: SurveyType.WhatsApp });

    await createSurveyDefaultVariableForQuestion(
      "survey-1",
      { id: "q1", type: QuestionType.Text },
      0,
    );

    expect(createVariableMock).not.toHaveBeenCalled();
  });

  test("creates a single response variable for simple question types, named by 1-based position", async () => {
    getSurveyByIdMock.mockResolvedValue({ type: SurveyType.Web });

    await createSurveyDefaultVariableForQuestion(
      "survey-1",
      { id: "q1", type: QuestionType.Rating },
      2,
    );

    expect(createVariableMock).toHaveBeenCalledTimes(1);
    expect(createVariableMock).toHaveBeenCalledWith("survey-1", {
      name: "Q3_response",
      value: "q1",
      type: SurveyVariableType.DEFAULT,
    });
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
  ])("creates one variable for question type %s", async (type) => {
    getSurveyByIdMock.mockResolvedValue({ type: SurveyType.Web });

    await createSurveyDefaultVariableForQuestion("survey-1", { id: "q1", type }, 0);

    expect(createVariableMock).toHaveBeenCalledTimes(1);
    expect(createVariableMock.mock.calls[0][1].name).toBe("Q1_response");
  });

  test("creates name/phone/email variables for a Contact question", async () => {
    getSurveyByIdMock.mockResolvedValue({ type: SurveyType.Web });

    await createSurveyDefaultVariableForQuestion(
      "survey-1",
      { id: "q1", type: QuestionType.Contact },
      0,
    );

    expect(createVariableMock).toHaveBeenCalledTimes(3);
    expect(createVariableMock.mock.calls.map((c) => c[1].name)).toEqual([
      "Q1_name_response",
      "Q1_phone_response",
      "Q1_email_response",
    ]);
  });

  test("creates name/jobTitle/testimonial/rating variables for a Testimonial question", async () => {
    getSurveyByIdMock.mockResolvedValue({ type: SurveyType.Web });

    await createSurveyDefaultVariableForQuestion(
      "survey-1",
      { id: "q1", type: QuestionType.Testimonial },
      4,
    );

    expect(createVariableMock).toHaveBeenCalledTimes(4);
    expect(createVariableMock.mock.calls.map((c) => c[1].name)).toEqual([
      "Q5_name_response",
      "Q5_jobTitle_response",
      "Q5_testimonial_response",
      "Q5_rating_response",
    ]);
  });

  test("returns false and creates nothing for unsupported question types", async () => {
    getSurveyByIdMock.mockResolvedValue({ type: SurveyType.Web });

    const res = await createSurveyDefaultVariableForQuestion(
      "survey-1",
      { id: "q1", type: QuestionType.Photo },
      0,
    );

    expect(res).toBe(false);
    expect(createVariableMock).not.toHaveBeenCalled();
  });

  test("returns false when the question is missing a type", async () => {
    getSurveyByIdMock.mockResolvedValue({ type: SurveyType.Web });

    const res = await createSurveyDefaultVariableForQuestion("survey-1", undefined, 0);

    expect(res).toBe(false);
    expect(createVariableMock).not.toHaveBeenCalled();
  });
});
