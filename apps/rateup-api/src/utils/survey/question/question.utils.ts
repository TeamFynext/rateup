import { QuestionType, WaQuestions } from "../../../types/enums.js";

export const ChoiceTypeQuestions = [
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDMS,
  QuestionType.DDSS,
  QuestionType.CustomNPS,
  QuestionType.WaButtons,
];
export const ChoiceTypeQuestionsV2 = [
  WaQuestions.CheckboxGroup,
  WaQuestions.Dropdown,
  WaQuestions.RadioButtonsGroup,
];

export function getChoiceIndex(
  choice: string | Choice,
  choices: Choice[] | { value: { title: string } }[],
) {
  if (typeof choice === "string") {
    return choices.findIndex((c) => c.value === choice);
  }
  return choices.findIndex((c) =>
    typeof c.value == "object" ? c.value.title === choice.value : c.value === choice.value,
  );
}
