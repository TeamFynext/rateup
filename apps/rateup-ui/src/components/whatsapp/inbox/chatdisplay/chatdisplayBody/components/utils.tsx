import { IconBrandWhatsapp } from "@tabler/icons-react";
import { Image } from "@unpic/react";
import { Ban, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { parseJsonToReact } from "@/components/RichTextEditor/wa-editor/format.tsx";
import type { TiptapNode } from "@/components/RichTextEditor/wa-editor/format.tsx";
import { Bubble, BubbleContent } from "@/components/ui/bubble.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker.tsx";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message.tsx";
import { useUser } from "@/context/UserContext.tsx";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { MessagePlatform } from "@/types/enums.ts";
import type {
  IgReceiveMessageBody,
  IgSendMessageBody,
  WaReceiveMessageBody,
  WaSendMessageBody,
} from "@/types/global";
import { formatDate, formatToCustomTime } from "@/utils/dateTime.ts";
import type { ParsedWaMessageContent } from "@/utils/whatsapp/inbox.ts";
import { parseWaMessage } from "@/utils/whatsapp/inbox.ts";

import { reactionEmojiMap } from "../layout/singleMessageLayout/index.tsx";
import WaInboxAttachments from "./attachments/index.tsx";
import WaInboxAudio from "./audio/index.tsx";
import WaInboxContact from "./contact/index.tsx";
import WaInboxDocument from "./document/index.tsx";
import WaInboxImage from "./image/index.tsx";
import WaInboxInteractive from "./interactive/index.tsx";
import WaInboxLocation from "./location/index.tsx";
import type { OrderContent } from "./order";
import WaInboxOrder from "./order/index.tsx";
import WaInboxTemplate from "./template/index.tsx";
import WaInboxText from "./text/index.tsx";
import WaInboxVideo from "./video/index.tsx";

const IgCommentBubble = ({
  messageContent,
}: {
  messageContent: { text?: string; commentId?: string; mediaId?: string };
}) => {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-foreground p-2 bg-muted rounded-[10px] w-fit">
        Commented on your post
      </span>
      {messageContent.text ? <WaInboxText messageContent={messageContent.text} /> : null}
    </div>
  );
};

/**
 * `messageType` decides which member of `ParsedWaMessageContent` the parser
 * produced, but the two are separate values — these read the content in the
 * shape each renderer needs, and fall back to an empty one if a message ever
 * arrives with a body that does not match its type.
 */
const asText = (content: ParsedWaMessageContent): string =>
  typeof content === "string" ? content : "";

const asRecord = (content: ParsedWaMessageContent): Record<string, unknown> =>
  typeof content === "object" && content !== null && !Array.isArray(content)
    ? (content as Record<string, unknown>)
    : {};

const asComment = (content: ParsedWaMessageContent) =>
  asRecord(content) as { text?: string; commentId?: string; mediaId?: string };

const asAttachments = (content: ParsedWaMessageContent) => {
  const record = asRecord(content);
  return Array.isArray(record.attachments)
    ? (record as Parameters<typeof WaInboxAttachments>[0]["messageContent"])
    : { attachments: [] };
};

const asContacts = (content: ParsedWaMessageContent): WaSendMessageBody["contacts"] =>
  Array.isArray(content) ? content : [];

const asLocation = (content: ParsedWaMessageContent): WaSendMessageBody["location"] =>
  asRecord(content) as WaSendMessageBody["location"];

const asOrder = (content: ParsedWaMessageContent): OrderContent => {
  const record = asRecord(content);
  return {
    text: typeof record.text === "string" ? record.text : undefined,
    catalog_id: typeof record.catalog_id === "string" ? record.catalog_id : "",
    product_items: Array.isArray(record.product_items) ? record.product_items : [],
  };
};

export const SingleMessage = ({ message }: { message: WaGetMessagesBody }) => {
  const { t: translations } = useTranslation();
  const { messageContent, messageType, template, interactive, timeStamp } = parseWaMessage(message);
  switch (messageType) {
    case "text":
    case "quickreply":
      return <WaInboxText messageContent={asText(messageContent)} />;
    case "ig_comment":
      return <IgCommentBubble messageContent={asComment(messageContent)} />;
    case "image":
      return <WaInboxImage messageContent={asText(messageContent)} />;
    case "button":
      return <WaInboxText messageContent={asText(messageContent)} />;
    case "template":
      return (
        <WaInboxTemplate templateBody={template!} parameters={message.templateComponentParams} />
      );
    case "interactive":
      return (
        <WaInboxInteractive interactiveBody={interactive} messageContent={asText(messageContent)} />
      );
    case "audio":
      return <WaInboxAudio messageContent={asText(messageContent)} />;
    case "video":
      return <WaInboxVideo messageContent={asText(messageContent)} />;
    case "document":
    case "file":
      return <WaInboxDocument messageContent={asText(messageContent)} />;
    case "contacts":
      return <WaInboxContact messageContent={asContacts(messageContent)} />;
    case "location":
      return <WaInboxLocation messageContent={asLocation(messageContent)} />;
    case "attachments":
      return <WaInboxAttachments messageContent={asAttachments(messageContent)} />;
    case "order":
      return <WaInboxOrder messageContent={asOrder(messageContent)} timestamp={timeStamp} />;
    default:
      return (
        <span className="text-xs text-red-500 font-medium">
          {messageType} {translations("message type display is not supported yet")}
        </span>
      );
  }
};

