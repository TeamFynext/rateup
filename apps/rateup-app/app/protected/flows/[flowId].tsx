import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useWaFlowFromDb,
  useResponsesBySurvey,
} from "@/src/api/whatsapp/flow/flow.query";
import { ContactCard } from "@/src/components/flow/FlowResponseCard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { BackIcon } from "@/src/constants/imageExports";

dayjs.extend(relativeTime);

const Tab = createMaterialTopTabNavigator();

const OverviewTab = ({ flowId }: { flowId: string }) => {
  const { data, isLoading, error } = useWaFlowFromDb(flowId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-red-500">Failed to load flow data.</Text>
      </View>
    );
  }

  return (
    <View className="p-4 bg-white">
      <Text className="text-lg font-semibold text-gray-800 mb-2">
        Flow ID: {flowId}
      </Text>
      <Text className="text-base text-gray-600">
        Survey ID: {data.surveyId}
      </Text>
    </View>
  );
};

const ResponsesTab = ({ surveyId }: { surveyId?: string }) => {
  const { data: dat1, isLoading } = useResponsesBySurvey(surveyId, {});

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
    <View className="bg-white">
      <FlatList
        data={dat1.responses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity>
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
          {() => <OverviewTab flowId={flowId} />}
        </Tab.Screen>
        <Tab.Screen name="Responses">
          {() => <ResponsesTab surveyId={flowData?.surveyId} />}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default FlowPage;
