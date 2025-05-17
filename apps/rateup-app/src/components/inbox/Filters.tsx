import {
  View,
  Text,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Pressable,
} from "react-native";
import React, { useState } from "react";
import { BackIcon } from "@/src/constants/imageExports";
import { useRouter } from "expo-router";
import { useChatFilterStore, useSelectedTabStore } from "@/src/utils/store";

const FiltersScreen = () => {
  const { selectedTab } = useSelectedTabStore();
  const { filter, setFilter } = useChatFilterStore();
  const router = useRouter();
  const [result, setResult] = useState<number>(123);
  const [assignmentStatuses, setAssignmentStatuses] = useState<
    ("Assigned" | "UnAssigned" | "AssignedToMe")[]
  >([]);

  const isNew = selectedTab == "New";
  return (
    <KeyboardAvoidingView className="bg-white h-screen">
      <View className={"flex justify-between p-4 h-screen"}>
        <View>
          <View className="flex-row justify-between p-3">
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => router.back()}>
                <BackIcon />
              </Pressable>
              <Text className="text-2xl font-bold">Filters</Text>
            </View>

            <TouchableOpacity className="bg-[#E2E5ED] px-4 py-3 rounded-full">
              <Text className="text-md">Clear all</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Search Tags, Groups and Campaigns"
            placeholderTextColor="#E2E5ED"
            className="border border-[#E2E5ED] px-3 py-3 rounded-full"
          />
          {isNew && (
            <View className="mt-4">
              <Text className="mb-2 font-semibold text-md">Assign Status</Text>
              <View className="flex-row gap-3">
                {["Assigned", "UnAssigned", "Assigned To Me"].map((status) => {
                  const isSelected = assignmentStatuses.includes(
                    status as "Assigned" | "UnAssigned" | "AssignedToMe"
                  );

                  return (
                    <Pressable
                      key={status}
                      onPress={() => {
                        setAssignmentStatuses((prev) =>
                          isSelected
                            ? prev.filter((s) => s !== status)
                            : [...prev, status as "Assigned" | "UnAssigned" | "AssignedToMe"]
                        );
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        isSelected
                          ? "bg-rateUpGreen border-rateUpGreen"
                          : "border-[#E2E5ED]"
                      }`}
                    >
                      <Text
                        className={`${
                          isSelected ? "text-white" : "text-black"
                        } font-medium`}
                      >
                        {status}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

       <Pressable
  className="bg-rateUpGreen rounded-xl py-4"
  onPress={() => {
    // Convert to internal filter values
    const newStatuses = assignmentStatuses.map((status) => {
      switch (status) {
        case "Assigned":
          return "ASSIGNED";
        case "UnAssigned":
          return "UNASSIGNED";
        case "AssignedToMe":
          return "ASSIGNEDTOME"; // Update if backend expects something else
        default:
          return null;
      }
    }).filter(Boolean);

    setFilter({
      ...filter,
      //@ts-ignore
      newStatuses,
    });

    router.back(); // Optional: go back after applying filter
  }}
>
  <Text className="text-white text-center font-bold text-lg">
    Show {result} results
  </Text>
</Pressable>

      </View>
    </KeyboardAvoidingView>
  );
};

export default FiltersScreen;
