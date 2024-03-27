import { QuestionType, SurveyType } from "../types/enums";
import { ChoiceTypeQuestions } from "./constants";

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
  surveyType = SurveyType.Web,
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
    label:
      surveyType === SurveyType.WaFlow
        ? {
            [language]: "",
          }
        : undefined,
    required: true,
    type,
  };
}

export function validateAllLanguagesArePopulated(
  question: Question,
  languages: Array<string>,
  keyToValidate: Array<"title" | "description" | "choices">,
) {
  let missingLangs = [];

  keyToValidate.forEach((key) => {
    if (key === "choices") {
      validateChoices(question, languages).forEach((missinglang) => {
        if (!missingLangs.includes(missinglang)) missingLangs.push(missinglang);
      });
    } else {
      languages.forEach((language: string) => {
        if (!question[key][language] || question[key][language] == "") {
          if (!missingLangs.includes(language)) missingLangs.push(language);
        }
      });
    }
  });

  return missingLangs;
}

export const getInitialQuestionValues = (
  question: Question,
  languages: Array<string>,
  type = SurveyType.Web,
): Omit<Question, "id"> & { enableNpsAnalytics?: boolean } => {
  const emptyText = {};
  languages.forEach((lang) => {
    emptyText[lang] = "";
  });

  const required =
    question.type !== QuestionType.InfoMessage ? question?.required : false;

  return {
    title: { ...emptyText, ...question?.title },
    description: { ...emptyText, ...question?.description },
    label:
      type === SurveyType.WaFlow
        ? { ...emptyText, ...question?.label }
        : undefined,
    required,
    enableNpsAnalytics: question?.enableNpsAnalytics,
    type: question?.type,
    choices: question?.choices,
    features: question?.features,
    tnc: question?.tnc,
    sections:
      type === SurveyType.WhatsApp ? question?.sections || {} : undefined,
  };
};

export function getChoiceIndex(choice: string | Choice, choices: Choice[]) {
  if (typeof choice === "string") {
    return choices.findIndex((c) => c.value === choice);
  }
  return choices.findIndex((c) => c.value === choice.value);
}

/**
 * Returns array of languages that do not have the same number of choices as the first language
 */
export function validateChoices(
  question: Question,
  languages: Array<string>,
): Array<string> {
  if (!ChoiceTypeQuestions.includes(question.type)) {
    return [];
  } else if (languages.length === 1) {
    return [];
  } else {
    const choiceLength = question.choices?.[languages[0]]?.length;
    return languages.filter(
      (lang) => question.choices?.[lang]?.length !== choiceLength,
    );
  }
}

export const OpinionResponses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const RatingResponses = [1, 2, 3, 4, 5];
export const ratingEmoji = "⭐️";
