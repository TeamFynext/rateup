import { useColorScheme } from "nativewind";
import React, { memo, useMemo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import {
  Image as ImageIcon,
  MessageCircle,
  Star,
  UserPlus,
} from "lucide-react-native";
import {
  ContactsWithLastMessage,
  WaMessageAssignStatus,
} from "@/api/inbox/types";
import { namePreview } from "../../utils/chatbox_utils";
import { MessagePlatform } from "@/constants/enums";
import { useLifecycleContext } from "@/context/LifecycleContext";
import {
  getInboxRowTheme,
  inboxAssigneeColors,
  inboxAvatarColors,
  inboxChannelColors,
  inboxSelfAssigneeColor,
  InboxStatusTone,
  paletteIndex,
  tint,
} from "@/constants/inboxDesign";

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

/** Maps the inbox's storage vocabulary onto the design's three pill tones. */
const STATUS_TONE: Record<string, { tone: InboxStatusTone; label: string }> = {
  [WaMessageAssignStatus.NEW]: { tone: "open", label: "New" },
  [WaMessageAssignStatus.UNASSIGNED]: { tone: "pending", label: "Unassigned" },
  [WaMessageAssignStatus.ASSIGNED]: { tone: "open", label: "Assigned" },
  [WaMessageAssignStatus.CLOSED]: { tone: "closed", label: "Closed" },
  [WaMessageAssignStatus.RESOLVED]: { tone: "open", label: "Resolved" },
  [WaMessageAssignStatus.UNRESOLVED]: { tone: "pending", label: "Unresolved" },
  [WaMessageAssignStatus.SPAM]: { tone: "spam", label: "Spam" },
};

function channelIcon(platform: string | undefined) {
  switch (platform) {
    case MessagePlatform.WHATSAPP:
      return <FontAwesome name="whatsapp" color="#fff" size={11} />;
    case MessagePlatform.INSTAGRAM:
      return <FontAwesome name="instagram" color="#fff" size={11} />;
    case MessagePlatform.FACEBOOK:
      return <FontAwesome name="facebook" color="#fff" size={10} />;
    case MessagePlatform.WEBCHAT:
      return <MessageCircle color="#fff" size={10} />;
    default:
      return null;
  }
}

type ChipProps = {
  label: string;
  color: string;
  background: string;
  /** Status pills carry a 5px leading dot; label chips don't. */
  dot?: string;
};

function Chip({ label, color, background, dot }: ChipProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 9999,
        backgroundColor: background,
      }}
    >
      {dot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dot,
          }}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, fontFamily: "Nunito_700Bold", color }}
      >
        {label}
      </Text>
    </View>
  );
}

export type ChatBoxProps = ContactsWithLastMessage & {
  onPress?: () => void;
  /** Tapping the "assign" affordance on an unassigned row. */
  onAssignPress?: () => void;
  /** Highlights the row with the design's brand-soft fill. */
  selected?: boolean;
  /** Used to pick the warm "you" capsule for the assignee chip. */
  currentUserId?: string;
};

