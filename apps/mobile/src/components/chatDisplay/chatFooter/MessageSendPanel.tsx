import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Text,
  ScrollView,
  useColorScheme,
} from "react-native";
import Image from "@/components/common/Image";

import { Colors } from "@/constants/colors";
import { useForm } from "react-hook-form";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useMediaStore, useSessionActiveStore, useVoiceRecordStore } from "@/utils/store";
import { useCreatePrivateMessage, useSendNewWaMessage } from "@/api/inbox/messages/message.query";
import { deleteUploadedFiles, uploadFile } from "@/utils/fileUpload";
import {
  attachmentSizeError,
  attachmentTypeError,
  galleryAssetKind,
  galleryAssetName,
  resolveMimeType,
  type PickedFile,
} from "@/utils/attachments";
import { selectRowForContact, useMessagesStore, useContactsStore } from "@/store/inboxStore";
import { VoiceNoteBar, VoiceNoteMic, useVoiceNote, type VoiceNoteFile } from "./VoiceNote";
import LocationSheet, { type SharedLocation } from "./LocationSheet";
import ComposerActionMenu from "./ComposerActionMenu";
import { mediaPreviewActions, useMediaPreviewStore } from "@/utils/mediaPreview";
import { router } from "expo-router";
import { prepareSharedFile, useSharedFilesStore } from "@/utils/sharedFiles";
import {
  Camera,
  ImageIcon,
  Images,
  VideoIcon,
  MusicIcon,
  File,
  MapPin,
  Paperclip,
  Plus,
  Send,
  Square,
  StickyNote,
  X,
  Zap,
} from "lucide-react-native";
import TemplateSending from "./TemplateSending";
import ChatSellSheets, { type ChatSellSheet } from "@/components/shop/ChatSellSheets";
import { chatChannelFor, useCommerceAccess } from "@/components/shop/chatSell";
import MentionList from "./mention/MentionList";
import QuickReplyList from "./quickReply/QuickReplyList";
import { useQuickReplies } from "@/api/inbox/quickReplies/quickReplies.query";
import type { QuickReply } from "@/api/inbox/quickReplies/quickReplies.api";
import { quickReplyToWhatsAppText } from "@/utils/quickReplyText";
import { useMention } from "./mention/useMention";
import { generateInternalMessageId } from "@/utils/chatbox_utils";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { Toast } from "@/components/common/Notice";
import { useAuth } from "@/context/AuthContext";
import { useLoggedInUser } from "@/api/api";
import { create } from "zustand";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MessagePlatform } from "@/constants/enums";
import { logger } from "@/utils/logger";
import { useReplyTargetStore } from "@/store/replyTargetStore";

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
  /** Instagram only: quote this message (Meta's id). */
  replyToMid?: string;
};

const UPLOAD_CONCURRENCY = 3;

const GALLERY_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images", "videos"],
  allowsMultipleSelection: true,
  selectionLimit: 10,
  orderedSelection: true,
  // Below 1, photos are re-encoded to JPEG: iOS HEIC photos become sendable and most
  // fit WhatsApp's 5 MB image limit.
  quality: 0.8,
  // iOS hands over the most compatible form of each asset: JPEG for HEIC, H.264 for HEVC video.
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  // iOS: photos kept only in iCloud are downloaded instead of failing to load.
  shouldDownloadFromNetwork: true,
  // iOS: videos are re-encoded on the phone to 720p H.264 MP4, the format WhatsApp takes,
  // and small enough to upload. Passthrough would hand over the original 4K/HEVC `.mov`.
  // Android has no such option; the API converts whatever video it is sent.
  videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
};

const CAMERA_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images", "videos"],
  quality: 0.8,
};

function galleryAssetToFile(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const kind = galleryAssetKind(asset);
  const name = galleryAssetName(asset, kind);
  return {
    uri: asset.uri,
    name,
    mimeType: resolveMimeType(name, asset.mimeType),
    size: asset.fileSize,
    kind,
  };
}

/** Runs `task` over `items`, at most `limit` at a time. */
async function forEachLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** A `/` at the start of a word, and what has been typed after it. */
const QUICK_REPLY_TRIGGER = /(?:^|\s)\/([^\s/]*)$/;

