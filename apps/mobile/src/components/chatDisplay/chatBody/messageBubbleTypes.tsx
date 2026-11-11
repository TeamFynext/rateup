import { Toast } from "@/components/common/Notice";
import { useGetMediaFile } from "@/api/inbox/messages/message.query";
import { getFileUrlFromKey } from "@/utils/fileUpload";
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  LucideCheckCircle2,
  Pause,
  Phone,
  Play,
  Reply,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Text,
  Pressable,
  View,
  Modal,
  Platform,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import Image from "@/components/common/Image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import * as FileSystem from "expo-file-system/legacy";
import { File } from "expo-file-system";
import { VideoPlayback, VideoThumbnail } from "@/components/common/VideoPlayer";
import { WaSendMessageBody } from "@/api/inbox/types";
import {
  WaTemplateComponent,
  WaTemplateFetchBody,
  WaTemplateFetchBodyComponent,
} from "@/context/type";
import TextWithFormatting from "@/utils/TextFormatting";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as IntentLauncher from "expo-intent-launcher";
import { logger } from "@/utils/logger";
import { parseDocumentContent, safeMediaId, splitMediaContent } from "@/utils/mediaContent";
import { MapPreview, openInMaps } from "@/components/common/MapPreview";
import LinkSheet from "@/components/common/LinkSheet";

export default function WaInboxText({
  messageContent,
  textColor,
}: {
  messageContent: string;
  textColor?: string;
}) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const parts = useMemo(() => splitLinks(messageContent), [messageContent]);
  return (
    <>
      {/* One Text so links flow inline with the sentence instead of breaking onto their own lines. */}
      <Text style={{ color: textColor }} className="text-base">
        {parts.map((part, index) =>
          part.href ? (
            <Text
              key={index}
              accessibilityRole="link"
              onPress={() => setOpenUrl(part.href)}
              style={{ color: textColor, textDecorationLine: "underline", fontWeight: "500" }}
            >
              {part.text}
            </Text>
          ) : (
            part.text
          ),
        )}
      </Text>
      {openUrl ? <LinkSheet url={openUrl} onClose={() => setOpenUrl(null)} /> : null}
    </>
  );
}

// http(s) links and bare www. links. Trailing punctuation (". , ) !") is left out of the link.
const LINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+[^\s<>".,;:!?)\]}'"]/gi;

function splitLinks(content: string | undefined): { text: string; href: string | null }[] {
  if (!content || typeof content !== "string") return [{ text: String(content ?? ""), href: null }];
  const out: { text: string; href: string | null }[] = [];
  let last = 0;
  for (const m of content.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ text: content.slice(last, start), href: null });
    const raw = m[0];
    out.push({ text: raw, href: /^https?:\/\//i.test(raw) ? raw : `https://${raw}` });
    last = start + raw.length;
  }
  if (last < content.length) out.push({ text: content.slice(last), href: null });
  return out;
}

