import {
  LogicAction,
  LogicCondition,
  PageType,
  QuestionType,
  WaQuestions,
} from "../../types/enums.js";
import { QuestionType as Q, QuestionType2 } from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import {
  ChoiceTypeQuestions,
  ChoiceTypeQuestionsV2,
  getChoiceIndex,
} from "../../utils/survey/question/question.utils.js";
import cloneDeep from "lodash/cloneDeep.js";

// Copied from frontend. Update accordingly.
export const logicSupportedTypes = Object.values(Q);
export function parseLogicAction(
  question: Question,
  userResponse: Choice | string | Choice[] | number,
  language: string,
): LogicAction | string {
  // Any modifications to logic-jump algorithm should be reflected in frontend & backend (questions/questions.util & whatsappSurvey module).

  try {
    if (typeof userResponse === "number") {
      userResponse = userResponse.toString();
    }
    const { type, logic: logicJumps } = question;
    if (!logicSupportedTypes.includes(type) || !userResponse) {
      return LogicAction.NextQ;
    }

    let flag = false;
    // A question with no logic jumps configured simply falls through to NextQ below —
    // `logicJumps` (`question.logic`) is optional, so guard rather than crash on `for...of`.
    for (const logic of logicJumps ?? []) {
      let iterator: "some" | "every" = "some";
      let comparator: (value: string) => boolean = () => false;

      if (ChoiceTypeQuestions.includes(type)) {
        if (!question.choices) {
          throw new Error(`Question ${question.id} is missing choices for logic evaluation`);
        }
        const choices = question.choices[language];
        let userResponseIndices: string[];
        if (Array.isArray(userResponse)) {
          userResponseIndices = userResponse.map((choice) =>
            getChoiceIndex(choice, choices).toString(),
          );
        } else {
          userResponseIndices = [getChoiceIndex(userResponse as Choice, choices).toString()];
        }
        switch (logic.condition) {
          case LogicCondition.IncludesAllOf:
            iterator = "every";
            comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.IncludesAnyOf:
            iterator = "some";
            comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.IncludesNoneOf:
            iterator = "every";
            comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.Equals:
            iterator = "every";
            comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
            break;
          case LogicCondition.NotEquals:
            iterator = "every";
            comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
            break;

          default:
            break;
        }
        switch (logic.condition) {
          case LogicCondition.NotEquals:
          case LogicCondition.Equals:
            if (type === QuestionType.MSQ || type === QuestionType.DDMS) {
              if (!Array.isArray(logic.response)) {
                throw new Error("Logic response should be an array for MSQ/DDMS questions");
              }
              flag =
                iterator === "every"
                  ? logic.response.every(comparator)
                  : logic.response.some(comparator);
            } else {
              const singleResponse = Array.isArray(logic.response)
                ? logic.response.join(",")
                : logic.response;
              flag =
                iterator === "every"
                  ? [singleResponse].every(comparator)
                  : [singleResponse].some(comparator);
            }
            break;

          case LogicCondition.IncludesAllOf:
          case LogicCondition.IncludesAnyOf:
          case LogicCondition.IncludesNoneOf:
            if (Array.isArray(logic.response)) {
              flag =
                iterator === "every"
                  ? logic.response.every(comparator)
                  : logic.response.some(comparator);
            } else {
              throw new Error("Logic response should be an array");
            }
            break;

          case LogicCondition.Submitted:
            flag = true;
            break;

          default:
            log.warn("Invalid logic condition %o", logic);
            break;
        }
      } else {
        // non-choice type questions
        switch (logic.condition) {
          case LogicCondition.Equals:
            flag = userResponse === logic.response;
            break;
          case LogicCondition.NotEquals:
            flag = userResponse !== logic.response;
            break;
          case LogicCondition.Submitted:
            flag = true;
            break;
        }
      }

      if (flag) {
        return logic.action;
      }
    }
    return LogicAction.NextQ;
  } catch (e) {
    console.warn(e);
    return LogicAction.NextQ;
  }
}

