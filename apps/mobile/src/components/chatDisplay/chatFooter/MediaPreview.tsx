import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import KeyboardAvoider from "@/components/common/KeyboardAvoider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoPlayback } from "@/components/common/VideoPlayer";
import { File, MusicIcon, Plus, Send, Trash2, VideoIcon, X } from "lucide-react-native";
import Image from "@/components/common/Image";
import { Colors } from "@/constants/colors";

type PreviewItem = {
  key: string;
  type: string;
  name: string;
  url: string;
  uploading?: boolean;
};

/**
 * Full-screen review of the attachments about to be sent, as in WhatsApp: the picked
 * photo or video large, a strip of everything attached, and a caption. The caption is
 * the message text, which the API puts on the last attachment.
 *
 * Shows each file from the device while it uploads, so nothing waits on the network.
 * Rendered by the `/protected/chat/MediaPreview` route, so the keyboard is tracked in the
 * main window like the rest of the app.
 */
export default function MediaPreview({
  items,
  index,
  onIndexChange,
  localUriFor,
  caption,
  onChangeCaption,
  onRemove,
  onAddMore,
  onSend,
  onDiscard,
}: {
  items: PreviewItem[];
  index: number;
  onIndexChange: (index: number) => void;
  localUriFor: (key: string) => string | undefined;
  caption: string;
  onChangeCaption: (text: string) => void;
  onRemove: (key: string) => void;
  onAddMore: () => void;
  onSend: () => void;
  onDiscard: () => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  // Removing an item can leave the index past the end.
  const current = items[Math.min(index, items.length - 1)];
  const uploading = items.some((m) => m.uploading);
  const uriFor = (item: PreviewItem) => localUriFor(item.key) ?? item.url;

  const remove = () => {
    if (!current) return;
    if (items.length === 1) onDiscard();
    else onRemove(current.key);
  };

  return (
    // The top inset is already taken by the protected layout's safe area. The caption
    // bar's bottom safe-area padding goes behind the keyboard, leaving an 8pt gap.
    <KeyboardAvoider bottomInset={bottomPadding} gap={8} style={{ backgroundColor: "#000" }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={onDiscard}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Discard attachments"
        >
          <X size={24} color="#fff" />
        </Pressable>
        <Text style={{ color: "#fff", fontFamily: "InstrumentSans_600SemiBold" }}>
          {items.length > 1 ? `${Math.min(index, items.length - 1) + 1} of ${items.length}` : ""}
        </Text>
        <Pressable
          onPress={remove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Remove this attachment"
        >
          <Trash2 size={22} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center">
        {current && <PreviewBody item={current} uri={uriFor(current)} />}
        {current?.uploading && (
          <View
            className="absolute top-3 flex-row items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          >
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12 }}>Uploading…</Text>
          </View>
        )}
      </View>

      <View>
        <FlatList
          horizontal
          data={items}
          keyExtractor={(m) => m.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 8 }}
          ListFooterComponent={
            <Pressable
              onPress={onAddMore}
              accessibilityRole="button"
              accessibilityLabel="Add more photos or videos"
              className="w-14 h-14 rounded-lg items-center justify-center border"
              style={{ borderColor: "rgba(255,255,255,0.4)" }}
            >
              <Plus size={20} color="#fff" />
            </Pressable>
          }
          renderItem={({ item, index: i }) => (
            <Pressable
              onPress={() => onIndexChange(i)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${item.name}`}
              className="w-14 h-14 rounded-lg overflow-hidden items-center justify-center"
              style={{
                borderWidth: 2,
                borderColor: item.key === current?.key ? Colors.accent.cyan : "transparent",
                backgroundColor: "#222",
              }}
            >
              {item.type === "image" ? (
                <Image
                  source={{ uri: uriFor(item) }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <KindIcon type={item.type} size={18} />
              )}
            </Pressable>
          )}
        />

        <View
          className="flex-row items-end gap-2 px-3 pt-1"
          style={{ paddingBottom: bottomPadding }}
        >
          <TextInput
            value={caption}
            onChangeText={onChangeCaption}
            placeholder="Add a caption…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            style={{
              flex: 1,
              color: "#fff",
              fontSize: 15,
              maxHeight: 110,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.12)",
            }}
          />
          <Pressable
            onPress={onSend}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Send"
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.brand.blue, opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoider>
  );
}

function PreviewBody({ item, uri }: { item: PreviewItem; uri: string }) {
  if (!uri) return <ActivityIndicator color="#fff" />;
  if (item.type === "image") {
    return (
      <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
    );
  }
  if (item.type === "video") {
    return <VideoPlayback key={item.key} uri={uri} style={{ width: "100%", height: "100%" }} />;
  }
  return (
    <View className="items-center gap-3 px-8">
      <KindIcon type={item.type} size={48} />
      <Text numberOfLines={2} style={{ color: "#fff", textAlign: "center" }}>
        {item.name}
      </Text>
    </View>
  );
}

function KindIcon({ type, size }: { type: string; size: number }) {
  if (type === "video") return <VideoIcon size={size} color="#fff" />;
  if (type === "audio") return <MusicIcon size={size} color="#fff" />;
  return <File size={size} color="#fff" />;
}
