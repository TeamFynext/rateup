import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ContactsWithLastMessage } from "@/src/api/inbox/types";
import { namePreview } from "../../utils/chatbox_utils";

const ChatBoxNew: React.FC<
  ContactsWithLastMessage & { onPress?: () => void }
> = ({
  name,
  phone,
  lastMessage,
  lastMessageTimeStamp,
  unReadMessageCount,
  onPress,
  isSessionActive,
}) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="flex-row items-center p-4">
        {/* Profile initials */}
        <View className="relative w-16 h-16 mr-4">
          {/* Profile initials circle */}
          <View className="w-full h-full rounded-full bg-[#00998733] flex items-center justify-center">
            <Text className="text-rateUpGreen font-bold text-[30px]">
              {namePreview(name)}
            </Text>
          </View>

          {/* Pulse indicator dot */}
          <View className="absolute top-0 right-0">
            {isSessionActive ? (
              <>
                <View className="absolute w-3 h-3 rounded-full bg-green-400 opacity-75" />
                <View className="w-3 h-3 rounded-full bg-green-500" />
              </>
            ) : (
              <View className="w-3 h-3 rounded-full bg-red-500" />
            )}
          </View>
        </View>

        {/* Main Content */}
        <View className="flex-1 flex-row items-center justify-between">
          <View className="gap-1">
            {/* Name */}
            <Text
              className="text-lg font-semibold text-[#343A40]"
              numberOfLines={1}
            >
              {name || phone}
            </Text>

            {/* Last Message */}
            <Text
              className="text-sm text-black min-w-[40vw] max-w-[60vw]"
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
          </View>

          {/* Time and Unread */}
          <View className="flex items-center justify-center gap-1">
            <Text className="text-xs text-[#7A8289] ml-2">
              {lastMessageTimeStamp}
            </Text>
            {unReadMessageCount > 0 && (
              <View className="bg-[#69F0AE] rounded-full h-6 w-6 flex items-center justify-center">
                <Text className="text-rateUpGreen">{unReadMessageCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChatBoxNew;
