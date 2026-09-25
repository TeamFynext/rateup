import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { notificationKeys } from "@/backend/notification/notification.keys";
import { getApiErrorMessage } from "@/utils/apiError";

import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  getNotificationsCount,
  getNotificationSettings,
  markAllNotificationsRead,
  type NotificationSettings,
  type NotificationSettingsPatch,
  updateNotificationSettings,
} from "./notification.api";

export const useNotifications = (enabled = true) => {
  return useQuery({
    queryFn: getNotifications,
    queryKey: notificationKeys.all(),
    enabled,
  });
};

export const useNotificationsCount = () => {
  return useQuery({
    queryFn: getNotificationsCount,
    queryKey: notificationKeys.count(),
    refetchOnWindowFocus: "always",
  });
};

export const useNotificationSettings = (enabled = true) => {
  return useQuery({
    queryFn: getNotificationSettings,
    queryKey: notificationKeys.settings(),
    enabled,
  });
};

/** Apply a patch to the cached settings, so a switch moves the moment it is clicked. */
function applyPatch(
  current: NotificationSettings,
  patch: NotificationSettingsPatch,
): NotificationSettings {
  return {
    channels: { ...current.channels, ...patch.channels },
    sound: patch.sound ?? current.sound,
    events: current.events.map((event) => ({
      ...event,
      channels: { ...event.channels, ...patch.events?.[event.key] },
    })),
  };
}

export const useUpdateNotificationSettings = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: notificationKeys.settings() });
      const previous = qc.getQueryData<NotificationSettings>(notificationKeys.settings());
      if (previous) qc.setQueryData(notificationKeys.settings(), applyPatch(previous, patch));
      return { previous };
    },
    onError: (error, _patch, context) => {
      if (context?.previous) qc.setQueryData(notificationKeys.settings(), context.previous);
      toast.error(getApiErrorMessage(error, t("Could not save your notification settings")));
    },
    onSuccess: (settings) => {
      qc.setQueryData(notificationKeys.settings(), settings);
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.setQueryData(notificationKeys.count(), 0);
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all() });
      qc.invalidateQueries({ queryKey: notificationKeys.count() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t("Could not dismiss the notification")));
    },
  });
};

export const useDeleteAllNotifications = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all() });
      qc.invalidateQueries({ queryKey: notificationKeys.count() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t("Could not clear your notifications")));
    },
  });
};