const MessageSendPanel = ({
  contactId,
  platform,
  whatsappSettingsPhoneId,
  teamId,
}: {
  contactId: string;
  platform: string;
  whatsappSettingsPhoneId: string;
  teamId: string | null;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "white" : "black";
  // The recipient comes from the route, never from the selected-contact store.
  // The store is global and is only written when an inbox row is tapped, so any
  // other route onto this screen (a notification deep link, a cold start) leaves
  // it holding a *different* contact — and this id is what `sendNewWaMessage` is
  // addressed to. Reading it from the store meant a reply typed in one chat
  // could be delivered to whoever the store still pointed at.
  const selectedContactId = contactId;
  const { media, resetMedia, addMedia, replaceMedia, removeMedia, discardMedia } = useMediaStore();
  const { audioUrl, setAudioUrl } = useVoiceRecordStore();
  const { body, setBody } = useMessageBodyStore();
  const sendnewWaMessage = useSendNewWaMessage(
    selectedContactId as string,
    teamId,
    whatsappSettingsPhoneId,
    platform as MessagePlatform,
  );
  const createPrivateMessage = useCreatePrivateMessage(selectedContactId);
  const { userId } = useAuth();
  const { data: me } = useLoggedInUser();
  // The ticket this chat was opened on; without one the API files the note on the newest.
  const conversationId = useContactsStore((state) =>
    selectRowForContact(state, contactId),
  )?.conversationId;
  let { isSessionActive } = useSessionActiveStore();
  // Instagram's inline reply, picked with a long press on a bubble in this chat.
  const replyTarget = useReplyTargetStore((s) =>
    s.target?.contactId === contactId && platform === MessagePlatform.INSTAGRAM ? s.target : null,
  );
  // A quote belongs to the chat it was picked in.
  useEffect(() => () => useReplyTargetStore.getState().clear(), [contactId]);
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
  }, [media, setValue, watch]);

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
    // Keyed on a finished recording only. `body` is spread into the update, so
    // depending on it would loop this effect against its own write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const rotateValue = useSharedValue(0);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [templateOptionsVisible, setTemplateOptionsVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [mediaPanelVisible, setMediaPanelVisible] = useState(false);
  const addLocalUris = useMediaPreviewStore((s) => s.addLocalUris);
  // Opens the attachment preview on `index`, or just moves to it when already open
  // (e.g. "+" in the preview added more).
  const openPreview = (index: number) => {
    const store = useMediaPreviewStore.getState();
    store.setIndex(index);
    if (!store.isOpen) router.push("/protected/chat/MediaPreview" as never);
  };
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const noteTheme = getInboxRowTheme(isDark).note;

  // Mentioning a teammate means the words are for the team, so a reply being written
  // becomes a note, text and all.
  const mention = useMention({
    enabled: true,
    text: textBody ?? "",
    setText: (value) => setValue("text.body", value, { shouldDirty: true }),
    onPick: () => {
      if (isPrivate) return;
      switchMode(true, { carryText: true });
      Toast.info("Mentioning a teammate turns this into an internal note.");
    },
  });

  // `/` at the start of a word opens the quick replies, as on the web.
  const { data: quickReplies = [], isLoading: quickRepliesLoading } = useQuickReplies();
  const quickReplyQuery = useMemo(() => {
    if (mention.isOpen || isPrivate) return null;
    const match = QUICK_REPLY_TRIGGER.exec((textBody ?? "").slice(0, mention.caret));
    return match ? match[1].toLowerCase() : null;
  }, [textBody, mention.caret, mention.isOpen, isPrivate]);
  const matchingQuickReplies = useMemo(
    () =>
      quickReplyQuery === null
        ? []
        : quickReplies.filter(
            (r) =>
              !quickReplyQuery ||
              (r.key ?? "").toLowerCase().includes(quickReplyQuery) ||
              r.topic.toLowerCase().includes(quickReplyQuery),
          ),
    [quickReplies, quickReplyQuery],
  );

  function pickQuickReply(reply: QuickReply) {
    const text = textBody ?? "";
    const match = QUICK_REPLY_TRIGGER.exec(text.slice(0, mention.caret));
    if (match) {
      const start = mention.caret - match[1].length - 1;
      mention.replaceRange(start, mention.caret, quickReplyToWhatsAppText(reply.text));
    }
    // `shared`: the files are the quick reply's, so dropping one from this draft keeps it.
    const inDraft = new Set(media.map((m) => m.key));
    for (const item of reply.media ?? []) {
      if (!inDraft.has(item.key)) addMedia({ ...item, uploading: false, shared: true });
    }
  }

  function openQuickReplies() {
    const text = textBody ?? "";
    const caret = Math.min(mention.caret, text.length);
    const needsSpace = caret > 0 && !/\s/.test(text[caret - 1]);
    mention.replaceRange(caret, caret, needsSpace ? " /" : "/");
    mention.inputRef.current?.focus();
  }

  //@ts-ignore
  const isUploading = media.some((m) => m.uploading);

  const togglePanel = () => {
    const next = !templateOptionsVisible;

    rotateValue.value = withTiming(next ? 1 : 0, {
      duration: 200,
    });

    setTemplateOptionsVisible(next);
  };

  const { canSell } = useCommerceAccess();
  const sellChannel = canSell ? chatChannelFor(platform) : null;
  const [sellSheet, setSellSheet] = useState<ChatSellSheet>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const openLocationSheet = () => {
    rotateValue.value = withTiming(0, { duration: 200 });
    setTemplateOptionsVisible(false);
    setLocationSheetOpen(true);
  };
  // Templates are WhatsApp only: they go to the contact's phone through a WhatsApp number,
  // so on Instagram or Messenger they would fail, or reach the customer on the wrong app.
  const canSendTemplate = platform === MessagePlatform.WHATSAPP;
  // The plus button opens a menu of these; with none, the button is hidden.
  const hasComposerActions = canSendTemplate || Boolean(sellChannel);
  const openTemplates = () => {
    setTemplateModalVisible(true);
    setTemplateOptionsVisible(false);
  };
  const openSellSheet = (sheet: Exclude<ChatSellSheet, null>) => {
    rotateValue.value = withTiming(0, { duration: 200 });
    setTemplateOptionsVisible(false);
    setSellSheet(sheet);
  };

  // Everything that reaches the customer — templates, attachments, quick replies — is
  // closed in Note mode, so nothing opened for a reply can be sent from a note.
  // One input serves both modes, so each keeps its own text and nothing typed as a
  // note is left in the box when switching back to a reply.
  const drafts = useRef({ message: "", note: "" });
  const switchMode = (note: boolean, { carryText = false } = {}) => {
    if (note === isPrivate) return;
    if (carryText) {
      // The text in the box, and the mentions picked in it, move over with the mode.
      drafts.current[isPrivate ? "note" : "message"] = "";
    } else {
      drafts.current[isPrivate ? "note" : "message"] = textBody ?? "";
      setValue("text.body", drafts.current[note ? "note" : "message"]);
      mention.reset();
    }
    setSelectedIndex(note ? 1 : 0);
    setIsPrivate(note);
    if (note) {
      setMediaPanelVisible(false);
      if (templateOptionsVisible) togglePanel();
    }
  };

  // Picked files are checked against the platform's size limits, then uploaded a few at a
  // time. Each shows as a placeholder in the order picked until its upload finishes.
  // Photos and videos open the preview, as in WhatsApp, on the first of the new files.
  const attachFiles = async (files: PickedFile[], { showPreview = false } = {}) => {
    setMediaPanelVisible(false);
    const accepted = files.filter((file) => {
      const error =
        attachmentTypeError(file, platform) ?? attachmentSizeError(file, file.kind, platform);
      if (error) Toast.error(error);
      return !error;
    });
    if (!accepted.length) return;

    const firstNewIndex = useMediaStore.getState().media.length;
    const pending = accepted.map((file, i) => {
      const tempKey = `${file.name}-${Date.now()}-${i}`;
      addMedia({ key: tempKey, type: file.kind, name: file.name, url: "", uploading: true });
      return { file, tempKey };
    });
    addLocalUris(Object.fromEntries(pending.map(({ file, tempKey }) => [tempKey, file.uri])));
    if (showPreview) openPreview(firstNewIndex);

    await forEachLimited(pending, UPLOAD_CONCURRENCY, async ({ file, tempKey }) => {
      try {
        const key = await uploadFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        } as unknown as globalThis.File);
        // Removed while it uploaded (🗑, ✕, back, or the chat was left): nothing will
        // ever send it, so it comes straight back out of storage.
        if (!useMediaStore.getState().media.some((m) => m.key === tempKey)) {
          void deleteUploadedFiles({ fileKeyArray: [{ Key: key }] });
          return;
        }
        addLocalUris({ [key]: file.uri });
        replaceMedia(tempKey, {
          key,
          type: file.kind,
          name: file.name,
          url: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${key}`,
          uploading: false,
        });
      } catch (err) {
        // Nothing was stored, so the placeholder is dropped without a delete request.
        useMediaStore.setState((s) => ({ media: s.media.filter((m) => m.key !== tempKey) }));
        // `uploadFile` rethrows the API's message, e.g. "Unsupported file type."
        const reason = typeof err === "string" && err ? ` ${err}` : " Try again.";
        Toast.error(`"${file.name}" could not be uploaded.${reason}`);
      }
    });
  };

  // Photos and videos come from the system photo picker, as in WhatsApp: the Photos
  // library on iOS, the Android Photo Picker on Android. Neither needs a permission.
  const pickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync(GALLERY_OPTIONS);
      if (res.canceled || !res.assets?.length) return;
      await attachFiles(res.assets.map(galleryAssetToFile), { showPreview: true });
    } catch (err) {
      logger.error("image picker error:", err);
      Toast.error("Could not open your photos.");
    }
  };

  const takeWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Toast.info("Allow camera access in Settings to take a photo or video.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync(CAMERA_OPTIONS);
      if (res.canceled || !res.assets?.length) return;
      await attachFiles(res.assets.map(galleryAssetToFile), { showPreview: true });
    } catch (err) {
      logger.error("camera error:", err);
      Toast.error("Could not open the camera.");
    }
  };

  const pickDocument = async (kind: "audio" | "document") => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: kind === "audio" ? "audio/*" : "*/*",
        multiple: true,
        // Android hands back `content://` uris, which can't be uploaded reliably; the
        // cached copy is a plain file on both platforms.
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      await attachFiles(
        res.assets.map((file) => ({
          uri: file.uri,
          name: file.name,
          mimeType: resolveMimeType(file.name, file.mimeType),
          size: file.size,
          kind,
        })),
      );
    } catch (err) {
      logger.error("expo-document-picker error:", err);
      Toast.error("Could not open your files.");
    }
  };

  // Photos and videos shared in from another app, through "Send to", attach once the
  // composer for their chat is on screen, and open the preview for a caption. Keyed on
  // the share too, so sharing into the chat already open still attaches.
  const sharedAt = useSharedFilesStore((s) =>
    s.pending?.contactId === contactId ? s.pending.at : null,
  );
  useEffect(() => {
    const shared = useSharedFilesStore.getState().take(contactId);
    if (!shared.length) return;
    (async () => {
      const prepared = await Promise.all(
        shared.map((file) =>
          prepareSharedFile(file).catch((err) => {
            logger.error("shared file error:", err);
            Toast.error(`"${file.fileName}" could not be attached.`);
            return null;
          }),
        ),
      );
      await attachFiles(
        prepared.filter((f): f is PickedFile => !!f),
        { showPreview: true },
      );
    })();
    // Once per share: `attachFiles` is redeclared every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, sharedAt]);

  // The preview's ✕ and the back button drop everything attached, as WhatsApp's do, and
  // delete the uploads from storage. Ones still uploading are deleted as they finish.
  const discardAttachments = () => discardMedia();

  // The draft store outlives this chat, so leaving it with files attached would carry
  // them into the next chat opened and leave them in storage. Leaving discards them.
  useEffect(() => () => useMediaStore.getState().discardMedia(), []);

  // What the preview screen calls back into. Refreshed every render, so it always
  // reaches the current form and draft.
  useLayoutEffect(() => {
    mediaPreviewActions.current = {
      send: () => handleSend(),
      discard: discardAttachments,
      addMore: pickFromGallery,
      remove: removeMedia,
      getCaption: () => form.getValues("text.body") ?? "",
      setCaption: (text) => setValue("text.body", text, { shouldDirty: true }),
    };
  });
  useEffect(
    () => () => {
      mediaPreviewActions.current = null;
    },
    [],
  );

  const attachmentActions = [
    {
      key: "gallery",
      label: "Gallery",
      Icon: Images,
      onPress: pickFromGallery,
      bg: isDark ? "#1a2a3a" : "#EBF3FB",
      color: isDark ? "#60aee8" : "#185FA5",
    },
    {
      key: "camera",
      label: "Camera",
      Icon: Camera,
      onPress: takeWithCamera,
      bg: isDark ? "#1e1a33" : "#EEEDFE",
      color: isDark ? "#9f94e8" : "#534AB7",
    },
    {
      key: "document",
      label: "Doc",
      Icon: File,
      onPress: () => pickDocument("document"),
      bg: isDark ? "#2a2210" : "#FAEEDA",
      color: isDark ? "#e8a030" : "#854F0B",
    },
    {
      key: "audio",
      label: "Audio",
      Icon: MusicIcon,
      onPress: () => pickDocument("audio"),
      bg: isDark ? "#122210" : "#EAF3DE",
      color: isDark ? "#7ac44d" : "#3B6D11",
    },
    ...(platform === MessagePlatform.WHATSAPP
      ? [
          {
            key: "location",
            label: "Location",
            Icon: MapPin,
            onPress: openLocationSheet,
            bg: isDark ? "#2a1418" : "#FDECEC",
            color: isDark ? "#f08078" : "#C4342C",
          },
        ]
      : []),
  ];

  const handleSendPrivateMessage = handleSubmit((values) => {
    const text = values.text.body ?? "";
    // The API stores a note's text only.
    if (!text.trim() || !selectedContactId) return;
    const contactId = selectedContactId as string;
    const id = generateInternalMessageId();
    // Mentions go up as ids: the server matches those first and only falls back
    // to scanning `@name` out of the text, which misses names with spaces.
    const mentionedUserIds = mention.getMentionedUserIds(text);

    const authorName: string = me?.userName ?? "You";
    const placeholder = {
      id,
      messageId: id,
      kind: "NOTE",
      createdAt: new Date().toISOString(),
      waCreatedAt: new Date().toISOString(),
      sourcePlatform: "INTERNAL",
      sourceIdentifier: "internal",
      sendBy: userId,
      messageBody: {
        exchangeProcess: "privateNote",
        privateNote: {
          text: { body: text },
          triggeredByUser: userId ? { id: userId, name: authorName } : null,
        },
      },
      sender: { name: authorName },
    };
    const threadKeys = [`${contactId}_${whatsappSettingsPhoneId}`, `${contactId}_all`];
    const messages = useMessagesStore.getState();
    for (const key of threadKeys) messages.addMessage(key, placeholder);

    createPrivateMessage.mutate(
      {
        type: "text",
        text: { body: text },
        messageId: id,
        mentionedUserIds,
        ...(conversationId && { conversationId }),
      },
      {
        onError: () => {
          const store = useMessagesStore.getState();
          for (const key of threadKeys) store.removeMessage(key, id);
          // Handed back only if nothing was typed since, so the text is never lost or clobbered.
          if (!form.getValues("text.body")) setValue("text.body", text);
          Toast.error("The note could not be saved. Try again.");
        },
      },
    );

    // Attachments and a voice note belong to the reply draft, so they stay.
    setValue("text.body", "");
    mention.reset();
  });

  // A voice note goes out on its own, as in WhatsApp, leaving the draft alone. It is
  // uploaded as soon as recording stops, so Send only has to deliver the key. On WhatsApp
  // it is converted to OGG/Opus and flagged, so the customer gets a voice message (mic,
  // profile photo, transcript) rather than an audio file; Instagram and Messenger take
  // the recording as it is.
  const asVoiceNote = platform === MessagePlatform.WHATSAPP;
  const uploadVoiceNote = async ({ uri }: VoiceNoteFile) => {
    try {
      return await uploadFile(
        { uri, name: `voice-${Date.now()}.m4a`, type: "audio/mp4" } as unknown as globalThis.File,
        false,
        undefined,
        { voiceNote: asVoiceNote },
      );
    } catch (err) {
      Toast.error(
        typeof err === "string" && err
          ? `Voice note not uploaded. ${err}`
          : "Voice note not uploaded. Check your connection, then tap send to retry.",
      );
      throw err;
    }
  };
  const deliverVoiceNote = (key: string) =>
    deliver({
      ...initialMessgabody,
      type: "media",
      media: [
        {
          key,
          type: "audio",
          name: "Voice message",
          url: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${key}`,
          ...(asVoiceNote && { voice: true }),
        },
      ],
    });
  const sendLocation = (location: SharedLocation) =>
    deliver({ ...initialMessgabody, type: "location", location });

  const voice = useVoiceNote({
    upload: uploadVoiceNote,
    deliver: deliverVoiceNote,
    removeUpload: (key) => void deleteUploadedFiles({ fileKeyArray: [{ Key: key }] }),
  });
  // WhatsApp's rule: the mic stands where Send is until there is something to send.
  const showMic =
    !isPrivate &&
    (voice.phase === "starting" ||
      voice.phase === "holding" ||
      (voice.phase === "idle" && !textBody?.trim() && media.length === 0));

  // Shows the message in the thread straight away, then sends it. Shared by the composer
  // and voice notes, which go out on their own without touching the draft.
  const deliver = (values: FormValues) => {
    if (selectedContactId) {
      const contactId = selectedContactId as string;
      const id = Date.now().toString();
      // The placeholder shows the first attachment, under its own kind, until the stored copy arrives.
      const first = values.media?.[0];
      const mockedMessage = {
        id,
        messageId: id,
        createdAt: new Date().toISOString(),
        waCreatedAt: new Date().toISOString(),
        messageBody: {
          exchangeProcess: "send",
          send: {
            type: values.type === "location" ? "location" : first ? first.type : "text",
            text: values.text,
            ...(values.type === "location" && { location: values.location }),
            ...(first && {
              [first.type]: {
                link: first.url,
                caption: values.text?.body,
                ...(first.type === "document" && { filename: first.name }),
              },
            }),
          },
        },
        sender: { name: "You" },
      };
      // The placeholder is cosmetic: if showing it fails, the message must still go out.
      try {
        useMessagesStore
          .getState()
          .addMessage(`${contactId}_${whatsappSettingsPhoneId}`, mockedMessage);
        useMessagesStore.getState().addMessage(`${contactId}_all`, mockedMessage);

        useContactsStore.getState().updateContactById(
          contactId,
          (c) => {
            if (!c) return c;
            return {
              ...c,
              lastMessage: mockedMessage,
              lastReceivedMessageTimeStamp: new Date().toISOString(),
            };
          },
          false,
        );
      } catch (err) {
        logger.error("Could not show the sending placeholder:", err);
      }

      sendnewWaMessage.mutate(values, {
        // Backstop for the placeholder. A text send is usually retired the
        // moment its stored copy arrives (`mergeMessages` matches the text);
        // media has no text to match, so it goes here, after the thread has
        // refetched and the real bubble is already in place. Left up on
        // failure: the server records a failed send, which replaces it, and a
        // request that never reached the server should not vanish silently.
        onSuccess: () => {
          const { removeMessage } = useMessagesStore.getState();
          removeMessage(`${contactId}_${whatsappSettingsPhoneId}`, id);
          removeMessage(`${contactId}_all`, id);
        },
      });
    } else {
      sendnewWaMessage.mutate(values);
    }
  };

  const handleSend = handleSubmit((formValues) => {
    // Settled here rather than by the media effect, which runs only when attachments
    // change: a caption typed after attaching went up as `media`, and the API sends a
    // `media` message without its text. `text` with attachments is a captioned send.
    const values: FormValues =
      formValues.type === "text" || formValues.type === "media"
        ? {
            ...formValues,
            type: formValues.media.length && !formValues.text.body?.trim() ? "media" : "text",
          }
        : formValues;
    if (!values.text.body && !values.media.length) return;

    deliver(replyTarget ? { ...values, replyToMid: replyTarget.mid } : values);
    useReplyTargetStore.getState().clear();
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
      {/* A note never reaches the customer, so an expired window doesn't close it. */}
      {isSessionActive || isPrivate ? (
        <View className="opacity-100" pointerEvents="auto">
          {replyTarget && !isPrivate && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginHorizontal: 12,
                marginTop: 10,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderLeftWidth: 3,
                borderLeftColor: Colors.brand.blue,
                borderRadius: 8,
                backgroundColor: isDark ? Colors.dark.inputBg : Colors.light.inputBg,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontFamily: "InstrumentSans_700Bold",
                    color: isDark ? Colors.brand.blueLight : Colors.brand.blue,
                  }}
                >
                  {replyTarget.author ? `Replying to ${replyTarget.author}` : "Replying"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    color: isDark ? Colors.dark.textSubtle : Colors.light.textSubtle,
                  }}
                >
                  {replyTarget.preview}
                </Text>
              </View>
              <Pressable
                onPress={() => useReplyTargetStore.getState().clear()}
                accessibilityRole="button"
                accessibilityLabel="Cancel reply"
                hitSlop={8}
              >
                <X size={16} color={iconColor} />
              </Pressable>
            </View>
          )}
          {media.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3 px-4 pt-3">
              {media.map((item) => {
                return (
                  <View key={item.key} className="relative w-[80px] h-[80px]">
                    {/* @ts-ignore */}
                    {!item.uploading && (
                      <Pressable
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
                      </Pressable>
                    )}
                    {/* @ts-ignore */}
                    {item.uploading ? (
                      <View className="w-full h-full bg-gray-100 rounded-xl items-center justify-center">
                        <ActivityIndicator size="small" color="#888" />
                        <Text className="text-[10px] text-gray-500 mt-1">Uploading...</Text>
                      </View>
                    ) : item.type === "image" ? (
                      <Pressable
                        className="w-full h-full"
                        onPress={() => openPreview(media.findIndex((m) => m.key === item.key))}
                        accessibilityRole="button"
                        accessibilityLabel={`Preview ${item.name}`}
                      >
                        <Image
                          source={{ uri: item.url }}
                          className="w-full h-full rounded-xl"
                          contentFit="cover"
                          recyclingKey={item.url}
                          onError={() => {}}
                        />
                      </Pressable>
                    ) : (
                      <View className="w-full h-full rounded-xl bg-gray-200 items-center justify-center">
                        {item.type !== "image" && (
                          <View className="w-full h-full items-center justify-center bg-gray-100 rounded">
                            {item.type === "video" && <VideoIcon size={20} color={"black"} />}
                            {item.type === "audio" && <MusicIcon size={20} color={"black"} />}
                            {item.type === "document" && <File size={20} color={"black"} />}
                            <Text className="text-xs text-center px-1 mt-1">{item.type}</Text>
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
                        <Pressable onPress={() => removeMedia(item.key)}>
                          <Text
                            className="text-sm leading-4"
                            style={{
                              color: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
                            }}
                          >
                            ×
                          </Text>
                        </Pressable>
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
                {attachmentActions.map(({ key, label, Icon, onPress, bg, color }) => (
                  <Pressable
                    key={key}
                    onPress={onPress}
                    accessibilityRole="button"
                    accessibilityLabel={label}
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
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View>
            {/* Teammate picker for `@` — above the composer, so it never covers
                what is being typed. */}
            {quickReplyQuery !== null && (
              <QuickReplyList
                replies={matchingQuickReplies}
                isLoading={quickRepliesLoading}
                onSelect={pickQuickReply}
                isDark={isDark}
              />
            )}
            {mention.isOpen && (
              <MentionList users={mention.suggestions} onSelect={mention.pick} isDark={isDark} />
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
                <Pressable
                  onPress={() => switchMode(false)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor:
                      selectedIndex === 0
                        ? isDark
                          ? Colors.accent.cyan
                          : Colors.brand.blue
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedIndex === 0
                          ? isDark
                            ? "#091522"
                            : "#fff"
                          : isDark
                            ? Colors.dark.textMuted
                            : Colors.light.textMuted,
                      fontSize: 13,
                      fontFamily: "InstrumentSans_600SemiBold",
                    }}
                  >
                    Message
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => switchMode(true)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 8,
                    borderRadius: 6,
                    backgroundColor: selectedIndex === 1 ? Colors.accent.orange : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedIndex === 1
                          ? "#fff"
                          : isDark
                            ? Colors.dark.textMuted
                            : Colors.light.textMuted,
                      fontSize: 13,
                      fontFamily: "InstrumentSans_600SemiBold",
                    }}
                  >
                    Note
                  </Text>
                </Pressable>
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
              {!isPrivate && voice.phase === "idle" && hasComposerActions && (
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
              )}

              {!isPrivate && templateOptionsVisible && (
                <ComposerActionMenu
                  isDark={isDark}
                  onTemplate={canSendTemplate ? openTemplates : undefined}
                  onProducts={sellChannel ? () => openSellSheet("products") : undefined}
                  onOrder={sellChannel ? () => openSellSheet("order") : undefined}
                />
              )}

              <LocationSheet
                visible={locationSheetOpen}
                onClose={() => setLocationSheetOpen(false)}
                onSend={sendLocation}
              />

              {sellChannel && (
                <ChatSellSheets
                  open={sellSheet}
                  onClose={() => setSellSheet(null)}
                  contactId={selectedContactId}
                  channel={sellChannel}
                  channelAccountId={whatsappSettingsPhoneId || null}
                />
              )}

              <TemplateSending
                visible={templateModalVisible}
                onClose={() => setTemplateModalVisible(false)}
                contactId={selectedContactId}
                defaultAccountId={whatsappSettingsPhoneId}
              />

              {voice.phase !== "idle" && voice.phase !== "starting" ? (
                <VoiceNoteBar voice={voice} isDark={isDark} />
              ) : (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: isPrivate
                      ? noteTheme.bg
                      : isDark
                        ? Colors.dark.inputBg
                        : Colors.light.inputBg,
                    borderRadius: 24,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    borderWidth: 1,
                    borderColor: isPrivate
                      ? noteTheme.border
                      : isDark
                        ? Colors.dark.inputBorder
                        : Colors.light.border,
                  }}
                >
                  <TextInput
                    ref={mention.inputRef}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontFamily: "InstrumentSans_400Regular",
                      color: isDark ? "#fff" : Colors.light.textPrimary,
                      padding: 0,
                      maxHeight: 120,
                    }}
                    placeholder={
                      selectedIndex === 0
                        ? "Type a message…"
                        : "Add a note — only your team sees it"
                    }
                    placeholderTextColor={
                      isDark ? Colors.dark.textPlaceholder : Colors.light.textPlaceholder
                    }
                    multiline
                    value={textBody}
                    onChangeText={mention.handleChangeText}
                    onSelectionChange={mention.handleSelectionChange}
                  />
                  {!isPrivate && (
                    <>
                      <Pressable
                        onPress={openQuickReplies}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel="Quick replies"
                      >
                        <Zap
                          size={17}
                          color={isDark ? Colors.dark.inactive : Colors.light.textPlaceholder}
                        />
                      </Pressable>
                      <Pressable onPress={() => setMediaPanelVisible((prev) => !prev)}>
                        <Paperclip
                          size={17}
                          color={isDark ? Colors.dark.inactive : Colors.light.textPlaceholder}
                        />
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {showMic ? (
                <VoiceNoteMic voice={voice} />
              ) : (
                <Pressable
                  onPress={() => {
                    if (voice.phase === "locked") void voice.stop();
                    else if (voice.phase === "review") void voice.send();
                    else if (isPrivate) void handleSendPrivateMessage();
                    else void handleSend();
                  }}
                  disabled={isUploading || voice.phase === "sending"}
                  accessibilityRole="button"
                  accessibilityLabel={voice.phase === "locked" ? "Stop recording" : "Send"}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor:
                        voice.phase === "locked"
                          ? "#E5484D"
                          : isPrivate
                            ? Colors.accent.orange
                            : Colors.brand.blue,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isUploading || voice.phase === "sending" ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : voice.phase === "locked" ? (
                      <Square size={16} color="#fff" fill="#fff" />
                    ) : (
                      <Send size={18} color="#fff" />
                    )}
                  </View>
                </Pressable>
              )}
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
          {canSendTemplate && (
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
          )}

          {canSendTemplate && templateOptionsVisible && (
            <ComposerActionMenu isDark={isDark} onTemplate={openTemplates} />
          )}

          <TemplateSending
            visible={templateModalVisible}
            onClose={() => setTemplateModalVisible(false)}
            contactId={selectedContactId}
            defaultAccountId={whatsappSettingsPhoneId}
          />

          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? Colors.dark.inputBg : Colors.light.inputBg,
              borderRadius: 24,
              paddingVertical: 10,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: isDark ? Colors.dark.inputBorder : Colors.light.border,
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
                fontFamily: "InstrumentSans_600SemiBold",
                color: "#ef4444",
                padding: 0,
                textAlign: "center",
              }}
            />
          </View>

          <Pressable
            onPress={() => switchMode(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a note"
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              backgroundColor: Colors.accent.orange,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StickyNote size={18} color="#fff" />
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
