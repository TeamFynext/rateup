import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { OrderContent } from "@/components/whatsapp/inbox/chatdisplay/chatdisplayBody/components/order";
import type { WaTemplateDefaultValues } from "@/components/whatsapp/templates/Schema/templateSchema.ts";
import type { WaMessageAssignStatus } from "@/types/enums.ts";
import { MessagePlatform, WaTemplateComponentTypeUpperCase } from "@/types/enums.ts";
import type {
  IgReceiveMessageBody,
  IgSendMessageBody,
  WaReceiveMessageBody,
  WaSendMessageBody,
  WaTemplateComponent,
  WaTemplateFetchBody,
  WaTemplateFetchBodyComponent,
} from "@/types/global";

import { WaMessageClosedStatus } from "../constants.ts";

dayjs.extend(utc);

/** The channel a conversation ran on, and which connected account it ran through. */
export interface ContactChannelSource {
  platform: MessagePlatform;
  /**
   * The connected account the messages went to: a WhatsApp number, an Instagram
   * account id or a Facebook page id. Null for webchat, for internal-only rows,
   * and for legacy messages written before the identifier was recorded.
   */
  identifier: string | null;
}

interface ChannelSourceMessage {
  sourcePlatform?: MessagePlatform | string | null;
  sourceIdentifier?: string | null;
}

/**
 * Resolve the channel (WhatsApp / Instagram / Facebook / Webchat) a conversation
 * lives on, together with the account it came in on. `lastMessage.sourcePlatform`
 * alone is unreliable: the last message can be an INTERNAL note (private or
 * system message), whose `sourcePlatform` is "INTERNAL" — not the real channel —
 * and "INTERNAL" is truthy so a plain `|| WHATSAPP` fallback never fires. Resolve
 * in order of confidence:
 *   1. the last message, when it is a real channel message
 *   2. the most recent non-internal message the row already carries
 *   3. the contact's channel identity (igsId → Instagram, psid → Facebook)
 *   4. WhatsApp as the default
 *
 * The identifier is read off the *same* message that settled the platform, so the
 * pair always describes one real send — never a WhatsApp number paired with an
 * Instagram thread. Steps 3 and 4 are guesses about the platform only and carry
 * no identifier.
 */
export function getContactChannelSource(
  contact?: {
    lastMessage?: ChannelSourceMessage | null;
    messages?: Array<ChannelSourceMessage | null | undefined> | null;
    igsId?: string | null;
    psid?: string | null;
  } | null,
): ContactChannelSource {
  const asChannel = (p?: MessagePlatform | string | null): MessagePlatform | undefined =>
    p && p !== "INTERNAL" ? (p as MessagePlatform) : undefined;

  const fromMessage = (m?: ChannelSourceMessage | null): ContactChannelSource | undefined => {
    const platform = asChannel(m?.sourcePlatform);
    return platform ? { platform, identifier: m?.sourceIdentifier || null } : undefined;
  };

  return (
    fromMessage(contact?.lastMessage) ??
    fromMessage(contact?.messages?.find((m) => asChannel(m?.sourcePlatform))) ?? {
      platform: contact?.igsId
        ? MessagePlatform.INSTAGRAM
        : contact?.psid
          ? MessagePlatform.FACEBOOK
          : MessagePlatform.WHATSAPP,
      identifier: null,
    }
  );
}

/** The channel a conversation lives on. See {@link getContactChannelSource}. */
export function getContactPlatform(
  contact?: Parameters<typeof getContactChannelSource>[0],
): MessagePlatform {
  return getContactChannelSource(contact).platform;
}

/**
 * The phone number to show for a contact.
 *
 * A webchat visitor types their number into the widget and it is stored on
 * `other`, not on `phone` — the org has no WhatsApp thread with that number, and
 * `phone` is the key the WhatsApp pipeline is unique on, so webchat deliberately
 * leaves it null. Without this the inbox shows a webchat ticket with no number at
 * all, even though the visitor gave one.
 *
 * Scoped to webchat on purpose: Messenger writes its PSID to the same `other`
 * column, and a raw PSID rendered as a phone number is worse than nothing.
 *
 * For display only. Anything that *sends* — templates, flows, block/unblock —
 * must keep using `phone`, since a webchat number is not a reachable WhatsApp
 * thread.
 */
