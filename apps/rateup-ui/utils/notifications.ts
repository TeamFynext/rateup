import { notifications } from "@mantine/notifications";

export function showSuccessToast(message: string, id=undefined) {
    notifications.show({
        color: "teal",
        title: "Success",
        message: message,
        autoClose: 2000,
    });
}

export function showErrorToast(message: string, id=undefined) {
    notifications.show({
        color: "red",
        title: "Error",
        message: message,
        autoClose: 2000,
    });
}

export function showWarnToast(message: string, id=undefined) {
    notifications.show({
        color: "yellow",
        title: "Warning",
        message: message,
        autoClose: 2000,
    });
}