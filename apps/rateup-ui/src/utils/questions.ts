import { PageDescription, PageTitle, PageType, QuestionType, SurveyType } from "@/types/enums.ts";

import { getContent } from ".";
import { ChoiceTypeQuestions, defaultTitleSubtitleStartBtnTextsObj } from "./constants.ts";

interface Reorderable {
  type?: string;
}
export function reorder<T extends Reorderable>(
  array: Array<T>,
  from: number,
  to: number,
): Array<T> {
  const newArray = [...array];
  const item = newArray.splice(from, 1)[0];
  newArray.splice(to, 0, item);

  const reOrderedList = reOrderPages(newArray);

  return reOrderedList;
}

export function reOrderPages<T extends Reorderable>(pages: Array<T>) {
  if (!pages?.length) {
    return pages;
  }

  const newArray = [];
  const welcomeItem = pages.find((item) => item.type === "Welcome");
  const languageItem = pages.find((item) => item.type === "Language");
  const thankYouItem = pages.find((item) => item.type === "ThankYou");
  const googleReviewItem = pages.find((item) => item.type === "GoogleReview");

  const pagesTypeStrsArr = ["Welcome", "Language", "ThankYou", "GoogleReview"];
  // PagesObjs means objects with type key value as Welcome, Language, ThankYou.
  const arrWithoutPagesObjs = pages.filter((obj) => !pagesTypeStrsArr.includes(obj.type));
  if (welcomeItem) newArray.push({ ...welcomeItem });
  if (languageItem) newArray.push({ ...languageItem });
  for (const pageObj of arrWithoutPagesObjs) {
    newArray.push(pageObj);
  }
  if (thankYouItem) newArray.push({ ...thankYouItem });
  if (googleReviewItem) newArray.push({ ...googleReviewItem });

  return newArray;
}

export function createPage(
  type: PageType,
  languages: string[],
  surveyType = SurveyType.Web,
): Question {
  const isWaFlow = surveyType === SurveyType.WaFlow;
  const title: Record<string, string> = {};
  const description: Record<string, string> = {};
  const label: Record<string, string> | undefined = isWaFlow ? {} : undefined;

  // PageTitle/PageDescription only cover a subset of PageType (GoogleReview has
  // no entry), so the lookup is partial — as it already was at runtime.
  const pageTitles: Partial<Record<PageType, string>> = PageTitle;
  const pageDescriptions: Partial<Record<PageType, string>> = PageDescription;

  for (const language of languages) {
    title[language] = pageTitles[type];
    description[language] = pageDescriptions[type];
    if (label) {
      label[language] = "";
    }
  }

  let defaultTitleSubtitleStartBtnTexts = {};
  switch (type) {
    case PageType.Welcome: {
      defaultTitleSubtitleStartBtnTexts = defaultTitleSubtitleStartBtnTextsObj["welcomePage"];
      break;
    }
    case PageType.Language: {
      defaultTitleSubtitleStartBtnTexts = defaultTitleSubtitleStartBtnTextsObj["languagePage"];
      break;
    }
    case PageType.ThankYou: {
      defaultTitleSubtitleStartBtnTexts = defaultTitleSubtitleStartBtnTextsObj["thankyouPage"];
      break;
    }
  }

  return {
    // TODO: only set id when saving to db?
    id: "",
    title,
    description,
    label,
    required: true,
    type,
    extraConfig: {},
    ...defaultTitleSubtitleStartBtnTexts,
  };
}

export function createBlankQuestion(
  type: QuestionType,
  languages: string[],
  surveyType = SurveyType.Web,
): Question {
  const isWaFlow = surveyType === SurveyType.WaFlow;
  const title: Record<string, string> = {};
  const description: Record<string, string> = {};
  const label: Record<string, string> | undefined = isWaFlow ? {} : undefined;

  for (const language of languages) {
    title[language] = "";
    description[language] = "";
    if (label) {
      label[language] = "";
    }
  }

  return {
    // TODO: only set id when saving to db?
    id: "",
    title,
    description,
    label,
    required: type !== QuestionType.InfoMessage,
    type,
    extraConfig: {},
  };
}

