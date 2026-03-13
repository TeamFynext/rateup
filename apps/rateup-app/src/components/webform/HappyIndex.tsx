import { View, Text } from "react-native";
import React from "react";
import {
  FrownIcon,
  SmileIcon,
  LaughIcon,
  MehIcon,
  AngryIcon,
} from "lucide-react-native";
import { useHappyIndex } from "@/api/response/response.query";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { ProgressBar } from "react-native-paper";

const HappyIndex = ({ surveyId }: { surveyId: string }) => {
  const { data, isLoading } = useHappyIndex(surveyId);
  const h_index = Number(((data?.happinessIndex ?? 0) / 10).toFixed(1));
  const happinessValue = Number(data?.happinessIndex ?? 0);
  const moodList = [
    {
      label: "Very Happy",
      value: data?.veryHappy ?? 0,
      percentage: data?.veryHappyPercentage ?? 0,
      icon: LaughIcon,
      color: "#00BF83",
    },
    {
      label: "Happy",
      value: data?.happy ?? 0,
      percentage: data?.happyPercentage ?? 0,
      icon: SmileIcon,
      color: "#66BF00",
    },
    {
      label: "Neutral",
      value: data?.neutral ?? 0,
      percentage: data?.neutralPercentage ?? 0,
      icon: MehIcon,
      color: "#FFC107",
    },
    {
      label: "Unhappy",
      value: data?.sad ?? 0,
      percentage: data?.sadPercentage ?? 0,
      icon: FrownIcon,
      color: "#FF8B07",
    },
    {
      label: "Very Unhappy",
      value: data?.verySad ?? 0,
      percentage: data?.verySadPercentage ?? 0,
      icon: AngryIcon,
      color: "#FF6161",
    },
  ];
  let happinessIndexStatus, happyIndexStatusBg;
  if (h_index >= 9) {
    happinessIndexStatus = "Very Happy";
    happyIndexStatusBg = "#00BF83";
  } else if (h_index >= 7) {
    happinessIndexStatus = "Happy";
    happyIndexStatusBg = "#66BF00";
  } else if (h_index >= 5) {
    happinessIndexStatus = "Neutral";
    happyIndexStatusBg = "#FFC107";
  } else if (h_index >= 3) {
    happinessIndexStatus = "Unhappy";
    happyIndexStatusBg = "#FF8B07";
  } else {
    happinessIndexStatus = "Very Unhappy";
    happyIndexStatusBg = "#FF6161";
  }
  if (isLoading) {
    return (
      <View className="bg-white p-4 flex-1 space-y-6">
        {/* Heading */}

        {/* Circle Chart Placeholder */}
        <View className="flex items-center gap-6">
          <View className="w-[170px] h-[170px] rounded-full bg-gray-200" />

          {/* Mood list placeholders */}
          <View className="flex space-y-4">
            {[...Array(5)].map((_, index) => (
              <View key={index} className="flex-row items-center gap-2 w-full">
                <View className="w-10 h-10 rounded-full bg-gray-200" />
                <View className="flex-1 space-y-2">
                  <View className="flex-row justify-between">
                    <View className="h-3 w-20 bg-gray-200 rounded" />
                    <View className="h-4 w-12 bg-gray-300 rounded-full" />
                  </View>
                  <View className="h-2 bg-gray-200 rounded-full w-full" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white p-4 lg:col-span-3 w-full flex-1 h-full">
      <Text className="text-lg font-semibold mb-4">Happiness Index</Text>

      <View className="flex flex-col md:flex-row items-center gap-6 px-4">
        <AnimatedCircularProgress
          size={170}
          width={15}
          fill={happinessValue}
          tintColor={happyIndexStatusBg}
          backgroundColor="#E6ECF2"
          rotation={0}
          lineCap="round"
        >
          {() => (
            <View className="items-center">
              <Text className="text-4xl font-bold">
                {(happinessValue / 10).toFixed(1)}
              </Text>
              <Text className="text-xs text-[#7A8289]">Out of 10</Text>
              <View
                style={{ backgroundColor: happyIndexStatusBg }}
                className="rounded px-2 py-1 mt-2"
              >
                <Text className="text-white text-xs">
                  {happinessIndexStatus}
                </Text>
              </View>
            </View>
          )}
        </AnimatedCircularProgress>

        <View className="flex flex-col gap-4 w-full">
          {moodList?.map(({ label, value, percentage, icon: Icon, color }) => (
            <View key={label} className="flex-row items-center gap-2 w-full">
              <View className="bg-[#004F981F] rounded-full p-1">
                <Icon color="#004F98" size={30} />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-xs text-[#343A40]">
                    {label}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[#7A8289] text-xs">
                      ({value ?? 0})
                    </Text>
                    <View className="bg-[#004F98] rounded-full px-2 py-0.5">
                      <Text className="text-white text-xs">
                        {Math.round(percentage)}%
                      </Text>
                    </View>
                  </View>
                </View>
                <ProgressBar
                  progress={percentage / 100}
                  color={color}
                  style={{ height: 6, borderRadius: 10, marginTop: 6 }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default HappyIndex;
