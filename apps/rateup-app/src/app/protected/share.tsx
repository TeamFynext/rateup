import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useShareIntentContext } from "expo-share-intent";
import { Search, VideoIcon, X } from "lucide-react-native";
import Image from "@/components/common/Image";
import { Colors } from "@/constants/colors";
import { useContactsStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";
import { useSharedFilesStore } from "@/utils/sharedFiles";
import { isSessionWindowOpen } from "@/utils/sessionWindow";
import { toFileUri } from "@/utils/attachments";
import { Toast } from "@/components/common/Notice";

function contactName(c: any): string {
  return c.name || c.whatsappUserName || c.igsId || c.phone || "Unknown";
}

function lastActivity(c: any) {
  return new Date(c.lastMessage?.waCreatedAt ?? c.conversationLastMessageAt ?? 0).getTime();
}

/**
 * "Send to": where photos and videos shared in from another app (the Photos app, the
 * Android gallery) are pointed at a chat, as in WhatsApp. Picking a chat opens it with
 * the files attached and the preview showing, ready for a caption.
 */
export default function ShareScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = isDark ? Colors.dark : Colors.light;
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const files = shareIntent.files ?? [];
  const contactsById = useContactsStore((s) => s.contactsById);
  const setSelectedContact = useSelectedContactStore((s) => s.setSelectedContact);
  const setPending = useSharedFilesStore((s) => s.setPending);
  const [query, setQuery] = useState("");

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...contactsById.values()]
      .filter(
        (c) =>
          !q ||
          contactName(c).toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => lastActivity(b) - lastActivity(a));
  }, [contactsById, query]);

  const close = () => {
    resetShareIntent();
    if (router.canGoBack()) router.back();
    else router.replace("/protected/inbox" as never);
  };

  const choose = (contact: any) => {
    // Attachments are free-form messages, which only go out inside the reply window.
    if (!isSessionWindowOpen(contact)) {
      Toast.info(
        `${contactName(contact)}'s 24-hour reply window is closed. Send a template first.`,
      );
      return;
    }
    setPending(contact.id, files);
    setSelectedContact({ ...contact, sessionActive: true });
    resetShareIntent();
    router.replace(`/protected/chat/${contact.id}` as never);
  };

  const photos = files.filter((f) => f.mimeType?.startsWith("image/")).length;
  const videos = files.length - photos;
  const summary = [
    photos && `${photos} photo${photos > 1 ? "s" : ""}`,
    videos && `${videos} video${videos > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? t.bg : "white" }}>
      <View className="flex-row items-center px-4 pt-3 pb-2 gap-3">
        <Pressable
          onPress={close}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <X size={22} color={t.textPrimary} />
        </Pressable>
        <View className="flex-1">
          <Text
            style={{ color: t.textPrimary, fontSize: 17, fontFamily: "InstrumentSans_700Bold" }}
          >
            Send to…
          </Text>
          {!!summary && <Text style={{ color: t.textMuted, fontSize: 12 }}>{summary}</Text>}
        </View>
      </View>

      {files.length > 0 && (
        <FlatList
          horizontal
          data={files}
          keyExtractor={(f, i) => `${f.path}-${i}`}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 8 }}
          renderItem={({ item }) =>
            item.mimeType?.startsWith("video/") ? (
              <View
                style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: t.surface }}
                className="items-center justify-center"
              >
                <VideoIcon size={18} color={t.textMuted} />
              </View>
            ) : (
              <Image
                source={{ uri: toFileUri(item.path) }}
                style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: t.surface }}
                contentFit="cover"
              />
            )
          }
        />
      )}

      <View
        className="flex-row items-center mx-4 mb-2 px-3 rounded-xl gap-2"
        style={{ backgroundColor: t.inputBg, height: 40 }}
      >
        <Search size={16} color={t.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={t.textPlaceholder}
          autoCorrect={false}
          style={{ flex: 1, color: t.textPrimary, fontSize: 14, padding: 0 }}
        />
      </View>

      {contactsById.size === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <ActivityIndicator />
          <Text style={{ color: t.textMuted }}>Loading your chats…</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={{ color: t.textMuted, textAlign: "center", marginTop: 24 }}>
              No chats match “{query}”.
            </Text>
          }
          renderItem={({ item }) => {
            const open = isSessionWindowOpen(item);
            const name = contactName(item);
            return (
              <Pressable
                onPress={() => choose(item)}
                accessibilityRole="button"
                accessibilityLabel={`Send to ${name}`}
                className="flex-row items-center px-4 py-3 gap-3"
                style={({ pressed }) => ({ opacity: open ? (pressed ? 0.6 : 1) : 0.45 })}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.brand.blue }}
                >
                  <Text style={{ color: "#fff", fontFamily: "InstrumentSans_600SemiBold" }}>
                    {name.trim()[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    numberOfLines={1}
                    style={{
                      color: t.textPrimary,
                      fontSize: 15,
                      fontFamily: "InstrumentSans_600SemiBold",
                    }}
                  >
                    {name}
                  </Text>
                  <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: 12 }}>
                    {open ? (item.phone ?? "") : "Reply window closed"}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
