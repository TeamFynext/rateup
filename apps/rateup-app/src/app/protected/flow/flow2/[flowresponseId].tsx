import dayjs from "dayjs";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";

import type { WaFlowFormChoice } from "@/api/whatsapp/types";
import DocumentResponse from "@/components/flow/DocumentResponse";
import { QuestionType2, WaQuestions } from "@/components/flow/enum";
import {
  LDResponseMap,
  RatingScaleMap,
  SmileyResponseMap,
  YNResponseMap,
} from "@/components/flow/enumMap";
import ImageResponse from "@/components/flow/ImageResponse";
import ResponseDetail from "@/components/surveyResults/ResponseDetail";
import { useFlowDataStore, useFlowResponseDataStore } from "@/utils/store";
import { firstParam } from "@/utils/params";

/** `WaQuestions` and `QuestionType2` share keys; the latter holds the readable name. */
const typeLabel = (metaType?: WaQuestions) => {
  const key = Object.keys(WaQuestions).find(
    (k) => WaQuestions[k as keyof typeof WaQuestions] === metaType,
  );
  return key ? QuestionType2[key as keyof typeof QuestionType2] : metaType;
};

const Flow2Response = () => {
  const { respondent } = useLocalSearchParams();
  const { flowData } = useFlowDataStore();
  const { data } = useFlowResponseDataStore();
  const row = data[0];

  const flowQuestions = useMemo(
    () =>
      flowData[0]?.json?.screens?.flatMap((screen) =>
        screen.layout.children
          .filter((child) => child.type !== QuestionType2.Footer && child.name)
          .map(({ id, label, metaType, name, "data-source": dataSource, header }) => ({
            id,
            label,
            metaType,
            dataSource,
            name,
            header,
          })),
      ) ?? [],
    [flowData],
  );

  const responses = row?.responses ?? [];
  const answers = responses.length
    ? flowQuestions.map((question, index) => {
        const raw = responses.find((res) => res.questionId === question.id);
        return {
          key: question.id ?? String(index),
          question: question.header || question.label || "",
          type: typeLabel(question.metaType),
          answer: getCellData(raw?.response, question),
        };
      })
    : [];

  return (
    <ResponseDetail
      respondent={firstParam(respondent) || row?.phone}
      submittedAt={row?.createdAt}
      answers={answers}
    />
  );
};

export default Flow2Response;

/** A question element lifted out of a v2 flow's screen layout. */
export type FlowQuestion = {
  id?: string;
  label?: string;
  metaType?: WaQuestions;
  dataSource?: WaFlowFormChoice[];
  name?: string;
  header?: string;
};

const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

const isPrimitive = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";

/**
 * Looks a response code up in one of the enum maps. Keys are stringified the
 * same way a plain property access would, so both `1` and `"1"` resolve.
 */
const lookupResponseLabel = <T extends string>(
  map: Record<string, T | undefined>,
  info: unknown,
): T | "" => (isPrimitive(info) ? map[String(info)] || "" : "");

// Response Formatter
export const getCellData = (
  info: unknown,
  question: FlowQuestion,
): string | number | React.JSX.Element => {
  switch (question.metaType) {
    case WaQuestions.LD:
      return lookupResponseLabel(LDResponseMap, info);

    case WaQuestions.YN:
      return lookupResponseLabel(YNResponseMap, info);

    case WaQuestions.Smiley:
      return lookupResponseLabel(SmileyResponseMap, info);

    case WaQuestions.Rating:
      return lookupResponseLabel(RatingScaleMap, info);

    case WaQuestions.Opinion:
      return isPrimitive(info) ? info || "" : "";

    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return question.dataSource?.find((data) => data.id === info)?.title || "";

    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return (
        (isUnknownArray(info) &&
          info
            .map((i) => question.dataSource?.find((data) => data.id === i)?.title)
            .filter(Boolean)
            .join(", ")) ||
        ""
      );

    case WaQuestions.DocumentPicker:
      return typeof info === "string" ? <DocumentResponse info={info} /> : "";

    case WaQuestions.DatePicker:
      if (!isPrimitive(info)) return "";
      return info ? dayjs(info).format("DD-MM-YYYY") : "";

    case WaQuestions.TextArea:
      return isPrimitive(info) ? info : "";

    case WaQuestions.PhotoPicker:
      return typeof info === "string" ? (
        <View>
          <ImageResponse info={info} />
        </View>
      ) : (
        ""
      );

    default:
      return info === null || info === undefined ? "" : String(info);
  }
};
