import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ContactGroupType } from "@/types/enums";
import useContactStore from "@/app/dashboard/inbox/store";

import { CONTACT_SORT } from "../../../components/Contacts/utils/utils";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  createContact,
  createCustomField,
  deleteContact,
  deleteCustomField,
  deleteManyContacts,
  editContact,
  editContactLabels,
  getContactById,
  getContactsList,
  getCustomField,
  importContacts,
  importCSVContacts,
  updateCustomField,
} from "./contacts.api";

export const useContacts = (
  pagination,
  searchData?,
  sorting?,
  columnFilters?,
  type?,
) => {
  let sort = sorting ?? CONTACT_SORT;
  let filters = columnFilters ?? [];
  let search = searchData ?? "";
  let groupType = type ?? ContactGroupType.NORMAL;
  return useQuery({
    queryKey: ["contacts", pagination, search, sort, filters, groupType],
    queryFn: () =>
      getContactsList(pagination, search, sort, filters, groupType),
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
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({
        queryKey: ["contacts", "filtered"],
      });
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

export const useImportCSVContactMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importCSVContacts,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({
        queryKey: ["contacts", "filtered"],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["assignedInboxUser"],
      });
      queryClient.invalidateQueries({ queryKey: ["contactInboxCount"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
      queryClient.invalidateQueries({ queryKey: ["notification"] });
      queryClient.invalidateQueries({ queryKey: ["notificationCount"] });
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

export const useEditContactLabelsMutation = (contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editContactLabels,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
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

export const useDeleteManyContactsMutation = (onSucess: () => void) => {
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
        true,
      );
      onSucess();
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting contact: ${error?.response?.data?.error}`,
        "contact-delete",
        <IconX />,
        true,
      );
    },
  });
};

export const useCustomFields = () =>
  useQuery({
    queryKey: ["customFields"],
    queryFn: getCustomField,
  });

export const useCreateCustomFieldMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields"] });
      showSuccessToast(
        "Custom field created successfully.",
        "custom-field-create",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating custom field: ${error?.response?.data?.error}`,
        "custom-field-create",
        <IconX />,
      );
    },
  });
};

export const useUpdateCustomFieldMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: any }) =>
      updateCustomField(fieldId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields"] });
      showSuccessToast(
        "Custom field updated successfully.",
        "custom-field-update",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error updating custom field: ${error?.response?.data?.error}`,
        "custom-field-update",
        <IconX />,
      );
    },
  });
};

export const useDeleteCustomFieldMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields"] });
      showSuccessToast(
        "Custom field deleted successfully.",
        "custom-field-delete",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting custom field: ${error?.response?.data?.error}`,
        "custom-field-delete",
        <IconX />,
      );
    },
  });
};
