import { View, Text } from "react-native";
import React, { memo, useCallback } from "react";
import WaInboxText, {
  WaInboxAudio,
  WaInboxDocument,
  WaInboxImage,
  WaInboxInteractive,
  WaInboxTemplate,
  WaInboxVideo,
} from "./messageBubbleTypes";
import { namePreview } from "@/src/utils/chatbox_utils";
import { WaTemplateComponent } from "@/src/context/type";
import {
  Lock,
} from "lucide-react-native";
import { colors } from "@/src/constants/constants";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";
import { getClosedIcon } from "@/src/util";

type MessageBubbleProps = {
  messageContent: any;
  interactive?: any;
  timestamp: string;
  exchangeProcess: string;
  messageType?: string;
  senderName?: string;
  template: any;
  templateComponentParams?: WaTemplateComponent[];
  assignStatus?: string;
};

const MessageBubble = ({
  messageContent,
  timestamp,
  exchangeProcess,
  messageType,
  senderName,
  interactive,
  template,
  templateComponentParams,
  assignStatus,
}: MessageBubbleProps) => {
  const getBgColor = () => {
    if (exchangeProcess === "internal") {
      switch (assignStatus) {
        case WaMessageAssignStatus.RESOLVED:
          return "bg-green-50";
        case WaMessageAssignStatus.UNRESOLVED:
          return "bg-orange-50";
        case WaMessageAssignStatus.CLOSED:
          return "bg-blue-50";
        case WaMessageAssignStatus.SPAM:
          return "bg-red-50";
        default:
          return "bg-indigo-50";
      }
    } else if (exchangeProcess === "privateNote") {
      return "bg-amber-50";
    } else if (exchangeProcess === "send") {
      return "bg-chat-bubble-green";
    } else {
      return "bg-white";
    }
  };
  const getTextColor = () => {
    switch (assignStatus) {
      case WaMessageAssignStatus.RESOLVED:
        return "text-green-600";
      case WaMessageAssignStatus.UNRESOLVED:
        return "text-orange-600";
      case WaMessageAssignStatus.CLOSED:
        return "text-blue-600";
      case WaMessageAssignStatus.SPAM:
        return "text-red-600";
      default:
        return "text-indigo-600";
    }
  };

  const getBorder = () =>{
    switch (exchangeProcess){
      case "send":
      case "privateNote":
        return "rounded-br-md rounded-3xl";
      case "internal":
        return "rounded-xl";
      default:
        return "rounded-bl-md rounded-3xl";
    }
  }

  const renderContent = useCallback(() => {
    switch (messageType) {
      case "text":
        return <WaInboxText messageContent={messageContent} />;
      case "image":
        return <WaInboxImage messageContent={messageContent} />;
      case "audio":
        return (
          <WaInboxAudio messageContent={messageContent} timestamp={timestamp} />
        );
      case "document":
        return <WaInboxDocument messageContent={messageContent} />;
      case "video":
        return <WaInboxVideo messageContent={messageContent} />;
      case "reaction":
        return <Text className="text-xl">{messageContent}</Text>;
      case "button":
        return <Text>buttons</Text>;
      case "template":
        return (
          <WaInboxTemplate
            templateBody={template}
            parameters={templateComponentParams}
          />
        );
      case "interactive":
        return (
          <WaInboxInteractive
            interactiveBody={interactive}
            messageContent={messageContent}
          />
        );
      default:
        return <Text className="text-black text-sm">{messageContent}</Text>;
    }
  }, [messageContent, messageType, timestamp]);

  // SPECIAL CASE: Received audio message — no bubble
  if (messageType === "audio" && exchangeProcess !== "send") {
    return (
      <View className="flex-row px-2 w-full mb-2 items-center gap-1 justify-start">
        {renderContent()}
      </View>
    );
  }

  return (
    <View
      className={`relative flex-row px-2 w-full mb-2 items-center gap-1
         ${
        exchangeProcess === "send" || exchangeProcess === "privateNote"
          ? "justify-end"
          : exchangeProcess === "internal"
          ? "justify-center"
          : "justify-start"
      }`}
    >
      <View
        className={`flex-col max-w-[75%] px-3 py-2 shadow-md ${getBorder()} ${getBgColor()}`}
      >
        {exchangeProcess === "privateNote" && (
          <View className="flex-row items-center justify-start gap-1">
            <Lock color={colors["amber-500"]} size={10} />
            <Text className="text-xs text-amber-500">Private note</Text>
          </View>
        )}
        {(exchangeProcess === "send" || exchangeProcess === "privateNote") && (
          <Text className="text-primaryBlue opacity-70 p-1 text-sm">{senderName}</Text>
        )}
        {exchangeProcess === "internal" && (
          <View className="flex-row items-center gap-1">
            {getClosedIcon(assignStatus)}
            <Text className={`${getTextColor()} opacity-70 p-1`}>
              {assignStatus}
            </Text>
          </View>
        )}
        {renderContent()}
        {messageType !== "audio" && (
          <Text className="text-sm text-gray-500 text-right mt-1">
            {timestamp}
          </Text>
        )}
      </View>

      {exchangeProcess === "send" && (
        <View className="w-8 h-8 rounded-full bg-chatAvatarBlue flex items-center justify-center">
          <Text className="text-white font-bold text-md">
            {namePreview(senderName)}
          </Text>
        </View>
      )}
      {exchangeProcess === "privateNote" && (
        <View className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
          <Text className="text-primaryBlue opacity-70 font-bold text-md">
            {namePreview(senderName)}
          </Text>
        </View>
      )}
    </View>
  );
};

export default memo(MessageBubble);
