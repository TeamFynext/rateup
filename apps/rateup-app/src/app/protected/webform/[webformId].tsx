import React, { useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Pressable,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs";
import { useResponseAnalytics, useResponsesBySurvey } from "@/api/response/response.query";
import { ContactCard } from "@/components/flow/FlowResponseCard";
import { useSurvey } from "@/api/survey/survey.query";
import { useQuestions } from "@/api/question/question.query";
import { useWebFormResponseDataStore } from "@/utils/store";
import SurveyStatsWebForm from "@/components/webform/SurveyStats";
import HappyIndex from "@/components/webform/HappyIndex";
import NpsOverview from "@/components/webform/NpsOverview";
import HappinessJourney from "@/components/webform/HappinessJourney";
import SurveyQuestions from "@/components/flow/SurveyQuestions";
import { ArrowLeft } from "lucide-react-native";
import { firstParam } from "@/utils/params";

const Tab = createMaterialTopTabNavigator();
const SubTab = createMaterialTopTabNavigator();

const AnalyticsTab = ({ webformId }: { webformId: string; webform: any }) => {
  const isDark = useColorScheme() === "dark";

  const { data, isLoading } = useResponseAnalytics(webformId, {});

  const { data: questions } = useQuestions(webformId);

  const [npsOverView, choiceWiseOverView] = useMemo(
    () => (data ? [Object.entries(data?.nps), Object.entries(data?.choiceWise)] : [[], []]),
    [data],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <Text className="text-red-500">Failed to load analytics data.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950 h-full">
      <SurveyStatsWebForm surveyId={webformId} />

      <SubTab.Navigator
        screenOptions={({ route }) => ({
          lazy: true,
          tabBarScrollEnabled: true,

          tabBarLabel: ({ focused }) => (
            <Text
              className={`text-md font-bold ${
                focused ? "text-rateUpBlue" : isDark ? "text-slate-400" : "text-gray-400"
              }`}
            >
              {route.name}
            </Text>
          ),

          tabBarStyle: {
            backgroundColor: isDark ? "#020617" : "#fff",

            elevation: 0,
            height: 48,
            width: "100%",
          },

          tabBarIndicatorStyle: {
            backgroundColor: "#4A90E2",
            height: 2,
          },
        })}
      >
        <SubTab.Screen name="Happiness Index">
          {() => <HappyIndex surveyId={webformId} />}
        </SubTab.Screen>

        <SubTab.Screen name="NPS Overview">
          {() => <NpsOverview surveyId={webformId} />}
        </SubTab.Screen>

        <SubTab.Screen name="Happiness Journey">
          {() => <HappinessJourney surveyId={webformId} />}
        </SubTab.Screen>

        <SubTab.Screen name="Survey Questions Breakdown">
          {() => (
            <SurveyQuestions
              choiceWise={choiceWiseOverView}
              NPS={npsOverView}
              version={1}
              questions={questions}
              flow={null}
            />
          )}
        </SubTab.Screen>
      </SubTab.Navigator>
    </View>
  );
};

const ResponsesTab = ({ webformId }: { webformId?: string }) => {
  const { data: dat1, isLoading } = useResponsesBySurvey(webformId, {});

  const totalResponse = dat1?.totalCount || 0;

  const { setData } = useWebFormResponseDataStore();

  const router = useRouter();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!dat1?.responses?.length) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <Text className="text-gray-500 dark:text-slate-400">No responses available.</Text>
      </View>
    );
  }

  return (
    <View className="bg-white dark:bg-slate-950 h-full">
      {/* Response Count Header */}
      <View className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-rateUpGreen20 dark:bg-slate-900 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-rateUpGreen">Total Responses</Text>

        <View className="bg-rateUpGreen px-2.5 py-1 rounded-full">
          <Text className="text-white text-sm font-semibold">{totalResponse}</Text>
        </View>
      </View>

      <FlatList
        data={dat1.responses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setData([item]);

              router.push({
                pathname: "/protected/webform/webformresponse/[webformresponseId]",
                params: {
                  webformresponseId: item.id,
                  webformId: webformId,
                  respondent: item.phone,
                },
              });
            }}
          >
            <ContactCard item={item} />
          </Pressable>
        )}
      />
    </View>
  );
};

const WebFormPage = () => {
  const isDark = useColorScheme() === "dark";

  const { webformId, webFormName } = useLocalSearchParams();

  const { data: surveyData } = useSurvey(firstParam(webformId));

  const screenWidth = Dimensions.get("window").width;

  const sw = Math.floor(screenWidth * 0.45);

  const router = useRouter();

  if (!webformId || typeof webformId !== "string") {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <Text className="text-red-500">Invalid webform ID.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-950 p-2">
      {/* Header */}
      <View className="flex-row items-center mt-4 mb-4 gap-2">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft color={isDark ? "white" : "black"} />
        </Pressable>

        <Text className="text-black dark:text-white text-2xl font-bold">{webFormName}</Text>
      </View>

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          swipeEnabled: false,

          tabBarLabel: ({ focused }) => (
            <View
              style={{ width: sw }}
              className={`mx-auto p-3 rounded-xl ${
                focused ? "bg-rateUpGreen20 dark:bg-slate-800" : "bg-white dark:bg-slate-950"
              }`}
            >
              <Text
                className={`text-base text-center font-semibold ${
                  focused ? "text-rateUpBlue" : isDark ? "text-slate-400" : "text-gray-500"
                }`}
              >
                {route.name}
              </Text>
            </View>
          ),

          tabBarStyle: {
            backgroundColor: isDark ? "#020617" : "#fff",

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

        <Tab.Screen name="Responses">{() => <ResponsesTab webformId={webformId} />}</Tab.Screen>
      </Tab.Navigator>
    </View>
  );
};

export default WebFormPage;
