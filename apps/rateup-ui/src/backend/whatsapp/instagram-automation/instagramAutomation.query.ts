import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { automationKeys } from "@/backend/whatsapp/automation.keys";
import { AutomationPlatform } from "@/types/platform.ts";

import {
  getAllMetaAutomations,
  initiateMetaAutomation,
  type MetaAutomationPlatform,
} from "./instagramAutomation.api";

/**
 * Instagram and Messenger chatbots share one API shape, so the hooks take the platform.
 * The Instagram- and Messenger-named hooks below are the same hooks with it filled in.
 */

const LABEL: Record<MetaAutomationPlatform, string> = {
  [AutomationPlatform.INSTAGRAM]: "Instagram Automation",
  [AutomationPlatform.FACEBOOK]: "Messenger Automation",
};

export function metaAutomationListKey(platform: MetaAutomationPlatform) {
  return platform === AutomationPlatform.FACEBOOK
    ? automationKeys.allMessengerAutomations()
    : automationKeys.allInstagramAutomations();
}

export const useAllMetaAutomations = (platform: MetaAutomationPlatform) =>
  useQuery({
    queryKey: metaAutomationListKey(platform),
    queryFn: async () => {
      const response = await getAllMetaAutomations(platform);
      return response.data;
    },
  });

export const useInitiateMetaAutomationMutation = (
  platform: MetaAutomationPlatform,
  automationId: string,
) => {
  return useMutation({
    mutationFn: ({ recipientId, accountId }: { recipientId: string; accountId: string }) =>
      initiateMetaAutomation(platform, automationId, recipientId, accountId),
    onSuccess: (_res) => {
      toast.success(`${LABEL[platform]} initiated Successfully`);
    },
    onError: (error) => {
      toast.error(error?.message || `Error initiating ${LABEL[platform]}`);
    },
  });
};

// ─── Instagram ────────────────────────────────────────────────────────────────

export const useAllInstagramAutomations = () => useAllMetaAutomations(AutomationPlatform.INSTAGRAM);

// ─── Messenger ────────────────────────────────────────────────────────────────

export const useAllMessengerAutomations = () => useAllMetaAutomations(AutomationPlatform.FACEBOOK);
