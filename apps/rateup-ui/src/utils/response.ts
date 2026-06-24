import {
  IconMoodAngry,
  IconMoodCrazyHappy,
  IconMoodEmpty,
  IconMoodHappy,
  IconMoodSad,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useContext } from "react";

import type { TeamWiseResponses } from "@/backend/surveys/response/response.api";
import {
  LDResponse,
  LDResponse2,
  NPSWeightage,
  QuestionType,
  SmileyResponse,
  SmileyResponse2,
  WaQuestions,
  YNResponse,
} from "@/types/enums.ts";

import SelectedLanguageContext from "../context/SelectedLanguage.ts";
import { isToday } from "./dateTime.ts";
import { decryptPrivateKey, decryptResponse } from "./encryption/index.ts";

export function getResponse(q: any, response: any) {
  if (!response && response !== 0) return "";

  switch (q?.type) {
    case QuestionType.Testimonial:
      return formatTestimonialResponse(response);
    case QuestionType.Date:
      return formatDateTime(response);
    case QuestionType.Contact:
    case QuestionType.Phone:
    case QuestionType.Email:
    case QuestionType.EmailPhone:
      return formatContactInfo(response);
    case QuestionType.DDMS:
    case QuestionType.MSQ:
    case QuestionType.CustomNPS:
    case QuestionType.MCQ:
    case QuestionType.DDSS:
    case QuestionType.WaButtons:
      return formatChoiceTypeQuestions(q, response);
    case QuestionType.WaList:
      return formatWaList(response);
    case QuestionType.MultiTextInput:
      return formatMultiTextInput(q, response);
    case QuestionType.MCQGrid:
      return formatMCQGridResponse(q, response);
    case QuestionType.EmailOtp:
      return formatEmailOtpResponse(response);
    default:
      return formatDefaultResponse(q, response);
  }
}

function formatDateTime(response) {
  const date = dayjs(response);
  return date.format("DD, MMM YYYY");
}