export function WaInboxImage({ messageContent }: { messageContent: string }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // `?.` on the split made this destructure `undefined` when there is no content,
  // which throws rather than short-circuiting. Default to an empty string instead.
  const [link = "", caption] = splitMediaContent(messageContent, 2);
  const imageUrl = link.startsWith("http") ? link : `${getFileUrlFromKey(link)}`;

  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  return (
    <>
      <Pressable onPress={openModal}>
        <View className="w-[220px] h-[280px] rounded-lg overflow-hidden bg-gray-100">
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            contentFit="cover"
            recyclingKey={imageUrl}
          />
          {caption && (
            <Text className="absolute bottom-1 left-2 right-2 text-white text-xs bg-black/40 px-2 py-1 rounded">
              {caption}
            </Text>
          )}
        </View>
      </Pressable>

      <Modal visible={isModalVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <View className="flex-1 bg-black justify-center items-center">
          <Image source={{ uri: imageUrl }} className="w-full h-full" contentFit="contain" />
          <Pressable
            onPress={closeModal}
            style={{
              position: "absolute",
              top: insets.top + 10,
              right: 20,
              zIndex: 1000,
              padding: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 28 }}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

/**
 * Colours for media drawn inside a message bubble. `onBrand` is a bubble filled with the
 * brand blue (an agent's own message), where everything is white; otherwise the media
 * sits on the received bubble's surface and takes the inbox theme.
 */
export function mediaTone(onBrand: boolean, isDark: boolean) {
  const t = getInboxRowTheme(isDark);
  return onBrand
    ? {
        fg: "#FFFFFF",
        muted: "rgba(255,255,255,0.72)",
        track: "rgba(255,255,255,0.35)",
        fill: "#FFFFFF",
        button: "rgba(255,255,255,0.22)",
        tile: "rgba(255,255,255,0.12)",
      }
    : {
        fg: t.fg1,
        muted: t.fg3,
        track: isDark ? "#3A4554" : "#CBD2DB",
        fill: t.brand,
        button: t.brand,
        tile: t.surface2,
      };
}

/** Bar heights (0.2 to 1) for an audio message, the same every time for the same media id. */
function waveBars(seed: string, count = 30) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: count }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const r = ((h >>> 0) % 1000) / 1000;
    // Louder in the middle, as speech usually is.
    const envelope = 0.55 + 0.45 * Math.sin((i / (count - 1)) * Math.PI);
    return 0.2 + 0.8 * r * envelope;
  });
}

