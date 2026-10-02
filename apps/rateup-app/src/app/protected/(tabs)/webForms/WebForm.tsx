import { View, Text, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import React, { useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import { FlashList } from "@shopify/flash-list";
import { useSearchWebFormStore, useWebFormFilterStore } from "@/utils/store";
import WebFormSearchBar from "@/components/webform/WebSearchbar";
import { useSurveys } from "@/api/survey/survey.query";
import { useRouter } from "expo-router";
import { MoveRight, SlidersHorizontal } from "lucide-react-native";
import { colors } from "@/constants/constants";
import ScreenHeader, { HeaderIconButton } from "@/components/common/ScreenHeader";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { useColorScheme } from "nativewind";
import { Colors } from "@/constants/colors";

dayjs.extend(relativeTime);
dayjs.extend(isToday);

const WebForm = () => {
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

  if (isLoading) {
    return (
      <View
        className="flex-1 px-4 pt-4 w-screen justify-center items-center"
        style={{ backgroundColor: pageBg }}
      >
        <ActivityIndicator size="large" />
        <Text className="text-primaryBlue font-semibold mt-2">Loading web forms...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Pressable
        className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-md flex flex-col space-y-2 mb-2"
        onPress={() =>
          router.push({
            pathname: "/protected/webform/[webformId]",
            params: { webformId: item.id, webFormName: item.title },
          })
        }
      >
        <View className="flex-row justify-between items-start">
          <Text className="text-base font-semibold dark:text-white w-[65%]" numberOfLines={2}>
            {item.title}
          </Text>
          <Text className="text-xs text-gray-500">
            {dayjs(item.createdAt).isToday()
              ? dayjs(item.createdAt).format("hh:mm A")
              : dayjs(item.createdAt).format("DD/MM/YYYY")}
          </Text>
        </View>

        <View className="flex-row justify-between items-center mt-1">
          <View
            className={`px-2 py-[2px] rounded-full flex-row items-center ${
              item.active ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            }`}
          >
            <View
              className={`w-2 h-2 rounded-full mr-1 ${
                item.active ? "bg-green-500" : "bg-orange-500"
              }`}
            />
            <Text className="text-xs font-medium">{item.active ? "Active" : "Paused"}</Text>
          </View>

          <View className="px-2 py-1 rounded-full bg-primaryBlue/20">
            <View className="flex-row justify-center items-center gap-1">
              <Text className="text-xs font-semibold text-primaryBlue">Response</Text>
              <MoveRight width={15} height={15} color={colors["primary-blue"]} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }} className="w-screen">
      <ScreenHeader
        title="Web Forms"
        actions={
          <HeaderIconButton
            onPress={() => router.push("/protected/webform/WebFormFilter")}
            badge={activeFilterCount}
          >
            <SlidersHorizontal size={20} color={t.fg2} />
          </HeaderIconButton>
        }
        below={<WebFormSearchBar />}
      />
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