// checks if a single logic condition is satisfied
export function validateLogic(
  question: Question,
  userResponse: Choice | string | Choice[] | number,
  language: string,
  condition: LogicCondition,
  conditionResponse: string | string[],
): boolean {
  // TODO: make use of this function in parseLogicAction
  // Any modifications to logic-jump algorithm should be reflected in frontend & backend (questions/questions.util & whatsappSurvey module).

  try {
    if (typeof userResponse === "number") {
      userResponse = userResponse.toString();
    }
    const { type } = question;
    if (!logicSupportedTypes.includes(type) || !userResponse) {
      return false;
    }

    let flag = false;
    let iterator: "some" | "every" = "some";
    let comparator: (value: string) => boolean = () => false;

    if (ChoiceTypeQuestions.includes(type)) {
      if (!question.choices) {
        throw new Error(`Question ${question.id} is missing choices for logic evaluation`);
      }
      const choices = question.choices[language];
      let userResponseIndices: string[];
      if (Array.isArray(userResponse)) {
        userResponseIndices = userResponse.map((choice) =>
          getChoiceIndex(choice, choices).toString(),
        );
      } else {
        userResponseIndices = [getChoiceIndex(userResponse as Choice, choices).toString()];
      }
      switch (condition) {
        case LogicCondition.IncludesAllOf:
          iterator = "every";
          comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
          break;

        case LogicCondition.IncludesAnyOf:
          iterator = "some";
          comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
          break;

        case LogicCondition.IncludesNoneOf:
          iterator = "every";
          comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
          break;

        case LogicCondition.Equals:
          iterator = "every";
          comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
          break;
        case LogicCondition.NotEquals:
          iterator = "every";
          comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
          break;

        default:
          break;
      }
      switch (condition) {
        case LogicCondition.NotEquals:
        case LogicCondition.Equals:
          if (type === QuestionType.MSQ || type === QuestionType.DDMS) {
            if (!Array.isArray(conditionResponse)) {
              throw new Error("Logic response should be an array for MSQ/DDMS questions");
            }
            flag =
              iterator === "every"
                ? conditionResponse.every(comparator)
                : conditionResponse.some(comparator);
          } else {
            const singleResponse = Array.isArray(conditionResponse)
              ? conditionResponse.join(",")
              : conditionResponse;
            flag =
              iterator === "every"
                ? [singleResponse].every(comparator)
                : [singleResponse].some(comparator);
          }
          break;

        case LogicCondition.IncludesAllOf:
        case LogicCondition.IncludesAnyOf:
        case LogicCondition.IncludesNoneOf:
          if (Array.isArray(conditionResponse)) {
            flag =
              iterator === "every"
                ? conditionResponse.every(comparator)
                : conditionResponse.some(comparator);
          } else {
            throw new Error("Logic response should be an array");
          }
          break;

        case LogicCondition.Submitted:
          flag = true;
          break;

        default:
          log.warn("Invalid logic condition %o", condition);
          break;
      }
    } else {
      // non-choice type questions
      switch (condition) {
        case LogicCondition.Equals:
          flag = userResponse === conditionResponse;
          break;
        case LogicCondition.NotEquals:
          flag = userResponse !== conditionResponse;
          break;
        case LogicCondition.Submitted:
          flag = true;
          break;
      }
    }

    return flag;
  } catch (e) {
    log.error(e);
    return false;
  }
}
export function validateLogicV2(
  // Callers pass either a Question2 or the equivalent v2 flow layout child
  // (WaFlowForm); only these three fields are read.
  question: {
    id?: string;
    // v2 layout children carry the Meta component type (WaQuestions); a
    // Question2 carries QuestionType2. ChoiceTypeQuestionsV2 lists WaQuestions.
    type?: WaQuestions | QuestionType2 | string;
    "data-source"?: Array<{ id: string; title: string }>;
  },
  // Unlike validateLogic's web-survey Choice objects, WhatsApp-flow (V2) responses
  // resolved by parseFlowResponseV2 are always plain strings (or arrays of strings) —
  // dataSource entries are matched by their string `title`, never a Choice object.
  userResponse: string | string[] | number,
  condition: LogicCondition,
  conditionResponse: string | string[],
): boolean {
  // TODO: make use of this function in parseLogicAction
  // Any modifications to logic-jump algorithm should be reflected in frontend & backend (questions/questions.util & whatsappSurvey module).

  try {
    if (typeof userResponse === "number") {
      userResponse = userResponse.toString();
    }
    const { type } = question;
    if (!userResponse) {
      return false;
    }

    let flag = false;
    let iterator: "some" | "every" = "some";
    let comparator: (value: string) => boolean = () => false;

    if (ChoiceTypeQuestionsV2.includes(type as WaQuestions)) {
      if (!question["data-source"]) {
        throw new Error(`Question ${question.id} is missing data-source for logic evaluation`);
      }
      const dataSource = question["data-source"];
      let userResponseIndices: string[];
      if (Array.isArray(userResponse)) {
        userResponseIndices = userResponse.map((choice) =>
          (dataSource.findIndex((q) => q.title === choice) + 1)?.toString(),
        );
      } else {
        userResponseIndices = [
          (dataSource.findIndex((q) => q.title === userResponse) + 1)?.toString(),
        ];
      }
      switch (condition) {
        case LogicCondition.IncludesAllOf:
          iterator = "every";
          comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
          break;

        case LogicCondition.IncludesAnyOf:
          iterator = "some";
          comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
          break;

        case LogicCondition.IncludesNoneOf:
          iterator = "every";
          comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
          break;

        case LogicCondition.Equals:
          iterator = "every";
          comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
          break;
        case LogicCondition.NotEquals:
          iterator = "every";
          comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
          break;

        default:
          break;
      }
      switch (condition) {
        case LogicCondition.NotEquals:
        case LogicCondition.Equals:
          if (type === WaQuestions.CheckboxGroup) {
            if (!Array.isArray(conditionResponse)) {
              throw new Error("Logic response should be an array for CheckboxGroup questions");
            }
            flag =
              iterator === "every"
                ? conditionResponse.every(comparator)
                : conditionResponse.some(comparator);
          } else {
            const singleResponse = Array.isArray(conditionResponse)
              ? conditionResponse.join(",")
              : conditionResponse;
            flag =
              iterator === "every"
                ? [singleResponse].every(comparator)
                : [singleResponse].some(comparator);
          }
          break;

        case LogicCondition.IncludesAllOf:
        case LogicCondition.IncludesAnyOf:
        case LogicCondition.IncludesNoneOf:
          if (Array.isArray(conditionResponse)) {
            flag =
              iterator === "every"
                ? conditionResponse.every(comparator)
                : conditionResponse.some(comparator);
          } else {
            throw new Error("Logic response should be an array");
          }
          break;

        case LogicCondition.Submitted:
          flag = true;
          break;

        default:
          log.warn("Invalid logic condition %o", condition);
          break;
      }
    } else {
      // non-choice type questions
      switch (condition) {
        case LogicCondition.Equals:
          flag = userResponse === conditionResponse;
          break;
        case LogicCondition.NotEquals:
          flag = userResponse !== conditionResponse;
          break;
        case LogicCondition.Submitted:
          flag = true;
          break;
      }
    }
    return flag;
  } catch (e) {
    log.error(e);
    return false;
  }
}

