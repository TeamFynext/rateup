import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLandingPage,
  deleteLandingPage,
  getDropdownOptionsOfLinkType,
  getLandingPageWithShortId,
  getLandingPages,
  updateLandingPage,
} from "./landingPage.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

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
        "created landingPage successfully.",
        "createLandingPage",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
    },
    onError: () => {
      showErrorToast(
        "unable to create landingPage, please try again later",
        "createLandingPage",
        <IconX />,
      );
    },
  });
}

function useUpdateLandingPageMutation(shortUrlId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLandingPage,
    onSuccess: () => {
      showSuccessToast(
        "Updated landingPage successfully.",
        "updateLandingPage",
        <IconCheck />,
      );
      queryClient.invalidateQueries({ queryKey: ["landingPages"] });
      queryClient.invalidateQueries({ queryKey: ["landingPage", shortUrlId] });
    },
    onError: () => {
      showErrorToast(
        "unable to update landingPage, please try again later",
        "createLandingPage",
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

export {
  useLandingPages,
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
  useGetLandingPageWithShortId,
  useDeleteLandingPageMutation,
  useLinkTypeOptions,
};
