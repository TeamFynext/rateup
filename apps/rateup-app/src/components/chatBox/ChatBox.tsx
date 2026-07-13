import { useColorScheme } from "nativewind";
import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { Image as ImageIcon } from "lucide-react-native";
import { ContactsWithLastMessage } from "@/api/inbox/types";
import { namePreview } from "../../utils/chatbox_utils";
import { MessagePlatform } from "@/constants/enums";
import { getSoucePlatformIconAndColor } from "@/util";
import { useLifecycleContext } from "@/context/LifecycleContext";
import { Colors, avatarGradients } from "@/constants/colors";

interface AvatarProps {
  initials: string;
  gradient: readonly [string, string];
  isDark: boolean;
}

function Avatar({ initials, gradient }: AvatarProps) {
  return (
    <LinearGradient
      colors={gradient as any}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 16,
          fontFamily: "Nunito_700Bold",
        }}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
}

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
  lifecycleId,
  onPress,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const isUnread = unReadMessageCount > 0;

  const gradient = useMemo(() => {
    if (!id) return avatarGradients[0];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % avatarGradients.length;
    return avatarGradients[index];
  }, [id]);

  const rowBgColor = isUnread
    ? isDark
      ? Colors.dark.unreadBg
      : Colors.light.unreadBg
    : isDark
      ? "transparent"
      : Colors.light.card;

  const statusStyle = isUnread
    ? {
        color: isDark ? Colors.accent.cyan : Colors.brand.blue,
        backgroundColor: isDark ? Colors.dark.cyanBg : Colors.light.activeBg,
        fontFamily: "Nunito_600SemiBold",
      }
    : {
        color: isDark ? Colors.dark.statusText : Colors.light.statusText,
        backgroundColor: isDark
          ? Colors.dark.statusBg
          : Colors.light.statusBg,
        fontFamily: "Nunito_400Regular",
      };

  const lifeCycleLabels = useLifecycleContext();
  const lifecycleInfo = useMemo(() => {
    return lifeCycleLabels?.find((label: any) => label.id === lifecycleId);
  }, [lifecycleId, lifeCycleLabels]);

  const isPhoto = useMemo(() => {
    const lowerMsg = (lastMessage || "").toLowerCase();
    return lowerMsg.includes("image") || lowerMsg.includes("photo") || lowerMsg.includes("📷");
  }, [lastMessage]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 14,
        paddingRight: 20,
        paddingLeft: isUnread ? 20 : 23,
        flexDirection: "row",
        gap: 13,
        alignItems: "center",
        backgroundColor: rowBgColor,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
        borderLeftWidth: isUnread ? 3 : 0,
        borderLeftColor: isUnread
          ? isDark
            ? Colors.accent.cyan
            : Colors.brand.blue
          : "transparent",
      }}
    >
      {/* Avatar Container */}
      <View style={{ position: "relative" }}>
        <Avatar
          initials={namePreview(name)}
          gradient={gradient}
          isDark={isDark}
        />
        {platform && (
          <View
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: platform === MessagePlatform.WHATSAPP
                ? Colors.accent.whatsapp
                : platform === MessagePlatform.INSTAGRAM
                  ? "#E1306C"
                  : Colors.brand.blue,
              borderWidth: 1.5,
              borderColor: rowBgColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ transform: [{ scale: 0.75 }] }}>
              {getSoucePlatformIconAndColor(platform)?.icon}
            </View>
          </View>
        )}
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Name and Time Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 3,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontFamily: isUnread ? "Nunito_700Bold" : "Nunito_600SemiBold",
              color: isDark
                ? isUnread
                  ? "#fff"
                  : Colors.dark.textSecondary
                : isUnread
                  ? Colors.light.textPrimary
                  : Colors.light.textSecondary,
              flex: 1,
              marginRight: 8,
            }}
          >
            {name || phone}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Nunito_400Regular",
                color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
              }}
            >
              {lastMessageTimeStamp}
            </Text>
            {isUnread && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isDark
                    ? Colors.accent.cyan
                    : Colors.brand.blue,
                }}
              />
            )}
          </View>
        </View>

        {/* Message Snippet Preview */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            marginBottom: 7,
          }}
        >
          {isPhoto && (
            <ImageIcon
              size={13}
              color={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
            />
          )}
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontFamily: "Nunito_400Regular",
              color: isDark ? Colors.dark.textSubtle : Colors.light.textSubtle,
              flex: 1,
            }}
          >
            {lastMessage || ""}
          </Text>
        </View>

        {/* Status and Lifecycle Badges */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {waMessageAssignStatus && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: statusStyle.backgroundColor,
                borderRadius: 999,
                paddingVertical: 3,
                paddingHorizontal: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: statusStyle.fontFamily,
                  color: statusStyle.color,
                  letterSpacing: 0.2,
                }}
              >
                {waMessageAssignStatus}
              </Text>
            </View>
          )}

          {lifecycleInfo && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: isDark ? "rgba(24,115,232,0.15)" : Colors.light.activeBg,
                borderRadius: 999,
                paddingVertical: 3,
                paddingHorizontal: 10,
                borderWidth: isDark ? 1 : 0,
                borderColor: Colors.brand.blueLight,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Nunito_600SemiBold",
                  color: isDark ? Colors.accent.cyan : Colors.brand.blue,
                  letterSpacing: 0.2,
                }}
              >
                {lifecycleInfo.emoji + " " + lifecycleInfo.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default memo(ChatBox);