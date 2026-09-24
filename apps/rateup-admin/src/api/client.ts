import axios from "axios";

import { getApiErrorData } from "@/lib/apiError";

/** The API's origin, e.g. https://api.rateup.app. Same variable as rateup-ui. */
export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Every console request goes straight to rateup-api's `/api/staff/*`, like rateup-ui. The API
 * allows this origin through CORS and keeps the staff session in its own cookie, hence
 * `withCredentials`.
 */
export const api = axios.create({
  baseURL: `${API_URL}/api/staff`,
  withCredentials: true,
  headers: {
    // Required by the API on every non-GET; harmless on GETs, so it is always sent.
    "X-Staff-Csrf": "1",
  },
});

let onUnauthorized: (() => void) | undefined;

/**
 * Registered once from main.tsx. Lives here as a setter rather than an import of the router,
 * which would be circular (router → routes → api → router).
 */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401 && !isReauthRequired(error)) {
    // `/auth/me` failing is how the auth guard learns the session is gone; it redirects itself.
    if (!error.config?.url?.startsWith("/auth/me")) onUnauthorized?.();
  }
  return Promise.reject(error);
});

/** The API's answer for a sensitive action when the Google login is older than 15 minutes. */
export function isReauthRequired(error: unknown): boolean {
  return getApiErrorData(error)?.code === "REAUTH_REQUIRED";
}
