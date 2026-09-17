import { View, Text, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { Colors } from "@/constants/colors";
import { ContactsWithLastMessage, WaMessageAssignStatus } from "@/api/inbox/types";
import { useFilteredContacts } from "@/api/inbox/contacts/contacts.query";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { useChatFilterStore, useSelectedContactStore } from "@/utils/store";
import {
  parseWaMessage_,
  returnMessageContentBasedOnParsedMessage,
} from "@/api/inbox/messages/utils";
import {
  getContactChannelSource,
  getLastMessageSender,
  getVisibleUnreadCount,
  resolveChannel,
} from "@/utils/chatbox_utils";
import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { WaMessageClosedStatus } from "@/constants/constants";
import ChatBox from "../chatBox/ChatBox";
import { useContactsStore, makeFilterKey, useMessagesStore } from "@/store/inboxStore";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { useQueryClient } from "@tanstack/react-query";
import { getInboxRowTheme } from "@/constants/inboxDesign";

/** Gutter around the whole conversation list, on top of each row's own 16px. */
const LIST_PADDING_X = 0;

type InboxProps = {
  messageType: string;
  searchTerm?: string;
  waMessageAssignStatus?: string | null;
  statusOverride?: string[];
  favorite?: boolean;
};

export default function Inbox({
  messageType,
  searchTerm,
  waMessageAssignStatus,
  statusOverride,
  favorite,
}: Readonly<InboxProps>) {
  const filter = useChatFilterStore((state) => state.filter);
  const setSelectedContact = useSelectedContactStore((state) => state.setSelectedContact);
  const router = useRouter();
  // Which of the org's numbers/accounts each ticket came in on. Resolved here
  // rather than in the row so the list shares one `waSettings` read instead of
  // one hook per visible row, and `ChatBox` keeps only primitive props to memo on.
  const { data: waSettings } = useWaSettings();

  const mergedFilter = {
    ...filter,
    messageType,
    searchTerm,
    waMessageAssignStatus,
    status: statusOverride !== undefined ? statusOverride : filter.status,
    favorite,
  };

  const encodedFilter = encodeURIComponent(JSON.stringify(mergedFilter));

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useFilteredContacts(encodedFilter);

  const contactsByFilter = useContactsStore((state) => state.contactsByFilter);
  const contactsById = useContactsStore((state) => state.contactsById);
  const addContactsForFilter = useContactsStore((state) => state.addContactsForFilter);
  const currentUser = useContactsStore((state) => state.currentUser);
  // The signed-in user, for "You". `currentUser` above is only ever seeded with
  // null by this screen, so it cannot be relied on for that.
  const { userId } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const screenBg = isDark ? Colors.dark.bg : Colors.light.bg;
  const setFilter = useContactsStore((state) => state.setFilter);
  const loadContactsFromDB = useContactsStore((state) => state.loadContactsFromDB);

  const filterKey = makeFilterKey(mergedFilter);

  useEffect(() => {
    setFilter(mergedFilter);
    // Assuming currentUser logic isn't strictly required for contacts load, passing null or basic info is fine.
    loadContactsFromDB(mergedFilter, null);
    // `mergedFilter` is rebuilt every render, so depending on it would reload the
    // list forever. `filterKey` is its stable serialised form and stands in for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, setFilter, loadContactsFromDB]);

  // Handle data load from react-query
  useEffect(() => {
    if (!data) return;
    let isActive = true;

    const syncContacts = async () => {
      const allContacts = data.pages.flatMap((page) => page.rows) ?? [];
      if (!allContacts.length) return;

      const existingIds = new Set(contactsByFilter[filterKey] || []);
      const newContacts = allContacts.filter(
        (c) => !contactsById.has(c.id) || !existingIds.has(c.id),
      );

      if (!isActive) return;
      // Every row goes to the store, not just the ones this list lacked. Rows it
      // already had used to be skipped, so once a chat was listed its preview,
      // unread count and status only ever changed through the socket — and any
      // frame missed while the phone was backgrounded left the row stale for good.
      // `allContacts` is every page fetched so far, i.e. the complete set the
      // server has for this filter — so the fourth argument lets the store drop
      // cached ids the server no longer lists (see `retainedStaleIds`).
      await addContactsForFilter(filterKey, allContacts, false, true);

      // Threads are still seeded only for rows that were new here: merging a
      // server page into a thread that is already cached would drop any
      // optimistic bubble still waiting on its send (see `mergeMessages`).
      if (newContacts.length > 0 && isActive) {
        newContacts.forEach((c: any) => {
          if (!c.messages) return;
          const messageMap = new Map();
          c.messages.forEach((m: any) => {
            const key = `${c.id}_${m.sourceIdentifier}`;
            const all = `${c.id}_all`;
            messageMap.set(key, [...(messageMap.get(key) ?? []), m]);
            messageMap.set(all, [...(messageMap.get(all) ?? []), m]);
          });

          const mergeMessages = useMessagesStore.getState().mergeMessages;
          Array.from(messageMap.entries()).forEach(([k, msgs]) => {
            mergeMessages(k, msgs, false);
          });
        });
      }
    };

    syncContacts();

    return () => {
      isActive = false;
    };
    // Reads `contactsById`/`contactsByFilter` only to diff against what just
    // arrived. Depending on them would re-run this on every store write — including
    // the writes it makes itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filterKey]);

  // NB: no websocket effect here. Inbound `inbox` frames are folded into the
  // stores by `applyInboxUpdate` in UserContext, straight off the socket — an
  // effect keyed on `wsData` dropped every frame but the last of a React batch,
  // and never ran at all while this screen was unmounted.

  const contactIds = contactsByFilter[filterKey] || [];
  let displayedContacts = contactIds.map((id) => contactsById.get(id)).filter(Boolean);

  const finalContacts =
    waMessageAssignStatus === "Addressed"
      ? displayedContacts.filter((c) =>
          WaMessageClosedStatus.includes(c.waMessageAssignStatus as WaMessageAssignStatus),
        )
      : displayedContacts;

  const queryClient = useQueryClient();
  // Pull-to-refresh spins on its own flag rather than the query's `isRefetching`:
  // that one is also true for background refetches (a remount, a return to
  // focus), which would drop the spinner in unasked-for.
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * `refetch` rather than an invalidate-and-drop: the list renders out of the
   * contacts store, not the query cache, so clearing the cache would only blank
   * the query while the store kept showing the old rows. Refetching lets the
   * sync effect above reconcile the store — including dropping ids the server no
   * longer lists, which is how a ticket closed on the web disappears here.
   *
   * It refetches every page loaded so far, so a pull after a deep scroll costs
   * one request per page. That is the price of not throwing away the user's
   * scroll position, and react-query has no first-page-only refetch since v5.
   */
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        // The segment badges are a separate query. Leaving them stale would show
        // a count that disagrees with the list right under it.
        queryClient.invalidateQueries({ queryKey: ["contactCounts"] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, queryClient]);

  const renderItem = ({ item }: { item: ContactsWithLastMessage }) => {
    let ChatBoxComponent = ChatBox;

    if (!ChatBoxComponent) return null;

    const parsedMessage = parseWaMessage_(item.lastMessage);

    const lastMessageSender = getLastMessageSender(item, userId);
    const messagePreview = returnMessageContentBasedOnParsedMessage(
      parsedMessage,
      // With the sender named up front, a reaction reads "Aisha: Reacted 👍",
      // not "Aisha: You reacted 👍" — the receive wording is the neutral one.
      lastMessageSender ? "receive" : item?.lastMessage?.messageBody?.exchangeProcess,
    );
    const sessionExpiry = dayjs(item.lastReceivedMessageTimeStamp).add(24, "hour");
    const now = dayjs();
    const diffInMinutes = sessionExpiry.diff(now, "minute");
    const isSessionActive = diffInMinutes > 0;
    // Not `item.lastMessage` directly: a private note there names the channel
    // "internal". See `getContactChannelSource`.
    const { platform, identifier } = getContactChannelSource(item);
    const channel = resolveChannel(waSettings, platform, identifier);
    const name = item.name || item?.whatsappUserName || item.igsId || item.phone;

    return (
      <ChatBoxComponent
        id={item.id}
        phone={item.phone}
        name={name}
        platform={platform}
        channelLabel={channel?.label}
        channelConnected={channel?.isConnected}
        lastMessage={messagePreview}
        lastMessageSender={lastMessageSender}
        waMessageAssignStatus={item.waMessageAssignStatus}
        conversationStatus={item.conversationStatus}
        assignedUsers={item.assignedUsers}
        lifecycleId={item.lifecycleId}
        ticketNumber={item.ticketNumber}
        isFavorite={item.isFavorite}
        contactLabels={item.contactLabels}
        currentUserId={userId ?? currentUser?.userId}
        onPress={() => {
          setSelectedContact({
            ...item,
            sessionActive: isSessionActive,
          });
          router.push({
            //@ts-ignore
            pathname: `/protected/chat/${item.id}`,
          });
        }}
        lastMessageTimeStamp={dayjs.utc(item.lastMessage?.waCreatedAt).fromNow()}
        lastMessageAt={item.lastMessage?.waCreatedAt ?? item.conversationLastMessageAt}
        lastReceivedMessageTimeStamp={item.lastReceivedMessageTimeStamp}
        isSessionActive={isSessionActive}
        unReadMessageCount={getVisibleUnreadCount(item, userId ?? currentUser?.userId)}
      />
    );
  };

  if (isLoading && !finalContacts.length) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: screenBg }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError && !finalContacts.length) {
    // Pullable too. A failed load is the state someone is most likely to pull on,
    // and without a scroll view under it the only way back was to leave the tab.
    return (
      <ScrollView
        style={{ backgroundColor: screenBg }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={t.fg3}
            colors={[t.brand]}
            progressBackgroundColor={t.surface}
          />
        }
      >
        <Text style={{ color: t.danger, textAlign: "center" }}>Failed to load contacts.</Text>
        <Text style={{ color: t.fg3, textAlign: "center", marginTop: 6, fontSize: 13 }}>
          Pull down to try again.
        </Text>
      </ScrollView>
    );
  }

  return (
    <FlashList
      data={finalContacts as any[]}
      keyExtractor={(item) => item.id}
      renderItem={renderItem as any}
      contentContainerStyle={{ paddingHorizontal: LIST_PADDING_X }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          // iOS colours the spinner itself; Android colours the arc and the disc
          // behind it, which needs a surface or it is a white puck on the dark base.
          tintColor={t.fg3}
          colors={[t.brand]}
          progressBackgroundColor={t.surface}
        />
      }
      ListEmptyComponent={
        <View className="h-full flex items-center justify-center">
          <Text className="text-gray-500">No contacts found.</Text>
        </View>
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator size="small" className="py-4" />
        ) : (
          <View className="items-center py-4" style={{ backgroundColor: screenBg }} />
        )
      }
    />
  );
}
