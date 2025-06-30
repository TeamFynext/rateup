import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import React, { useMemo } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import { FlashList } from "@shopify/flash-list";
import {
  useSearchWebFormStore,
  useWebFormFilterStore,
} from "@/src/utils/store";
import WebFormSearchBar from "@/src/components/webform/WebSearchbar";
import { useSurvey, useSurveys } from "@/src/api/survey/survey.query";
import { useResponsesBySurvey } from "@/src/api/response/response.query";
import { useRouter } from "expo-router";
import { MoveRight } from "lucide-react-native";

dayjs.extend(relativeTime);
dayjs.extend(isToday);

const WebForm = () => {
  const { data: webform, isLoading } = useSurveys();
  const { teamId, status, sortByDate, alphabetical } = useWebFormFilterStore();
  const { search } = useSearchWebFormStore();
  const router = useRouter();
  const filteredForms = useMemo(() => {
    if (!webform) return [];

    let filtered = webform.filter((form) => form.type === "web");

    if (status !== "all") {
      filtered = filtered.filter((form) =>
        status === "ACTIVE" ? form.active : !form.active
      );
    }

    if (teamId !== "all") {
      filtered = filtered.filter((form) =>
        form.teams?.some((team: any) => team.id === teamId)
      );
    }

    if (search.trim()) {
      filtered = filtered.filter((form) =>
        form.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sortByDate === "latest") {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
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
      <View className="flex-1 bg-white px-4 pt-4 w-screen justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="text-rateUpGreen font-semibold mt-2">
          Loading web forms...
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        className="bg-white p-4 rounded-xl shadow-sm flex flex-col space-y-2 mb-2"
        onPress={() =>
          router.push({
            pathname: `/protected/webForms/${item.id}`,
            params: { webFormName: item.title },
          })
        }
      >
        <View className="flex-row justify-between items-start">
          <Text
            className="text-base font-semibold text-gray-900 w-[65%]"
            numberOfLines={2}
          >
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
              item.active
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            <View
              className={`w-2 h-2 rounded-full mr-1 ${
                item.active ? "bg-green-500" : "bg-orange-500"
              }`}
            />
            <Text className="text-xs font-medium">
              {item.active ? "Active" : "Paused"}
            </Text>
          </View>

          <View className="px-2 py-1 rounded-full bg-rateUpLightGreen">
            <View className="flex-row justify-center items-center gap-1">
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
    <View className="flex-1 bg-white w-screen">
      <View className="bg-rateUpGreen20 px-4 pt-4 pb-2">
        <WebFormSearchBar />
      </View>
      <View className="flex-1 px-4 pt-2">
        <FlashList
          data={filteredForms}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={100}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-gray-500">No web forms found.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </View>
  );
};

export default WebForm;
