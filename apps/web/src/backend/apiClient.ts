import axios from "axios";
import { toast } from "sonner";

import { asApiError, getApiErrorData } from "@/utils/apiError.ts";

const axiosClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

const shouldSkipLocalErrorToast = (error: unknown) =>
  !!getApiErrorData(error)?.displayMessageInClient;

/** Where an ORG_SUSPENDED answer sends the app (routes/(auth)/login/callback/suspended). */
const SUSPENDED_PATH = "/login/callback/suspended";

/**
 * RateUp staff suspended this organisation: every request is refused with 403
 * ORG_SUSPENDED until they restore it, so there is nothing useful to show but the
 * suspended screen. A full navigation rather than the router, which this module cannot
 * import; it also drops every cached query that belonged to the suspended session.
 */
function redirectIfSuspended(error: unknown): boolean {
  if (globalThis.window === undefined) return false;
  const { response } = asApiError(error);
  if (response?.status !== 403 || getApiErrorData(error)?.code !== "ORG_SUSPENDED") return false;
  if (!window.location.pathname.startsWith(SUSPENDED_PATH)) {
    window.location.assign(SUSPENDED_PATH);
  }
  return true;
}

/**
 * A `responseType: "blob"` request (exports, templates) gets its JSON error body as a Blob too,
 * which would hide the server's message and the ORG_SUSPENDED code from the handling below.
 */
async function parseBlobErrorBody(error: unknown): Promise<void> {
  const response = asApiError(error).response;
  const data: unknown = response?.data;
  if (!response || typeof Blob === "undefined" || !(data instanceof Blob)) return;
  if (!data.type.includes("json")) return;
  try {
    response.data = JSON.parse(await data.text());
  } catch {
    // An unparseable body keeps the generic message.
  }
}

const interceptorErrorHandler = async (error: unknown) => {
  await parseBlobErrorBody(error);
  const { response, request } = asApiError(error);

  if (redirectIfSuspended(error)) {
    return Promise.reject({ ...asApiError(error), message: "This account is suspended." });
  }

  if (globalThis.window !== undefined && shouldSkipLocalErrorToast(error)) {
    const errorData = getApiErrorData(error);
    const message = errorData?.message ?? errorData?.error ?? "Something went wrong";
    toast.error(message, { id: "api-error" });

    return Promise.reject({
      ...asApiError(error),
      message,
    });
  }

  /* ----------------------------------
       Subscription / 403 side effects
    -----------------------------------*/
  let message = "Something went wrong";

  if (response?.data) {
    if (typeof response.data === "string") {
      message = response.data;
    } else {
      message = response.data.message || response.data.error || message;
    }
  } else if (request) {
    message = "Network error. Please try again.";
  } else if (asApiError(error).message) {
    message = asApiError(error).message as string;
  }

  // Normalize error message without losing original error
  return Promise.reject({
    ...asApiError(error),
    message,
  });
};

axiosClient.interceptors.response.use((response) => response, interceptorErrorHandler);

/**
 * For calls the API answers only after Meta does — the Meta AI agent's. One
 * action can be several Meta requests in a row (installing the RateUp
 * connector creates it and then each tool), which the 8s default cuts off
 * while the work is still going through. Same base, headers and error
 * handling; only the patience differs.
 */
const axiosSlowClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  timeout: 180_000,
  headers: {
    Accept: "application/json",
  },
});

axiosSlowClient.interceptors.response.use((response) => response, interceptorErrorHandler);

const axiosClientIP = axios.create({
  baseURL: `${import.meta.env.VITE_API_IP}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

axiosClientIP.interceptors.response.use((_) => _, interceptorErrorHandler);

export { axiosClient, axiosClientIP, axiosSlowClient, shouldSkipLocalErrorToast };
