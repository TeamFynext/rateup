import { useColorScheme } from "nativewind";
import { View, Text, KeyboardAvoidingView, Pressable, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useChatFilterStore, useSelectedTabStore } from "@/utils/store";
import { useChatFilterData } from "@/api/inbox/contacts/contacts.query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { useTeamsByUser, useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import { useLifeCyclesQuery } from "@/api/lifecycle/lifecycle.query";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { WaMessageClosedStatus } from "@/constants/constants";
import { Colors } from "@/constants/colors";

const FiltersScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { selectedTab } = useSelectedTabStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Queries
  const { data: teamRes, isLoading: teamsLoading } = useTeamsByUser();
  const { data: membersRes, isLoading: membersLoading } = useTeamsMembersOfOrg();
  const { data: lifecycles, isLoading: lifecyclesLoading } = useLifeCyclesQuery();
  const { data: waSettings, isLoading: waSettingsLoading } = useWaSettings();
  const { data: filterData, isLoading: filterDataLoading } = useChatFilterData();

  const { filter, setFilter, clearFilter, setPreviousFilterForTab, previousFilterForTab } =
    useChatFilterStore();

  const textColor = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
  const bgColor = isDark ? Colors.dark.bg : "white";

  const handleClearAll = () => {
    clearFilter();
  };

  // 1. Channel / Phone Options
  const channelOptions = [
    { label: "All Channels", value: "all" },
    ...(waSettings
      ? waSettings.map((account: any) => ({
          label: account.phone,
          value: account.phone,
        }))
      : []),
  ];

  // 2. Status Options (Only on All or Closed tab)
  const isAllTab = selectedTab === "All";
  const isClosedTab = selectedTab === "Closed";

  const statusOptions = Object.values(WaMessageAssignStatus)
    .filter((status) => {
      if (status === WaMessageAssignStatus.NEW) return false;
      if (isClosedTab) {
        return WaMessageClosedStatus.includes(status as any);
      }
      return true;
    })
    .map((status) => {
      const labelsMap: Record<string, string> = {
        UNASSIGNED: "UnAssigned",
        ASSIGNED: "Assigned",
        CLOSED: "Closed",
        RESOLVED: "Resolved",
        UNRESOLVED: "Unresolved",
        SPAM: "Spam",
      };
      return {
        value: status,
        label: labelsMap[status] || status,
      };
    });

  // 3. Team Options
  const teamOptions = teamRes
    ? teamRes.data?.map((team: any) => ({
        value: team?.id,
        label: team?.name,
      }))
    : [];

  // 4. Member Options
  const memberOptions = membersRes
    ? membersRes.data?.map((member: any) => ({
        value: member?.id,
        label: member?.name,
      }))
    : [];

  // 5. Lifecycle Options
  const lifecycleOptions = lifecycles
    ? lifecycles.map((stage: any) => ({
        value: stage?.id,
        label: `${stage?.emoji || ""} ${stage?.name || ""}`.trim(),
      }))
    : [];

  // 6. Label Options
  const labelGroup = filterData?.find((g: any) => g.group === "tags" || g.group === "labels");
  const labelOptions = labelGroup ? labelGroup.values : [];

  const toggleStatus = (statusValue: string) => {
    const current = filter.status || [];
    const updated = current.includes(statusValue)
      ? current.filter((s) => s !== statusValue)
      : [...current, statusValue];

    setFilter({
      ...filter,
      status: updated,
    });
  };

  const toggleTeam = (teamId: string) => {
    const current = filter.assignedTeams || [];
    const updated = current.includes(teamId)
      ? current.filter((id) => id !== teamId)
      : [...current, teamId];

    setFilter({
      ...filter,
      assignedTeams: updated,
    });
  };

  const toggleMember = (memberId: string) => {
    const current = filter.assignedUserIds || [];
    const updated = current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId];

    setFilter({
      ...filter,
      assignedUserIds: updated,
    });
  };

  const toggleLabel = (labelVal: string) => {
    const current = filter.labels || [];
    const updated = current.includes(labelVal)
      ? current.filter((l) => l !== labelVal)
      : [...current, labelVal];

    setFilter({
      ...filter,
      labels: updated,
    });
  };

  const selectLifecycle = (lifecycleId: string) => {
    setFilter({
      ...filter,
      lifecycle: filter.lifecycle === lifecycleId ? "" : lifecycleId,
    });
  };

  const selectChannel = (phoneVal: string) => {
    setFilter({
      ...filter,
      phone: phoneVal,
    });
  };

  return (
    <View style={{ backgroundColor: bgColor }} className="flex-grow flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 justify-between px-4 pt-4">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => router.back()}>
                <ArrowLeft size={24} color={textColor} />
              </Pressable>
              <Text
                className="text-2xl font-bold dark:text-white"
                style={{ fontFamily: "Figtree_800ExtraBold" }}
              >
                Filters
              </Text>
            </View>
            <Pressable
              onPress={handleClearAll}
              className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 rounded-full"
            >
              <Text
                className="text-sm font-semibold text-gray-600 dark:text-gray-300"
                style={{ fontFamily: "InstrumentSans_700Bold" }}
              >
                Reset
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Channels / Phone Number */}
            <View className="mb-6">
              <Text
                className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3"
                style={{ fontFamily: "InstrumentSans_700Bold" }}
              >
                Channel
              </Text>
              {waSettingsLoading ? (
                <Text className="text-gray-400">Loading Channels...</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {channelOptions.map((opt) => {
                    const isSelected =
                      filter.phone === opt.value || (!filter.phone && opt.value === "all");
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => selectChannel(opt.value)}
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? "bg-primaryBlue border-primaryBlue"
                            : "border-gray-200 dark:border-zinc-700 bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? "text-white font-bold" : "text-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            fontFamily: isSelected
                              ? "InstrumentSans_700Bold"
                              : "InstrumentSans_400Regular",
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Status (Only on All or Closed tab) */}
            {(isAllTab || isClosedTab) && (
              <View className="mb-6">
                <Text
                  className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3"
                  style={{ fontFamily: "InstrumentSans_700Bold" }}
                >
                  Status
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {statusOptions.map((opt) => {
                    const isSelected = filter.status?.includes(opt.value);
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => toggleStatus(opt.value)}
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? "bg-primaryBlue border-primaryBlue"
                            : "border-gray-200 dark:border-zinc-700 bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? "text-white font-bold" : "text-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            fontFamily: isSelected
                              ? "InstrumentSans_700Bold"
                              : "InstrumentSans_400Regular",
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Lifecycle Stages */}
            <View className="mb-6">
              <Text
                className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3"
                style={{ fontFamily: "InstrumentSans_700Bold" }}
              >
                Lifecycle
              </Text>
              {lifecyclesLoading ? (
                <Text className="text-gray-400">Loading Lifecycles...</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {lifecycleOptions.map((opt: any) => {
                    const isSelected = filter.lifecycle === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => selectLifecycle(opt.value)}
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? "bg-primaryBlue border-primaryBlue"
                            : "border-gray-200 dark:border-zinc-700 bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? "text-white font-bold" : "text-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            fontFamily: isSelected
                              ? "InstrumentSans_700Bold"
                              : "InstrumentSans_400Regular",
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Label / Tags Filters */}
            <View className="mb-6">
              <Text
                className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3"
                style={{ fontFamily: "InstrumentSans_700Bold" }}
              >
                Labels
              </Text>
              {filterDataLoading ? (
                <Text className="text-gray-400">Loading Labels...</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {labelOptions.map((opt: string) => {
                    const isSelected = filter.labels?.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => toggleLabel(opt)}
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? "bg-primaryBlue border-primaryBlue"
                            : "border-gray-200 dark:border-zinc-700 bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? "text-white font-bold" : "text-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            fontFamily: isSelected
                              ? "InstrumentSans_700Bold"
                              : "InstrumentSans_400Regular",
                          }}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* User Filters */}
            <View className="mb-6">
              <Text
                className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3"
                style={{ fontFamily: "InstrumentSans_700Bold" }}
              >
                Assigned User
              </Text>
              {membersLoading ? (
                <Text className="text-gray-400">Loading Users...</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {memberOptions.map((opt: any) => {
                    const isSelected = filter.assignedUserIds?.includes(opt.value);
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => toggleMember(opt.value)}
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? "bg-primaryBlue border-primaryBlue"
                            : "border-gray-200 dark:border-zinc-700 bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? "text-white font-bold" : "text-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            fontFamily: isSelected
                              ? "InstrumentSans_700Bold"
                              : "InstrumentSans_400Regular",
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Team Filters */}
            <View className="mb-6">
              <Text
                className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3"
                style={{ fontFamily: "InstrumentSans_700Bold" }}
              >
                Assigned Team
              </Text>
              {teamsLoading ? (
                <Text className="text-gray-400">Loading Teams...</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {teamOptions.map((opt: any) => {
                    const isSelected = filter.assignedTeams?.includes(opt.value);
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => toggleTeam(opt.value)}
                        className={`px-4 py-2 rounded-full border ${
                          isSelected
                            ? "bg-primaryBlue border-primaryBlue"
                            : "border-gray-200 dark:border-zinc-700 bg-transparent"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isSelected ? "text-white font-bold" : "text-gray-700 dark:text-gray-300"
                          }`}
                          style={{
                            fontFamily: isSelected
                              ? "InstrumentSans_700Bold"
                              : "InstrumentSans_400Regular",
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <Pressable
            className="bg-primaryBlue rounded-xl py-4 absolute bottom-0 left-4 right-4"
            style={{ marginBottom: insets.bottom + 10 }}
            onPress={() => {
              const index = previousFilterForTab.findIndex((p) => p.tab === selectedTab);
              let updated;
              if (index !== -1) {
                updated = previousFilterForTab.map((p, i) => (i === index ? { ...p, filter } : p));
              } else {
                updated = [...previousFilterForTab, { tab: selectedTab, filter }];
              }
              setPreviousFilterForTab(updated);
              router.back();
            }}
          >
            <Text
              className="text-white text-center font-bold text-lg"
              style={{ fontFamily: "InstrumentSans_700Bold" }}
            >
              Show results
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default FiltersScreen;
