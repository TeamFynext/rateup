"use client";

import { constants } from "node:buffer";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ActionIcon,
  Avatar,
  Badge,
  Center,
  Divider,
  Group,
  IndicatorProps,
  Loader,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useIntersection, useScrollIntoView } from "@mantine/hooks";
import {
  IconBrandWhatsapp,
  IconClock,
  IconSquareRoundedChevronDown,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useLocation } from "react-use";

import { MessagePlatform } from "@/types/enums";
import {
  getMessagesFromIDB,
  saveMessagesToIDB,
} from "@/app/dashboard/inbox/idb";
import useContactStore, {
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";
import { useUser } from "@/context/UserContext";

import { WaGetMessagesBody } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import {
  useGetMessagesByContactId,
  useMarkWaMessagesAsRead,
} from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import {
  IgReceiveMessageBody,
  IgSendMessageBody,
  WaInboxMessage,
  WaReceiveMessageBody,
  WaSendMessageBody,
  WaTemplateComponent,
} from "../../../../../types/global";
import { formatDate, formatToCustomTime } from "../../../../../utils/dateTime";
import { parseWaMessage } from "../../../../../utils/whatsapp/inbox";
import { useChatFilterStore } from "../../chatselect/chatFilter";
import { useMessageStore } from "../chatdisplayFooter";
import WaInboxAttachments from "./components/attachments";
import WaInboxAudio from "./components/audio";
import WaInboxContact from "./components/contact";
import WaInboxDocument from "./components/document";
import WaInboxImage from "./components/image";
import WaInboxInteractive from "./components/interactive";
import WaInboxLocation from "./components/location";
import WaInboxTemplate from "./components/template";
import WaInboxText from "./components/text";
import WaInboxVideo from "./components/video";
import WaInboxSingleMessageLayout, {
  reactionEmojiMap,
} from "./layout/singleMessageLayout";
import classes from "./styles.module.css";

interface Props {
  data: WaGetMessagesBody[];
  smallScreen?: boolean;
}
export default function WaInboxChatDisplayBody(props: Readonly<Props>) {
  const { selectedContact } = useContactsStore();
  const { filter } = useChatFilterStore();
  const mergeMessages = useMessagesStore((s) => s.mergeMessages);
  const setSelected = useMessagesStore((s) => s.setSelected);
  const setIsLoading = useMessagesStore((s) => s.setIsLoading);
  const selectedKey = useMessagesStore((s) => s.selectedKey);
  const isStoreDataLoading = useMessagesStore((s) => s.isLoading);
  const messagesByKey = useMessagesStore((s) => s.messagesByKey);

  const allMessages = useMemo(
    () => messagesByKey.get(selectedKey)?.messages || [],
    [selectedKey, messagesByKey],
  );

  // Select contact/source
  useEffect(() => {
    if (!selectedContact || !filter?.phone) return;
    setSelected(selectedContact.id, filter?.phone);
  }, [selectedContact, filter?.phone]);

  useEffect(() => {
    if (!selectedKey) return;
    (async () => {
      setIsLoading(true);
      const cached = await getMessagesFromIDB(selectedKey);
      if (!cached.length) {
        setIsLoading(false);
        return;
      }
      mergeMessages(selectedKey, cached);
    })();
  }, [selectedKey]);

  const {
    error, // Error
    fetchNextPage,
    hasNextPage, // boolean
    isError,
    data,
    isFetchingNextPage,
    isLoading,
  } = useGetMessagesByContactId(selectedContact?.id, filter?.phone);

  const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
  const [currentScrollHeight, setCurrentScrollHeight] = useState(0);
  const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<
    HTMLDivElement,
    HTMLDivElement
  >({
    duration: 0,
  });
  const { ref: targetInViewportRef, entry } = useIntersection({
    root: scrollableRef.current,
    threshold: 1,
  });
  //this intersection observer is used to paginate the messages when scrolled to the top
  const { ref: paginateTargetRef, entry: paginateEntry } = useIntersection({
    root: scrollableRef.current,
    threshold: 1,
  });

  // Merge fetched messages into store & IndexedDB
  useEffect(() => {
    if (!data || !selectedKey || !selectedContact) return;
    const contactId = selectedKey.split("_")[0];
    if (contactId !== selectedContact.id) return;
    setIsLoading(true);
    const all = data.pages.flatMap((p) => p.messages);
    if (!all.length) {
      setIsLoading(false);
      return;
    }
    mergeMessages(selectedKey, all);
  }, [data, selectedKey, selectedContact]);

  const translations = useTranslations();
  const { messages } = useMessageStore();

  const singleMessage = (message: WaGetMessagesBody) => {
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

  function getReactionMessage(message: WaGetMessagesBody) {
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
            : ((reactionMsg.messageBody.receive as IgReceiveMessageBody)
                .reaction.emoji ??
              reactionEmojiMap(
                (reactionMsg.messageBody.receive as IgReceiveMessageBody)
                  .reaction.reaction,
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

  useEffect(() => {
    scrollIntoView();
  }, [allMessages.length]);

  useEffect(() => {
    // Check if the paginateTargetRef is in view and if we're not already loading more messages
    if (paginateEntry?.isIntersecting && !isFetchingNextPage && hasNextPage) {
      setCurrentScrollPosition(scrollableRef.current.scrollTop);
      setCurrentScrollHeight(scrollableRef.current.scrollHeight);
      fetchNextPage();
    }
  }, [paginateEntry, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const newScrollHeight = scrollableRef.current?.scrollHeight;
    if (!newScrollHeight) return;
    const heightDifference = newScrollHeight - currentScrollHeight;
    scrollableRef.current.scrollTop = currentScrollPosition + heightDifference;
  }, [allMessages]);

  return (
    <div className={classes.wrapper}>
      <div
        className={classes.inner}
        ref={scrollableRef}
        style={{
          ...(props.smallScreen ? { padding: 0, paddingLeft: 10 } : {}),
        }}
      >
        {!allMessages.length && isLoading ? (
          <Center>
            <Loader size={"xs"} my="auto" />
          </Center>
        ) : data && hasNextPage ? (
          <div ref={paginateTargetRef}></div>
        ) : (
          <EndofConversationComponent />
        )}
        {!allMessages.length && isError && (
          <Text size="xs" c="red">
            {error?.message}
          </Text>
        )}
        {paginateEntry?.isIntersecting && isFetchingNextPage && (
          <Center>
            <Loader size={"xs"} my="auto" />
          </Center>
        )}
        {allMessages?.map((message, index) => {
          const { exchangeProcess, receive } = message.messageBody;
          const { messageType } = parseWaMessage(message);
          if (messageType === "reaction") return null;
          if (
            message.sourcePlatform === MessagePlatform.INSTAGRAM &&
            exchangeProcess === "receive" &&
            (receive as IgReceiveMessageBody)?.message?.is_deleted
          )
            return null;
          const previousMessage = index > 0 ? allMessages[index - 1] : null;
          const showDate =
            !previousMessage ||
            !dayjs(message.waCreatedAt).isSame(
              dayjs(previousMessage.waCreatedAt),
              "day",
            );
          const reaction = getReactionMessage(message);

          return (
            <React.Fragment key={message?.id}>
              {showDate && <DateComponent date={message?.waCreatedAt} />}
              <WaInboxSingleMessageLayout
                exchangeProcess={message?.messageBody?.exchangeProcess}
                messageObject={message}
                reaction={reaction}
              >
                {singleMessage(message)}
              </WaInboxSingleMessageLayout>
            </React.Fragment>
          );
        })}
        {messages?.[selectedContact.id]?.map((msg, i) => (
          <TempMessageBody body={msg?.body} timestamp={msg.timestamp} key={i} />
        ))}
        <div ref={targetInViewportRef}></div>
        <div ref={targetRef}></div>
      </div>
      {!entry?.isIntersecting && (
        <div className={classes.affix}>
          <ActionIcon variant="transparent" onClick={() => scrollIntoView()}>
            <IconSquareRoundedChevronDown size={20} />
          </ActionIcon>
        </div>
      )}
    </div>
  );
}

const TempMessageBody = ({ body, timestamp }) => {
  return (
    <Stack align="flex-end">
      <Group gap={4}>
        <Paper
          w={"fit-content"}
          px={"xs"}
          radius={"md"}
          shadow="xs"
          bg={"light-dark(#dcf0e4,rgb(82, 190, 127)"}
        >
          {body.url && body.urlType === "image" && (
            <img src={body.url} height={"150px"} width={"150px"} />
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

const EndofConversationComponent = () => {
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

const DateComponent = ({ date }: { date: string }) => {
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
