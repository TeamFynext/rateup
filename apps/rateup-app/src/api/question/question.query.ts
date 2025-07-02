import { useQuery } from "@tanstack/react-query";
import { getQuestionById, getQuestions } from "./question.api";

export const useQuestions = (surveyId: string) => {
  return useQuery({
    queryKey: ["questions", surveyId],
    enabled: !!surveyId,
    queryFn: () => getQuestions(surveyId),
  });
};

export const useQuestion = (surveyId: string, qId: string) => {
  return useQuery({
    queryKey: ["question", surveyId, qId],
    queryFn: () => getQuestionById(surveyId, qId),
    enabled: !!surveyId && !!qId, // only fetch if both are available
  });
};