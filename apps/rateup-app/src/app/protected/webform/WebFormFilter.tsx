import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTeamsByUser } from "@/api/teams/teams.query";
import { useWebFormFilterStore } from "@/utils/store";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

const Button = ({
  label,
  active,
  onPress,
  isDark,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  isDark: boolean;
}) => (
  <TouchableOpacity
    className={`px-4 py-3 rounded-xl border ${
      active
        ? "bg-rateUpLightGreen border-rateUpGreen"
        : isDark
          ? "border-slate-700 bg-slate-900"
          : "border-gray-300 bg-white"
    }`}
    onPress={onPress}
  >
    <Text
      className={`text-center ${
        active
          ? "text-rateUpGreen font-semibold"
          : isDark
            ? "text-white"
            : "text-gray-700"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const WebFormFilter = () => {
  const {
    teamId,
    setTeamId,
    status,
    setStatus,
    sortByDate,
    setSortByDate,
    alphabetical,
    setAlphabetical,
    resetFilters,
  } = useWebFormFilterStore();

  const { data: teamData } = useTeamsByUser();

  const [modalVisible, setModalVisible] = useState(false);

  const router = useRouter();

  const isDark = useColorScheme() === "dark";

  const teamList = useMemo(() => {
    if (!teamData?.data) return [];

    return [{ id: "all", name: "All Teams" }, ...teamData.data];
  }, [teamData]);

  const selectedTeamName =
    teamList.find((t) => t.id === teamId)?.name ?? "All Teams";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 p-4">
      {/* Header */}
      <View className="flex-row items-center mb-8 justify-between">
        <View className="flex-row gap-2 items-center">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft color={isDark ? "white" : "black"} />
          </Pressable>

          <Text className="text-black dark:text-white text-2xl font-bold">
            Filter
          </Text>
        </View>

        <TouchableOpacity
          onPress={resetFilters}
          className="rounded-full px-4 py-2 items-center justify-center bg-gray-200 dark:bg-slate-800"
        >
          <Text className="text-black dark:text-white font-semibold">
            Reset
          </Text>
        </TouchableOpacity>
      </View>

      {/* Team Selector */}
      <Text className="mb-2 text-sm text-gray-700 dark:text-gray-300">
        Teams
      </Text>

      <TouchableOpacity
        className="border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-4 bg-white dark:bg-slate-900 mb-5"
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-gray-800 dark:text-white">
          {selectedTeamName}
        </Text>
      </TouchableOpacity>

      {/* Status Filter */}
      <View className="flex-row justify-between mb-4">
        {["all", "ACTIVE", "PAUSED"].map((s) => (
          <Button
            key={s}
            label={s === "all" ? "All" : s}
            active={status === s}
            onPress={() => setStatus(s as any)}
            isDark={isDark}
          />
        ))}
      </View>

      {/* Date Sort */}
      <View className="flex-row justify-between mb-4">
        <Button
          label="Latest First"
          active={sortByDate === "latest"}
          onPress={() => setSortByDate("latest")}
          isDark={isDark}
        />

        <Button
          label="Oldest First"
          active={sortByDate === "oldest"}
          onPress={() => setSortByDate("oldest")}
          isDark={isDark}
        />
      </View>

      {/* Alphabetical */}
      <View className="flex-row justify-between mb-4">
        <Button
          label="A-Z"
          active={alphabetical === "A-Z"}
          onPress={() => setAlphabetical("A-Z")}
          isDark={isDark}
        />

        <Button
          label="Z-A"
          active={alphabetical === "Z-A"}
          onPress={() => setAlphabetical("Z-A")}
          isDark={isDark}
        />
      </View>

      {/* Show Results */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="bg-rateUpGreen rounded-2xl py-4 mt-auto mb-6 items-center justify-center"
      >
        <Text className="text-white font-semibold text-base">Show results</Text>
      </TouchableOpacity>

      {/* Team Selector Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[60%] p-4">
            <Text className="text-lg font-semibold mb-3 text-black dark:text-white">
              Select a Team
            </Text>

            <FlatList
              data={teamList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-4 border-b border-gray-100 dark:border-slate-800"
                  onPress={() => {
                    setTeamId(item.id);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    className={`text-base ${
                      teamId === item.id
                        ? "text-rateUpGreen font-bold"
                        : "text-gray-800 dark:text-white"
                    }`}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              className="mt-4 py-4 bg-gray-100 dark:bg-slate-800 rounded-2xl items-center"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-gray-600 dark:text-gray-300 font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default WebFormFilter;
