import axios, { AxiosError, AxiosResponse } from "axios";

const axiosClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});
const interceptorErrorHandler = (error) => {
  const { response, request } = error;

  /* ----------------------------------
       Subscription / 403 side effects
    -----------------------------------*/
  if (
    typeof window !== "undefined" &&
    response?.status === 403 &&
    response.data?.displayMessageInClient
  ) {
    import("sonner").then(({ toast }) => {
      toast.error(response?.data?.message ?? "Forbidden");
    });
  }
  let message = "Something went wrong";

  if (response?.data) {
    message = response.data.message || response.data.error || message;
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
  baseURL: `${process.env.NEXT_PUBLIC_API_IP}/api`,
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

export { axiosClient, axiosClientIP, razorpayClient };
