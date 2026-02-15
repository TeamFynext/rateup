import React, { useEffect, useRef, useState } from "react";
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
  useColorScheme,
  Switch,
} from "react-native";
import { useForm } from "react-hook-form";
import * as DocumentPicker from "expo-document-picker";
import {
  useContactIdStore,
  useMediaStore,
  useSessionActiveStore,
  useVoiceRecordStore,
} from "@/src/utils/store";
import {
  useCreatePrivateMessage,
  useSendNewWaMessage,
} from "@/src/api/inbox/messages/message.query";
import { uploadFile } from "@/src/utils/fileUpload";
import VoiceRecorder from "./VoiceRecorder";
import {
  ImageIcon,
  VideoIcon,
  MusicIcon,
  File,
  Paperclip,
  Plus,
  Send,
} from "lucide-react-native"; // Import Lucide icons
import TemplateSending from "./TemplateSending";
import { generateInternalMessageId } from "@/src/utils/chatbox_utils";
import { create } from "zustand";
import { colors } from "@/src/constants/constants";

type FormValues = {
  type: "text" | "media" | "contact" | "location";
  text: {
    body: string;
  };
  media: any[]; // adjust type if you know it
  contacts: {
    contactIds: string[];
    groupIds: string[];
  };
  location: any | null;
};

