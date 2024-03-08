import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContact,
  deleteContact,
  deleteManyContacts,
  editContact,
  getContactListByTeamId,
  getContactsList,
  importContacts,
} from "./contacts.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

export const useCampaignContacts = () => {
  return useQuery({
    queryKey: ["campaignContactsData"],
    queryFn: () => getContactsList(),
  });
};

export const useCampaignContactsByTeamId = (teamId) => {
  return useQuery({
    queryKey: ["campaignContactsDataByTeamId", teamId],
    queryFn: () => getContactListByTeamId(teamId),
  });
};

export const useCreateContactMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] }),
        showSuccessToast(
          "Contact created successfully.",
          "contact-create",
          <IconCheck />,
        );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating the contact: ${error?.response?.data?.error}`,
        "contact-create",
        <IconX />,
      );
    },
  });
};

export const useImportContactMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] });
      showSuccessToast(
        "Contacts imported successfully",
        "contact-create",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating the contact: ${error?.response?.data?.error}`,
        "contact-create",
        <IconX />,
      );
    },
  });
};

export const useContactDeleteMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] });
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      }),
        showSuccessToast(
          "Contact Deleted successfully",
          "contact-delete",
          <IconCheck />,
        );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting contact: ${error?.response?.data?.error}`,
        "contact-delete",
        <IconX />,
      );
    },
  });
};

export const useEditContactMutation = (groupId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] });
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      });
      showSuccessToast(
        "Contact updated successfully.",
        "contact-update",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating the contact: ${error?.response?.data?.error}`,
        "contact-update",
        <IconX />,
      );
    },
  });
};

export const useDeleteManyContactsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManyContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] });
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      showSuccessToast(
        "Contact Deleted successfully",
        "contact-delete",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting contact: ${error?.response?.data?.error}`,
        "contact-delete",
        <IconX />,
      );
    },
  });
};
