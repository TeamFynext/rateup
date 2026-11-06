import { describe, expect, test } from "vitest";
import { QuestionType, WaQuestions } from "../../../types/enums.js";
import { ChoiceTypeQuestions, ChoiceTypeQuestionsV2, getChoiceIndex } from "./question.utils.js";

describe("which question types offer choices", () => {
  test("covers the web choice questions", () => {
    expect(ChoiceTypeQuestions).toEqual([
      QuestionType.MCQ,
      QuestionType.MSQ,
      QuestionType.DDMS,
      QuestionType.DDSS,
      QuestionType.CustomNPS,
      QuestionType.WaButtons,
    ]);
  });

  test("excludes free-text questions", () => {
    expect(ChoiceTypeQuestions).not.toContain(QuestionType.Text);
  });

  test("covers the WhatsApp choice questions", () => {
    expect(ChoiceTypeQuestionsV2).toEqual([
      WaQuestions.CheckboxGroup,
      WaQuestions.Dropdown,
      WaQuestions.RadioButtonsGroup,
    ]);
  });

  test.each([
    ["web", ChoiceTypeQuestions as readonly string[]],
    ["WhatsApp", ChoiceTypeQuestionsV2 as readonly string[]],
  ])("lists each %s type only once", (_name, list) => {
    expect(new Set(list).size).toBe(list.length);
  });
});

describe("getChoiceIndex", () => {
  const plainChoices = [{ value: "Red" }, { value: "Green" }, { value: "Blue" }] as any;

  test("finds a plain string answer among plain choices", () => {
    expect(getChoiceIndex("Green", plainChoices)).toBe(1);
  });

  test("reports -1 when a string answer matches no choice", () => {
    expect(getChoiceIndex("Yellow", plainChoices)).toBe(-1);
  });

  test("finds a choice-shaped answer among plain choices", () => {
    expect(getChoiceIndex({ value: "Blue" } as any, plainChoices)).toBe(2);
  });

  // WhatsApp flow choices nest the label under `value.title`.
  test("matches a choice-shaped answer against a titled choice", () => {
    const titled = [{ value: { title: "Red" } }, { value: { title: "Green" } }] as any;

    expect(getChoiceIndex({ value: "Green" } as any, titled)).toBe(1);
  });

  test("reports -1 when a titled choice does not match", () => {
    const titled = [{ value: { title: "Red" } }] as any;

    expect(getChoiceIndex({ value: "Green" } as any, titled)).toBe(-1);
  });

  test("returns the first position when the same choice appears twice", () => {
    const duplicated = [{ value: "Red" }, { value: "Red" }] as any;

    expect(getChoiceIndex("Red", duplicated)).toBe(0);
  });

  test("reports -1 against an empty choice list", () => {
    expect(getChoiceIndex("Red", [] as any)).toBe(-1);
  });

  test("matches exactly rather than by case", () => {
    expect(getChoiceIndex("green", plainChoices)).toBe(-1);
  });
});
