import crypto from "node:crypto";
import {
  PlatformType,
  WaCallDirection,
  WaCallStatus,
  type WaCall,
} from "../../../../generated/prisma/client.js";
import type { Actor } from "../../../authz/actor.js";
import { loadActor } from "../../../authz/actor.js";
import type { WaMessageBody } from "../../../types/whatsapp.types.js";
import { HttpError } from "../../../utils/http.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { getContactById, getOrCreateContactByPhone } from "../../contact/contact.service.js";
import {
  getActiveConversationForContact,
  openConversationForContact,
} from "../../contact/conversation/conversation.service.js";
import { sendViaWstoOrgHandler } from "../../org/ws/org.ws.controller.js";
import { getChannelScope } from "../settings/wa_channel_access.js";
import { getWaSettings, getWaSettingsByPhoneId } from "../settings/wa_settings.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import { armCallWatchdog } from "../../../workers/bullmq/queues/callWatchdog.queue.js";
import { holdsBrowserMedia, markCallAlive, terminateOnMeta } from "./calling.watchdog.js";
import type {
  CallDto,
  CallLogEntry,
  CallWebhookCall,
  CallWebhookStatus,
  CallWebhookValue,
  CallWsEvent,
} from "./calling.types.js";

/**
 * Meta holds an unanswered call for 30–60 s before it gives up; the offer is useless after
 * that, so it lives in Redis rather than on the row.
 */
const OFFER_TTL_SECONDS = 120;
/** Long enough to outlive any real call; the ring list is only re-read for that call. */
const AUDIENCE_TTL_SECONDS = 4 * 60 * 60;
const ADMIT_BATCH = 20;
/** Meta: "lack of a call request permission for this business number from the WhatsApp user". */
export const NO_CALL_PERMISSION_CODE = 138006;

const offerKey = (waCallId: string) => `wacall:offer:${waCallId}`;
const audienceKey = (callId: string) => `wacall:audience:${callId}`;

// ---------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------

type CallWithContact = WaCall & { contact: { name: string | null } | null };

function toDto(call: CallWithContact): CallDto {
  return {
    id: call.id,
    waCallId: call.waCallId,
    phoneId: call.phoneId,
    direction: call.direction,
    status: call.status,
    customerWaId: call.customerWaId,
    contactId: call.contactId,
    contactName: call.contact?.name ?? null,
    conversationId: call.conversationId,
    initiatedById: call.initiatedById,
    answeredById: call.answeredById,
    createdAt: call.createdAt.toISOString(),
    answeredAt: call.answeredAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
    durationSeconds: call.durationSeconds,
    errorMessage: call.errorMessage,
  };
}

const withContact = { contact: { select: { name: true } } } as const;

async function requireSettings(orgId: string, phoneId: string) {
  const settings = await getWaSettings(orgId, phoneId);
  // getWaSettings falls back to the org's oldest number when phoneId is empty; a call
  // must never leave on a number the agent did not pick.
  if (!settings || settings.phoneId !== phoneId) {
    throw new HttpError("WhatsApp number not found", 404);
  }
  return settings;
}

async function callsEndpoint(phoneId: string, accessToken: string, body: Record<string, unknown>) {
  const res = await callMetaApi(`/${phoneId}/calls`, "POST", accessToken, {
    messaging_product: "whatsapp",
    ...body,
  });
  return res.data;
}

/** The channel a business number belongs to, for team-scope checks. */
async function channelIdForPhone(orgId: string, phoneId: string): Promise<string | null> {
  const row = await prisma.whatsappSettings.findFirst({
    where: { orgId, phoneId },
    select: { channelId: true },
  });
  return row?.channelId ?? null;
}

async function actorReachesChannel(actor: Actor, channelId: string | null): Promise<boolean> {
  if (!channelId) return true;
  const scope = await getChannelScope(actor);
  return scope.all || scope.ids.has(channelId);
}

/**
 * Who rings when a customer calls: everyone who could pick up a chat on that number —
 * `inbox.reply`, the channel in their team scope, and, for members limited to their own
 * chats, only if the contact is assigned to them. The same rule as the inbound-message
 * queue notification, so the people who would see the message are the ones who hear the call.
 */
