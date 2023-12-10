import { QuestionType } from "../types/enums";

export function reorder<T>(
  array: Array<T>,
  from: number,
  to: number,
): Array<T> {
  const newArray = [...array];
  const item = newArray.splice(from, 1)[0];
  newArray.splice(to, 0, item);
  return newArray;
}

export function createBlankQuestion(
  type: QuestionType,
  language: string,
): Question {
  return {
    // TODO: only set id when saving to db?
    id: "",
    title: {
      [language]: "",
    },
    description: {
      [language]: "",
    },
    required: true,
    type,
  };
}

export function validateAllLanguagesArePopulated(
  surveyLanguages: string[],
  data: { [key: string]: string },
) {
  const missingLangs = [];

  surveyLanguages.forEach((language: string) => {
    if (!data[language] || data[language] == "") {
      missingLangs.push(language);
    }
  });

  return missingLangs;
}

export const getInitialQuestionValues = (
  question: Question,
  languages: Array<string>,
  type = "web",
) => {
  const emptyText = {};
  languages.forEach((lang) => {
    emptyText[lang] = "";
  });
  return {
    title: { ...emptyText, ...question?.title },
    description: { ...emptyText, ...question?.description },
    required: question?.required,
    type: question?.type,
    choices: question?.choices,
    sections: type === "whatsapp" ? question?.sections || {} : undefined,
  };
};

export function getChoiceIndex(choice: string | Choice, choices: Choice[]) {
  if (typeof choice === "string") {
    return choices.findIndex((c) => c.value === choice);
  }
  return choices.findIndex((c) => c.value === choice.value);
}
