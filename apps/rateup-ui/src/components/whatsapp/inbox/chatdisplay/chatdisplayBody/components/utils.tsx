import { IconBan, IconBrandWhatsapp, IconClock, IconExternalLink } from "@tabler/icons-react";
import { Image } from "@unpic/react";
import { useTranslation } from "react-i18next";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { parseJsonToReact } from "@/components/RichTextEditor/wa-editor/format.tsx";
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

import type { PendingMessage } from "../../pendingMessages.ts";
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
  messageContent: { text?: string; commentId?: string; mediaId?: string; permalink?: string };
}) => {
  const { t: translations } = useTranslation();
  // Resolved by the webhook when the comment arrived and stored on the message:
  // a comment carries only the media's numeric id, and an instagram.com/p/ URL
  // needs the shortcode, so there is nothing to build from here. Comments stored
  // before that shipped carry no link and simply show none.
  const permalink = messageContent.permalink;

  return (
    <div className="flex flex-col gap-1">
      <span className="flex flex-col items-center gap-2 text-xs text-foreground p-2 bg-muted rounded-[10px] w-fit">
        {translations("Commented on your post")}
        {permalink ? (
          <a
            href={permalink}
            target="_blank"
            rel="noreferrer noopener"
            // The link opens instagram.com, so it says where it goes and carries
            // its own label — the surrounding text is not read out with it.
            aria-label={translations("View this post on Instagram")}
            title={translations("View this post on Instagram")}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {translations("View post")}
            <IconExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
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
  asRecord(content) as {
    text?: string;
    commentId?: string;
    mediaId?: string;
    permalink?: string;
  };

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
        <span className="text-xs text-destructive font-medium">
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
      <IconBan className="size-3.5 shrink-0" />
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

/**
 * A message that has been sent but not yet read back from the server: same outgoing
 * bubble as the real thing, with a clock instead of a delivery tick.
 *
 * Templates draw the very card the preview drew, and flows their invitation message
 * and button, so what appears the instant you hit send is what the customer gets —
 * not a placeholder that swaps for something different a second later.
 */
export const PendingMessageBubble = ({ message }: { message: PendingMessage }) => {
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
            <PendingMessageContent message={message} />
          </BubbleContent>
        </Bubble>
        <MessageFooter className="gap-1.5">
          <span>{formatToCustomTime(message.timestamp)}</span>
          <IconClock className="size-3" />
        </MessageFooter>
      </MessageContent>
    </Message>
  );
};

const PendingMessageContent = ({ message }: { message: PendingMessage }) => {
  if (message.kind === "template") {
    return <WaInboxTemplate parameters={message.parameters} templateBody={message.template} />;
  }

  if (message.kind === "flow") {
    return (
      <div className="flex flex-col gap-2">
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.cta && (
          <span className="rounded-md border border-border px-3 py-1.5 text-center text-sm font-medium text-primary">
            {message.cta}
          </span>
        )}
      </div>
    );
  }

  const { body } = message;
  return (
    <>
      {body.url && body.urlType === "image" && (
        <Image src={body.url} height={150} width={150} alt="image of text messaage" />
      )}
      {body.url && body.urlType === "video" && (
        <video src={body.url} height={"150px"} width={"150px"} />
      )}
      {body.url && body.urlType === "document" && (
        <a
          href={body.url}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer underline"
        >
          {body.filename}
        </a>
      )}
      {body.url && body.urlType === "audio" && <audio src={body.url} />}
      <div>{body.text ? parseJsonToReact(body?.text) : null}</div>
    </>
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
