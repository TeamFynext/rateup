import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
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
      showSuccessToast("Question created");
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
    },
    onError: (e) => {
      showErrorToast("An error has occurred");
    },
  });
  return createMutation;
};
export const useQuestionUpdateMutation = ({ surveyId }: iProps) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ qId, data }: QuestionUpdateMutationArgs) => {
      // stripping type from question data
      const { type, ...rest } = data;
      return updateQuestion(surveyId, qId, rest);
    },
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        title: "Success",
        loading: false,
        message: "Saved Changes..",
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
    onError: (err) => {
      showErrorToast("Error updating question", "load-data", <IconX />, true);
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
      showSuccessToast("Question deleted");
    },
    onError: (e) => {
      console.error(e);
      showErrorToast("Could not delete question");
    },
  });

  return questionDeleteMutation;
};

export const useReplaceQuestionsMutation = (surveyId: string) => {
  const queryClient = useQueryClient();
  const replaceMutation = useMutation({
    mutationFn: ({
      questions,
      screenId,
    }: {
      questions: Question[];
      screenId?: string;
    }) => {
      return replaceQuestions(surveyId, questions, screenId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
    },
    onError: (e) => {
      console.error(e);
    },
  });
  return replaceMutation;
};

export const useImportEmailIdsMutation = (surveyId) => {
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
