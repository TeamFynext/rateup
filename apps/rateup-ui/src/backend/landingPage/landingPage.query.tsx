import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createLandingPage,
  deleteLandingPage,
  getDropdownOptionsOfLinkType,
  getLandingPages,
  getLandingPageWithShortId,
  updateLandingPage,
  updatePageVisits,
} from "./landingPage.api";

// get all landingPages
function useLandingPages() {
  return useQuery({
    queryKey: ["landingPages"],
    queryFn: getLandingPages,
  });
}

function useGetLandingPageWithShortId(shortUrlId) {
  return useQuery({
    queryKey: ["landingPage", shortUrlId],
    queryFn: getLandingPageWithShortId(shortUrlId),
    enabled: Boolean(shortUrlId),
  });
}

function useCreateLandingPageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLandingPage,
    onSuccess: () => {
      toast.success("Created landingPage successfully.", {
        id: "CreateLandingPage",
      });
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to create landingPage, please try again later", {
        id: "CreateLandingPage",
      });
    },
  });
}

function useUpdateLandingPageMutation(shortUrlId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => {
      return updateLandingPage(data);
    },
    onSuccess: () => {
      toast.success("Updated landingPage successfully.", {
        id: "UpdateLandingPage",
      });
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
      queryClient.invalidateQueries({ queryKey: ["landingPage", shortUrlId] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to update Landing Page, please try again later", {
        id: "CreateLandingPage",
      });
    },
  });
}

function useDeleteLandingPageMutation(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      return deleteLandingPage(id);
    },
    onSuccess: () => {
      toast.success("Deleted landingPage successfully.", {
        id: "deleteLandingPage",
      });
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
    },
    onError: (error) => {
      toast.error(error?.message || "unable to delete landingPage, please try again later", {
        id: "deleteLandingPage",
      });
    },
  });
}

// This is being used to get options for dropdowns in landingPage AddLinkOverlay component.
function useLinkTypeOptions(linkType) {
  return useQuery({
    queryKey: ["linktype-options", linkType],
    queryFn: getDropdownOptionsOfLinkType(linkType),
    enabled: linkType === "web-survey" || linkType === "whatsapp-survey",
  });
}

function usePageVisitsUpdateMutation(shortUrlId) {
  return useMutation({
    mutationFn: () => {
      return updatePageVisits(shortUrlId);
    },
    onSuccess: () => {},
    onError: () => {},
  });
}

export {
  useLandingPages,
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
  useGetLandingPageWithShortId,
  useDeleteLandingPageMutation,
  usePageVisitsUpdateMutation,
};
