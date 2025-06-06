import { useGetMediaFile } from "@/src/api/inbox/messages/message.query";
import { getFileUrlFromKey } from "@/src/utils/fileUpload";
import requestStoragePermission from "@/src/utils/permission";
import {
  Download,
  Headphones,
  LucideCheckCircle2,
  Pause,
  Play,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
} from "react-native";
import RNFS from "react-native-fs";
import Video from "react-native-video";
import { fromByteArray } from "base64-js";
import { useToast } from "react-native-toast-notifications";
import { Linking } from "react-native";
import FileViewer from "react-native-file-viewer";
import { WaSendMessageBody } from "@/src/api/inbox/types";
import { Buffer } from "buffer";

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
            <Text className="underline text-blue-600 text-lg">{text}</Text>
          </Pressable>
        ) : (
          <Text className="text-lg" key={index}>
            {text}
          </Text>
        )
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
          <Pressable
            className="absolute top-5 right-5 z-10"
            onPress={closeModal}
          >
            <Text className="text-white text-3xl">✕</Text>
          </Pressable>
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            style={{ resizeMode: "contain" }}
          />
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
  const appFolderPath = `${RNFS.ExternalDirectoryPath}/wa_media`;
  const downloadPath = `${appFolderPath}/${id}.mp4`;
  const link = id.startsWith("http") ? id : null;
  const toast = useToast();
  // Check if file already exists on mount
  useEffect(() => {
    const checkLocalFile = async () => {
      const appFolderExists = await RNFS.exists(appFolderPath);
      if (!appFolderExists) {
        await RNFS.mkdir(appFolderPath);
      }
      const exists = await RNFS.exists(downloadPath);
      const hasPermission = await requestStoragePermission();
      if (hasPermission && exists) {
        setLocalPath("file://" + downloadPath);
      }
    };
    checkLocalFile();
  }, [downloadPath]);

  const handleDownload = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      toast.show("Storage permission denied.", { type: "warning" });
      return;
    }

    // Recheck existence before downloading
    const exists = await RNFS.exists(downloadPath);
    if (exists) {
      setLocalPath("file://" + downloadPath);
      return;
    }

    mutate(id, {
      onSuccess: async (arrayBufferData) => {
        const byteArray = new Uint8Array(arrayBufferData);
        const base64Data = fromByteArray(byteArray);

        try {
          await RNFS.writeFile(downloadPath, base64Data, "base64");
          setLocalPath("file://" + downloadPath);
        } catch (error) {
          console.error("File write failed:", error);
        }
      },
      onError: () => {
        toast.show("Video download failed.", { type: "danger" });
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
        <View className="flex-1 justify-center items-center bg-black">
          <TouchableOpacity
            className="absolute top-5 right-5 z-10"
            onPress={closeModal}
          >
            <Text className="text-white text-3xl">✕</Text>
          </TouchableOpacity>
          <Video
            source={{ uri: localPath ?? link! }}
            controls
            paused={false}
            style={{ width: "90%", height: "90%" }}
            resizeMode="contain"
          />
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
  const playerRef = useRef<any>(null);
  const appFolderPath = `${RNFS.ExternalDirectoryPath}/wa_media`;
  const downloadPath = `${appFolderPath}/${id}.mp3`;
  const link = id.startsWith("http") ? id : null;
  const toast = useToast();

  useEffect(() => {
    const checkLocalFile = async () => {
      const appFolderExists = await RNFS.exists(appFolderPath);
      if (!appFolderExists) await RNFS.mkdir(appFolderPath);

      const exists = await RNFS.exists(downloadPath);
      const hasPermission = await requestStoragePermission();
      if (hasPermission && exists) {
        setLocalPath("file://" + downloadPath);
      }
    };
    checkLocalFile();
  }, [downloadPath]);

  const handleDownload = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      toast.show("Storage permission denied.", { type: "warning" });
      return;
    }

    const exists = await RNFS.exists(downloadPath);
    if (exists) {
      setLocalPath("file://" + downloadPath);
      return;
    }

    mutate(id, {
      onSuccess: async (arrayBufferData) => {
        const byteArray = new Uint8Array(arrayBufferData);
        const base64Data = fromByteArray(byteArray);
        try {
          await RNFS.writeFile(downloadPath, base64Data, "base64");
          setLocalPath("file://" + downloadPath);
        } catch (error) {
          console.error("Audio file write failed:", error);
        }
      },
      onError: () => {
        toast.show("Audio download failed.", { type: "danger" });
      },
    });
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
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
              onPress={togglePlay}
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
                style={{ width: `${(progress / duration) * 100 || 0}%` }}
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

          {/* Hidden Video */}
          <Video
            ref={playerRef}
            source={{ uri: localPath ?? link! }}
            paused={!isPlaying}
            onEnd={() => {
              setIsPlaying(false);
              setProgress(0);
              playerRef.current?.seek(0);
            }}
            onLoad={(meta) => setDuration(meta.duration)}
            onProgress={(p) => setProgress(p.currentTime)}
            playInBackground={false}
            playWhenInactive={false}
            style={{ width: 0, height: 0 }}
          />
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
  const toast = useToast();
  const [isPending, setIsPending] = useState(false);
  const [localPath, setLocalPath] = useState<string | null>(null);

  // Parse messageContent
  const [id, filename = "document.pdf", caption = ""] =
    messageContent.split("_caption_");
  const appFolderPath = `${RNFS.ExternalDirectoryPath}/wa_media`;
  const downloadPath = `${appFolderPath}/${filename}`;
  useEffect(() => {
    // Check if the document exists locally
    const checkLocalFile = async () => {
      const appFolderExists = await RNFS.exists(appFolderPath);
      if (!appFolderExists) {
        await RNFS.mkdir(appFolderPath); // Ensure the folder exists
      }

      const exists = await RNFS.exists(downloadPath); // Check if the document is already downloaded
      if (exists) {
        setLocalPath("file://" + downloadPath); // Set the local path
      }
    };

    checkLocalFile();
  }, [downloadPath]);

  const { mutateAsync } = useGetMediaFile();

  const handleDownload = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      toast.show("Storage permission denied.", { type: "warning" });
      return;
    }

    const folderPath = `${RNFS.ExternalDirectoryPath}/wa_media`;
    const fullPath = `${folderPath}/${filename}`;
    if (id.startsWith("http")) {
      const downloadOptions = {
        fromUrl: id, // direct URL to the document
        toFile: fullPath,
        background: true,
        discretionary: true,
      };

      try {
        setIsPending(true);
        const result = await RNFS.downloadFile(downloadOptions).promise;
        if (result.statusCode === 200) {
          setIsPending(false);
          setLocalPath("file://" + fullPath);
        } else {
          setIsPending(false);
          toast.show("Failed to download document.", { type: "danger" });
        }
      } catch (error) {
        setIsPending(false);
        console.error("Download error:", error);
        toast.show("Error while downloading.", { type: "danger" });
      }
    } else {
      try {
        setIsPending(true);

        // 1. Get binary file from backend using media ID
        const fileData = await mutateAsync(id); // `id` is actually the mediaId

        // 2. Write to filesystem using react-native-fs
        await RNFS.writeFile(
          downloadPath,
          Buffer.from(fileData).toString("base64"),
          "base64"
        );

        setLocalPath("file://" + downloadPath);
      } catch (error) {
        console.error("Download error:", error);
        toast.show("Failed to download document.", { type: "danger" });
      } finally {
        setIsPending(false);
      }
    }
  };

  const openDocument = async () => {
    if (localPath) {
      try {
        await FileViewer.open(localPath, {
          showOpenWithDialog: true, // shows the "Open with..." prompt
        });
      } catch (err) {
        console.error("Error opening file:", err);
        toast.show("Unable to open the document.", { type: "danger" });
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
  return (
    <View className="p-3 rounded-xl bg-muted/50 space-y-2">
      {messageContent ? (
        <View className="flex-row items-center space-x-1">
          <LucideCheckCircle2 size={16} color="#4ade80" />
          <Text className="text-sm text-muted-foreground">
            {`${messageContent} responded`}
          </Text>
        </View>
      ) : null}

      {interactiveBody?.header && (
        <WaInboxInteractiveHeader interactiveBody={interactiveBody} />
      )}

      {interactiveBody?.body?.text && (
        <Text className="text-base text-foreground">
          {interactiveBody.body.text}
        </Text>
      )}

      {interactiveBody?.footer?.text && (
        <Text className="text-xs text-muted-foreground">
          {interactiveBody.footer.text}
        </Text>
      )}

      {interactiveBody?.action && (
        <TouchableOpacity className="bg-rateUpGreen rounded-md">
          <Text className="p-2">
            {interactiveBody.action?.parameters?.flow_cta}
          </Text>
        </TouchableOpacity>
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
