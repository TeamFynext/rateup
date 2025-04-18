import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { ContactsWithLastMessage } from "../api/inbox/types";

const ChatBox: React.FC<ContactsWithLastMessage & { onPress?: () => void }> = ({
  name,
  phone,
  lastMessage,
  onPress,
}) => {
  const profilePic = "https://via.placeholder.com/150"; // dummy pic

  const getMessagePreview = (messageBody: any) => {
    if (!messageBody) return "No message";

    if (messageBody.text) return messageBody.text;
    if (messageBody.image) return "📷 Photo";
    if (messageBody.video) return "🎥 Video";

    return "Unsupported message";
  };

  const getTime = (waCreatedAt: string | undefined) => {
    if (!waCreatedAt) return "No time";
    const date = new Date(waCreatedAt);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  console.log(lastMessage)


  return (
    <TouchableOpacity onPress={onPress}>
      <View className="flex-row items-center p-4">
        {/* Avatar */}
        <Image
          source={{ uri: profilePic }}
          className="w-16 h-16 rounded-full mr-4 bg-[#00998733]"
        />

        {/* Main Content */}
        <View className="flex-1 flex-row items-center justify-between">
          {/* Name and Last Message */}
          <View className="gap-1">
            <Text className="text-lg font-semibold text-[#343A40]" numberOfLines={1}>
              {name || phone}
            </Text>
            <Text className="text-sm text-black" numberOfLines={1}>
              {getMessagePreview(lastMessage?.messageBody)}
            </Text>
          </View>

          {/* Last Message Time */}
          <Text className="text-xs text-[#7A8289] ml-2">
            {getTime(lastMessage?.waCreatedAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ChatBox;
