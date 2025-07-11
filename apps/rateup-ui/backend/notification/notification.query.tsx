import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  getNotificationsCount,
  getNotificationSettings,
  updateNotificationSettings,
} from "./notification.api";

export const useNotifications = (enabled = true) => {
  return useQuery({
    queryFn: getNotifications,
    queryKey: ["notification"],
    enabled,
  });
};

export const useNotificationsCount = () => {
  return useQuery({
    queryFn: getNotificationsCount,
    queryKey: ["notificationCount"],
    refetchOnWindowFocus: "always",
  });
};

export const useNotificationSettings = (enabled = true) => {
  return useQuery({
    queryFn: getNotificationSettings,
    queryKey: ["notificationSettings"],
    enabled,
  });
};

export const useUpdateNotificationSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      ticketAssignNotification?: boolean;
      waMessageAssignNotification?: boolean;
      waMessageClosedNotification?: boolean;
    }) => {
      showLoadingToast("Hold on...updating settings", "notification", true);
      return updateNotificationSettings(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificationSettings"] });
      showSuccessToast("success", "notification", <IconCheck />, true);
    },
    onError: () => {
      showErrorToast("failed", "notification", <IconX />, true);
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => {
      showLoadingToast("Hold on...deleting", "notification", true);
      return deleteNotification(notificationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
      showSuccessToast("success", "notification", <IconCheck />, true);
    },
    onError: () => {
      showErrorToast("failed", "notification", <IconX />, true);
    },
  });
};

export const useDeleteAllNotifications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      showLoadingToast("Hold on...deleting", "notification", true);
      return deleteAllNotifications();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
      showSuccessToast("success", "notification", <IconCheck />, true);
    },
    onError: () => {
      showErrorToast("failed", "notification", <IconX />, true);
    },
  });
};
