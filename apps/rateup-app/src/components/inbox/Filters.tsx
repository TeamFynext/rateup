import {
  View,
  Text,
  KeyboardAvoidingView,
  Pressable,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { BackIcon } from "@/src/constants/imageExports";
import { useRouter } from "expo-router";
import { useChatFilterStore, useSelectedTabStore } from "@/src/utils/store";
import { useChatFilterData } from "@/src/api/inbox/contacts/contacts.query";

const FiltersScreen = () => {
  const { selectedTab } = useSelectedTabStore();
  const { filter, setFilter } = useChatFilterStore();
  const router = useRouter();
  const [assignmentStatuses, setAssignmentStatuses] = useState<
    ("Assigned" | "UnAssigned" | "AssignedToMe")[]
  >([]);

  const isNew = selectedTab === "New";
  const { data, isLoading, error } = useChatFilterData();
  0;

  useEffect(() => {
    if (filter?.newStatuses?.length > 0) {
      const mapped = filter.newStatuses
        .map((status) => {
          switch (status) {
            case "ASSIGNED":
              return "Assigned";
            case "UNASSIGNED":
              return "UnAssigned";
            case "ASSIGNEDTOME":
              return "AssignedToMe";
            default:
              return null;
          }
        })
        .filter(Boolean) as ("Assigned" | "UnAssigned" | "AssignedToMe")[];

      setAssignmentStatuses(mapped);
    }
  }, []);

  return (
    <KeyboardAvoidingView className="bg-white h-screen">
      <View className="flex justify-between p-4 h-screen">
        <View>
          {/* Header */}
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

          {/* Loading and Error States */}
          {isLoading && (
            <Text className="text-center text-gray-500 mt-4">
              Loading filters...
            </Text>
          )}

          {error && (
            <Text className="text-center text-red-500 mt-4">
              Failed to load filters
            </Text>
          )}

          {/* Tags / Groups / Campaigns */}
          {Array.isArray(data) && data.length > 0 && (
            <View className="mt-4 space-y-2">
              <Text className="font-semibold text-md mb-2">
                Select Tags, Groups or Campaigns
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {data
                  .flatMap((group) =>
                    group?.values?.map((value:any) => ({
                      group: group.group,
                      value,
                    }))
                  )
                  .filter(Boolean) // Just in case
                  .map(({ group, value }) => {
                    const allSelected = [
                      ...filter.contactGroups,
                      ...filter.tags,
                      ...filter.campaigns,
                    ];

                    const isSelected = allSelected.some(
                      (item) => item.value === value && item.group === group
                    );

                    return (
                      <Pressable
                        key={`${group}-${value}`}
                        onPress={() => {
                          const current = allSelected;
                          const exists = current.find(
                            (item) =>
                              item.value === value && item.group === group
                          );

                          const updated = exists
                            ? current.filter(
                                (item) =>
                                  !(
                                    item.value === value && item.group === group
                                  )
                              )
                            : [...current, { group, value }];

                          const contactGroups = updated.filter(
                            (i) => i.group === "contactGroups"
                          );
                          const campaigns = updated.filter(
                            (i) => i.group === "campaigns"
                          );
                          const tags = updated.filter(
                            (i) =>
                              i.group !== "contactGroups" &&
                              i.group !== "campaigns"
                          );

                          setFilter({
                            ...filter,
                            contactGroups,
                            campaigns,
                            tags,
                          });
                        }}
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? "bg-rateUpGreen border-rateUpGreen"
                            : "border-[#E2E5ED]"
                        }`}
                      >
                        <Text
                          className={isSelected ? "text-white" : "text-black"}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}

          {/* Assign Status section for "New" tab */}
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
                        const updated = isSelected
                          ? assignmentStatuses.filter((s) => s !== status)
                          : [
                              ...assignmentStatuses,
                              status as
                                | "Assigned"
                                | "UnAssigned"
                                | "AssignedToMe",
                            ];

                        setAssignmentStatuses(updated);
                        const newStatuses = updated
                          .map((s) => {
                            switch (s) {
                              case "Assigned":
                                return "ASSIGNED";
                              case "UnAssigned":
                                return "UNASSIGNED";
                              case "AssignedToMe":
                                return "ASSIGNEDTOME";
                              default:
                                return null;
                            }
                          })
                          .filter(Boolean);

                        setFilter({
                          ...filter,
                          //@ts-ignore
                          newStatuses,
                        });
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

        {/* Submit Button */}
        <Pressable
          className="bg-rateUpGreen rounded-xl py-4"
          onPress={() => {
            const newStatuses = assignmentStatuses
              .map((status) => {
                switch (status) {
                  case "Assigned":
                    return "ASSIGNED";
                  case "UnAssigned":
                    return "UNASSIGNED";
                  case "AssignedToMe":
                    return "ASSIGNEDTOME";
                  default:
                    return null;
                }
              })
              .filter(Boolean);

            setFilter({
              ...filter,
              //@ts-ignore
              newStatuses,
            });

            router.back();
          }}
        >
          <Text className="text-white text-center font-bold text-lg">
            Show results
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default FiltersScreen;
