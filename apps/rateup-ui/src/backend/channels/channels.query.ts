import { useQuery } from "@tanstack/react-query";

import { type Channel, type ChannelPlatform, getChannels } from "./channels.api";

export const channelKeys = {
  all: () => ["channels"] as const,
} as const;

/**
 * The org's connected channels, every platform in one list. One fetch serves every
 * caller; `platform` only narrows what this caller gets back.
 */
export const useChannels = (enabled = true, platform?: ChannelPlatform) =>
  useQuery({
    queryKey: channelKeys.all(),
    queryFn: getChannels,
    enabled,
    staleTime: 1000 * 60 * 5,
    select: platform
      ? (channels: Channel[]) => channels.filter((channel) => channel.platform === platform)
      : undefined,
  });
