import { View, Text } from 'react-native';
import React from 'react';
import dayjs from 'dayjs';
import { RateupIcon } from '@/src/constants/imageExports';

type MessageBubbleProps = {
  message: string;
  timestamp: string;
  isSent: boolean;
};

const MessageBubble = ({ message, timestamp, isSent }: MessageBubbleProps) => {
  const formattedTimestamp = dayjs(Number(timestamp) * 1000).format('h:mm A');
  if (isSent) {
    return (
      <View className="flex-row justify-end mb-2 px-2 items-center gap-1">
        <View className="max-w-[75%] bg-[#00993333] p-3 rounded-lg">
          <Text className="text-black">
            {message}
          </Text>
          <Text className="text-[10px] text-[#7A8289] mt-1 self-end">
            {formattedTimestamp}
          </Text>
        </View>
        <RateupIcon/>
      </View>
    );
  } else {
    return (
      <View className="flex-row justify-start mb-2 px-2">
        <View className="max-w-[75%] bg-white p-3 rounded-lg rounded-tl-none">
          <Text className="text-gray-800">
            {message}
          </Text>
          <Text className="text-[10px] text-[#7A8289] mt-1 self-end">
            {formattedTimestamp}
          </Text>
        </View>
      </View>
    );
  }
};

export default MessageBubble;
