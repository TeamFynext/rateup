import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addExistingContactsToGroup,
  addNewContact,
  createContactGroup,
  deleteContactGroup,
  getContactGroupById,
  getContactGroupList,
  getContactGroupsByTeamId,
  removeContactsFromGroup,
  updateContactGroup,
} from "./contactGroup.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

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
    enabled: !!groupId,
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
        showSuccessToast(
          "Contact Group created successfully.",
          "contact-group-create",
          <IconCheck />,
        );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating group: ${error?.response?.data?.error}`,
        "contact-group-create",
        <IconX />,
      );
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
        showSuccessToast(
          "Added new customer successfully.",
          "contact-group-add-customer",
          <IconCheck />,
        );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error adding customer: ${error?.response?.data?.error}`,
        "contact-group-add-customer",
        <IconX />,
      );
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
      showSuccessToast(
        "Contact Group Deleted successfully",
        "contact-group-delete",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting contact group: 
        ${error?.response?.data?.error}`,
        "contact-group-delete",
        <IconX />,
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
      showSuccessToast(
        "Contact Group Updated Successfully.",
        "contact-group-update",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating contact group:
        ${error?.response?.data?.error}`,
        "contact-group-update",
        <IconX />,
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
      showSuccessToast(
        "Customers added to  group successfully.",
        "contact-group-add-existing",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error adding customer to group: ${error?.response?.data?.error}`,
        "contact-group-add-existing",
        <IconX />,
      );
    },
  });
};

export const useRemoveContactsFromGroup = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeContactsFromGroup,
    onSuccess() {
      showSuccessToast(
        "Customers removed from  group successfully.",
        "contact-group-remove",
        <IconCheck />,
      );
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      });
    },
    onError(error: any) {
      showErrorToast(
        `Error removing customer from group: ${error?.response?.data?.error}`,
        "contact-group-remove",
        <IconX />,
      );
    },
  });
};