function formatContactInfo(response) {
  if (typeof response === "string") return response;
  return Object.entries(response)
    .filter(Boolean)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function formatEmailOtpResponse(response) {
  return `Verified Email Id: ${response?.email}`;
}
function formatMultiTextInput(q, response) {
  if (typeof response === "string") return response;
  const { selectedLanguage, defaultLanguage } = useContext(SelectedLanguageContext);
  const fields = q?.features?.[selectedLanguage || defaultLanguage]?.fields;
  if (fields) {
    return fields?.map((f) => `${f.fieldKey}:  ${response?.[f.fieldKey] ?? "NA"}`);
  }
}

function formatMCQGridResponse(question, response) {
  if (!response) return;
  const { selectedLanguage, defaultLanguage } = useContext(SelectedLanguageContext);
  const gridQuestions = question?.features?.[selectedLanguage || defaultLanguage]?.questions;
  return gridQuestions?.map((q) => `${q}: ${response?.[q]?.value ?? "NA"}`);
}

function formatChoiceTypeQuestions(q, response) {
  const { selectedLanguage, defaultLanguage } = useContext(SelectedLanguageContext);
  let formattedValue = "";
  if (response) {
    if ([QuestionType.DDMS, QuestionType.MSQ].includes(q?.type)) {
      formattedValue = response
        .map(
          (item) =>
            item?.value?.trim() ||
            `${q?.features?.[selectedLanguage || defaultLanguage]?.other?.title} : ${item?.other}`,
        )
        .join(", ");
    } else if (
      [
        QuestionType.DDSS,
        QuestionType.MCQ,
        QuestionType.CustomNPS,
        QuestionType.WaButtons,
      ].includes(q?.type)
    ) {
      formattedValue =
        response.value ||
        `${q?.features?.[selectedLanguage || defaultLanguage]?.other?.title} : ${response?.other}`;
    }
  }
  return formattedValue;
}

function formatWaList(response) {
  const { title, description } = response[QuestionType.WaList];
  return description ? `${title}: ${description}` : title;
}

function formatTestimonialResponse(response) {
  if (typeof response === "string") return response;
  const contentArray = [];
  Object.entries(response).map(([key, value]) => {
    if (key === "photo") return;
    contentArray.push(`${key}:  ${value ? String(value) : "NA"}`);
  });
  return {
    content: contentArray.join(", "),
    photo: response?.photo,
  };
}

function formatDefaultResponse(q, response) {
  // Handle other types or default case
  return response;
}

function filterResponses(
  responses: SurveyResponse[],
  filters: Array<{ question_id: string; responses: Array<string> }>,
) {
  if (filters.length === 0) {
    return responses;
  } else {
    const filteredResponses = responses?.filter((response) =>
      filters?.every((filter) => {
        const question = response?.responses?.find(
          (item) => item?.questionId === filter?.question_id,
        );
        if (question) {
          if (question.type === QuestionType.Opinion || question.type === QuestionType.Rating) {
            return filter?.responses.includes(question?.response[question?.type]?.toString());
          }
          return filter?.responses?.includes(question?.response[question?.type]);
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

export function getResponseArrayByQuestionType(questionType: QuestionType | WaQuestions): Array<{
  value: string | number;
  color: string;
  Icon?: any;
}> {
  switch (questionType) {
    case QuestionType.Rating: {
      return [
        { value: 1, color: "#dc2626" },
        { value: 2, color: "#f97316" },
        { value: 3, color: "#f59e0b" },
        { value: 4, color: "#84cc16" },
        { value: 5, color: "#22c55e" },
      ];
    }
    case QuestionType.Opinion:
    case WaQuestions.Opinion: {
      return [
        { value: 1, color: "#dc2626" },
        { value: 2, color: "#ef4444" },
        { value: 3, color: "#f97316" },
        { value: 4, color: "#fb923c" },
        { value: 5, color: "#f59e0b" },
        { value: 6, color: "#fbbf24" },
        { value: 7, color: "#a3e635" },
        { value: 8, color: "#84cc16" },
        { value: 9, color: "#4ade80" },
        { value: 10, color: "#22c55e" },
      ];
    }
    case QuestionType.Smiley: {
      return [
        {
          value: SmileyResponse.VerySad,
          color: "#dc2626",
          Icon: IconMoodAngry,
        },
        { value: SmileyResponse.Sad, color: "#f97316", Icon: IconMoodSad },
        {
          value: SmileyResponse.Neutral,
          color: "#f59e0b",
          Icon: IconMoodEmpty,
        },
        {
          value: SmileyResponse.Happy,
          color: "#84cc16",
          Icon: IconMoodHappy,
        },
        {
          value: SmileyResponse.VeryHappy,
          color: "#22c55e",
          Icon: IconMoodCrazyHappy,
        },
      ];
    }
    case QuestionType.YN:
    case WaQuestions.YN: {
      return [
        { value: YNResponse.No, color: "#dc2626" },
        { value: YNResponse.Yes, color: "#22c55e" },
      ];
    }
    case QuestionType.LD:
    case WaQuestions.LD: {
      return [
        { value: LDResponse.Dislike, color: "#dc2626" },
        { value: LDResponse.Like, color: "#22c55e" },
      ];
    }
    case QuestionType.CustomNPS: {
      return [
        { value: NPSWeightage.DETRACTOR, color: "#dc2626" },
        { value: NPSWeightage.PASSIVE, color: "#f59e0b" },
        { value: NPSWeightage.PROMOTER, color: "#22c55e" },
      ];
    }
    default: {
      return null;
    }
  }
}
export function getResponseArrayByQuestionTypeV2(questionType: WaQuestions): Array<{
  value: string | number;
  color: string;
  Icon?: any;
}> {
  switch (questionType) {
    case WaQuestions.Rating: {
      return [
        { value: 1, color: "#dc2626" },
        { value: 2, color: "#f97316" },
        { value: 3, color: "#f59e0b" },
        { value: 4, color: "#84cc16" },
        { value: 5, color: "#22c55e" },
      ];
    }
    case WaQuestions.Opinion: {
      return [
        { value: 1, color: "#dc2626" },
        { value: 2, color: "#ef4444" },
        { value: 3, color: "#f97316" },
        { value: 4, color: "#fb923c" },
        { value: 5, color: "#f59e0b" },
        { value: 6, color: "#fbbf24" },
        { value: 7, color: "#a3e635" },
        { value: 8, color: "#84cc16" },
        { value: 9, color: "#4ade80" },
        { value: 10, color: "#22c55e" },
      ];
    }
    case WaQuestions.Smiley: {
      return [
        {
          value: SmileyResponse2.VerySad,
          color: "#dc2626",
          Icon: IconMoodAngry,
        },
        { value: SmileyResponse2.Sad, color: "#f97316", Icon: IconMoodSad },
        {
          value: SmileyResponse2.Neutral,
          color: "#f59e0b",
          Icon: IconMoodEmpty,
        },
        {
          value: SmileyResponse2.Happy,
          color: "#84cc16",
          Icon: IconMoodHappy,
        },
        {
          value: SmileyResponse2.VeryHappy,
          color: "#22c55e",
          Icon: IconMoodCrazyHappy,
        },
      ];
    }
    case WaQuestions.YN: {
      return [
        { value: YNResponse.No, color: "#dc2626" },
        { value: YNResponse.Yes, color: "#22c55e" },
      ];
    }
    case WaQuestions.LD: {
      return [
        { value: LDResponse2.Dislike, color: "#dc2626" },
        { value: LDResponse2.Like, color: "#22c55e" },
      ];
    }
    default: {
      return null;
    }
  }
}
function getfilteredResponseUsingLanguage(responses: SurveyResponse[], language: string) {
  let filteredResponsesByLanguage = responses;
  let noofResponses = responses?.length;
  if (language) {
    filteredResponsesByLanguage = responses?.filter((response) => response.language === language);
    noofResponses = filteredResponsesByLanguage?.length;
  }
  return { filteredResponsesByLanguage, noofResponses };
}

function getFilteredResponseUsingTags(responses: SurveyResponse[], selectedTags: string[]) {
  let filteredResponsesByTags = responses;
  let noofResponses = responses?.length;
  if (selectedTags?.length > 0) {
    filteredResponsesByTags = responses?.filter((response) => selectedTags.includes(response.tag));
    noofResponses = filteredResponsesByTags?.length;
  }
  filteredResponsesByTags?.sort((a, b) => {
    const dateA = dayjs(a.createdAt);
    const dateB = dayjs(b.createdAt);
    return dateA.diff(dateB);
  });
  return { filteredResponsesByTags, noofResponses };
}

export async function decryptResultResponse(
  responses: TeamWiseResponses[],
  nonceWithEncryptedPrivateKey: any,
  publicKey: any,
  passkey: string,
) {
  const decryptedResponses = responses;
  const { privateKey } = await decryptPrivateKey(nonceWithEncryptedPrivateKey, passkey);
  for (let i = 0; i < responses.length; i++) {
    for (let j = 0; j < responses[i].responses.length; j++) {
      const response = responses[i].responses[j];
      if (response.encryptedResponses) {
        const { decryptedResponse } = await decryptResponse(
          response.encryptedResponses,
          privateKey,
          publicKey,
        );
        decryptedResponses[i].responses[j].responses = decryptedResponse;
      }
    }
  }
  return { decryptedResponses };
}

function getFormattedResponseForAreaGraph(responses, timePeriod) {
  const dateResponseCount = {};
  const dayResponseCount = {};
  const weekResponseCount = {};
  responses.forEach((response) => {
    if (isToday(response.createdAt)) {
      const hour = dayjs(response.createdAt).format("h A");
      if (dayResponseCount[hour]) dayResponseCount[hour]++;
      else dayResponseCount[hour] = 1;
    }
    if (dayjs().diff(dayjs(response.createdAt), "day") <= 30) {
      const date = dayjs(response.createdAt).format("MMM DD");
      if (dateResponseCount[date]) dateResponseCount[date]++;
      else dateResponseCount[date] = 1;
    }
    if (dayjs().diff(dayjs(response.createdAt), "year") === 0) {
      const week = dayjs().diff(dayjs(response.createdAt), "week");
      if (weekResponseCount[week]) weekResponseCount[week]++;
      else weekResponseCount[week] = 1;
    }
  });

  const resData = [];
  switch (timePeriod) {
    case "hourly":
      for (let i = 0; i < 24; i++) {
        const date = dayjs().hour(i).format("h A");
        resData.push(
          dayResponseCount[date]
            ? { date, responses: dayResponseCount[date] }
            : { date, responses: 0 },
        );
      }
      break;
    case "daily":
      for (let i = 30; i > 0; i--) {
        const date = dayjs()
          .subtract(i - 1, "day")
          .format("MMM DD");
        resData.push(
          dateResponseCount[date]
            ? { date, responses: dateResponseCount[date] }
            : { date, responses: 0 },
        );
      }
      break;
    case "weekly":
      for (let i = 52; i >= 0; i--) {
        resData.push(
          weekResponseCount[i]
            ? { date: i, responses: weekResponseCount[i] }
            : { date: i, responses: 0 },
        );
      }
      break;
  }
  return resData;
}