export function getContactDisplayPhone(
  contact?:
    | (Parameters<typeof getContactChannelSource>[0] & {
        phone?: string | null;
        other?: string | null;
      })
    | null,
): string | undefined {
  if (contact?.phone) return contact.phone;
  if (getContactPlatform(contact) === MessagePlatform.WEBCHAT) return contact?.other || undefined;
  return undefined;
}

/**
 * A parsed message body. Which member applies follows `messageType`: the media
 * and text kinds are strings (media pack `link_caption_caption`), and the
 * structured kinds keep the shape their renderer expects.
 */
export type ParsedWaMessageContent =
  | string
  | { text?: string; commentId?: string; mediaId?: string; permalink?: string }
  | {
      attachments: Array<{
        content: string;
        type: NonNullable<NonNullable<IgReceiveMessageBody["message"]>["attachments"]>[0]["type"];
      }>;
      text?: string;
    }
  | WaSendMessageBody["contacts"]
  | WaSendMessageBody["location"]
  | OrderContent;

export interface ParsedWaMessageReturn {
  timeStamp: string;
  messageType: string;
  messageContent: ParsedWaMessageContent;
  template?: WaTemplateFetchBody;
  interactive?: WaSendMessageBody["interactive"];
}
/** The attachments body carries a list of media entries. */
function isAttachmentContent(
  content: ParsedWaMessageContent,
): content is { attachments: Array<{ content: string; type: string }>; text?: string } {
  return typeof content === "object" && content !== null && "attachments" in content;
}

/** The Instagram comment body carries the comment's text and ids. */
function isCommentContent(
  content: ParsedWaMessageContent,
): content is { text?: string; commentId?: string; mediaId?: string } {
  return typeof content === "object" && content !== null && "commentId" in content;
}

interface EventPerson {
  id: string;
  name: string;
}

/** "Sara", "Sara and Leo", "Sara, Leo and Ana". */
function joinNames(people: EventPerson[]): string {
  if (people.length <= 1) return people[0]?.name ?? "";
  const last = people[people.length - 1].name;
  return `${people
    .slice(0, -1)
    .map((p) => p.name)
    .join(", ")} and ${last}`;
}

/**
 * The sentence an assignment event is saved with, for the optimistic copy shown before the
 * server's row arrives. Mirrors the user-actor branches of `internalEventSentence` in
 * rateup-api; keep the two in step.
 */
export function assignEventSentence(
  actor: EventPerson,
  status: string,
  added: EventPerson[],
  removed: EventPerson[] = [],
): string {
  const who = actor.name;
  const selfOnly = (people: EventPerson[]) => people.length === 1 && people[0].id === actor.id;

  if (status === "REASSIGNED" && added.length && removed.length) {
    return `${who} moved this chat from ${joinNames(removed)} to ${joinNames(added)}`;
  }
  if (added.length) {
    return selfOnly(added)
      ? `${who} took this chat`
      : `${who} assigned this chat to ${joinNames(added)}`;
  }
  if (removed.length) {
    return selfOnly(removed)
      ? `${who} left this chat`
      : `${who} removed ${joinNames(removed)} from this chat`;
  }
  return `${who} assigned this chat`;
}

