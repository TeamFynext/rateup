import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTeamsByUser } from "@/src/api/teams/teams.query";
import { useFlowFilterStore } from "@/src/utils/store";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

const Button = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className={`px-4 py-2 rounded-md border ${
      active ? "bg-rateUpLightGreen border-rateUpGreen" : "border-gray-300"
    }`}
    onPress={onPress}
  >
    <Text
      className={`${
        active ? "text-rateUpGreen font-semibold" : "text-gray-700"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const FlowFilter = () => {
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
  } = useFlowFilterStore();

  const { data: teamData, isLoading } = useTeamsByUser();
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const teamList = useMemo(() => {
    if (!teamData?.data) return [];
    return [{ id: "all", name: "All Teams" }, ...teamData.data];
  }, [teamData]);

  const selectedTeamName =
    teamList.find((t) => t.id === teamId)?.name ?? "All Teams";

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      <View className="flex-row items-center mb-8 gap-2 justify-between">
        <View className="flex-row gap-1 items-center justify-center">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft />
          </Pressable>
          <Text className="text-black text-2xl font-bold">Filter</Text>
        </View>
        <TouchableOpacity
          onPress={resetFilters}
          className="rounded-full px-4 py-2 items-center justify-center bg-gray-200"
        >
          <Text className="text-black font-semibold">Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Team Selector */}
      <Text className="mb-1 text-sm text-gray-700">Teams</Text>
      <TouchableOpacity
        className="border border-gray-300 rounded-lg px-4 py-3 bg-white mb-4"
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-gray-800">{selectedTeamName}</Text>
      </TouchableOpacity>

      {/* Status Filter */}
      <View className="flex-row justify-between mb-4">
        {["all", "PUBLISHED", "DRAFT"].map((s) => (
          <Button
            key={s}
            label={s === "all" ? "All" : s}
            active={status === s}
            onPress={() => setStatus(s as any)}
          />
        ))}
      </View>

      {/* Date Sort */}
      <View className="flex-row justify-between mb-4">
        <Button
          label="Latest First"
          active={sortByDate === "latest"}
          onPress={() => setSortByDate("latest")}
        />
        <Button
          label="Oldest First"
          active={sortByDate === "oldest"}
          onPress={() => setSortByDate("oldest")}
        />
      </View>

      {/* Alphabetical */}
      <View className="flex-row justify-between mb-4">
        <Button
          label="A-Z"
          active={alphabetical === "A-Z"}
          onPress={() => setAlphabetical("A-Z")}
        />
        <Button
          label="Z-A"
          active={alphabetical === "Z-A"}
          onPress={() => setAlphabetical("Z-A")}
        />
      </View>

      {/* Show Results */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="bg-rateUpGreen rounded-xl py-4 mt-auto mb-6 items-center justify-center"
      >
        <Text className="text-white font-semibold">Show results</Text>
      </TouchableOpacity>

      {/* Team Selector Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="bg-white rounded-t-2xl max-h-[60%] p-4">
            <Text className="text-lg font-semibold mb-3">Select a Team</Text>
            <FlatList
              data={teamList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-3 border-b border-gray-100"
                  onPress={() => {
                    setTeamId(item.id);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    className={`text-base ${
                      teamId === item.id
                        ? "text-rateUpGreen font-bold"
                        : "text-gray-800"
                    }`}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              className="mt-4 py-3 bg-gray-100 rounded-xl items-center"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-gray-600 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default FlowFilter;