async function resolveRingAudience(
  orgId: string,
  phoneId: string,
  contactId: string | null,
): Promise<string[]> {
  const [channelId, assignees, members] = await Promise.all([
    channelIdForPhone(orgId, phoneId),
    contactId
      ? prisma.waInboxAssign.findMany({ where: { contactId }, select: { assignedUserId: true } })
      : Promise.resolve([]),
    prisma.orgMember.findMany({
      where: { orgId, user: { active: true } },
      select: { userId: true },
    }),
  ]);
  const assigned = new Set(assignees.map((a) => a.assignedUserId));

  const admitted: string[] = [];
  for (let i = 0; i < members.length; i += ADMIT_BATCH) {
    await Promise.all(
      members.slice(i, i + ADMIT_BATCH).map(async ({ userId }) => {
        const actor = await loadActor(userId, orgId);
        if (!actor?.can("inbox.reply")) return;
        if (actor.scope.inbox === "assigned_only" && !assigned.has(userId)) return;
        if (!(await actorReachesChannel(actor, channelId))) return;
        admitted.push(userId);
      }),
    );
  }
  return admitted;
}

async function storeAudience(callId: string, userIds: string[]) {
  await redis.set(audienceKey(callId), JSON.stringify(userIds), "EX", AUDIENCE_TTL_SECONDS);
}

/** The people who heard the call ring, plus whoever dialled or answered it. */
async function audienceFor(call: WaCall): Promise<string[]> {
  const people = new Set<string>();
  try {
    const cached = await redis.get(audienceKey(call.id));
    if (cached) for (const id of JSON.parse(cached) as string[]) people.add(id);
  } catch (error) {
    log.warn({ err: error, callId: call.id }, "Could not read call audience");
  }
  if (call.initiatedById) people.add(call.initiatedById);
  if (call.answeredById) people.add(call.answeredById);
  return Array.from(people);
}

async function publish(call: CallWithContact, event: CallWsEvent["event"], userIds?: string[]) {
  const to = userIds ?? (await audienceFor(call));
  if (to.length === 0) return;
  await sendViaWstoOrgHandler(
    call.orgId,
    { type: "call", call: { event, call: toDto(call) } },
    "main",
    to,
  );
}

async function findCallForActor(actor: Actor, callId: string): Promise<CallWithContact> {
  const call = await prisma.waCall.findFirst({
    where: { id: callId, orgId: actor.orgId },
    include: withContact,
  });
  if (!call) throw new HttpError("Call not found", 404);

  // The dialler and the answerer always reach their own call; anyone else needs the number
  // in scope — the same line that decides who heard it ring.
  if (actor.userId && (call.initiatedById === actor.userId || call.answeredById === actor.userId)) {
    return call;
  }
  if (actor.scope.inbox === "assigned_only") {
    const audience = await audienceFor(call);
    if (!actor.userId || !audience.includes(actor.userId)) {
      throw new HttpError("Call not found", 404);
    }
    return call;
  }
  if (!(await actorReachesChannel(actor, await channelIdForPhone(actor.orgId, call.phoneId)))) {
    throw new HttpError("Call not found", 404);
  }
  return call;
}

// ---------------------------------------------------------------------------------------
// Agent actions
// ---------------------------------------------------------------------------------------

/** Calls still ringing for this agent — what a freshly opened tab should show. */
export async function listRingingCalls(actor: Actor): Promise<CallDto[]> {
  const since = new Date(Date.now() - OFFER_TTL_SECONDS * 1000);
  const calls = await prisma.waCall.findMany({
    where: {
      orgId: actor.orgId,
      direction: WaCallDirection.USER_INITIATED,
      status: WaCallStatus.RINGING,
      createdAt: { gte: since },
    },
    include: withContact,
    orderBy: { createdAt: "desc" },
  });
  const visible: CallDto[] = [];
  for (const call of calls) {
    const audience = await audienceFor(call);
    if (actor.userId && audience.includes(actor.userId)) visible.push(toDto(call));
  }
  return visible;
}

/**
 * The customer's SDP offer. Kept off the WebSocket broadcast on purpose: every ringing
 * agent hears about the call, but only the one who answers needs the offer, and it is
 * fetched through the same scope check as every other action.
 */
export async function getCallOffer(actor: Actor, callId: string): Promise<{ sdp: string }> {
  const call = await findCallForActor(actor, callId);
  if (call.direction !== WaCallDirection.USER_INITIATED || call.status !== WaCallStatus.RINGING) {
    throw new HttpError("This call is no longer ringing", 409);
  }
  const sdp = await redis.get(offerKey(call.waCallId));
  if (!sdp) throw new HttpError("This call is no longer ringing", 409);
  return { sdp };
}

