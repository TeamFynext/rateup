import { View, Text, Pressable } from "react-native";
import React, { memo, useCallback } from "react";
import WaInboxText, { WaInboxAudio, WaInboxDocument, WaInboxImage, WaInboxVideo } from "./messageBubbleTypes";

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
  // Memoize renderContent to avoid recreating on each render
  const renderContent = useCallback(() => {
    switch (messageType) {
      case "text" :
        return <WaInboxText messageContent={messageContent}/>
      case "image":
        return <WaInboxImage messageContent={messageContent} />;
      case "audio":
        return <WaInboxAudio messageContent={messageContent} timestamp={timestamp} />;
      case "document":
        return <WaInboxDocument messageContent={messageContent} />
      case "video":
        return <WaInboxVideo messageContent={messageContent} />;
      case "reaction":
        return <Text className="text-xl">{messageContent}</Text>;
      case "button":
        return <Text>buttons</Text>
      case "interactive":
        return <Text className="text-black">interactive</Text>;
      default:
        return <Text className="text-black text-sm">{messageContent}</Text>;
    }
  }, [messageContent, messageType, timestamp]);

  return (
    <View className={`flex-row px-2 w-full mb-2 ${isSent ? "justify-end" : "justify-start"}`}>
      <View className={`flex-col max-w-[75%] px-3 py-2 rounded-xl ${isSent ? "bg-[#d2f8d2]" : "bg-white"}`}>
        {renderContent()}
        {messageType !== "audio" && (
            <Text className="text-sm text-gray-500 text-right mt-1">{timestamp}</Text>
        )}
      </View>
    </View>
  );
};

export default memo(MessageBubble);
