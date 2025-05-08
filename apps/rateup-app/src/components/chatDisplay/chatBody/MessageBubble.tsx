import { View, Text, Pressable } from "react-native";
import React from "react";
import { RateupIcon } from "@/src/constants/imageExports";
import { WaInboxImage, WaInboxVideo } from "./messageBubbleTypes";

type MessageBubbleProps = {
  messageContent: any;
  timestamp: string;
  isSent: boolean;
  messageType?: string;
};

const MessageBubble = ({
  messageContent,
  timestamp,
  isSent,
  messageType,
}: MessageBubbleProps) => {
  const bubbleStyle =
    "max-w-[75%] p-3 rounded-lg " + (isSent ? "bg-[#00993333]" : "bg-white");

  const renderContent = () => {
    switch (messageType) {
      case "image":
        return <WaInboxImage messageContent={messageContent} />;
      case "audio":
        return <Text className="text-black">🎧 Audio Message</Text>;
      case "document":
        return (
          <Pressable>
            <Text className="text-black underline">📄 {messageContent}</Text>
          </Pressable>
        );
      case "video":
        return <WaInboxVideo messageContent={messageContent} />
      case "reaction":
        return <Text className="text-xl">{messageContent}</Text>;
      case "button":
      case "interactive":
        return <Text className="text-black">{messageContent}</Text>;
      default:
        return <Text className="text-black">{messageContent}</Text>;
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
