import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { automationKeys } from "@/backend/whatsapp/automation.keys";
import type { RequestPayload, RequestPayloadFields } from "@/types/api.ts";
import { AutomationPlatform } from "@/types/platform.ts";

import {
  cloneMetaAutomation,
  createMetaAutomation,
  deleteMetaAutomation,
  getAllMetaAutomations,
  getMetaAutomationById,
  initiateMetaAutomation,
  updateMetaAutomation,
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

export function metaAutomationKey(platform: MetaAutomationPlatform, automationId: string) {
  return platform === AutomationPlatform.FACEBOOK
    ? automationKeys.messengerAutomation({ automationId })
    : automationKeys.instagramAutomation({ automationId });
}

export const useAllMetaAutomations = (platform: MetaAutomationPlatform) =>
  useQuery({
    queryKey: metaAutomationListKey(platform),
    queryFn: async () => {
      const response = await getAllMetaAutomations(platform);
      return response.data;
    },
  });

export const useMetaAutomationById = (platform: MetaAutomationPlatform, automationId: string) =>
  useQuery({
    queryKey: metaAutomationKey(platform, automationId),
    queryFn: async () => {
      const response = await getMetaAutomationById(platform, automationId);
      return response.data;
    },
    enabled: !!automationId,
  });

export const useCreateMetaAutomationMutation = (platform: MetaAutomationPlatform) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestPayload) => createMetaAutomation(platform, data),
    onSuccess: (_response) => {
      qc.invalidateQueries({ queryKey: metaAutomationListKey(platform) });
      toast.success(`${LABEL[platform]} created`);
    },
    onError: (error) => {
      toast.error(error?.message || `Error Creating ${LABEL[platform]}`);
    },
  });
};

export const useDeleteMetaAutomationMutation = (platform: MetaAutomationPlatform) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (automationId: string) => deleteMetaAutomation(platform, automationId),
    onSuccess: (_res) => {
      qc.invalidateQueries({ queryKey: metaAutomationListKey(platform) });
      toast.success(`${LABEL[platform]} deleted`);
    },
    onError: (error) => {
      toast.error(error?.message || `Error Deleting ${LABEL[platform]}`);
    },
  });
};

export const useUpdateMetaAutomationMutation = (platform: MetaAutomationPlatform) => {
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & RequestPayloadFields) =>
      updateMetaAutomation(platform, id, data),
    onError: (error) => {
      toast.error(error?.message || `Error Updating ${LABEL[platform]}`);
    },
  });
};

export const useCloneMetaAutomationMutation = (platform: MetaAutomationPlatform) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ automationId, name }: { automationId: string; name: string }) =>
      cloneMetaAutomation(platform, automationId, name),
    onSuccess: (_res) => {
      qc.invalidateQueries({ queryKey: metaAutomationListKey(platform) });
      toast.success(`${LABEL[platform]} cloned`);
    },
    onError: (error) => {
      toast.error(error?.message || `Error cloning ${LABEL[platform]}`);
    },
  });
};

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

export const useInstagramAutomationById = (automationId: string) =>
  useMetaAutomationById(AutomationPlatform.INSTAGRAM, automationId);

export const useCreateInstagramAutomationMutation = () =>
  useCreateMetaAutomationMutation(AutomationPlatform.INSTAGRAM);

export const useDeleteInstagramAutomationMutation = () =>
  useDeleteMetaAutomationMutation(AutomationPlatform.INSTAGRAM);

export const useUpdateInstagramAutomationMutation = () =>
  useUpdateMetaAutomationMutation(AutomationPlatform.INSTAGRAM);

// ─── Messenger ────────────────────────────────────────────────────────────────

export const useAllMessengerAutomations = () => useAllMetaAutomations(AutomationPlatform.FACEBOOK);

export const useMessengerAutomationById = (automationId: string) =>
  useMetaAutomationById(AutomationPlatform.FACEBOOK, automationId);

export const useCreateMessengerAutomationMutation = () =>
  useCreateMetaAutomationMutation(AutomationPlatform.FACEBOOK);

export const useDeleteMessengerAutomationMutation = () =>
  useDeleteMetaAutomationMutation(AutomationPlatform.FACEBOOK);

export const useUpdateMessengerAutomationMutation = () =>
  useUpdateMetaAutomationMutation(AutomationPlatform.FACEBOOK);
