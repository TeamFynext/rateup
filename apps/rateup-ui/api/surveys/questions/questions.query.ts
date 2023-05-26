import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQuestion, getQuestions, updateQuestion } from "./questions.api";
import { notifications } from "@mantine/notifications";

export const useQuestions = (surveyId) =>
  useQuery({
    queryKey: ["questions", surveyId],
    queryFn: () => getQuestions(surveyId),
  });

interface QuestionUpdateMutationArgs {
  qId: string;
  data: any;
}
export const useQuestionCreateMutation = (surveyId: string) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: any) => createQuestion(surveyId, data),
    onSuccess: () => {
      notifications.show({
        message: "Question created",
      });
      queryClient.invalidateQueries(["questions"]);
    },
    onError: (e) => {
      console.error(e);
      notifications.show({
        message: "An error has occurred",
        color: "red",
      });
    },
  });
  return createMutation
};
export const useQuestionUpdateMutation = (surveyId: string) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ qId, data }: QuestionUpdateMutationArgs) => {
      // stripping type from question data
      const { type, ...rest } = data;
      return updateQuestion(surveyId, qId, rest);
    },
    onSuccess: () => {
      notifications.show({
        message: "Updated!",
      });
      queryClient.invalidateQueries(["questions"]);
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
