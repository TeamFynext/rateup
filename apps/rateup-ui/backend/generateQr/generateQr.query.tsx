import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQr,
  deleteQr,
  getAllGeneratedQrs,
  getQrWithShortUrlId,
  getQrWithShortUrlIdPublic,
  incrementNoOfScans,
  updateQr,
} from "./generateQr.api";
import { showErrorToast, showSuccessToast } from "utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

function useGetAllGeneratedQrsQuery() {
  return useQuery({
    queryKey: ["generatedQrs"],
    queryFn: getAllGeneratedQrs,
  });
}

function useGetQrWithShortUrlId(shortUrlId) {
  return useQuery({
    queryKey: ["generatedQr", shortUrlId],
    queryFn: getQrWithShortUrlId(shortUrlId),
    enabled: Boolean(shortUrlId),
  });
}

function useGetQrWithShortUrlIdPublic(shortUrlId) {
  return useQuery({
    queryKey: ["generatedQrPublicGet", shortUrlId],
    queryFn: getQrWithShortUrlIdPublic(shortUrlId),
  });
}

function useCreateQrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQr,
    onSuccess: () => {
      showSuccessToast("Created QR successfully.", "CreateQr", <IconCheck />);
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    },
    onError: () => {
      showErrorToast(
        "Unable to create QR, please try again later",
        "CreateQr",
        <IconX />,
      );
    },
  });
}

function useUpdateQrMutation(shortUrlId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateQr,
    onSuccess: () => {
      showSuccessToast("Updated QR successfully.", "UpdateQr", <IconCheck />);
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
      queryClient.invalidateQueries({ queryKey: ["generatedQr", shortUrlId] });
    },
    onError: () => {
      showErrorToast(
        "Unable to update Landing Page, please try again later",
        "CreateLandingPage",
        <IconX />,
      );
    },
  });
}

function useDeleteQrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQr,
    onSuccess: () => {
      showSuccessToast("Deleted QR successfully.", "deleteQr", <IconCheck />);
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    },
    onError: () => {
      showErrorToast(
        "unable to delete QR, please try again later",
        "deleteQr",
        <IconX />,
      );
    },
  });
}

function useIncrementNoOfScansMutation() {
  return useMutation({
    mutationFn: incrementNoOfScans,
  });
}

export {
  useGetAllGeneratedQrsQuery,
  useCreateQrMutation,
  useUpdateQrMutation,
  useDeleteQrMutation,
  useGetQrWithShortUrlId,
  useGetQrWithShortUrlIdPublic,
  useIncrementNoOfScansMutation,
};
