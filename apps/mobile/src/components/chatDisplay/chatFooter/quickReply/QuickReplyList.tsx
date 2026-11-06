import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Paperclip, Zap } from "lucide-react-native";

import type { QuickReply } from "@/api/inbox/quickReplies/quickReplies.api";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { quickReplyToWhatsAppText } from "@/utils/quickReplyText";

/**
 * The `/` picker. In the composer's flow above the input, like `MentionList`, for
 * the same reason: a popup overflowing the footer is clipped on Android.
 */
export default function QuickReplyList({
  replies,
  isLoading,
  onSelect,
  isDark,
}: Readonly<{
  replies: QuickReply[];
  isLoading: boolean;
  onSelect: (reply: QuickReply) => void;
  isDark: boolean;
}>) {
  const t = getInboxRowTheme(isDark);
  const box = {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden" as const,
    backgroundColor: t.surface,
    borderColor: t.border1,
  };

  if (isLoading || !replies.length) {
    return (
      <View style={{ ...box, paddingVertical: 10, paddingHorizontal: 12 }}>
        {isLoading ? (
          <ActivityIndicator size="small" color={t.brand} />
        ) : (
          <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}>
            No quick replies found. Add them on the web in Inbox Settings.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={box}>
      <ScrollView
        // Without this the input blurs on the first tap and the pick is lost.
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 220 }}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {replies.map((reply) => {
          const preview = quickReplyToWhatsAppText(reply.text).replace(/\s+/g, " ").trim();
          return (
            <TouchableOpacity
              key={reply.id}
              onPress={() => onSelect(reply)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Zap size={14} color={t.brand} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13, fontFamily: "InstrumentSans_600SemiBold", color: t.fg1 }}
                >
                  /{(reply.key ?? "").replace(/^\//, "")}
                  <Text style={{ fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}>
                    {"  "}
                    {reply.topic}
                  </Text>
                </Text>
                {preview ? (
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: t.fg3 }}
                  >
                    {preview}
                  </Text>
                ) : null}
              </View>
              {reply.media?.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Paperclip size={12} color={t.fg3} />
                  <Text style={{ fontSize: 11, color: t.fg3 }}>{reply.media.length}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
