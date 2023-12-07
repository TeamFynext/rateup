import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
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
  setIsSaving?: React.Dispatch<React.SetStateAction<boolean>>;
}
export const useQuestionCreateMutation = ({
  surveyId,
  setIsSaving,
}: iProps) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: any) => createQuestion(surveyId, data),
    onSuccess: () => {
      notifications.show({
        message: "Question created",
      });
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      setIsSaving(false);
    },
    onError: (e) => {
      console.error(e);
      notifications.show({
        message: "An error has occurred",
        color: "red",
      });
      setIsSaving(false);
    },
  });
  return createMutation;
};
export const useQuestionUpdateMutation = ({
  surveyId,
  setIsSaving,
}: iProps) => {
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
      setIsSaving(false);
    },
    onError: (err) => {
      console.error(err);
      notifications.show({
        message: "Error updating question",
        color: "red",
      });
      setIsSaving(false);
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
