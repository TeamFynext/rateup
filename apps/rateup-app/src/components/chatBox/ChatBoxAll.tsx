import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ContactsWithLastMessage } from "@/src/api/inbox/types";
import { assignedContact } from "@/src/api/inbox/contacts";

const ChatBoxAll: React.FC<ContactsWithLastMessage & { onPress?: () => void }> = ({
  id,
  name,
  phone,
  lastMessage,
  lastReceivedMessageTimeStamp,
  unReadMessageCount,
  waMessageAssignStatus,
  onPress,
}) => {
  const [assignedUser, setAssignedUser] = useState<string | null>(null);

  const namePreview = (name_: string) => {
    const nameArray = name_.split(" ");
    if (nameArray.length >= 2) {
      return (nameArray[0][0] + nameArray[1][0]).toUpperCase();
    }
    return nameArray[0].slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    async function assign() {
      try {
        const assigned = await assignedContact(id);
        if (assigned && assigned.length > 0 && assigned[0].assignedUser?.name) {
          setAssignedUser(assigned[0].assignedUser.name);
        }
      } catch (err) {
        console.error("Error fetching assigned user:", err);
      }
    }
    assign();
  }, [id]);

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
            {/* Name and Assigned */}
            <View className="flex-row items-center justify-between gap-1">
              <Text className="text-lg font-semibold text-[#343A40]" numberOfLines={1}>
                {name || phone}
              </Text>
              <Text className="bg-[#F5F5F5] px-2 rounded-full">
                {assignedUser ? assignedUser : waMessageAssignStatus}
              </Text>
            </View>

            {/* Last Message Preview */}
            <Text className="text-sm text-black min-w-[40vw] max-w-[60vw]" numberOfLines={1}>
              {getMessagePreview(lastMessage)}
            </Text>
          </View>

          {/* Time and Unread Count */}
          <View className="flex items-center justify-center gap-1">
            <Text className="text-xs text-[#7A8289] ml-2">
              {getRelativeTime(lastReceivedMessageTimeStamp)}
            </Text>
            {unReadMessageCount > 0 && (
              <View className="bg-[#69F0AE] rounded-full h-6 w-6 flex items-center justify-center">
              <Text className="text-[#009987]">{unReadMessageCount}</Text>
            </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChatBoxAll;
