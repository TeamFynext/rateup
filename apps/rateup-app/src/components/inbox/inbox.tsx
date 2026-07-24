import { View, Text, ActivityIndicator } from "react-native";
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
import { useWsData } from "@/context/UserContext";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { WaMessageClosedStatus } from "@/constants/constants";
import ChatBox from "../chatBox/ChatBox";
import { useContactsStore, makeFilterKey, useMessagesStore } from "@/store/inboxStore";

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
  const queryClient = useQueryClient();

  const mergedFilter = {
    ...filter,
    messageType,
    searchTerm,
    waMessageAssignStatus,
    status: statusOverride !== undefined ? statusOverride : filter.status,
    favorite,
  };
  const { wsData } = useWsData();

  const encodedFilter = encodeURIComponent(JSON.stringify(mergedFilter));

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useFilteredContacts(encodedFilter);

  const contactsByFilter = useContactsStore(state => state.contactsByFilter);
  const contactsById = useContactsStore(state => state.contactsById);
  const addContactsForFilter = useContactsStore(state => state.addContactsForFilter);
  const updateContactById = useContactsStore(state => state.updateContactById);
  const currentUser = useContactsStore(state => state.currentUser);
  const { colorScheme } = useColorScheme();
  const screenBg = colorScheme === "dark" ? Colors.dark.bg : Colors.light.bg;
  const setFilter = useContactsStore(state => state.setFilter);
  const loadContactsFromDB = useContactsStore(state => state.loadContactsFromDB);

  const filterKey = makeFilterKey(mergedFilter);

  useEffect(() => {
    setFilter(mergedFilter);
    // Assuming currentUser logic isn't strictly required for contacts load, passing null or basic info is fine.
    loadContactsFromDB(mergedFilter, null);
  }, [filterKey, setFilter, loadContactsFromDB]);

  // Handle data load from react-query
  useEffect(() => {
    if (!data) return;
    let isActive = true;

    const syncContacts = async () => {
      const allContacts = data.pages.flatMap((page) => page.rows) ?? [];
      if (!allContacts.length) return;

      const existingIds = new Set(contactsByFilter[filterKey] || []);
      const newContacts = allContacts
        .filter((c) => {
          const existingContact = contactsById.has(c.id);
          if (!existingContact) return true;
          return !existingIds.has(c.id);
        })
        .map((c) => {
          if (contactsById.has(c.id)) return c;
          return { ...c, updatedAt: new Date().toISOString() };
        });

      if (newContacts.length > 0 && isActive) {
        await addContactsForFilter(filterKey, newContacts);

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
  }, [data, filterKey]);

  // Websocket hook
  useEffect(() => {
    if (wsData?.type === "inbox" && wsData?.inbox?.contact?.id) {
      const contactId = wsData.inbox.contact.id;
      const isUnread =
        Array.isArray(wsData.inbox?.message.readUsers) &&
        wsData.inbox.message.readUsers.length === 0 &&
        wsData.inbox.message.sendBy === null;

      updateContactById(
        contactId,
        (oldContact) => {
          if (!oldContact) return oldContact;
          return {
            ...oldContact,
            ...wsData.inbox?.contact,
            lastMessage: wsData.inbox?.message,
            lastReceivedMessageTimeStamp: wsData.inbox?.contact.lastReceivedMessageTimeStamp,
            unReadMessageCount: isUnread
              ? (oldContact.unReadMessageCount ?? 0) + 1
              : oldContact.unReadMessageCount ?? 0,
          };
        },
        isUnread
      );

      if (wsData.inbox.message) {
        const msg = wsData.inbox.message as any;
        const k = `${contactId}_${msg.sourceIdentifier || msg.id}`;
        useMessagesStore.getState().mergeMessages(k, [msg], false);
        useMessagesStore.getState().mergeMessages(`${contactId}_all`, [msg], false);
      }
    }
  }, [wsData, queryClient, updateContactById]);

  const contactIds = contactsByFilter[filterKey] || [];
  let displayedContacts = contactIds.map((id) => contactsById.get(id)).filter(Boolean);

  const finalContacts =
    waMessageAssignStatus === "Addressed"
      ? displayedContacts.filter((c) =>
        WaMessageClosedStatus.includes(c.waMessageAssignStatus as WaMessageAssignStatus)
      )
      : displayedContacts;

  const renderItem = ({ item }: { item: ContactsWithLastMessage }) => {
    let ChatBoxComponent = ChatBox;

    if (!ChatBoxComponent) return null;

    const parsedMessage = parseWaMessage_(item.lastMessage);

    const messagePreview = returnMessageContentBasedOnParsedMessage(
      parsedMessage,
      item?.lastMessage?.messageBody?.exchangeProcess
    );
    const sessionExpiry = dayjs(item.lastReceivedMessageTimeStamp).add(24, "hour");
    const now = dayjs();
    const diffInMinutes = sessionExpiry.diff(now, "minute");
    const isSessionActive = diffInMinutes > 0;
    const platform = item?.lastMessage?.sourcePlatform;
    const name = item.name || item?.whatsappUserName || item.igsId || item.phone;

    return (
      <ChatBoxComponent
        id={item.id}
        phone={item.phone}
        name={name}
        platform={platform}
        lastMessage={messagePreview}
        waMessageAssignStatus={item.waMessageAssignStatus}
        assignedUsers={item.assignedUsers}
        lifecycleId={item.lifecycleId}
        ticketNumber={item.ticketNumber}
        ticketSubject={item.ticketSubject}
        isFavorite={item.isFavorite}
        contactLabels={item.contactLabels}
        currentUserId={currentUser?.userId}
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
        lastReceivedMessageTimeStamp={item.lastReceivedMessageTimeStamp}
        isSessionActive={isSessionActive}
        unReadMessageCount={item.unReadMessageCount}
      />
    );
  };

  if (isLoading && !finalContacts.length) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: screenBg }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError && !finalContacts.length) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: screenBg }}
      >
        <Text className="text-red-500 text-center">Failed to load contacts.</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={finalContacts as any[]}
      keyExtractor={(item) => item.id}
      renderItem={renderItem as any}
      contentContainerStyle={{ paddingHorizontal: LIST_PADDING_X }}
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
