import { useState } from "react";
import { Linking, Pressable, Text, View, useColorScheme } from "react-native";
import { ExternalLink, Film, History, ImageIcon, Link2, Paperclip } from "lucide-react-native";

import Image from "@/components/common/Image";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import {
  getMessagePreview,
  isReelAttachment,
  isSharedPostAttachment,
  type IgAttachmentItem,
  type IgStoryReplyContent,
} from "@/api/inbox/messages/utils";

import WaInboxText, {
  WaInboxAudio,
  WaInboxDocument,
  WaInboxImage,
  WaInboxVideo,
} from "./messageBubbleTypes";

const useTheme = () => getInboxRowTheme(useColorScheme() === "dark");

const openUrl = (url?: string) => {
  if (url) Linking.openURL(url).catch(() => undefined);
};

const isInstagramPage = (url: string) => /^https?:\/\/([^/]+\.)?instagram\.com\//i.test(url);

/** A post or reel the customer shared into the chat: thumbnail, title, link out. */
export function IgSharedPostCard({ attachment }: { attachment: IgAttachmentItem }) {
  const t = useTheme();
  const reel = isReelAttachment(attachment.type);
  const url = attachment.content;
  // Meta's CDN link may be a video file or expired; a placeholder stands in when it won't load.
  const [failed, setFailed] = useState(!url);
  const Icon = reel ? Film : ImageIcon;
  const linkLabel = isInstagramPage(url) ? "Open on Instagram" : reel ? "Open reel" : "Open post";

  return (
    <View
      style={{
        width: 220,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: t.border1,
        backgroundColor: t.surface,
      }}
    >
      {failed ? (
        <View
          style={{
            height: 110,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.surface2,
          }}
        >
          <Icon size={28} color={t.fg4} />
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={{ width: "100%", height: 200 }}
          contentFit="cover"
          recyclingKey={url}
          onError={() => setFailed(true)}
          accessibilityLabel={reel ? "Shared reel" : "Shared post"}
        />
      )}
      <View style={{ padding: 10, gap: 6 }}>
        <Text style={{ fontSize: 11, color: t.fg3, fontFamily: "InstrumentSans_400Regular" }}>
          {reel ? "Shared a reel" : "Shared a post"}
        </Text>
        {attachment.title ? (
          <Text numberOfLines={3} style={{ fontSize: 13, color: t.fg1 }}>
            {attachment.title}
          </Text>
        ) : null}
        {url ? (
          <Pressable
            onPress={() => openUrl(url)}
            accessibilityRole="link"
            accessibilityLabel={linkLabel}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={{ fontSize: 12, color: t.brand, fontFamily: "InstrumentSans_700Bold" }}>
              {linkLabel}
            </Text>
            <ExternalLink size={12} color={t.brand} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** A story picture that can expire. */
function StoryImage({ url, size }: { url?: string; size: { width: number; height: number } }) {
  const t = useTheme();
  const [failed, setFailed] = useState(!url);
  if (failed) {
    return (
      <View
        style={{
          ...size,
          borderRadius: 8,
          backgroundColor: t.surface2,
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
          gap: 4,
        }}
      >
        <History size={16} color={t.fg4} />
        <Text style={{ fontSize: 9, color: t.fg3, textAlign: "center" }}>
          Story no longer available
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ ...size, borderRadius: 8 }}
      contentFit="cover"
      recyclingKey={url}
      onError={() => setFailed(true)}
      accessibilityLabel="Story"
    />
  );
}

/** "Replied to your story", the story it answered, then what the customer wrote. */
export function IgStoryReplyBubble({
  content,
  textColor,
}: {
  content: IgStoryReplyContent;
  textColor?: string;
}) {
  const t = useTheme();
  const sticker = content.story.linkStickerUrl;
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 8,
          borderRadius: 10,
          backgroundColor: t.surface2,
          alignSelf: "flex-start",
        }}
      >
        <StoryImage url={content.story.url} size={{ width: 64, height: 96 }} />
        <View style={{ gap: 4, flexShrink: 1 }}>
          <Text style={{ fontSize: 12, color: t.fg1 }}>Replied to your story</Text>
          {sticker ? (
            <Pressable
              onPress={() => openUrl(sticker)}
              accessibilityRole="link"
              accessibilityLabel="Story link"
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Link2 size={12} color={t.brand} />
              <Text style={{ fontSize: 12, color: t.brand }}>Story link</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {content.text ? <WaInboxText messageContent={content.text} textColor={textColor} /> : null}
    </View>
  );
}

/** One attachment of an Instagram/Messenger DM. */
function IgAttachment({
  attachment,
  onBrand = false,
}: {
  attachment: IgAttachmentItem;
  onBrand?: boolean;
}) {
  const t = useTheme();
  if (isSharedPostAttachment(attachment.type)) return <IgSharedPostCard attachment={attachment} />;
  switch (attachment.type) {
    case "image":
    case "sticker":
      return <WaInboxImage messageContent={attachment.content} />;
    case "video":
      return <WaInboxVideo messageContent={attachment.content} onBrand={onBrand} />;
    case "audio":
      return <WaInboxAudio messageContent={attachment.content} onBrand={onBrand} />;
    case "file":
      return <WaInboxDocument messageContent={attachment.content} onBrand={onBrand} />;
    case "story_mention":
      return (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, color: t.fg1 }}>Mentioned you in their story</Text>
          <StoryImage url={attachment.content} size={{ width: 160, height: 240 }} />
        </View>
      );
    case "ephemeral":
      return <Text style={{ fontSize: 12, color: t.fg3 }}>Disappearing media</Text>;
    default:
      // `story`, `ig_story`, `media`, `fallback` and anything newer.
      return (
        <Pressable
          disabled={!attachment.content}
          onPress={() => openUrl(attachment.content)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Paperclip size={14} color={t.fg3} />
          <Text style={{ fontSize: 12, color: attachment.content ? t.brand : t.fg3 }}>
            {attachment.content ? "Open attachment" : "This attachment can't be shown here"}
          </Text>
        </Pressable>
      );
  }
}

/** `attachments` and `ig_shared_post` messages. */
export function IgAttachmentsBubble({
  content,
  textColor,
  onBrand = false,
}: {
  content?: { attachments?: IgAttachmentItem[]; text?: string } | null;
  textColor?: string;
  /** On the brand-blue bubble of an agent's own message. */
  onBrand?: boolean;
}) {
  const attachments = content?.attachments ?? [];
  return (
    <View style={{ gap: 10 }}>
      {attachments.map((attachment, index) => (
        <IgAttachment key={index} attachment={attachment} onBrand={onBrand} />
      ))}
      {content?.text ? <WaInboxText messageContent={content.text} textColor={textColor} /> : null}
    </View>
  );
}

/** The message an inline reply quotes, drawn above the reply. */
export function QuotedMessage({
  quoted,
  author,
  onSender,
}: {
  /** The quoted message, when it is among the loaded messages. */
  quoted?: {
    deletedAt?: string | null;
    messageBody?: { exchangeProcess?: "send" | "receive" | "internal" | "privateNote" } | null;
  } | null;
  author?: string | null;
  /** Drawn inside the agent's brand-blue bubble, so it needs light text. */
  onSender?: boolean;
}) {
  const t = useTheme();
  const fg = onSender ? "rgba(255,255,255,0.85)" : t.fg3;
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderLeftColor: onSender ? "#fff" : t.brand,
        backgroundColor: onSender ? "rgba(255,255,255,0.15)" : t.surface2,
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 6,
        gap: 2,
      }}
    >
      {quoted ? (
        <>
          {author ? (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "InstrumentSans_700Bold",
                color: onSender ? "#fff" : t.fg1,
              }}
            >
              {author}
            </Text>
          ) : null}
          <Text numberOfLines={2} style={{ fontSize: 12, color: fg }}>
            {quoted.deletedAt ? "This message was deleted" : getMessagePreview(quoted)}
          </Text>
        </>
      ) : (
        <Text style={{ fontSize: 12, color: fg, fontStyle: "italic" }}>
          Original message not loaded
        </Text>
      )}
    </View>
  );
}
