import React, { useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useAllResponseNPSForGraph } from '@/src/api/response/response.query';

const HappinessJourney = ({ surveyId }: { surveyId: string }) => {
  const [timePeriod, setTimePeriod] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const screenWidth = Dimensions.get('window').width;

  const {
    data: graphResponse = [],
    isLoading,
  } = useAllResponseNPSForGraph(timePeriod, userTimeZone, surveyId);
 

  const totalResponses = graphResponse.map((item, index) => ({
    value: item.total,
    label: index % 5 === 0 ? item.date : '',
    labelTextStyle: { color: '#64748b', fontSize: 10 },
    dataPointText: '',
  }));

  const happinessIndex = graphResponse.map((item) => ({
    value: item.happinessIndex,
    dataPointText: '',
  }));

  const periods = ['hourly', 'daily', 'weekly'] as const;

  if (isLoading) {
    return (
      <View className="h-48 items-center justify-center bg-white rounded-2xl shadow">
        <Text className="text-sm text-slate-500">Loading chart...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white p-4 rounded-2xl shadow">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-base font-semibold text-slate-700">Happiness Journey</Text>

        {/* Time Period Buttons */}
        <View className="flex-row space-x-2">
          {periods.map((period) => (
            <Pressable
              key={period}
              onPress={() => setTimePeriod(period)}
              className={`px-2 py-1 rounded-full ${
                timePeriod === period ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <Text
                className={`text-xs ${
                  timePeriod === period ? 'text-white' : 'text-slate-700'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <LineChart
        data={totalResponses}
        secondaryData={happinessIndex}
        height={260}
        width={screenWidth - 110}
        spacing={16}
        curved
        initialSpacing={10}
        isAnimated
        yAxisTextStyle={{ color: '#1e3a8a' }}
        yAxisColor="#cbd5e1"
        yAxisThickness={1}
        yAxisTextNumberOfLines={2}
        noOfSections={8}
        color="#1D4ED8"
        thickness={2}
        dataPointsHeight={6}
        dataPointsWidth={6}
        xAxisLabelTextStyle={{ color: '#94a3b8' }}
        xAxisThickness={0}
        showXAxisIndices={false}
        rulesType="solid"
        rulesColor="#e2e8f0"
        showVerticalLines={false}
        secondaryYAxis={{
         
          maxValue:10,
         
          yAxisColor: '#cbd5e1',
          
          yAxisTextStyle: { color: '#16A34A' },
        }}
        secondaryLineConfig={{
          color: '#16A34A',
          thickness: 2,
        }}
      />

      {/* Legend */}
      <View className="flex-row justify-between mt-4 px-1">
        <View className="flex-row items-center space-x-1">
          <View className="w-2.5 h-2.5 rounded-full bg-blue-700" />
          <Text className="text-xs text-slate-500">Responses</Text>
        </View>
        <View className="flex-row items-center space-x-1">
          <View className="w-2.5 h-2.5 rounded-full bg-green-600" />
          <Text className="text-xs text-slate-500">Happiness Index</Text>
        </View>
      </View>
    </View>
  );
};

export default HappinessJourney;