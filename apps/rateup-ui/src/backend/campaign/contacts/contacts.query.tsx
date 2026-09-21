import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { campaignKeys } from "@/backend/campaign/campaign.keys";
import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import { notificationKeys } from "@/backend/notification/notification.keys";
import { pipelineKeys } from "@/backend/pipeline/pipeline.keys";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import { useContactsStore } from "@/store/inbox.store.ts";
import type { RequestPayload } from "@/types/api.ts";
import type { ColumnFilterState, PaginationState, SortState } from "@/types/api.ts";
import { ContactGroupType } from "@/types/enums.ts";
import { CONTACT_SORT } from "@/utils/constants.ts";

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
  getContactFullDetails,
  getContactLabels,
  getContactsList,
  getCustomField,
  importContacts,
  importCSVContacts,
  updateContactLabel,
  updateCustomField,
  updateLifecycleofMultipleContacts,
  type IUpdateContactLabel,
} from "./contacts.api";
import { contactGroupKeys, contactKeys } from "./contacts.keys";

export const useContacts = (
  pagination: PaginationState,
  searchData?: string,
  sorting?: SortState,
  columnFilters?: ColumnFilterState[],
  type?: string,
) => {
  const sort = sorting ?? CONTACT_SORT;
  const filters = columnFilters ?? [];
  const search = searchData ?? "";
  const groupType = type ?? ContactGroupType.NORMAL;
  return useQuery({
    queryKey: contactKeys.list(pagination, search, sort, filters, groupType),
    queryFn: () => getContactsList(pagination, search, sort, filters, groupType),
  });
};

/** Digits only, so "+91 90000 00000" and "919000000000" compare equal. */
const digitsOf = (phone: string) => phone.replace(/\D/g, "");

const PHONE_MATCH_PAGE: PaginationState = { pageIndex: 0, pageSize: 20 };

/**
 * Finds the contact already holding a phone number, so a caller can offer to
 * link to it rather than strand a record beside it.
 *
 * There is no exact-match-by-phone endpoint, so this leans on the list search,
 * which is a case-insensitive `contains` over name and phone. Two consequences
 * shape the implementation:
 *
 *  - Search on the *national* digits, not the full E.164 string. Numbers are
 *    stored however they arrived — the WhatsApp webhook writes a wa_id with the
 *    country code, older CSV imports often have neither code nor punctuation.
 *    The national part is the substring common to both.
 *  - Re-check every candidate here, because `contains` also matches longer
 *    numbers that merely end the same way, and the search ORs in name matches.
 */
export const useContactByPhone = (phone: string | null) => {
  const national = phone ? digitsOf(phone).slice(-10) : "";
  const enabled = national.length >= 7;
  const filters: ColumnFilterState[] = [];

  const query = useQuery({
    enabled,
    queryKey: contactKeys.list(
      PHONE_MATCH_PAGE,
      national,
      CONTACT_SORT,
      filters,
      ContactGroupType.NORMAL,
    ),
    queryFn: () =>
      getContactsList(PHONE_MATCH_PAGE, national, CONTACT_SORT, filters, ContactGroupType.NORMAL),
  });

  const wanted = phone ? digitsOf(phone) : "";
  const match =
    enabled && wanted
      ? (query.data?.users ?? []).find((candidate) => {
          const stored = digitsOf(candidate.phone ?? "");
          // Too-short stored numbers (junk imports) would suffix-match almost
          // anything, so they are never treated as a hit.
          if (stored.length < 7) return false;
          // Either side may carry the country code the other omits, so the
          // shorter number has to be a suffix of the longer one.
          return stored.endsWith(wanted) || wanted.endsWith(stored);
        })
      : undefined;

  return { match: match ?? null, isLoading: enabled && query.isFetching };
};

export const useContactById = (contactId: string) =>
  useQuery({
    enabled: !!contactId,
    queryKey: contactKeys.detail(contactId),
    queryFn: () => getContactById(contactId),
  });

/**
 * Backs the contact detail dialog. Disabled until the dialog is actually open so a
 * 500-row contacts table does not fire 500 detail requests on mount.
 */
export const useContactFullDetails = (contactId: string, enabled = true) =>
  useQuery({
    enabled: enabled && !!contactId,
    queryKey: contactKeys.fullDetails(contactId),
    queryFn: () => getContactFullDetails(contactId),
  });

export const useCreateContactMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      queryClient.invalidateQueries({
        queryKey: contactKeys.filtered(),
      });
    },
    onError: (_error) => {},
  });
};

export const useImportContactMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
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
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      queryClient.invalidateQueries({
        queryKey: contactKeys.filtered(),
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      toast.success("Contact deleted", {
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
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: whatsappKeys.assignedInboxUser(),
      });
      queryClient.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      queryClient.invalidateQueries({ queryKey: contactKeys.filtered() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
      // A lifecycle change moves this contact's leads into the matching column,
      // and can open one on a team's default board — neither of which the
      // pipeline's cache would hear about otherwise.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
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

export const useEditContactLabelsMutation = (_contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editContactLabels,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.filtered() });
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
      // showSuccessToast(
      //   "Contact deleted",
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
    mutationFn: ({ fieldId, data }: { fieldId: string; data: RequestPayload }) =>
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
    mutationFn: ({ labelId, data }: { labelId: string; data: IUpdateContactLabel }) =>
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
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
    },
  });
};

export const useAssignContactLabelsToContactId = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, labelIds }: { contactId: string; labelIds: string[] }) =>
      assignContactLabelsToContactId(contactId, { labelIds }),

    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
    },
  });
};

export const useUpdateLifecycleofMultipleContacts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLifecycleofMultipleContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      // Same mirror as the single-contact edit above.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
  });
};

export const useBulkAssignStatusMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkAssignStatus,

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: whatsappKeys.assignedInboxUser(),
      });
      queryClient.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      queryClient.invalidateQueries({ queryKey: contactKeys.filtered() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.count() });

      toast.success("Chats updated successfully.", {
        id: "bulk-chat-update",
      });
    },

    onError: (error) => {
      toast.error(error?.message || "Error updating chats", {
        id: "bulk-chat-update",
      });
    },
  });
};
