import { notifications } from "@mantine/notifications";

export function showSuccessToast(message: string, id = undefined) {
  notifications.show({
    color: "teal",
    title: "Success",
    message: message,
    autoClose: 2000,
  });
}

export function showErrorToast(message: string, id = undefined) {
  notifications.show({
    color: "red",
    title: "Error",
    message: message,
    autoClose: 2000,
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
  id = undefined,
  loading: boolean,
  title: string,
  color: string = "teal"
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