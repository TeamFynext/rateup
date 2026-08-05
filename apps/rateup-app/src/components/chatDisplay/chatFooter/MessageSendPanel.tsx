import { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Text,
  Modal,
  ScrollView,
  useColorScheme,
  Pressable,
} from "react-native";

import { Colors } from "@/constants/colors";
import { useForm } from "react-hook-form";
import * as DocumentPicker from "expo-document-picker";
import {
  useSelectedContactStore,
  useMediaStore,
  useSessionActiveStore,
  useVoiceRecordStore,
} from "@/utils/store";
import {
  useCreatePrivateMessage,
  useSendNewWaMessage,
} from "@/api/inbox/messages/message.query";
import { uploadFile } from "@/utils/fileUpload";
import { useMessagesStore, useContactsStore } from "@/store/inboxStore";
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
import MentionList from "./mention/MentionList";
import { useMention } from "./mention/useMention";
import { generateInternalMessageId } from "@/utils/chatbox_utils";
import { create } from "zustand";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MessagePlatform } from "@/constants/enums";

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

const MessageSendPanel = ({
  platform,
  whatsappSettingsPhoneId,
  teamId,
}: {
  platform: string;
  whatsappSettingsPhoneId: string;
  teamId: string | null;
}) => {

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "white" : "black";
  const selectedContactId = useSelectedContactStore((s) => s.selectedContact?.id);
  const { media, resetMedia, addMedia, removeMedia } = useMediaStore();
  const { audioUrl, setAudioUrl } = useVoiceRecordStore();
  const { body, setBody } = useMessageBodyStore();
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContactId as string,
    teamId,
    whatsappSettingsPhoneId,
    platform as MessagePlatform
  );
  const createPrivateMessage = useCreatePrivateMessage(selectedContactId);
  let { isSessionActive } = useSessionActiveStore();
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

  const rotateValue = useSharedValue(0);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [templateOptionsVisible, setTemplateOptionsVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [mediaPanelVisible, setMediaPanelVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // @-mentions of teammates, private note only.
  const mention = useMention({
    enabled: isPrivate,
    text: textBody ?? "",
    setText: (value) => setValue("text.body", value, { shouldDirty: true }),
  });

  //@ts-ignore
  const isUploading = media.some((m) => m.uploading);

  const togglePanel = () => {
    const next = !templateOptionsVisible;

    rotateValue.value = withTiming(next ? 1 : 0, {
      duration: 200,
    });

    setTemplateOptionsVisible(next);
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
          url: null as any,
          uploading: true,
        } as any);

        try {
          const uploadable = {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || "application/octet-stream",
          };

          const key = await uploadFile(uploadable as any);
          const cloudUrl = `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${key}`;
          removeMedia(tempKey);
          addMedia({
            key,
            type,
            name: file.name,
            url: cloudUrl,
            uploading: false,
          } as any);
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
    // Mentions go up as ids: the server matches those first and only falls back
    // to scanning `@name` out of the text, which misses names with spaces.
    const mentionedUserIds = mention.getMentionedUserIds(values.text.body ?? "");

    // Optimistic UI update
    if (selectedContactId) {
      const contactId = selectedContactId as string;
      const mockedMessage = {
        id,
        messageId: id,
        createdAt: new Date().toISOString(),
        waCreatedAt: new Date().toISOString(),
        messageBody: {
          exchangeProcess: "privateNote",
          privateNote: {
            text: values.text,
            media: values.media,
          },
        },
        sender: { name: "You" },
      };
      useMessagesStore.getState().addMessage(`${contactId}_${whatsappSettingsPhoneId}`, mockedMessage);
      useMessagesStore.getState().addMessage(`${contactId}_all`, mockedMessage);

      createPrivateMessage.mutate({ ...values, messageId: id, mentionedUserIds });
    } else {
      createPrivateMessage.mutate({ ...values, messageId: id, mentionedUserIds });
    }

    reset(initialMessgabody);
    resetMedia();
    setAudioUrl(null);
    mention.reset();
  });

  const handleSend = handleSubmit((values) => {
    if (!values.text.body && !values.media.length) return;

    // Optimistic UI update
    if (selectedContactId) {
      const contactId = selectedContactId as string;
      const id = Date.now().toString();
      const mockedMessage = {
        id,
        messageId: id,
        createdAt: new Date().toISOString(),
        waCreatedAt: new Date().toISOString(),
        messageBody: {
          exchangeProcess: "send",
          send: {
            type: values.media?.length ? "image" : "text",
            text: values.text,
            image: values.media?.length ? { link: values.media[0].uri, caption: values.text?.body } : undefined,
          },
        },
        sender: { name: "You" },
      };
      useMessagesStore.getState().addMessage(`${contactId}_${whatsappSettingsPhoneId}`, mockedMessage);
      useMessagesStore.getState().addMessage(`${contactId}_all`, mockedMessage);

      useContactsStore.getState().updateContactById(contactId, (c) => {
        if (!c) return c;
        return {
          ...c,
          lastMessage: mockedMessage,
          lastReceivedMessageTimeStamp: new Date().toISOString(),
        };
      }, false);

      sendnewWaMessage.mutate(values);
    } else {
      sendnewWaMessage.mutate(values);
    }

    reset(initialMessgabody);
    resetMedia();
    setAudioUrl(null);
  });

  const animatedPlusStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotateValue.value, [0, 1], [0, 45]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <View
      style={{
        backgroundColor: isDark ? Colors.dark.surface : Colors.light.card,
        borderTopWidth: 1,
        borderTopColor: isDark ? Colors.dark.borderLight : Colors.light.border,
      }}
    >
      {isSessionActive ? (
        <View className="opacity-100" pointerEvents="auto">
          {media.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3 px-4 pt-3">
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
                        onError={(e) => { }}
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
            <View className="px-3.5 pt-3 pb-1">

              {/* File chips */}
              {media.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-3"
                  contentContainerStyle={{ gap: 8, flexDirection: "row" }}
                >
                  {media.map((item) => (
                    <View
                      key={item.key}
                      className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border-[0.5px]"
                      style={{
                        backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
                        borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
                      }}
                    >
                      {item.type === "image" && <ImageIcon size={13} color={iconColor} />}
                      {item.type === "video" && <VideoIcon size={13} color={iconColor} />}
                      {item.type === "audio" && <MusicIcon size={13} color={iconColor} />}
                      {item.type === "document" && <File size={13} color={iconColor} />}
                      <Text
                        numberOfLines={1}
                        className="text-xs max-w-[100px]"
                        style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
                      >
                        {item.name}
                      </Text>
                      {!item.uploading ? (
                        <TouchableOpacity onPress={() => removeMedia(item.key)}>
                          <Text
                            className="text-sm leading-4"
                            style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
                          >
                            ×
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <ActivityIndicator size={10} color={isDark ? "#aaa" : "#888"} />
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Divider */}
              <View
                className="h-[0.5px] mb-3"
                style={{ backgroundColor: isDark ? Colors.dark.borderLight : Colors.light.border }}
              />

              {/* Icon grid */}
              <View className="flex-row justify-between">
                {[
                  {
                    type: "image" as const,
                    label: "Image",
                    Icon: ImageIcon,
                    bg: isDark ? "#1a2a3a" : "#EBF3FB",
                    color: isDark ? "#60aee8" : "#185FA5",
                  },
                  {
                    type: "video" as const,
                    label: "Video",
                    Icon: VideoIcon,
                    bg: isDark ? "#1e1a33" : "#EEEDFE",
                    color: isDark ? "#9f94e8" : "#534AB7",
                  },
                  {
                    type: "document" as const,
                    label: "Doc",
                    Icon: File,
                    bg: isDark ? "#2a2210" : "#FAEEDA",
                    color: isDark ? "#e8a030" : "#854F0B",
                  },
                  {
                    type: "audio" as const,
                    label: "Audio",
                    Icon: MusicIcon,
                    bg: isDark ? "#122210" : "#EAF3DE",
                    color: isDark ? "#7ac44d" : "#3B6D11",
                  },
                ].map(({ type, label, Icon, bg, color }) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => pickMedia(type)}
                    activeOpacity={0.75}
                    className="flex-1 mx-1 items-center gap-1.5 py-2.5 rounded-xl border-[0.5px]"
                    style={{
                      backgroundColor: isDark ? Colors.dark.surface : Colors.light.card,
                      borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon size={20} color={color} strokeWidth={1.5} />
                    </View>
                    <Text
                      className="text-[11px]"
                      style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Voice cell */}
                <View
                  className="flex-1 mx-1 items-center gap-1.5 py-2.5 rounded-xl border-[0.5px]"
                  style={{
                    backgroundColor: isDark ? Colors.dark.surface : Colors.light.card,
                    borderColor: isDark ? Colors.dark.borderLight : Colors.light.border,
                  }}
                >
                  <VoiceRecorder
                    compact
                    isDark={isDark}
                    onRecordingUpload={({ key, url, name }) =>
                      addMedia({ key, url, name, type: "audio", uploading: false } as any)
                    }
                  />
                  <Text
                    className="text-[11px]"
                    style={{ color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }}
                  >
                    Voice
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View>
            {/* Teammate picker for `@` — above the composer, so it never covers
                what is being typed. */}
            {mention.isOpen && (
              <MentionList
                users={mention.suggestions}
                onSelect={mention.pick}
                isDark={isDark}
              />
            )}

            {/* Segmented control for Message / Note toggle */}
            <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "rgba(255,255,255,0.07)" : Colors.light.surface,
                  borderRadius: 8,
                  padding: 3,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSelectedIndex(0);
                    setIsPrivate(false);
                  }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: selectedIndex === 0
                      ? (isDark ? Colors.accent.cyan : Colors.brand.blue)
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selectedIndex === 0
                        ? (isDark ? "#091522" : "#fff")
                        : (isDark ? Colors.dark.textMuted : Colors.light.textMuted),
                      fontSize: 13,
                      fontFamily: "Nunito_600SemiBold",
                    }}
                  >
                    Message
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSelectedIndex(1);
                    setIsPrivate(true);
                  }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: selectedIndex === 1
                      ? Colors.accent.orange
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selectedIndex === 1
                        ? "#fff"
                        : (isDark ? Colors.dark.textMuted : Colors.light.textMuted),
                      fontSize: 13,
                      fontFamily: "Nunito_600SemiBold",
                    }}
                  >
                    Note
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                paddingHorizontal: 14,
                paddingTop: 6,
                paddingBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Pressable onPress={togglePanel}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: Colors.brand.blue,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Animated.View style={animatedPlusStyle}>
                    <Plus size={18} color="#fff" />
                  </Animated.View>
                </View>
              </Pressable>

              {templateOptionsVisible && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 50,
                    left: 0,
                    borderRadius: 12,
                    padding: 8,
                    zIndex: 50,
                    backgroundColor: Colors.brand.blue,
                  }}
                >
                  <Pressable
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.6 : 1,
                      paddingVertical: 4,
                      paddingHorizontal: 12,
                    })}
                    onPress={() => {
                      setTemplateModalVisible(true);
                      setTemplateOptionsVisible(false);
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Nunito_600SemiBold" }}>
                      Send Template
                    </Text>
                  </Pressable>
                </View>
              )}

              <Modal
                visible={templateModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTemplateModalVisible(false)}
              >
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}>
                  <View style={{ backgroundColor: isDark ? Colors.dark.surface : "#fff", width: "100%", borderRadius: 16, overflow: "hidden", maxHeight: "80%", minHeight: "50%" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? Colors.dark.border : "#e5e7eb", backgroundColor: Colors.brand.blue }}>
                      <Text style={{ color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold", flex: 1 }}>
                        Send Template
                      </Text>
                      <TouchableOpacity
                        onPress={() => setTemplateModalVisible(false)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>×</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      contentContainerStyle={{
                        padding: 16,
                        paddingBottom: 32,
                      }}
                      style={{ backgroundColor: isDark ? Colors.dark.surface : "#fff" }}
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
                style={{
                  flex: 1,
                  backgroundColor: isDark
                    ? Colors.dark.inputBg
                    : Colors.light.inputBg,
                  borderRadius: 24,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderWidth: 1,
                  borderColor: isDark
                    ? Colors.dark.inputBorder
                    : Colors.light.border,
                }}
              >
                <TextInput
                  ref={mention.inputRef}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontFamily: "Nunito_400Regular",
                    color: isDark ? "#fff" : Colors.light.textPrimary,
                    padding: 0,
                    maxHeight: 120,
                  }}
                  placeholder={
                    selectedIndex === 0 ? "Type a message…" : "Add a note…"
                  }
                  placeholderTextColor={
                    isDark
                      ? Colors.dark.textPlaceholder
                      : Colors.light.textPlaceholder
                  }
                  multiline
                  value={textBody}
                  onChangeText={mention.handleChangeText}
                  onSelectionChange={mention.handleSelectionChange}
                />
                {!isPrivate && (
                  <Pressable
                    onPress={() => setMediaPanelVisible((prev) => !prev)}
                  >
                    <Paperclip
                      size={17}
                      color={
                        isDark ? Colors.dark.inactive : Colors.light.textPlaceholder
                      }
                    />
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={isPrivate ? handleSendPrivateMessage : handleSend}
                disabled={isUploading}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: isPrivate
                      ? Colors.accent.orange
                      : Colors.brand.blue,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={18} color="#fff" />
                  )}
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View
          style={{
            paddingHorizontal: 14,
            paddingTop: 6,
            paddingBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Pressable onPress={togglePanel}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: Colors.brand.blue,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Animated.View style={animatedPlusStyle}>
                <Plus size={18} color="#fff" />
              </Animated.View>
            </View>
          </Pressable>

          {templateOptionsVisible && (
            <View
              style={{
                position: "absolute",
                bottom: 50,
                left: 0,
                borderRadius: 12,
                padding: 8,
                zIndex: 50,
                backgroundColor: Colors.brand.blue,
              }}
            >
              <Pressable
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                })}
                onPress={() => {
                  setTemplateModalVisible(true);
                  setTemplateOptionsVisible(false);
                }}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Nunito_600SemiBold" }}>
                  Send Template
                </Text>
              </Pressable>
            </View>
          )}

          <Modal
            visible={templateModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setTemplateModalVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}>
              <View style={{ backgroundColor: isDark ? Colors.dark.surface : "#fff", width: "100%", borderRadius: 16, overflow: "hidden", maxHeight: "80%", minHeight: "50%" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? Colors.dark.border : "#e5e7eb", backgroundColor: Colors.brand.blue }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold", flex: 1 }}>
                    Send Template
                  </Text>
                  <TouchableOpacity
                    onPress={() => setTemplateModalVisible(false)}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={{
                    padding: 16,
                    paddingBottom: 32,
                  }}
                  style={{ backgroundColor: isDark ? Colors.dark.surface : "#fff" }}
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
            style={{
              flex: 1,
              backgroundColor: isDark
                ? Colors.dark.inputBg
                : Colors.light.inputBg,
              borderRadius: 24,
              paddingVertical: 10,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: isDark
                ? Colors.dark.inputBorder
                : Colors.light.border,
              opacity: 0.6,
            }}
          >
            <TextInput
              editable={false}
              placeholder="Session expired"
              placeholderTextColor="#ef4444"
              style={{
                flex: 1,
                fontSize: 14,
                fontFamily: "Nunito_600SemiBold",
                color: "#ef4444",
                padding: 0,
                textAlign: "center",
              }}
            />
          </View>

          <Pressable
            disabled
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={18} color={isDark ? Colors.dark.inactive : Colors.light.inactive} style={{ marginLeft: 2 }} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default MessageSendPanel;

const initialMessgabody: {
  type: "text" | "media" | "contact" | "location";
  media: any[];
  text: { body: string };
  contacts: {
    contactIds: string[];
    groupIds: string[];
  };
  location: any | null;
} = {
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
    location?: any | null;
  };
  setBody: (value: any) => void;
  resetBody: () => void;
}>((set) => ({
  body: initialMessgabody,
  setBody: (value) => set({ body: value }),
  resetBody: () => set({ body: initialMessgabody }),
}));