function formatTime(sec: number) {
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

/** Makes sure the media folder exists, then reports whether `path` is already downloaded. */
async function isDownloaded(folder: string, path: string) {
  if (!(await FileSystem.getInfoAsync(folder)).exists) {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  }
  return (await FileSystem.getInfoAsync(path)).exists;
}

export function WaInboxVideo({
  messageContent,
  onBrand = false,
}: {
  messageContent: string;
  onBrand?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const tone = mediaTone(onBrand, isDark);
  const insets = useSafeAreaInsets();
  const { mutate, isPending, reset } = useGetMediaFile();
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [id = "", caption] = splitMediaContent(messageContent, 2);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  // `id` is a WhatsApp media id on a received video, but the whole CloudFront URL on one we
  // sent, which made the path `wa_media/http://…` and failed the existence check. Made
  // file-safe the way the audio bubble does it.
  const downloadPath = `${appFolderPath}/${safeMediaId(id)}.mp4`;

  const link = id.startsWith("http") ? id : null;
  const ready = Boolean(link || localPath);

  // A video with a link plays from it and is never downloaded, so there is nothing on
  // disk to look for.
  useEffect(() => {
    if (link) return;
    isDownloaded(appFolderPath, downloadPath)
      .then((exists) => exists && setLocalPath(downloadPath))
      // A failed check only means the video is downloaded again on tap.
      .catch((err) => logger.warn("Video cache check failed:", err));
  }, [appFolderPath, downloadPath, link]);

  const handleDownload = async () => {
    if ((await FileSystem.getInfoAsync(downloadPath)).exists) {
      setLocalPath(downloadPath);
      return;
    }

    mutate(id, {
      onSuccess: async (arrayBufferData) => {
        try {
          await new File(downloadPath).write(new Uint8Array(arrayBufferData));
          setLocalPath(downloadPath);
        } catch (error) {
          logger.error("File write failed:", error);
        } finally {
          // The bytes are on disk now and playback reads from there, so drop
          // the ArrayBuffer the mutation is still holding.
          reset();
        }
      },
      onError: () => {
        Toast.show({
          type: "error",
          text1: "Video download failed.",
        });
      },
    });
  };

  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  return (
    <View style={{ width: 240 }}>
      <Pressable
        onPress={ready ? openModal : handleDownload}
        disabled={isPending}
        accessibilityRole="button"
        accessibilityLabel={ready ? "Play video" : "Download video"}
        style={{
          width: "100%",
          aspectRatio: 4 / 3,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#0B0F14",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ready ? <VideoThumbnail uri={localPath ?? link!} style={StyleSheet.absoluteFill} /> : null}
        {/* One round button in the middle: download, then a spinner while it downloads,
            then play. */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : ready ? (
            <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
          ) : (
            <Download size={22} color="#fff" />
          )}
        </View>
        {!ready ? (
          <Text
            style={{
              position: "absolute",
              left: 12,
              bottom: 10,
              color: "rgba(255,255,255,0.75)",
              fontSize: 12,
              fontFamily: "InstrumentSans_600SemiBold",
            }}
          >
            {isPending ? "Downloading…" : "Video"}
          </Text>
        ) : null}
      </Pressable>

      {caption ? (
        <Text style={{ color: tone.fg, fontSize: 14, marginTop: 6, paddingHorizontal: 6 }}>
          {caption}
        </Text>
      ) : null}

      <Modal
        animationType="fade"
        transparent={false}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {ready ? (
            <VideoPlayback uri={localPath ?? link!} style={{ width: "100%", height: "100%" }} />
          ) : null}
          <Pressable
            onPress={closeModal}
            accessibilityLabel="Close video"
            style={{
              position: "absolute",
              top: insets.top + 10,
              right: 20,
              zIndex: 1000,
              padding: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 28 }}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

export function WaInboxAudio({
  messageContent,
  onBrand = false,
}: {
  messageContent: string;
  onBrand?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const tone = mediaTone(onBrand, isDark);
  const { mutate, isPending, reset } = useGetMediaFile();
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [waveWidth, setWaveWidth] = useState(0);
  const [id = "", caption] = splitMediaContent(messageContent, 2);
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  const downloadPath = `${appFolderPath}/${safeMediaId(id)}.mp3`;
  const link = id.startsWith("http") ? id : null;
  const source = localPath || link || null;
  const ready = Boolean(source);
  const player = useAudioPlayer(source ? { uri: source } : null);
  const status = useAudioPlayerStatus(player);
  const bars = useMemo(() => waveBars(id), [id]);

  useEffect(() => {
    if (link) return;
    isDownloaded(appFolderPath, downloadPath)
      .then((exists) => exists && setLocalPath(downloadPath))
      .catch((err) => logger.warn("Audio cache check failed:", err));
  }, [appFolderPath, downloadPath, link]);

  const handleDownload = async () => {
    if ((await FileSystem.getInfoAsync(downloadPath)).exists) {
      setLocalPath(downloadPath);
      return;
    }

    mutate(id, {
      onSuccess: async (arrayBufferData) => {
        try {
          await new File(downloadPath).write(new Uint8Array(arrayBufferData));
          setLocalPath(downloadPath);
        } catch (error) {
          logger.error("Audio file write failed:", error);
        } finally {
          reset();
        }
      },
      onError: () => {
        Toast.show({
          type: "error",
          text1: "Audio download failed.",
        });
      },
    });
  };

  const duration = status.duration || 0;
  const position = status.currentTime || 0;
  const progress = duration ? Math.min(1, position / duration) : 0;

  const toggle = () => {
    try {
      if (status.playing) return player.pause();
      if (duration && position >= duration - 0.1) void player.seekTo(0);
      player.play();
    } catch {
      // player already released
    }
  };

  // Tapping the waveform jumps to that point, as in WhatsApp.
  const seek = (x: number) => {
    if (!ready || !duration || !waveWidth) return;
    try {
      void player.seekTo(Math.max(0, Math.min(1, x / waveWidth)) * duration);
    } catch {
      // player already released
    }
  };

  const label = !ready
    ? isPending
      ? "Downloading…"
      : "Audio"
    : formatTime(status.playing || position > 0 ? position : duration);

  return (
    <View style={{ width: 232 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={ready ? toggle : handleDownload}
          disabled={isPending}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={!ready ? "Download audio" : status.playing ? "Pause" : "Play audio"}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: tone.button,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : !ready ? (
            <Download size={18} color="#fff" />
          ) : status.playing ? (
            <Pause size={18} color="#fff" fill="#fff" />
          ) : (
            <Play size={18} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
          )}
        </Pressable>

        <View style={{ flex: 1 }}>
          <Pressable
            onPress={(e) => seek(e.nativeEvent.locationX)}
            onLayout={(e) => setWaveWidth(e.nativeEvent.layout.width)}
            disabled={!ready}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {/* Not touchable itself, so a tap's locationX is measured from the Pressable. */}
            <View
              pointerEvents="none"
              style={{ height: 28, flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              {bars.map((level, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(3, level * 26),
                    borderRadius: 1.5,
                    backgroundColor: (i + 0.5) / bars.length <= progress ? tone.fill : tone.track,
                  }}
                />
              ))}
            </View>
          </Pressable>
          <Text
            style={{
              color: tone.muted,
              fontSize: 11,
              marginTop: 2,
              fontVariant: ["tabular-nums"],
            }}
          >
            {label}
          </Text>
        </View>
      </View>

      {caption ? (
        <Text style={{ color: tone.fg, fontSize: 14, marginTop: 6 }}>{caption}</Text>
      ) : null}
    </View>
  );
}

/**
 * A WhatsApp sticker. The message holds only Meta's media id, so it is downloaded like
 * audio and video, but straight away: stickers are small (500 KB at most) and there is
 * nothing to show until it arrives.
 */
export function WaInboxSticker({ messageContent }: { messageContent: string }) {
  const isDark = useColorScheme() === "dark";
  const tone = mediaTone(false, isDark);
  const id = messageContent || "";
  const { mutate, reset } = useGetMediaFile();
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  const downloadPath = `${appFolderPath}/${safeMediaId(id)}.webp`;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    isDownloaded(appFolderPath, downloadPath)
      .then((exists) => {
        if (cancelled) return;
        if (exists) {
          setLocalPath(downloadPath);
          return;
        }
        mutate(id, {
          onSuccess: async (arrayBufferData) => {
            try {
              await new File(downloadPath).write(new Uint8Array(arrayBufferData));
              if (!cancelled) setLocalPath(downloadPath);
            } catch (error) {
              logger.warn("Sticker write failed:", error);
              if (!cancelled) setFailed(true);
            } finally {
              reset();
            }
          },
          onError: () => {
            if (!cancelled) setFailed(true);
          },
        });
      })
      .catch((err) => {
        logger.warn("Sticker cache check failed:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, appFolderPath, downloadPath, mutate, reset]);

  return (
    <View
      style={{ width: 140, height: 140, alignItems: "center", justifyContent: "center" }}
      accessibilityLabel="Sticker"
    >
      {localPath ? (
        <Image
          source={{ uri: localPath }}
          style={{ width: 140, height: 140 }}
          contentFit="contain"
          recyclingKey={localPath}
        />
      ) : failed || !id ? (
        <Text style={{ color: tone.muted, fontSize: 13 }}>Sticker</Text>
      ) : (
        <ActivityIndicator color={tone.muted} />
      )}
    </View>
  );
}

/** A shared location: WhatsApp sends coordinates, and a name and address when it has them. */
export function WaInboxLocation({
  messageContent,
  onBrand = false,
}: {
  messageContent?: {
    latitude?: number | string;
    longitude?: number | string;
    name?: string;
    address?: string;
  } | null;
  onBrand?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const tone = mediaTone(onBrand, isDark);
  const latitude = Number(messageContent?.latitude);
  const longitude = Number(messageContent?.longitude);
  const { name, address } = messageContent ?? {};

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return <Text style={{ color: tone.muted, fontSize: 14 }}>Location unavailable</Text>;
  }

  return (
    <Pressable
      onPress={() => openInMaps(latitude, longitude, name || address)}
      accessibilityRole="link"
      accessibilityLabel={`Location${name || address ? `: ${name || address}` : ""}. Opens in Maps`}
      style={{ width: 240 }}
    >
      <View style={{ borderRadius: 12, overflow: "hidden" }}>
        <MapPreview latitude={latitude} longitude={longitude} width={240} height={140} />
      </View>
      <View style={{ paddingHorizontal: 6, paddingTop: 6 }}>
        {name ? (
          <Text
            numberOfLines={1}
            style={{ color: tone.fg, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}
          >
            {name}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={{ color: tone.muted, fontSize: 12, marginTop: 1 }}>
          {address || "Tap to open in Maps"}
        </Text>
      </View>
    </Pressable>
  );
}

/** A file type's badge colour, by extension. */
function extensionColor(ext: string) {
  if (ext === "PDF") return "#E5484D";
  if (["DOC", "DOCX", "TXT", "RTF"].includes(ext)) return "#2B6CB0";
  if (["XLS", "XLSX", "CSV"].includes(ext)) return "#2F855A";
  if (["PPT", "PPTX"].includes(ext)) return "#DD6B20";
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP", "HEIC"].includes(ext)) return "#805AD5";
  if (["ZIP", "RAR", "7Z"].includes(ext)) return "#718096";
  return "#4A5568";
}

export function WaInboxDocument({
  messageContent,
  onBrand = false,
}: {
  messageContent: string;
  onBrand?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const tone = mediaTone(onBrand, isDark);
  const [isPending, setIsPending] = useState(false);
  const [localPath, setLocalPath] = useState<string | null>(null);

  // `filename` is the customer's and is only ever displayed. The file on disk is named
  // from the media id (`storageName`): a filename such as `../SQLite/chat_contacts_db`
  // would otherwise overwrite the app's own databases.
  const { id, filename, caption, storageName } = parseDocumentContent(messageContent);
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  const downloadPath = `${appFolderPath}/${storageName}`;
  const dot = filename.lastIndexOf(".");
  const ext = dot > 0 ? filename.slice(dot + 1, dot + 5).toUpperCase() : "FILE";

  useEffect(() => {
    isDownloaded(appFolderPath, downloadPath)
      .then((exists) => exists && setLocalPath(downloadPath))
      .catch((err) => logger.warn("Document cache check failed:", err));
  }, [appFolderPath, downloadPath]);

  const { mutateAsync, reset } = useGetMediaFile();

  const handleDownload = async () => {
    setIsPending(true);
    try {
      if (id.startsWith("http")) {
        const result = await FileSystem.downloadAsync(id, downloadPath);
        if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
      } else {
        // `id` is a media id: the API returns the file's bytes, written straight to disk.
        const fileData = await mutateAsync(id);
        await new File(downloadPath).write(new Uint8Array(fileData));
      }
      setLocalPath(downloadPath);
    } catch (error) {
      logger.error("Download error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to download document.",
      });
    } finally {
      setIsPending(false);
      reset();
    }
  };

  const openDocument = async () => {
    if (!localPath) return;
    try {
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(localPath);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
        });
      } else {
        await Linking.openURL(localPath);
      }
    } catch (err) {
      logger.error("Error opening file:", err);
      Toast.show({
        type: "error",
        text1: "Unable to open the document.",
      });
    }
  };

  return (
    <View style={{ width: 240 }}>
      <Pressable
        onPress={localPath ? openDocument : handleDownload}
        disabled={isPending}
        accessibilityRole="button"
        accessibilityLabel={`${localPath ? "Open" : "Download"} ${filename || "document"}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 8,
          borderRadius: 10,
          backgroundColor: tone.tile,
        }}
      >
        <View
          style={{
            width: 36,
            height: 44,
            borderRadius: 6,
            backgroundColor: extensionColor(ext),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Figtree_800ExtraBold" }}>
            {ext}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="middle"
            style={{ color: tone.fg, fontSize: 14, fontFamily: "InstrumentSans_600SemiBold" }}
          >
            {filename || "Document"}
          </Text>
          <Text style={{ color: tone.muted, fontSize: 12, marginTop: 2 }}>
            {ext} · {isPending ? "Downloading…" : localPath ? "Tap to open" : "Tap to download"}
          </Text>
        </View>
        {!localPath ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: tone.muted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={tone.fg} />
            ) : (
              <Download size={16} color={tone.fg} />
            )}
          </View>
        ) : null}
      </Pressable>

      {caption ? (
        <Text style={{ color: tone.fg, fontSize: 14, marginTop: 6 }}>{caption}</Text>
      ) : null}
    </View>
  );
}

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}

interface Props1 {
  interactiveBody: WaSendMessageBody["interactive"];
}

/** How many catalog items a WhatsApp product or product-list message carried. */
function catalogItemCount(body: Props["interactiveBody"]): number {
  const action = body?.action as
    | { product_retailer_id?: string; sections?: { product_items?: unknown[] }[] }
    | undefined;
  if (body?.type === "product") return action?.product_retailer_id ? 1 : 0;
  if (body?.type === "product_list") {
    return (action?.sections ?? []).reduce((n, s) => n + (s.product_items?.length ?? 0), 0);
  }
  return 0;
}

export function WaInboxInteractive({ interactiveBody, messageContent }: Props) {
  const [openSections, setOpenSections] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className="p-3 rounded-xl space-y-3"
      style={{ backgroundColor: isDark ? Colors.dark.surface : Colors.light.card }}
    >
      {/* Responded */}
      {messageContent ? (
        <View className="flex-row items-center space-x-2">
          <LucideCheckCircle2
            size={16}
            color={isDark ? Colors.brand.blueLight : Colors.brand.blue}
          />
          <Text
            className="text-sm"
            style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
          >
            {`${messageContent} responded`}
          </Text>
        </View>
      ) : null}

      {/* Header */}
      {interactiveBody?.header && <WaInboxInteractiveHeader interactiveBody={interactiveBody} />}

      {/* Body */}
      {interactiveBody?.body?.text && (
        <Text
          className="text-base leading-5"
          style={{ color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary }}
        >
          {interactiveBody.body.text}
        </Text>
      )}

      {catalogItemCount(interactiveBody) > 0 && (
        <Text
          className="text-sm"
          style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
        >
          {catalogItemCount(interactiveBody) === 1
            ? "1 catalog item"
            : `${catalogItemCount(interactiveBody)} catalog items`}
        </Text>
      )}

      {/* Footer */}
      {interactiveBody?.footer?.text && (
        <Text
          className="text-xs"
          style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
        >
          {interactiveBody.footer.text}
        </Text>
      )}

      {/* Buttons (wrap nicely like web) */}
      {interactiveBody?.action?.buttons && interactiveBody?.action?.buttons?.length > 0 && (
        <View className="flex gap-2">
          {/* What the customer sees and taps; here they are labels, not buttons. */}
          {interactiveBody.action.buttons.map((button) => (
            <View
              key={button?.reply?.id}
              className="px-4 py-2 rounded-lg flex-row items-center justify-center"
              style={{
                gap: 6,
                borderWidth: 1,
                borderColor: isDark ? Colors.dark.border : Colors.light.border,
              }}
            >
              <Reply
                size={14}
                color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary}
              />
              <Text
                className="text-sm font-medium"
                style={{ color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary }}
              >
                {button?.reply?.title || button?.reply?.id}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Flow CTA */}
      {interactiveBody?.action?.parameters?.flow_cta && (
        <View
          className="px-4 py-3 rounded-lg flex-row items-center justify-center"
          style={{
            gap: 6,
            borderWidth: 1,
            borderColor: isDark ? Colors.dark.border : Colors.light.border,
          }}
        >
          <FileText size={14} color={isDark ? Colors.dark.textPrimary : Colors.light.textPrimary} />
          <Text
            className="font-medium"
            style={{ color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary }}
          >
            {interactiveBody?.action?.parameters?.flow_cta}
          </Text>
        </View>
      )}

      {/* URL CTA */}
      {interactiveBody?.action?.name === "cta_url" && (
        <Pressable
          className="px-4 py-3 rounded-lg items-center"
          style={{ backgroundColor: Colors.brand.blue }}
          onPress={() => {
            const url = interactiveBody?.action?.parameters?.url;
            if (url) Linking.openURL(url);
          }}
        >
          <Text className="text-white font-medium">
            {interactiveBody?.action?.parameters?.display_text}
          </Text>
        </Pressable>
      )}

      {/* Sections */}
      {interactiveBody?.action?.button && (
        <View className="w-full">
          {/* Main button */}
          <Pressable
            disabled={!interactiveBody?.action?.sections?.length}
            onPress={() => setOpenSections((prev) => !prev)}
            className="w-full rounded-lg px-4 py-3 items-center"
            style={{ backgroundColor: isDark ? Colors.dark.border : Colors.light.border }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary }}
            >
              {interactiveBody?.action?.button}
            </Text>
          </Pressable>

          {/* Sections list */}
          {openSections && (
            <View
              className="mt-2 rounded-xl p-3 max-h-80"
              style={{ backgroundColor: isDark ? Colors.dark.bg : Colors.light.card }}
            >
              {interactiveBody?.action?.sections?.map((section) => (
                <View key={section.title} className="mb-4">
                  <Text
                    className="text-xs font-semibold mb-2"
                    style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
                  >
                    {section.title}
                  </Text>

                  <View
                    className="h-[1px] mb-2"
                    style={{ backgroundColor: isDark ? Colors.dark.border : Colors.light.border }}
                  />

                  {section?.rows?.map((r) => (
                    <View key={r.id} className="py-2">
                      <Text
                        className="text-sm font-medium"
                        style={{
                          color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary,
                        }}
                      >
                        {r.title}
                      </Text>

                      {r.description && (
                        <Text
                          className="text-xs mt-1"
                          style={{
                            color: isDark ? Colors.dark.textSecondary : Colors.light.textSubtle,
                          }}
                        >
                          {r.description}
                        </Text>
                      )}

                      <View
                        className="h-[1px] mt-3"
                        style={{
                          backgroundColor: isDark ? Colors.dark.border : Colors.light.border,
                        }}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function WaInboxInteractiveHeader({ interactiveBody }: Props1) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const header = interactiveBody?.header;
  if (!header) return null;

  switch (header.type) {
    case "text":
      return (
        <Text
          className="text-base font-semibold"
          style={{ color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary }}
        >
          {header.text}
        </Text>
      );
    case "image":
      return (
        <Image
          source={{ uri: header.image?.link }}
          style={{ height: 200, width: "100%", borderRadius: 12 }}
          contentFit="cover"
          recyclingKey={header.image?.link}
        />
      );
    default:
      return null;
  }
}

interface Props2 {
  templateBody: WaTemplateFetchBody;
  parameters: WaTemplateComponent[] | any;
}

export function WaInboxTemplate({ templateBody, parameters }: Props2) {
  return (
    <View className="p-3">
      {templateBody?.components?.map((component, i) => {
        const param =
          parameters?.find(
            (param: any) => param?.type?.toLowerCase() === component?.type?.toLowerCase(),
          ) ?? undefined;

        return (
          <WaInboxTemplateComponents key={i} templateComponent={component} parameterData={param} />
        );
      })}
    </View>
  );
}

interface Props3 {
  templateComponent: WaTemplateFetchBodyComponent;
  parameterData: WaTemplateComponent;
}
function WaInboxTemplateComponents(props: Props3) {
  switch (props?.templateComponent?.type) {
    case "HEADER":
      return <WaInboxTemplateHeader {...props} />;
    case "BODY":
      return <WaInboxTemplateBody {...props} />;
    case "FOOTER":
      return <WaInboxTemplateFooter {...props.templateComponent} />;
    case "BUTTONS":
      return <WaInboxTemplateButtons {...props.templateComponent} />;
    default:
      return null;
  }
}

const WaInboxTemplateHeader = ({ templateComponent, parameterData }: Props3) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const format = templateComponent?.format?.toLowerCase(); // "image", "document", etc
  const param = parameterData?.parameters?.[0] as any;
  const mediaLink: string | undefined = format ? param?.[format]?.link : undefined;
  const fallback = templateComponent?.example?.header_handle?.[0];
  const sanitizeUrl = (url?: string) => url?.replace(/([^:]\/)\/+/g, "$1"); // removes double slashes after protocol
  const uri = mediaLink ? sanitizeUrl(mediaLink) : fallback;
  const textColor = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
  const mutedColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;
  const open = () => {
    if (uri) Linking.openURL(uri).catch((err) => logger.warn("Could not open header media:", err));
  };
  switch (templateComponent.format) {
    case "TEXT": {
      // A header has at most one variable: the value sent, else the template's example.
      const value: string | undefined =
        param?.text ?? (templateComponent?.example as any)?.header_text?.[0];
      return (
        <Text className="text-base font-semibold mb-2" style={{ color: textColor }}>
          {templateComponent.text?.replace(/\{\{[^}]+\}\}/g, (m) => value ?? m)}
        </Text>
      );
    }
    case "VIDEO":
      return (
        <Pressable
          onPress={open}
          disabled={!uri}
          accessibilityRole="button"
          accessibilityLabel="Play video"
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            borderRadius: 10,
            marginBottom: 8,
            backgroundColor: "#0B0F14",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
          </View>
        </Pressable>
      );
    case "IMAGE":
      return (
        <Image
          source={{ uri }}
          className="w-full aspect-square"
          contentFit="contain"
          recyclingKey={uri}
        />
      );

    case "DOCUMENT":
      return (
        <Pressable
          onPress={open}
          disabled={!uri}
          accessibilityRole="button"
          accessibilityLabel="Open document"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 10,
            marginBottom: 8,
            borderRadius: 10,
            backgroundColor: isDark ? Colors.dark.border : Colors.light.border,
          }}
        >
          <FileText size={22} color={textColor} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: textColor, fontSize: 14, fontWeight: "600" }}>
              {param?.document?.filename || "Document"}
            </Text>
            <Text style={{ color: mutedColor, fontSize: 12 }}>Tap to open</Text>
          </View>
        </Pressable>
      );
    default:
      return null;
  }
};

const WaInboxTemplateBody = ({ templateComponent, parameterData }: Props3) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const text = templateComponent?.text;
  const values =
    parameterData?.parameters?.map((d) => d?.text) ??
    templateComponent?.example?.body_text?.[0] ??
    [];

  return (
    <Text
      className="text-[15px] mb-2"
      style={{ color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }}
    >
      {TextWithFormatting({ text, examples: values })}
    </Text>
  );
};

const WaInboxTemplateFooter = ({ text }: WaTemplateFetchBodyComponent) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Text
      className="text-xs italic mt-1"
      style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
    >
      {text}
    </Text>
  );
};

const WaInboxTemplateButtons = ({ buttons }: WaTemplateFetchBodyComponent) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  if (!buttons?.length) return null;

  return (
    <View
      className="border-t mt-2"
      style={{ borderColor: isDark ? Colors.dark.border : Colors.light.border }}
    >
      {buttons.map((button: any, i) => {
        // What the customer sees. A link (without a per-message variable) or a phone
        // number can be opened here too; reply, flow and copy-code buttons are only
        // labels, since tapping them is the customer's action.
        const url: string | undefined =
          button?.type === "URL" && button?.url && !button.url.includes("{{")
            ? button.url
            : undefined;
        const phone: string | undefined =
          button?.type === "PHONE_NUMBER" ? button?.phone_number : undefined;
        const Icon =
          button?.type === "URL"
            ? ExternalLink
            : button?.type === "PHONE_NUMBER"
              ? Phone
              : button?.type === "COPY_CODE"
                ? Copy
                : Reply;
        const color = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
        const target = url ?? (phone ? `tel:${phone}` : undefined);
        return (
          <Pressable
            key={i}
            disabled={!target}
            onPress={() => target && Linking.openURL(target)}
            accessibilityRole={target ? "link" : "text"}
            className="flex-row items-center justify-center py-3 border-b"
            style={{
              gap: 6,
              borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
            }}
          >
            <Icon size={16} color={color} />
            <Text className="text-sm" style={{ color }}>
              {button?.text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
