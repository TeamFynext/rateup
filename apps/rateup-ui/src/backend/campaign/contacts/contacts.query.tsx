import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CONTACT_SORT } from "@/components/Contacts/utils/utils.tsx";
import { useContactsStore } from "@/components/dashboard/inbox/store.ts";
import { ContactGroupType } from "@/types/enums.ts";

import {
  assignContactLabelsToContactId,
  assignContactLabelsToMultipleContacts,
  bulkAssignStatus,
  createContact,
  createContactLabel,
  createCustomField,
  deleteContact,
  deleteContactLabel,
  deleteCustomField,
  deleteManyContacts,
  editContact,
  editContactLabels,
  exportContacts,
  getContactById,
  getContactLabels,
  getContactsList,
  getCustomField,
  importContacts,
  importCSVContacts,
  updateContactLabel,
  updateCustomField,
  updateLifecycleofMultipleContacts,
} from "./contacts.api";

export const useContacts = (pagination, searchData?, sorting?, columnFilters?, type?) => {
  const sort = sorting ?? CONTACT_SORT;
  const filters = columnFilters ?? [];
  const search = searchData ?? "";
  const groupType = type ?? ContactGroupType.NORMAL;
  return useQuery({
    queryKey: ["contacts", pagination, search, sort, filters, groupType],
    queryFn: () => getContactsList(pagination, search, sort, filters, groupType),
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
    },
    onError: (_error) => {},
  });
};

const useImportContactMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacts imported successfully", {
        id: "contact-create",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating the contact`, {
        id: "contact-create",
      });
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
      // showSuccessToast(
      //   "Contacts imported successfully",
      //   "contact-create",
      //   <IconCheck />,
      // );
    },
    onError: (_error) => {
      // showErrorToast(
      //   `Error creating the contact: ${error?.message}`,
      //   "contact-create",
      //   <IconX />,
      // );
    },
  });
};
export const useContactDeleteMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  const { deleteContactsByIds } = useContactsStore();
  return useMutation({
    mutationFn: deleteContact,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      });
      toast.success("Contact Deleted successfully", {
        id: "contact-delete",
      });
      deleteContactsByIds([variables]);
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting contact`, {
        id: "contact-delete",
      });
    },
  });
};

export const useEditContactMutation = (groupId?: string) => {
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
      toast.success("Contact updated successfully.", {
        id: "contact-update",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating the contact`, {
        id: "contact-update",
      });
    },
  });
};

const useEditContactLabelsMutation = (_contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editContactLabels,
    onSuccess: (_data: any) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
      toast.success("Contact updated successfully.", {
        id: "contact-update",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating the contact`, {
        id: "contact-update",
      });
    },
  });
};

export const useDeleteManyContactsMutation = () => {
  const queryClient = useQueryClient();
  const { deleteContactsByIds } = useContactsStore();
  return useMutation({
    mutationFn: deleteManyContacts,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      // showSuccessToast(
      //   "Contact Deleted successfully",
      //   "contact-delete",
      //   <IconCheck />,
      //   true,
      // );
      deleteContactsByIds([...variables]);
      // onSucess();
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting contact`, {
        id: "contact-delete",
      });
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
      toast.success("Custom field created successfully.", {
        id: "custom-field-create",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating custom field`, {
        id: "custom-field-create",
      });
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
      toast.success("Custom field updated successfully.", {
        id: "custom-field-update",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating custom field`, {
        id: "custom-field-update",
      });
    },
  });
};

export const useDeleteCustomFieldMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customFields"] });
      toast.success("Custom field deleted successfully.", {
        id: "custom-field-delete",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting custom field`, {
        id: "custom-field-delete",
      });
    },
  });
};

export const useExportContactsMutation = () => {
  return useMutation({
    mutationFn: exportContacts,
    onMutate: () => {
      toast.loading("Preparing contacts for export...", {
        id: "contact-export",
      });
    },
    onSuccess: () => {
      toast.success("Contacts export initiated successfully.", {
        id: "contact-export",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error exporting contacts`, {
        id: "contact-export",
      });
    },
  });
};

export const useContactLabels = () => {
  return useQuery({
    queryKey: ["contactLabels"],
    queryFn: getContactLabels,
  });
};

export const useCreateContactLabelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContactLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactLabels"] });
      toast.success("Label created successfully", {
        id: "label-create",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating label`, {
        id: "label-create",
      });
    },
  });
};

export const useUpdateContactLabelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ labelId, data }: { labelId: string; data: any }) =>
      updateContactLabel(labelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactLabels"] });
      toast.success("Label updated successfully", {
        id: "label-update",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating label`, {
        id: "label-update",
      });
    },
  });
};

export const useDeleteContactLabelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContactLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactLabels"] });
      toast.success("Label deleted successfully", {
        id: "label-delete",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting label`, {
        id: "label-delete",
      });
    },
  });
};

export const useAssignContactLabelsToMultipleContacts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignContactLabelsToMultipleContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useAssignContactLabelsToContactId = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, labelIds }: { contactId: string; labelIds: string[] }) =>
      assignContactLabelsToContactId(contactId, { labelIds }),

    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useUpdateLifecycleofMultipleContacts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLifecycleofMultipleContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useBulkAssignStatusMutation = (groupId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkAssignStatus,

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

      toast.success("Chats updated successfully.", {
        id: "bulk-chat-update",
      });
    },

    onError: (error: any) => {
      toast.error(error?.message || "Error updating chats", {
        id: "bulk-chat-update",
      });
    },
  });
};
