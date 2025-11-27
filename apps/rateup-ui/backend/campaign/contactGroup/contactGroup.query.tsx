import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ContactGroupType } from "@/types/enums";
import { CONTACT_SORT } from "@/components/Contacts/utils/utils";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
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
  getContactGroupsByTeamId,
  removeContactsFromGroup,
  updateContactGroup,
} from "./contactGroup.api";

export const useContactGroup = (
  type: ContactGroupType = ContactGroupType.NORMAL,
) => {
  return useQuery({
    queryKey: ["campaignContactGroupsData", type],
    queryFn: () => getContactGroupList(type),
  });
};

export const useContactGroupById = (
  groupId: string,
  enabled = false,
  pagination,
  searchData?,
  sorting?,
  columnFilters?,
) => {
  let sort = sorting ?? CONTACT_SORT;
  let filters = columnFilters ?? [];
  let search = searchData ?? "";
  return useQuery({
    queryKey: ["contactGroupById", groupId, pagination, search, sort, filters],
    queryFn: () =>
      getContactGroupById(groupId, pagination, search, sort, filters),
    enabled: !!groupId && enabled,
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
      });
      // showSuccessToast(
      //   "Contact Group created successfully.",
      //   "contact-group-create",
      //   <IconCheck />,
      //   true,
      // );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error creating group: ${error?.response?.data?.error}`,
        "contact-group-create",
        <IconX />,
        true,
      );
    },
  });
};

export const useAddNewContactMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => addNewContact({ data, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      }),
        queryClient.invalidateQueries({ queryKey: ["contacts"] }),
        showSuccessToast(
          "Added new member successfully.",
          "contact-group-add-member",
          <IconCheck />,
        );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error adding member: ${error?.response?.data?.error}`,
        "contact-group-add-member",
        <IconX />,
      );
    },
  });
};

export const useAddNewContactFromCSVMutation = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => addNewContactFromCSV({ data, groupId }),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      }),
        queryClient.invalidateQueries({ queryKey: ["contacts"] }),
        showSuccessToast(
          "Added new member successfully.",
          "contact-group-add-member",
          <IconCheck />,
        );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error adding member: ${error?.response?.data?.error}`,
        "contact-group-add-member",
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
    mutationFn: (data: Omit<Partial<ContactGroup>, "tags">) =>
      updateContactGroup(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      });
      // showSuccessToast(
      //   "Contact Group Updated Successfully.",
      //   "contact-group-update",
      //   <IconCheck />,
      // );
    },
    onError: (error: any) => {
      // showErrorToast(
      //   `Error updating contact group:
      //   ${error?.response?.data?.error}`,
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
        queryKey: ["contactGroupById", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      queryClient.invalidateQueries({
        queryKey: ["contacts"],
      });
      showSuccessToast(
        "Members added to  group successfully.",
        "contact-group-add-existing",
        <IconCheck />,
      );
    },
    onError: (error: any) => {
      showErrorToast(
        `Error adding members to group: ${error?.response?.data?.error}`,
        "contact-group-add-existing",
        <IconX />,
      );
    },
  });
};

export const useRemoveContactsFromGroup = (groupId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeContactsFromGroup,
    onSuccess() {
      showSuccessToast(
        "Members removed from  group successfully.",
        "contact-group-remove",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({
        queryKey: ["contactGroupById", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
    },
    onError(error: any) {
      showErrorToast(
        `Error removing members from group: ${error?.response?.data?.error}`,
        "contact-group-remove",
        <IconX />,
        true,
      );
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
          queryKey: ["contactGroupById", id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      showSuccessToast(
        "Contacts added to groups successfully.",
        "contact-group-add-existing",
        <IconCheck />,
        true,
      );
      onSuccess();
    },
    onError: (error: any) => {
      showErrorToast(
        `Error adding contacts to groups: ${error?.response?.data?.error}`,
        "contact-group-add-existing",
        <IconX />,
        true,
      );
    },
  });
};

export const useDeleteManyContactGroupsMutation = (onSucess: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManyContactGroups,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      showSuccessToast(
        "Contact Groups Deleted successfully",
        "contact-group-delete",
        <IconCheck />,
        true,
      );
      onSucess();
    },
    onError: (error: any) => {
      showErrorToast(
        `Error deleting contact groups: ${error?.response?.data?.error}`,
        "contact-group-delete",
        <IconX />,
        true,
      );
    },
  });
};
