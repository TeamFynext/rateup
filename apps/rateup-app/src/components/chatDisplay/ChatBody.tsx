// src/components/Chat/ChatBody.tsx

import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import React from 'react';
import { useGetMessagesByContactId } from '@/src/api/inbox/messages';
import { parseWaMessage } from '@/src/api/inbox/messages';
import MessageBubble from './chatBody/MessageBubble';
import DateSeparator from './chatBody/DateSeperator';
import dayjs from '@/src/utils/day'; 

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
  
    const messages = data?.pages.flatMap(page => page.messages) || [];
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
          <Text className="text-red-500">{error?.message || "Something went wrong"}</Text>
        </View>
      );
    }
  
    const getDateLabel = (timestamp: string) => {
      const date = dayjs(Number(timestamp) * 1000);
      if (date.isToday()) return "Today";
      if (date.isYesterday()) return "Yesterday";
      const now = dayjs();
      if (now.diff(date, 'day') < 7) {
        return date.format('dddd');
      }
      return date.format('MMM D');
    };
  
    const renderItem = ({ item, index }: { item: any; index: number }) => {
      const parsed = parseWaMessage(item.messageBody);
      if (parsed.messageType !== "text") return null;
  
      const currentLabel = getDateLabel(parsed.timeStamp);
  
      const prevItem = reversedMessages[index - 1];
      const prevParsed = prevItem ? parseWaMessage(prevItem.messageBody) : null;
      const prevLabel = prevParsed ? getDateLabel(prevParsed.timeStamp) : null;
  
      const showDateSeparator = index === 0 || currentLabel !== prevLabel;
  
      return (
        <>
          {showDateSeparator && <DateSeparator label={currentLabel} />}
          <MessageBubble
            message={parsed.messageContent}
            timestamp={parsed.timeStamp}
            isSent={parsed.isSent}
          />
        </>
      );
    };
  
    return (
      <View className="flex-1 bg-rateUpGreen20">
        <FlatList
          data={reversedMessages} 
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
