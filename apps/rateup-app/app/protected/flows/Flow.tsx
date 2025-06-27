import React, { memo, useMemo } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useWaFlowsFromDb } from "@/src/api/whatsapp/flow/flow.query";
import FlowSearchBar from "@/src/components/flow/FlowSearchBar";
import { useRouter } from "expo-router";
import { useFlowFilterStore, useSearchFlowStore } from "@/src/utils/store";
import { MoveRight } from "lucide-react-native";

const getStatusBadge = (status: string) => {
  const color = status === "PUBLISHED" ? "bg-green-500" : "bg-orange-400";
  return (
    <View className="flex-row items-center justify-center gap-1">
      <View className={`w-2 h-2 rounded-full ${color}`} />
      <Text
        className={`text-xs font-medium ${
          status === "PUBLISHED" ? "text-green-600" : "text-orange-500"
        }`}
      >
        {status}
      </Text>
    </View>
  );
};

const Flow = () => {
  const { data = [], isLoading } = useWaFlowsFromDb();
  const { search } = useSearchFlowStore();
  const router = useRouter();

  const { teamId, status, latestFirst, OldFirst, alphabetical } =
    useFlowFilterStore();

  const filteredAndSortedFlows = useMemo(() => {
    let flows = [...data];

    // Filter by team
    if (teamId !== "all") {
      flows = flows.filter((flow) =>
        flow.survey?.teams?.some((team: any) => team.teamId === teamId)
      );
    }

    // Filter by status
    if (status !== "all") {
      flows = flows.filter((flow) => flow.status === status);
    }

    if (search.trim()) {
      flows = flows.filter((flow) =>
        flow.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Alphabetical sort
    if (alphabetical === "A-Z") {
      flows = flows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (alphabetical === "Z-A") {
      flows = flows.sort((a, b) => b.name.localeCompare(a.name));
    }

    // Sort by createdAt
    if (latestFirst) {
      flows = flows.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (OldFirst) {
      flows = flows.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return flows;
  }, [data, teamId, status, latestFirst, OldFirst, alphabetical, search]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white px-4 pt-4 w-screen justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="text-rateUpGreen font-semibold">Loading flows...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const createdAt = new Date(item.createdAt);
    const now = new Date();
    const isToday = createdAt.toDateString() === now.toDateString();
    const formattedTime = createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedDate = `${createdAt
      .getDate()
      .toString()
      .padStart(2, "0")}/${(createdAt.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${createdAt.getFullYear()}`;

    return (
      <TouchableOpacity
        className="bg-white rounded-xl px-4 py-3 mb-3 border border-gray-200 shadow-md"
        onPress={() =>
          router.push({
            //@ts-ignore
            pathname: `/protected/flows/${item.dbFlowId}`,
            params: { flowName: item.name },
          })
        }
      >
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-base font-semibold text-gray-900">
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500">
            {isToday ? formattedTime : formattedDate}
          </Text>
        </View>

        <View className="flex-row justify-between items-center mt-1">
          {getStatusBadge(item.status)}
          <View className="bg-rateUpLightGreen px-2 py-0.5 rounded-full">
            <View className="flex-row items-center justify-center gap-1">
              <Text className="text-xs font-semibold text-rateUpGreen">
                Response
              </Text>
              <MoveRight width={15} height={15} color={"black"} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1">
      <FlowSearchBar />
      <View className="flex-1 bg-white px-4 pt-4 w-screen">
        <FlashList
          data={filteredAndSortedFlows}
          renderItem={renderItem}
          estimatedItemSize={70}
          keyExtractor={(item) => item.dbFlowId}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </View>
  );
};

export default memo(Flow);
