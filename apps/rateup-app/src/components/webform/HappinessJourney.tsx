import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import { View, Text, Pressable, Dimensions, ScrollView } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useAllResponseNPSForGraph } from "@/api/response/response.query";
import { AngryIcon, LaughIcon, MehIcon, StarIcon, TargetIcon } from "lucide-react-native";

const HappinessJourney = ({ surveyId }: { surveyId: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [timePeriod, setTimePeriod] = useState<"hourly" | "daily" | "weekly">("daily");

  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const screenWidth = Dimensions.get("window").width;

  const { data: graphResponse = [], isLoading } = useAllResponseNPSForGraph(
    timePeriod,
    userTimeZone,
    surveyId,
  );

  const totalResponses = graphResponse
    .map((item: any, index: number) => ({
      value: Number(item.total) || 0,
      label: item.date,
      index,
    }))
    .filter((item: any) => !isNaN(item.value));

  const happinessIndex = graphResponse
    .map((item: any, index: number) => ({
      value: Number(item.happinessIndex) || 0,
      index,
    }))
    .filter((item: any) => !isNaN(item.value));

  const getCurrentMonth = (): string[] => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const now = new Date();

    return [monthNames[now.getMonth()]];
  };

  const firstNonZeroIndex = totalResponses.findIndex((item: any) => item.value > 0);

  const periods = ["hourly", "daily", "weekly"] as const;

  return (
    <ScrollView
      className="bg-white dark:bg-slate-950 p-4 rounded-2xl flex gap-8"
      contentContainerStyle={{ paddingBottom: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Filters */}
      <View className="flex-row items-center justify-between">
        {periods.map((period) => (
          <Pressable
            key={period}
            onPress={() => setTimePeriod(period)}
            className={`px-4 py-1.5 rounded-full ${
              timePeriod === period ? "bg-black dark:bg-white" : "bg-[#F5F5F5] dark:bg-slate-800"
            }`}
          >
            <Text
              className={`text-md px-2 py-1 font-semibold ${
                timePeriod === period ? "text-white dark:text-black" : "text-black dark:text-white"
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </Pressable>
        ))}

        <View className="px-5 py-1.5 rounded-full bg-[#F5F5F5] dark:bg-slate-800">
          <Text className="text-md font-semibold text-black dark:text-white py-1 px-2">
            {getCurrentMonth()}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View className="flex-row justify-between mt-4 px-1">
        <View className="flex-row items-center gap-1 justify-center">
          <View className="w-2.5 h-2.5 rounded-full bg-blue-700" />

          <Text className="text-md text-slate-500 dark:text-slate-400 font-semibold">
            Responses
          </Text>
        </View>

        <View className="flex-row items-center gap-1 justify-center">
          <View className="w-2.5 h-2.5 rounded-full bg-green-600" />

          <Text className="text-md text-slate-500 dark:text-slate-400 font-semibold">
            Happiness Index
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View>
        {isLoading ? (
          <View
            style={{
              backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
              borderRadius: 8,
              height: 240,
              width: screenWidth,
              padding: 3,
            }}
          />
        ) : (
          <LineChart
            data={totalResponses}
            secondaryData={happinessIndex}
            scrollToIndex={firstNonZeroIndex}
            scrollToEnd={false}
            showScrollIndicator={true}
            height={220}
            width={screenWidth - 110}
            spacing={30}
            curved
            initialSpacing={10}
            isAnimated
            yAxisTextStyle={{
              color: isDark ? "#93C5FD" : "#1e3a8a",
            }}
            yAxisColor={isDark ? "#334155" : "#cbd5e1"}
            yAxisThickness={1}
            color="#1D4ED8"
            thickness={2}
            dataPointsHeight={6}
            dataPointsWidth={6}
            xAxisLabelTextStyle={{
              color: isDark ? "#94A3B8" : "#94a3b8",
              fontSize: 10,
            }}
            xAxisThickness={1}
            rulesType="solid"
            rulesColor={isDark ? "#334155" : "#e2e8f0"}
            showVerticalLines={false}
            showXAxisIndices={false}
            secondaryYAxis={{
              maxValue: 10,
              yAxisColor: isDark ? "#334155" : "#cbd5e1",
              yAxisTextStyle: {
                color: "#16A34A",
              },
            }}
            secondaryLineConfig={{
              color: "#16A34A",
              thickness: 2,
            }}
            onFocus={(params: any) => {
              if (typeof params?.index === "number") {
                const completeDataPoint = graphResponse[params.index];

                setSelectedPoint(completeDataPoint);
              }
            }}
            focusEnabled
            showTextOnFocus
          />
        )}
      </View>

      {/* Stats */}
      <View className="px-4 py-1 flex justify-center gap-3">
        {/* NPS */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-2 items-center justify-between">
            <View className="rounded-full p-1 bg-[#2B82DE1F]">
              <TargetIcon color={"#2B82DE"} width={25} height={25} />
            </View>

            <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
              NPS Score
            </Text>
          </View>

          <Text className="text-[#00BF83] font-bold text-xl">
            {selectedPoint
              ? selectedPoint.npsScore > 0
                ? `+${selectedPoint.npsScore.toFixed(1)}`
                : selectedPoint.npsScore.toFixed(1)
              : 0}
          </Text>
        </View>

        {/* Avg NPS */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-2 items-center justify-between">
            <View className="rounded-full p-1 bg-[#2B82DE1F]">
              <StarIcon color={"#2B82DE"} width={25} height={25} />
            </View>

            <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
              Average NPS Rating
            </Text>
          </View>

          <Text className="text-[#00BF83] font-bold text-xl">
            {selectedPoint ? selectedPoint.avgNPSRating.toFixed(1) : 0}
          </Text>
        </View>

        {/* Promoters */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-2 items-center justify-between">
            <View className="rounded-full p-1 bg-[#00BF831F]">
              <LaughIcon color={"#00BF83"} width={25} height={25} />
            </View>

            <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
              Promoters
            </Text>
          </View>

          <Text className="text-[#00BF83] font-bold text-xl">
            {selectedPoint ? selectedPoint.promoters : 0}
          </Text>
        </View>

        {/* Passives */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-2 items-center justify-between">
            <View className="rounded-full p-1 bg-[#FFC1071F]">
              <MehIcon color={"#FFC107"} width={25} height={25} />
            </View>

            <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
              Passives
            </Text>
          </View>

          <Text className="text-[#FFC107] font-bold text-xl">
            {selectedPoint ? selectedPoint.passives : 0}
          </Text>
        </View>

        {/* Detractors */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-2 items-center justify-between">
            <View className="rounded-full p-1 bg-[#FF61611F]">
              <AngryIcon color={"#FF6161"} width={25} height={25} />
            </View>

            <Text className="text-rateUpTextGray dark:text-slate-300 font-semibold text-md">
              Detractors
            </Text>
          </View>

          <Text className="text-[#FF6161] font-bold text-xl">
            {selectedPoint ? selectedPoint.detractors : 0}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default HappinessJourney;
