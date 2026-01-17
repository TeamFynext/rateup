import React from "react";
import { Text, View } from "react-native";
import { AlertCircle, Archive, CheckCircle2, MessageCircle, StarIcon, UserCog ,Circle} from "lucide-react-native";
import { QuestionType2, WaQuestions } from "./components/flow/enum";
import {
  IconBrandWhatsapp,
  IconBrandInstagram,
} from "@tabler/icons-react-native";
import { MessagePlatform } from "./constants/enums";
import { WaMessageAssignStatus } from "./api/inbox/types";
import { colors } from "./constants/constants";

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
      className="flex-row justify-between gap-10 items-center rounded-md px-6 py-2 bg-white"
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
            <Text>{item.choice}</Text>
          ) : (
            <Rating count={parseInt(item.choice)} />
          )}
        </>
      );

    case QuestionType2.Opinion:
    case WaQuestions.Opinion:
      return renderStatRow(
        <View
          className={`border border-rateUpBlue px-2 py-2 w-10 h-10 flex items-center justify-center rounded-md  ${
            isMostVoted ? "bg-[#C4D7F5]" : ""
          }`}
        >
          <Text className="text-sm">{item.choice}</Text>
        </View>
      );

    case QuestionType2.Smiley:
    case WaQuestions.Smiley:
      return renderStatRow(
        <>
          {version === 2 ? (
            <Text className="text-sm text-gray-900">{item.choice}</Text>
          ) : (
            <View className="flex-row gap-1 items-center justify-center">
              <Text className="text-xl">{getSmiley(item.choice)}</Text>
              <Text className="text-sm text-gray-900">{item.choice}</Text>
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
              <Text className="text-sm text-gray-900">
                {choiceLower === "like" ? "👍 Like" : "👎 Dislike"}
              </Text>
            </View>
          )}
        </>
      );

    case QuestionType2.YN:
    case WaQuestions.YN:
      return renderStatRow(
        <Text className="text-sm text-gray-900">
          {choiceLower === "yes" ? "✅ Yes" : "❌ No"}
        </Text>
      );

    default:
      return renderStatRow(
        <>
          <Text>{item.choice}</Text>
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
        icon: <IconBrandWhatsapp color={"white"} size={20}/>,
        bgColor: "bg-green-600",
      };
    case MessagePlatform.INSTAGRAM:
      return {
        icon: <IconBrandInstagram color={"white"} size={20}/>,
        bgColor: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500",
      };
    case MessagePlatform.WEBCHAT:
      return {
        icon: <MessageCircle color={"white"} size={20} />,
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

