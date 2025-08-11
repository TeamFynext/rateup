import { AxiosError } from "axios";

import { showErrorToast } from "./notifications";

export function showErrorToastFromError(
  e: Error,
  fallbackMessage: string = "Error updating settings!",
) {
  if (e instanceof AxiosError) {
    if (typeof e?.response?.data === "string") {
      showErrorToast(e.response.data);
      return;
    }
    if (e?.response?.data?.message) {
      showErrorToast(e.response.data.message);
      return;
    }
  }
  showErrorToast(fallbackMessage);
  console.error(e);
}
