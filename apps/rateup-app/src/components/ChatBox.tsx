import React from "react"
import { View, Text, Image, TouchableOpacity } from "react-native"
import { ContactsWithLastMessage } from "../api/inbox/types"

const ChatBox: React.FC<ContactsWithLastMessage & { onPress?: () => void }> = ({
  name,
  lastMessage,
  waMessageAssignStatus,
  onPress,
}) => {
  const profilePic = "https://via.placeholder.com/150"

  return (
    <TouchableOpacity
      onPress={onPress}
    >
        <View className="flex-row items-center">
      <Image
        source={{ uri: profilePic }}
        className="w-16 h-16 rounded-full mr-4 bg-[#00998733]"
      />
      <View className="flex-row w-[75vw] h-full items-center justify-between">
        <View className="flex gap-1">
          <Text className="text-lg font-semibold text-[#343A40]">{name}</Text>
          <Text className="text-sm text-[#000000]">{lastMessage?.messageBody?.text || "No message"}</Text>
        </View>

        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-xs text-gray-400">{waMessageAssignStatus}</Text>
          <Text className="text-xs text-[#7A82890]">
            {lastMessage?.waCreatedAt
              ? new Date(lastMessage.waCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : "No time"}
          </Text>
        </View>
      </View>
      </View>
    </TouchableOpacity>
  )
}

export default ChatBox
