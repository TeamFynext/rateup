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

export const useInstagramProfile = (waSettingsId?: string) =>
  useQuery({
    queryKey: ["instagramProfile", waSettingsId],
    queryFn: () => getInstagramProfile(waSettingsId!),
    enabled: Boolean(waSettingsId),
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

export const useSetInstagramIceBreakersMutation = (waSettingsId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (iceBreakers: Parameters<typeof setInstagramIceBreakers>[1]) =>
      setInstagramIceBreakers(waSettingsId!, iceBreakers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", waSettingsId] });
      toast.success("Instagram ice breakers saved to DB");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update Instagram ice breakers");
    },
  });
};

export const useSyncInstagramIceBreakersMutation = (waSettingsId?: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => syncInstagramIceBreakers(waSettingsId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", waSettingsId] });
      toast.success("Instagram ice breakers synced with Meta");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to sync Instagram ice breakers");
    },
  });
};

export const useDeleteInstagramIceBreakersMutation = (
  waSettingsId?: string,
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => deleteInstagramIceBreakers(waSettingsId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", waSettingsId] });
      toast.success("Instagram ice breakers deleted");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete Instagram ice breakers");
    },
  });
};

export const useSetInstagramPersistentMenuMutation = (
  waSettingsId?: string,
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (
      persistentMenu: Parameters<typeof setInstagramPersistentMenu>[1],
    ) => setInstagramPersistentMenu(waSettingsId!, persistentMenu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", waSettingsId] });
      toast.success("Instagram persistent menu saved to DB");
    },
    onError: (error: any) => {
      toast.error(
        error?.message || "Failed to update Instagram persistent menu",
      );
    },
  });
};

export const useSyncInstagramPersistentMenuMutation = (
  waSettingsId?: string,
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => syncInstagramPersistentMenu(waSettingsId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", waSettingsId] });
      toast.success("Instagram persistent menu synced with Meta");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to sync Instagram persistent menu");
    },
  });
};

export const useDeleteInstagramPersistentMenuMutation = (
  waSettingsId?: string,
) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => deleteInstagramPersistentMenu(waSettingsId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instagramProfile", waSettingsId] });
      toast.success("Instagram persistent menu deleted");
    },
    onError: (error: any) => {
      toast.error(
        error?.message || "Failed to delete Instagram persistent menu",
      );
    },
  });
};
