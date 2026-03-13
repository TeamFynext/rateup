import { View, Text, ActivityIndicator } from "react-native";
import { ContactsWithLastMessage, WaMessageAssignStatus } from "@/api/inbox/types";
import { useFilteredContacts } from "@/api/inbox/contacts/contacts.query";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import { useChatFilterStore } from "@/utils/store";
import {
  parseWaMessage_,
  returnMessageContentBasedOnParsedMessage,
} from "@/api/inbox/messages/utils";
import { useWsData } from "@/context/UserContext";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { WaMessageClosedStatus } from "@/constants/constants";
import ChatBox from "../chatBox/ChatBox";

type InboxProps = {
  messageType: string;
  searchTerm?: string;
  waMessageAssignStatus?: string | null;
};

export default function Inbox({
  messageType,
  searchTerm,
  waMessageAssignStatus,
}: InboxProps) {
  const { filter } = useChatFilterStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updatedContacts, setUpdatedContacts] = useState<
    ContactsWithLastMessage[]
  >([]);

  const mergedFilter = {
    ...filter,
    messageType,
    searchTerm,
    waMessageAssignStatus,
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

  const contacts = data?.pages.flatMap((page) => page.rows) ?? [];

  useEffect(() => {
    if (wsData?.type === "inbox" && wsData?.inbox?.contact?.id) {
      const contactId = wsData.inbox.contact.id;

      setUpdatedContacts((prev) => {
        const alreadyUpdated = prev.find((c) => c.id === contactId);
        const fromOriginalContacts = contacts.find((c) => c.id === contactId);
        const baseContact = alreadyUpdated || fromOriginalContacts;

        if (!baseContact) return prev; // not in current contacts list

        const isUnread =
          Array.isArray(wsData.inbox?.message.readUsers) &&
          wsData.inbox.message.readUsers.length === 0 &&
          wsData.inbox.message.sendBy === null;

        const updatedContact: ContactsWithLastMessage = {
          ...baseContact,
          ...wsData.inbox?.contact,
          lastMessage: wsData.inbox?.message,
          lastReceivedMessageTimeStamp:
            wsData.inbox?.contact.lastReceivedMessageTimeStamp,
          unReadMessageCount: isUnread
            ? (baseContact.unReadMessageCount ?? 0) + 1
            : baseContact.unReadMessageCount ?? 0,
        };
        const filtered = prev.filter((c) => c.id !== contactId);
        queryClient.invalidateQueries({ queryKey: ["contactCounts"] });
        return [updatedContact, ...filtered];
      });
    }
  }, [wsData]);

  const displayedContacts = contacts.map((contact) => {
    const updated = updatedContacts.find((u) => u.id === contact.id);
    return updated || contact;
  });

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
    const sessionExpiry = dayjs(item.lastReceivedMessageTimeStamp).add(
      24,
      "hour"
    );
    const now = dayjs();
    const diffInMinutes = sessionExpiry.diff(now, "minute");
    const isSessionActive = diffInMinutes > 0;
    const platform = item?.lastMessage?.sourcePlatform;
    const name =
      item.name || item?.whatsappUserName || item.igsId || item.phone;

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
        onPress={() =>
          router.push({
            //@ts-ignore
            pathname: `/protected/inbox/chat/${item.id}`,
            params: {
              name: item.name ? item.name : item.whatsappUserName,
              phone: item.phone,
              waAssignStatus: item.waMessageAssignStatus,
              lastReceivedMessageTimeStamp: item.lastReceivedMessageTimeStamp,
              // @ts-ignore
              sessionActive: isSessionActive,
            },
          })
        }
        lastMessageTimeStamp={dayjs
          .utc(item.lastMessage?.waCreatedAt)
          .fromNow()}
        lastReceivedMessageTimeStamp={item.lastReceivedMessageTimeStamp}
        isSessionActive={isSessionActive}
        unReadMessageCount={item.unReadMessageCount}
      />
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
        <Text className="text-red-500 text-center">
          Failed to load contacts.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={finalContacts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
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
          <View className="items-center py-4 bg-white dark:bg-slate-950"></View>
        )
      }
    />
  );
}
