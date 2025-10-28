import axios, { AxiosError, AxiosResponse } from "axios";

import { showErrorToast } from "../utils/notifications";

const axiosClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

function subscriptionErrorHandler(error: AxiosError) {
  const response = error.response as AxiosResponse;
  if (response?.status === 403) {
    if (response.data.displayMessageInClient) {
      showErrorToast(response.data.message || "Forbidden");
    }
  }
  return Promise.reject(error);
}
axiosClient.interceptors.response.use((_) => _, subscriptionErrorHandler);
// TODO: Enable this generic error handler after testing
// axiosClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.data?.message) {
//       error.message = error.response.data.message;
//     } else if (error.response?.data?.error) {
//       error.message = error.response.data.error;
//     }
//     return Promise.reject(error);
//   }
// );

const axiosClientIP = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_IP}/api`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});
axiosClientIP.interceptors.response.use((_) => _, subscriptionErrorHandler);

const razorpayClient = axios.create({
  baseURL: `https://api.razorpay.com/v1`,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

export { axiosClient, axiosClientIP, razorpayClient };
