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
  Modal,
  ScrollView,
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
import {
  ImageIcon,
  VideoIcon,
  MusicIcon,
  File,
  Paperclip,
} from "lucide-react-native"; // Import Lucide icons
import { SendIcon, PlusIcon } from "@/src/constants/imageExports";
import TemplateSending from "./TemplateSending";

const MessageSendPanel = () => {
  const selectedContactId = useContactIdStore((s) => s.selectedContactId);
  const { media, addMedia, resetMedia, removeMedia } = useMediaStore();
  const { addMessage } = useMessageStore();
  const voiceReset = useVoiceStore((s) => s.reset);
  //@ts-ignore
  const mutation = useSendNewWaMessage(selectedContactId);
  // let { isSessionActive } = useSessionActiveStore();
  let isSessionActive = "true";
  //@ts-ignore
  isSessionActive = isSessionActive === "true";

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [templateOptionsVisible, setTemplateOptionsVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [mediaPanelVisible, setMediaPanelVisible] = useState(false);

  //@ts-ignore
  const isUploading = media.some((m) => m.uploading);

  const togglePanel = async () => {
    Animated.timing(rotateAnim, {
      toValue: panelVisible ? 0 : 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setPanelVisible(!panelVisible));
    setTemplateOptionsVisible((prev) => !prev);
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
    <View className="bg-white pt-3 px-3">
      {isSessionActive ? (
        <View className="opacity-100" pointerEvents="auto">
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
                      {item.type !== "image" && (
                        <View className="w-full h-full items-center justify-center bg-gray-100 rounded">
                          {item.type === "video" && (
                            <VideoIcon size={20} color={"black"} />
                          )}
                          {item.type === "audio" && (
                            <MusicIcon size={20} color={"black"} />
                          )}
                          {item.type === "document" && (
                            <File size={20} color={"black"} />
                          )}
                          <Text className="text-xs text-center px-1 mt-1">
                            {item.type}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {mediaPanelVisible && (
            <View className="flex-row justify-between px-1 mb-3">
              <TouchableOpacity
                onPress={() => pickMedia("image")}
                className="items-center mx-2"
              >
                <ImageIcon size={30} color="black" strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickMedia("video")}
                className="items-center mx-2"
              >
                <VideoIcon size={30} color="black" strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickMedia("document")}
                className="items-center mx-2"
              >
                <File size={30} color="black" strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickMedia("audio")}
                className="items-center mx-2"
              >
                <MusicIcon size={30} color="black" strokeWidth={1.5} />
              </TouchableOpacity>

              <VoiceRecorder
                onRecordingUpload={({ key, url, name }) =>
                  //@ts-ignore
                  addMedia({ key, url, name, type: "audio", uploading: false })
                }
              />
            </View>
          )}

          <View className="flex-row items-center justify-center">
            <View className="relative flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-3 py-2 space-x-2">
              <TouchableOpacity onPress={togglePanel}>
                <Animated.View style={rotateStyle}>
                  <PlusIcon />
                </Animated.View>
              </TouchableOpacity>

              {templateOptionsVisible && (
                <View className="absolute bottom-12 rounded-xl shadow-xl p-2 z-50 bg-rateUpGreen">
                  <TouchableOpacity
                    onPress={() => {
                      setTemplateModalVisible(true);
                      setTemplateOptionsVisible(false);
                    }}
                    className="py-1 px-3"
                  >
                    <Text className="text-white text-sm font-semibold">
                      Send Template
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Modal
                visible={templateModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTemplateModalVisible(false)}
              >
                <View className="flex-1 bg-black/40 items-center justify-center px-4">
                  <ScrollView className="bg-white w-full rounded-xl max-h-[50%] min-h-[50%] p-4">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-xl font-semibold text-black">
                        Send Template
                      </Text>
                      <TouchableOpacity
                        onPress={() => setTemplateModalVisible(false)}
                      >
                        <Text className="text-base text-red-600">Close</Text>
                      </TouchableOpacity>
                    </View>
                    <TemplateSending
                      onClose={() => setTemplateModalVisible(false)}
                      contact={selectedContactId}
                    />
                  </ScrollView>
                </View>
              </Modal>

              <TextInput
                className="flex-1 text-base text-black max-h-28"
                placeholder="Type a message or '/' for commands"
                placeholderTextColor="#7A8289"
                multiline
                value={message}
                onChangeText={setMessage}
              />

              <TouchableOpacity
                onPress={() => setMediaPanelVisible((prev) => !prev)}
              >
                <Paperclip color={"black"} strokeWidth={1} />
              </TouchableOpacity>
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
      ) : (
        <View>
          <View className="flex-row items-center justify-center">
            <View className="relative flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-3 py-2 space-x-2">
              <TouchableOpacity onPress={togglePanel}>
                <Animated.View style={rotateStyle}>
                  <PlusIcon />
                </Animated.View>
              </TouchableOpacity>

              {templateOptionsVisible && (
                <View className="absolute bottom-12 rounded-xl shadow-xl p-2 z-50 bg-rateUpGreen">
                  <TouchableOpacity
                    onPress={() => {
                      setTemplateModalVisible(true);
                      setTemplateOptionsVisible(false);
                    }}
                    className="py-1 px-3"
                  >
                    <Text className="text-white text-sm font-semibold">
                      Send Template
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Modal
                visible={templateModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTemplateModalVisible(false)}
              >
                <View className="flex-1 bg-black/30 justify-center items-center px-4">
                  <View className="bg-white w-full rounded-2xl overflow-hidden max-h-[80%] min-h-[50%] shadow-lg">
                    <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200 bg-rateUpGreen rounded-t-2xl">
                      <Text className="text-white text-lg font-semibold">
                        Send Template
                      </Text>
                      <TouchableOpacity
                        onPress={() => setTemplateModalVisible(false)}
                        className="w-8 h-8 rounded-full bg-white/20 items-center justify-center"
                      >
                        <Text className="text-white text-xl font-bold">×</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      contentContainerStyle={{
                        padding: 16,
                        paddingBottom: 32,
                      }}
                      className="bg-white"
                    >
                      <TemplateSending
                        onClose={() => setTemplateModalVisible(false)}
                        contact={selectedContactId}
                      />
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              <View
                className="flex-row items-center flex-1 opacity-50"
                pointerEvents="none"
              >
                <TextInput
                  className="flex-1 text-base text-black max-h-28 text-center"
                  placeholder="Session expired"
                  placeholderTextColor="red"
                  multiline
                />
              </View>
            </View>

            <TouchableOpacity className="ml-2 w-10 h-10 items-center justify-center opacity-50">
              <SendIcon />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default MessageSendPanel;
