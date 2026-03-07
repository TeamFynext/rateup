import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      toast.loading("Hold on...updating settings", {
        id: "notification",
      });
      return updateNotificationSettings(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificationSettings"] });
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
    mutationFn: (notificationId) => {
      toast.loading("Hold on...deleting", {
        id: "notification",
      });
      return deleteNotification(notificationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
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
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
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
