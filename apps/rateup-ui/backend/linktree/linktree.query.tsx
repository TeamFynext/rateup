import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createLinktree,
  deleteLinktree,
  getDropdownOptionsOfLinkType,
  getLinktrees,
  getLinktreeWithShortId,
  updateLinktree,
  updatePageVisitsOrLinkClicks,
} from "./linktree.api";

//get all linktrees
function useLinktrees() {
  return useQuery({
    queryKey: ["linktrees"],
    queryFn: getLinktrees,
  });
}

function useGetLinktreeWithShortId(shortUrlId) {
  return useQuery({
    queryKey: ["linktree", shortUrlId],
    queryFn: getLinktreeWithShortId(shortUrlId),
    enabled: Boolean(shortUrlId),
  });
}

function useCreateLinktreeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLinktree,
    onSuccess: () => {
      showSuccessToast(
        "Created linktree successfully.",
        "CreateLinktree",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["linktrees"] });
    },
    onError: () => {
      showErrorToast(
        "Unable to create linktree, please try again later",
        "CreateLinktree",
        <IconX />,
      );
    },
  });
}

function useUpdateLinktreeMutation(shortUrlId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => {
      return updateLinktree(data);
    },
    onSuccess: () => {
      showSuccessToast(
        "Updated linktree successfully.",
        "UpdateLinktree",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["linktrees"] });
      queryClient.invalidateQueries({ queryKey: ["linktree", shortUrlId] });
    },
    onError: () => {
      showErrorToast(
        "Unable to update Landing Page, please try again later",
        "CreateLinktree",
        <IconX />,
      );
    },
  });
}

function useDeleteLinktreeMutation(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      return deleteLinktree(id);
    },
    onSuccess: () => {
      showSuccessToast(
        "Deleted linktree successfully.",
        "deleteLinktree",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["linktrees"] });
    },
    onError: () => {
      showErrorToast(
        "unable to delete linktree, please try again later",
        "deleteLinktree",
        <IconX />,
      );
    },
  });
}

// This is being used to get options for dropdowns in linktree AddLinkOverlay component.
function useLinkTypeOptions(linkType) {
  return useQuery({
    queryKey: ["linktype-options", linkType],
    queryFn: getDropdownOptionsOfLinkType(linkType),
    enabled: linkType === "web-survey" || linkType === "whatsapp-survey",
  });
}

function usePageVisitsOrLinkClicksUpdateMutation(shortUrlId) {
  return useMutation({
    mutationFn: (bodyData: {
      resourceToBeUpdated: string;
      linkId?: string;
    }) => {
      return updatePageVisitsOrLinkClicks(shortUrlId, bodyData);
    },
    onSuccess: () => {},
    onError: () => {},
  });
}

export {
  useLinktrees,
  useCreateLinktreeMutation,
  useUpdateLinktreeMutation,
  useGetLinktreeWithShortId,
  useDeleteLinktreeMutation,
  useLinkTypeOptions,
  usePageVisitsOrLinkClicksUpdateMutation,
};