export function parseWaMessage(message: Partial<WaGetMessagesBody>): ParsedWaMessageReturn {
  const { messageBody, waCreatedAt } = message;

  let timeStamp: string = waCreatedAt ?? new Date().toLocaleTimeString();
  let messageType = "text";
  let messageContent: ParsedWaMessageContent = "No messages yet";
  let template: WaTemplateFetchBody = {} as WaTemplateFetchBody;
  let interactive: WaSendMessageBody["interactive"] = {} as WaSendMessageBody["interactive"];
  if (
    message.sourcePlatform === MessagePlatform.INSTAGRAM ||
    message.sourcePlatform === MessagePlatform.FACEBOOK
  ) {
    if (messageBody?.exchangeProcess === "send") {
      const { send } = messageBody as { send: IgSendMessageBody };
      const { message, sender_action, payload } = send;
      if (message) {
        if (message.attachment) {
          messageContent =
            message.attachment.payload?.id ||
            message.attachment.payload?.url ||
            message.attachment.payload?.attachment_id;

          messageType = message.attachment.type;
        } else if (message.text) {
          messageType = "text";
          messageContent = message.text;
        }
      } else if (sender_action && sender_action === "react") {
        messageType = "reaction";
        messageContent = payload?.emoji || payload?.reaction;
      }
    }
    if (messageBody?.exchangeProcess === "receive") {
      const { receive } = messageBody as { receive: IgReceiveMessageBody };
      if (receive.message) {
        if (receive.message.comment_id || receive.message.mid?.startsWith("ig_comment_")) {
          messageType = "ig_comment";
          messageContent = {
            text: receive.message.text,
            commentId: receive.message.comment_id,
            mediaId: receive.message.media_id,
            permalink: receive.message.media_permalink,
          };
        } else if (receive.message.attachments) {
          messageContent = {
            attachments: receive.message.attachments.map((r) => ({
              content: r.payload ? r.payload.url : "",
              type: r.type,
            })),
            text: receive.message.text,
          };
          messageType = "attachments";
        } else if (receive.message.text) {
          messageContent = receive.message.text;
          messageType = "text";
        } else if (receive.message.quick_reply) {
          messageContent = receive.message.quick_reply.payload;
          messageType = "quickreply";
        }
      } else if (receive.reaction && receive.reaction.action === "react") {
        messageContent = receive.reaction.emoji || receive.reaction.reaction;
        messageType = "reaction";
      }
    }
  } else {
    if (messageBody?.exchangeProcess === "send") {
      const { send } = messageBody as { send: WaSendMessageBody };
      messageType = send.type;
      switch (messageType) {
        case "text":
          messageContent = send?.text?.body;
          break;
        case "image":
          messageContent = `${send?.image?.link}_caption_${send?.image?.caption ?? ""}`;
          break;
        case "video":
          messageContent = `${send?.video?.link}_caption_${send?.video?.caption ?? ""}`;
          break;
        case "audio":
          messageContent = `${send?.audio?.link}`;
          break;
        case "template":
          messageContent = send.template?.name ?? "";
          template = send.template!;
          break;
        case "interactive":
          messageContent = "";
          interactive = send.interactive;
          break;
        case "reaction":
          messageContent = send.reaction!.emoji;
          break;
        case "document":
          messageContent = `${send?.document!.link}_caption_${send?.document!.filename}_caption_${send?.document!.caption ?? ""}`;
          break;
        case "contacts":
          messageContent = [...send.contacts!];
          break;
        case "location":
          messageContent = { ...send.location! };
          break;
      }
    }
    if (messageBody?.exchangeProcess === "receive") {
      const { receive } = messageBody as { receive: WaReceiveMessageBody };
      // The `type` discriminant guarantees its matching payload field is set.
      const inbound = receive.messages[0]!;
      timeStamp = inbound.timestamp;
      messageType = inbound.type;
      switch (messageType) {
        case "text":
          messageContent = inbound.text!.body;
          break;
        case "image":
          messageContent = `${inbound.image?.link}_caption_${inbound.image?.caption ?? ""}`;
          break;
        case "button":
          messageContent = inbound.button!.text;
          break;
        case "audio":
          messageContent = `${inbound.audio?.id}_caption_${inbound.audio?.caption ?? ""}`;
          break;
        case "video":
          messageContent = `${inbound.video?.id}_caption_${inbound.video?.caption ?? ""}`;
          break;
        case "document":
          messageContent = `${inbound.document!.id}_caption_${inbound.document!.filename}_caption_${inbound.document!.caption ?? ""}`;
          break;
        case "interactive":
          switch (inbound.interactive!.type) {
            case "button_reply":
              messageContent = inbound.interactive!.button_reply.title;
              break;
            case "list_reply":
              messageContent = inbound.interactive!.list_reply.title;
              break;
            case "nfm_reply":
              messageContent = inbound.interactive!.nfm_reply.name;
              break;
          }
          break;
        case "reaction":
          messageContent = inbound.reaction!.emoji;
          break;
        case "contacts":
          messageContent = [...inbound.contacts!];
          break;
        case "location":
          messageContent = { ...inbound.location! };
          break;
        case "order":
          messageContent = { ...inbound.order! };
          break;
      }
    }
    if (messageBody?.exchangeProcess === "internal") {
      const { internal } = messageBody;
      if (internal?.summary) {
        messageContent = internal.summary;
      } else {
        // Rows written before the server composed the sentence: the actor is still glued on
        // here, and where it goes depends on how the fragment was phrased.
        const isClosedType = WaMessageClosedStatus.includes(
          internal?.assignStatus as WaMessageAssignStatus,
        );
        const actor = internal?.triggeredByUser?.name;
        messageContent = isClosedType
          ? `${actor} ${internal!.text.body}`
          : internal!.text.body === `Chat assigned to ${actor}`
            ? `${actor} took this chat`
            : `${internal!.text.body} by ${actor}`;
      }
    }
    if (messageBody?.exchangeProcess === "privateNote") {
      const { privateNote } = messageBody;
      messageContent = `${privateNote!.text.body}`;
    }
  }

  return {
    timeStamp,
    messageType,
    messageContent,
    template,
    interactive,
  };
}

