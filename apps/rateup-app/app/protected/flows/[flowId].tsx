import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useWaFlowFromDb,
} from "@/src/api/whatsapp/flow/flow.query";
import { ContactCard } from "@/src/components/flow/FlowResponseCard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { BackIcon } from "@/src/constants/imageExports";
import ChoiceWise from "@/src/components/flow/ChoiceWise";
import { useResponseAnalytics, useResponsesBySurvey } from "@/src/api/response/response.query";
import { useQuestions } from "@/src/api/question/question.query";

dayjs.extend(relativeTime);

const Tab = createMaterialTopTabNavigator();

const OverviewTab = ({ surveyId,flow,version }: { surveyId?: string ,flow:any,version:number}) => {
  const {data,isLoading} = useResponseAnalytics(surveyId,{});
  const {data:question} =useQuestions(surveyId);
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

  return (
    <ScrollView className="p-4 bg-white h-full">
      {Object.entries(data.choiceWise).map(([questionId, { data: choices }]) => (
        <ChoiceWise
          key={questionId}
          questionId={questionId}
          choices={choices}
          questions={question}
          version={version}
          flow={flow}
        />
      ))}
    </ScrollView>
  );
};

const ResponsesTab = ({ surveyId }: { surveyId?: string }) => {
  const { data: dat1, isLoading } = useResponsesBySurvey(surveyId, {});
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
      <FlatList
        data={dat1.responses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({
            pathname:`/protected/flows/flowresponse/${item.id}`
            }) }>
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

  const { flowId, flowName } = useMemo(() => {
    const id = params?.flowId;
    const name = params?.flowName;
    return {
      flowId: Array.isArray(id) ? id[0] : id,
      flowName: Array.isArray(name) ? name[0] : name,
    };
  }, [params]);

  const { data: flowData, isLoading: loadingFlow } = useWaFlowFromDb(flowId);
  console.log("flowData:",flowData);

  if (loadingFlow) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center mt-4 mb-4 gap-2">
        <Pressable onPress={() => router.back()}>
          <BackIcon height={25} width={25} />
        </Pressable>
        <Text className="text-black text-2xl font-bold">{flowName}</Text>
      </View>

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={{
          tabBarIndicatorStyle: { backgroundColor: "#0f766e", height: 3 },
          tabBarLabelStyle: { fontWeight: "600", textTransform: "capitalize" },
          tabBarActiveTintColor: "#0f766e",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: { backgroundColor: "#ffffff", elevation: 0 },
        }}
      >
        <Tab.Screen name="Overview">
          {() => <OverviewTab surveyId={flowData?.surveyId} flow={flowData} version={flowData?.version} />}
        </Tab.Screen>
        <Tab.Screen name="Responses">
          {() => <ResponsesTab surveyId={flowData?.surveyId} />}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default FlowPage;
