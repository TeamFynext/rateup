import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ContactsWithLastMessage } from "@/src/api/inbox/types";
import { assignedContact } from "@/src/api/inbox/contacts";
import { getMessagePreview, namePreview, getRelativeTime } from "../../utils/chatbox_utils";

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