/**
 * Answer an inbound call with the browser's SDP answer.
 *
 * Every ringing agent can press Answer at once, so the call is claimed with a conditional
 * UPDATE first; the losers get a 409 and their ring is dismissed by the `updated` event.
 * `pre_accept` goes before `accept` as Meta recommends — it lets media start negotiating
 * so the first words are not clipped.
 */
export async function acceptCall(actor: Actor, callId: string, sdp: string): Promise<CallDto> {
  if (!actor.userId) throw new HttpError("Only a signed-in agent can answer a call", 403);
  const call = await findCallForActor(actor, callId);

  const claimed = await prisma.waCall.updateMany({
    where: {
      id: call.id,
      direction: WaCallDirection.USER_INITIATED,
      status: WaCallStatus.RINGING,
      answeredById: null,
    },
    data: { answeredById: actor.userId },
  });
  if (claimed.count === 0) throw new HttpError("This call was already answered or ended", 409);

  try {
    const settings = await requireSettings(actor.orgId, call.phoneId);
    const session = { sdp_type: "answer", sdp };
    await callsEndpoint(call.phoneId, settings.accessToken, {
      call_id: call.waCallId,
      action: "pre_accept",
      session,
    });
    await callsEndpoint(call.phoneId, settings.accessToken, {
      call_id: call.waCallId,
      action: "accept",
      session,
      biz_opaque_callback_data: call.id,
    });
  } catch (error) {
    // Hand the call back so another agent can still take it while it rings.
    await prisma.waCall.updateMany({
      where: { id: call.id, answeredById: actor.userId, status: WaCallStatus.RINGING },
      data: { answeredById: null },
    });
    throw error;
  }

  const answered = await prisma.waCall.update({
    where: { id: call.id },
    data: { status: WaCallStatus.ACCEPTED, answeredAt: new Date() },
    include: withContact,
  });
  await redis.del(offerKey(call.waCallId));
  await watchBrowser(call.id);
  await publish(answered, "updated");
  return toDto(answered);
}

export async function rejectCall(actor: Actor, callId: string): Promise<CallDto> {
  const call = await findCallForActor(actor, callId);
  if (call.direction !== WaCallDirection.USER_INITIATED || call.status !== WaCallStatus.RINGING) {
    throw new HttpError("This call is no longer ringing", 409);
  }
  const settings = await requireSettings(actor.orgId, call.phoneId);
  await callsEndpoint(call.phoneId, settings.accessToken, {
    call_id: call.waCallId,
    action: "reject",
  });
  const rejected = await prisma.waCall.update({
    where: { id: call.id },
    data: { status: WaCallStatus.REJECTED, answeredById: actor.userId ?? null },
    include: withContact,
  });
  await redis.del(offerKey(call.waCallId));
  await publish(rejected, "updated");
  return toDto(rejected);
}

/** Hang up. The row is finalised by the terminate webhook that follows, not here. */
export async function terminateCall(actor: Actor, callId: string): Promise<void> {
  const call = await findCallForActor(actor, callId);
  if (call.endedAt) return;
  const settings = await requireSettings(actor.orgId, call.phoneId);
  await terminateOnMeta(call, settings.accessToken);
}

/**
 * The browser holding the call is still there. Only that browser's agent may beat for it;
 * a beat for a call that no longer holds media is ignored, so a late one cannot revive it.
 */
export async function heartbeatCall(actor: Actor, callId: string): Promise<void> {
  const call = await findCallForActor(actor, callId);
  const holder =
    call.direction === WaCallDirection.BUSINESS_INITIATED ? call.initiatedById : call.answeredById;
  if (!actor.userId || holder !== actor.userId) throw new HttpError("Not your call", 403);
  if (holdsBrowserMedia(call)) await markCallAlive(call.id);
}

/** Start watching the browser that now holds this call's media. */
async function watchBrowser(callId: string) {
  try {
    await markCallAlive(callId);
    await armCallWatchdog(callId);
  } catch (error) {
    // The call itself is fine; only the abandoned-tab cleanup is lost.
    log.error({ err: error, callId }, "Could not arm the call watchdog");
  }
}

/**
 * Dial a customer. The browser has already built its peer connection and gathered ICE,
 * so `sdp` is a complete offer; the customer's answer comes back on the `connect` webhook
 * and is relayed to this agent alone as an `answer` event.
 */
