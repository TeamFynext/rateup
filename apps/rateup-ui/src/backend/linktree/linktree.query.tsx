import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { linktreeKeys } from "@/backend/campaign/campaign.keys";
import type { RequestPayload } from "@/types/api.ts";
import { retryUnlessNotFound } from "@/utils/apiError.ts";

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
    queryKey: linktreeKeys.all(),
    queryFn: getLinktrees,
  });
}

function useGetLinktreeWithShortId(shortUrlId: string) {
  return useQuery({
    queryKey: ["linktree", shortUrlId],
    queryFn: getLinktreeWithShortId(shortUrlId),
    enabled: Boolean(shortUrlId),
    retry: retryUnlessNotFound,
  });
}

function useCreateLinktreeMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLinktree,
    onSuccess: () => {
      toast.success(t("Link page created"), {
        id: "CreateLinktree",
      });
      queryClient.invalidateQueries({ queryKey: linktreeKeys.all() });
    },
    onError: (error) => {
      toast.error(error?.message || t("Could not create the link page. Try again."), {
        id: "CreateLinktree",
      });
    },
  });
}

function useUpdateLinktreeMutation(shortUrlId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestPayload) => {
      return updateLinktree(data);
    },
    onSuccess: () => {
      toast.success(t("Link page saved"), {
        id: "UpdateLinktree",
      });
      queryClient.invalidateQueries({ queryKey: linktreeKeys.all() });
      queryClient.invalidateQueries({ queryKey: ["linktree", shortUrlId] });
    },
    onError: (error) => {
      toast.error(error?.message || t("Could not save the link page. Try again."), {
        id: "UpdateLinktree",
      });
    },
  });
}

function useDeleteLinktreeMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLinktree,
    onSuccess: () => {
      toast.success(t("Link page deleted"), {
        id: "deleteLinktree",
      });
      queryClient.invalidateQueries({ queryKey: linktreeKeys.all() });
    },
    onError: (error) => {
      toast.error(error?.message || t("Could not delete the link page. Try again."), {
        id: "deleteLinktree",
      });
    },
  });
}

// This is being used to get options for dropdowns in linktree AddLinkOverlay component.
function useLinkTypeOptions(linkType: string) {
  return useQuery({
    queryKey: ["linktype-options", linkType],
    queryFn: getDropdownOptionsOfLinkType(linkType),
    enabled: linkType === "web-survey" || linkType === "whatsapp-survey",
  });
}

function usePageVisitsOrLinkClicksUpdateMutation(shortUrlId: string) {
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
