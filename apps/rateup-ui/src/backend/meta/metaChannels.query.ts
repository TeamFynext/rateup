import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { channelKeys } from "@/backend/channels/channels.query";
import { getApiErrorMessage } from "@/utils/apiError";

import {
  connectMetaChannels,
  deleteMetaChannel,
  getMetaChannels,
  loginMetaChannels,
  type MetaChannel,
  type MetaChannelPlatform,
} from "./metaChannels.api";

export const metaChannelKeys = {
  channels: () => ["metaChannels"] as const,
} as const;

/**
 * Messenger Pages and Instagram accounts the viewer's teams reach. One fetch serves both
 * platforms; `platform` only narrows what this caller gets back.
 */
export const useMetaChannels = (enabled = true, platform?: MetaChannelPlatform) =>
  useQuery({
    queryKey: metaChannelKeys.channels(),
    queryFn: getMetaChannels,
    enabled,
    staleTime: 1000 * 60 * 5,
    select: platform
      ? (channels: MetaChannel[]) => channels.filter((channel) => channel.platform === platform)
      : undefined,
  });

export const useMetaChannelLoginMutation = () =>
  useMutation({
    mutationFn: loginMetaChannels,
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not finish the Facebook login"), {
        id: "meta-channel-login",
      });
    },
  });

export const useConnectMetaChannelsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: connectMetaChannels,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metaChannelKeys.channels() });
      qc.invalidateQueries({ queryKey: channelKeys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not connect"));
    },
  });
};

export const useDeleteMetaChannelMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMetaChannel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metaChannelKeys.channels() });
      qc.invalidateQueries({ queryKey: channelKeys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not disconnect"));
    },
  });
};
