import { TeamWiseResponses } from "../backend/surveys/response/response.api";
import {
  LDResponse,
  QuestionType,
  SmileyResponse,
  YNResponse,
} from "../types/enums";
import dayjs from "dayjs";

export function getResponse(qId: string, response: SurveyResponse) {
  const qResponse = response.responses.find((r) => r.questionId === qId);
  if (!qResponse) return null;
  const { type, response: responseType } = qResponse;

  if (type === QuestionType.Testimonial) {
    return qResponse.response[type].testimonial;
  } else if (type === QuestionType.DateTime) {
    const dateTimeValue = qResponse.response.DateTime;
    const date = dayjs(dateTimeValue);

    const formattedDate = date.format("D, MMM YYYY");
    //const formattedTime = date.format("h:mm A");
    // return `${formattedDate}, ${formattedTime}`;

    return `${formattedDate}`;
  } else if (type === QuestionType.DDMS || type === QuestionType.MSQ) {
    const value = responseType[type];
    const formattedValue = value?.map((item) => item.trim()).join(", ");
    return formattedValue || ""; // Return blank if undefined
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
    default: {
      return null;
    }
  }
}

export function getResponseArrayByQuestionType(questionType: QuestionType) {
  switch (questionType) {
    case QuestionType.Rating: {
      return [1, 2, 3, 4, 5];
    }
    case QuestionType.Opinion: {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    case QuestionType.Smiley: {
      return [
        SmileyResponse.VerySad,
        SmileyResponse.Sad,
        SmileyResponse.Neutral,
        SmileyResponse.Happy,
        SmileyResponse.VeryHappy,
      ];
    }
    case QuestionType.YN: {
      return [YNResponse.No, YNResponse.Yes];
    }
    case QuestionType.LD: {
      return [LDResponse.Dislike, LDResponse.Like];
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