export const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Page-type "questions" (Welcome/Language/ThankYou/GoogleReview/Custom) are stored in the
// same `questions` array as real Question objects, using PageType values in the `type`
// slot instead of QuestionType (an existing convention elsewhere in this file, which
// already casts `PageType.X as unknown as QuestionType` at every comparison site) — plus
// a few extra display-only fields real questions don't have.
type PageTypeQuestion = Question & {
  enableNpsAnalytics: boolean;
  titleText?: string;
  startButtonText?: string;
};

export function getTitleAndDescriptionObjs(
  languages: string[],
  type: PageType,
): { title: Record<string, string>; description: Record<string, string> } {
  const title: Record<string, string> = {};
  const description: Record<string, string> = {};
  languages.forEach((language) => {
    if (type !== PageType.Custom) {
      title[language] = `${type} Page`;
      description[language] = `This is the ${type} page of the survey`;
    } else {
      title[language] = "<p>Custom HTML Page</p>";
      description[language] = " ";
    }
  });
  return {
    title,
    description,
  };
}

export function getPageQuestions(languages: string[]): PageTypeQuestion[] {
  const questionsArr: PageTypeQuestion[] = [];
  if (languages.length > 1) {
    questionsArr.push({
      id: "language-page",
      type: PageType.Language as unknown as QuestionType,
      required: true,
      enableNpsAnalytics: false,
      ...getTitleAndDescriptionObjs(languages, PageType.Language),
      titleText: `<h3 style="text-align: center">Select a Language</h3>`,
      startButtonText: "Start Survey",
    });
  }
  return questionsArr;
}

