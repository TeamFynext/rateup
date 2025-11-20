import { AxiosError } from "axios";
import { toast } from "sonner";

export function showErrorToastFromError(
  e: Error,
  fallbackMessage: string = "Error updating settings!",
) {
  if (e instanceof AxiosError) {
    if (typeof e?.response?.data === "string") {
      toast.error(e.response.data);
      return;
    }
    if (e?.response?.data?.message) {
      toast.error(e.response.data.message);
      return;
    }
  }
  toast.error(fallbackMessage);
  console.error(e);
}
