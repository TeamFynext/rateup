import dayjs from "dayjs";
import { Lock } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { FC } from "react";

import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useGetMessagesByContactId } from "@/backend/whatsapp/inbox/message/wamessage.query";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerVisibility,
} from "@/components/ui/message-scroller.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useChatFilterStore } from "@/store/chat-filter.store.ts";
import { getMessagesFromIDB } from "@/store/inbox.idb.ts";
import { useContactsStore, useMessagesStore } from "@/store/inbox.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { MessagePlatform } from "@/types/enums.ts";
import type { IgReceiveMessageBody } from "@/types/global";
import { parseWaMessage } from "@/utils/whatsapp/inbox.ts";

import WhatsAppInboxLoader from "../../loader/index.tsx";
import { useComposerTabStore } from "../chatdisplayFooter/composerTabStore.ts";
import { useTemperoryMessageStore } from "../chatdisplayFooter/index.tsx";
import {
  DateComponent,
  DeletedMessage,
  EndofConversationComponent,
  getReactionMessage,
  SingleMessage,
  TempMessageBody,
} from "./components/utils.tsx";
import WaInboxSingleMessageLayout from "./layout/singleMessageLayout/index.tsx";

/**
 * Sentinel row parked above the oldest message. The scroller reports it as
 * visible once the user reaches the top, which is what drives pagination now
 * that the virtualizer (and its "topmost index" trigger) is gone.
 */
const TOP_SENTINEL_ID = "wa-inbox-top-sentinel";

