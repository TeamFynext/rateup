import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Pressable,
} from "react-native";
import { PlusIcon, EmojiIcon, SendIcon } from "@/src/constants/imageExports";
import DocumentPicker from "react-native-document-picker";
import { useContactIdStore, useMediaStore, useMessageStore } from "@/src/utils/store";
import { useSendNewWaMessage } from "@/src/api/inbox/messages/message.query";
import { Text } from "react-native";

const MessageSendPanel = () => {
  const screenWidth = Dimensions.get("window").width;
  const inputWidth = screenWidth * 0.85;
  const selectedContactId = useContactIdStore((state) => state.selectedContactId);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const panelAnim = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const { media, addMedia, resetMedia } = useMediaStore();
  const { addMessage } = useMessageStore(); // To manage optimistic message sending

  //@ts-ignore
  const mutation = useSendNewWaMessage(selectedContactId);

  const togglePanel = () => {
    const toValue = panelVisible ? 0 : 1;

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
    ]).start();

    setPanelVisible(!panelVisible);
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

      const files = res.map((file) => ({
        type,
        url: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
        name: file.name,
        key: `${file.uri}_${Date.now()}`,
      }));
      //@ts-ignore
      addMedia(files);
      togglePanel();
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error("Document pick error:", err);
      }
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!selectedContactId) return;

    const isMedia = media.length > 0;
    const payload = isMedia
      ? { type: "media", text: { body: trimmed || "" }, media }
      : { type: "text", text: { body: trimmed }, media: [] };

    // Optimistic message update
    addMessage(selectedContactId, {
      type: "text",
      body: {
        text: trimmed,
        ...(isMedia && {
          url: media[0].url,
          urlType: media[0].type,
          filename: media[0].name,
        }),
      },
    });

    mutation.mutate(payload);
    setMessage("");
    resetMedia(); // Reset media after sending
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  return (
    <View className="bg-white pt-3 px-2 relative">
      {/* Media Picker Panel */}
      {panelVisible && (
        <Pressable
          onPress={togglePanel}
          className="absolute top-0 left-0 right-0 bottom-16 z-50 bg-black/20"
        >
          <Animated.View
            className="absolute bottom-16 left-2 right-2 bg-white p-4 rounded-xl flex-row justify-between shadow-md"
            style={{ transform: [{ translateY: panelTranslateY }] }}
          >
            <TouchableOpacity onPress={() => pickMedia("image")}>
              <View className="items-center">
                <Text className="text-blue-600 text-xs">📷</Text>
                <Text className="text-xs mt-1">Image</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickMedia("video")}>
              <View className="items-center">
                <Text className="text-red-500 text-xs">🎥</Text>
                <Text className="text-xs mt-1">Video</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickMedia("document")}>
              <View className="items-center">
                <Text className="text-green-600 text-xs">📄</Text>
                <Text className="text-xs mt-1">Document</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickMedia("audio")}>
              <View className="items-center">
                <Text className="text-purple-500 text-xs">🎙️</Text>
                <Text className="text-xs mt-1">Audio</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      )}

      {/* Message Input Bar */}
      <View className="flex-row items-center justify-between">
        <View
          className="flex-row items-center bg-white border border-[#E2E5ED] rounded-full px-3 gap-2"
          style={{ width: inputWidth, height: 48 }}
        >
          <TouchableOpacity onPress={togglePanel}>
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <PlusIcon />
            </Animated.View>
          </TouchableOpacity>

          <TextInput
            className="flex-1 text-base text-black py-2"
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

        <TouchableOpacity onPress={handleSend} className="ml-2">
          <SendIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageSendPanel;
