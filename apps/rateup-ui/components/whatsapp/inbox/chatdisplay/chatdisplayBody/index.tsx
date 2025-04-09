import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";
import useTranslations from "@/dictionaries/useTranslation";

import { WaGetMessagesBody } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useGetMessagesByContactId } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import {
  WaInboxMessage,
  WaTemplateComponent,
} from "../../../../../types/global";
import { formatDate, formatToCustomTime } from "../../../../../utils/dateTime";
import { parseWaMessage } from "../../../../../utils/whatsapp/inbox";
import { useMessageStore } from "../chatdisplayFooter";
import WaInboxAudio from "./components/audio/indext";
import WaInboxDocument from "./components/document";
import WaInboxImage from "./components/image";
import WaInboxInteractive from "./components/interactive";
import WaInboxTemplate from "./components/template";
import WaInboxText from "./components/text";
import WaInboxVideo from "./components/video";
import WaInboxSingleMessageLayout from "./layout/singleMessageLayout";
import classes from "./styles.module.css";

interface Props {
  data: WaGetMessagesBody[];
  smallScreen?: boolean;
}
export default function WaInboxChatDisplayBody(props: Props) {
  const searchParams = useSearchParams();
  let contactId = searchParams.get("contactId") as string;
  const {
    error, // Error
    fetchNextPage,
    hasNextPage, // boolean
    isError,
    isFetchingNextPage,
    isPending,
  } = useGetMessagesByContactId(contactId);

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
  const { translations } = useTranslations();
  const { messages } = useMessageStore();
  const singleMessage = (
    messageBody: WaInboxMessage,
    templateComponentParams: WaTemplateComponent[],
  ) => {
    const { messageContent, messageType, template, interactive } =
      parseWaMessage(messageBody);
    switch (messageType) {
      case "text":
        return <WaInboxText messageContent={messageContent} />;
      case "image":
        return <WaInboxImage messageContent={messageContent} />;
      case "button":
        return <WaInboxText messageContent={messageContent} />;
      case "template":
        return (
          <WaInboxTemplate
            templateBody={template}
            parameters={templateComponentParams}
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
      default:
        return (
          <Text fz={"xs"} c={"red"}>
            {messageType}{" "}
            {translations["message type display is not supported yet"]}
          </Text>
        );
    }
  };
  useEffect(() => {
    scrollIntoView();
  }, [targetRef.current]);

  useEffect(() => {
    // Check if the paginateTargetRef is in view and if we're not already loading more messages
    if (paginateEntry?.isIntersecting && !isFetchingNextPage) {
      setCurrentScrollPosition(scrollableRef.current.scrollTop);
      setCurrentScrollHeight(scrollableRef.current.scrollHeight);
      fetchNextPage();
    }
  }, [paginateEntry]);

  useEffect(() => {
    const newScrollHeight = scrollableRef.current?.scrollHeight;
    if (!newScrollHeight) return;
    const heightDifference = newScrollHeight - currentScrollHeight;
    scrollableRef.current.scrollTop = currentScrollPosition + heightDifference;
  }, [props?.data]);

  function getReactionMessage(message: WaGetMessagesBody) {
    const exchangeProcess = message.messageBody.exchangeProcess;
    const wa_id =
      exchangeProcess === "send"
        ? message.messageId
        : message.messageBody.receive.messages[0].id;
    const reactionMsg = props.data?.findLast((msg) => {
      const { messageType, messageContent } = parseWaMessage(msg.messageBody);
      return (
        messageType === "reaction" &&
        wa_id ===
          (msg.messageBody.exchangeProcess === "receive"
            ? msg.messageBody.receive?.messages[0].reaction.message_id
            : msg.messageBody.send.reaction.message_id)
      );
    });

    const isSendReactionMsg =
      reactionMsg && reactionMsg.messageBody.exchangeProcess === "send";
    if (reactionMsg)
      return {
        emoji: isSendReactionMsg
          ? reactionMsg.messageBody.send.reaction.emoji
          : reactionMsg.messageBody.receive.messages[0].reaction.emoji,
        from: isSendReactionMsg
          ? reactionMsg.sender?.name
          : reactionMsg.messageBody.receive.contacts[0].profile.name,
        pos:
          exchangeProcess === "receive"
            ? "bottom-start"
            : ("bottom-end" as IndicatorProps["position"]),
      };
  }

  return (
    <div className={classes.wrapper}>
      <div
        className={classes.inner}
        ref={scrollableRef}
        style={{
          ...(props.smallScreen ? { padding: 0, paddingLeft: 10 } : {}),
        }}
      >
        {props?.data && hasNextPage ? (
          <div ref={paginateTargetRef}></div>
        ) : (
          <EndofConversationComponent />
        )}
        {isError && (
          <Text size="xs" c="red">
            {error?.message}
          </Text>
        )}
        {paginateEntry?.isIntersecting && isFetchingNextPage && (
          <Center>
            <Loader size={"xs"} my="auto" />
          </Center>
        )}
        {props?.data?.map((message, index) => {
          if (parseWaMessage(message?.messageBody)?.messageType === "reaction")
            return false;
          const previousMessage = index > 0 ? props.data[index - 1] : null;
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
                {singleMessage(
                  message?.messageBody,
                  message?.templateComponentParams,
                )}
              </WaInboxSingleMessageLayout>
            </React.Fragment>
          );
        })}
        {messages?.[contactId]?.map((msg, i) => (
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
          <div>{parseJsonToReact(body)}</div>
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
  const { translations } = useTranslations();
  return (
    <Center>
      <Group className={classes.indicator_wrapper}>
        <IconBrandWhatsapp size={20} color="gray" />
        <Text className={classes.indicator_text}>
          {translations["This is the beginning of your conversation"]}
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
