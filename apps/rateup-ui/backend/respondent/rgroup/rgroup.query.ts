import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addRespondents, createRgroupFromPhoneNumbers, deleteRGroup, deleteRespondentFromRGroup, getRGroupSurveySendHistory, getRGroups, getRGroupsByTeamId, getRespondentsByRGroup, sendSurveyToRGroup, updateRGroup } from "./rgroup.api";
import { notifications } from "@mantine/notifications";

export const useRGroups = (teamId: string) => {
  if (teamId) {
    return useQuery({
      queryKey: ["rgroup", "team", teamId],
      queryFn: () => getRGroupsByTeamId(teamId)
    })
  } else {
    return useQuery({
      queryKey: ["rgroup"],
      queryFn: () => getRGroups()
    })
  }
}

export const useRGroupSurveySendHistory = (rgroupId: string) => {
    return useQuery({
      queryKey: ["rgroup", rgroupId, "history", "surveys"],
      queryFn: () => getRGroupSurveySendHistory(rgroupId)
    })
  }

export const useRespondentsByRGroup = (rgroupId: string) => useQuery({
  queryKey: ["rgroup", rgroupId, "respondents"],
  queryFn: () => getRespondentsByRGroup(rgroupId)
})

export const useSendSurveyToRGroupMutation = ({ rgroupId }) => {
  const queryClient = useQueryClient()
  return useMutation((surveyId: string) => {
    return sendSurveyToRGroup(rgroupId, surveyId)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "Survey sent successfully!",
        color: "green",
      })
      queryClient.invalidateQueries(["rgroup", rgroupId, "history", "surveys"])

    }
  })
}

export const useCreateRGroupMutation = (teamId: string) => {
  const queryClient = useQueryClient()
  return useMutation(({ rgroupName, phoneNumbers }: { rgroupName: string, phoneNumbers: Array<{ phone: string, name?: string }> }) => {
    return createRgroupFromPhoneNumbers(teamId, rgroupName, phoneNumbers)
  },
    {
      onSuccess: () => {
        notifications.show({
          message: "Respondent Group created successfully!",
          color: "green",
        });
        queryClient.invalidateQueries(["rgroup", "team", teamId])
        queryClient.invalidateQueries(["respondent", "team", teamId])
      }
    })
}

export const useDeleteRespondentFromRGroupMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(({ rgroupId, respondentId }: { rgroupId: string, respondentId: string }) => {
    return deleteRespondentFromRGroup(rgroupId, respondentId)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "Respondent removed from group successfully!",
        color: "green",
      });
      queryClient.invalidateQueries(["rgroup"])
    }
  })
}

export const useDeleteRGroupMutation = () => {
  const queryClient = useQueryClient()
  return useMutation((rgroupId: string) => {
    return deleteRGroup(rgroupId)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "Respondent Group deleted successfully!",
        color: "green",
      });
      queryClient.invalidateQueries(["rgroup"])
    }
  })
}

export const useUpdateRGroupMutation = (rgroupId) => {
  const queryClient = useQueryClient()
  return useMutation((rgroup: { name: string }) => {
    return updateRGroup(rgroupId, rgroup)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "Respondent Group updated successfully!",
        color: "green",
      });
      queryClient.invalidateQueries(["rgroup", rgroupId])
    }
  })
}

export const useAddRespondentsMutation = (rgroupId) => {
  const queryClient = useQueryClient()
  return useMutation((respondents: Array<string>) => {
    return addRespondents(rgroupId, respondents)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "Respondents added successfully!",
        color: "green",
      });
      queryClient.invalidateQueries(["rgroup", rgroupId])
    }
  }
  )
}