const ChatBox: React.FC<ChatBoxProps> = ({
  id,
  name,
  phone,
  platform,
  lastMessage,
  lastMessageTimeStamp,
  unReadMessageCount,
  waMessageAssignStatus,
  lifecycleId,
  ticketNumber,
  ticketSubject,
  isFavorite,
  contactLabels,
  assignedUsers,
  onPress,
  onAssignPress,
  selected,
  currentUserId,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = useMemo(() => getInboxRowTheme(isDark), [isDark]);

  // Rows are transparent over the screen's `--bg-page` in the design; only the
  // selected row paints, with brand-soft.
  const rowBg = selected ? t.brandSoft : "transparent";
  const isUnread = unReadMessageCount > 0;

  const avatarColor = useMemo(
    () => inboxAvatarColors[paletteIndex(id, inboxAvatarColors.length)],
    [id],
  );

  const status = waMessageAssignStatus
    ? (STATUS_TONE[waMessageAssignStatus] ?? {
      tone: "closed" as InboxStatusTone,
      label: waMessageAssignStatus,
    })
    : null;
  const statusTone = status ? t.status[status.tone] : null;

  const lifeCycleLabels = useLifecycleContext();
  const lifecycleInfo = useMemo(
    () => lifeCycleLabels?.find((label: any) => label.id === lifecycleId),
    [lifecycleId, lifeCycleLabels],
  );

  const assignee = useMemo(() => {
    const first = Array.isArray(assignedUsers) ? assignedUsers[0] : null;
    if (!first) return null;
    const userId = first.id ?? first.userId ?? first.assignedUserId;
    const display = first.name ?? first.userName ?? "";
    const isSelf = !!currentUserId && userId === currentUserId;
    const swatch = isSelf
      ? inboxSelfAssigneeColor
      : inboxAssigneeColors[paletteIndex(userId, inboxAssigneeColors.length)];
    return {
      initials: namePreview(display) || "?",
      extra: (assignedUsers?.length ?? 0) - 1,
      ...swatch,
    };
  }, [assignedUsers, currentUserId]);

  const isPhoto = useMemo(() => {
    const lowerMsg = (lastMessage || "").toLowerCase();
    return (
      lowerMsg.includes("image") ||
      lowerMsg.includes("photo") ||
      lowerMsg.includes("📷")
    );
  }, [lastMessage]);

  const channelColor = platform ? inboxChannelColors[platform] : undefined;
  const code = ticketNumber != null ? `${ticketNumber}` : null;

  const renderAssigneeBadge = () => {
    if (assignee) {
      return (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: assignee.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: assignee.fg,
              fontSize: 11,
              fontFamily: "Nunito_800ExtraBold",
            }}
          >
            {assignee.extra > 0 ? `+${assignee.extra + 1}` : assignee.initials}
          </Text>
        </View>
      );
    }
    return (
      <Pressable
        onPress={onAssignPress ?? onPress}
        hitSlop={8}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: t.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <UserPlus size={14} color={t.brand} />
      </Pressable>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: t.brandSoft }}
      style={{
        flexDirection: "row",
        backgroundColor: rowBg,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "#2A2A2A" : "#F4F4F5",
      }}
    >
      {selected ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 16,
            bottom: 16,
            width: 3,
            backgroundColor: statusTone?.color || t.brand,
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
          }}
        />
      ) : null}

      {/* Left Column */}
      <View style={{ width: 46, alignItems: "center", marginRight: 12, paddingBottom: 4 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: avatarColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontFamily: "Nunito_800ExtraBold",
            }}
          >
            {namePreview(name)}
          </Text>
        </View>

        {/* Spacer to push channel icon down */}
        <View style={{ flex: 1, minHeight: 12 }} />

        {channelColor ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: channelColor,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "flex-end", // Aligns it to the right to be inline with chips
            }}
          >
            {channelIcon(platform)}
          </View>
        ) : null}
      </View>

      {/* Right Column Container */}
      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* Main Content */}
        <View style={{ flex: 1, paddingRight: 8, flexDirection: "column", gap: 4 }}>
          {/* Name Row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {isFavorite ? <Star size={14} color={t.warm} fill={t.warm} /> : null}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 16,
                fontFamily: "Nunito_700Bold",
                color: t.fg1,
                flexShrink: 1,
              }}
            >
              {name || phone}
            </Text>
          </View>

          {/* Ticket Info */}
          {code || ticketSubject ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              {code ? (
                <Text style={{ fontSize: 12, color: t.fg4, fontFamily: MONO }}>
                  #{code}
                </Text>
              ) : null}
              {ticketSubject ? (
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontFamily: "Nunito_600SemiBold",
                    color: t.fg2,
                    flexShrink: 1,
                  }}
                >
                  {ticketSubject}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Snippet */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
            {isPhoto ? <ImageIcon size={14} color={t.fg3} /> : null}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontFamily: "Nunito_400Regular",
                color: t.fg3,
                flex: 1,
              }}
            >
              {lastMessage || ""}
            </Text>
          </View>

          {/* Chips */}
          {status || lifecycleInfo || contactLabels?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {status && statusTone ? (
                <Chip
                  label={status.label}
                  color={statusTone.fg}
                  background={statusTone.soft}
                  dot={statusTone.color}
                />
              ) : null}

              {lifecycleInfo ? (
                <Chip
                  label={`${lifecycleInfo.emoji} ${lifecycleInfo.name}`}
                  color={t.brand}
                  background={t.brandSoft}
                />
              ) : null}

              {contactLabels?.map((label) => (
                <Chip
                  key={label.id}
                  label={label.name}
                  color={label.color || t.brand}
                  background={tint(label.color, 0.1, t.brandSoft)}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Trailing Column */}
        <View style={{ alignItems: "flex-end", paddingTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Nunito_400Regular",
                color: t.fg4,
              }}
            >
              {lastMessageTimeStamp}
            </Text>
            {isUnread ? (
              <View
                style={{
                  backgroundColor: t.success,
                  borderRadius: 11,
                  paddingHorizontal: 8,
                  height: 22,
                  minWidth: 22,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Nunito_800ExtraBold" }}>
                  {unReadMessageCount > 99 ? "99+" : unReadMessageCount}
                </Text>
              </View>
            ) : (
              renderAssigneeBadge()
            )}
          </View>
          {isUnread ? (
            <View style={{ marginTop: 6 }}>
              {renderAssigneeBadge()}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

export default memo(ChatBox);
