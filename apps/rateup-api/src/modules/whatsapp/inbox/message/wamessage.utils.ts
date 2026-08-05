import { PlatformType } from "../../../../../generated/prisma/enums.js";
import { WaReceiveMessageBody } from "../../../../types/whatsapp.types.js";
import { downloadAndUpload } from "../../whatsappSurvey/wasurvey.utils.js";
import { log } from "../../../../utils/logger.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

// returnAppropriateTimeStamp calls dayjs().utc() and dayjs.unix().utc(). This module
// used to rely on survey.service.ts / response.service.ts / flow.service.ts having
// extended the plugin first; in isolation it threw "utc is not a function".
dayjs.extend(utc);

export async function handleWaReceivedImages(
  messageBody: WaInboxMessageBody,
  orgId: string,
): Promise<WaInboxMessageBody> {
  const incomingImageId = (messageBody?.receive as WaReceiveMessageBody)?.messages[0]?.image?.id;
  if (
    messageBody?.exchangeProcess === "receive" &&
    (messageBody?.receive as WaReceiveMessageBody)?.messages[0]?.type === "image" &&
    incomingImageId
  ) {
    const uniqueImageId = await downloadAndUpload(orgId, incomingImageId);
    return {
      ...messageBody,
      receive: {
        ...(messageBody.receive as WaReceiveMessageBody),
        messages: [
          {
            ...(messageBody.receive as WaReceiveMessageBody).messages[0],
            image: {
              ...(messageBody.receive as WaReceiveMessageBody).messages[0].image,
              link: uniqueImageId ?? undefined,
            },
          },
        ],
      },
    };
  }
  return messageBody;
}

export async function returnAppropriateTimeStamp(
  messageBody: WaInboxMessageBody,
  platform: PlatformType,
) {
  if (messageBody.exchangeProcess === "receive") {
    if (platform === PlatformType.INSTAGRAM || platform === PlatformType.FACEBOOK) {
      const timestamp = (messageBody.receive as IgReceiveMessageBody | FbReceiveMessageBody)
        .timestamp;
      const parsed = dayjs(timestamp);
      // A malformed or missing timestamp used to throw RangeError out of here
      // (new Date(NaN).toISOString()), and the Instagram comment handler
      // swallowed it — the message was lost while the webhook still answered
      // 200. dayjs reports the same input as invalid instead of throwing, so it
      // lands with the time we received it rather than not landing at all.
      if (!parsed.isValid()) {
        log.warn({ timestamp, platform }, "Unusable message timestamp; falling back to now");
        return dayjs().toISOString();
      }
      // toISOString(), not .utc().format(): the stored format is the
      // millisecond-precision Zulu string every other reader already expects.
      return parsed.toISOString();
    }
    const unixTimeStamp = parseInt(
      (messageBody.receive as WaReceiveMessageBody).messages[0].timestamp,
    );
    const utcTimeStamp = dayjs.unix(unixTimeStamp).utc().format();
    return utcTimeStamp;
  }
  return dayjs().utc().format();
}

// "day", not "D": dayjs normalises "D" to "date", a unit its diff() has no case for, so
// the result fell through to raw milliseconds and anything older than 1ms read as expired.
export const isSessionExpired = (userInitiatedFinalTimeStamp: Date) =>
  userInitiatedFinalTimeStamp && dayjs().diff(userInitiatedFinalTimeStamp, "day") >= 1;

/** How long an auto-generated ticket title may get before it is cut short. */
const SUBJECT_MAX_LENGTH = 60;

/** Media and other non-text messages have no words to title a ticket with. */
const MESSAGE_TYPE_LABEL: Record<string, string> = {
  image: "Photo",
  video: "Video",
  audio: "Voice message",
  voice: "Voice message",
  document: "Document",
  file: "Document",
  sticker: "Sticker",
  share: "Shared post",
  reel: "Reel",
  ig_reel: "Reel",
  story_mention: "Story mention",
  location: "Location",
  contacts: "Contact",
  order: "Order",
  template: "Template message",
};

/** Collapse whitespace and cut on a word boundary, so titles never end mid-word. */
function toTitle(raw?: string | null): string | null {
  const text = raw?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= SUBJECT_MAX_LENGTH) return text;
  const cut = text.slice(0, SUBJECT_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * A ticket title taken from the customer message that opened it.
 *
 * The first thing the customer says is the best one-line description of what the
 * ticket is about, so the message names it. Only inbound messages qualify: an
 * agent's or automation's opener ("Agent is connected now") describes us, not the
 * request. A ticket that starts outbound simply stays untitled until the customer
 * replies, and an agent can rename it at any point — this only fills a blank.
 *
 * Interactive replies use the button/list title the customer picked; media falls
 * back to its caption and then to a plain type label, since "Photo" says more
 * than an empty title.
 */
/**
 * A received message as any of the three platforms delivers it. Field shapes differ
 * between them (`text` is a string on Meta's messenger platforms, an object on
 * WhatsApp), so the readers below narrow per field.
 */
interface InboundMessageEnvelope {
  messages?: InboundMessage[];
  message?: InboundMessage;
}

interface InboundMessage {
  type?: string;
  text?: string | { body?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
    nfm_reply?: { name?: string };
  };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  audio?: { caption?: string };
  button?: { text?: string };
  location?: { name?: string; address?: string };
  order?: { text?: string };
  attachments?: Array<{ type?: string }>;
  [field: string]: unknown;
}

export function deriveConversationSubject(messageBody: WaInboxMessageBody): string | null {
  if (messageBody?.exchangeProcess !== "receive") return null;
  const receive = messageBody?.receive as InboundMessageEnvelope | undefined;
  if (!receive) return null;

  // WhatsApp nests the message in `messages[]`; Instagram and Facebook deliver a
  // single `message` on the messaging event itself.
  const message = receive.messages?.[0] ?? receive.message;
  if (!message) return null;

  const interactive = message.interactive;
  const fromContent =
    // `text` is a string on Instagram/Facebook and an object on WhatsApp.
    (typeof message.text === "string" ? message.text : message.text?.body) ??
    message.image?.caption ??
    message.video?.caption ??
    message.document?.caption ??
    interactive?.button_reply?.title ??
    interactive?.list_reply?.title ??
    interactive?.nfm_reply?.name ??
    message.location?.name ??
    message.location?.address ??
    message.order?.text ??
    message.button?.text;

  const title = toTitle(fromContent);
  if (title) return title;
  // Instagram/Facebook name the media kind on the attachment instead of the message.
  const type = message.type ?? message.attachments?.[0]?.type;
  return (type ? MESSAGE_TYPE_LABEL[type] : undefined) ?? null;
}

export function extractMentions(text: string): string[] {
  return text.match(/(?<!\S)@[a-zA-Z0-9_.]+/g)?.map((mention) => mention.slice(1)) ?? [];
}
