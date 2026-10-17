import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteMessengerProfileSection,
  getMessengerProfile,
  setMessengerProfileSection,
  type MessengerProfile,
  type MessengerProfileSection,
} from "./messengerProfile.api";

const profileKey = (channelId?: string) => ["messengerProfile", channelId];

export const useMessengerProfile = (channelId?: string) =>
  useQuery({
    queryKey: profileKey(channelId),
    queryFn: () => getMessengerProfile(channelId!),
    enabled: Boolean(channelId),
  });

/** Saves (a body) or removes (null) one section; the profile Meta answers with replaces the cache. */
export const useMessengerProfileMutation = (
  channelId: string | undefined,
  section: MessengerProfileSection,
  messages: { saved: string; removed: string },
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown> | null) =>
      body
        ? setMessengerProfileSection(channelId!, section, body)
        : deleteMessengerProfileSection(channelId!, section),
    onSuccess: (profile: MessengerProfile, body) => {
      qc.setQueryData(profileKey(channelId), profile);
      toast.success(body ? messages.saved : messages.removed);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update the Messenger profile");
    },
  });
};
