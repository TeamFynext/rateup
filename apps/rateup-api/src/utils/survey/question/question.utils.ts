import { QuestionType } from "../../../types/enums";

export const ChoiceTypeQuestions = [
    QuestionType.MCQ,
    QuestionType.MSQ,
    QuestionType.DDMS,
    QuestionType.DDSS,
    QuestionType.CustomNPS,
    QuestionType.WaButtons,
];

export function getChoiceIndex(choice: string | Choice, choices: Choice[]) {
    if (typeof choice === "string") {
        return choices.findIndex((c) => c.value === choice);
    }
    return choices.findIndex((c) => c.value === choice.value);
}
