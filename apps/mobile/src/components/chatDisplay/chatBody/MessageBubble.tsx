import { View, Text, useColorScheme } from "react-native";
import React, { memo, useCallback } from "react";
import dayjs from "dayjs";
import WaInboxText, {
  WaInboxAudio,
  WaInboxDocument,
  WaInboxImage,
  WaInboxInteractive,
  WaInboxLocation,
  WaInboxSticker,
  WaInboxTemplate,
  WaInboxVideo,
} from "./messageBubbleTypes";
import { namePreview } from "@/utils/chatbox_utils";
import { WaTemplateComponent } from "@/context/type";
import { Lock, CheckCheck, Check, Clock, AlertCircle, Bot, Sparkles } from "lucide-react-native";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { getClosedIcon } from "@/util";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { IgAttachmentsBubble, IgStoryReplyBubble, QuotedMessage } from "./igBubbles";
import { DeletedMessage, IgCommentBubble, WaInboxContacts, WaInboxOrder } from "./specialBubbles";
import type { MessageReaction } from "@/utils/messageReactions";

type MessageBubbleProps = {
  messageContent: any;
  /** Set when the customer deleted the message: it shows as "This message was deleted". */
  deletedAt?: string | null;
  interactive?: any;
  timestamp: string;
  exchangeProcess: string;
  messageType?: string;
  senderName?: string;
  /**
   * Sent by an automation (auto-reply, survey, campaign, chatbot) rather than a
   * person, so there is no name to make initials from.
   */
  isAutomated?: boolean;
  /** Written by the Meta Business Agent: labelled "Meta AI", not "Automation". */
  isMetaAi?: boolean;
  template: any;
  templateComponentParams?: WaTemplateComponent[];
  assignStatus?: string;
  stats?: any;
  note?: { deleted: boolean; edited: boolean; deletedBy?: string };
  /** Instagram inline reply: the message it quotes (`message` is absent when not loaded). */
  quote?: {
    message?: React.ComponentProps<typeof QuotedMessage>["quoted"];
    author?: string | null;
  };
  /** Set when the customer edited the message (Instagram). */
  editedAt?: string | null;
  /** Emoji reactions on this message, drawn as a chip under the bubble. */
  reactions?: MessageReaction[];
};

