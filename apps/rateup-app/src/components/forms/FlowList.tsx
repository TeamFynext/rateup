import React, { memo, useMemo, useState, useCallback } from "react";
import { View, Text, ActivityIndicator, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useWaFlowsFromDb } from "@/api/whatsapp/flow/flow.query";
import FlowSearchBar from "@/components/flow/FlowSearchBar";
import { useRouter } from "expo-router";
import { useFlowFilterStore, useSearchFlowStore } from "@/utils/store";
import { SlidersHorizontal } from "lucide-react-native";
import { colors } from "@/constants/constants";
import ScreenHeader, { HeaderIconButton } from "@/components/common/ScreenHeader";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { useColorScheme } from "nativewind";
import { Colors } from "@/constants/colors";
import type { DbFlow } from "@/api/whatsapp/types";
import FormCard, { type FormStatus } from "@/components/forms/FormCard";

const FLOW_STATUS: Record<string, FormStatus> = {
  PUBLISHED: { label: "Published", tone: "success" },
  DRAFT: { label: "Draft", tone: "warm" },
  BLOCKED: { label: "Blocked", tone: "danger" },
  THROTTLED: { label: "Throttled", tone: "danger" },
  DEPRECATED: { label: "Deprecated", tone: "neutral" },
};

const Flow = ({ switcher }: Readonly<{ switcher: React.ReactNode }>) => {
  const { data = [], isLoading, isError, refetch } = useWaFlowsFromDb();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);
  const { search } = useSearchFlowStore();
  const router = useRouter();

  const { teamId, status, sortByDate, alphabetical } = useFlowFilterStore();

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const pageBg = isDark ? Colors.dark.bg : Colors.light.bg;

  const filteredAndSortedFlows = useMemo(() => {
    let flows = [...data];

    // Filter by team
    if (teamId !== "all") {
      flows = flows.filter((flow) =>
        flow.survey?.teams?.some((team: any) => team.teamId === teamId),
      );
    }

    // Filter by status
    if (status !== "all") {
      flows = flows.filter((flow) => flow.status === status);
    }

    if (search.trim()) {
      flows = flows.filter((flow) => flow.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Sort by createdAt
    if (sortByDate === "latest") {
      flows = flows.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortByDate === "oldest") {
      flows = flows.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    // Name order last, so it wins over the date order whenever it is set.
    if (alphabetical === "A-Z") {
      flows = flows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (alphabetical === "Z-A") {
      flows = flows.sort((a, b) => b.name.localeCompare(a.name));
    }

    return flows;
  }, [data, teamId, status, sortByDate, alphabetical, search]);

  const renderItem = ({ item }: { item: DbFlow }) => {
    const screens = item.json?.screens?.length ?? 0;
    return (
      <FormCard
        kind="flow"
        title={item.name}
        status={FLOW_STATUS[item.status] ?? { label: item.status, tone: "neutral" }}
        createdAt={item.createdAt}
        detail={screens ? `${screens} screen${screens === 1 ? "" : "s"}` : undefined}
        onPress={() =>
          router.push({
            //@ts-ignore
            pathname: `/protected/flow/${item.dbFlowId}`,
            params: { flowName: item.name },
          })
        }
      />
    );
  };

  const activeFilterCount = [
    teamId !== "all",
    status !== "all",
    sortByDate !== "latest",
    alphabetical !== null,
  ].filter(Boolean).length;

  const header = (
    <ScreenHeader
      title="Forms"
      actions={
        <HeaderIconButton
          onPress={() => router.push("/protected/flow/FlowFilter")}
          badge={activeFilterCount}
        >
          <SlidersHorizontal size={20} color={t.fg2} />
        </HeaderIconButton>
      }
      below={
        <View style={{ gap: 10 }}>
          {switcher}
          <FlowSearchBar />
        </View>
      }
    />
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: pageBg }}>
        {header}
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
          <Text className="text-primaryBlue font-semibold mt-2">Loading flows...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      {header}
      <View className="flex-1 pt-2 px-4 w-screen">
        <FlashList
          data={filteredAndSortedFlows}
          renderItem={renderItem}
          keyExtractor={(item) => item.dbFlowId}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors["primary-blue"]}
              colors={[colors["primary-blue"]]}
            />
          }
          ListEmptyComponent={
            <View className="items-center mt-20">
              {isError ? (
                <Text className="text-gray-700 dark:text-gray-300 font-medium">
                  Check your internet connection
                </Text>
              ) : (
                <Text className="text-gray-500">No flows found.</Text>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </View>
  );
};

export default memo(Flow);
