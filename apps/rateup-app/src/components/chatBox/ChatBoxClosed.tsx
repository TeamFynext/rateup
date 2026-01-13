import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ContactsWithLastMessage } from "@/src/api/inbox/types";
import { namePreview } from "../../utils/chatbox_utils";

const ChatBoxClosed: React.FC<
  ContactsWithLastMessage & { onPress?: () => void }
> = ({
  name,
  phone,
  lastMessage,
  lastMessageTimeStamp,
  unReadMessageCount,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="flex-row items-center p-4">
        <View className="w-16 h-16 rounded-full mr-4 bg-[#00998733] flex items-center justify-center">
          <Text className="text-rateUpGreen font-bold text-[30px]">
            {namePreview(name)}
          </Text>
        </View>
        <View className="flex-1 flex-row items-center justify-between">
          <View className="gap-1">
            <Text
              className="text-lg font-semibold text-[#343A40]"
              numberOfLines={1}
            >
              {(name || phone)?.length > 20
                ? (name || phone).slice(0, 17) + "..."
                : name || phone}
            </Text>
            <Text
              className="text-sm text-black min-w-[40vw] max-w-[60vw]"
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
          </View>
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

export default memo(ChatBoxClosed);
