import React from "react";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  MessageCircle,
  UserCog,
  Circle,
} from "lucide-react-native";
import { create } from "zustand";
import { FontAwesome } from "@expo/vector-icons";
import { MessagePlatform } from "./constants/enums";
import { WaMessageAssignStatus } from "./api/inbox/types";
import { colors } from "./constants/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";

export function getSoucePlatformIconAndColor(sourcePlatform: string | undefined) {
  switch (sourcePlatform) {
    case MessagePlatform.WHATSAPP:
      return {
        icon: <FontAwesome name="whatsapp" color={"white"} size={16} />,
        bgColor: "bg-green-600",
      };
    case MessagePlatform.INSTAGRAM:
      return {
        icon: <FontAwesome name="instagram" color={"white"} size={16} />,
        bgColor: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500",
      };
    case MessagePlatform.FACEBOOK:
      return {
        icon: <FontAwesome name="facebook" color={"white"} size={16} />,
        bgColor: "bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400",
      };
    case MessagePlatform.WEBCHAT:
      return {
        icon: <MessageCircle color={"white"} size={16} />,
        bgColor: "bg-blue-600",
      };
  }
}

export const getClosedIcon = (status: any) => {
  switch (status) {
    case WaMessageAssignStatus.RESOLVED:
      return <CheckCircle2 size={16} color={colors["status-resolved"]} />;
    case WaMessageAssignStatus.UNRESOLVED:
      return <Circle size={16} color={colors["status-unresolved"]} />;
    case WaMessageAssignStatus.CLOSED:
      return <Archive size={16} color={colors["status-closed"]} />;
    case WaMessageAssignStatus.SPAM:
      return <AlertCircle size={16} color={colors["status-spam"]} />;
    default:
      return <UserCog size={16} color={colors["status-default"]} />;
  }
};

interface EditorMark {
  type: string;
}

interface EditorNode {
  type: string;
  text?: string;
  marks?: EditorMark[];
  content?: EditorNode[];
}

interface EditorContent {
  content: EditorNode[];
}

export function parseToWhatsAppFormat(editorContent: EditorContent): string {
  function formatText(text: string, type: string = "*"): string {
    let trimmedEnd = text.trimEnd();
    let trimmedStart = text.trimStart();
    let trimmed = text.trim();

    let leadingSpaces = " ".repeat(text.length - trimmedStart.length);
    let trailingSpaces = " ".repeat(text.length - trimmedEnd.length);
    let formattedText = trailingSpaces.length > 0 ? `${type}${trailingSpaces}${type}` : "";
    return `${leadingSpaces}${type}${trimmed}${type}${formattedText}`;
  }
  const parseNode = (node: EditorNode | null | undefined): string => {
    if (!node) return "";
    switch (node.type) {
      case "paragraph":
        return node?.content?.map(parseNode).join("") ?? "";
      case "text":
        let text = node.text ?? "";
        if (node.marks) {
          node.marks.forEach((mark) => {
            switch (mark.type) {
              case "bold":
                text = formatText(text, "*");
                break;
              case "italic":
                text = formatText(text, "_");
                break;
              case "strike":
                text = formatText(text, "~");
                break;
              case "code":
                text = `\`${text}\``;
                break;
              default:
                break;
            }
          });
        }
        return text;
      case "bulletList":
        return node.content?.map((item) => `* ${parseNode(item)}`).join("\n") ?? "";
      case "orderedList":
        return (
          node.content?.map((item, index) => `${index + 1}. ${parseNode(item)}`).join("\n") ?? ""
        );
      case "blockquote":
        return node.content?.map((item) => `> ${parseNode(item)}`).join("\n") ?? "";
      case "codeBlock":
        return `\`\`\`${node.content?.map(parseNode).join("") ?? ""}\`\`\``;
      case "listItem":
        return node.content?.map(parseNode).join("") ?? "";
      default:
        return "";
    }
  };

  return editorContent.content.map(parseNode).join("\n");
}

interface VoiceRecordState {
  isRecording: boolean;
  audioUrl: string | null;
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
  source: MediaStreamAudioSourceNode | null;
  chunks: Blob[];
  fileKey: string | null;
  setFileKey: (value: string | null) => void;
  setIsRecording: (value: boolean) => void;
  setAudioUrl: (value: string | null) => void;
  setMediaRecorder: (recorder: MediaRecorder | null) => void;
  setStream: (stream: MediaStream | null) => void;
  setAnalyser: (analyser: AnalyserNode | null) => void;
  setAudioContext: (context: AudioContext | null) => void;
  setSource: (source: MediaStreamAudioSourceNode | null) => void;
  setChunks: (chunks: Blob[]) => void;
  resetRecordingState: () => void;
}

export const useVoiceRecordStore = create<VoiceRecordState>((set) => ({
  isRecording: false,
  audioUrl: null,
  mediaRecorder: null,
  stream: null,
  analyser: null,
  audioContext: null,
  source: null,
  chunks: [],
  fileKey: null,

  setIsRecording: (value) => set(() => ({ isRecording: value })),

  setAudioUrl: (value) => set(() => ({ audioUrl: value })),

  setMediaRecorder: (recorder) => set(() => ({ mediaRecorder: recorder })),

  setStream: (stream) => set(() => ({ stream })),

  setAnalyser: (analyser) => set(() => ({ analyser })),

  setAudioContext: (context) => set(() => ({ audioContext: context })),

  setSource: (source) => set(() => ({ source })),

  setChunks: (chunks) => set(() => ({ chunks })),

  setFileKey: (value) => set(() => ({ fileKey: value })),

  resetRecordingState: () =>
    set(() => ({
      isRecording: false,
      audioUrl: null,
      mediaRecorder: null,
      stream: null,
      analyser: null,
      audioContext: null,
      source: null,
      chunks: [],
      fileKey: null,
    })),
}));

const BROWSER_ID_KEY = "browserId";

export const getMobileId = async (): Promise<string> => {
  try {
    let id = await AsyncStorage.getItem(BROWSER_ID_KEY);

    if (!id) {
      id = randomUUID();
      await AsyncStorage.setItem(BROWSER_ID_KEY, id);
    }

    return id;
  } catch (error) {
    console.error("Failed to get or set mobile ID", error);
    return "";
  }
};
