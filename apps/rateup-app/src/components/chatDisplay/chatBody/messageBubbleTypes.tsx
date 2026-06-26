import { Toast } from "toastify-react-native";
import { useGetMediaFile } from "@/api/inbox/messages/message.query";
import { getFileUrlFromKey } from "@/utils/fileUpload";
import {
  Download,
  Headphones,
  LucideCheckCircle2,
  Pause,
  Play,
  Reply,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import Video from "react-native-video";
import { fromByteArray } from "base64-js";
import { WaSendMessageBody } from "@/api/inbox/types";
import { Buffer } from "buffer";
import {
  WaTemplateComponent,
  WaTemplateFetchBody,
  WaTemplateFetchBodyComponent,
} from "@/context/type";
import TextWithFormatting from "@/utils/TextFormatting";
import { useAudioPlayer } from "expo-audio";
import * as IntentLauncher from "expo-intent-launcher";

export default function WaInboxText({
  messageContent,
}: {
  messageContent: string;
}) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = messageContent?.split(urlRegex).filter(Boolean);
  return (
    <View>
      {parts?.map((text, index) =>
        urlRegex.test(text) ? (
          <Pressable key={index} onPress={() => Linking.openURL(text)}>
            <Text className="underline text-blue-600 text-base">{text}</Text>
          </Pressable>
        ) : (
          <Text className="text-base" key={index}>
            {text}
          </Text>
        ),
      )}
    </View>
  );
}

