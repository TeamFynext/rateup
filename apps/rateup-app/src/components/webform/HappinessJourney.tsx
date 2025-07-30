import React, { useState } from "react";
import { View, Text, Dimensions, ScrollView } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useAllResponseNPSForGraph } from "@/src/api/response/response.query";

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
  propsForDots: {
    r: "3",
    strokeWidth: "1",
    stroke: "#fff",
  },
};

const HappinessJourney = ({ surveyId }: { surveyId: string }) => {
  const [timePeriod, setTimePeriod] = useState("daily");
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data: graphResponse = [], isLoading } = useAllResponseNPSForGraph(
    timePeriod,
    userTimeZone,
    surveyId
  );

  const limitCount = 10;
  const limitedData = graphResponse.slice(-limitCount);

  const labels = limitedData.map((item: any) => item.date);
  const responses = limitedData.map((item: any) => item.total);
  const happinessIndex = limitedData.map((item: any) => item.happinessIndex);

  const data = {
    labels,
    datasets: [
      {
        data: responses,
        color: (opacity = 1) => `rgba(66, 135, 245, ${opacity})`, // Blue for responses
        strokeWidth: 2,
      },
      {
        data: happinessIndex,
        color: (opacity = 1) => `rgba(59, 183, 126, ${opacity})`, // Green for happiness index
        strokeWidth: 2,
      },
    ],
    legend: ["Responses", "Happiness Index"],
  };

  return (
    <ScrollView horizontal>
      <View className="bg-white p-4 rounded-xl">
        <Text className="text-lg font-semibold mb-2">Happiness Journey</Text>
        {!isLoading && (
          <LineChart
            data={data}
            width={screenWidth} // Adjust based on data points
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 16 }}
            yAxisSuffix=""
            yAxisInterval={1}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default HappinessJourney;
