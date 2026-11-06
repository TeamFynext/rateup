import { useQuery } from "@tanstack/react-query";
import { getChannels, getWebchatStatus } from "./channels.api";

/** The org's connected channels, which name the inbox's channel chips. They rarely change. */
export const useChannels = () =>
  useQuery({
    queryKey: ["channels"],
    queryFn: getChannels,
    staleTime: 5 * 60 * 1000,
  });

/** Whether the inbox filter offers Web chat (the org has had webchat visitors). */
export const useWebchatStatus = () =>
  useQuery({
    queryKey: ["channels", "webchat"],
    queryFn: getWebchatStatus,
    staleTime: 5 * 60 * 1000,
  });
