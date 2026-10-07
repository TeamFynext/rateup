import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

const CallsUrl = `${WHATSAPP_URL}/calls`;

export type CallDirection = "USER_INITIATED" | "BUSINESS_INITIATED";
export type CallStatus = "RINGING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "MISSED" | "FAILED";

/** A call as the API describes it. Never carries SDP — see `getCallOffer`. */
export interface CallDto {
  id: string;
  waCallId: string;
  phoneId: string;
  direction: CallDirection;
  status: CallStatus;
  customerWaId: string;
  contactId: string | null;
  contactName: string | null;
  conversationId: string | null;
  initiatedById: string | null;
  answeredById: string | null;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
}

/** The `call` WebSocket event. `answer` reaches only the agent who dialled. */
export interface CallWsEvent {
  event: "incoming" | "updated" | "answer" | "ended";
  call: CallDto;
  sdp?: string;
}

/** The `call` arm of an internal thread entry. */
export interface CallLogEntry {
  callId: string;
  direction: CallDirection;
  status: CallStatus;
  durationSeconds: number | null;
  answeredById: string | null;
  initiatedById: string | null;
}

export interface CallPermissionState {
  status: string;
  expiresAt: string | null;
  canCall: boolean;
  canRequest: boolean;
}

export type CallSettingsStatus = "ENABLED" | "DISABLED";
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface CallSettings {
  status: CallSettingsStatus;
  call_icon_visibility?: "DEFAULT" | "DISABLE_ALL";
  callback_permission_status?: CallSettingsStatus;
  call_hours?: {
    status: CallSettingsStatus;
    timezone_id: string;
    weekly_operating_hours: { day_of_week: DayOfWeek; open_time: string; close_time: string }[];
    holiday_schedule?: { date: string; start_time: string; end_time: string }[];
  };
}

export const getRingingCalls = async () => {
  const res = await axiosClient.get(`${CallsUrl}/ringing`);
  return res.data as CallDto[];
};

export const getCallOffer = async (callId: string) => {
  const res = await axiosClient.get(`${CallsUrl}/${callId}/offer`);
  return res.data as { sdp: string };
};

export const acceptCall = async ({ callId, sdp }: { callId: string; sdp: string }) => {
  const res = await axiosClient.post(`${CallsUrl}/${callId}/accept`, { sdp });
  return res.data as CallDto;
};

export const rejectCall = async (callId: string) => {
  const res = await axiosClient.post(`${CallsUrl}/${callId}/reject`);
  return res.data as CallDto;
};

export const terminateCall = async (callId: string) => {
  await axiosClient.post(`${CallsUrl}/${callId}/terminate`);
};

/** "This tab still holds the call." Without these the server hangs up after ~20 s. */
export const heartbeatCall = async (callId: string) => {
  await axiosClient.post(`${CallsUrl}/${callId}/heartbeat`);
};

/**
 * Hang up from a page that is going away. axios cannot do this — the page tears down its
 * requests on unload — so it is a `keepalive` fetch, which the browser finishes on its own.
 * SuperTokens' fetch interceptor adds the session, as for any other call to the API.
 */
export const terminateCallOnUnload = (callId: string) => {
  void fetch(`${import.meta.env.VITE_API_URL}/api${CallsUrl}/${callId}/terminate`, {
    method: "POST",
    keepalive: true,
    credentials: "include",
  }).catch(() => undefined);
};

export const startCall = async (input: { phoneId: string; contactId: string; sdp: string }) => {
  const res = await axiosClient.post(CallsUrl, input);
  return res.data as CallDto;
};

export const getCallPermission = async (params: { phoneId: string; contactId: string }) => {
  const res = await axiosClient.get(`${CallsUrl}/permission`, { params });
  return res.data as CallPermissionState;
};

export const requestCallPermission = async (input: {
  phoneId: string;
  contactId: string;
  body: string;
  teamId?: string | null;
}) => {
  await axiosClient.post(`${CallsUrl}/permission/request`, input);
};

export const getCallSettings = async (phoneId: string) => {
  const res = await axiosClient.get(`${CallsUrl}/settings/${phoneId}`);
  return res.data as CallSettings;
};

export const updateCallSettings = async ({
  phoneId,
  settings,
}: {
  phoneId: string;
  settings: CallSettings;
}) => {
  const res = await axiosClient.post(`${CallsUrl}/settings/${phoneId}`, settings);
  return res.data as CallSettings;
};

export const callKeys = {
  permission: (phoneId: string, contactId: string) =>
    ["wa-call-permission", phoneId, contactId] as const,
  settings: (phoneId: string) => ["wa-call-settings", phoneId] as const,
};
