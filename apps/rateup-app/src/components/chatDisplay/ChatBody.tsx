import {
  View,
  ActivityIndicator,
  Text,
  Dimensions,
  TouchableOpacity,
  FlatList,
  useColorScheme,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import React, { useRef, useCallback, useMemo } from "react";
import { parseWaMessage_ } from "@/api/inbox/messages/utils";
import MessageBubble from "./chatBody/MessageBubble";
import DateSeparator from "./chatBody/DateSeperator";
import dayjs from "dayjs";
import { useMarkMessageAsRead } from "@/api/inbox/contacts/contacts.query";
import { useAuth } from "@/context/AuthContext";
import { ViewToken } from "react-native";
import { useGetMessagesByContactId } from "@/api/inbox/messages/message.query";
import { ChevronDown } from "lucide-react-native";
import { useWsData } from "@/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";

const { height: screenHeight } = Dimensions.get("window");

const viewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

const ChatBody = ({ id }: { id: string }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
  } = useGetMessagesByContactId(id);
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { mutate: markRead } = useMarkMessageAsRead();
  const listRef = useRef<any>(null);
  const messages = data?.pages.flatMap((page) => page.messages) || [];
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  const lastVisibleIndex = useRef(0);
  const prevMessageCount = useRef(messages.length);
  const messageList = useMemo(() => messages, [messages]);
  const { wsData } = useWsData();
  React.useEffect(() => {
    if (
      messages.length > prevMessageCount.current &&
      lastVisibleIndex.current < messages.length - 5
    ) {
      setShowScrollToBottom(true);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  React.useEffect(() => {
    if (
      wsData?.type === "inbox" &&
      wsData.inbox?.contact.id === id // only for current chat
    ) {
      const isDuplicate = messageList.some(
        (msg) => msg.id === wsData.inbox?.message.id,
      );
      if (!isDuplicate) {
        queryClient.setQueryData(["wa-messages", id], (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [wsData.inbox?.message, ...newPages[0].messages],
          };

          return {
            ...oldData,
            pages: newPages,
          };
        });
      }
    }
  }, [wsData, id, messageList]);

  const markedAsRead = useRef(new Set<string>());

  const onViewableItemsChangedHandler = useRef<
    (({ viewableItems }: { viewableItems: Array<ViewToken> }) => void) | null
  >(null);

  React.useEffect(() => {
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
      const nextItem =
        index < messageList.length - 1 ? messageList[index + 1] : null;
      const nextDate = nextItem
        ? dayjs(nextItem.createdAt).format("YYYY-MM-DD")
        : null;

      const shouldShowDate = currentDate !== nextDate;
      return (
        <View
          style={{
            backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
            paddingHorizontal: 8,
          }}
        >
          {shouldShowDate && (
            <DateSeparator
              label={dayjs(item.createdAt).format("DD MMM YYYY")}
            />
          )}
          <MessageBubble
            messageContent={parsed.messageContent}
            interactive={parsed.interactive} //if it is interactive
            timestamp={time}
            assignStatus={item.messageBody?.internal?.assignStatus || ""} // for internal
            exchangeProcess={item.messageBody.exchangeProcess}
            senderName={item.sender?.name || ""}
            messageType={parsed.messageType}
            template={parsed.template} //if it is template
            templateComponentParams={item.templateComponentParams}
          />
        </View>
      );
    },
    [messageList],
  );

  const dynamicPaddingBottom = screenHeight > 800 ? 8 : 10;

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
        }}
      >
        <ActivityIndicator size="large" color={Colors.brand.blue} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
        }}
      >
        <Text className="text-red-500">
          {error?.message || "Something went wrong"}
        </Text>
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
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const isAtBottom = offsetY < 20; // smaller threshold
          setShowScrollToBottom(!isAtBottom);
        }}
        //@ts-ignore
        onScrollToIndexFailed={({ index }) => {
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
          ) : null
        }
        contentContainerStyle={{
          paddingBottom: dynamicPaddingBottom,
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
          <TouchableOpacity
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
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

export default ChatBody;
