import React, { useMemo } from "react";
import { useResponseCount } from "@/api/response/response.query";
import { useGetSurveyStats } from "@/api/survey/survey.query";
import { Text, View } from "react-native";

const SurveyStatsWebForm = ({ surveyId }: { surveyId: string }) => {
    const { data: responseCountData } = useResponseCount(surveyId);
    const responseCount = useMemo(
        () => responseCountData?.all,
        [responseCountData]
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
            { visited: 0, started: 0 }
        );
    }, [surveyStats]);

    const { responseRatePercentage } = getResponseRateInfo(
        responseCount,
        visited
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
                    className="w-[48%] bg-[#FAFAFA] border border-[#E2E5ED] rounded-lg p-2 mb-3 flex-row justify-center items-center"
                >
                    <View className="flex items-center justify-center p-1">
                        <Text className="text-4xl text-rateUpBlue font-bold">{value}</Text>
                        <Text className="text-sm text-rateUpTextGray">{title}</Text>
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
