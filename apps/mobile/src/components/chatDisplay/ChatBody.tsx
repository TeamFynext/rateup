import { isMetaAiMessage } from "@/utils/metaAgentThread";
import {
  View,
  ActivityIndicator,
  Text,
  Dimensions,
  Pressable,
  FlatList,
  useColorScheme,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import React, { useRef, useCallback, useEffect } from "react";
import { getReplyToMid, parseWaMessage_ } from "@/api/inbox/messages/utils";
import MessageBubble from "./chatBody/MessageBubble";
import DateSeparator from "./chatBody/DateSeperator";
import dayjs from "dayjs";
import { useMarkMessageAsRead } from "@/api/inbox/contacts/contacts.query";
import { useAuth } from "@/context/AuthContext";
import type { ListViewToken as ViewToken } from "react-native";
import { ChevronDown, Copy, Reply } from "lucide-react-native";
import { useWsData } from "@/context/UserContext";
import { Colors } from "@/constants/colors";
import { useMessagesStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";
import { getMessagesFromIDB } from "@/utils/sqlite";
import { Skeleton } from "@/components/common/Skeleton";
import { logger } from "@/utils/logger";
import { useReplyTargetStore } from "@/store/replyTargetStore";
import { belongsToTicket } from "@/utils/ticketThread";
import { useGetMessagesByContactId, useSendNewWaMessage } from "@/api/inbox/messages/message.query";
import { MessagePlatform } from "@/constants/enums";
import { useSessionActiveStore } from "@/utils/store";
import { Toast } from "@/components/common/Notice";
import { buildReactionIndex, parseReaction, reactionTargetId } from "@/utils/messageReactions";
import { useChatChannel } from "./useChatChannel";
import MessageActionSheet, { type MessageAction } from "./chatBody/MessageActionSheet";

/** WhatsApp takes any emoji; Instagram and Messenger only a heart. */
const WA_QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const META_QUICK_REACTIONS = ["❤️"];

/** The text of a message worth copying, or null for media without a caption. */
function copyableText(messageType: string, content: unknown): string | null {
  if (typeof content === "string") {
    return ["text", "quickreply", "button", "default"].includes(messageType) || !messageType
      ? content.trim() || null
      : null;
  }
  const text = (content as { text?: unknown } | null)?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

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
  const ticketMessages = React.useMemo(
    () =>
      conversationId
        ? storeMessages.filter((m: any) => belongsToTicket(m, conversationId, ticketPlatform))
        : storeMessages,
    [storeMessages, conversationId, ticketPlatform],
  );
  // Reactions are drawn on the message they react to (as on the web), not as rows.
  const reactionIndex = React.useMemo(() => buildReactionIndex(ticketMessages), [ticketMessages]);
  const messageList = React.useMemo(
    () => ticketMessages.filter((m: any) => !parseReaction(m)),
    [ticketMessages],
  );

  // React to, copy, reply to: the message a long press opened the sheet for.
  const channel = useChatChannel(id);
  const isSessionActive = useSessionActiveStore((s) => s.isSessionActive);
  const sendMessage = useSendNewWaMessage(
    id,
    channel.teamId,
    channel.whatsappSettingsPhoneId,
    channel.platform as MessagePlatform,
  );
  const [actionItem, setActionItem] = React.useState<any | null>(null);
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

  // A reaction has no row, so it is never "viewed"; an unread one would keep the badge
  // up. Opening the chat shows it on its message, which counts as reading it.
  useEffect(() => {
    if (!userId) return;
    for (const m of ticketMessages) {
      if (
        m.messageBody?.exchangeProcess === "receive" &&
        !m.messageBody.readUsers?.includes(userId) &&
        !markedAsRead.current.has(m.id) &&
        parseReaction(m)
      ) {
        markedAsRead.current.add(m.id);
        markRead(id);
      }
    }
  }, [ticketMessages, userId, id, markRead]);

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
      return (
        <Pressable
          onLongPress={
            item.messageBody?.exchangeProcess === "internal"
              ? undefined
              : () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  setActionItem(item);
                }
          }
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
            deletedAt={item.deletedAt}
            reactions={item.deletedAt ? undefined : reactionIndex.get(reactionTargetId(item) ?? "")}
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
    [messageList, threadBg, contactName, reactionIndex],
  );

  const sheet = React.useMemo(() => {
    const item = actionItem;
    if (!item) return null;
    const close = () => setActionItem(null);
    const parsed = parseWaMessage_(item);
    const exchange = item.messageBody?.exchangeProcess;
    const platform = item.sourcePlatform as string;
    const isMeta = platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK;
    const text = item.deletedAt ? null : copyableText(parsed.messageType, parsed.messageContent);
    const preview =
      text ??
      (item.deletedAt
        ? "Deleted message"
        : parsed.messageType
          ? `${parsed.messageType[0].toUpperCase()}${parsed.messageType.slice(1)} message`
          : undefined);

    const actions: MessageAction[] = [];
    if (text) {
      actions.push({
        key: "copy",
        label: "Copy",
        icon: Copy,
        onPress: () => {
          close();
          Clipboard.setStringAsync(text)
            .then(() => Toast.success("Copied"))
            .catch(() => Toast.error("Couldn't copy"));
        },
      });
    }
    // Instagram's inline reply quotes this message in the next send (`replyToMid`).
    if (
      platform === MessagePlatform.INSTAGRAM &&
      item.messageId &&
      !item.deletedAt &&
      (exchange === "send" || exchange === "receive") &&
      channel.canReply
    ) {
      actions.push({
        key: "reply",
        label: "Reply",
        icon: Reply,
        onPress: () => {
          close();
          useReplyTargetStore.getState().setTarget({
            contactId: id,
            mid: item.messageId,
            preview: text ? text.slice(0, 120) : parsed.messageType || "Message",
            author: exchange === "send" ? item.sender?.name || "Automation" : contactName,
          });
        },
      });
    }

    // As on the web: react to the customer's messages, on a chat you can reply in.
    // WhatsApp also needs the 24-hour window open.
    const targetId = reactionTargetId(item);
    const canReact =
      exchange === "receive" &&
      !item.deletedAt &&
      !!targetId &&
      channel.canReply &&
      !!channel.whatsappSettingsPhoneId &&
      (isMeta || (platform === MessagePlatform.WHATSAPP && isSessionActive));
    const current = reactionIndex.get(targetId ?? "")?.find((r) => r.from === "business")?.emoji;
    const reactions = canReact
      ? {
          emojis: isMeta ? META_QUICK_REACTIONS : WA_QUICK_REACTIONS,
          current,
          onReact: (emoji: string) => {
            close();
            const removing = current === emoji;
            // Instagram has no un-react through the API; tapping the heart again is a no-op.
            if (removing && isMeta) return;
            Haptics.selectionAsync().catch(() => {});
            sendMessage.mutate({
              type: "reaction",
              reaction: isMeta
                ? { toWaMessageId: targetId, reaction: "love" }
                : { toWaMessageId: targetId, emoji: removing ? "" : emoji },
            });
          },
        }
      : undefined;

    const stats = item.stats;
    const info =
      exchange === "send" && stats
        ? {
            sent: stats.sent,
            delivered: stats.delivered,
            read: stats.read,
            failed: !!(stats.failed?.length || stats.error),
          }
        : undefined;

    if (!actions.length && !reactions && !info) return null;
    return { preview, actions, reactions, info, close };
  }, [actionItem, channel, isSessionActive, reactionIndex, sendMessage, id, contactName]);

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
      <MessageActionSheet
        visible={!!sheet}
        onClose={() => setActionItem(null)}
        preview={sheet?.preview}
        reactions={sheet?.reactions}
        actions={sheet?.actions ?? []}
        info={sheet?.info}
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
