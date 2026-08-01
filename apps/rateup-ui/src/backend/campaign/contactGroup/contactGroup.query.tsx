import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { campaignKeys } from "@/backend/campaign/campaign.keys";
import { contactGroupKeys, contactKeys } from "@/backend/campaign/contacts/contacts.keys";
import type { ColumnFilterState, PaginationState, SortState } from "@/types/api.ts";
import { ContactGroupType } from "@/types/enums.ts";
import { getApiErrorData } from "@/utils/apiError.ts";
import { CONTACT_SORT } from "@/utils/constants.ts";

import {
  addExistingContactsToGroup,
  addExistingContactsToMultipleGroups,
  addNewContact,
  addNewContactFromCSV,
  createContactGroup,
  deleteContactGroup,
  deleteManyContactGroups,
  getContactGroupById,
  getContactGroupList,
  getContactGroupsByContactId,
  getContactGroupsByTeamId,
  removeContactsFromGroup,
  updateContactGroup,
  updateContactGroupsForContact,
} from "./contactGroup.api";

export const useContactGroup = (type: ContactGroupType = ContactGroupType.NORMAL) => {
  return useQuery({
    queryKey: campaignKeys.contactGroupsByType(type),
    queryFn: () => getContactGroupList(type),
  });
};

export const useContactGroupById = (
  groupId: string,
  enabled = false,
  pagination: PaginationState,
  searchData?: string,
  sorting?: SortState,
  columnFilters?: ColumnFilterState[],
) => {
  const sort = sorting ?? CONTACT_SORT;
  const filters = columnFilters ?? [];
  const search = searchData ?? "";
  return useQuery({
    queryKey: contactGroupKeys.list(groupId, pagination, search, sort, filters),
    queryFn: () => getContactGroupById(groupId, pagination, search, sort, filters),
    enabled: !!groupId && enabled,
  });
};

export const useContactGroupsByTeamId = (teamId: string) => {
  return useQuery({
    queryKey: contactGroupKeys.byTeam(),
    queryFn: () => getContactGroupsByTeamId(teamId),
  });
};

export const useContactGroupsByContactId = (contactId: string) => {
  return useQuery({
    queryKey: contactGroupKeys.byContact(contactId),
    queryFn: () => getContactGroupsByContactId(contactId),
    enabled: !!contactId,
  });
};

export const useCreateContactGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContactGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
    },
    onError: (error) => {
      toast.error(error?.message || `${error?.message || "Error creating group"}`, {
        id: "contact-group-create",
      });
    },
  });
};

export const useAddNewContactMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => addNewContact({ data, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.byContact(),
        exact: false,
        refetchType: "all",
      });
      toast.success("Added new member successfully.", {
        id: "contact-group-add-member",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error adding member`, {
        id: "contact-group-add-member",
      });
    },
  });
};

export const useAddNewContactFromCSVMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => addNewContactFromCSV({ data, groupId }),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
    },
    onSuccess: () => {
      toast.success("Added new member successfully.", {
        id: "contact-group-add-member",
      });
    },
    onError: (error) => {
      const isValidationError = getApiErrorData(error)?.error === "VALIDATION_ERR";
      if (!isValidationError) {
        toast.error(error?.message || `Error adding member`, {
          id: "contact-group-add-member",
        });
      }
    },
  });
};

export const useDeleteGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteContactGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.byContact(),
        exact: false,
        refetchType: "all",
      });
      toast.success("Contact Group Deleted successfully", {
        id: "contact-group-delete",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting contact group`, {
        id: "contact-group-delete",
      });
    },
  });
};

export const useEditContactGroupMutation = (groupId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Partial<ContactGroup>, "tags">) => updateContactGroup(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      // showSuccessToast(
      //   "Contact Group Updated Successfully.",
      //   "contact-group-update",
      //   <IconCheck />,
      // );
    },
    onError: (_error) => {
      // showErrorToast(
      //   `Error updating contact group:
      //   ${error?.message}`,
      //   "contact-group-update",
      //   <IconX />,
      // );
    },
  });
};

export const useAddExistingContactMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addExistingContactsToGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
      queryClient.invalidateQueries({
        queryKey: contactKeys.all(),
      });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.byContact(),
        exact: false,
        refetchType: "all",
      });
      toast.success("Members added to  group successfully.", {
        id: "contact-group-add-existing",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error adding members to group`, {
        id: "contact-group-add-existing",
      });
    },
  });
};

export const useRemoveContactsFromGroup = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeContactsFromGroup,
    onSuccess() {
      toast.success("Members removed from  group successfully.", {
        id: "contact-group-remove",
      });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.detail(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: contactKeys.all(),
      });
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.byContact(),
        exact: false,
        refetchType: "all",
      });
    },
    onError(error) {
      toast.error(error?.message || `Error removing members from group`, {
        id: "contact-group-remove",
      });
    },
  });
};

export const useAddExistingContactToMultipleGroupsMutation = (
  groupIds: string[],
  onSuccess: () => void,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addExistingContactsToMultipleGroups,
    onSuccess: () => {
      for (const id of groupIds) {
        queryClient.invalidateQueries({
          queryKey: contactGroupKeys.detail(id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
      toast.success("Contacts added to groups successfully.", {
        id: "contact-group-add-existing",
      });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || `${error?.message || "Error adding contacts to groups"}`, {
        id: "contact-group-add-existing",
      });
    },
  });
};

export const useDeleteManyContactGroupsMutation = (onSucess: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManyContactGroups,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
      toast.success("Contact Groups Deleted successfully", {
        id: "contact-group-delete",
      });
      onSucess();
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting contact groups`, {
        id: "contact-group-delete",
      });
    },
  });
};

export const useUpdateContactGroupsForContactMutation = (contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      addGroupIds,
      removeGroupIds,
    }: {
      contactId: string;
      addGroupIds: string[];
      removeGroupIds: string[];
    }) => updateContactGroupsForContact(contactId, addGroupIds, removeGroupIds),

    onSuccess: (_, _variables) => {
      queryClient.invalidateQueries({
        queryKey: contactKeys.all(),
      });
      queryClient.invalidateQueries({
        queryKey: contactGroupKeys.byContact(contactId),
      });
      queryClient.invalidateQueries({
        queryKey: campaignKeys.contactGroups(),
      });
    },
  });
};
