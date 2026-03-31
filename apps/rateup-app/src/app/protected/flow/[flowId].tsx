import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWaFlowFromDb } from "@/api/whatsapp/flow/flow.query";
import { ContactCard } from "@/components/flow/FlowResponseCard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  useResponseAnalytics,
  useResponsesBySurvey,
} from "@/api/response/response.query";
import { useQuestions } from "@/api/question/question.query";
import { useFlowDataStore, useFlowResponseDataStore } from "@/utils/store";
import SurveyStatsWebForm from "@/components/webform/SurveyStats";
import HappyIndex from "@/components/webform/HappyIndex";
import NpsOverview from "@/components/webform/NpsOverview";
import HappinessJourney from "@/components/webform/HappinessJourney";
import SurveyQuestions from "@/components/flow/SurveyQuestions";
import { colors } from "@/constants/constants";
import { ArrowLeft } from "lucide-react-native";

dayjs.extend(relativeTime);

const Tab = createMaterialTopTabNavigator();
const SubTab = createMaterialTopTabNavigator();

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
  const { data: questions } = useQuestions(surveyId);

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
        <ActivityIndicator size="large"  />
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
  return (
    <View className="flex-1 bg-white h-full">
      <SurveyStatsWebForm surveyId={surveyId} />
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
          {() => <HappyIndex surveyId={surveyId} />}
        </SubTab.Screen>

        <SubTab.Screen name="NPS Overview">
          {() => <NpsOverview surveyId={surveyId} />}
        </SubTab.Screen>

        <SubTab.Screen name="Happiness Journey">
          {() => <HappinessJourney surveyId={surveyId} />}
        </SubTab.Screen>

        <SubTab.Screen name="Survey Questions Breakdown">
          {() => (
            <SurveyQuestions
              choiceWise={choiceWiseOverView}
              NPS={npsOverView}
              version={version}
              questions={questions}
              flow={flow}
            />
          )}
        </SubTab.Screen>
      </SubTab.Navigator>
    </View>
  );
};

const ResponsesTab = ({
  surveyId,
  flow,
  version,
}: {
  surveyId?: string;
  flow: any;
  version: number;
}) => {
  const { data: dat1, isLoading } = useResponsesBySurvey(surveyId, {});
  const totalResponse = dat1?.totalCount || 0;
  const router = useRouter();
  const { setData } = useFlowResponseDataStore();
  const { setFlowData } = useFlowDataStore();

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
              setFlowData([flow]);
              const routeBase =
                version === 1
                  ? "/protected/flow/flowresponse"
                  : "/protected/flow/flow2";
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
    <View className="flex-1 bg-white p-2">
      {/* Header */}
      <View className="flex-row items-center mt-4 mb-4 gap-2">
        <Pressable onPress={() => router.back()}>
          <ArrowLeft />
        </Pressable>
        <Text className="text-black text-2xl font-bold">{flowName}</Text>
      </View>

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          swipeEnabled:false,
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
    </View>
  );
};

export default FlowPage;
