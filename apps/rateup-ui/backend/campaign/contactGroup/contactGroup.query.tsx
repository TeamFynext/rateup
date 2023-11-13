import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addExistingContactsToGroup,
  addNewContact,
  createContactGroup,
  deleteContactGroup,
  getContactGroupById,
  getContactGroupList,
  getContactGroupsByTeamId,
  updateContactGroup,
} from "./contactGroup.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useContactGroup = () => {
  return useQuery({
    queryKey: ["campaignContactGroupsData"],
    queryFn: () => getContactGroupList(),
  });
};

export const useContactGroupById = (groupId: string) => {
  return useQuery({
    queryKey: ["contactGroupById", groupId],
    queryFn: () => getContactGroupById(groupId),
  });
};

export const useContactGroupsByTeamId = (teamId: string) => {
  return useQuery({
    queryKey: ["contactGroupsDataByTeamId"],
    queryFn: () => getContactGroupsByTeamId(teamId),
  });
};

export const useCreateContactGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContactGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      }),
        showSuccessToast("Contact Group created successfully.");
    },
    onError: (error: any) => {
      showErrorToast("Error creating group", error?.response?.data?.message);
    },
  });
};

export const useAddNewContactMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addNewContact,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      }),
        queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] }),
        showSuccessToast("Added new customer successfully.");
    },
    onError: (error: any) => {
      showErrorToast("Error adding customer", error?.response?.data?.message);
    },
  });
};

export const useDeleteGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContactGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      showSuccessToast("Contact Group Deleted successfully");
    },
    onError: (error: any) => {
      showErrorToast(
        "Error deleting contact group",
        error?.response?.data?.message,
      );
    },
  });
};

export const useEditContactGroupMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateContactGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      });
      showSuccessToast("Contact Group Updated Successfully.");
    },
    onError: (error: any) => {
      showErrorToast(
        "Error updating contact group",
        error?.response?.data?.message,
      );
    },
  });
};

export const useAddExistingContactMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addExistingContactsToGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      });
      showSuccessToast("Customers added to  group successfully.");
    },
    onError: (error: any) => {
      showErrorToast(
        "Error adding customer to group",
        error?.response?.data?.message,
      );
    },
  });
};
