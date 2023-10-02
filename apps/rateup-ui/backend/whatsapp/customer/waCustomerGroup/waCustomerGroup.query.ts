import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { showSuccessToast, showErrorToast } from "../../../../utils/notifications";
import { getWaCustomerGroupsByTeamId, getWaCustomerGroups, getWaCustomerGroupSurveySendHistory, getWaCustomersByWaCustomerGroup, sendSurveyToWaCustomerGroup, createRgroupFromPhoneNumbers, deleteWaCustomerFromWaCustomerGroup, deleteWaCustomerGroup, updateWaCustomerGroup, addWaCustomers } from "./waCustomerGroup.api";

export const useWaCustomerGroups = (teamId: string, enabled: boolean) => {
  if (teamId) {
    return useQuery({
      enabled,
      queryKey: ["rgroup", "team", teamId],
      queryFn: () => getWaCustomerGroupsByTeamId(teamId)
    })
  } else {
    return useQuery({
      enabled,
      queryKey: ["rgroup"],
      queryFn: () => getWaCustomerGroups()
    })
  }
}

export const useWaCustomerGroupSurveySendHistory = (rgroupId: string) => {
  return useQuery({
    queryKey: ["rgroup", rgroupId, "history", "surveys"],
    queryFn: () => getWaCustomerGroupSurveySendHistory(rgroupId)
  })
}

export const useWaCustomersByWaCustomerGroup = (rgroupId: string) => useQuery({
  queryKey: ["rgroup", rgroupId, "waCustomers"],
  queryFn: () => getWaCustomersByWaCustomerGroup(rgroupId)
})

export const useSendSurveyToWaCustomerGroupMutation = ({ rgroupId }) => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ surveyId, templateId }: { surveyId: string, templateId: string }) => {
      return sendSurveyToWaCustomerGroup(rgroupId, surveyId, templateId)
    },
    {
      onSuccess: () => {
        showSuccessToast("Survey sent successfully")
        queryClient.invalidateQueries(["rgroup", rgroupId, "history", "surveys"])
      },
      onError: () => {
        showErrorToast("Error sending survey")
      }
    },

  )
}

export const useCreateWaCustomerGroupMutation = (teamId: string) => {
  const queryClient = useQueryClient()
  return useMutation(({ rgroupName, phoneNumbers }: { rgroupName: string, phoneNumbers: Array<{ phone: string, name?: string }> }) => {
    return createRgroupFromPhoneNumbers(teamId, rgroupName, phoneNumbers)
  },
    {
      onSuccess: () => {
        notifications.show({
          message: "WaCustomer Group created successfully!",
          color: "green",
        });
        queryClient.invalidateQueries(["rgroup", "team", teamId])
        queryClient.invalidateQueries(["waCustomer", "team", teamId])
      }
    })
}

export const useDeleteWaCustomerFromWaCustomerGroupMutation = () => {
  const queryClient = useQueryClient()
  return useMutation(({ rgroupId, waCustomerId }: { rgroupId: string, waCustomerId: string }) => {
    return deleteWaCustomerFromWaCustomerGroup(rgroupId, waCustomerId)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "WaCustomer removed from group successfully!",
        color: "green",
      });
      queryClient.invalidateQueries(["rgroup"])
    }
  })
}

export const useDeleteWaCustomerGroupMutation = () => {
  const queryClient = useQueryClient()
  return useMutation((rgroupId: string) => {
    return deleteWaCustomerGroup(rgroupId)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "WaCustomer Group deleted successfully!",
        color: "green",
      });
      queryClient.invalidateQueries(["rgroup"])
    }
  })
}

export const useUpdateWaCustomerGroupMutation = (rgroupId) => {
  const queryClient = useQueryClient()
  return useMutation((rgroup: { name: string }) => {
    return updateWaCustomerGroup(rgroupId, rgroup)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "WaCustomer Group updated successfully!",
        color: "green",
      });
      // TODO: only invalidate the updated rgroup?
      queryClient.invalidateQueries(["rgroup"])
    }
  })
}

export const useAddWaCustomersMutation = (rgroupId) => {
  const queryClient = useQueryClient()
  return useMutation((waCustomers: Array<string>) => {
    return addWaCustomers(rgroupId, waCustomers)
  }, {
    onSuccess: () => {
      notifications.show({
        message: "WaCustomers added successfully!",
        color: "green",
      });
      queryClient.invalidateQueries(["rgroup", rgroupId])
    }
  }
  )
}