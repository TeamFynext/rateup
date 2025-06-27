import React, { useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useResponseAnalytics,
  useResponsesBySurvey,
} from "@/src/api/response/response.query";
import { ContactCard } from "@/src/components/flow/FlowResponseCard";
import { useSurvey } from "@/src/api/survey/survey.query";
import { useQuestions } from "@/src/api/question/question.query";
import ChoiceWise from "@/src/components/flow/ChoiceWise";
import { BackIcon } from "@/src/constants/imageExports";

const Tab = createMaterialTopTabNavigator();

const AnalyticsTab = ({
  webformId,
  webform,
}: {
  webformId: string;
  webform: any;
}) => {
  const { data, isLoading } = useResponseAnalytics(webformId, {});
  const { data: question } = useQuestions(webformId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-red-500">Failed to load analytics data.</Text>
      </View>
    );
  }

  const totalResponses = Object.values(data.choiceWise || {}).reduce(
    (acc: number, curr: any) => acc + (curr?.responseCount || 0),
    0
  );

  return (
    <View className="bg-white h-full flex-1">
      {/* ✅ Response Count Header */}
      <View className="px-4 py-3 border-b border-gray-200 bg-rateUpGreen20 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-rateUpGreen">
          Total Responses
        </Text>
        <View className="bg-rateUpGreen px-2.5 py-1 rounded-full">
          <Text className="text-white text-sm font-semibold">
            {totalResponses}
          </Text>
        </View>
      </View>

      <ScrollView className="p-4">
        {Object.keys(data.choiceWise || {}).length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-gray-500 text-base">No data available.</Text>
          </View>
        ) : (
          Object.entries(data.choiceWise).map(
            ([questionId, { data: choices }]) => (
              <ChoiceWise
                key={questionId}
                questionId={questionId}
                choices={choices}
                questions={question}
                version={1}
                flow={webform}
              />
            )
          )
        )}
      </ScrollView>
    </View>
  );
};

const ResponsesTab = ({ webformId }: { webformId?: string }) => {
  const { data: dat1, isLoading } = useResponsesBySurvey(webformId, {});
  const totalResponse = dat1?.totalCount || 0;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!dat1?.responses?.length) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">No responses available.</Text>
      </View>
    );
  }

  return (
    <View className="bg-white h-full">
      {/* ✅ Response Count Header */}
      <View className="px-4 py-3 border-b border-gray-200 bg-rateUpGreen20 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-rateUpGreen">
          Total Responses
        </Text>
        <View className="bg-rateUpGreen px-2.5 py-1 rounded-full">
          <Text className="text-white text-sm font-semibold">
            {totalResponse}
          </Text>
        </View>
      </View>

      <FlatList
        data={dat1.responses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => <ContactCard item={item} />}
      />
    </View>
  );
};

const WebFormPage = () => {
  const { webformId, webFormName } = useLocalSearchParams();
  const { data: surveyData, isLoading: surveyLoading } = useSurvey(webformId);
  const screenWidth = Dimensions.get("window").width;
  const sw = Math.floor(screenWidth * 0.45);
  const router = useRouter();

  if (!webformId || typeof webformId !== "string") {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-red-500">Invalid webform ID.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white p-2">
      <View className="flex-row items-center mt-4 mb-4 gap-2">
        <Pressable onPress={() => router.back()}>
          <BackIcon height={25} width={25} />
        </Pressable>
        <Text className="text-black text-2xl font-bold">{webFormName}</Text>
      </View>

      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarLabel: ({ focused }) => (
            <View
              style={{ width: sw }}
              className={`mx-auto p-3 rounded-lg ${
                focused ? "bg-rateUpGreen20" : "bg-white"
              }`}
            >
              <Text
                className={`text-base text-center font-semibold ${
                  focused ? "text-rateUpGreen" : "text-gray-500"
                }`}
              >
                {route.name}
              </Text>
            </View>
          ),
          tabBarStyle: {
            backgroundColor: "#fff",
            elevation: 0,
            height: 60,
          },
          tabBarIndicatorStyle: {
            backgroundColor: "transparent",
          },
        })}
      >
        <Tab.Screen name="Analytics">
          {() => <AnalyticsTab webformId={webformId} webform={surveyData} />}
        </Tab.Screen>
        <Tab.Screen name="Responses">
          {() => <ResponsesTab webformId={webformId} />}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default WebFormPage;
