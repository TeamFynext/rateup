import Image from "next/image";

import { Center, Group, IndicatorProps, Text } from "@mantine/core";
import { IconBrandWhatsapp, IconClock } from "@tabler/icons-react";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { MessagePlatform } from "@/types/enums";
import {
  IgReceiveMessageBody,
  IgSendMessageBody,
  WaReceiveMessageBody,
  WaSendMessageBody,
} from "@/types/global";
import { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";
import { Badge } from "@/components/ui/badge";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/UserContext";
import { formatDate, formatToCustomTime } from "@/utils/dateTime";
import { parseWaMessage } from "@/utils/whatsapp/inbox";

import { reactionEmojiMap } from "../layout/singleMessageLayout";
import classes from "../styles.module.css";
import WaInboxAttachments from "./attachments";
import WaInboxAudio from "./audio";
import WaInboxContact from "./contact";
import WaInboxDocument from "./document";
import WaInboxImage from "./image";
import WaInboxInteractive from "./interactive";
import WaInboxLocation from "./location";
import WaInboxTemplate from "./template";
import WaInboxText from "./text";
import WaInboxVideo from "./video";

export const singleMessage = ({
  message,
  translations,
}: {
  message: WaGetMessagesBody;
  translations: (e: string) => string;
}) => {
  const { messageContent, messageType, template, interactive } =
    parseWaMessage(message);
  switch (messageType) {
    case "text":
    case "quickreply":
      return <WaInboxText messageContent={messageContent} />;
    case "image":
      return <WaInboxImage messageContent={messageContent} />;
    case "button":
      return <WaInboxText messageContent={messageContent} />;
    case "template":
      return (
        <WaInboxTemplate
          templateBody={template}
          parameters={message.templateComponentParams}
        />
      );
    case "interactive":
      return (
        <WaInboxInteractive
          interactiveBody={interactive}
          messageContent={messageContent}
        />
      );
    case "audio":
      return <WaInboxAudio messageContent={messageContent} />;
    case "video":
      return <WaInboxVideo messageContent={messageContent} />;
    case "document":
      return <WaInboxDocument messageContent={messageContent} />;
    case "contacts":
      return <WaInboxContact messageContent={messageContent} />;
    case "location":
      return <WaInboxLocation messageContent={messageContent} />;
    case "attachments":
      return <WaInboxAttachments messageContent={messageContent} />;
    default:
      return (
        <Text fz={"xs"} c={"red"}>
          {messageType}{" "}
          {translations("message type display is not supported yet")}
        </Text>
      );
  }
};

export function getReactionMessage({
  message,
  allMessages,
  selectedContact,
}: {
  message: WaGetMessagesBody;
  allMessages: WaGetMessagesBody[];
  selectedContact: any;
}) {
  const exchangeProcess = message?.messageBody?.exchangeProcess;
  const isInsta =
    message?.sourcePlatform == MessagePlatform.INSTAGRAM ||
    message?.sourcePlatform == MessagePlatform.WEBCHAT;
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
            ? (msg.messageBody.receive as WaReceiveMessageBody).messages[0]
                .reaction?.message_id
            : (msg.messageBody.receive as IgReceiveMessageBody).reaction.mid
          : !isInsta
            ? (msg.messageBody.send as WaSendMessageBody).reaction?.message_id
            : (msg.messageBody.send as IgSendMessageBody).payload.message_id;
      return wa_id === reactedMessageId;
    }
    return false;
  });

  const isSendReactionMsg =
    reactionMsg && reactionMsg.messageBody.exchangeProcess === "send";
  if (reactionMsg)
    return {
      emoji: isSendReactionMsg
        ? !isInsta
          ? (reactionMsg.messageBody.send as WaSendMessageBody).reaction.emoji
          : ((reactionMsg.messageBody.send as IgSendMessageBody).payload
              .emoji ??
            reactionEmojiMap(
              (reactionMsg.messageBody.send as IgSendMessageBody).payload
                .reaction,
            ))
        : !isInsta
          ? (reactionMsg.messageBody.receive as WaReceiveMessageBody)
              .messages[0].reaction.emoji
          : ((reactionMsg.messageBody.receive as IgReceiveMessageBody).reaction
              .emoji ??
            reactionEmojiMap(
              (reactionMsg.messageBody.receive as IgReceiveMessageBody).reaction
                .reaction,
            )),
      from: isSendReactionMsg
        ? reactionMsg.sender?.name
        : (selectedContact.name ??
          selectedContact.whatsappUserName ??
          selectedContact.phone ??
          selectedContact.igsId),
      pos:
        exchangeProcess === "receive"
          ? "bottom-start"
          : ("bottom-end" as IndicatorProps["position"]),
    };
}

export const TempMessageBody = ({ body, timestamp }) => {
  const { user } = useUser();
  return (
    <div className="flex gap-2 pb-4 pr-4 pl-6">
      <div className="flex flex-col gap-2">
        <div className="bg-green-500/10 px-4 py-2.5 rounded-2xl shadow-sm rounded-br-sm">
          {body.url && body.urlType === "image" && (
            <Image
              src={body.url}
              height={150}
              width={150}
              alt="image of text messaage"
            />
          )}
          {body.url && body.urlType === "video" && (
            <video src={body.url} height={"150px"} width={"150px"} />
          )}
          {body.url && body.urlType === "document" && (
            <p
              onClick={() => {
                window.open(body.url, "_blank");
              }}
            >
              {body.filename}
            </p>
          )}
          {body.url && body.urlType === "audio" && <audio src={body.url} />}
          <div>{body.text ? parseJsonToReact(body?.text) : null}</div>
        </div>
        <div className="flex gap-2 justify-end">
          <span className="text-xs text-muted-foreground">
            {formatToCustomTime(timestamp)}
          </span>
          <Clock className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
      <CreativeAvatar name={user?.userName} size="xs" />
    </div>
  );
};

export const EndofConversationComponent = () => {
  const translations = useTranslations();
  return (
    <Center>
      <Group className={classes.indicator_wrapper}>
        <IconBrandWhatsapp size={20} color="gray" />
        <Text className={classes.indicator_text}>
          {translations("This is the beginning of your conversation")}
        </Text>
      </Group>
    </Center>
  );
};

export const SeparatorWithText = ({ text }: { text: string }) => {
  return (
    <div className="flex items-center my-4 w-full">
      <Separator className="flex-1" />
      <Badge
        variant="secondary"
        className="mx-2 px-3 py-1 font-medium text-gray-500 bg-gray-200"
      >
        {text}
      </Badge>
      <Separator className="flex-1" />
    </div>
  );
};

export const DateComponent = ({ date }: { date: string }) => {
  return (
    <div>
      <SeparatorWithText text={formatDate(date)} />
    </div>
  );
};
