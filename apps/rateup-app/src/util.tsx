import React from "react";
import { Text, View } from "react-native";
import { AlertCircle, Archive, CheckCircle2, MessageCircle, StarIcon, UserCog, Circle } from "lucide-react-native";
import { QuestionType2, WaQuestions } from "./components/flow/enum";
import { create } from "zustand";
import { FontAwesome } from "@expo/vector-icons";
import { MessagePlatform } from "./constants/enums";
import { WaMessageAssignStatus } from "./api/inbox/types";
import { colors } from "./constants/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";

interface StarRowProps {
  count: number;
  color?: string;
  size?: number;
}

const Rating: React.FC<StarRowProps> = ({
  count,
  color = "#004F98",
  size = 20,
}) => {
  const stars = Array.from({ length: count }, (_, index) => (
    <StarIcon key={index} color={color} size={size} fill={color} />
  ));
  return <View className="flex-row gap-1">{stars}</View>;
};

const getSmiley = (choice: string) => {
  switch (choice.toLowerCase()) {
    case "very happy":
      return "😁";
    case "happy":
      return "🙂";
    case "neutral":
      return "😐";
    case "sad":
      return "🙁";
    case "very sad":
      return "😠";
    default:
      return "❓";
  }
};

export const renderChoiceItem = (
  type: any,
  item: { choice: string; count: number; percentage?: number },
  index: number,
  mostVotedChoice: string,
  version: any
) => {
  const choiceLower = item?.choice.toLowerCase();
  const isMostVoted = item?.choice === mostVotedChoice;

  const getVoteText = (count: number) => (count > 1 ? "votes" : "vote");
  const valueText = `${item?.count} ${getVoteText(item.count)}`;
  const perc =
    typeof item?.percentage === "number" ? item.percentage.toFixed(1) : "0.0";
  const renderStatRow = (
    label: React.ReactNode,
    badge: React.ReactNode = null
  ) => (
    <View
      key={index}
      className="flex-row justify-between gap-10 items-center rounded-md px-6 py-2 bg-white dark:bg-slate-800"
    >
      <View className="flex-row items-center gap-3">
        {badge ? (
          <View
            className={`min-w-[36px] h-[28px] px-2 border border-rateUpBlue text-rateUpBlue rounded-sm text-sm font-bold flex justify-center items-center
              ${isMostVoted ? "bg-[#C4D7F5]" : ""}`}
          >
            {badge}
          </View>
        ) : (
          <View>{label}</View>
        )}
      </View>
      {isMostVoted && (
        <Text className="text-rateUpBlue bg-[#C4D7F5] text-sm px-3 py-1 rounded-full font-semibold">
          Most Voted
        </Text>
      )}
      <View className="flex-row items-center bg-[#F5F5F5] rounded-full justify-center gap-1 px-3 py-1">
        <Text className="text-sm font-semibold text-gray-900">{valueText}</Text>
        <Text className="text-sm font-semibold text-gray-900">({perc}%)</Text>
      </View>
    </View>
  );

  switch (type) {
    case QuestionType2.Rating:
    case WaQuestions.Rating:
      return renderStatRow(
        <>
          {version === 2 ? (
            <Text className="text-sm text-gray-900 dark:text-gray-200">{item.choice}</Text>
          ) : (
            <Rating count={parseInt(item.choice)} />
          )}
        </>
      );

    case QuestionType2.Opinion:
    case WaQuestions.Opinion:
      return renderStatRow(
        <View
          className={`border border-rateUpBlue px-2 py-2 w-10 h-10 flex items-center justify-center rounded-md  ${isMostVoted ? "bg-[#C4D7F5]" : ""
            }`}
        >
          <Text className="text-sm text-gray-900 dark:text-gray-200">{item.choice}</Text>
        </View>
      );

    case QuestionType2.Smiley:
    case WaQuestions.Smiley:
      return renderStatRow(
        <>
          {version === 2 ? (
            <Text className="text-sm text-gray-900 dark:text-gray-200">{item.choice}</Text>
          ) : (
            <View className="flex-row gap-1 items-center justify-center">
              <Text className="text-xl">{getSmiley(item.choice)}</Text>
              <Text className="text-sm text-gray-900 dark:text-gray-200">{item.choice}</Text>
            </View>
          )}
        </>
      );

    case QuestionType2.LD:
    case WaQuestions.LD:
      return renderStatRow(
        <>
          {version === 2 ? (
            <Text>{item.choice}</Text>
          ) : (
            <View>
              <Text className="text-sm text-gray-900 dark:text-gray-200">
                {choiceLower === "like" ? "👍 Like" : "👎 Dislike"}
              </Text>
            </View>
          )}
        </>
      );

    case QuestionType2.YN:
    case WaQuestions.YN:
      return renderStatRow(
        <Text className="text-sm text-gray-900 dark:text-gray-200">
          {choiceLower === "yes" ? "✅ Yes" : "❌ No"}
        </Text>
      );

    default:
      return renderStatRow(
        <>
          <Text className="text-sm text-gray-900 dark:text-gray-200">{item.choice}</Text>
        </>
      );
  }
};

export function getSoucePlatformIconAndColor(
  sourcePlatform: string | undefined
) {
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


export function parseToWhatsAppFormat(editorContent) {
  function formatText(text, type = "*") {
    let trimmedEnd = text.trimEnd();
    let trimmedStart = text.trimStart();
    let trimmed = text.trim();

    let leadingSpaces = " ".repeat(text.length - trimmedStart.length);
    let trailingSpaces = " ".repeat(text.length - trimmedEnd.length);
    let formattedText =
      trailingSpaces.length > 0 ? `${type}${trailingSpaces}${type}` : "";
    return `${leadingSpaces}${type}${trimmed}${type}${formattedText}`;
  }
  const parseNode = (node) => {
    if (!node) return "";
    switch (node.type) {
      case "paragraph":
        return node?.content?.map(parseNode).join("");
      case "text":
        let text = node.text;
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
        return node.content.map((item) => `* ${parseNode(item)}`).join("\n");
      case "orderedList":
        return node.content
          .map((item, index) => `${index + 1}. ${parseNode(item)}`)
          .join("\n");
      case "blockquote":
        return node.content.map((item) => `> ${parseNode(item)}`).join("\n");
      case "codeBlock":
        return `\`\`\`${node.content.map(parseNode).join("")}\`\`\``;
      case "listItem":
        return node.content.map(parseNode).join("");
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
  fileKey: string;
  setFileKey: (value) => void;
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

  setIsRecording: (value) =>
    set(() => ({ isRecording: value })),

  setAudioUrl: (value) =>
    set(() => ({ audioUrl: value })),

  setMediaRecorder: (recorder) =>
    set(() => ({ mediaRecorder: recorder })),

  setStream: (stream) =>
    set(() => ({ stream })),

  setAnalyser: (analyser) =>
    set(() => ({ analyser })),

  setAudioContext: (context) =>
    set(() => ({ audioContext: context })),

  setSource: (source) =>
    set(() => ({ source })),

  setChunks: (chunks) =>
    set(() => ({ chunks })),

  setFileKey: (value) =>
    set(() => ({ fileKey: value })),

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
