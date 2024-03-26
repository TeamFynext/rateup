import { ActionIcon, Text } from "@mantine/core";
import { WaGetMessagesBody } from "../../../../../backend/whatsapp/inbox/message/wamessage.api";
import classes from "./styles.module.css";
import WaInboxSingleMessageLayout from "./layout/singleMessageLayout";
import { parseWaMessage } from "../../../../../utils/whatsapp/inbox";
import { WaInboxMessageBody } from "../../../../../types/global";
import WaInboxText from "./components/text";
import { useIntersection, useScrollIntoView } from "@mantine/hooks";
import { IconSquareRoundedChevronDown } from "@tabler/icons-react";
import { useEffect } from "react";
import WaInboxImage from "./components/image";
import WaInboxTemplate from "./components/template";
interface Props {
  data: WaGetMessagesBody[];
}
export default function WaInboxChatDisplayBody(props: Props) {
  const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<
    HTMLDivElement,
    HTMLDivElement
  >();
  const { ref: targetInViewportRef, entry } = useIntersection({
    root: scrollableRef.current,
    threshold: 1,
  });

  const singleMessage = (messageBody: WaInboxMessageBody) => {
    const { messageContent, messageType, template } =
      parseWaMessage(messageBody);
    switch (messageType) {
      case "text":
        return <WaInboxText messageContent={messageContent} />;
      case "image":
        return <WaInboxImage messageContent={messageContent} />;
      case "button":
        return <WaInboxText messageContent={messageContent} />;
      case "template":
        return <WaInboxTemplate {...template} />;
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
  }, [props]);
  return (
    <div className={classes.wrapper}>
      <div className={classes.inner} ref={scrollableRef}>
        {props?.data?.map((message) => (
          <WaInboxSingleMessageLayout
            exchangeProcess={message?.messageBody?.exchangeProcess}
            messageObject={message}
          >
            {singleMessage(message?.messageBody)}
          </WaInboxSingleMessageLayout>
        ))}
        <div ref={targetRef}></div>
        <div ref={targetInViewportRef}></div>
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
