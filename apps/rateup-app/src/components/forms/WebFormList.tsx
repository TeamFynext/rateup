import { View, Text, ActivityIndicator, RefreshControl } from "react-native";
import React, { useMemo, useState, useCallback } from "react";
import { FlashList } from "@shopify/flash-list";
import { useSearchWebFormStore, useWebFormFilterStore } from "@/utils/store";
import WebFormSearchBar from "@/components/webform/WebSearchbar";
import { useSurveys } from "@/api/survey/survey.query";
import { useRouter } from "expo-router";
import { SlidersHorizontal } from "lucide-react-native";
import { colors } from "@/constants/constants";
import ScreenHeader, { HeaderIconButton } from "@/components/common/ScreenHeader";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { useColorScheme } from "nativewind";
import { Colors } from "@/constants/colors";
import FormCard from "@/components/forms/FormCard";

const WebForm = ({ switcher }: Readonly<{ switcher: React.ReactNode }>) => {
  const { data: webform, isLoading, isError, refetch } = useSurveys();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const { teamId, status, sortByDate, alphabetical } = useWebFormFilterStore();
  const { search } = useSearchWebFormStore();
  const router = useRouter();

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const pageBg = isDark ? Colors.dark.bg : Colors.light.bg;
  const activeFilterCount =
    (teamId !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (sortByDate !== "latest" ? 1 : 0) +
    (alphabetical !== null ? 1 : 0);

  const filteredForms = useMemo(() => {
    if (!webform || !Array.isArray(webform)) return [];

    let filtered = webform.filter((form) => form.type === "web");

    if (status !== "all") {
      filtered = filtered.filter((form) => (status === "ACTIVE" ? form.active : !form.active));
    }

    if (teamId !== "all") {
      filtered = filtered.filter((form) => form.teams?.some((team: any) => team.id === teamId));
    }

    if (search.trim()) {
      filtered = filtered.filter((form) => form.title.toLowerCase().includes(search.toLowerCase()));
    }

    if (sortByDate === "latest") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    if (alphabetical === "A-Z") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (alphabetical === "Z-A") {
      filtered.sort((a, b) => b.title.localeCompare(a.title));
    }

    return filtered;
  }, [webform, teamId, status, sortByDate, alphabetical, search]);

  const renderItem = ({ item }: { item: any }) => (
    <FormCard
      kind="webform"
      title={item.title}
      status={
        item.active ? { label: "Active", tone: "success" } : { label: "Paused", tone: "warm" }
      }
      createdAt={item.createdAt}
      onPress={() =>
        router.push({
          pathname: "/protected/webform/[webformId]",
          params: { webformId: item.id, webFormName: item.title },
        })
      }
    />
  );

  const header = (
    <ScreenHeader
      title="Forms"
      actions={
        <HeaderIconButton
          onPress={() => router.push("/protected/webform/WebFormFilter")}
          badge={activeFilterCount}
        >
          <SlidersHorizontal size={20} color={t.fg2} />
        </HeaderIconButton>
      }
      below={
        <View style={{ gap: 10 }}>
          {switcher}
          <WebFormSearchBar />
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
          <Text className="text-primaryBlue font-semibold mt-2">Loading web forms...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }} className="w-screen">
      {header}
      <View className="flex-1 px-4 pt-2">
        <FlashList
          data={filteredForms}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
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
                <Text className="text-gray-500">No web forms found.</Text>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </View>
  );
};

export default WebForm;
