import {
  ActionIcon,
  Badge,
  Center,
  Divider,
  Group,
  Loader,
  Text,
} from "@mantine/core";
import { WaGetMessagesBody } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import classes from "./styles.module.css";
import WaInboxSingleMessageLayout from "./layout/singleMessageLayout";
import { parseWaMessage } from "../../../../../utils/whatsapp/inbox";
import {
  WaInboxMessage,
  WaTemplateComponent,
} from "../../../../../types/global";
import WaInboxText from "./components/text";
import { useIntersection, useScrollIntoView } from "@mantine/hooks";
import {
  IconBrandWhatsapp,
  IconSquareRoundedChevronDown,
} from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import WaInboxImage from "./components/image";
import WaInboxTemplate from "./components/template";
import WaInboxInteractive from "./components/interactive";
import { useGetMessagesByContactId } from "../../../../../backend/whatsapp/inbox/message/wamessage.query";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { formatDate } from "../../../../../utils/dateTime";
interface Props {
  data: WaGetMessagesBody[];
}
export default function WaInboxChatDisplayBody(props: Props) {
  const searchParams = useSearchParams();
  const {
    error, // Error
    fetchNextPage,
    hasNextPage, // boolean
    isError,
    isFetchingNextPage,
  } = useGetMessagesByContactId(searchParams.get("contactId") as string);

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
      default:
        return (
          <Text fz={"xs"} c={"red"}>
            {messageType} message type display is not supported yet
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
    const newScrollHeight = scrollableRef.current.scrollHeight;
    const heightDifference = newScrollHeight - currentScrollHeight;
    scrollableRef.current.scrollTop = currentScrollPosition + heightDifference;
  }, [props?.data]);

  return (
    <div className={classes.wrapper}>
      <div className={classes.inner} ref={scrollableRef}>
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
          const previousMessage = index > 0 ? props.data[index - 1] : null;
          const showDate =
            !previousMessage ||
            !dayjs(message.waCreatedAt).isSame(
              dayjs(previousMessage.waCreatedAt),
              "day",
            );
          return (
            <React.Fragment key={message?.id}>
              {showDate && <DateComponent date={message?.waCreatedAt} />}
              <WaInboxSingleMessageLayout
                exchangeProcess={message?.messageBody?.exchangeProcess}
                messageObject={message}
              >
                {singleMessage(
                  message?.messageBody,
                  message?.templateComponentParams,
                )}
              </WaInboxSingleMessageLayout>
            </React.Fragment>
          );
        })}
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

const EndofConversationComponent = () => {
  return (
    <Center>
      <Group className={classes.indicator_wrapper}>
        <IconBrandWhatsapp size={20} color="gray" />
        <Text className={classes.indicator_text}>
          This is the beginning of your conversation
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
