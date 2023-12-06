import {
  LDResponse,
  NPSWeightage,
  QuestionType,
  SmileyResponse,
  YNResponse,
} from "../types/enums";
import dayjs from "dayjs";
import { ChoiceTypeQuestions } from "./constants";

export function getResponse(qId: string, response: SurveyResponse) {
  const qResponse = response.responses.find((r) => r.questionId === qId);
  if (!qResponse) return "Not Answered";
  const { type, response: responseType } = qResponse;
  if (type === QuestionType.Testimonial) {
    return qResponse.response[type].testimonial;
  } else if (type === QuestionType.EmailPhone) {
    return (
      qResponse.response[type].email + " , " + qResponse.response[type].phone
    );
  } else if (type === QuestionType.DateTime) {
    const dateTimeValue = qResponse.response.DateTime;
    const date = dayjs(dateTimeValue);
    const formattedDate = date.format("D, MMM YYYY");
    return `${formattedDate}`;
  } else if (ChoiceTypeQuestions.includes(type)) {
    const responseValue = responseType[type];
    if (responseValue) {
      let formattedValue = "";
      if (type === QuestionType.DDMS || type === QuestionType.MSQ) {
        formattedValue = responseValue
          .map((value) => {
            return value?.value?.trim();
          })
          .join(", ");
      } else {
        formattedValue = responseValue?.value?.trim();
      }
      return formattedValue;
    } else {
      return "Not Answered";
    }
  } else if (type === QuestionType.WaList) {
    const { title, description } = qResponse.response[QuestionType.WaList];
    return description ? `${title}: ${description}` : title;
  }
  return qResponse.response[type];
}

export function filterResponses(
  responses: SurveyResponse[],
  filters: Array<{ question_id: string; responses: Array<string> }>,
) {
  if (filters.length === 0) {
    return responses;
  } else {
    const filteredResponses = responses?.filter(
      (response) =>
        filters?.every((filter) => {
          const question = response?.responses?.find(
            (item) => item?.questionId === filter?.question_id,
          );
          if (question) {
            if (
              question.type === QuestionType.Opinion ||
              question.type === QuestionType.Rating
            ) {
              return filter?.responses.includes(
                question?.response[question?.type]?.toString(),
              );
            }
            return filter?.responses?.includes(
              question?.response[question?.type],
            );
          } else {
            return false;
          }
        }),
    );
    return filteredResponses;
  }
}

export function getResponseObjectByQuestionType(questionType: QuestionType) {
  switch (questionType) {
    case QuestionType.Rating: {
      return {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
    }
    case QuestionType.Opinion: {
      return {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
      };
    }
    case QuestionType.Smiley: {
      return {
        [SmileyResponse.VeryHappy]: 0,
        [SmileyResponse.Happy]: 0,
        [SmileyResponse.Neutral]: 0,
        [SmileyResponse.Sad]: 0,
        [SmileyResponse.VerySad]: 0,
      };
    }
    case QuestionType.YN: {
      return {
        [YNResponse.Yes]: 0,
        [YNResponse.No]: 0,
      };
    }
    case QuestionType.LD: {
      return {
        [LDResponse.Like]: 0,
        [LDResponse.Dislike]: 0,
      };
    }
    case QuestionType.CustomNPS: {
      return {
        [NPSWeightage.PROMOTER]: 0,
        [NPSWeightage.PASSIVE]: 0,
        [NPSWeightage.DETRACTOR]: 0,
      };
    }
    default: {
      return null;
    }
  }
}

export function getResponseArrayByQuestionType(
  questionType: QuestionType,
): Array<{
  value: string | number;
  color: string;
}> {
  switch (questionType) {
    case QuestionType.Rating: {
      return [
        { value: 1, color: "#ff5c55" },
        { value: 2, color: "#feb75c" },
        { value: 3, color: "#fedc4e" },
        { value: 4, color: "#a6e346" },
        { value: 5, color: "#52ba66" },
      ];
    }
    case QuestionType.Opinion: {
      return [
        { value: 1, color: "#ff5c55" },
        { value: 2, color: "#ff8580" },
        { value: 3, color: "#FEB75C" },
        { value: 4, color: "#FEC985" },
        { value: 5, color: "#FEDC4E" },
        { value: 6, color: "#FEE57A" },
        { value: 7, color: "#BCEA74" },
        { value: 8, color: "#A6E346" },
        { value: 9, color: "#7DCB8C" },
        { value: 10, color: "#52BA66" },
      ];
    }
    case QuestionType.Smiley: {
      return [
        { value: SmileyResponse.VerySad, color: "#ff5c55" },
        { value: SmileyResponse.Sad, color: "#feb75c" },
        { value: SmileyResponse.Neutral, color: "#fedc4e" },
        { value: SmileyResponse.Happy, color: "#a6e346" },
        { value: SmileyResponse.VeryHappy, color: "#52ba66" },
      ];
    }
    case QuestionType.YN: {
      return [
        { value: YNResponse.No, color: "#ff5c55" },
        { value: YNResponse.Yes, color: "#52ba66" },
      ];
    }
    case QuestionType.LD: {
      return [
        { value: LDResponse.Dislike, color: "#ff5c55" },
        { value: LDResponse.Like, color: "#52ba66" },
      ];
    }
    case QuestionType.CustomNPS: {
      return [
        { value: NPSWeightage.DETRACTOR, color: "#ff5c55" },
        { value: NPSWeightage.PASSIVE, color: "#fedc4e" },
        { value: NPSWeightage.PROMOTER, color: "#52ba66" },
      ];
    }
    default: {
      return null;
    }
  }
}

export function getfilteredResponseUsingLanguage(
  responses: SurveyResponse[],
  language: string,
) {
  let filteredResponsesByLanguage = responses;
  if (language)
    filteredResponsesByLanguage = responses?.filter(
      (response) => response.language === language,
    );
  return { filteredResponsesByLanguage };
}