export async function startCall(
  actor: Actor,
  input: { phoneId: string; contactId: string; sdp: string },
): Promise<CallDto> {
  if (!actor.userId) throw new HttpError("Only a signed-in agent can place a call", 403);
  const settings = await requireSettings(actor.orgId, input.phoneId);
  if (!(await actorReachesChannel(actor, settings.channelId))) {
    throw new HttpError("WhatsApp number not found", 404);
  }
  const contact = await getContactById(input.contactId, actor.orgId);
  if (!contact?.phone) throw new HttpError("This contact has no WhatsApp number", 400);

  const id = crypto.randomUUID();
  const data = await callsEndpoint(input.phoneId, settings.accessToken, {
    to: contact.phone,
    action: "connect",
    session: { sdp_type: "offer", sdp: input.sdp },
    biz_opaque_callback_data: id,
  });
  const waCallId: string | undefined = data?.calls?.[0]?.id;
  if (!waCallId) throw new Error("Meta accepted the call but returned no call id");

  const conversation = await getActiveConversationForContact(contact.id);
  const call = await prisma.waCall.create({
    data: {
      id,
      orgId: actor.orgId,
      waCallId,
      phoneId: input.phoneId,
      direction: WaCallDirection.BUSINESS_INITIATED,
      status: WaCallStatus.RINGING,
      customerWaId: contact.phone,
      contactId: contact.id,
      conversationId: conversation?.id ?? null,
      initiatedById: actor.userId,
    },
    include: withContact,
  });
  await storeAudience(call.id, [actor.userId]);
  await watchBrowser(call.id);
  return toDto(call);
}

// ---------------------------------------------------------------------------------------
// Call permissions (business-initiated calls only)
// ---------------------------------------------------------------------------------------

export interface CallPermissionState {
  /** `granted`/`temporary`/`no_permission`/… as Meta reports it. */
  status: string;
  expiresAt: string | null;
  canCall: boolean;
  canRequest: boolean;
}

interface MetaPermissionAction {
  action_name: string;
  can_perform_action: boolean;
}

export async function getCallPermission(
  actor: Actor,
  phoneId: string,
  contactId: string,
): Promise<CallPermissionState> {
  const settings = await requireSettings(actor.orgId, phoneId);
  const contact = await getContactById(contactId, actor.orgId);
  if (!contact?.phone) throw new HttpError("This contact has no WhatsApp number", 400);

  const res = await callMetaApi(
    `/${phoneId}/call_permissions`,
    "GET",
    settings.accessToken,
    undefined,
    {},
    {},
    { user_wa_id: contact.phone },
  );
  const permission = res.data?.permission ?? {};
  const actions: MetaPermissionAction[] = res.data?.actions ?? [];
  const can = (name: string) =>
    actions.find((a) => a.action_name === name)?.can_perform_action ?? false;
  return {
    status: String(permission.status ?? "no_permission"),
    expiresAt: permission.expiration_time
      ? new Date(Number(permission.expiration_time) * 1000).toISOString()
      : null,
    canCall: can("start_call"),
    canRequest: can("send_call_permission_request"),
  };
}

/**
 * Ask the customer for permission to call them. A free-form interactive message, so it only
 * delivers inside the 24 h service window — outside it Meta rejects it like any other
 * session message (a template with a call-permission button is the alternative there).
 * Sent through `sendMessage`, so it lands in the thread like an agent's reply.
 */
export async function requestCallPermission(
  actor: Actor,
  input: { phoneId: string; contactId: string; body: string; teamId?: string | null },
): Promise<void> {
  await requireSettings(actor.orgId, input.phoneId);
  const contact = await getContactById(input.contactId, actor.orgId);
  if (!contact?.phone) throw new HttpError("This contact has no WhatsApp number", 400);

  await sendMessage(
    actor.orgId,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: contact.phone,
      type: "interactive",
      interactive: {
        type: "call_permission_request",
        action: { name: "call_permission_request" },
        body: { text: input.body },
      },
    },
    undefined,
    actor.userId,
    input.phoneId,
    PlatformType.WHATSAPP,
    undefined,
    input.teamId ?? null,
    "INBOX",
  );
}

// ---------------------------------------------------------------------------------------
// Call settings (per number, stored by Meta)
// ---------------------------------------------------------------------------------------

export async function getCallSettings(orgId: string, phoneId: string) {
  const settings = await requireSettings(orgId, phoneId);
  const res = await callMetaApi(`/${phoneId}/settings`, "GET", settings.accessToken);
  return res.data?.calling ?? { status: "DISABLED" };
}

