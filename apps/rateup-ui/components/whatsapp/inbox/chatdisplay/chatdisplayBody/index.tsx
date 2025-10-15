import React, { useEffect, useMemo, useRef } from "react";

import { ActionIcon } from "@mantine/core";
import { IconSquareRoundedChevronDown } from "@tabler/icons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { MessagePlatform } from "@/types/enums";
import { IgReceiveMessageBody } from "@/types/global";
import { getMessagesFromIDB } from "@/app/dashboard/inbox/idb";
import {
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import { useGetMessagesByContactId } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { parseWaMessage } from "@/utils/whatsapp/inbox";

import { useChatFilterStore } from "../../chatselect/chatFilter";
import { useTemperoryMessageStore } from "../chatdisplayFooter";
import {
  DateComponent,
  getReactionMessage,
  singleMessage,
  TempMessageBody,
} from "./components/utils";
import WaInboxSingleMessageLayout from "./layout/singleMessageLayout";
import classes from "./styles.module.css";

const reverseScroll = (e) => {
  e.preventDefault();
  e.currentTarget.scrollTop -= e.deltaY;
};

const WaInboxChatDisplayBody = (props) => {
  const parentRef = useRef(null);
  const { selectedContact } = useContactsStore();
  const { filter } = useChatFilterStore();
  const {
    mergeMessages,
    setSelected,
    setIsLoading,
    selectedKey,
    messagesByKey,
    isLoading: isStoreDataLoading,
  } = useMessagesStore();

  const allMessages = useMemo(
    () => messagesByKey.get(selectedKey)?.messages || [],
    [selectedKey, messagesByKey],
  );

  // Select contact/source
  useEffect(() => {
    if (!selectedContact || !filter?.phone) return;
    setSelected(selectedContact.id, filter?.phone);
  }, [selectedContact, filter?.phone]);

  const {
    fetchNextPage,
    hasNextPage, // boolean
    data,
    isFetchingNextPage,
    isLoading,
  } = useGetMessagesByContactId(selectedContact?.id, filter?.phone);
  const { messages: tempMessages } = useTemperoryMessageStore();

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

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allMessages.length + 1 : allMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

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
    rowVirtualizer.scrollToIndex(0);
  }, [selectedKey]);

  useEffect(() => {
    const lastItem = rowVirtualizer.getVirtualItems().at(-1);
    if (
      lastItem?.index >= allMessages.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    rowVirtualizer.getVirtualItems(),
    allMessages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  useEffect(() => {
    const current = parentRef.current;
    current?.addEventListener("wheel", reverseScroll, { passive: false });
    return () => void current?.removeEventListener("wheel", reverseScroll);
  }, []);

  return (
    <>
      <div
        ref={parentRef}
        className="relative h-full p-2 scale-y-[-1] overflow-y-auto"
      >
        <div
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          className=""
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const message = allMessages[virtualRow.index];
            const nextMessage =
              virtualRow.index < allMessages.length - 1
                ? allMessages[virtualRow.index + 1]
                : null;
            const isLoaderRow = virtualRow.index > allMessages.length - 1;
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  transform: `translateY(${virtualRow.start}px) scaleY(-1)`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                }}
                className="gap-4 p-4 pl-6"
              >
                {!isLoaderRow && (
                  <MessageItem
                    message={message}
                    props={props}
                    selectedContact={selectedContact}
                    nextMessage={nextMessage}
                  />
                )}
              </div>
            );
          })}
          {tempMessages?.[selectedContact.id]?.map((msg, i) => (
            <TempMessageBody
              body={msg?.body}
              timestamp={msg.timestamp}
              key={i}
            />
          ))}
        </div>
      </div>
      <div className={classes.affix}>
        <ActionIcon
          variant="transparent"
          onClick={() => rowVirtualizer.scrollToIndex(0)}
        >
          <IconSquareRoundedChevronDown size={20} />
        </ActionIcon>
      </div>
    </>
  );
};
export default WaInboxChatDisplayBody;

const MessageItem = ({ message, props, selectedContact, nextMessage }) => {
  const translations = useTranslations();
  if (!message) return null;
  const { exchangeProcess, receive } = message.messageBody;
  const { messageType } = parseWaMessage(message);
  if (messageType === "reaction") return null;
  if (
    message.sourcePlatform === MessagePlatform.INSTAGRAM &&
    exchangeProcess === "receive" &&
    (receive as IgReceiveMessageBody)?.message?.is_deleted
  )
    return <div />;
  const showDate =
    !nextMessage ||
    !dayjs(message.waCreatedAt).isSame(dayjs(nextMessage.waCreatedAt), "day");
  const reaction = getReactionMessage({
    message,
    props,
    selectedContact,
  });
  return (
    <React.Fragment key={message?.id}>
      {showDate && <DateComponent date={message?.waCreatedAt} />}
      <WaInboxSingleMessageLayout
        exchangeProcess={message?.messageBody?.exchangeProcess}
        messageObject={message}
        reaction={reaction}
      >
        {singleMessage({ message, translations })}
      </WaInboxSingleMessageLayout>
    </React.Fragment>
  );
};
