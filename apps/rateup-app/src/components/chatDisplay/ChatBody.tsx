import { View, FlatList, ActivityIndicator, Text } from "react-native";
import React from "react";
import { parseWaMessage_, returnMessageContentBasedOnParsedMessage, useGetMessagesByContactId } from "@/src/api/inbox/messages";
import MessageBubble from "./chatBody/MessageBubble";
import DateSeparator from "./chatBody/DateSeperator";
import dayjs from "dayjs"

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

  const messages = data?.pages.flatMap((page) => page.messages) || [];
  const reversedMessages = [...messages].reverse();

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

  const formatToTimeWithMeridiem = (timestamp: string) => {
    return dayjs(timestamp).format("h:mm A");
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const parsed = parseWaMessage_(item.messageBody);
    const time = formatToTimeWithMeridiem(item.createdAt);
    const messagePreview = returnMessageContentBasedOnParsedMessage(
      parsed,
      item.messageBody.exchangeProcess
    );
  
    const currentDate = dayjs(item.createdAt).format("YYYY-MM-DD");
    const previousDate =
      index > 0
        ? dayjs(reversedMessages[index - 1].createdAt).format("YYYY-MM-DD")
        : null;
  
    const shouldShowDate = currentDate !== previousDate;
  
    return (
      <>
        {shouldShowDate && <DateSeparator label={dayjs(item.createdAt).format("DD MMM YYYY")} />}
        <MessageBubble
          message={messagePreview}
          timestamp={time}
          isSent={item.messageBody.exchangeProcess === "send"}
          messageType={parsed.messageType}
          rawMessage={item.messageBody}
        />
      </>
    );
  };
  
  
  return (
    <View className="flex-1 bg-rateUpGreen20">
      <FlatList
        data={reversedMessages}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="my-2">
              <ActivityIndicator size="small" color="#009987" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default ChatBody;
