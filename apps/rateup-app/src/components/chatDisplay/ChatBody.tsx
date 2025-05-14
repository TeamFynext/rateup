import {
  View,
  ActivityIndicator,
  Text,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import React, { useRef, useCallback, useMemo } from "react";
import { parseWaMessage_ } from "@/src/api/inbox/messages/utils";
import MessageBubble from "./chatBody/MessageBubble";
import DateSeparator from "./chatBody/DateSeperator";
import dayjs from "dayjs";
import { useMarkMessageAsRead } from "@/src/api/inbox/contacts/contacts.query";
import { useAuth } from "@/src/context/AuthContext";
import { ViewToken } from "react-native";
import { useGetMessagesByContactId } from "@/src/api/inbox/messages/message.query";
import { FlashList } from "@shopify/flash-list";
import { ChevronDown } from "lucide-react-native";

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
  const listRef = useRef<any>(null);
  const messages = data?.pages.flatMap((page) => page.messages) || [];
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  const lastVisibleIndex = useRef(0);
  const prevMessageCount = useRef(messages.length);
  const messageList = useMemo(() => messages, [messages]);
  React.useEffect(() => {
    if (
      messages.length > prevMessageCount.current &&
      lastVisibleIndex.current < messages.length - 5
    ) {
      setShowScrollToBottom(true);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);
  const markedAsRead = useRef(new Set<string>());

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

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

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const parsed = parseWaMessage_(item.messageBody);
      const time = dayjs(item.createdAt).format("h:mm A");

      const currentDate = dayjs(item.createdAt).format("YYYY-MM-DD");
      const nextItem =
        index < messageList.length - 1 ? messageList[index + 1] : null;
      const nextDate = nextItem
        ? dayjs(nextItem.createdAt).format("YYYY-MM-DD")
        : null;

      const shouldShowDate = currentDate !== nextDate;

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
            senderName={item.sender?.name || ""}
            messageType={parsed.messageType}
          />
        </>
      );
    },
    [messageList]
  );

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
      <FlashList
        inverted
        data={messageList}
        ref={listRef}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const isAtBottom = offsetY <= 50;
          setShowScrollToBottom(!isAtBottom);
        }}
        //@ts-ignore
        getItemLayout={(_, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
        //@ts-ignore
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
        contentContainerStyle={{
          paddingBottom: dynamicPaddingBottom,
        }}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        estimatedItemSize={80}
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
          <TouchableOpacity
            onPress={() => {
              listRef.current?.scrollToIndex({
                index: 0,
                animated: true,
              });
              setShowScrollToBottom(false);
            }}
            className="bg-black p-2 rounded-full shadow-md"
          >
            <ChevronDown color="white" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

export default ChatBody;