export function WaInboxImage({ messageContent }: { messageContent: string }) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [link, caption] = messageContent?.split("_caption_");
  const imageUrl = link.startsWith("http")
    ? link
    : `${getFileUrlFromKey(link)}`;

  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  return (
    <>
      <TouchableOpacity onPress={openModal} activeOpacity={0.8}>
        <View className="w-[220px] h-[280px] rounded-lg overflow-hidden bg-gray-100">
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            style={{ resizeMode: "cover" }}
          />
          {caption && (
            <Text className="absolute bottom-1 left-2 right-2 text-white text-xs bg-black/40 px-2 py-1 rounded">
              {caption}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black justify-center items-center">
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            style={{ resizeMode: "contain" }}
          />
          <TouchableOpacity
            onPress={closeModal}
            activeOpacity={0.8}
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              zIndex: 1000,
              padding: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 28 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

export function WaInboxVideo({ messageContent }: { messageContent: string }) {
  const { mutate, isPending } = useGetMediaFile();
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [id, caption] = messageContent.split("_caption_");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  const downloadPath = `${appFolderPath}/${id}.mp4`;

  const link = id.startsWith("http") ? id : null;
  // Check if file already exists on mount
  useEffect(() => {
    const checkLocalFile = async () => {
      const appFolderExists = (await FileSystem.getInfoAsync(appFolderPath))
        .exists;
      if (!appFolderExists) {
        await FileSystem.makeDirectoryAsync(appFolderPath, {
          intermediates: true,
        });
      }
      const exists = (await FileSystem.getInfoAsync(downloadPath)).exists;
      if (exists) {
        setLocalPath(downloadPath);
      }
    };
    checkLocalFile();
  }, [downloadPath]);

  const handleDownload = async () => {
    // Recheck existence before downloading
    const exists = (await FileSystem.getInfoAsync(downloadPath)).exists;
    if (exists) {
      setLocalPath(downloadPath);
      return;
    }

    mutate(id, {
      onSuccess: async (arrayBufferData) => {
        const byteArray = new Uint8Array(arrayBufferData);
        const base64Data = fromByteArray(byteArray);

        try {
          await FileSystem.writeAsStringAsync(downloadPath, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setLocalPath(downloadPath);
        } catch (error) {
          console.error("File write failed:", error);
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
    <View className="space-y-2">
      {isPending && <ActivityIndicator />}
      {/* Video Available */}
      {link || localPath ? (
        <TouchableOpacity
          onPress={openModal}
          activeOpacity={0.7}
          className="relative w-64 h-64 self-center rounded-xl overflow-hidden shadow-md"
        >
          <Video
            source={{ uri: localPath ?? link! }}
            controls={false}
            paused={true}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          <View className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-black/30">
            <Text className="text-white text-4xl font-bold">▶</Text>
          </View>
        </TouchableOpacity>
      ) : (
        // Download Placeholder
        <TouchableOpacity
          className="w-64 h-64 rounded-xl bg-gray-200 dark:bg-gray-700 justify-center items-center self-center shadow-md"
          onPress={handleDownload}
        >
          <Download size={32} color="#4b5563" />
          <Text className="text-sm text-gray-600 mt-2">Download video</Text>
        </TouchableOpacity>
      )}
      {/* Caption */}
      {caption ? <Text className="text-sm text-center">{caption}</Text> : null}
      {/* Fullscreen Modal */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black">
          {/* Video */}
          <Video
            source={{ uri: localPath ?? link! }}
            controls
            paused={false}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />

          {/* Close button ABOVE video */}
          <TouchableOpacity
            onPress={closeModal}
            activeOpacity={0.8}
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              zIndex: 1000,
              padding: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 28 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

export function WaInboxAudio({
  messageContent,
  timestamp,
}: {
  messageContent: string;
  timestamp: string;
}) {
  const { mutate, isPending } = useGetMediaFile();
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [id, caption] = messageContent.split("_caption_");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  const downloadPath = `${appFolderPath}/${id}.mp3`;
  const link = id.startsWith("http") ? id : null;
  const source = localPath || link || null;
  const player = useAudioPlayer(source ? { uri: source } : null);

  useEffect(() => {
    if (!player) return;

    let raf: number;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;

      try {
        setProgress(player.currentTime || 0);
        setDuration(player.duration || 0);
        setIsPlaying(player.playing || false);
      } catch {
        // Player was released — stop loop
        return;
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [player]);

  useEffect(() => {
    const checkLocalFile = async () => {
      const appFolderExists = (await FileSystem.getInfoAsync(appFolderPath))
        .exists;
      if (!appFolderExists) {
        await FileSystem.makeDirectoryAsync(appFolderPath, {
          intermediates: true,
        });
      }
      const exists = (await FileSystem.getInfoAsync(downloadPath)).exists;
      if (exists) {
        setLocalPath(downloadPath);
      }
    };
    checkLocalFile();
  }, [downloadPath]);

  const handleDownload = async () => {
    const exists = (await FileSystem.getInfoAsync(downloadPath)).exists;
    if (exists) {
      setLocalPath(downloadPath);
      return;
    }

    mutate(id, {
      onSuccess: async (arrayBufferData) => {
        const byteArray = new Uint8Array(arrayBufferData);
        const base64Data = fromByteArray(byteArray);
        try {
          await FileSystem.writeAsStringAsync(downloadPath, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setLocalPath(downloadPath);
        } catch (error) {
          console.error("Audio file write failed:", error);
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

  const play = () => {
    if (!player) return;

    try {
      const ended =
        player.duration && player.currentTime >= player.duration - 0.1;

      if (ended) {
        player.seekTo(0);
      }

      player.playing ? player.pause() : player.play();
    } catch {
      // player already released
    }
  };

  const formatTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <View className="w-[60vw] rounded-2xl bg-white px-4 py-3">
      {link || localPath ? (
        <View className="flex-row items-center space-x-3">
          <View className="flex-row gap-1">
            {/* Headphones Icon */}
            <View className="p-2 rounded-full bg-rateUpGreen20">
              <Headphones size={20} color="#009987" />
            </View>

            {/* Play / Pause Button */}
            <TouchableOpacity
              onPress={play}
              className="p-2 rounded-full bg-gray-100"
            >
              {isPlaying ? (
                <Pause size={20} color="#000" />
              ) : (
                <Play size={20} color="#000" />
              )}
            </TouchableOpacity>
          </View>

          {/* Progress Bar + Time */}
          <View className="flex-1 ml-2">
            {/* Progress Bar */}
            <View className="h-2 bg-rateUpGreen20 rounded-full overflow-hidden mb-1">
              <View
                className="h-full bg-rateUpGreen rounded-full"
                style={{
                  width: duration ? `${(progress / duration) * 100}%` : "0%",
                }}
              />
            </View>

            {/* Time Info */}
            <View className="flex-row justify-between px-1">
              <Text className="text-xs text-gray-600">
                {isPlaying ? formatTime(progress) : formatTime(duration)}
              </Text>
              <Text className="text-xs text-gray-500">{timestamp}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center space-x-3">
          {/* Headphones Icon */}
          <View className="p-2 rounded-full bg-gray-200">
            <Headphones size={20} color="#9ca3af" />
          </View>

          {/* Download Button */}
          <TouchableOpacity
            onPress={handleDownload}
            disabled={isPending}
            className="flex-1 flex-row justify-between items-center rounded-lg px-3 py-2 bg-gray-50"
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#009987" />
            ) : (
              <Text className="text-sm text-gray-700 font-medium">
                Tap to download audio
              </Text>
            )}
            <Text className="text-xs text-gray-500">{timestamp}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Optional Caption */}
      {caption ? (
        <Text className="text-sm text-gray-700 italic mt-2 text-center">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export function WaInboxDocument({
  messageContent,
}: {
  messageContent: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [localPath, setLocalPath] = useState<string | null>(null);

  // Parse messageContent
  const [id, filename = "document.pdf", caption = ""] =
    messageContent.split("_caption_");
  const appFolderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
  const downloadPath = `${appFolderPath}/${filename}`;

  useEffect(() => {
    // Check if the document exists locally
    const checkLocalFile = async () => {
      const appFolderExists = (await FileSystem.getInfoAsync(appFolderPath))
        .exists;
      if (!appFolderExists) {
        await FileSystem.makeDirectoryAsync(appFolderPath, {
          intermediates: true,
        }); // Ensure the folder exists
      }

      const exists = (await FileSystem.getInfoAsync(downloadPath)).exists; // Check if the document is already downloaded
      if (exists) {
        setLocalPath(downloadPath); // Set the local path
      }
    };

    checkLocalFile();
  }, [downloadPath]);

  const { mutateAsync } = useGetMediaFile();

  const handleDownload = async () => {
    const folderPath = `${FileSystem.documentDirectory ?? ""}wa_media`;
    const fullPath = `${folderPath}/${filename}`;

    if (id.startsWith("http")) {
      try {
        setIsPending(true);
        const result = await FileSystem.downloadAsync(id, fullPath);
        if (result.status === 200) {
          setIsPending(false);
          setLocalPath(fullPath);
        } else {
          setIsPending(false);
          Toast.show({
            type: "error",
            text1: "Failed to download document.",
          });
        }
      } catch (error) {
        setIsPending(false);
        console.error("Download error:", error);
        Toast.show({
          type: "error",
          text1: "Error while downloading.",
        });
      }
    } else {
      try {
        setIsPending(true);

        // 1. Get binary file from backend using media ID
        const fileData = await mutateAsync(id); // `id` is actually the mediaId

        // 2. Write to filesystem using expo-file-system
        await FileSystem.writeAsStringAsync(
          downloadPath,
          Buffer.from(fileData).toString("base64"),
          {
            encoding: FileSystem.EncodingType.Base64,
          },
        );

        setLocalPath(downloadPath);
      } catch (error) {
        console.error("Download error:", error);
        Toast.show({
          type: "error",
          text1: "Failed to download document.",
        });
      } finally {
        setIsPending(false);
      }
    }
  };

  const openDocument = async () => {
    if (localPath) {
      try {
        if (Platform.OS === "android") {
          const contentUri = await FileSystem.getContentUriAsync(localPath);

          await IntentLauncher.startActivityAsync(
            "android.intent.action.VIEW",
            {
              data: contentUri,
              flags: 1,
            },
          );
        } else {
          await Linking.openURL(localPath);
        }
      } catch (err) {
        console.error("Error opening file:", err);
        Toast.show({
          type: "error",
          text1: "Unable to open the document.",
        });
      }
    }
  };
  return (
    <View className="w-[60vw] rounded-xl bg-white p-3 min-h-[64px] justify-center relative">
      {/* Loading spinner - absolute to prevent layout shift */}
      {isPending && (
        <View className="absolute inset-0 justify-center items-center z-10 bg-white/70 rounded-xl">
          <ActivityIndicator size="small" color="#009987" />
        </View>
      )}

      {!localPath ? (
        <TouchableOpacity
          onPress={handleDownload}
          disabled={isPending}
          className="flex-row items-center space-x-4"
        >
          <View className="p-3 rounded-full bg-gray-200">
            <Download size={24} color="#9ca3af" />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-700 font-medium">
              Tap to download document
            </Text>
            <Text className="text-xs text-gray-500">{filename}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={openDocument}
          activeOpacity={0.7}
          className="flex-col justify-center items-center space-y-1"
        >
          <Text className="text-base text-gray-700 font-medium text-center">
            📄 Open Document
          </Text>
          <Text className="text-xs text-gray-500 text-center">{filename}</Text>
        </TouchableOpacity>
      )}

      {/* Optional caption */}
      {caption ? (
        <Text className="text-sm text-gray-700 text-center italic mt-2">
          {caption}
        </Text>
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


export function WaInboxInteractive({ interactiveBody, messageContent }: Props) {
  const [openSections, setOpenSections] = useState(false);

  return (
    <View className="p-3 rounded-xl bg-muted/50 space-y-3">
      {/* Responded */}
      {messageContent ? (
        <View className="flex-row items-center space-x-2">
          <LucideCheckCircle2 size={16} color="#4ade80" />
          <Text className="text-sm text-muted-foreground">
            {`${messageContent} responded`}
          </Text>
        </View>
      ) : null}

      {/* Header */}
      {interactiveBody?.header && (
        <WaInboxInteractiveHeader interactiveBody={interactiveBody} />
      )}

      {/* Body */}
      {interactiveBody?.body?.text && (
        <Text className="text-base text-foreground leading-5">
          {interactiveBody.body.text}
        </Text>
      )}

      {/* Footer */}
      {interactiveBody?.footer?.text && (
        <Text className="text-xs text-muted-foreground">
          {interactiveBody.footer.text}
        </Text>
      )}

      {/* Buttons (wrap nicely like web) */}
      {interactiveBody?.action?.buttons && interactiveBody?.action?.buttons?.length > 0 && (
        <View className="flex gap-2">
          {interactiveBody.action.buttons.map((button) => (
            <Pressable
              key={button?.reply?.id}
              className="bg-rateUpGreen px-4 py-2 rounded-lg flex items-center justify-center"
            >
              <Text className="text-white text-sm font-medium">
                {button?.reply?.title || button?.reply?.id}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Flow CTA */}
      {interactiveBody?.action?.parameters?.flow_cta && (
        <Pressable className="bg-rateUpGreen px-4 py-3 rounded-lg items-center">
          <Text className="text-white font-medium">
            {interactiveBody?.action?.parameters?.flow_cta}
          </Text>
        </Pressable>
      )}

      {/* URL CTA */}
      {interactiveBody?.action?.name === "cta_url" && (
        <Pressable
          className="bg-blue-500 px-4 py-3 rounded-lg items-center"
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
            className="w-full bg-muted rounded-lg px-4 py-3 items-center"
          >
            <Text className="text-sm font-semibold">
              {interactiveBody?.action?.button}
            </Text>
          </Pressable>

          {/* Sections list */}
          {openSections && (
            <View className="mt-2 bg-white rounded-xl p-3 max-h-80">
              {interactiveBody?.action?.sections?.map((section) => (
                <View key={section.title} className="mb-4">
                  <Text className="text-xs font-semibold text-muted-foreground mb-2">
                    {section.title}
                  </Text>

                  <View className="h-[1px] bg-gray-200 mb-2" />

                  {section?.rows?.map((r) => (
                    <Pressable
                      key={r.id}
                      className="py-2"
                      onPress={() => console.log("Selected:", r)}
                    >
                      <Text className="text-sm font-medium">{r.title}</Text>

                      {r.description && (
                        <Text className="text-xs text-muted-foreground mt-1">
                          {r.description}
                        </Text>
                      )}

                      <View className="h-[1px] bg-gray-200 mt-3" />
                    </Pressable>
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
  const header = interactiveBody?.header;
  if (!header) return null;

  switch (header.type) {
    case "text":
      return <Text className="text-base font-semibold">{header.text}</Text>;
    case "image":
      return (
        <Image
          source={{ uri: header.image?.link }}
          style={{ height: 200, width: "100%", borderRadius: 12 }}
          resizeMode="cover"
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
            (param: any) =>
              param?.type?.toLowerCase() === component?.type?.toLowerCase(),
          ) ?? undefined;

        return (
          <WaInboxTemplateComponents
            key={i}
            templateComponent={component}
            parameterData={param}
          />
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

const WaInboxTemplateHeader = ({
  templateComponent,
  parameterData,
}: Props3) => {
  const format = templateComponent?.format?.toLowerCase(); // "image", "document", etc
  //@ts-ignore
  const mediaId = parameterData?.parameters?.[0]?.[format]?.link;
  const fallback = templateComponent?.example?.header_handle?.[0];
  const sanitizeUrl = (url?: string) => url?.replace(/([^:]\/)\/+/g, "$1"); // removes double slashes after protocol
  const uri = mediaId ? sanitizeUrl(mediaId) : fallback;
  switch (templateComponent.format) {
    case "TEXT":
      return (
        <Text className="text-base font-semibold mb-2">
          {templateComponent.text}
        </Text>
      );
    case "IMAGE":
      return (
        <Image
          source={{ uri }}
          className="w-full aspect-square"
          resizeMode="contain"
        />
      );

    case "DOCUMENT":
      return (
        <View className="h-72 mb-3 rounded-md overflow-hidden">
          <Text>{uri}</Text>
        </View>
      );
    default:
      return null;
  }
};

const WaInboxTemplateBody = ({ templateComponent, parameterData }: Props3) => {
  const text = templateComponent?.text;
  const values =
    parameterData?.parameters?.map((d) => d?.text) ??
    templateComponent?.example?.body_text?.[0] ??
    [];

  return (
    <Text className="text-[15px] text-neutral-800 mb-2">
      {TextWithFormatting({ text, examples: values })}
    </Text>
  );
};

const WaInboxTemplateFooter = ({ text }: WaTemplateFetchBodyComponent) => {
  return <Text className="text-xs text-gray-500 italic mt-1">{text}</Text>;
};

const WaInboxTemplateButtons = ({ buttons }: WaTemplateFetchBodyComponent) => {
  if (!buttons?.length) return null;

  return (
    <View className="border-t border-gray-200 mt-2">
      {buttons.map((button, i) => (
        <TouchableOpacity
          key={i}
          className="flex-row items-center py-3 border-b border-gray-100"
          onPress={() => {
            // handle reply button press here
          }}
        >
          <Reply size={18} color="#000" className="mr-2 ml-1" />
          <Text className="text-sm">{button?.text}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
