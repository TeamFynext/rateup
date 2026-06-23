import axios from "axios";
import { toast } from "sonner";

const axiosClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

const shouldSkipLocalErrorToast = (error) =>
  !!error?.response?.data?.displayMessageInClient;

const interceptorErrorHandler = (error) => {
  const { response, request } = error;

  if (globalThis.window !== undefined && shouldSkipLocalErrorToast(error)) {
    const message =
      response?.data?.message ??
      response?.data?.error ??
      "Something went wrong";
    toast.error(message, { id: "api-error" });

    return Promise.reject({
      ...error,
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
  } else if (error.message) {
    message = error.message;
  }

  // Normalize error message without losing original error
  return Promise.reject({
    ...error,
    message,
  });
};

axiosClient.interceptors.response.use(
  (response) => response,
  interceptorErrorHandler,
);

const axiosClientIP = axios.create({
  baseURL: `${import.meta.env.VITE_API_IP}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

axiosClientIP.interceptors.response.use((_) => _, interceptorErrorHandler);

const razorpayClient = axios.create({
  baseURL: `https://api.razorpay.com/v1`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

export { axiosClient, axiosClientIP, shouldSkipLocalErrorToast };
