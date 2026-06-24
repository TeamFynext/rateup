import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createLinktree,
  deleteLinktree,
  getDropdownOptionsOfLinkType,
  getLinktrees,
  getLinktreeWithShortId,
  updateLinktree,
  updatePageVisitsOrLinkClicks,
} from "./linktree.api";

// get all linktrees
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
      toast.success("Created linktree successfully.", {
        id: "CreateLinktree",
      });
      queryClient.invalidateQueries({ queryKey: ["linktrees"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to create linktree, please try again later", {
        id: "CreateLinktree",
      });
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
      toast.success("Updated linktree successfully.", {
        id: "UpdateLinktree",
      });
      queryClient.invalidateQueries({ queryKey: ["linktrees"] });
      queryClient.invalidateQueries({ queryKey: ["linktree", shortUrlId] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to update Landing Page, please try again later", {
        id: "CreateLinktree",
      });
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
      toast.success("Deleted linktree successfully.", {
        id: "deleteLinktree",
      });
      queryClient.invalidateQueries({ queryKey: ["linktrees"] });
    },
    onError: (error) => {
      toast.error(error?.message || "unable to delete linktree, please try again later", {
        id: "deleteLinktree",
      });
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
    mutationFn: (bodyData: { resourceToBeUpdated: string; linkId?: string }) => {
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
