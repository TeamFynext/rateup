import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  importEmailIds,
  replaceQuestions,
  updateQuestion,
} from "./questions.api";

export const useQuestions = (surveyId: string) => {
  return useQuery({
    queryKey: ["questions", surveyId],
    enabled: !!surveyId,
    queryFn: () => getQuestions(surveyId),
  });
};

interface QuestionUpdateMutationArgs {
  qId: string;
  data: any;
}

interface iProps {
  surveyId: string;
}
export const useQuestionCreateMutation = ({ surveyId }: iProps) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: any) => createQuestion(surveyId, data),
    onSuccess: () => {
      toast.success("Question created");
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "An error has occurred");
    },
  });
  return createMutation;
};
export const useQuestionUpdateMutation = ({ surveyId }: iProps) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ qId, data }: QuestionUpdateMutationArgs) => {
      // stripping type from question data
      const { type: _type, ...rest } = data;
      return updateQuestion(surveyId, qId, rest);
    },
    onSuccess: () => {
      toast.success("Saved Changes..", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating question", {
        id: "load-data",
      });
    },
  });

  return updateMutation;
};

export const useQuestionDeleteMutation = (
  surveyId: string,
  onSuccess: (questionId: string) => void = () => {},
) => {
  const queryClient = useQueryClient();

  const questionDeleteMutation = useMutation({
    mutationFn: (qId: string) => deleteQuestion(surveyId, qId),
    onSuccess: (_data, variables) => {
      onSuccess(variables);
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
      toast.success("Question deleted");
    },
    onError: (error) => {
      toast.error(error?.message || "Could not delete question");
    },
  });

  return questionDeleteMutation;
};

export const useReplaceQuestionsMutation = (surveyId: string) => {
  const queryClient = useQueryClient();
  const replaceMutation = useMutation({
    mutationFn: ({ questions, screenId }: { questions: Question[]; screenId?: string }) => {
      return replaceQuestions(surveyId, questions, screenId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Could not replace questions");
    },
  });
  return replaceMutation;
};

export const useImportEmailIdsMutation = (surveyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importEmailIds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
    },
  });
};
