import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createLandingPage,
  deleteLandingPage,
  getDropdownOptionsOfLinkType,
  getLandingPages,
  getLandingPageWithShortId,
  updateLandingPage,
  updatePageVisitsOrLinkClicks,
} from "./landingPage.api";

//get all landingPages
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
      showSuccessToast(
        "Created landingPage successfully.",
        "CreateLandingPage",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
    },
    onError: () => {
      showErrorToast(
        "Unable to create landingPage, please try again later",
        "CreateLandingPage",
        <IconX />,
      );
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
      console.log("onSucess from landingpage query");
      showSuccessToast(
        "Updated landingPage successfully.",
        "UpdateLandingPage",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
      queryClient.invalidateQueries({ queryKey: ["landingPage", shortUrlId] });
    },
    onError: () => {
      console.log("onError from landingpage query");
      showErrorToast(
        "Unable to update Landing Page, please try again later",
        "CreateLandingPage",
        <IconX />,
      );
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
      showSuccessToast(
        "Deleted landingPage successfully.",
        "deleteLandingPage",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
    },
    onError: () => {
      showErrorToast(
        "unable to delete landingPage, please try again later",
        "deleteLandingPage",
        <IconX />,
      );
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
  useLandingPages,
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
  useGetLandingPageWithShortId,
  useDeleteLandingPageMutation,
  useLinkTypeOptions,
  usePageVisitsOrLinkClicksUpdateMutation,
};
