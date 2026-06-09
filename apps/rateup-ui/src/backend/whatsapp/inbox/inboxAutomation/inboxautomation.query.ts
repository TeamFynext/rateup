import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { shouldSkipLocalErrorToast } from "@/backend/apiClient";

import {
  deleteInboxAutomation,
  enableInboxAutomation,
  getInboxAutomation,
  updateInboxAutomation,
} from "./inboxautomation.api";
import type { InboxAutomationData } from "./inboxautomation.api";

export const useInboxAutomation = (condition?: string) =>
  useQuery<InboxAutomationData[]>({
    queryKey: ["inboxAutomation", { condition }],
    queryFn: () => getInboxAutomation(condition),
    retry: 1,
    refetchOnWindowFocus: false,
  });

export const useEnableInboxAutomationMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (condition: string) => enableInboxAutomation(condition),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inboxAutomation"] });
    },
    onError: (error: any) => {
      if (!shouldSkipLocalErrorToast(error)) {
        toast.error(error?.message || "Error enabling inbox automation");
      }
    },
  });
};

export const useDisableInboxAutomationMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (condition: string) => deleteInboxAutomation(condition),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inboxAutomation"] });
    },
    onError: (error: any) => {
      if (!shouldSkipLocalErrorToast(error)) {
        toast.error(error?.message || "Error disabling inbox automation");
      }
    },
  });
};

export const useUpdateInboxAutomationMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      condition,
      data,
    }: {
      condition: string;
      data: Partial<Omit<InboxAutomationData, "condition">>;
    }) => updateInboxAutomation(condition, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inboxAutomation"] });
    },
    onError: (error: any) => {
      if (!shouldSkipLocalErrorToast(error)) {
        toast.error(
          error?.message || "Error updating inbox automation settings",
        );
      }
    },
  });
};
