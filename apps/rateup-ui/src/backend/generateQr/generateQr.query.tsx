import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createQr,
  deleteQr,
  getAllGeneratedQrs,
  getQrWithShortUrlId,
  getQrWithShortUrlIdPublic,
  incrementNoOfScans,
  updateQr,
} from "./generateQr.api";

function useGetAllGeneratedQrsQuery() {
  return useQuery({
    queryKey: ["generatedQrs"],
    queryFn: getAllGeneratedQrs,
  });
}

function useGetQrWithShortUrlId(shortUrlId: string) {
  return useQuery({
    queryKey: ["generatedQr", shortUrlId],
    queryFn: getQrWithShortUrlId(shortUrlId),
    enabled: Boolean(shortUrlId),
  });
}

function useGetQrWithShortUrlIdPublic(shortUrlId: string) {
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
      toast.success("Created QR successfully.", {
        id: "CreateQr",
      });
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to create QR, please try again later", {
        id: "CreateQr",
      });
    },
  });
}

function useUpdateQrMutation(shortUrlId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateQr,
    onSuccess: () => {
      toast.success("Updated QR successfully.", {
        id: "UpdateQr",
      });
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
      queryClient.invalidateQueries({ queryKey: ["generatedQr", shortUrlId] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to update Landing Page, please try again later", {
        id: "CreateLandingPage",
      });
    },
  });
}

function useDeleteQrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQr,
    onSuccess: () => {
      toast.success("Deleted QR successfully.", {
        id: "deleteQr",
      });
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    },
    onError: (error) => {
      toast.error(error?.message || "unable to delete QR, please try again later", {
        id: "deleteQr",
      });
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
