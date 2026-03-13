import React, { useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Dimensions,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useResponseAnalytics,
  useResponsesBySurvey,
} from "@/api/response/response.query";
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

const Tab = createMaterialTopTabNavigator();
const SubTab = createMaterialTopTabNavigator();

const AnalyticsTab = ({
  webformId,
  webform,
}: {
  webformId: string;
  webform: any;
}) => {
  const { data, isLoading } = useResponseAnalytics(webformId, {});
  const { data: questions } = useQuestions(webformId);

  const [npsOverView, choiceWiseOverView] = useMemo(
    () =>
      data
        ? [Object.entries(data?.nps), Object.entries(data?.choiceWise)]
        : [[], []],
    [data]
  );

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

  return (
    <View className="flex-1 bg-white h-full">
      <SurveyStatsWebForm surveyId={webformId} />
      <SubTab.Navigator
        screenOptions={({ route }) => ({
          lazy: true,
          tabBarScrollEnabled: true,
          tabBarLabel: ({ focused }) => (
            <Text
              className={`text-md font-bold ${
                focused ? "text-rateUpBlue" : "text-gray-400"
              }`}
            >
              {route.name}
            </Text>
          ),
          tabBarStyle: {
            backgroundColor: "#fff",
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
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              setData([item]);
              router.push({
                pathname: `/protected/webForms/webformresponse/${item.id}`,
                params: { webformId: webformId, respondent: item.phone },
              });
            }}
          >
            <ContactCard item={item} />
          </TouchableOpacity>
        )}
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
          <ArrowLeft />
        </Pressable>
        <Text className="text-black text-2xl font-bold">{webFormName}</Text>
      </View>

      <Tab.Navigator
        screenOptions={({ route }) => ({
          swipeEnabled: false,
          tabBarLabel: ({ focused }) => (
            <View
              style={{ width: sw }}
              className={`mx-auto p-3 rounded-lg ${
                focused ? "bg-[#C4D7F5]" : "bg-white"
              }`}
            >
              <Text
                className={`text-base text-center font-semibold ${
                  focused ? "text-rateUpBlue" : "text-gray-500"
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
