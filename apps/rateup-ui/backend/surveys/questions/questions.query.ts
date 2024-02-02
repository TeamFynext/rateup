import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  replaceQuestions,
  updateQuestion,
} from "./questions.api";
import { notifications } from "@mantine/notifications";
import { showSuccessToast, showErrorToast } from "../../../utils/notifications";

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
      notifications.show({
        message: "Question created",
      });
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
    onError: (e) => {
      console.error(e);
      notifications.show({
        message: "An error has occurred",
        color: "red",
      });
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
      notifications.clean();
      notifications.show({
        id: "qns",
        message: "Saved Changes..",
        autoClose: 1000,
        // icon: <IconCheck />,
      });
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
    onError: (err) => {
      console.error(err);
      notifications.show({
        message: "Error updating question",
        color: "red",
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
    mutationFn: (questions: Question[]) => {
      return replaceQuestions(surveyId, questions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
    onError: (e) => {
      console.error(e);
    },
  });
  return replaceMutation;
};
