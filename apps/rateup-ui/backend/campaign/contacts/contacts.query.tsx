import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContact,
  deleteContact,
  deleteManyContacts,
  editContact,
  getContactById,
  getContactsList,
  importContacts,
} from "./contacts.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

export const useContacts = () => {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContactsList(),
  });
};

export const useContactById = (contactId: string) =>
  useQuery({
    enabled: !!contactId,
    queryKey: ["contacts", contactId],
    queryFn: () => getContactById(contactId),
  });

export const useCreateContactMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] }),
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
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
