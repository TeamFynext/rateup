import { useColorScheme } from "nativewind";
import React, { memo, useMemo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Image as ImageIcon, MessageCircle, Star, UserPlus } from "lucide-react-native";
import { ContactsWithLastMessage, WaMessageAssignStatus } from "@/api/inbox/types";
import { namePreview } from "../../utils/chatbox_utils";
import { MessagePlatform } from "@/constants/enums";
import { WaMessageClosedStatus } from "@/constants/constants";
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

const STATUS_LABEL: Record<InboxStatusTone, string> = {
  new: "New",
  assigned: "Assigned",
  closed: "Closed",
};

/**
 * The lifecycle status shown on a row — derived, never read straight off the
 * stored field, mirroring rateup-ui's `getDerivedStatus` and the design's `ST`:
 *   closed   → the ticket is in any closed state (Closed/Spam/Resolved/Unresolved)
 *   assigned → somebody owns it
 *   new      → nobody owns it yet
 *
 * The ticket's own `conversationStatus` wins over the contact's
 * `waMessageAssignStatus`: a contact can hold several tickets. Showing the stored
 * value used to give one ticket four different colours — "Unassigned" beside
 * "New", "Resolved" in the same green as "Assigned" — and a row could read
 * "Assigned" with nobody on it.
 */
export function getDerivedStatus(contact: {
  conversationStatus?: string | null;
  waMessageAssignStatus?: string | null;
  assignedUsers?: unknown[] | null;
}): InboxStatusTone {
  const status = (contact.conversationStatus ??
    contact.waMessageAssignStatus) as WaMessageAssignStatus;
  if (WaMessageClosedStatus.includes(status)) return "closed";
  return contact.assignedUsers?.length ? "assigned" : "new";
}

/** How long a New row keeps the cream highlight. */
export const NEW_ROW_HIGHLIGHT_MS = 24 * 60 * 60 * 1000;

/**
 * True when `iso` is within the last {@link NEW_ROW_HIGHLIGHT_MS}.
 *
 * The API hands back UTC timestamps, but not always with a zone suffix
 * (`2026-09-17T09:12:44.000` as often as `...Z`). `Date.parse` reads a bare one
 * as *local* time, which on an IST phone shifted every row 5.5h into the past
 * and dropped the highlight half a day early — so a missing zone is spelled out
 * as UTC before parsing, the same assumption `dayjs.utc` makes in `inbox.tsx`.
 */
export function isWithinLastDay(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  const ms = Date.parse(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(ms)) return false;
  // A future timestamp is clock skew between the server and the phone, not an
  // old message — it stays fresh rather than falling out of the window.
  return now - ms <= NEW_ROW_HIGHLIGHT_MS;
}

function channelIcon(platform: string | undefined, color = "#fff", size = 11) {
  switch (platform) {
    case MessagePlatform.WHATSAPP:
      return <FontAwesome name="whatsapp" color={color} size={size} />;
    case MessagePlatform.INSTAGRAM:
      return <FontAwesome name="instagram" color={color} size={size} />;
    case MessagePlatform.FACEBOOK:
      return <FontAwesome name="facebook" color={color} size={size - 1} />;
    case MessagePlatform.WEBCHAT:
      return <MessageCircle color={color} size={size - 1} />;
    default:
      return null;
  }
}

type ChipProps = {
  label?: string;
  color: string;
  background: string;
  /** Status pills carry a 5px leading dot; label chips don't. */
  dot?: string;
  /** Outlined chips (the channel) read as metadata next to the filled ones. */
  border?: string;
  /** A channel the org no longer has connected is dashed, so it tells apart at a glance. */
  dashed?: boolean;
  /** Leading glyph — the channel pill puts its platform icon here. */
  icon?: React.ReactNode;
};

function Chip({ label, color, background, dot, border, dashed, icon }: ChipProps) {
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
        ...(border
          ? { borderWidth: 1, borderColor: border, borderStyle: dashed ? "dashed" : "solid" }
          : null),
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
      {icon}
      {label ? (
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, fontFamily: "InstrumentSans_700Bold", color }}
        >
          {label}
        </Text>
      ) : null}
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
  /** Which of the org's numbers/accounts the ticket came in on — see `resolveChannel`. */
  channelLabel?: string;
  /** False when that number is no longer connected; the chip then reads dashed. */
  channelConnected?: boolean;
  /** Who sent the last message when it is an outgoing send — see `getLastMessageSender`. */
  lastMessageSender?: string;
  /**
   * The raw timestamp of the row's newest message, for the 24h cream highlight.
   *
   * Separate from `lastMessageTimeStamp`, which the list hands down already
   * formatted ("2 hours ago") and so cannot be compared against.
   */
  lastMessageAt?: string | null;
};

