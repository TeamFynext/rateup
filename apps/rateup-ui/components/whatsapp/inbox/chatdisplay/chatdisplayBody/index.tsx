import { ActionIcon, Center, Group, Loader, Text } from "@mantine/core";
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
import { useEffect, useState } from "react";
import WaInboxImage from "./components/image";
import WaInboxTemplate from "./components/template";
import WaInboxInteractive from "./components/interactive";
import { useInboxPaginationStore } from "../../inbox.store";
interface Props {
  data: WaGetMessagesBody[];
}
export default function WaInboxChatDisplayBody(props: Props) {
  const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
  const [currentScrollHeight, setCurrentScrollHeight] = useState(0);
  const messageLoading = useInboxPaginationStore(
    (state) => state.messageLoading,
  );
  const setMessageLoading = useInboxPaginationStore(
    (state) => state.setMessageLoading,
  );
  const increasePageCount = useInboxPaginationStore(
    (state) => state.increasePageCount,
  );
  const currentMessageCount = useInboxPaginationStore(
    (state) => state.currentMessageCount,
  );

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
    if (messageLoading.process !== "prepend") {
      scrollIntoView();
    }
  }, [targetRef.current, props?.data]);

  useEffect(() => {
    // Check if the paginateTargetRef is in view and if we're not already loading more messages
    if (paginateEntry?.isIntersecting && !messageLoading.loading) {
      // Increase the page count to load more messages
      setMessageLoading(true, "prepend");
      setCurrentScrollPosition(scrollableRef.current.scrollTop);
      setCurrentScrollHeight(scrollableRef.current.scrollHeight);
      increasePageCount();
    }
  }, [paginateEntry, increasePageCount]);

  useEffect(() => {
    if (messageLoading.process === "prepend") {
      const newScrollHeight = scrollableRef.current.scrollHeight;
      const heightDifference = newScrollHeight - currentScrollHeight;
      scrollableRef.current.scrollTop =
        currentScrollPosition + heightDifference;
      setMessageLoading(false, "set");
    }
  }, [props?.data]);

  return (
    <div className={classes.wrapper}>
      <div className={classes.inner} ref={scrollableRef}>
        {props?.data && props?.data?.length >= 15 && currentMessageCount > 0 ? (
          <div ref={paginateTargetRef}></div>
        ) : (
          <EndofConversationComponent />
        )}
        {paginateEntry?.isIntersecting && (
          <Center>
            <Loader size={"xs"} my="auto" />
          </Center>
        )}
        {props?.data?.map((message) => (
          <WaInboxSingleMessageLayout
            exchangeProcess={message?.messageBody?.exchangeProcess}
            messageObject={message}
            key={message?.id}
          >
            {singleMessage(
              message?.messageBody,
              message?.templateComponentParams,
            )}
          </WaInboxSingleMessageLayout>
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
