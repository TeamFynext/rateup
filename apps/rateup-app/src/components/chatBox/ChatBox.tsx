import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ContactsWithLastMessage } from "@/api/inbox/types";
import { namePreview } from "../../utils/chatbox_utils";
import { MessagePlatform } from "@/constants/enums";
import { getSoucePlatformIconAndColor } from "@/util";
import { useLifecycleContext } from "@/context/LifecycleContext";

const ChatBox: React.FC<
  ContactsWithLastMessage & { onPress?: () => void }
> = ({
  id,
  name,
  phone,
  platform,
  lastMessage,
  lastMessageTimeStamp,
  unReadMessageCount,
  waMessageAssignStatus,
  isSessionActive,
  lifecycleId,
  onPress,
}) => {
  const lifeCycleLabels = useLifecycleContext();
  const lifecycleInfo = useMemo(() => {
    const label = lifeCycleLabels?.find(
      (label: any) => label.id === lifecycleId
    );
    return label;
  }, [lifecycleId, lifeCycleLabels]);
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${
        unReadMessageCount > 0 && "bg-blue-50 dark:bg-transparent"
      }`}
    >
      <View className="flex-row items-center p-4">
        {/* Profile initials */}
        <View className="relative w-16 h-16 mr-4">
          {/* Profile initials circle */}
          <View className="w-full h-full rounded-full bg-chatAvatarBlue flex items-center justify-center">
            <Text className="text-white font-bold text-[24px]">
              {namePreview(name)}
            </Text>
          </View>
          {unReadMessageCount > 0 && (
            <View className="absolute top-0 right-0">
              <View className="bg-primaryBlue w-5 h-5 rounded-full flex items-center justify-center">
                <Text className="text-white text-sm">{unReadMessageCount}</Text>
              </View>
            </View>
          )}
          <View
            className={`absolute -bottom-1 -right-1 rounded-full p-0.5 ${
              platform === MessagePlatform.WHATSAPP
                ? "bg-green-600 border border-white"
                : platform === MessagePlatform.INSTAGRAM
                ? "bg-pink-500 border border-white"
                : "bg-blue-600 border border-white"
            }`}
          >
            {getSoucePlatformIconAndColor(platform)?.icon}
          </View>
        </View>
        {/* Main Content */}
        <View className="flex-1 flex-row items-center justify-between">
          <View className="gap-1">
            {/* Name and Assigned */}
            <View className="flex-row items-center justify-between gap-1">
              <Text
                className="text-lg font-semibold text-black dark:text-white"
                numberOfLines={1}
              >
                {(name || phone)?.length > 20
                  ? (name || phone).slice(0, 17) + "..."
                  : name || phone}
              </Text>
            </View>
            {/* Last Message Preview */}
            <Text
              className="text-sm text-black dark:text-white min-w-[40vw] max-w-[60vw]"
              numberOfLines={1}
            >
              {formatMessage(lastMessage)}
            </Text>
            <View className="flex flex-row items-center gap-1.5">
              <View>
                {lifecycleInfo && (
                  <Text className="text-[9px] px-2 py-0.5 bg-lightBlue dark:bg-transparent dark:border dark:border-primaryBlue text-primaryBlue rounded-full">
                    {lifecycleInfo?.emoji + " " + lifecycleInfo?.name}
                  </Text>
                )}
              </View>
              {/* assignststus here */}
              <Text className="bg-gray-100 dark:border text-[9px] dark:border-white dark:bg-transparent dark:text-white py-0.5 px-2 rounded-full">
                {waMessageAssignStatus}
              </Text>
            </View>
          </View>
          <View className="flex items-center justify-center gap-1">
            <Text className="text-xs text-[#7A8289] ml-2">
              {lastMessageTimeStamp}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default memo(ChatBox);

function formatMessage(msg:string) {
  return msg.length > 12 ? msg.slice(0, 12) + "..." : msg;
}