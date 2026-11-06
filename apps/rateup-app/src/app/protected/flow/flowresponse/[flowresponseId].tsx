import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";

import { useQuestions } from "@/api/question/question.query";
import ResponseDetail from "@/components/surveyResults/ResponseDetail";
import { useFlowResponseDataStore } from "@/utils/store";
import { firstParam } from "@/utils/params";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const formatAnswer = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value))
    return value
      .map((v) => (typeof v === "string" ? v : isRecord(v) ? String(v.value || "") : ""))
      .join(", ");
  if (isRecord(value) && value.value) return String(value.value);
  return value === undefined || value === null ? "" : JSON.stringify(value);
};

const ResponseId = () => {
  const { surveyId, respondent } = useLocalSearchParams();
  const { data } = useFlowResponseDataStore();
  const { data: questions, isLoading } = useQuestions(firstParam(surveyId));
  const row = data[0];

  const titles = useMemo(() => {
    const map: Record<string, string> = {};
    questions?.forEach((q) => {
      map[q.id] = q.title?.en || q.description?.en || q.label?.en || "";
    });
    return map;
  }, [questions]);

  const answers = (row?.responses ?? []).map((item, index) => ({
    key: `${item.questionId}-${index}`,
    question: titles[item.questionId] ?? "",
    type: item.type,
    answer: formatAnswer(
      item.type !== undefined && isRecord(item.response) ? item.response[item.type] : undefined,
    ),
  }));

  return (
    <ResponseDetail
      respondent={firstParam(respondent) || row?.phone}
      submittedAt={row?.createdAt}
      answers={answers}
      loading={isLoading}
    />
  );
};

export default ResponseId;
