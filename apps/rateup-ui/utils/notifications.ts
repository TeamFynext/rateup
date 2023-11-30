import { notifications } from "@mantine/notifications";
import React from "react";

export function showSuccessToast(
  message: string,
  id = undefined,
  icon?: React.ReactNode,
) {
  notifications.update({
    id:id,
    color: "teal",
    title: "Success",
    message: message,
    autoClose: 2000,
    loading:false,
    icon,
  });
}

export function showErrorToast(
  message: string,
  id?: string,
  icon?: React.ReactNode,
) {
  notifications.update({
    id:id,
    color: "red",
    title: "Error",
    message: message,
    autoClose: 2000,
    loading:false,
    icon,
  });
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
  loading: boolean,
  title: string,
  color: string = "teal",
) {
  notifications.show({
    id: id,
    color: color,
    title: title,
    message: message,
    autoClose: 3000,
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