// `isContactDetailsOpened` used to position the bespoke scroll affix; the
// MessageScrollerButton positions itself inside the viewport, so it is unused.
const WaInboxChatDisplayBody = (_props: Readonly<{ isContactDetailsOpened?: boolean }>) => {
  const { selectedContact } = useContactsStore();
  const { filter } = useChatFilterStore();
  // api call
  const [enable, setEnabled] = useState(false);
  const { mergeMessages, setSelected, setIsLoading, selectedKey, messagesByKey, isLoading } =
    useMessagesStore();

  /**
   * The store holds messages newest-first. The scroller renders in document
   * order, so the thread is reversed here: oldest at the top, newest at the
   * bottom, no inverted-scroll trickery.
   */
  const allMessages = useMemo(() => {
    if (!selectedKey) return [];
    // Keys are `${rowKey}_${source}` where rowKey is the conversation (ticket)
    // identity — getRowKey(row) = conversationId ?? contactId.
    const [rowId, source] = selectedKey.split("_");
    if (source === "all") {
      const key1 = `${rowId}_${source}`;
      return [...(messagesByKey.get(key1)?.messages ?? [])].reverse();
    } else {
      const key1 = `${rowId}_${source}`;
      const key2 = `${rowId}_+${source}`;
      const key3 = `${rowId}_internal`;
      return [
        ...(messagesByKey.get(key1)?.messages ?? []),
        ...(messagesByKey.get(key2)?.messages ?? []),
        ...(messagesByKey.get(key3)?.messages ?? []),
      ].sort((a, b) => new Date(a.waCreatedAt).getTime() - new Date(b.waCreatedAt).getTime());
    }
  }, [selectedKey, messagesByKey]);

  /**
   * The composer's "Private Note" tab is also the thread's view mode: in it the
   * thread shows internal notes only, so the note history reads as its own
   * surface instead of being scattered through the customer conversation.
   */
  const { activeTab, setActiveTab } = useComposerTabStore();
  const isNotesView = activeTab === "private";
  const visibleMessages = useMemo(
    () =>
      isNotesView
        ? allMessages.filter((m) => m?.messageBody?.exchangeProcess === "privateNote")
        : allMessages,
    [allMessages, isNotesView],
  );

  const { messages: tempMessages } = useTemperoryMessageStore();

  useEffect(() => {
    if (!selectedContact) return;
    setSelected(getRowKey(selectedContact), filter?.phone || "all");
    setEnabled(true);
  }, [selectedContact, filter?.phone]);

  // Opening another ticket starts back on the customer conversation.
  const rowKey = selectedContact ? getRowKey(selectedContact) : null;
  useEffect(() => {
    setActiveTab("message");
  }, [rowKey]);

  const {
    fetchNextPage,
    hasNextPage, // boolean
    data,
    isFetchingNextPage,
    isPending,
  } = useGetMessagesByContactId(
    selectedContact?.id ?? "",
    filter?.phone ?? "",
    enable,
    selectedContact?.conversationId,
  );

  useEffect(() => {
    if (!data || !selectedKey || !selectedContact) return;
    const rowId = selectedKey.split("_")[0];
    if (rowId !== getRowKey(selectedContact)) return;
    const all = data.pages.flatMap((p) => p.messages);
    if (!all.length) {
      return;
    }
    mergeMessages(selectedKey, all);
  }, [data, selectedKey, selectedContact]);

  useEffect(() => {
    if (!selectedKey) return;
    (async () => {
      const cached = await getMessagesFromIDB(selectedKey);
      if (!cached.length) {
        return;
      }
      mergeMessages(selectedKey, cached);
    })();
  }, [selectedKey]);

  const loadOlderMessages = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    setIsLoading(!messagesByKey?.get(selectedKey ?? "")?.messages?.length && isPending);
  }, [selectedKey, isPending, messagesByKey, enable]);
  if (isLoading) return <WhatsAppInboxLoader isLoading={isLoading} />;

  const pendingMessages = selectedContact ? (tempMessages?.[getRowKey(selectedContact)] ?? []) : [];

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport preserveScrollOnPrepend>
          <MessageScrollerContent className="mx-auto w-full max-w-4xl gap-6 px-3 py-4 lg:px-7 lg:py-6">
            <MessageScrollerItem messageId={TOP_SENTINEL_ID}>
              {isPending || isFetchingNextPage || hasNextPage ? (
                <div className="flex items-center justify-center">
                  <Spinner className="size-4 text-muted-foreground" />
                </div>
              ) : (
                <EndofConversationComponent />
              )}
            </MessageScrollerItem>
            {isNotesView && !visibleMessages.length && (
              <MessageScrollerItem messageId="wa-inbox-notes-empty">
                <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                  <Lock className="size-5 text-amber-600 dark:text-amber-500" />
                  <p className="text-sm font-medium text-foreground">No internal notes yet</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Notes stay with the ticket and are never sent to the customer.
                  </p>
                </div>
              </MessageScrollerItem>
            )}
            {visibleMessages.map((message, index) => (
              <MessageScrollerItem key={message?.id ?? index} messageId={message?.id}>
                <MessageItem
                  message={message}
                  selectedContact={selectedContact!}
                  previousMessage={index > 0 ? visibleMessages[index - 1] : undefined}
                />
              </MessageScrollerItem>
            ))}
            {!isNotesView &&
              pendingMessages.map((msg, i) => (
                <MessageScrollerItem
                  key={msg?.id || i}
                  messageId={msg?.id || `temp-${i}`}
                  scrollAnchor
                >
                  <TempMessageBody body={msg?.body} timestamp={msg.timestamp} />
                </MessageScrollerItem>
              ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
        <LoadOlderMessagesTrigger enabled={hasNextPage} onReach={loadOlderMessages} />
      </MessageScroller>
    </MessageScrollerProvider>
  );
};
export default WaInboxChatDisplayBody;

/**
 * Watches the top sentinel through the scroller's visibility hook — the
 * documented escape hatch — and asks for the next page when it comes into view.
 */
const LoadOlderMessagesTrigger: FC<{ enabled: boolean; onReach: () => void }> = ({
  enabled,
  onReach,
}: Readonly<{ enabled: boolean; onReach: () => void }>) => {
  const { visibleMessageIds } = useMessageScrollerVisibility();
  const isSentinelVisible = visibleMessageIds.includes(TOP_SENTINEL_ID);

  useEffect(() => {
    if (isSentinelVisible && enabled) onReach();
  }, [isSentinelVisible, enabled, onReach]);

  return null;
};

const MessageItem = ({
  message,
  selectedContact,
  previousMessage,
}: {
  message: WaGetMessagesBody;
  selectedContact: ContactWithUpdatedAt;
  previousMessage?: WaGetMessagesBody;
}) => {
  const { messagesByKey, selectedKey } = useMessagesStore();
  if (!message) return null;
  const { exchangeProcess, receive } = message.messageBody;
  const { messageType } = parseWaMessage(message);
  if (messageType === "reaction") return null;
  if (
    (message.sourcePlatform === MessagePlatform.INSTAGRAM ||
      message.sourcePlatform === MessagePlatform.FACEBOOK) &&
    exchangeProcess === "receive" &&
    (receive as IgReceiveMessageBody)?.message?.is_deleted
  )
    return <div />;
  const showDate =
    !previousMessage ||
    !dayjs(message.waCreatedAt).isSame(dayjs(previousMessage.waCreatedAt), "day");
  const reaction = getReactionMessage({
    message,
    allMessages: messagesByKey.get(selectedKey ?? "")?.messages || [],
    selectedContact,
  });
  return (
    <React.Fragment key={message?.id}>
      {showDate && (
        <div className="pb-6">
          <DateComponent date={message?.waCreatedAt} />
        </div>
      )}
      <WaInboxSingleMessageLayout
        exchangeProcess={message?.messageBody?.exchangeProcess}
        messageObject={message}
        reaction={reaction ?? undefined}
      >
        {/* Revoked on WhatsApp: the row and its body are kept, only the content
            is withheld — the placeholder still sits in the timeline. */}
        {message?.deletedAt ? <DeletedMessage /> : <SingleMessage message={message} />}
      </WaInboxSingleMessageLayout>
    </React.Fragment>
  );
};
