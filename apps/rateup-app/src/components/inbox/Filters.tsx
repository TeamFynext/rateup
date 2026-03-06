import {
  View,
  Text,
  KeyboardAvoidingView,
  Pressable,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  useColorScheme,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ChatFilter,
  useChatFilterStore,
  useSelectedTabStore,
} from "@/src/utils/store";
import { useChatFilterData } from "@/src/api/inbox/contacts/contacts.query";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";
import { IconArrowLeft } from "@tabler/icons-react-native";
import { useTeamsByUser } from "@/src/api/teams/teams.query";
import { colors } from "@/src/constants/constants";

const FiltersScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { selectedTab } = useSelectedTabStore();
  const { data: teamRes, isLoading: teamsLoading } = useTeamsByUser();
  const [processedFilter, setProcessedFilter] = useState(null);
  const {
    filter,
    setFilter,
    clearFilter,
    setPreviousFilterForTab,
    previousFilterForTab,
  } = useChatFilterStore();
  const router = useRouter();
  const { data, isLoading, error } = useChatFilterData();
  const insets = useSafeAreaInsets();

  const checkIfAnyFilterisActive = useCallback((filters: any) => {
    return (
      filters.contactGroups.length > 0 ||
      filters.campaigns.length > 0 ||
      filters.tags.length > 0 ||
      filters.searchTerm?.length > 0 ||
      filters.messageType !== "all" ||
      filters.messageType !== "usermessages" ||
      filters.strictFilter !== false ||
      !filters.waMessageAssignStatus ||
      filters.waMessageAssignStatus.length
    );
  }, []);

  const prepareFilters = useCallback(
    (filters: any) => {
      if (checkIfAnyFilterisActive(filters)) {
        const processedFilters = {
          ...filters,
          contactGroups: filters?.contactGroups?.map(
            (group: any) => group.value
          ),
          campaigns: filters?.campaigns?.map((group: any) => group.value),
          tags: filters?.tags?.map((group: any) => ({
            [group.group]: group.value,
          })),
        };
        setProcessedFilter(processedFilters);
      }
    },
    [checkIfAnyFilterisActive]
  );
  const teamOptions = teamRes
    ? teamRes.data?.map((team: any) => ({
        value: team?.id,
        label: team?.name,
      }))
    : [];

  useEffect(() => {
    const openStatus = [
      WaMessageAssignStatus.ASSIGNED,
      WaMessageAssignStatus.UNASSIGNED,
    ];
    const hasOpenStatus = filter.status.some((s) =>
      openStatus.includes(s as WaMessageAssignStatus)
    );
    if (selectedTab === "Addressed" && hasOpenStatus) {
      setFilter({
        ...filter,
        status: filter.status.filter(
          (s) => !openStatus.includes(s as WaMessageAssignStatus)
        ),
      });
    } else if (selectedTab === "All" && !hasOpenStatus) {
      const prFilter = previousFilterForTab.find((t) => t.tab === "All");
      if (prFilter) {
        const openStatusInPrFilter = prFilter.filter.status.filter((s) =>
          openStatus.includes(s as WaMessageAssignStatus)
        );
        setFilter({
          ...filter,
          status: [...filter.status, ...openStatusInPrFilter],
        });
      } else {
        setFilter({ ...filter, status: [...filter.status, ...openStatus] });
      }
    }
  }, [selectedTab]);

  useEffect(() => {
    if (!selectedTab) return;
    if (selectedTab === "blocked") {
      prepareFilters({
        ...filter,
        messageType: "all",
        waMessageAssignStatus: undefined,
        blockedUsers: true,
      });
      return;
    }
    if (selectedTab === "All") {
      prepareFilters({
        ...filter,
        messageType: "all",
        waMessageAssignStatus: null,
        blockedUsers: false,
      });
    } else if (selectedTab === "New") {
      prepareFilters({
        ...filter,
        messageType: "all",
        waMessageAssignStatus: "UnAssigned",
        blockedUsers: false,
      });
    } else {
      prepareFilters({
        ...filter,
        messageType: selectedTab === "Sent" ? "all" : "usermessages",
        waMessageAssignStatus: selectedTab,
        blockedUsers: false,
      });
    }
  }, [selectedTab, filter, prepareFilters]);

  const categoryOptions = [
    { value: "conversation", label: "Conversations" },
    { value: "campaign", label: "Campaigns" },
    { value: "automation", label: "Automation" },
  ];

  const textColor = isDark ? "white" : colors["slate-950"];
  const bgColor = isDark ? colors["slate-950"] : "white";

  return (
    <SafeAreaView className="bg-white dark:bg-slate-950 flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View className="flex-1 justify-between px-4 pt-4">
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Pressable onPress={() => router.back()}>
                  <IconArrowLeft height={24} width={24} color={textColor} />
                </Pressable>
                <Text className="text-2xl font-bold dark:text-white">
                  Filters
                </Text>
              </View>
              <TouchableOpacity className="bg-primaryBlue px-4 py-3 rounded-full">
                <Text className="text-md text-white">Clear all</Text>
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
              <View>
                <Text className="dark:text-white">Tags/Groups/Campaigns</Text>
                <View className="mt-4 space-y-2 border p-2 border-lightgray rounded-xl h-14 flex justify-center">
                  <Text className="dark:text-white">
                    Select Tags, Groups or Campaigns
                  </Text>

                  <View className="flex-row flex-wrap gap-2">
                    {data
                      .flatMap((group) =>
                        group?.values?.map((value: any) => ({
                          group: group.group,
                          value,
                        }))
                      )
                      .filter(Boolean)
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
                                        item.value === value &&
                                        item.group === group
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
                                : "border-lightgray"
                            }`}
                          >
                            <Text
                              className={
                                isSelected ? "text-white" : "text-black"
                              }
                            >
                              {value}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </View>
              </View>
            )}
            <View className="py-4">
              <Text className="mb-2 dark:text-white">Category</Text>
              <View
                className="border border-lightgray rounded-xl px-3"
                style={{ backgroundColor: bgColor }}
              >
                <Picker
                  itemStyle={{
                    color: textColor,
                  }}
                  dropdownIconColor={textColor}
                  selectedValue={filter.category}
                  mode="dialog"
                  onValueChange={(value) => {
                    setFilter({
                      ...filter,
                      category: filter.category === value ? null : value,
                    });
                  }}
                >
                  {categoryOptions.map((item) => (
                    <Picker.Item
                      key={item.value}
                      label={item.label}
                      value={item.value}
                      style={{ backgroundColor: bgColor }}
                      color={textColor}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            {/* assignned and mine */}
            {["Assigned", "mine"].includes(selectedTab) && (
              <View className="py-4">
                <Text className="mb-2 dark:text-white">Assigned Team</Text>
                <View
                  className="border border-lightgray rounded-xl px-3"
                  style={{ backgroundColor: bgColor }}
                >
                  <Picker
                    selectedValue={filter.assignedTeams ?? null}
                    mode={Platform.OS === "android" ? "dropdown" : "dialog"}
                    onValueChange={(value) => {
                      setFilter({
                        ...filter,
                        assignedTeams: value,
                      });
                    }}
                    style={{
                      height: 48,
                      color: textColor, // Android text
                    }}
                    itemStyle={{
                      color: textColor, // iOS wheel text
                    }}
                    dropdownIconColor={textColor} // Android only
                  >
                    {/* Placeholder */}
                    <Picker.Item
                      label="Select a team"
                      value={null}
                      color="#999"
                    />

                    {teamOptions.map((item: any) => (
                      <Picker.Item
                        key={item.value}
                        label={item.label}
                        value={item.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <Pressable
            className="bg-primaryBlue rounded-xl py-4"
            style={{ marginBottom: insets.bottom + 10 }}
            onPress={() => {
              setFilter({
                ...filter,
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
    </SafeAreaView>
  );
};

export default FiltersScreen;