export async function updateCallSettings(
  orgId: string,
  phoneId: string,
  calling: Record<string, unknown>,
) {
  const settings = await requireSettings(orgId, phoneId);
  await callMetaApi(`/${phoneId}/settings`, "POST", settings.accessToken, { calling });
  return getCallSettings(orgId, phoneId);
}

// ---------------------------------------------------------------------------------------
// Webhook (`field: "calls"`)
// ---------------------------------------------------------------------------------------

type BusinessSettings = NonNullable<Awaited<ReturnType<typeof getWaSettingsByPhoneId>>>;

async function onIncomingCall(
  settings: BusinessSettings,
  value: CallWebhookValue,
  event: CallWebhookCall,
) {
  const orgId = settings.orgId;
  const customer = event.from;
  const name = value.contacts?.find((c) => c.wa_id === customer)?.profile?.name;

  const res = await getOrCreateContactByPhone(
    customer,
    orgId,
    { phone: customer, ...(name && { name }) },
    undefined,
    true,
  );
  const contact = res?.contact;
  // A call is customer activity like a message is: it belongs on their live ticket, or
  // opens one so a missed call has somewhere to be seen.
  const conversation = contact
    ? ((await getActiveConversationForContact(contact.id)) ??
      (await openConversationForContact(contact.id, orgId)))
    : null;

  let call: CallWithContact;
  try {
    call = await prisma.waCall.create({
      data: {
        orgId,
        waCallId: event.id,
        phoneId: value.metadata.phone_number_id,
        direction: WaCallDirection.USER_INITIATED,
        status: WaCallStatus.RINGING,
        customerWaId: customer,
        contactId: contact?.id ?? null,
        conversationId: conversation?.id ?? null,
      },
      include: withContact,
    });
  } catch (error) {
    // Meta redelivers webhooks; the unique waCallId makes a repeat a no-op instead of a
    // second ring.
    if ((error as { code?: string }).code === "P2002") return;
    throw error;
  }

  if (event.session?.sdp) {
    await redis.set(offerKey(event.id), event.session.sdp, "EX", OFFER_TTL_SECONDS);
  }
  const audience = await resolveRingAudience(orgId, call.phoneId, call.contactId);
  await storeAudience(call.id, audience);
  if (audience.length === 0) {
    log.warn({ orgId, callId: call.id }, "Incoming WhatsApp call has nobody to ring");
    return;
  }
  await publish(call, "incoming", audience);
}

/** The customer picked up an outbound call: hand their SDP answer to the dialling agent. */
async function onOutboundAnswered(event: CallWebhookCall) {
  const call = await prisma.waCall.findUnique({
    where: { waCallId: event.id },
    include: withContact,
  });
  if (!call?.initiatedById || !event.session?.sdp) return;
  await sendViaWstoOrgHandler(
    call.orgId,
    { type: "call", call: { event: "answer", call: toDto(call), sdp: event.session.sdp } },
    "main",
    [call.initiatedById],
  );
}

async function onCallStatus(status: CallWebhookStatus) {
  const call = await prisma.waCall.findUnique({ where: { waCallId: status.id } });
  if (!call || call.endedAt) return;

  const next =
    status.status === "ACCEPTED"
      ? WaCallStatus.ACCEPTED
      : status.status === "REJECTED"
        ? WaCallStatus.REJECTED
        : WaCallStatus.RINGING;
  const updated = await prisma.waCall.update({
    where: { id: call.id },
    data: {
      status: next,
      ...(next === WaCallStatus.ACCEPTED && {
        answeredAt: new Date(Number(status.timestamp) * 1000),
        answeredById: call.initiatedById,
      }),
    },
    include: withContact,
  });
  await publish(updated, "updated");
}

