import { useColorScheme } from "nativewind";
import React, { useMemo } from "react";
import { useResponseCount } from "@/api/response/response.query";
import { useGetSurveyStats } from "@/api/survey/survey.query";
import { Text, View } from "react-native";

const SurveyStatsWebForm = ({ surveyId }: { surveyId: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: responseCountData } = useResponseCount(surveyId);

  const responseCount = useMemo(
    () => responseCountData?.all,
    [responseCountData],
  );

  const { data: surveyStats } = useGetSurveyStats(surveyId);

  const { visited, started } = useMemo(() => {
    let filteredStats = surveyStats ? [...surveyStats] : [];

    return filteredStats?.reduce(
      (acc, curr) => {
        acc.visited += curr?.visited ?? 0;
        acc.started += curr?.started ?? 0;

        return acc;
      },
      { visited: 0, started: 0 },
    );
  }, [surveyStats]);

  const { responseRatePercentage } = getResponseRateInfo(
    responseCount,
    visited,
  );

  const stats = [
    {
      title: "Total Visits",
      value: visited ?? "NA",
    },
    {
      title: "Started",
      value: started ?? "NA",
    },
    {
      title: "Total Responses",
      value: responseCount ?? 0,
    },
    {
      title: "Response Rate",
      value: responseRatePercentage,
    },
  ];

  return (
    <View className="flex-row flex-wrap justify-between">
      {stats.map(({ title, value }) => (
        <View
          key={title}
          className="w-[48%] rounded-2xl p-4 mb-3 border"
          style={{
            backgroundColor: isDark ? "#0f172a" : "#FAFAFA",
            borderColor: isDark ? "#1e293b" : "#E2E5ED",
          }}
        >
          <View className="items-center justify-center">
            <Text
              className="text-4xl font-bold"
              style={{
                color: isDark ? "#60A5FA" : "#004F98",
              }}
            >
              {value}
            </Text>

            <Text
              className="text-sm mt-1"
              style={{
                color: isDark ? "#94A3B8" : "#7A8289",
              }}
            >
              {title}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default SurveyStatsWebForm;

function getResponseRateInfo(responseCount: number, visited: number) {
  if (responseCount > visited) {
    return {
      responseRate: "NA",
      responseRatePercentage: "NA",
    };
  }

  const rate =
    visited > 0 ? Number(((responseCount / visited) * 100).toFixed(1)) : 0;

  const percentage = `${rate}%`;

  return {
    responseRate: rate,
    responseRatePercentage: percentage,
  };
}
