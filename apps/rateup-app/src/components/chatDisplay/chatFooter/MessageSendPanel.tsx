import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
  Image,
  ActivityIndicator,
  Text,
} from "react-native";
import DocumentPicker from "react-native-document-picker";
import {
  useContactIdStore,
  useMediaStore,
  useMessageStore,
} from "@/src/utils/store";
import { useSendNewWaMessage } from "@/src/api/inbox/messages/message.query";
import { PlusIcon, EmojiIcon, SendIcon } from "@/src/constants/imageExports";
import { uploadFile } from "@/src/utils/fileUpload";

const MessageSendPanel = () => {
  const selectedContactId = useContactIdStore((s) => s.selectedContactId);
  const { media, addMedia, resetMedia, removeMedia } = useMediaStore();
  const { addMessage } = useMessageStore();
  //@ts-ignore
  const mutation = useSendNewWaMessage(selectedContactId);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const panelAnim = useRef(new Animated.Value(0)).current;

  const [message, setMessage] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const togglePanel = () => {
    const isOpening = !panelVisible;
    const toValue = isOpening ? 1 : 0;

    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(panelAnim, {
        toValue,
        duration: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Only update state AFTER animation completes
      setPanelVisible(isOpening);
    });
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

        // Step 1: Show placeholder with loading
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

          // Step 2: Replace with final uploaded item
          removeMedia(tempKey);
          addMedia({
            key,
            type,
            //@ts-ignore
            name: file.name,
            url: cloudUrl,
            uploading: false,
          });
        } catch (uploadErr) {
          console.error("Upload failed:", file.name, uploadErr);
          removeMedia(tempKey);
        }
      }

      togglePanel();
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error("Media picker error:", err);
      }
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!selectedContactId) return;

    const isMedia = media.length > 0;

    const payload = isMedia
      ? {
          type: "media",
          text: { body: trimmed || "" },
          //@ts-ignore
          media: media.filter((m) => !m.uploading), // don't send incomplete ones
        }
      : {
          type: "text",
          text: { body: trimmed },
          media: [],
        };

    addMessage(selectedContactId, {
      type: "text",
      body: {
        text: trimmed,
        ...(isMedia && {
          url: media[0]?.url,
          urlType: media[0]?.type,
          filename: media[0]?.name,
        }),
      },
    });

    mutation.mutate(payload);
    setMessage("");
    resetMedia();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <View className="bg-white pt-3 px-3 pb-5">
      {/* Backdrop & Panel */}
      {panelVisible && (
        <Pressable
          onPress={togglePanel}
          className="absolute top-0 left-0 right-0 bottom-0 z-40 bg-black/30"
        >
          <Animated.View
            className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl px-6 py-4 flex-row justify-between items-center shadow-lg"
            style={{ transform: [{ translateY: panelTranslateY }] }}
          >
            {["image", "video", "document", "audio"].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => pickMedia(type as any)}
                className="items-center"
              >
                <Text className="text-2xl">
                  {
                    {
                      image: "🖼️",
                      video: "🎬",
                      document: "📄",
                      audio: "🎵",
                    }[type]
                  }
                </Text>
                <Text className="text-xs mt-1 capitalize text-gray-600">
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      )}

      {/* Media Preview */}
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

      {/* Input Bar */}
      <View className="flex-row items-end">
        <View className="flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-3 py-2 space-x-2">
          <TouchableOpacity onPress={togglePanel}>
            <Animated.View
              style={{ transform: [{ rotate: rotateInterpolate }] }}
            >
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
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity>
            <EmojiIcon />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSend}
          className="ml-2 w-10 h-10 items-center justify-center"
        >
          <SendIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageSendPanel;