/** What a finished call is called, from what we saw of it. */
export function finalCallStatus(
  call: Pick<WaCall, "status" | "answeredAt">,
  webhookStatus: CallWebhookCall["status"],
): WaCallStatus {
  if (call.status === WaCallStatus.REJECTED) return WaCallStatus.REJECTED;
  if (call.answeredAt) {
    return webhookStatus === "FAILED" ? WaCallStatus.FAILED : WaCallStatus.COMPLETED;
  }
  return webhookStatus === "FAILED" ? WaCallStatus.FAILED : WaCallStatus.MISSED;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

/** The one-line thread text; clients that do not know `call` entries render only this. */
export function callSummary(
  call: Pick<WaCall, "direction" | "status" | "durationSeconds">,
): string {
  const outbound = call.direction === WaCallDirection.BUSINESS_INITIATED;
  switch (call.status) {
    case WaCallStatus.COMPLETED:
      return `${outbound ? "Outgoing" : "Incoming"} voice call · ${formatDuration(call.durationSeconds ?? 0)}`;
    case WaCallStatus.REJECTED:
      return outbound ? "Voice call declined by customer" : "Declined voice call";
    case WaCallStatus.FAILED:
      return `${outbound ? "Outgoing" : "Incoming"} voice call failed`;
    default:
      return outbound ? "Voice call not answered" : "Missed voice call";
  }
}

async function writeCallLog(call: WaCall): Promise<string | null> {
  if (!call.contactId) return null;
  const entry: CallLogEntry = {
    callId: call.id,
    direction: call.direction,
    status: call.status,
    durationSeconds: call.durationSeconds,
    answeredById: call.answeredById,
    initiatedById: call.initiatedById,
  };
  const summary = callSummary(call);
  const row = await prisma.waMessage.create({
    data: {
      contactId: call.contactId,
      conversationId: call.conversationId,
      sourcePlatform: PlatformType.INTERNAL,
      sourceIdentifier: "internal",
      sendBy: call.answeredById ?? call.initiatedById,
      waCreatedAt: call.endedAt ?? new Date(),
      messageBody: {
        exchangeProcess: "internal",
        internal: { text: { body: summary }, summary, triggeredByUser: null, call: entry },
      },
      sourceMessage: "inbox",
    },
  });
  return row.id;
}

async function onCallTerminated(value: CallWebhookValue, event: CallWebhookCall) {
  const call = await prisma.waCall.findUnique({ where: { waCallId: event.id } });
  if (!call) return;

  const status = finalCallStatus(call, event.status);
  const error = value.errors?.[0];
  const endedAt = event.end_time ? new Date(Number(event.end_time) * 1000) : new Date();
  // Conditional on endedAt so a redelivered terminate writes no second thread entry.
  const finished = await prisma.waCall.updateMany({
    where: { id: call.id, endedAt: null },
    data: {
      status,
      endedAt,
      durationSeconds: event.duration ?? null,
      ...(error && {
        errorCode: String(error.code),
        errorMessage: error.error_data?.details ?? error.message ?? null,
      }),
    },
  });
  if (finished.count === 0) return;
  await redis.del(offerKey(call.waCallId));

  const ended = await prisma.waCall.findUniqueOrThrow({
    where: { id: call.id },
    include: withContact,
  });
  try {
    const logMessageId = await writeCallLog(ended);
    if (logMessageId) {
      await prisma.waCall.update({ where: { id: call.id }, data: { logMessageId } });
    }
  } catch (err) {
    log.error({ err, callId: call.id }, "Could not write the call's thread entry");
  }
  await publish(ended, "ended");
}

export async function handleCallsWebhook(body: WaMessageBody): Promise<void> {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "calls") continue;
      const value = change.value as unknown as CallWebhookValue;
      const phoneId = value.metadata?.phone_number_id;
      const settings = phoneId ? await getWaSettingsByPhoneId(phoneId) : null;
      if (!settings) {
        log.error("WaSettings not found for call on phone_id: %s", phoneId);
        continue;
      }

      for (const event of value.calls ?? []) {
        try {
          if (event.event === "connect" && event.direction === "USER_INITIATED") {
            await onIncomingCall(settings, value, event);
          } else if (event.event === "connect") {
            await onOutboundAnswered(event);
          } else if (event.event === "terminate") {
            await onCallTerminated(value, event);
          }
        } catch (error) {
          log.error({ err: error, waCallId: event.id }, "Error handling call webhook");
        }
      }
      for (const status of value.statuses ?? []) {
        if (status.type !== "call") continue;
        try {
          await onCallStatus(status);
        } catch (error) {
          log.error({ err: error, waCallId: status.id }, "Error handling call status");
        }
      }
    }
  }
}

/** Meta: "Calling API not enabled" — calling is switched off on this number. */
export const CALLING_DISABLED_CODE = 138000;

/** True when Meta refused because calling is switched off for the number. */
export function isCallingDisabled(error: unknown): boolean {
  return error instanceof GraphApiError && error.error?.code === CALLING_DISABLED_CODE;
}

/** True when Meta refused a call because the customer has not granted permission. */
export function isMissingCallPermission(error: unknown): boolean {
  return error instanceof GraphApiError && error.error?.code === NO_CALL_PERMISSION_CODE;
}