const MessageSendPanel = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "white" : "black";
  const selectedContactId = useContactIdStore((s) => s.selectedContactId);
  const { media, resetMedia, addMedia, removeMedia } = useMediaStore();
  const { isRecording, audioUrl, setAudioUrl } = useVoiceRecordStore();
  const { body, setBody, resetBody } = useMessageBodyStore();
  //@ts-ignore
  const sendnewWaMessage = useSendNewWaMessage(selectedContactId);
  const createPrivateMessage = useCreatePrivateMessage(selectedContactId);
  let { isSessionActive } = useSessionActiveStore();
  //@ts-ignore
  isSessionActive = isSessionActive === "true";
  const form = useForm<FormValues>({
    defaultValues: {
      type: "text",
      text: { body: "" },
      media: media,
      contacts: {
        contactIds: [],
        groupIds: [],
      },
      location: null,
    },
  });
  const { setValue, reset, watch, handleSubmit } = form;
  const textBody = watch("text.body");
  useEffect(() => {
    setValue("media", [...media], { shouldDirty: true });

    if (media.length && !watch("text.body")?.trim()) {
      setValue("type", "media");
    } else {
      setValue("type", "text");
    }
  }, [media]);

  const values = watch();

  useEffect(() => {
    if (values.type === "location" && values.location) {
      handleSend();
    }
  }, [values]);

  useEffect(() => {
    if (audioUrl) {
      setBody({
        ...body,
        media: [{ url: audioUrl, type: "audio", name: "voice-note" }],
        type: "media",
        text: {
          body: "",
        },
      });
    }
  }, [audioUrl]);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [panelVisible, setPanelVisible] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [templateOptionsVisible, setTemplateOptionsVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [mediaPanelVisible, setMediaPanelVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

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
      const res = await DocumentPicker.getDocumentAsync({
        type:
          type === "image"
            ? "image/*"
            : type === "video"
            ? "video/*"
            : type === "audio"
            ? "audio/*"
            : "*/*",
        multiple: true,
        copyToCacheDirectory: false,
      });

      // Handle cancelation
      if (res?.canceled || !res?.assets?.length) return;

      for (const file of res.assets) {
        const tempKey = `${file.name}-${Date.now()}`;
        addMedia({
          key: tempKey,
          type,
          name: file.name,
          url: null,
          uploading: true,
        });

        try {
          const uploadable = {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || "application/octet-stream",
          };

          const key = await uploadFile(uploadable);
          const cloudUrl = `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${key}`;
          removeMedia(tempKey);
          addMedia({
            key,
            type,
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
      console.error("expo-document-picker error:", err);
    }
  };

  const handleSendPrivateMessage = handleSubmit((values) => {
    if (!values.text.body && !values.media.length) return;
    const id = generateInternalMessageId();
    createPrivateMessage.mutate({ ...values, messageId: id });
    reset(initialMessgabody);
    resetMedia();
    setAudioUrl(null);
  });

  const handleSend = handleSubmit((values) => {
    if (!values.text.body && !values.media.length) return;
    sendnewWaMessage.mutate(values);
    reset(initialMessgabody);
    resetMedia();
    setAudioUrl(null);
  });

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
    <View className="bg-white dark:bg-slate-950 pt-3 px-3">
      {isSessionActive ? (
        <View className="opacity-100" pointerEvents="auto">
          {media.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3 px-1">
              {media.map((item) => {
                return (
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
                        onError={(e) => {}}
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
                );
              })}
            </View>
          )}

          {mediaPanelVisible && (
            <View className="flex-row justify-between px-1 mb-3">
              <TouchableOpacity
                onPress={() => pickMedia("image")}
                className="items-center mx-2"
              >
                <ImageIcon size={30} color={iconColor} strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickMedia("video")}
                className="items-center mx-2"
              >
                <VideoIcon size={30} color={iconColor} strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickMedia("document")}
                className="items-center mx-2"
              >
                <File size={30} color={iconColor} strokeWidth={1.5} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickMedia("audio")}
                className="items-center mx-2"
              >
                <MusicIcon size={30} color={iconColor} strokeWidth={1.5} />
              </TouchableOpacity>

              <VoiceRecorder
                iconColor={iconColor}
                onRecordingUpload={({ key, url, name }) =>
                  //@ts-ignore
                  addMedia({ key, url, name, type: "audio", uploading: false })
                }
              />
            </View>
          )}

          <View className="flex">
            <View className="flex-row items-center justify-start mb-3 px-2 gap-1">
              <View
                className={`rounded-md w-24 flex items-center justify-center ${
                  isPrivate ? "bg-amber-50" : "bg-blue-50"
                }`}
              >
                <Text
                  className={`text-sm font-medium px-2 py-1 ${
                    isPrivate ? "text-amber-500" : "text-primaryBlue"
                  }`}
                >
                  {isPrivate ? "Private Note" : "Message"}
                </Text>
              </View>

              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{
                  false: colors["primary-blue"],
                  true: colors["amber-500"],
                }}
                thumbColor={isDark ? "white" : "black"}
              />
            </View>

            <View className="flex-row items-center justify-center">
              <View className="relative flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-3 py-2 space-x-2">
                <TouchableOpacity onPress={togglePanel}>
                  <Animated.View style={rotateStyle}>
                    <View className="bg-primaryBlue rounded-full p-1">
                      <Plus color={"white"} />
                    </View>
                  </Animated.View>
                </TouchableOpacity>

                {templateOptionsVisible && (
                  <View className="absolute bottom-12 rounded-xl shadow-xl p-2 z-50 bg-primaryBlue">
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
                      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200 bg-primaryBlue rounded-t-2xl">
                        <Text className="text-white text-lg font-semibold">
                          Send Template
                        </Text>
                        <TouchableOpacity
                          onPress={() => setTemplateModalVisible(false)}
                          className="w-8 h-8 rounded-full bg-white/20 items-center justify-center"
                        >
                          <Text className="text-white text-xl font-bold">
                            ×
                          </Text>
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

                <TextInput
                  className="flex-1 text-base text-black max-h-28 px-1"
                  placeholder="Type a message"
                  placeholderTextColor="#7A8289"
                  multiline
                  value={textBody}
                  onChangeText={(val) =>
                    setValue("text.body", val, { shouldDirty: true })
                  }
                />
                {!isPrivate && (
                  <TouchableOpacity
                    onPress={() => setMediaPanelVisible((prev) => !prev)}
                  >
                    <Paperclip color={"black"} strokeWidth={1} />
                  </TouchableOpacity>
                )}
              </View>

              <View>
                {isPrivate ? (
                  <TouchableOpacity
                    onPress={handleSendPrivateMessage}
                    disabled={isUploading}
                    className="ml-2 w-10 h-10 items-center justify-center"
                  >
                    <View className="p-2 bg-amber-500 rounded-full h-10 w-10 flex items-center justify-center">
                      <Send color={"white"} size={16} />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={isUploading}
                    className="ml-2 w-10 h-10 items-center justify-center"
                  >
                    {isUploading ? (
                      <ActivityIndicator
                        size="small"
                        color={colors["primary-blue"]}
                      />
                    ) : (
                      <View className="p-2 bg-primaryBlue rounded-full h-10 w-10 flex items-center justify-center">
                        <Send color={"white"} size={16} />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View>
          <View className="flex-row items-center justify-center">
            <View className="relative flex-row items-center flex-1 bg-white border border-gray-200 rounded-full px-3 py-2 space-x-2">
              <TouchableOpacity onPress={togglePanel}>
                <Animated.View style={rotateStyle}>
                  <View className="bg-primaryBlue rounded-full p-1">
                    <Plus color={"white"} />
                  </View>
                </Animated.View>
              </TouchableOpacity>

              {templateOptionsVisible && (
                <View className="absolute bottom-12 rounded-xl shadow-xl p-2 z-50 bg-primaryBlue">
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
              <View className="p-2 bg-primaryBlue rounded-full h-10 w-10 flex items-center justify-center">
                <Send color={"white"} size={16} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default MessageSendPanel;

const initialMessgabody = {
  type: "text",
  media: [],
  text: { body: "" },
  contacts: {
    contactIds: [],
    groupIds: [],
  },
  location: null,
};

export const useMessageBodyStore = create<{
  body: {
    type: string;
    media?: any[];
    text?: { body: string };
    contacts?: {
      contactIds: string[];
      groupIds: string[];
    };
    location?: {
      longitude: string;
      latitude: string;
      name?: string;
      address?: string;
    };
  };
  setBody: (value) => void;
  resetBody: () => void;
}>((set) => ({
  body: initialMessgabody,
  setBody: (value) => set({ body: value }),
  resetBody: () => set({ body: initialMessgabody }),
}));
