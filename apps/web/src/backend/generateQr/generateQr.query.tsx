import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { retryUnlessNotFound } from "@/utils/apiError.ts";

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
    retry: retryUnlessNotFound,
  });
}

function useGetQrWithShortUrlIdPublic(shortUrlId: string) {
  return useQuery({
    queryKey: ["generatedQrPublicGet", shortUrlId],
    queryFn: getQrWithShortUrlIdPublic(shortUrlId),
  });
}

function useCreateQrMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQr,
    onSuccess: () => {
      toast.success(t("QR code created"), {
        id: "CreateQr",
      });
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    },
    onError: (error) => {
      toast.error(error?.message || t("Could not create the QR code. Try again."), {
        id: "CreateQr",
      });
    },
  });
}

function useUpdateQrMutation(shortUrlId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateQr,
    onSuccess: () => {
      toast.success(t("QR code saved"), {
        id: "UpdateQr",
      });
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
      queryClient.invalidateQueries({ queryKey: ["generatedQr", shortUrlId] });
    },
    onError: (error) => {
      toast.error(error?.message || t("Could not save the QR code. Try again."), {
        id: "UpdateQr",
      });
    },
  });
}

function useDeleteQrMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQr,
    onSuccess: () => {
      toast.success(t("QR code deleted"), {
        id: "deleteQr",
      });
      queryClient.invalidateQueries({ queryKey: ["generatedQrs"] });
    },
    onError: (error) => {
      toast.error(error?.message || t("Could not delete the QR code. Try again."), {
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