const ChatBox: React.FC<ChatBoxProps> = ({
  id,
  name,
  phone,
  platform,
  lastMessage,
  lastMessageSender,
  lastMessageTimeStamp,
  unReadMessageCount,
  waMessageAssignStatus,
  conversationStatus,
  lifecycleId,
  ticketNumber,
  isFavorite,
  contactLabels,
  assignedUsers,
  onPress,
  onAssignPress,
  selected,
  currentUserId,
  channelLabel,
  channelConnected,
  lastMessageAt,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = useMemo(() => getInboxRowTheme(isDark), [isDark]);

  const isUnread = unReadMessageCount > 0;

  const avatarColor = useMemo(
    () => inboxAvatarColors[paletteIndex(id, inboxAvatarColors.length)],
    [id],
  );

  const status = useMemo(() => {
    const tone = getDerivedStatus({ conversationStatus, waMessageAssignStatus, assignedUsers });
    return { tone, label: STATUS_LABEL[tone] };
  }, [conversationStatus, waMessageAssignStatus, assignedUsers]);
  const statusTone = t.status[status.tone];

  // Design `selBg` / `edgeColor`: the selected row paints brand-soft with a brand
  // edge; otherwise a *freshly* New ticket — nobody owns it and its newest
  // message landed in the last 24h — paints cream with the warm edge, so
  // unclaimed work that is still actionable stands out in the list. Every other
  // row, an older New one included, stays transparent over the page and says
  // what it is through the status chip alone.
  //
  // The design's `isFreshNew` gates the fill and the edge together on that same
  // 24h window, and both go here for the same reason: a queue where every
  // unclaimed ticket is cream is a queue with no highlight at all.
  const isNew = status.tone === "new";
  const isFreshlyNew = isNew && isWithinLastDay(lastMessageAt);
  const rowBg = selected ? t.brandSoft : isFreshlyNew ? t.newRowBg : "transparent";
  const edgeColor = selected ? t.brand : isFreshlyNew ? statusTone.color : null;

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
    return lowerMsg.includes("image") || lowerMsg.includes("photo") || lowerMsg.includes("📷");
  }, [lastMessage]);

  const channelColor = platform ? inboxChannelColors[platform] : undefined;
  /** The pill shows for any known platform; the source label fills in when we can name it. */
  const channelPill = !!channelColor || !!channelLabel;
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
              fontFamily: "Figtree_800ExtraBold",
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
      {/* The edge is a filled bar, not `borderLeftWidth`: Android drew a thick
          single-side border as a hairline. 8px wide (the design draws 3px;
          widened so it reads on a phone), sitting inside the 16px padding so the
          content does not move. */}
      {edgeColor ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: edgeColor,
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
              fontFamily: "Figtree_800ExtraBold",
            }}
          >
            {namePreview(name)}
          </Text>
        </View>
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
                fontFamily: "InstrumentSans_700Bold",
                color: t.fg1,
                flexShrink: 1,
              }}
            >
              {name || phone}
            </Text>
          </View>

          {/* Ticket code + latest message, on one line.
              This used to be two lines: the ticket subject above, the message
              snippet below. The subject is auto-derived from the message that
              opened the ticket, so for the many chats that open with a bare
              "hi" the row showed two message-shaped lines — an old greeting
              stacked on the current message — and read as two messages. The
              latest message is the useful one, so it takes the slot. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            {code ? (
              <Text style={{ fontSize: 12, color: t.fg4, fontFamily: MONO }}>#{code}</Text>
            ) : null}
            {isPhoto ? <ImageIcon size={14} color={t.fg3} /> : null}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontFamily: "InstrumentSans_400Regular",
                color: t.fg3,
                flex: 1,
              }}
            >
              {/* An outgoing send names who sent it. Nested in the same
                  one-line Text, so the name always shows in full (it is
                  capped at 20 characters upstream) and the message after it
                  takes the ellipsis. */}
              {lastMessageSender ? (
                <Text style={{ fontFamily: "Nunito_700Bold", color: t.fg2 }}>
                  {lastMessageSender}:{" "}
                </Text>
              ) : null}
              {lastMessage || ""}
            </Text>
          </View>

          {/* Chips */}
          {status || lifecycleInfo || channelPill || contactLabels?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {/* Platform + which of the org's numbers/accounts the ticket came in
                  on, in one pill: the icon says WhatsApp/Instagram/Facebook, the
                  label says which account within it. The label is dropped when
                  the source can't be named (webchat, pre-identifier messages), so
                  the pill still carries the platform on its own. */}
              {channelPill ? (
                <Chip
                  label={channelLabel}
                  color={t.fg3}
                  background={tint(channelColor, 0.1, t.brandSoft)}
                  border={channelConnected === false ? t.fg4 : t.border1}
                  dashed={channelConnected === false}
                  icon={channelIcon(platform, channelColor ?? t.fg3, 11)}
                />
              ) : null}

              <Chip
                label={status.label}
                color={statusTone.fg}
                background={statusTone.soft}
                dot={statusTone.color}
              />

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
                fontFamily: "InstrumentSans_400Regular",
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
                <Text
                  style={{ color: t.onAccent, fontSize: 11, fontFamily: "Figtree_800ExtraBold" }}
                >
                  {unReadMessageCount > 99 ? "99+" : unReadMessageCount}
                </Text>
              </View>
            ) : (
              renderAssigneeBadge()
            )}
          </View>
          {isUnread ? <View style={{ marginTop: 6 }}>{renderAssigneeBadge()}</View> : null}
        </View>
      </View>
    </Pressable>
  );
};

export default memo(ChatBox);
