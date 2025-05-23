import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
  Text,
} from "react-native";
import DocumentPicker from "react-native-document-picker";
import {
  useContactIdStore,
  useMediaStore,
  useMessageStore,
  useSessionActiveStore,
} from "@/src/utils/store";
import { useSendNewWaMessage } from "@/src/api/inbox/messages/message.query";
import { uploadFile } from "@/src/utils/fileUpload";
import VoiceRecorder, { useVoiceStore } from "./VoiceRecorder";
import { ImageIcon, VideoIcon, MusicIcon, BookText } from "lucide-react-native"; // Import Lucide icons
import { EmojiIcon, SendIcon, PlusIcon } from "@/src/constants/imageExports";

const MessageSendPanel = () => {
  const selectedContactId = useContactIdStore((s) => s.selectedContactId);
  const { media, addMedia, resetMedia, removeMedia } = useMediaStore();
  const { addMessage } = useMessageStore();
  const voiceReset = useVoiceStore((s) => s.reset);
  //@ts-ignore
  const mutation = useSendNewWaMessage(selectedContactId);
  // const {isSessionActive} = useSessionActiveStore();
  const isSessionActive = true

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  //@ts-ignore
  const isUploading = media.some((m) => m.uploading);

  const togglePanel = () => {
    Animated.timing(rotateAnim, {
      toValue: panelVisible ? 0 : 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setPanelVisible(!panelVisible));
  };

  const pickMedia = async (type: "image" | "video" | "audio" | "document") => {
    try {
      const typeMap = {
        image: [DocumentPicker.types.images],
        video: [DocumentPicker.types.video],
        audio: [DocumentPicker.types.audio],
        document: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.plainText,
          DocumentPicker.types.allFiles,
        ],
      };

      const res = await DocumentPicker.pick({
        type: typeMap[type],
        allowMultiSelection: true,
      });

      for (const file of res) {
        const tempKey = `${file.name}-${Date.now()}`;
        //@ts-ignore
        addMedia({
          key: tempKey,
          type,
          //@ts-ignore
          name: file.name,
          //@ts-ignore
          url: null,
          uploading: true,
        });

        try {
          const uploadable = {
            uri: file.uri,
            name: file.name,
            type: file.type || "application/octet-stream",
          };
          //@ts-ignore
          const key = await uploadFile(uploadable);
          const cloudUrl = `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${key}`;
          removeMedia(tempKey);
          //@ts-ignore
          addMedia({
            key,
            type,
            //@ts-ignore
            name: file.name,
            url: cloudUrl,
            uploading: false,
          });
        } catch {
          removeMedia(tempKey);
        }
      }

      togglePanel();
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.error("Picker Error:", err);
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed && media.length === 0) return;

    const payload = media.length
      ? {
          type: "media",
          text: { body: trimmed },
          //@ts-ignore
          media: media.filter((m) => !m.uploading),
        }
      : {
          type: "text",
          text: { body: trimmed },
          media: [],
        };
    //@ts-ignore
    addMessage(selectedContactId, {
      type: "text",
      body: {
        text: trimmed,
        ...(media[0] && {
          url: media[0].url,
          urlType: media[0].type,
          filename: media[0].name,
        }),
      },
    });

    mutation.mutate(payload);
    setMessage("");
    resetMedia();
    voiceReset();
  };

  const rotateStyle = {
    transform: [
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "90deg"],
        }),
      },
    ],
  };

  return (
    <View className="bg-white pt-3 px-3 pb-5">
      <View className={isSessionActive === true ? "opacity-100" : "opacity-50"} pointerEvents={isSessionActive === true ? "auto" : "none" }>
      {media.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-3 px-1">
          {media.map((item) => (
            <View key={item.key} className="relative w-[80px] h-[80px]">
              {/* @ts-ignore */}
              {!item.uploading && (
                <TouchableOpacity
                  onPress={() => {
                    setDeletingKey(item.key);
                    setTimeout(() => {
                      removeMedia(item.key);
                      setDeletingKey(null);
                    }, 300);
                  }}
                  className="absolute -top-1 -right-1 bg-black/60 z-10 w-5 h-5 rounded-full items-center justify-center"
                >
                  {deletingKey === item.key ? (
                    <ActivityIndicator size={12} color="#fff" />
                  ) : (
                    <Text className="text-white text-xs">×</Text>
                  )}
                </TouchableOpacity>
              )}
              {/* @ts-ignore */}
              {item.uploading ? (
                <View className="w-full h-full bg-gray-100 rounded-xl items-center justify-center">
                  <ActivityIndicator size="small" color="#888" />
                  <Text className="text-[10px] text-gray-500 mt-1">
                    Uploading...
                  </Text>
                </View>
              ) : item.type === "image" ? (
                <Image
                  source={{ uri: item.url }}
                  className="w-full h-full rounded-xl"
                />
              ) : (
                <View className="w-full h-full rounded-xl bg-gray-200 items-center justify-center">
                  <Text className="text-[10px] text-center">
                    {item.type.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View className="flex-row justify-between px-1 mb-3">
        <TouchableOpacity
          onPress={() => pickMedia("image")}
          className="items-center mx-2"
        >
          <ImageIcon size={30} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => pickMedia("video")}
          className="items-center mx-2"
        >
          <VideoIcon size={30} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => pickMedia("document")}
          className="items-center mx-2"
        >
          <BookText size={30} color="black" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => pickMedia("audio")}
          className="items-center mx-2"
        >
          <MusicIcon size={30} color="black" />
        </TouchableOpacity>

        <VoiceRecorder
          onRecordingUpload={({ key, url, name }) =>
            //@ts-ignore
            addMedia({ key, url, name, type: "audio", uploading: false })
          }
        />
      </View>

      <View className="flex-row items-end">
        <View className="flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-3 py-2 space-x-2">
          <TouchableOpacity onPress={togglePanel}>
            <Animated.View style={rotateStyle}>
              <PlusIcon />
            </Animated.View>
          </TouchableOpacity>

          <TextInput
            className="flex-1 text-base text-black max-h-28"
            placeholder="Type a message or '/' for commands"
            placeholderTextColor="#7A8289"
            multiline
            value={message}
            onChangeText={setMessage}
          />

          <EmojiIcon />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={isUploading}
          className="ml-2 w-10 h-10 items-center justify-center"
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#009987" />
          ) : (
            <SendIcon />
          )}
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
};

export default MessageSendPanel;
