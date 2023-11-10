import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContact,
  deleteContact,
  getContactListByTeamId,
  getContactsList,
  importContacts,
} from "./contacts.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useCampaignContacts = () => {
  return useQuery({
    queryKey: ["campaignContactsData"],
    queryFn: () => getContactsList(),
  });
};

export const useCampaignContactsByTeamId = (teamId) => {
  return useQuery({
    queryKey: ["campaignContactsDataByTeamId"],
    queryFn: () => getContactListByTeamId(teamId),
  });
};

export const useCreateContactMutation = (
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] }),
        showSuccessToast("Contact created successfully.");
      onSuccess();
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating the contact: ${error?.response?.data?.message}`,
      );
      onError();
    },
  });
};

export const useImportContactMutation = (
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignContactsData"] });
      showSuccessToast("Contacts imported successfully");
      onSuccess();
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating the contact: ${error?.response?.data?.message}`,
      );
      onError();
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
        showSuccessToast("Contact Deleted successfully");
    },
    onError: (error: any) => {
      showErrorToast("Error deleting contact:", error?.response?.data?.error);
    },
  });
};
