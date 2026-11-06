import axios from "@/config/axios";

/**
 * WhatsApp voice calls. Mirrors rateup-ui's `backend/whatsapp/calling/calling.api.ts`; the
 * API is the same one the dashboard uses (`/api/wa/calls`).
 */
const CALLS_URL = "/api/wa/calls";

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

export interface CallPermissionState {
  status: string;
  expiresAt: string | null;
  canCall: boolean;
  canRequest: boolean;
}

export const getRingingCalls = async () =>
  (await axios.get<CallDto[]>(`${CALLS_URL}/ringing`)).data;

export const getCallOffer = async (callId: string) =>
  (await axios.get<{ sdp: string }>(`${CALLS_URL}/${callId}/offer`)).data;

export const acceptCall = async ({ callId, sdp }: { callId: string; sdp: string }) =>
  (await axios.post<CallDto>(`${CALLS_URL}/${callId}/accept`, { sdp })).data;

export const rejectCall = async (callId: string) =>
  (await axios.post<CallDto>(`${CALLS_URL}/${callId}/reject`)).data;

export const terminateCall = async (callId: string) => {
  await axios.post(`${CALLS_URL}/${callId}/terminate`);
};

/** "This phone still holds the call." Without these the server hangs up after ~20 s. */
export const heartbeatCall = async (callId: string) => {
  await axios.post(`${CALLS_URL}/${callId}/heartbeat`);
};

export const startCall = async (input: { phoneId: string; contactId: string; sdp: string }) =>
  (await axios.post<CallDto>(CALLS_URL, input)).data;

export const getCallPermission = async (params: { phoneId: string; contactId: string }) =>
  (await axios.get<CallPermissionState>(`${CALLS_URL}/permission`, { params })).data;

export const requestCallPermission = async (input: {
  phoneId: string;
  contactId: string;
  body: string;
  teamId?: string | null;
}) => {
  await axios.post(`${CALLS_URL}/permission/request`, input);
};

/** The API's `code` for a refusal it explains itself (`calling_disabled`, …). */
export function callErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { code?: unknown } } })?.response?.data;
  return typeof data?.code === "string" ? data.code : undefined;
}

/** The API's message when it sent one, else `fallback`. */
export function callErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof data?.message === "string" && data.message ? data.message : fallback;
}

/* ------------------------------------------------------------- call history */

export type CallOutcome = "answered" | "missed" | "declined" | "failed";

/** One row of `GET /api/wa/calls/log`, scoped server-side the way the inbox is. */
export interface CallLogRow extends CallDto {
  contactPhone: string | null;
  agentId: string | null;
  agentName: string | null;
  /** Seconds from the first ring to pickup. */
  ringSeconds: number | null;
}

export interface CallLogFilters {
  from: Date;
  to: Date;
  direction?: CallDirection;
  outcome?: CallOutcome;
}

export const getCallLog = async (filters: CallLogFilters, cursor?: string) =>
  (
    await axios.get<{ items: CallLogRow[]; nextCursor: string | null }>(`${CALLS_URL}/log`, {
      params: {
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        direction: filters.direction,
        outcome: filters.outcome,
        cursor,
        limit: 30,
      },
    })
  ).data;