/** One-line preview of a message, for the chat list and notifications. */
export function returnMessageContentBasedOnParsedMessage(
  parsedMessage: ParsedWaMessageReturn,
  exchangeProcess: "send" | "receive" | "internal" | "privateNote",
): string {
  if (parsedMessage.messageType === "text") {
    return typeof parsedMessage.messageContent === "string" ? parsedMessage.messageContent : "";
  } else if (parsedMessage.messageType === "image") {
    return "Image";
  } else if (parsedMessage.messageType === "video") {
    return "Video";
  } else if (parsedMessage.messageType === "audio") {
    return "Audio";
  } else if (parsedMessage.messageType === "document") {
    return "Document";
  } else if (parsedMessage.messageType === "location") {
    return "Location";
  } else if (parsedMessage.messageType === "contacts") {
    return "Contact";
  } else if (parsedMessage.messageType === "sticker") {
    return "Sticker";
  } else if (parsedMessage.messageType === "voice") {
    return "Voice";
  } else if (parsedMessage.messageType === "gif") {
    return "GIF";
  } else if (parsedMessage.messageType === "template") {
    return "Template";
  } else if (parsedMessage.messageType === "button") {
    return typeof parsedMessage.messageContent === "string" ? parsedMessage.messageContent : "";
  } else if (parsedMessage.messageType === "interactive") {
    return "Interactive Message";
  } else if (parsedMessage.messageType === "reaction") {
    return exchangeProcess === "send"
      ? parsedMessage.messageContent === "love"
        ? "You Liked a message"
        : `You reacted ${parsedMessage.messageContent}`
      : parsedMessage.messageContent === "love"
        ? "Liked a message"
        : `Reacted ${parsedMessage.messageContent}`;
  } else if (parsedMessage.messageType === "attachments") {
    const attachments = isAttachmentContent(parsedMessage.messageContent)
      ? parsedMessage.messageContent.attachments
      : [];
    return attachments.at(-1)?.type ?? "Attachment";
  } else if (parsedMessage.messageType === "ig_comment") {
    return isCommentContent(parsedMessage.messageContent)
      ? (parsedMessage.messageContent.text ?? "Comment")
      : "Comment";
  } else {
    return "Unsupported message type";
  }
}

/**
 * Unread messages on an assigned chat are the assignees' business: anyone else
 * sees no count. An unassigned chat shows everyone their own count, as before.
 *
 * Gated here rather than in the list query so the per-user count is still on
 * the row — unassigning, or being assigned, shows the real figure straight away
 * instead of a zero that waits for the next fetch.
 */
export function getVisibleUnreadCount(
  contact: { unReadMessageCount?: number; assignedUsers?: { id: string }[] } | null | undefined,
  userId: string | null | undefined,
) {
  const count = contact?.unReadMessageCount ?? 0;
  const assignees = contact?.assignedUsers ?? [];
  if (!count || assignees.length === 0) return count;
  return assignees.some((assignee) => assignee.id === userId) ? count : 0;
}

