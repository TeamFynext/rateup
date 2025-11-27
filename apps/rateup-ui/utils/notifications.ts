import React from "react";

import { notifications } from "@mantine/notifications";

export function showInfoToast(
  title: string,
  message: string,
  icon?: React.ReactNode,
  onClick?: () => void,
  id?: string,
) {
  notifications.show({
    color: "teal",
    title: title,
    message: message,
    autoClose: 3000,
    loading: false,
    icon,
    onClick: onClick,
    id,
  });
}
export function showSuccessToast(
  message: string,
  id: string | undefined = undefined,
  icon?: React.ReactNode,
  updateNotification = false,
) {
  if (updateNotification) {
    notifications.update({
      id: id,
      color: "teal",
      title: "Success",
      message: message,
      autoClose: 2000,
      loading: false,
      icon,
    });
  } else {
    notifications.show({
      id: id,
      color: "teal",
      title: "Success",
      message: message,
      autoClose: 2000,
      loading: false,
      icon,
    });
  }
}

export function showErrorToast(
  message: string,
  id?: string,
  icon?: React.ReactNode,
  updateNotification = false,
) {
  if (updateNotification) {
    notifications.update({
      id: id,
      color: "red",
      title: "Error",
      message: message,
      autoClose: 2000,
      loading: false,
      icon,
    });
  } else {
    notifications.show({
      id: id,
      color: "red",
      title: "Error",
      message: message,
      autoClose: 3000,
      loading: false,
      icon,
    });
  }
}

export function showWarnToast(message: string, id = undefined) {
  notifications.show({
    color: "yellow",
    title: "Warning",
    message: message,
    autoClose: 2000,
  });
}

export function showLoadingToast(
  message: string,
  id: string | undefined = undefined,
  loading: boolean = true,
  title: string = "Loading",
  color: string = "teal",
  autoClose: number | boolean = 3000,
) {
  notifications.show({
    id: id,
    color: color,
    title: title,
    message: message,
    autoClose: autoClose,
    loading: loading,
  });
}
export function updateSuccessToast(message: string, id = undefined) {
  notifications.update({
    color: "teal",
    title: "updating",
    message: message,
    autoClose: 2000,
  });
}
