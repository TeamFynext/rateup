import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRespondents, getAllRGroupsByRespondent, getRespondentSurveySendHistoryByRespondentId, getAllRespondents, sendSurveyToRespondent, getRespondentsByTeamId, getRespondentResponseHistoryByRespondentId } from "./respondent.api";
import { notifications } from "@mantine/notifications";

export const useRespondents = (teamId: string) => useQuery({
  queryKey: ["respondent", teamId],
  queryFn: () => {
    if (teamId) {
      return getRespondentsByTeamId(teamId)
    } else {
      return getAllRespondents()
    }
  }
})

export const useRespondentSurveySendHistory = (respondentId: string) => {
    return useQuery({
      queryKey: ["respondent", respondentId, "history", "surveys"],
      queryFn: () => getRespondentSurveySendHistoryByRespondentId(respondentId)
    })
}

export const useRespondentResponseHistory = (respondentId: string) => {
    return useQuery({
      queryKey: ["respondent", respondentId, "history", "responses"],
      queryFn: () => getRespondentResponseHistoryByRespondentId(respondentId)
    })

}

export const useRGroupsByRespondent = (respondentId: string) => useQuery({
  queryKey: ["rgroup", "respondent", respondentId],
  queryFn: () => getAllRGroupsByRespondent(respondentId)
})

export const useSendSurveyToRespondentMutation = ({ respondentId }) => {
  const queryClient = useQueryClient()
  return useMutation((surveyId: string) => {
    return sendSurveyToRespondent(respondentId, surveyId)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "Survey sent successfully!",
        color: "green",
      })
      queryClient.invalidateQueries(["respondent", respondentId, "history", "surveys"])
    }
  })
}

export const useCreateRespondentsMutation = (teamId: string) => {
  const queryClient = useQueryClient()
  return useMutation((respondents: Array<{ phone: string, name?: string }>) => {
    return createRespondents(respondents, teamId)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "Respondents created successfully!",
        color: "green",
      })
      queryClient.invalidateQueries(["respondent"])
    }
  })
}