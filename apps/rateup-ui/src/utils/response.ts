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
import { decryptPrivateKey, decryptResponse } from "./encryption/index.ts";

/** A single choice a respondent picked, or typed into the "other" field. */
interface ChoiceResponse {
  value?: string;
  other?: string;
}

/** An answer as stored on a response record: text, or a keyed bag of values. */
type ResponseRecord = Record<string, unknown>;

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

function formatDateTime(response: string | number | Date) {
  const date = dayjs(response);
  return date.format("DD, MMM YYYY");
}

function formatContactInfo(response: string | ResponseRecord) {
  if (typeof response === "string") return response;
  return Object.entries(response)
    .filter(Boolean)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function formatEmailOtpResponse(response: { email?: string }) {
  return `Verified Email Id: ${response?.email}`;
}
function formatMultiTextInput(q: Question, response: string | ResponseRecord) {
  if (typeof response === "string") return response;
  const { selectedLanguage, defaultLanguage } = useContext(SelectedLanguageContext);
  const fields = q?.features?.[selectedLanguage || defaultLanguage]?.fields;
  if (fields) {
    return fields?.map(
      (f: { fieldKey: string }) => `${f.fieldKey}:  ${response?.[f.fieldKey] ?? "NA"}`,
    );
  }
}

function formatMCQGridResponse(question: Question, response: Record<string, { value?: unknown }>) {
  if (!response) return;
  const { selectedLanguage, defaultLanguage } = useContext(SelectedLanguageContext);
  const gridQuestions = question?.features?.[selectedLanguage || defaultLanguage]?.questions;
  return gridQuestions?.map((q: string) => `${q}: ${response?.[q]?.value ?? "NA"}`);
}

function formatChoiceTypeQuestions(q: Question, response: ChoiceResponse | ChoiceResponse[]) {
  const { selectedLanguage, defaultLanguage } = useContext(SelectedLanguageContext);
  let formattedValue = "";
  if (response) {
    if (q?.type === QuestionType.DDMS || q?.type === QuestionType.MSQ) {
      // These two question types always store their answer as a list of choices.
      formattedValue = (response as ChoiceResponse[])
        .map(
          (item) =>
            item?.value?.trim() ||
            `${q?.features?.[selectedLanguage || defaultLanguage]?.other?.title} : ${item?.other}`,
        )
        .join(", ");
    } else if (
      q?.type === QuestionType.DDSS ||
      q?.type === QuestionType.MCQ ||
      q?.type === QuestionType.CustomNPS ||
      q?.type === QuestionType.WaButtons
    ) {
      const single = response as ChoiceResponse;
      formattedValue =
        single.value ||
        `${q?.features?.[selectedLanguage || defaultLanguage]?.other?.title} : ${single?.other}`;
    }
  }
  return formattedValue;
}

function formatWaList(response: Record<string, { title?: string; description?: string }>) {
  const { title, description } = response[QuestionType.WaList];
  return description ? `${title}: ${description}` : title;
}

function formatTestimonialResponse(response: string | ResponseRecord) {
  if (typeof response === "string") return response;
  const contentArray: string[] = [];
  Object.entries(response).map(([key, value]) => {
    if (key === "photo") return;
    contentArray.push(`${key}:  ${value ? String(value) : "NA"}`);
  });
  return {
    content: contentArray.join(", "),
    photo: response?.photo,
  };
}

function formatDefaultResponse(_q: Question, response: unknown) {
  // Handle other types or default case
  return response;
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
}> | null {
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
export function getResponseArrayByQuestionTypeV2(questionType: WaQuestions | QuestionType): Array<{
  value: string | number;
  color: string;
  Icon?: any;
}> | null {
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

export async function decryptResultResponse(
  responses: TeamWiseResponses[],
  nonceWithEncryptedPrivateKey: any,
  publicKey: any,
  passkey: string,
) {
  const decryptedResponses = responses;
  const { privateKey } = await decryptPrivateKey(nonceWithEncryptedPrivateKey, passkey);
  for (let i = 0; i < responses.length; i++) {
    const teamResponses = responses[i]?.responses ?? [];
    for (let j = 0; j < teamResponses.length; j++) {
      const response = teamResponses[j]!;
      if (response.encryptedResponses) {
        const { decryptedResponse } = await decryptResponse(
          response.encryptedResponses,
          privateKey,
          publicKey,
        );
        decryptedResponses[i]!.responses![j]!.responses = decryptedResponse;
      }
    }
  }
  return { decryptedResponses };
}
