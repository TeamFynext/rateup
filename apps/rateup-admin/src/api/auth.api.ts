import { api } from "./client";

export interface StaffUser {
  id: string;
  email: string;
  name: string | null;
  isOwner: boolean;
  avatarUrl?: string | null;
}

const MOCK_STAFF: StaffUser = {
  id: "mock-staff",
  email: "dev@rateup.app",
  name: "Dev Staff",
  isOwner: true,
};

export const isStaffMock = import.meta.env.DEV && import.meta.env.VITE_STAFF_MOCK === "true";

export async function getMe(): Promise<StaffUser> {
  if (isStaffMock) return MOCK_STAFF;
  const { data } = await api.get<{ data: StaffUser }>("/auth/me");
  return data.data;
}

export async function logout(): Promise<void> {
  if (isStaffMock) return;
  await api.post("/auth/logout");
}

/**
 * Google sign-in is a full-page redirect through the API (the OIDC state lives in a cookie set
 * there), so this navigates rather than calling axios. `reauth` forces a fresh Google login for
 * step-up on sensitive actions.
 */
export function startGoogleLogin({
  returnTo = "/",
  reauth = false,
}: { returnTo?: string; reauth?: boolean } = {}) {
  const params = new URLSearchParams({ returnTo });
  if (reauth) params.set("reauth", "1");
  window.location.assign(`/api/staff/auth/google/start?${params}`);
}
