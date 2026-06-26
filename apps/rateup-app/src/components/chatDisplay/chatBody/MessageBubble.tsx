import { View, Text, useColorScheme } from "react-native";
import React, { memo, useCallback } from "react";
import WaInboxText, {
  WaInboxAudio,
  WaInboxDocument,
  WaInboxImage,
  WaInboxInteractive,
  WaInboxTemplate,
  WaInboxVideo,
} from "./messageBubbleTypes";
import { namePreview } from "@/utils/chatbox_utils";
import { WaTemplateComponent } from "@/context/type";
import {
  Lock,
} from "lucide-react-native";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { getClosedIcon } from "@/util";
import LinearGradient from "react-native-linear-gradient";
import { Colors } from "@/constants/colors";

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

  const getBorder = () => {
    switch (exchangeProcess) {
      case "send":
      case "privateNote":
        return "rounded-br-md rounded-3xl";
      case "internal":
        return "rounded-xl";
      default:
        return "rounded-bl-md rounded-3xl";
    }
  }

  const renderContent = useCallback((textColor?: string) => {
    switch (messageType) {
      case "text":
        return <WaInboxText messageContent={messageContent} textColor={textColor} />;
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
        return <Text style={{ fontSize: 20, color: textColor }}>{messageContent}</Text>;
      case "button":
        return <Text style={{ color: textColor }}>buttons</Text>;
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
        return <Text style={{ color: textColor, fontSize: 14 }}>{messageContent}</Text>;
    }
  }, [messageContent, messageType, timestamp]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const getInternalStyles = () => {
    switch (assignStatus) {
      case WaMessageAssignStatus.RESOLVED:
        return {
          bg: isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4",
          border: isDark ? "rgba(34,197,94,0.25)" : "#dcfce7",
          text: isDark ? "#4ade80" : "#166534",
        };
      case WaMessageAssignStatus.UNRESOLVED:
        return {
          bg: isDark ? "rgba(249,149,29,0.12)" : "rgba(249,149,29,0.06)",
          border: isDark ? "rgba(249,149,29,0.25)" : "rgba(249,149,29,0.15)",
          text: isDark ? "#fb923c" : "#c2410c",
        };
      case WaMessageAssignStatus.CLOSED:
        return {
          bg: isDark ? "rgba(28,81,142,0.15)" : "#eff6ff",
          border: isDark ? "rgba(28,81,142,0.28)" : "#dbeafe",
          text: isDark ? Colors.accent.cyan : Colors.brand.blue,
        };
      case WaMessageAssignStatus.SPAM:
        return {
          bg: isDark ? "rgba(239,68,68,0.12)" : "#fef2f2",
          border: isDark ? "rgba(239,68,68,0.25)" : "#fee2e2",
          text: isDark ? "#f87171" : "#991b1b",
        };
      default:
        return {
          bg: isDark ? "rgba(99,102,241,0.12)" : "#e0e7ff",
          border: isDark ? "rgba(99,102,241,0.25)" : "#e0e7ff",
          text: isDark ? "#818cf8" : "#3730a3",
        };
    }
  };

  // SPECIAL CASE: Internal assignment changes (System Messages) — centered pill with content
  if (exchangeProcess === "internal") {
    const styles = getInternalStyles();
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          width: "100%",
          marginBottom: 10,
          paddingHorizontal: 8,
        }}
      >
        <View
          style={{
            maxWidth: "85%",
            backgroundColor: styles.bg,
            borderWidth: 1,
            borderColor: styles.border,
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 14,
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            {getClosedIcon(assignStatus)}
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Nunito_700Bold",
                color: styles.text,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {assignStatus}
            </Text>
          </View>
          {renderContent(isDark ? Colors.dark.textPrimary : Colors.light.textPrimary)}
          {timestamp ? (
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Nunito_400Regular",
                color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
                marginTop: 4,
              }}
            >
              {timestamp}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // SPECIAL CASE: Received audio message — no bubble
  if (messageType === "audio" && exchangeProcess !== "send") {
    return (
      <View style={{ flexDirection: "row", width: "100%", paddingHorizontal: 8, marginBottom: 10, justifyContent: "flex-start" }}>
        {renderContent()}
      </View>
    );
  }

  const isSender = exchangeProcess === "send";
  const isPrivateNote = exchangeProcess === "privateNote";
  const showAvatar = isSender || isPrivateNote;

  const bubbleBgColor = isSender
    ? Colors.brand.blue
    : isPrivateNote
      ? isDark
        ? Colors.dark.surface
        : "rgba(248,149,29,0.12)"
      : isDark
        ? Colors.dark.surface
        : "#fff";

  const bubbleTextColor = isSender
    ? "#fff"
    : isPrivateNote
      ? isDark
        ? Colors.dark.textPrimary
        : "#78350f" // dark amber for private notes
      : isDark
        ? Colors.dark.textPrimary
        : Colors.light.textPrimary;

  const timestampColor = isSender
    ? "rgba(255,255,255,0.6)"
    : isDark
      ? Colors.dark.textMuted
      : Colors.light.textMuted;

  const borderStyle = isSender || isPrivateNote
    ? {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 4,
    }
    : {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 18,
      borderBottomLeftRadius: 4,
    };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: isSender || isPrivateNote ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: showAvatar ? 8 : 0,
        width: "100%",
        marginBottom: 10,
        paddingHorizontal: 8,
      }}
    >
      {!isSender && !isPrivateNote && (
        <View style={{ maxWidth: "78%" }}>
          <View
            style={{
              backgroundColor: bubbleBgColor,
              ...borderStyle,
              paddingVertical: 10,
              paddingHorizontal: 14,
              ...(isDark
                ? {}
                : {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 2,
                }),
            }}
          >
            {renderContent(bubbleTextColor)}
          </View>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Nunito_400Regular",
              color: timestampColor,
              marginTop: 3,
              marginLeft: 4,
            }}
          >
            {timestamp}
          </Text>
        </View>
      )}

      {(isSender || isPrivateNote) && (
        <View style={{ maxWidth: "74%" }}>
          {senderName ? (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Nunito_600SemiBold",
                color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
                textAlign: "right",
                marginBottom: 3,
              }}
            >
              {senderName}
            </Text>
          ) : null}

          <View
            style={{
              backgroundColor: bubbleBgColor,
              ...borderStyle,
              paddingVertical: 10,
              paddingHorizontal: 14,
              ...(isDark
                ? {}
                : {
                  shadowColor: Colors.brand.blue,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2,
                }),
            }}
          >
            {isPrivateNote && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Lock color="#f59e0b" size={10} />
                <Text style={{ fontSize: 11, fontFamily: "Nunito_600SemiBold", color: "#f59e0b" }}>
                  Private Note
                </Text>
              </View>
            )}
            {renderContent(bubbleTextColor)}
          </View>

          <Text
            style={{
              fontSize: 11,
              fontFamily: "Nunito_400Regular",
              color: timestampColor,
              textAlign: "right",
              marginTop: 3,
              marginRight: 4,
            }}
          >
            {timestamp}
          </Text>
        </View>
      )}

      {isSender && (
        <LinearGradient
          colors={[Colors.brand.blue, Colors.brand.blueLight] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              fontFamily: "Nunito_900Black",
              fontSize: 10,
              color: "#fff",
            }}
          >
            {namePreview(senderName)}
          </Text>
        </LinearGradient>
      )}

      {isPrivateNote && (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isDark ? Colors.dark.surface : "rgba(248,149,29,0.15)",
            borderWidth: 1,
            borderColor: "#f59e0b",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              fontFamily: "Nunito_900Black",
              fontSize: 10,
              color: "#f59e0b",
            }}
          >
            {namePreview(senderName)}
          </Text>
        </View>
      )}
    </View>
  );
};

export default memo(MessageBubble);
