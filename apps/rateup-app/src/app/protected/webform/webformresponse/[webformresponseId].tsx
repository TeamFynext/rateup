import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";

import { useQuestions } from "@/api/question/question.query";
import ResponseDetail from "@/components/surveyResults/ResponseDetail";
import { useWebFormResponseDataStore } from "@/utils/store";
import { firstParam } from "@/utils/params";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const formatAnswer = (value: any): string => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map((v) => (typeof v === "string" ? v : v?.value || "")).join(", ");
  if (typeof value === "object" && value?.value) return String(value.value);
  return Object.entries(value || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
};

const ResponseId = () => {
  const { webformId, respondent } = useLocalSearchParams();
  const { data } = useWebFormResponseDataStore();
  const { data: questions, isLoading } = useQuestions(firstParam(webformId));
  const row = data[0];

  const titles = useMemo(() => {
    const map: Record<string, string> = {};
    questions?.forEach((q) => {
      map[q.id] = stripHtml(q.title?.English || q.description?.English || q.label?.English || "");
    });
    return map;
  }, [questions]);

  const answers = (row?.responses ?? []).map((item: any, index: number) => ({
    key: `${item.questionId}-${index}`,
    question: titles[item.questionId] ?? "",
    type: item.type,
    answer: formatAnswer(item.response?.[item.type]),
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
