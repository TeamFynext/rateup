import { View, Text, Image, Pressable } from "react-native";
import React from "react";
import dayjs from "dayjs";
import { RateupIcon } from "@/src/constants/imageExports";

type MessageBubbleProps = {
  message: string;
  timestamp: string;
  isSent: boolean;
  messageType?: string;
  rawMessage?: any;
};

const MessageBubble = ({
  message,
  timestamp,
  isSent,
  messageType = "text",
  rawMessage,
}: MessageBubbleProps) => {
  // const formattedTimestamp = dayjs(Number(timestamp) * 1000).format("h:mm A");

  const bubbleStyle =
    "max-w-[75%] p-3 rounded-lg " + (isSent ? "bg-[#00993333]" : "bg-white");

  const renderContent = () => {
    switch (messageType) {
      case "image":
        return (
          <>
            <Image
              source={{ uri: extractImageLink(rawMessage) }}
              style={{ width: 200, height: 200, borderRadius: 12 }}
              resizeMode="cover"
            />
            {rawMessage?.send?.image?.caption && (
              <Text className="text-black mt-1">{rawMessage.send.image.caption}</Text>
            )}
          </>
        );
      case "audio":
        return <Text className="text-black">🎧 Audio Message</Text>;
      case "document":
        return (
          <Pressable>
            <Text className="text-black underline">📄 {message}</Text>
          </Pressable>
        );
      case "video":
        return <Text className="text-black">🎥 Video Message</Text>;
      case "reaction":
        return <Text className="text-xl">{message}</Text>;
      case "button":
      case "interactive":
        return <Text className="text-black">{message}</Text>;
      default:
        return <Text className="text-black">{message}</Text>;
    }
  };

  return (
    <View
      className={`flex-row mb-2 px-2 items-end gap-1 ${
        isSent ? "justify-end" : "justify-start"
      }`}
    >
      <View className={bubbleStyle}>
        {renderContent()}
        <Text className="text-[10px] text-[#7A8289] mt-1 self-end">
          {timestamp}
        </Text>
      </View>
      {isSent && <RateupIcon />}
    </View>
  );
};

export default MessageBubble;

const extractImageLink = (messageBody: any) => {
  if (!messageBody) return "";
  if (messageBody.exchangeProcess === "send") {
    return messageBody.send?.image?.link ?? "";
  } else if (messageBody.exchangeProcess === "receive") {
    return messageBody.receive?.messages?.[0]?.image?.link ?? "";
  }
  return "";
};