export function validateAllLanguagesArePopulated(
  question: Question,
  languages: Array<string>,
  keyToValidate: Array<"title" | "description" | "choices">,
) {
  const missingLangs: string[] = [];

  keyToValidate.forEach((key) => {
    if (key === "choices") {
      validateChoices(question, languages).forEach((missinglang) => {
        if (!missingLangs.includes(missinglang)) missingLangs.push(missinglang);
      });
    } else {
      languages.forEach((language: string) => {
        if (!question[key][language] || !getContent(question[key][language]).trim().length) {
          if (!missingLangs.includes(language)) missingLangs.push(language);
        }
      });
    }
  });
  return missingLangs;
}

const CONTACT_FEATURE_TYPES = [QuestionType.Contact, QuestionType.Phone, QuestionType.Email];
const CONTACT_FEATURE_KEYS = ["name", "phone", "email"] as const;

/**
 * Default enabled/disabled state for the Contact question's sub-fields, by
 * question type. Every option starts off, except the field a dedicated
 * Phone/Email question is built around — that one has no visible toggle for
 * its own type, so it must stay on.
 */
export function getDefaultContactFeatureEnabled(
  qtype: QuestionType,
): Record<(typeof CONTACT_FEATURE_KEYS)[number], boolean> {
  return {
    name: false,
    phone: qtype === QuestionType.Phone,
    email: qtype === QuestionType.Email,
  };
}

/**
 * For Contact/Phone/Email questions, at least one sub-field (name/phone/email)
 * must be enabled — returns the languages where none is enabled.
 *
 * A language whose `features` entry hasn't been initialized yet (the editor
 * only sets it up lazily, for whichever language tab is currently open) falls
 * back to the same type-based default ContactExtraProps would give it, so an
 * unvisited language isn't incorrectly treated as "nothing enabled".
 */
export function validateContactFeaturesPopulated(
  question: Question,
  languages: Array<string>,
): Array<string> {
  if (!CONTACT_FEATURE_TYPES.includes(question?.type as QuestionType)) return [];

  const defaultEnabled = getDefaultContactFeatureEnabled(question.type as QuestionType);

  const missingLangs: string[] = [];
  languages.forEach((language) => {
    const featureSet = question?.features?.[language];
    const hasAnyEnabled = CONTACT_FEATURE_KEYS.some((key) =>
      featureSet ? featureSet[key]?.isEnabled : defaultEnabled[key],
    );
    if (!hasAnyEnabled) missingLangs.push(language);
  });
  return missingLangs;
}

export const getInitialQuestionValues = (
  question: Question,
  languages: Array<string>,
  type = SurveyType.Web,
): Question & { enableNpsAnalytics?: boolean; extraConfig: any } => {
  const emptyText: Record<string, string> = {};
  languages?.forEach((lang) => {
    emptyText[lang] = "";
  });

  const required =
    question?.type !== QuestionType.InfoMessage && !(question?.type in PageType)
      ? question?.required
      : false;

  return {
    id: question?.id ?? undefined,
    title: { ...emptyText, ...question?.title },
    description: { ...emptyText, ...question?.description },
    label: type === SurveyType.WaFlow ? { ...emptyText, ...question?.label } : undefined,
    required,
    enableNpsAnalytics: question?.enableNpsAnalytics,
    type: question?.type,
    choices: question?.choices,
    features: question?.features,
    tnc: question?.tnc,
    optinScreenId: question?.optinScreenId,
    wop: question?.wop,
    sections: type === SurveyType.WhatsApp ? question?.sections || {} : undefined,
    onSelectAction: question?.onSelectAction,
    waAppName: question?.waAppName,
    extraConfig: question?.extraConfig,
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
function validateChoices(question: Question, languages: Array<string>): Array<string> {
  if (!ChoiceTypeQuestions.includes(question.type as QuestionType)) {
    return [];
  } else if (languages.length === 1) {
    return [];
  } else {
    const choiceLength = question.choices?.[languages[0]]?.length;
    return languages.filter((lang) => question.choices?.[lang]?.length !== choiceLength);
  }
}

export const OpinionResponses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const RatingResponses = [1, 2, 3, 4, 5];
export const ratingEmoji = "⭐️";
