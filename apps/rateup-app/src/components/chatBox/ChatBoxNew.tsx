import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ContactsWithLastMessage } from "@/src/api/inbox/types";

const ChatBoxNew: React.FC<ContactsWithLastMessage & { onPress?: () => void }> = ({
  name,
  phone,
  lastMessage,
  lastReceivedMessageTimeStamp,
  unReadMessageCount,
  onPress,
}) => {

  const namePreview = (name_: string) => {
    const nameArray = name_.split(" ");
    if (nameArray.length >= 2) {
      return (nameArray[0][0] + nameArray[1][0]).toUpperCase();
    }
    return nameArray[0].slice(0, 2).toUpperCase();
  };

  const getMessagePreview = (lastMessage: any) => {
    if (!lastMessage) return "No message";

    if (lastMessage.text) return lastMessage.text.body;
    if (lastMessage.image) return "📷 Photo";
    if (lastMessage.video) return "🎥 Video";

    return "Unsupported message";
  };

  const getRelativeTime = (waCreatedAt: string | undefined) => {
    if (!waCreatedAt) return "No time";
    const timestamp = new Date(waCreatedAt).getTime();
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;

    return new Date(waCreatedAt).toLocaleDateString();
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View className="flex-row items-center p-4">
        {/* Profile initials */}
        <View className="w-16 h-16 rounded-full mr-4 bg-[#00998733] flex items-center justify-center">
          <Text className="text-[#009987] font-bold text-[30px]">
            {namePreview(name)}
          </Text>
        </View>

        {/* Main Content */}
        <View className="flex-1 flex-row items-center justify-between">
          <View className="gap-1">
            {/* Name */}
            <Text className="text-lg font-semibold text-[#343A40]" numberOfLines={1}>
              {name || phone}
            </Text>

            {/* Last Message */}
            <Text className="text-sm text-black min-w-[40vw] max-w-[60vw]" numberOfLines={1}>
              {getMessagePreview(lastMessage)}
            </Text>
          </View>

          {/* Time and Unread */}
          <View className="flex items-center justify-center gap-1">
            <Text className="text-xs text-[#7A8289] ml-2">
              {getRelativeTime(lastReceivedMessageTimeStamp)}
            </Text>
            <View className="bg-[#69F0AE] rounded-full h-6 w-6 flex items-center justify-center">
              <Text className="text-[#009987]">{unReadMessageCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChatBoxNew;
