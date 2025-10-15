import {
  Avatar,
  Badge,
  Center,
  Divider,
  Group,
  Image,
  IndicatorProps,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconBrandWhatsapp, IconClock } from "@tabler/icons-react";
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
  props,
  selectedContact,
}: {
  message: WaGetMessagesBody;
  props: any;
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
  const reactionMsg = props.data?.find((msg) => {
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
  return (
    <Stack align="flex-end" style={{ transform: "scaleY(-1)" }}>
      <Group gap={4}>
        <Paper
          w={"fit-content"}
          px={"xs"}
          radius={"md"}
          shadow="xs"
          bg={"light-dark(#dcf0e4,rgb(82, 190, 127)"}
        >
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
            <Text
              onClick={() => {
                window.open(body.url, "_blank");
              }}
            >
              {body.filename}
            </Text>
          )}
          {body.url && body.urlType === "audio" && <audio src={body.url} />}
          <div>{body.text ? parseJsonToReact(body?.text) : null}</div>
          <Group gap={4}>
            <Text fz={10} c={"dimmed"}>
              {formatToCustomTime(timestamp)}
            </Text>
            <IconClock size={13} color="gray" />
          </Group>
        </Paper>
        <Avatar color="initials" size={"sm"} mb={"auto"} />
      </Group>
    </Stack>
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

export const DateComponent = ({ date }: { date: string }) => {
  return (
    <Group className={classes.date_wrapper}>
      <Divider flex={1} />
      <Badge variant="white" radius={"sm"}>
        <Text fz={"xs"}>{formatDate(date)}</Text>
      </Badge>
      <Divider flex={1} />
    </Group>
  );
};
