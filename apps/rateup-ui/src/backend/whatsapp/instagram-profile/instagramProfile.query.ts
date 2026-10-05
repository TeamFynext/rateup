import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteInstagramIceBreakers,
  deleteInstagramPersistentMenu,
  getInstagramMediaPosts,
  getInstagramProfile,
  getInstagramStoriesList,
  setInstagramIceBreakers,
  setInstagramPersistentMenu,
  syncInstagramIceBreakers,
  syncInstagramPersistentMenu,
} from "./instagramProfile.api";

export const useInstagramProfile = (channelId?: string) =>
  useQuery({
    queryKey: ["instagramProfile", channelId],
    queryFn: () => getInstagramProfile(channelId!),
    enabled: Boolean(channelId),
  });

export const useInstagramMediaPosts = (ibaId?: string) =>
  useQuery({
    queryKey: ["instagramMediaPosts", ibaId],
    queryFn: () => getInstagramMediaPosts(ibaId!),
    enabled: Boolean(ibaId),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });

export const useInstagramStories = (ibaId?: string) =>
  useQuery({
    queryKey: ["instagramStories", ibaId],
    queryFn: () => getInstagramStoriesList(ibaId!),
    enabled: Boolean(ibaId),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  });

export const useSetInstagramIceBreakersMutation = (channelId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (iceBreakers: Parameters<typeof setInstagramIceBreakers>[1]) =>
      setInstagramIceBreakers(channelId!, iceBreakers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", channelId] });
      toast.success("Instagram ice breakers saved to DB");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update Instagram ice breakers");
    },
  });
};

export const useSyncInstagramIceBreakersMutation = (channelId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => syncInstagramIceBreakers(channelId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", channelId] });
      toast.success("Instagram ice breakers synced with Meta");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to sync Instagram ice breakers");
    },
  });
};

export const useDeleteInstagramIceBreakersMutation = (channelId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => deleteInstagramIceBreakers(channelId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", channelId] });
      toast.success("Instagram ice breakers deleted");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete Instagram ice breakers");
    },
  });
};

export const useSetInstagramPersistentMenuMutation = (channelId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (persistentMenu: Parameters<typeof setInstagramPersistentMenu>[1]) =>
      setInstagramPersistentMenu(channelId!, persistentMenu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", channelId] });
      toast.success("Instagram persistent menu saved to DB");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update Instagram persistent menu");
    },
  });
};

export const useSyncInstagramPersistentMenuMutation = (channelId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => syncInstagramPersistentMenu(channelId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", channelId] });
      toast.success("Instagram persistent menu synced with Meta");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to sync Instagram persistent menu");
    },
  });
};

export const useDeleteInstagramPersistentMenuMutation = (channelId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => deleteInstagramPersistentMenu(channelId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", channelId] });
      toast.success("Instagram persistent menu deleted");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete Instagram persistent menu");
    },
  });
};
