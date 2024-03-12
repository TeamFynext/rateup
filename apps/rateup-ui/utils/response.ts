import {
  LDResponse,
  NPSWeightage,
  QuestionType,
  SmileyResponse,
  YNResponse,
} from "../types/enums";
import dayjs from "dayjs";
import {
  IconMoodCry,
  IconMoodSad,
  IconMoodSmile,
  IconMoodCrazyHappy,
  IconMoodSmileBeam,
} from "@tabler/icons-react";
import { ChoiceTypeQuestions } from "./constants";
import { decryptPrivateKey, decryptResponse } from "./encryption";
import { TeamWiseResponses } from "../backend/surveys/response/response.api";

export function getResponse(type: any, response: any) {
  if (!response) return "";

  switch (type) {
    case QuestionType.Testimonial:
      return formatTestimonialResponse(response);
    case QuestionType.Date:
      return formatDateTime(response);
    case QuestionType.Contact:
    case QuestionType.Phone:
    case QuestionType.Email:
    case QuestionType.EmailPhone:
      return formatContactInfo(response);
    case QuestionType.Address:
      return formattedAddressInfo(response);
    case QuestionType.DDMS:
    case QuestionType.MSQ:
      return formatChoiceTypeQuestions(response);
    case QuestionType.WaList:
      return formatWaList(response);
    default:
      return formatDefaultResponse(type, response);
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

function formatChoiceTypeQuestions(response) {
  let formattedValue = "";
  if (response) {
    formattedValue = response.map((item) => item?.value?.trim()).join(", ");
  }
  return formattedValue;
}

function formattedAddressInfo(response) {
  if (typeof response === "string") return response;
  return [
    `Address 1: ${response?.address1 ?? "NA"}`,
    `Address 2: ${response?.address2 ?? "NA"}`,
    `City: ${response?.city ?? "NA"}`,
    `Postal Code: ${response?.postalCode ?? "NA"}`,
    `Country: ${response?.country ?? "NA"}`,
  ];
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
    contentArray.push(`${key}:  ${String(value)}`);
  });
  return {
    content: contentArray.join(", "),
    photo: response?.photo,
  };
}

function formatDefaultResponse(type, response) {
  // Handle other types or default case
  if (ChoiceTypeQuestions.includes(type)) {
    return response ? response.value : "";
  }
  return response;
}

export function filterResponses(
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
  Icon?: any;
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
        { value: SmileyResponse.VerySad, color: "#ff5c55", Icon: IconMoodCry },
        { value: SmileyResponse.Sad, color: "#feb75c", Icon: IconMoodSad },
        {
          value: SmileyResponse.Neutral,
          color: "#fedc4e",
          Icon: IconMoodSmile,
        },
        {
          value: SmileyResponse.Happy,
          color: "#a6e346",
          Icon: IconMoodSmileBeam,
        },
        {
          value: SmileyResponse.VeryHappy,
          color: "#52ba66",
          Icon: IconMoodCrazyHappy,
        },
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
  let noofResponses = responses?.length;
  if (language) {
    filteredResponsesByLanguage = responses?.filter(
      (response) => response.language === language,
    );
    noofResponses = filteredResponsesByLanguage?.length;
  }
  return { filteredResponsesByLanguage, noofResponses };
}

export function getFilteredResponseUsingTags(
  responses: SurveyResponse[],
  selectedTags: string[],
) {
  let filteredResponsesByTags = responses;
  let noofResponses = responses?.length;
  if (selectedTags?.length > 0) {
    filteredResponsesByTags = responses?.filter((response) =>
      selectedTags.includes(response.tag),
    );
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
  const { privateKey } = await decryptPrivateKey(
    nonceWithEncryptedPrivateKey,
    passkey,
  );
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

export function getFormattedResponseForAreaGraph(responses, timePeriod) {
  let dateResponseCount = {};
  let dayResponseCount = {};
  let weekResponseCount = {};
  responses?.forEach((response) => {
    let date = dayjs(new Date(response?.createdAt)).format().split("T")[0];
    let week = dayjs().diff(dayjs(new Date(response?.createdAt)), "week");
    if (dateResponseCount[date]) {
      dateResponseCount[date]++;
    } else {
      dateResponseCount[date] = 1;
    }
    let dateWithHour = dayjs(new Date(response?.createdAt))
      .format()
      .slice(0, 13);
    if (dayResponseCount[dateWithHour]) dayResponseCount[dateWithHour]++;
    else dayResponseCount[dateWithHour] = 1;
    if (weekResponseCount[week]) weekResponseCount[week]++;
    else weekResponseCount[week] = 1;
  });

  for (var i = 30; i >= 0; i--) {
    const date = dayjs().subtract(i, "day").format().split("T")[0];
    if (!Object.keys(dateResponseCount).some((dt) => dt == date))
      dateResponseCount[date] = 0;
  }

  for (var i = 0; i <= 52; i++) {
    if (!Object.keys(weekResponseCount).some((dt) => Number(dt) == i))
      weekResponseCount[i] = 0;
  }

  for (var i = 0; i <= 24; i++) {
    const dayWithHour = dayjs().subtract(i, "hour").format().slice(0, 13);
    if (!Object.keys(dayResponseCount).some((dt) => dt == dayWithHour))
      dayResponseCount[dayWithHour] = 0;
  }

  let data = Object.keys(
    timePeriod === "hourly"
      ? dayResponseCount
      : timePeriod === "daily"
        ? dateResponseCount
        : weekResponseCount,
  )?.map((date) => ({
    date: date,
    responses:
      timePeriod === "hourly"
        ? dayResponseCount[date]
        : timePeriod === "daily"
          ? dateResponseCount[date]
          : weekResponseCount[date],
  }));

  const formattedData =
    timePeriod === "hourly"
      ? data.sort((a, b) => {
          return a.date.localeCompare(b.date);
        })
      : timePeriod === "daily"
        ? data.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
        : data.sort((a, b) => Number(b.date) - Number(a.date));
  const filteredData = data?.filter((datum) => {
    const date = dayjs(datum.date);
    const now = dayjs();
    let periodStart;
    switch (timePeriod) {
      case "hourly":
        periodStart = now.subtract(1, "day");
        break;
      case "daily":
        periodStart = now.subtract(1, "month");
        break;
      case "weekly":
        return Number(datum.date) <= 52;
      default:
        periodStart = dayjs(0);
    }
    return (
      (date.isAfter(periodStart) || date.isSame(periodStart)) &&
      (date.isBefore(now) || date.isSame(now))
    );
  });
  return filteredData;
}
