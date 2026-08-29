import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { notificationKeys } from "@/backend/notification/notification.keys";

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

export const useUpdateNotificationSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      waMessageAssignNotification?: boolean;
      waMessageClosedNotification?: boolean;
    }) => {
      toast.loading("Hold on...updating settings", {
        id: "notification",
      });
      return updateNotificationSettings(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.settings() });
      toast.success("success", {
        id: "notification",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "failed", {
        id: "notification",
      });
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => {
      toast.loading("Hold on...deleting", {
        id: "notification",
      });
      return deleteNotification(notificationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all() });
      qc.invalidateQueries({ queryKey: notificationKeys.count() });
      toast.success("success", {
        id: "notification",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "failed", {
        id: "notification",
      });
    },
  });
};

export const useDeleteAllNotifications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      toast.loading("Hold on...deleting", {
        id: "notification",
      });
      return deleteAllNotifications();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all() });
      qc.invalidateQueries({ queryKey: notificationKeys.count() });
      toast.success("success", {
        id: "notification",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "failed", {
        id: "notification",
      });
    },
  });
};