export function isInboxSessionExpired(timeStamp?: string) {
  if (!timeStamp) return true;
  const currentTime = dayjs().utc();
  const givenTime = dayjs(timeStamp).utc();
  const diffInHours = currentTime.diff(givenTime, "hours");
  return diffInHours >= 24;
}

export function validateInboxTemplateSending(
  createTemplateComponents: WaTemplateFetchBodyComponent[],
  sendTemplateComponents: WaTemplateComponent[],
  defaultValues: WaTemplateDefaultValues,
) {
  return createTemplateComponents?.map((componentC) => {
    switch (componentC.type) {
      case "HEADER":
        const sendHeaderComponent = sendTemplateComponents.find(
          (componentS) => componentS.type === "header",
        );
        switch (componentC.format) {
          case "IMAGE":
            const hasDefaultImage = !!defaultValues?.image?.link;
            const hasSelectedImage = !!sendHeaderComponent?.parameters[0]?.image?.link;
            return hasDefaultImage || hasSelectedImage;
          case "VIDEO":
          case "DOCUMENT":
            const hasDefaultFile = !!createTemplateComponents.find(
              (data) => data.type === WaTemplateComponentTypeUpperCase.HEADER,
            )?.example?.header_handle?.[0];
            // "VIDEO" | "DOCUMENT" lowercased — the media key on the parameter.
            const mediaKey = componentC.format.toLowerCase() as "video" | "document";
            const hasSelectedFile = !!sendHeaderComponent?.parameters[0]?.[mediaKey]?.link;
            return hasDefaultFile || hasSelectedFile;
          case "LOCATION":
            if (!sendHeaderComponent) return false;
            if (
              sendHeaderComponent?.parameters[0]?.location?.latitude &&
              sendHeaderComponent?.parameters[0]?.location?.longitude &&
              sendHeaderComponent?.parameters[0]?.location?.name &&
              sendHeaderComponent?.parameters[0]?.location?.address
            )
              return true;
            else return false;
          default:
            return true;
        }
      default:
        return true;
    }
  });
}

/**
 * Whether a sent message was written by the Meta Business Agent (Meta AI). Meta
 * tags the agent's replies with `biz_opaque_callback_data` of
 * `{"originator":"bizai",…}`, and the API stores the echo as it arrived, so the
 * tag is on the stored body.
 */
export function isMetaAiMessage(message: Pick<WaGetMessagesBody, "messageBody">): boolean {
  const send = message.messageBody?.send;
  const tag = send && "biz_opaque_callback_data" in send ? send.biz_opaque_callback_data : null;
  if (typeof tag !== "string" || !tag) return false;
  try {
    const parsed: unknown = JSON.parse(tag);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "originator" in parsed &&
      parsed.originator === "bizai"
    );
  } catch {
    return false;
  }
}

/** The row fields the inbox list sorts on. */
interface SortableInboxRow {
  conversationLastMessageAt?: string | null;
  conversationLastCustomerMessageAt?: string | null;
  lastReceivedMessageTimeStamp?: string | null;
}

/**
 * The time a row sorts on under the list's `sortBy` (read from its filter key). Mirrors the
 * ORDER BY in `filterChats` (rateup-api): `*_wa_created` is the customer's last message, the
 * rest the ticket's last activity in either direction.
 */
export function inboxRowSortTime(row: SortableInboxRow | undefined, filterKey: string): number {
  const stamp = filterKey.includes("_wa_created")
    ? (row?.conversationLastCustomerMessageAt ??
      row?.conversationLastMessageAt ??
      row?.lastReceivedMessageTimeStamp)
    : (row?.conversationLastMessageAt ?? row?.lastReceivedMessageTimeStamp);
  return stamp ? new Date(stamp).getTime() : 0;
}

/** Newest first unless the key asks for oldest; undated rows go last either way, as NULLS LAST does. */
export const compareInboxRowTimes =
  (filterKey: string) =>
  (a: { time: number }, b: { time: number }): number => {
    if (!a.time || !b.time) return (b.time ? 1 : 0) - (a.time ? 1 : 0);
    return filterKey.includes("sortBy:oldest") ? a.time - b.time : b.time - a.time;
  };
