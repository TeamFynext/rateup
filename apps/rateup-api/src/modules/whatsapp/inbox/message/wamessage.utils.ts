import { PlatformType } from "../../../../../generated/prisma/enums.js";
import { WaReceiveMessageBody } from "../../../../types/whatsapp.types.js";
import { downloadAndUpload } from "../../whatsappSurvey/wasurvey.utils.js";
import dayjs from "dayjs";

export async function handleWaReceivedImages(
  messageBody: WaInboxMessageBody,
  orgId: string,
): Promise<WaInboxMessageBody> {
  if (
    messageBody?.exchangeProcess === "receive" &&
    (messageBody?.receive as WaReceiveMessageBody)?.messages[0]?.type === "image"
  ) {
    const uniqueImageId = await downloadAndUpload(
      orgId,
      (messageBody?.receive as WaReceiveMessageBody)?.messages[0]?.image?.id,
    );
    return {
      ...messageBody,
      receive: {
        ...messageBody.receive,
        messages: [
          {
            ...(messageBody.receive as WaReceiveMessageBody).messages[0],
            image: {
              ...(messageBody.receive as WaReceiveMessageBody).messages[0].image,
              link: uniqueImageId,
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
      return new Date(
        (messageBody.receive as IgReceiveMessageBody | FbReceiveMessageBody).timestamp,
      ).toISOString();
    }
    const unixTimeStamp = parseInt(
      (messageBody.receive as WaReceiveMessageBody).messages[0].timestamp,
    );
    const utcTimeStamp = dayjs.unix(unixTimeStamp).utc().format();
    return utcTimeStamp;
  }
  return dayjs().utc().format();
}

export const isSessionExpired = (userInitiatedFinalTimeStamp: Date) =>
  userInitiatedFinalTimeStamp && dayjs().diff(userInitiatedFinalTimeStamp, "D") >= 1;

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
export function deriveConversationSubject(messageBody: WaInboxMessageBody): string | null {
  if (messageBody?.exchangeProcess !== "receive") return null;
  const receive: any = messageBody?.receive;
  if (!receive) return null;

  // WhatsApp nests the message in `messages[]`; Instagram and Facebook deliver a
  // single `message` on the messaging event itself.
  const message: any = (receive as WaReceiveMessageBody)?.messages?.[0] ?? receive.message;
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
  return MESSAGE_TYPE_LABEL[type] ?? null;
}

export function extractMentions(text: string): string[] {
  return text.match(/(?<!\S)@[a-zA-Z0-9_.]+/g)?.map((mention) => mention.slice(1)) ?? [];
}
