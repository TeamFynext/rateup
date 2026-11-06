import type { WaCallDirection, WaCallStatus } from "../../../generated/prisma/client.js";

/** An SDP blob as the Calling API carries it: RFC 8866 text plus which half it is. */
export interface CallSession {
  sdp_type: "offer" | "answer";
  sdp: string;
}

interface CallWebhookError {
  code: number | string;
  message?: string;
  href?: string;
  error_data?: { details?: string };
}

/** One entry of `value.calls[]` on a `calls` webhook change. */
export interface CallWebhookCall {
  id: string;
  /** The caller's phone (user-initiated). May be omitted; see `from_user_id`. */
  from: string;
  /** The customer's BSUID on a user-initiated call. */
  from_user_id?: string;
  /** The customer's phone (business-initiated). May be omitted; see `to_user_id`. */
  to: string;
  /** The customer's BSUID on a business-initiated call. */
  to_user_id?: string;
  event: "connect" | "terminate";
  direction: "USER_INITIATED" | "BUSINESS_INITIATED";
  timestamp: string;
  session?: CallSession;
  /** Terminate only. */
  status?: "COMPLETED" | "FAILED";
  start_time?: string;
  end_time?: string;
  duration?: number;
  biz_opaque_callback_data?: string;
  deeplink_payload?: string;
  cta_payload?: string;
}

/** One entry of `value.statuses[]` on a `calls` change — outbound calls only. */
export interface CallWebhookStatus {
  id: string;
  type: "call";
  status: "RINGING" | "ACCEPTED" | "REJECTED";
  timestamp: string;
  recipient_id: string;
  recipient_user_id?: string;
  biz_opaque_callback_data?: string;
}

export interface CallWebhookValue {
  messaging_product: "whatsapp";
  metadata: { phone_number_id: string; display_phone_number: string };
  contacts?: { wa_id?: string; user_id?: string; profile?: { name?: string; username?: string } }[];
  calls?: CallWebhookCall[];
  statuses?: CallWebhookStatus[];
  errors?: CallWebhookError[];
}

/** What the browser is told about a call. Never carries the offer SDP — see `getCallOffer`. */
export interface CallDto {
  id: string;
  waCallId: string;
  phoneId: string;
  direction: WaCallDirection;
  status: WaCallStatus;
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

export interface CallWsEvent {
  /**
   * `incoming` — a customer is calling; ring.
   * `updated`  — state changed (answered elsewhere, declined, outbound ringing/accepted).
   * `answer`   — the customer picked up an outbound call; `sdp` completes the agent's
   *              peer connection. Sent to the dialling agent only.
   * `ended`    — final; tear down media.
   */
  event: "incoming" | "updated" | "answer" | "ended";
  call: CallDto;
  sdp?: string;
}

/** The `call` arm stored on an `internal` WaMessage so the thread can show a call entry. */
export interface CallLogEntry {
  callId: string;
  direction: WaCallDirection;
  status: WaCallStatus;
  durationSeconds: number | null;
  answeredById: string | null;
  initiatedById: string | null;
}
