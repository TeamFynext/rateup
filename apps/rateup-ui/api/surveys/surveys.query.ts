import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSurvey, getPublicSurvey, getSurvey, getSurveys } from "./survey.api";
import { notifications } from "@mantine/notifications";

export const useSurvey = (surveyId: string) => useQuery({
  enabled: !!surveyId,
  queryKey: ["survey", surveyId],
  queryFn: () => getSurvey(surveyId),
});

export const usePublicSurvey = (surveyId: string) => useQuery({
  enabled: !!surveyId,
  queryKey: ["public-survey", surveyId],
  queryFn: () => getPublicSurvey(surveyId),
})

export const useSurveys = () => useQuery({
  queryKey: ['surveys'],
  queryFn: getSurveys
})
export const useCreateSurveyMutation = () => {

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      notifications.show({
        message: "Created!"
      });
      queryClient.invalidateQueries(['surveys']);
      close();
    }
  })

  return createMutation;
}