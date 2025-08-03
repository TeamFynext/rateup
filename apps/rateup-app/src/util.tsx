import React from "react";
import { Text, View } from "react-native";
import { StarIcon } from "lucide-react-native";
import { QuestionType2, WaQuestions } from "./components/flow/enum";

interface StarRowProps {
  count: number;
  color?: string;
  size?: number;
}

const Rating: React.FC<StarRowProps> = ({
  count,
  color = "blue",
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
  const choiceLower = item.choice.toLowerCase();
  const isMostVoted = item.choice === mostVotedChoice;

  const getVoteText = (count: number) => (count > 1 ? "votes" : "vote");
  const valueText = `${item.count} ${getVoteText(item.count)} ${
    item.percentage
  }`;

  const renderStatRow = (
    label: React.ReactNode,
    badge: React.ReactNode = null
  ) => (
    <View
      key={index}
      className="flex-row justify-between items-center rounded-md px-3 py-2 bg-white"
    >
      <View className="flex-row items-center gap-3">
        {badge ? (
          <View
            className={`min-w-[36px] h-[28px] px-2 border border-blue-900 text-blue-900 rounded-sm text-sm font-semibold flex justify-center items-center
              ${isMostVoted ? "bg-blue-100" : ""}`}
          >
            {badge}
          </View>
        ) : (
          <View className="flex-row items-center gap-2">{label}</View>
        )}
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-900">
          {valueText}
        </Text>
        {isMostVoted && (
          <Text className="text-blue-900 bg-blue-100 text-[10px] px-2 py-0.5 rounded-full font-semibold">
            Most Voted
          </Text>
        )}
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
      return renderStatRow(<Text>{item.choice}</Text>);

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
