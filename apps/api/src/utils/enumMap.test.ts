import { describe, expect, test } from "vitest";
import {
  LDResponse,
  QuestionType,
  RatingScale,
  SmileyResponse,
  WaQuestions,
  YNResponse,
} from "../types/enums.js";
import {
  barGraphQuestions,
  barGraphQuestions2,
  LDResponseMap,
  npsQuestionTypes,
  npsQuestionTypes2,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "./enumMap.js";

// These maps turn the numeric answer stored against a response into the label shown
// in reports, so an off-by-one here silently mislabels every historical answer.
describe("answer value to label", () => {
  test.each([
    [1, LDResponse.Like],
    [2, LDResponse.Dislike],
  ])("maps like/dislike answer %s", (value, expected) => {
    expect(LDResponseMap[value]).toBe(expected);
  });

  test.each([
    [1, YNResponse.Yes],
    [2, YNResponse.No],
  ])("maps yes/no answer %s", (value, expected) => {
    expect(YNResponseMap[value]).toBe(expected);
  });

  test.each([
    [1, SmileyResponse.VerySad],
    [2, SmileyResponse.Sad],
    [3, SmileyResponse.Neutral],
    [4, SmileyResponse.Happy],
    [5, SmileyResponse.VeryHappy],
  ])("maps smiley answer %s", (value, expected) => {
    expect(SmileyResponseMap[value]).toBe(expected);
  });

  test.each([
    [1, RatingScale.VeryPoor],
    [2, RatingScale.Poor],
    [3, RatingScale.Average],
    [4, RatingScale.Good],
    [5, RatingScale.Excellent],
  ])("maps rating answer %s", (value, expected) => {
    expect(RatingScaleMap[value]).toBe(expected);
  });

  test("runs the smiley and rating scales worst to best", () => {
    expect(Object.keys(SmileyResponseMap)).toEqual(["1", "2", "3", "4", "5"]);
    expect(Object.keys(RatingScaleMap)).toEqual(["1", "2", "3", "4", "5"]);
  });

  test.each([
    ["like/dislike", LDResponseMap],
    ["yes/no", YNResponseMap],
    ["smiley", SmileyResponseMap],
    ["rating", RatingScaleMap],
  ])("gives no label to an out-of-range %s answer", (_name, map) => {
    expect(map[0]).toBeUndefined();
    expect(map[99]).toBeUndefined();
  });

  test.each([
    ["like/dislike", LDResponseMap],
    ["yes/no", YNResponseMap],
    ["smiley", SmileyResponseMap],
    ["rating", RatingScaleMap],
  ])("gives every %s answer a distinct label", (_name, map) => {
    const labels = Object.values(map);

    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("which question types are scored as NPS", () => {
  test("covers every scale-style question", () => {
    expect(npsQuestionTypes).toEqual([
      QuestionType.Rating,
      QuestionType.Smiley,
      QuestionType.LD,
      QuestionType.YN,
      QuestionType.Opinion,
      QuestionType.CustomNPS,
    ]);
  });

  test("excludes free-text and choice questions, which have no score", () => {
    expect(npsQuestionTypes).not.toContain(QuestionType.MCQ);
    expect(npsQuestionTypes).not.toContain(QuestionType.MSQ);
  });

  test("covers the WhatsApp equivalents", () => {
    expect(npsQuestionTypes2).toEqual([
      WaQuestions.Rating,
      WaQuestions.Smiley,
      WaQuestions.LD,
      WaQuestions.YN,
      WaQuestions.Opinion,
    ]);
  });

  // CustomNPS has no WhatsApp counterpart, so the two lists differ by one.
  test("has one fewer WhatsApp type than web type", () => {
    expect(npsQuestionTypes2).toHaveLength(npsQuestionTypes.length - 1);
  });
});

describe("which question types can be drawn as a bar graph", () => {
  test("includes every NPS type", () => {
    for (const type of npsQuestionTypes) {
      expect(barGraphQuestions).toContain(type);
    }
  });

  test("adds the choice-style questions on top", () => {
    expect(barGraphQuestions).toContain(QuestionType.MCQ);
    expect(barGraphQuestions).toContain(QuestionType.MSQ);
    expect(barGraphQuestions).toContain(QuestionType.MCQGrid);
    expect(barGraphQuestions).toContain(QuestionType.DDMS);
    expect(barGraphQuestions).toContain(QuestionType.DDSS);
  });

  test("includes every WhatsApp NPS type in the WhatsApp list", () => {
    for (const type of npsQuestionTypes2) {
      expect(barGraphQuestions2).toContain(type);
    }
  });

  test.each([
    ["web", barGraphQuestions as readonly string[]],
    ["WhatsApp", barGraphQuestions2 as readonly string[]],
  ])("lists each %s question type only once", (_name, list) => {
    expect(new Set(list).size).toBe(list.length);
  });
});