export function getPageTypeQuestionObj(
  languages: string[],
  type: PageType,
  additionalData: { titleText?: string; startButtonText?: string } = {},
): PageTypeQuestion {
  return {
    id: `${type}-page`,
    type: type as unknown as QuestionType,
    required: true,
    enableNpsAnalytics: false,
    ...getTitleAndDescriptionObjs(languages, type),
    ...additionalData,
  };
}

// This function also adds title, description to other page type questions if they are not present.
export async function getQuestionsArrUpdatedWithLanguageTypeQuestion(
  questionsArr: Question[],
  languagesArr: string[] | undefined,
): Promise<Question[]> {
  let questionsArrCopy: Question[] = cloneDeep(questionsArr);
  if (languagesArr && languagesArr.length) {
    const languagePageObj = questionsArrCopy.find(
      (question) => question.type === (PageType.Language as unknown as QuestionType),
    );
    if (languagesArr.length > 1) {
      if (!languagePageObj) {
        const [newLanguagePageObj] = getPageQuestions(languagesArr);
        if (questionsArrCopy[0]?.type === (PageType.Welcome as unknown as QuestionType)) {
          questionsArrCopy.splice(1, 0, newLanguagePageObj);
        } else {
          questionsArrCopy.splice(0, 0, newLanguagePageObj);
        }
      }
    } else if (languagesArr.length === 1) {
      const newQuestionsArr = questionsArrCopy.filter((question) => {
        return question.type !== (PageType.Language as unknown as QuestionType);
      });
      questionsArrCopy = newQuestionsArr;
    }
  }

  // adds title, description for page type questions when they are not present for a language.
  const resultArr = questionsArrCopy.map((questionObj) => {
    const questionType = questionObj.type;
    if (Object.values(PageType).includes(questionType as unknown as PageType)) {
      languagesArr?.forEach((language) => {
        if (questionType !== (PageType.Custom as unknown as QuestionType)) {
          questionObj.title[language] = `${questionType} Page`;
          questionObj.description[language] = `This is the ${questionType} page of the survey`;
        } else {
          if (!questionObj.title[language]?.trim().length) {
            questionObj.title[language] = "<p>Custom HTML Page</p>";
          }
        }
      });
    }
    return questionObj;
  });
  return resultArr;
}

// GR => GoogleReview
export async function getQuestionsArrUpdatedGRTypeQuestion(
  questionsArr: Question[],
  surveyId: string,
): Promise<Question[]> {
  const questionsArrCopy: Question[] = cloneDeep(questionsArr);
  const googleReviewPageObjIndex = questionsArrCopy.findIndex((question) => {
    return question.type === (PageType.GoogleReview as unknown as QuestionType);
  });

  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${surveyId}`);
  }

  let hasGoogleReview = questionsArrCopy?.some(
    (item) => item.reviewPageOptions !== null && item.reviewPageOptions !== undefined,
  );

  if (hasGoogleReview) {
    if (googleReviewPageObjIndex === -1) {
      questionsArrCopy.push(getPageTypeQuestionObj(survey.languages, PageType.GoogleReview));
    }
  } else if (!hasGoogleReview) {
    if (googleReviewPageObjIndex > -1) {
      questionsArrCopy.splice(googleReviewPageObjIndex, 1);
    }
  }

  return questionsArrCopy;
}

// To add welcome page, thankyou page when a new survey is created.
export const getInitialSurveyQuestions = (languages: string[]): PageTypeQuestion[] => {
  const arr: PageTypeQuestion[] = [];
  arr.push(
    getPageTypeQuestionObj(languages, PageType.Welcome, {
      titleText: `<h3 style="text-align: center">Welcome</h3><p style="text-align: center">Welcome to the survey</p>`,
      startButtonText: "Start Survey",
    }),
  );
  if (languages.length > 1) {
    arr.push(
      getPageTypeQuestionObj(languages, PageType.Language, {
        titleText: `<h3 style="text-align: center">Select a Language</h3>`,
        startButtonText: "Start Survey",
      }),
    );
  }
  arr.push(
    getPageTypeQuestionObj(languages, PageType.ThankYou, {
      titleText: `<h3 style="text-align: center">Thank you</h3><p style="text-align: center">Thank you for taking the survey</p>`,
    }),
  );
  return arr;
};
