import { isMetaAiMessage } from "@/utils/metaAgentThread";
import {
  View,
  ActivityIndicator,
  Text,
  Dimensions,
  Pressable,
  FlatList,
  useColorScheme,
  Alert,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import React, { useRef, useCallback, useEffect } from "react";
import { getReplyToMid, parseWaMessage_ } from "@/api/inbox/messages/utils";
import MessageBubble from "./chatBody/MessageBubble";
import DateSeparator from "./chatBody/DateSeperator";
import dayjs from "dayjs";
import { useMarkMessageAsRead } from "@/api/inbox/contacts/contacts.query";
import { useAuth } from "@/context/AuthContext";
import type { ListViewToken as ViewToken } from "react-native";
import { useGetMessagesByContactId } from "@/api/inbox/messages/message.query";
import { ChevronDown } from "lucide-react-native";
import { useWsData } from "@/context/UserContext";
import { Colors } from "@/constants/colors";
import { useMessagesStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";
import { getMessagesFromIDB } from "@/utils/sqlite";
import { Skeleton } from "@/components/common/Skeleton";
import { logger } from "@/utils/logger";
import { useReplyTargetStore } from "@/store/replyTargetStore";
import { belongsToTicket } from "@/utils/ticketThread";

/** One shared empty thread, so the filtered list below is not rebuilt on every render. */
const NO_MESSAGES: any[] = [];

const { height: screenHeight } = Dimensions.get("window");

/** Static shape for the loading thread; deliberately uneven so it reads as chat. */
const SKELETON_BUBBLES = [
  { width: 180, height: 44, outgoing: false },
  { width: 130, height: 32, outgoing: true },
  { width: 220, height: 58, outgoing: false },
  { width: 160, height: 32, outgoing: true },
  { width: 140, height: 44, outgoing: false },
];

const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

const ChatBody = ({ id }: { id: string }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  // The design's thread sits on `--bg-page`, same as the list.
  const threadBg = isDark ? Colors.dark.bg : Colors.light.bg;
  // The ticket this chat was opened on. A contact has a ticket per channel (and
  // older closed ones); like rateup-ui, the thread shows the opened ticket only, so
  // an Instagram chat is not interleaved with the same contact's WhatsApp messages.
  // A chat reached without a row (a notification tap) has no ticket and shows all.
  const conversationId = useSelectedContactStore((state) =>
    state.selectedContact?.id === id ? (state.selectedContact?.conversationId ?? null) : null,
  );
  // The opened ticket's platform, which decides what pre-ticket history it shows. Read
  // only off the row's last message: a note there says nothing, and guessing from the
  // contact (a merged one has several) could hide history that belongs; unknown keeps it.
  const ticketPlatform = useSelectedContactStore((state) => {
    const row = state.selectedContact;
    const platform = row?.id === id ? row?.lastMessage?.sourcePlatform : null;
    return platform && platform !== "INTERNAL" ? (platform as string) : null;
  });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending, isError, error } =
    useGetMessagesByContactId(id, conversationId);
  const { userId } = useAuth();
  const { mutate: markRead } = useMarkMessageAsRead();
  const listRef = useRef<any>(null);
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  const lastVisibleIndex = useRef(0);

  // Zustand Store Integration
  const key = `${id}_all`;
  // Names the customer on a quote of one of their messages.
  const contactName = useSelectedContactStore((state) =>
    state.selectedContact?.id === id
      ? state.selectedContact?.name || state.selectedContact?.whatsappUserName || null
      : null,
  );
  const storeMessages =
    useMessagesStore((state) => state.messagesByKey.get(key)?.messages) ?? NO_MESSAGES;
  const mergeMessages = useMessagesStore((state) => state.mergeMessages);

  // Paint the thread from disk while the first page is in flight.
  //
  // Every merge already writes messages to SQLite under this same key, so a
  // chat the user has opened before is fully cached; nothing read it back,
  // which is why a notification tap opened an empty thread and then filled in.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    getMessagesFromIDB(key)
      .then((cached) => {
        if (cancelled || !cached?.length) return;
        // `mergeMessages` lets the incoming object win field by field, and
        // cached rows are older by definition, so they may only ever be applied
        // to a thread the network has not populated yet.
        if (useMessagesStore.getState().messagesByKey.get(key)?.messages?.length) return;
        mergeMessages(key, cached, false);
      })
      .catch((error) => {
        // A miss just means the thread paints when the request lands.
        logger.error("Failed to read cached messages:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [id, key, mergeMessages]);

  // Sync API data to Zustand
  useEffect(() => {
    if (!data) return;
    const apiMessages = data.pages.flatMap((page) => page.messages) || [];
    if (apiMessages.length > 0) {
      mergeMessages(key, apiMessages, false);
    }
  }, [data, key, mergeMessages]);

  const { wsData } = useWsData();

  // Sync WebSocket data to Zustand
  useEffect(() => {
    if (wsData?.type === "inbox" && wsData.inbox?.contact?.id == id) {
      const msg = wsData.inbox?.message;
      if (msg) {
        mergeMessages(key, [msg], false);
      }
    }
  }, [wsData, id, key, mergeMessages]);

  // The store keeps every message of the contact under one key (other screens read
  // it whole); the thread shows this ticket's, by the same rule as the API (see
  // `belongsToTicket`).
  const messageList = React.useMemo(
    () =>
      conversationId
        ? storeMessages.filter((m: any) => belongsToTicket(m, conversationId, ticketPlatform))
        : storeMessages,
    [storeMessages, conversationId, ticketPlatform],
  );
  const prevMessageCount = useRef(messageList.length);

  useEffect(() => {
    if (
      messageList.length > prevMessageCount.current &&
      lastVisibleIndex.current < messageList.length - 5
    ) {
      setShowScrollToBottom(true);
    }
    prevMessageCount.current = messageList.length;
  }, [messageList.length]);

  const markedAsRead = useRef(new Set<string>());

  const onViewableItemsChangedHandler = useRef<
    (({ viewableItems }: { viewableItems: Array<ViewToken> }) => void) | null
  >(null);

  useEffect(() => {
    onViewableItemsChangedHandler.current = ({
      viewableItems,
    }: {
      viewableItems: Array<ViewToken>;
    }) => {
      viewableItems.forEach(({ item }) => {
        const isReceived = item.messageBody.exchangeProcess === "receive";
        const isUnread = !item.messageBody.readUsers?.includes(userId);

        if (isReceived && isUnread && !markedAsRead.current.has(item.id)) {
          markRead(id);
          markedAsRead.current.add(item.id);
        }
      });
    };
  }, [userId, id, markRead]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      onViewableItemsChangedHandler.current?.({ viewableItems });
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const parsed = parseWaMessage_(item);
      const time = dayjs(item.createdAt).format("h:mm A");

      const currentDate = dayjs(item.createdAt).format("YYYY-MM-DD");
      const nextItem = index < messageList.length - 1 ? messageList[index + 1] : null;
      const nextDate = nextItem ? dayjs(nextItem.createdAt).format("YYYY-MM-DD") : null;

      const shouldShowDate = currentDate !== nextDate;
      // An Instagram inline reply quotes another message of the thread by its Meta id.
      const replyToMid = item.deletedAt ? undefined : getReplyToMid(item);
      const quotedItem = replyToMid
        ? messageList.find((m: { messageId?: string }) => m.messageId === replyToMid)
        : undefined;
      const quote = replyToMid
        ? {
            message: quotedItem,
            author: quotedItem
              ? quotedItem.messageBody?.exchangeProcess === "send"
                ? quotedItem.sender?.name || "Automation"
                : contactName
              : null,
          }
        : undefined;
      // Instagram only: a long press offers "Reply", which quotes this message in the
      // next send (`replyToMid`). Notes and system events have nothing to quote.
      const canQuote =
        item.sourcePlatform === "INSTAGRAM" &&
        !!item.messageId &&
        !item.deletedAt &&
        (item.messageBody?.exchangeProcess === "send" ||
          item.messageBody?.exchangeProcess === "receive");
      const offerReply = () =>
        Alert.alert("Message", undefined, [
          {
            text: "Reply",
            onPress: () =>
              useReplyTargetStore.getState().setTarget({
                contactId: id,
                mid: item.messageId,
                preview:
                  typeof parsed.messageContent === "string" && parsed.messageContent
                    ? parsed.messageContent.slice(0, 120)
                    : parsed.messageType || "Message",
                author:
                  item.messageBody?.exchangeProcess === "send"
                    ? item.sender?.name || "Automation"
                    : contactName,
              }),
          },
          { text: "Cancel", style: "cancel" },
        ]);
      return (
        <Pressable
          onLongPress={canQuote ? offerReply : undefined}
          delayLongPress={350}
          style={{
            backgroundColor: threadBg,
            paddingHorizontal: 8,
          }}
        >
          {shouldShowDate && <DateSeparator label={dayjs(item.createdAt).format("DD MMM YYYY")} />}
          <MessageBubble
            messageContent={parsed.messageContent}
            interactive={parsed.interactive}
            timestamp={time}
            assignStatus={item.messageBody?.internal?.assignStatus || ""}
            exchangeProcess={item.messageBody.exchangeProcess}
            senderName={
              item.sender?.name || item.messageBody?.privateNote?.triggeredByUser?.name || ""
            }
            // Outgoing with no sender attached. The payload carries no
            // `isAutomedMessage` (that lives on waMessageOrgTeamMap server-side
            // and isn't returned), so an absent `sender` is the signal that no
            // person pressed send — the same test the web inbox makes.
            isAutomated={item.messageBody?.exchangeProcess === "send" && !item.sender}
            isMetaAi={item.messageBody?.exchangeProcess === "send" && isMetaAiMessage(item)}
            messageType={parsed.messageType}
            template={parsed.template}
            templateComponentParams={item.templateComponentParams}
            stats={item.stats}
            quote={quote}
            editedAt={item.editedAt}
            note={
              item.messageBody?.exchangeProcess === "privateNote"
                ? {
                    deleted: !!item.deletedAt,
                    edited: !!item.messageBody.privateNote?.editedAt,
                    deletedBy: item.messageBody.privateNote?.deletedBy?.name,
                  }
                : undefined
            }
          />
        </Pressable>
      );
    },
    [messageList, threadBg, contactName, id],
  );

  const dynamicPaddingBottom = screenHeight > 800 ? 8 : 10;

  if (isPending && messageList.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: threadBg,
          paddingHorizontal: 12,
          paddingBottom: 12,
        }}
      >
        {/* Bubble-shaped rather than a centred spinner, to match the skeletons
            in the header and footer and to suggest a thread rather than an
            empty screen. Bottom-aligned because the list is inverted. */}
        {SKELETON_BUBBLES.map((bubble, index) => (
          <View
            key={index}
            style={{
              alignSelf: bubble.outgoing ? "flex-end" : "flex-start",
              marginTop: 10,
              maxWidth: "78%",
            }}
          >
            <Skeleton width={bubble.width} height={bubble.height} borderRadius={14} />
          </View>
        ))}
      </View>
    );
  }

  if (isError && messageList.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: threadBg,
        }}
      >
        <Text className="text-red-500">{error?.message || "Something went wrong"}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
      }}
    >
      <FlatList
        inverted
        data={messageList}
        ref={listRef}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => (item.messageId ?? item.id).toString()}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const isAtBottom = offsetY < 20;
          setShowScrollToBottom(!isAtBottom);
        }}
        //@ts-ignore
        onScrollToIndexFailed={() => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: 0,
              animated: true,
            });
          }, 100);
        }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="my-2">
              <ActivityIndicator size="small" color="#009987" />
            </View>
          ) : undefined
        }
        contentContainerStyle={{
          // Design: `padding: 18px 16px` around the message column. The list is
          // inverted, so `paddingTop` is the visual bottom.
          paddingTop: dynamicPaddingBottom,
          paddingBottom: 18,
          paddingHorizontal: 8,
        }}
        updateCellsBatchingPeriod={100}
      />
      {showScrollToBottom && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            zIndex: 100,
          }}
        >
          <Pressable
            onPress={() => {
              listRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
              });
              setShowScrollToBottom(false);
            }}
            className="bg-black p-2 rounded-full shadow-md"
          >
            <ChevronDown color="white" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

export default ChatBody;