const MessageBubble = ({
  messageContent,
  timestamp,
  exchangeProcess,
  messageType,
  senderName,
  isAutomated,
  isMetaAi,
  interactive,
  template,
  templateComponentParams,
  assignStatus,
  stats,
  note,
  quote,
  editedAt,
  reactions,
  deletedAt,
}: MessageBubbleProps) => {
  const renderContent = useCallback(
    // `onBrand`: drawn on the brand-blue bubble of an agent's own message, so media goes white.
    (textColor?: string, onBrand = false) => {
      // Notes keep their own "Note deleted" line (drawn by the note branch).
      if (deletedAt && exchangeProcess !== "privateNote") {
        return <DeletedMessage textColor={textColor} />;
      }
      switch (messageType) {
        case "text":
          return <WaInboxText messageContent={messageContent} textColor={textColor} />;
        case "image":
          return <WaInboxImage messageContent={messageContent} />;
        case "audio":
          return <WaInboxAudio messageContent={messageContent} onBrand={onBrand} />;
        case "document":
          return <WaInboxDocument messageContent={messageContent} onBrand={onBrand} />;
        case "video":
          return <WaInboxVideo messageContent={messageContent} onBrand={onBrand} />;
        case "location":
          return <WaInboxLocation messageContent={messageContent} onBrand={onBrand} />;
        case "reaction":
          return <Text style={{ fontSize: 20, color: textColor }}>{messageContent}</Text>;
        case "button":
          // The customer tapped a template's quick-reply button: show what it said.
          return <WaInboxText messageContent={messageContent ?? ""} textColor={textColor} />;
        case "contacts":
          return <WaInboxContacts messageContent={messageContent} onBrand={onBrand} />;
        case "order":
          return <WaInboxOrder messageContent={messageContent} onBrand={onBrand} />;
        case "sticker":
          return <WaInboxSticker messageContent={messageContent} />;
        case "ig_comment":
          return <IgCommentBubble messageContent={messageContent} textColor={textColor} />;
        case "template":
          return <WaInboxTemplate templateBody={template} parameters={templateComponentParams} />;
        case "interactive":
          return (
            <WaInboxInteractive interactiveBody={interactive} messageContent={messageContent} />
          );
        case "attachments":
        case "ig_shared_post":
          return (
            <IgAttachmentsBubble content={messageContent} textColor={textColor} onBrand={onBrand} />
          );
        case "ig_story_reply":
          return <IgStoryReplyBubble content={messageContent} textColor={textColor} />;
        case "ig_unsupported":
          return (
            <Text style={{ color: textColor, fontSize: 13, fontStyle: "italic" }}>
              Instagram didn&apos;t share this message&apos;s content
            </Text>
          );
        case "quickreply":
          return <WaInboxText messageContent={messageContent} textColor={textColor} />;
        default:
          let displayContent = messageContent;
          if (typeof messageContent === "object" && messageContent !== null) {
            displayContent = JSON.stringify(messageContent);
          }
          return <Text style={{ color: textColor, fontSize: 14 }}>{displayContent}</Text>;
      }
    },
    [
      messageContent,
      messageType,
      template,
      templateComponentParams,
      interactive,
      deletedAt,
      exchangeProcess,
    ],
  );

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);

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
                fontFamily: "InstrumentSans_700Bold",
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
                fontFamily: "InstrumentSans_400Regular",
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

  const isSender = exchangeProcess === "send";
  const isPrivateNote = exchangeProcess === "privateNote";
  // Automation has no person behind it, so it gets no avatar — matching the web
  // inbox, which drops the avatar and moves the robot into the header instead.
  const showAvatar = isSender && !isAutomated;

  // The design's internal note: a full-width cream card rather than a bubble.
  if (isPrivateNote) {
    return (
      <View style={{ width: "100%", paddingHorizontal: 8, marginBottom: 10 }}>
        <View
          style={{
            backgroundColor: t.note.bg,
            borderWidth: 1,
            borderColor: t.note.border,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 13,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <Lock color={t.note.label} size={11} />
            <Text
              style={{
                fontSize: 9,
                fontFamily: "Figtree_800ExtraBold",
                letterSpacing: 0.54,
                textTransform: "uppercase",
                color: t.note.label,
              }}
            >
              {senderName
                ? `Internal note · ${senderName}${timestamp ? ` · ${timestamp}` : ""}`
                : "Internal note"}
              {note?.edited && !note.deleted ? " · edited" : ""}
            </Text>
          </View>
          {note?.deleted ? (
            // The API clears a deleted note's text; the row stays so the thread shows the gap.
            <Text
              style={{
                fontSize: 13,
                fontFamily: "InstrumentSans_400Regular",
                fontStyle: "italic",
                color: t.note.label,
              }}
            >
              {note.deletedBy ? `Note deleted by ${note.deletedBy}` : "Note deleted"}
            </Text>
          ) : (
            renderContent(t.note.text)
          )}
        </View>
      </View>
    );
  }

  // An automated reply sits on the send side but keeps a muted fill rather than
  // the agent's brand blue, so a bot reply stays distinguishable from one a
  // person wrote. Same call the web inbox makes with its `muted` bubble variant.
  const bubbleBgColor = isAutomated ? t.surface2 : isSender ? Colors.brand.blue : t.surface;

  const bubbleTextColor = isSender && !isAutomated ? "#fff" : t.fg1;

  const timestampColor = t.fg4;

  // The customer changed the text after sending it (Instagram).
  const editedLabel = editedAt ? (
    <Text
      style={{ fontStyle: "italic" }}
      accessibilityLabel={`Edited ${dayjs(editedAt).format("DD MMM, h:mm A")}`}
    >
      {` · edited ${dayjs(editedAt).format("h:mm A")}`}
    </Text>
  ) : null;

  const authorLabelStyle = {
    fontSize: 9,
    fontFamily: "Figtree_800ExtraBold",
    color: t.fg4,
    textAlign: "right" as const,
  };

  // A picture or video nearly fills its bubble, with a thin frame, as in WhatsApp.
  const isVisualMedia =
    !deletedAt &&
    (messageType === "image" ||
      messageType === "video" ||
      messageType === "location" ||
      messageType === "sticker");
  const bubblePadding = isVisualMedia
    ? { padding: 4 }
    : { paddingVertical: 9, paddingHorizontal: 13 };

  const borderStyle = isSender
    ? {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 4,
      }
    : {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        borderBottomLeftRadius: 4,
      };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: isSender ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: showAvatar ? 8 : 0,
        width: "100%",
        marginBottom: 10,
        paddingHorizontal: 8,
      }}
    >
      {!isSender && (
        // Design: max-width 80%, `--bg-surface` with a `--border-1` hairline,
        // 9px/13px padding, time underneath at 10px.
        <View style={{ maxWidth: "80%" }}>
          <View
            style={{
              backgroundColor: bubbleBgColor,
              borderWidth: 1,
              borderColor: t.border1,
              ...borderStyle,
              ...bubblePadding,
            }}
          >
            {quote ? <QuotedMessage quoted={quote.message} author={quote.author} /> : null}
            {renderContent(bubbleTextColor)}
            {timestamp ? (
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "InstrumentSans_400Regular",
                  color: timestampColor,
                  marginTop: 3,
                  ...(isVisualMedia && { paddingHorizontal: 6, paddingBottom: 2 }),
                }}
              >
                {timestamp}
                {editedLabel}
              </Text>
            ) : null}
          </View>
          <ReactionChip reactions={reactions} align="start" isDark={isDark} />
        </View>
      )}

      {isSender && (
        // Design: author label above at 9px/800, blue bubble, time below.
        <View style={{ maxWidth: "80%", alignItems: "flex-end", gap: 3 }}>
          {isAutomated ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {isMetaAi ? <Sparkles size={11} color={t.fg4} /> : <Bot size={11} color={t.fg4} />}
              <Text style={authorLabelStyle}>{isMetaAi ? "Meta AI" : "Automation"}</Text>
            </View>
          ) : senderName ? (
            <Text style={authorLabelStyle}>{senderName}</Text>
          ) : null}

          <View
            style={{
              backgroundColor: bubbleBgColor,
              ...borderStyle,
              ...bubblePadding,
            }}
          >
            {quote ? (
              <QuotedMessage quoted={quote.message} author={quote.author} onSender={!isAutomated} />
            ) : null}
            {renderContent(bubbleTextColor, !isAutomated)}
          </View>
          <ReactionChip reactions={reactions} align="end" isDark={isDark} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text
              style={{
                fontSize: 10,
                fontFamily: "InstrumentSans_400Regular",
                color: timestampColor,
                textAlign: "right",
              }}
            >
              {timestamp}
              {editedLabel}
            </Text>
            <View>
              {(() => {
                if (stats?.read) return <CheckCheck size={12} color={t.brand} />;
                if (stats?.delivered) return <CheckCheck size={12} color={timestampColor} />;
                if (stats?.failed || stats?.error)
                  return <AlertCircle size={12} color={t.danger} />;
                if (stats?.sent) return <Check size={12} color={timestampColor} />;
                return <Clock size={11} color={timestampColor} />;
              })()}
            </View>
          </View>
        </View>
      )}

      {showAvatar && (
        <LinearGradient
          colors={[Colors.brand.blue, Colors.brand.blueLight]}
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
              fontFamily: "Figtree_900Black",
              fontSize: 10,
              color: "#fff",
            }}
          >
            {namePreview(senderName)}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
};

/** The reactions on a message, overlapping the bottom edge of its bubble as in WhatsApp. */
function ReactionChip({
  reactions,
  align,
  isDark,
}: {
  reactions?: MessageReaction[];
  align: "start" | "end";
  isDark: boolean;
}) {
  if (!reactions?.length) return null;
  const t = getInboxRowTheme(isDark);
  const label = reactions
    .map((r) => `${r.emoji} from ${r.from === "customer" ? "customer" : (r.by ?? "your team")}`)
    .join(", ");
  return (
    <View
      accessibilityLabel={`Reactions: ${label}`}
      style={{
        alignSelf: align === "start" ? "flex-start" : "flex-end",
        flexDirection: "row",
        gap: 2,
        marginTop: -8,
        marginHorizontal: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: t.surface,
        borderWidth: 1.5,
        borderColor: isDark ? Colors.dark.bg : Colors.light.bg,
      }}
    >
      {reactions.map((r) => (
        <Text key={r.from} style={{ fontSize: 13 }}>
          {r.emoji}
        </Text>
      ))}
    </View>
  );
}

export default memo(MessageBubble);
