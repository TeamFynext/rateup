import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWaFlowFromDb } from "@/src/api/whatsapp/flow/flow.query";
import { ContactCard } from "@/src/components/flow/FlowResponseCard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { BackIcon } from "@/src/constants/imageExports";
import ChoiceWise from "@/src/components/flow/ChoiceWise";
import {
  useResponseAnalytics,
  useResponsesBySurvey,
} from "@/src/api/response/response.query";
import { useQuestions } from "@/src/api/question/question.query";
import { useFlowDataStore, useFlowResponseDataStore } from "@/src/utils/store";
import NPSOverview from "@/src/components/flow/NPSOverview";

dayjs.extend(relativeTime);

const Tab = createMaterialTopTabNavigator();

const OverviewTab = ({
  surveyId,
  flow,
  version,
}: {
  surveyId?: string;
  flow: any;
  version: number;
}) => {
  const { data, isLoading } = useResponseAnalytics(surveyId, {});
  const { data: question } = useQuestions(surveyId);

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
        <Text className="text-red-500">Failed to load flow data.</Text>
      </View>
    );
  }
  const hasNPS = Object.keys(data.nps || {}).length > 0;
  const hasChoiceWise = Object.keys(data.choiceWise || {}).length > 0;
  const totalResponses = Object.values(data.choiceWise || {}).reduce(
    (acc: number, curr: any) => acc + (curr?.responseCount ? 1 : 0),
    0
  );

  return (
    <View className="flex-1 bg-white">
      {/* Response Count Header */}
      <View className="px-4 py-3 border-b border-gray-200 bg-rateUpGreen20 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-rateUpGreen">
          Total Responded Questions
        </Text>
        <View className="bg-rateUpGreen px-2.5 py-1 rounded-full">
          <Text className="text-white text-sm font-semibold">
            {totalResponses}
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView className="p-4">
        <View className="flex-col gap-8">
          {/* ✅ NPS Overview Section */}
          {hasNPS && (
            <View className="flex gap-2">
              <Text className="text-xl font-bold text-gray-800 border-l-4 border-rateUpGreen pl-3">
                NPS Overview
              </Text>
              {Object.entries(data.nps).map(([questionId, npsEntry]: any) => (
                <NPSOverview
                  key={questionId}
                  questionId={questionId}
                  questions={question}
                  version={version}
                  flow={flow}
                  data={{
                    npsScore: npsEntry.npsData.npsScore,
                    csatScore: npsEntry.csatScore,
                    promoters: npsEntry.npsData.promoters,
                    passives: npsEntry.npsData.passives,
                    detractors: npsEntry.npsData.detractors,
                    total: npsEntry.npsData.total,
                  }}
                />
              ))}
            </View>
          )}

          {/* ✅ ChoiceWise Response Section */}
          {hasChoiceWise && (
            <View className="flex gap-3">
              <Text className="text-xl font-bold text-gray-800 border-l-4 border-rateUpGreen pl-3">
                Question-wise Overview
              </Text>
              {Object.entries(data.choiceWise).map(
                ([questionId, { data: choices }]) => (
                  <ChoiceWise
                    key={questionId}
                    questionId={questionId}
                    choices={choices}
                    questions={question}
                    version={version}
                    flow={flow}
                  />
                )
              )}
            </View>
          )}

          {/* No data fallback */}
          {!hasNPS && !hasChoiceWise && (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500 text-base">
                No analytics data available.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const ResponsesTab = ({
  surveyId,
  flow,
  version,
}: {
  surveyId?: string;
  flow:any;
  version: number;
}) => {
  const { data: dat1, isLoading } = useResponsesBySurvey(surveyId, {});
  const totalResponse = dat1?.totalCount || 0;
  const router = useRouter();
  const { setData } = useFlowResponseDataStore();
  const {setFlowData} = useFlowDataStore();

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
              setFlowData([flow])
              const routeBase =
                version === 1
                  ? "/protected/flows/flowresponse"
                  : "/protected/flows/flow2";
              router.push({
                pathname: `${routeBase}/${item.id}`,
                params: { surveyId: surveyId, respondent: item.phone },
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

const FlowPage = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
  const sw = Math.floor(screenWidth * 0.45);

  const { flowId, flowName } = useMemo(() => {
    const id = params?.flowId;
    const name = params?.flowName;
    return {
      flowId: Array.isArray(id) ? id[0] : id,
      flowName: Array.isArray(name) ? name[0] : name,
    };
  }, [params]);

  const { data: flowData, isLoading: loadingFlow } = useWaFlowFromDb(flowId);

  if (loadingFlow) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white p-2">
      {/* Header */}
      <View className="flex-row items-center mt-4 mb-4 gap-2">
        <Pressable onPress={() => router.back()}>
          <BackIcon height={25} width={25} />
        </Pressable>
        <Text className="text-black text-2xl font-bold">{flowName}</Text>
      </View>

      {/* Tabs */}
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
          tabBarItemStyle: {
            flex: 1,
            alignItems: "center",
          },
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
          {() => (
            <OverviewTab
              surveyId={flowData?.surveyId}
              flow={flowData}
              version={flowData?.version}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Responses">
          {() => (
            <ResponsesTab
              surveyId={flowData?.surveyId}
              version={flowData?.version}
              flow={flowData}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default FlowPage;
