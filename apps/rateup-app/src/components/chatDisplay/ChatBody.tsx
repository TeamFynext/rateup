import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  Dimensions,
} from "react-native";
import React, { useEffect, useRef, useCallback } from "react";
import { parseWaMessage_ } from "@/src/api/inbox/messages/utils";
import MessageBubble from "./chatBody/MessageBubble";
import DateSeparator from "./chatBody/DateSeperator";
import dayjs from "dayjs";
import { useMarkMessageAsRead } from "@/src/api/inbox/contacts/contacts.query";
import { useAuth } from "@/src/context/AuthContext";
import { ViewToken } from "react-native";
import { useGetMessagesByContactId } from "@/src/api/inbox/messages/message.query";

// Get the screen height
const { height: screenHeight } = Dimensions.get("window");

const ChatBody = ({ id }: { id: string }) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
  } = useGetMessagesByContactId(id);

  const { userId } = useAuth();
  const { mutate: markRead } = useMarkMessageAsRead();
  const listRef = useRef<FlatList>(null);

  const messages = data?.pages.flatMap((page) => page.messages) || [];
  const reversedMessages = [...messages].reverse();

  const markedAsRead = useRef(new Set<string>());

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  // Memoize onViewableItemsChanged to prevent unnecessary re-renders
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      viewableItems.forEach(({ item }) => {
        const isReceived = item.messageBody.exchangeProcess === "receive";
        const isUnread = !item.messageBody.readUsers?.includes(userId);

        if (isReceived && isUnread && !markedAsRead.current.has(item.id)) {
          markRead(id);
          markedAsRead.current.add(item.id);
        }
      });
    }
  ).current;

  // Memoize renderItem to avoid re-creation on every render
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const parsed = parseWaMessage_(item.messageBody);
      const time = dayjs(item.createdAt).format("h:mm A");
      const currentDate = dayjs(item.createdAt).format("YYYY-MM-DD");
      const previousDate =
        index > 0
          ? dayjs(reversedMessages[index - 1].createdAt).format("YYYY-MM-DD")
          : null;

      const shouldShowDate = currentDate !== previousDate;

      return (
        <>
          {shouldShowDate && (
            <DateSeparator
              label={dayjs(item.createdAt).format("DD MMM YYYY")}
            />
          )}
          <MessageBubble
            messageContent={parsed.messageContent}
            timestamp={time}
            isSent={item.messageBody.exchangeProcess === "send"}
            messageType={parsed.messageType}
          />
        </>
      );
    },
    [reversedMessages] // Add reversedMessages as a dependency
  );

  useEffect(() => {
    if (reversedMessages.length > 0) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  }, [reversedMessages.length]);

  // Dynamic padding based on screen size
  const dynamicPaddingBottom = screenHeight > 800 ? 8 : 10;

  if (isPending) {
    return (
      <View className="flex-1 justify-center items-center bg-rateUpGreen20">
        <ActivityIndicator size="large" color="#009987" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center bg-rateUpGreen20">
        <Text className="text-red-500">
          {error?.message || "Something went wrong"}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-rateUpGreen20">
      <FlatList
        data={reversedMessages}
        ref={listRef}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index, animated: false });
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
          ) : null
        }
        contentContainerStyle={{ paddingBottom: dynamicPaddingBottom }} // Dynamic padding based on screen size
        initialNumToRender={20} // Render the first 20 items
        maxToRenderPerBatch={10} // Max items to render per batch
        updateCellsBatchingPeriod={50} // Delay for batch rendering
      />
    </View>
  );
};

export default ChatBody;
