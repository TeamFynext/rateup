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

  const namePreview = (name_:string) =>{
    const nameArray = name_.split(" ")
    if(nameArray.length >= 2 ){
      return (nameArray[0].slice(0,1) + nameArray[1].slice(0,1)).toUpperCase()
    }
    else return nameArray[0].slice(0,2).toUpperCase()
  }

  const getMessagePreview = (lastMessage:any) => {
    if (!lastMessage) return "No message";

    if (lastMessage.text) return lastMessage.text.body;
    if (lastMessage.image) return "📷 Photo";
    if (lastMessage.video) return "🎥 Video";

    return "Unsupported message";
  };

  const getTime = (waCreatedAt: string | undefined) => {
    if (!waCreatedAt) return "No time";
    const date = new Date(waCreatedAt);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View className="flex-row items-center p-4">

        <View className="w-16 h-16 rounded-full mr-4 bg-[#00998733] flex items-center justify-center">
          <Text className="text-[#009987] font-bold text-[30px]">{namePreview(name)}</Text>
          </View>

        {/* Main Content */}
        <View className="flex-1 flex-row items-center justify-between">
          {/* Name and Last Message */}
          <View className="gap-1">
            <Text className="text-lg font-semibold text-[#343A40]" numberOfLines={1}>
              {name || phone}
            </Text>
            <Text className="text-sm text-black min-w-[40vw] max-w-[60vw]" numberOfLines={1}>
              {getMessagePreview(lastMessage)}
            </Text>
          </View>

          <View className="flex items-center justify-center gap-1">
          <Text className="text-xs text-[#7A8289] ml-2">
            {getTime(lastReceivedMessageTimeStamp)}
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