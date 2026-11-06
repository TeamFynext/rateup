import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";
import { getApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "@/utils/downloadBlob";

import type { TransactionFilter } from "./redemption.api";
import {
  applyRedemption,
  exportTransactions,
  getRedemptionsByCustomer,
  getTransactions,
  verifyRedemption,
} from "./redemption.api";

export const useGetRedemptionsByCustomer = (customerId: string) =>
  useQuery({
    queryKey: loyaltyKeys.redemptionsByCustomer(customerId),
    queryFn: () => getRedemptionsByCustomer(customerId),
    enabled: !!customerId,
  });

export const useGetTransactions = (filters?: TransactionFilter, enabled = true) =>
  useQuery({
    queryKey: loyaltyKeys.transactionsFiltered(filters),
    queryFn: () => getTransactions(filters),
    enabled: !!enabled,
  });

export const useExportTransactionsMutation = () =>
  useMutation({
    mutationFn: ({
      filters,
      format,
    }: {
      filters: Omit<TransactionFilter, "page" | "limit">;
      format: "csv" | "excel";
    }) => exportTransactions(filters, format),
    onSuccess: (blob, { format }) => {
      downloadBlob(blob, `loyalty-activity.${format === "csv" ? "csv" : "xlsx"}`);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not export the activity"));
    },
  });

export const useVerifyRedemption = () =>
  useMutation({
    mutationFn: verifyRedemption,
  });

/** Marks a redemption used and refreshes the customer it belonged to. */
export const useApplyRedemption = (customerPhone?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyRedemption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.cashierCustomer(customerPhone) });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not mark the redemption as used"));
    },
  });
};