/**
 * Stand-in for a message its sender deleted on WhatsApp. The original body is
 * still stored — it is deliberately not rendered here, the same way WhatsApp
 * itself shows the message as gone while the row stays in the thread.
 */
export const DeletedMessage = () => {
  const { t: translations } = useTranslation();
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground italic">
      <Ban className="size-3.5 shrink-0" />
      {translations("This message was deleted")}
    </span>
  );
};

export function getReactionMessage({
  message,
  allMessages,
  selectedContact,
}: {
  message: WaGetMessagesBody;
  allMessages: WaGetMessagesBody[];
  selectedContact: ContactWithUpdatedAt;
}) {
  const exchangeProcess = message?.messageBody?.exchangeProcess;
  const isInsta =
    message?.sourcePlatform == MessagePlatform.INSTAGRAM ||
    message?.sourcePlatform == MessagePlatform.WEBCHAT ||
    message?.sourcePlatform == MessagePlatform.FACEBOOK;
  if (!exchangeProcess) return null;
  const wa_id =
    exchangeProcess === "send" || isInsta
      ? message?.messageId
      : (message.messageBody.receive as WaReceiveMessageBody)?.messages[0].id;
  const reactionMsg = allMessages?.find((msg) => {
    const { messageType } = parseWaMessage(msg);
    if (messageType === "reaction") {
      const reactedMessageId =
        msg.messageBody.exchangeProcess === "receive"
          ? !isInsta
            ? (msg.messageBody.receive as WaReceiveMessageBody).messages[0]!.reaction?.message_id
            : (msg.messageBody.receive as IgReceiveMessageBody)!.reaction!.mid
          : !isInsta
            ? (msg.messageBody.send as WaSendMessageBody).reaction?.message_id
            : (msg.messageBody.send as IgSendMessageBody).payload!.message_id;
      return wa_id === reactedMessageId;
    }
    return false;
  });

  const isSendReactionMsg = reactionMsg && reactionMsg.messageBody.exchangeProcess === "send";
  if (reactionMsg)
    return {
      emoji: isSendReactionMsg
        ? !isInsta
          ? (reactionMsg.messageBody.send as WaSendMessageBody).reaction!.emoji
          : ((reactionMsg.messageBody.send as IgSendMessageBody).payload!.emoji ??
            reactionEmojiMap((reactionMsg.messageBody.send as IgSendMessageBody).payload!.reaction))
        : !isInsta
          ? (reactionMsg.messageBody.receive as WaReceiveMessageBody).messages[0]!.reaction!.emoji
          : ((reactionMsg.messageBody.receive as IgReceiveMessageBody).reaction!.emoji ??
            reactionEmojiMap(
              (reactionMsg.messageBody.receive as IgReceiveMessageBody).reaction!.reaction,
            )),
      from: isSendReactionMsg
        ? reactionMsg.sender?.name
        : (selectedContact.name ??
          selectedContact.whatsappUserName ??
          selectedContact.phone ??
          selectedContact.igsId),
      pos: exchangeProcess === "receive" ? "bottom-start" : "bottom-end",
    };
}

export const TempMessageBody = ({
  body,
  timestamp,
}: {
  body: {
    text?: TiptapNode | string;
    url?: string;
    urlType?: string;
    filename?: string;
  };
  /** Optimistic messages stamp this with `Date.now()`. */
  timestamp?: string | number;
}) => {
  const { user } = useUser();
  return (
    <Message align="end">
      <MessageAvatar>
        <CreativeAvatar name={user?.userName} size="xs" />
      </MessageAvatar>
      <MessageContent>
        <MessageHeader>{user?.userName}</MessageHeader>
        <Bubble variant="default" align="end">
          <BubbleContent>
            {body.url && body.urlType === "image" && (
              <Image src={body.url} height={150} width={150} alt="image of text messaage" />
            )}
            {body.url && body.urlType === "video" && (
              <video src={body.url} height={"150px"} width={"150px"} />
            )}
            {body.url && body.urlType === "document" && (
              <p
                className="cursor-pointer underline"
                onClick={() => {
                  window.open(body.url, "_blank");
                }}
              >
                {body.filename}
              </p>
            )}
            {body.url && body.urlType === "audio" && <audio src={body.url} />}
            <div>{body.text ? parseJsonToReact(body?.text) : null}</div>
          </BubbleContent>
        </Bubble>
        <MessageFooter className="gap-1.5">
          <span>{formatToCustomTime(timestamp)}</span>
          <Clock className="size-3" />
        </MessageFooter>
      </MessageContent>
    </Message>
  );
};

export const EndofConversationComponent = () => {
  const { t: translations } = useTranslation();
  return (
    <Marker variant="separator">
      <MarkerIcon>
        <IconBrandWhatsapp />
      </MarkerIcon>
      <MarkerContent>{translations("This is the beginning of your conversation")}</MarkerContent>
    </Marker>
  );
};

/** Centered date divider between day groups. */
export const DateComponent = ({ date }: { date: string }) => {
  return (
    <Marker variant="separator">
      <MarkerContent>{formatDate(date)}</MarkerContent>
    </Marker>
  );
};
