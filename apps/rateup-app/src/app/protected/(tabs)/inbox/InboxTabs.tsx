import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  Pressable,
  ScrollView,
} from "react-native";
import {
  Sparkles,
  CircleCheckBig,
  InboxIcon,
} from "lucide-react-native";
import { useContactCounts } from "@/api/inbox/contacts/contacts.query";
import InboxButtons from "@/components/inbox/InboxButtons";
import { useChatFilterStore, useSelectedTabStore } from "@/utils/store";
import Inbox from "@/components/inbox/inbox";
import SearchBar from "@/components/inbox/inboxSearchBar";
import RefreshButton from "@/components/inbox/RefreshButton";
import { useInboxCountStore } from "@/store/inboxCountStore";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type IconType = React.ComponentType<any>;

function TabIcon({
  Icon,
  focused,
  count,
  label,
}: Readonly<{
  Icon: IconType;
  focused: boolean;
  count?: number;
  label: string;
}>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const backgroundColor = focused
    ? isDark
      ? "#fff"
      : Colors.brand.blue
    : isDark
      ? "transparent"
      : "#fff";

  const textColor = focused
    ? isDark
      ? Colors.brand.blue
      : "#fff"
    : isDark
      ? Colors.dark.pillText
      : Colors.light.pillText;

  const borderWidth = focused ? 0 : 1;
  const borderColor = isDark
    ? Colors.dark.pillBorder
    : Colors.light.border;

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderWidth,
        borderColor,
        alignSelf: "stretch",
      }}
    >
      <Icon color={textColor} size={15} />
      <Text
        style={{
          fontSize: 13,
          fontFamily: focused ? "Nunito_700Bold" : "Nunito_400Regular",
          color: textColor,
        }}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text
          style={
            focused
              ? {
                backgroundColor: isDark
                  ? Colors.brand.blue
                  : "rgba(255,255,255,0.22)",
                color: isDark ? "#fff" : "#fff",
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 1,
                fontSize: 10,
                fontFamily: "Nunito_700Bold",
                lineHeight: 16,
                overflow: "hidden",
              }
              : {
                paddingHorizontal: 7,
                paddingVertical: 1,
                fontSize: 12,
                fontFamily: "Nunito_400Regular",
                color: isDark
                  ? Colors.dark.textMuted
                  : Colors.light.textMuted,
              }
          }
        >
          {count}
        </Text>
      )}
    </View>
  );
}

export default function InboxLayout() {
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedTab, setSelectedTab } = useSelectedTabStore();
  const activeTab = selectedTab as "Open" | "Closed" | "All";
  const setActiveTab = (tab: "Open" | "Closed" | "All") => setSelectedTab(tab);

  const { userId } = useAuth();
  const setFilter = useChatFilterStore((state) => state.setFilter);
  const filterFromStore = useChatFilterStore((state) => state.filter);
  const isMine = !!(userId && filterFromStore.assignedUserIds && filterFromStore.assignedUserIds.includes(userId));

  const renderInboxContent = () => {
    switch (activeTab) {
      case "Open":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus={undefined}
            searchTerm={searchTerm}
            statusOverride={filterFromStore.status && filterFromStore.status.length > 0 ? filterFromStore.status : ["ASSIGNED", "UNASSIGNED"]}
          />
        );

      case "Closed":
        return (
          <Inbox
            messageType="all"
            waMessageAssignStatus="Addressed"
            searchTerm={searchTerm}
          />
        );

      case "All":
        return (
          <Inbox
            messageType="all"
            waMessageAssignStatus={null}
            searchTerm={searchTerm}
          />
        );

      default:
        return null;
    }
  };

  const { data: contactCountsData, isLoading: isContactCountsLoading } = useContactCounts();
  const setCounts = useInboxCountStore((state) => state.setCounts);
  const contactCounts = useInboxCountStore((state) => state.counts);

  useEffect(() => {
    if (contactCountsData) {
      setCounts({
        openCount: (contactCountsData.assigned || 0) + (contactCountsData.unassigned || 0),
        closedCount: contactCountsData.closed || 0,
        allCount: contactCountsData.total || contactCountsData.all || 0,
        newCount: contactCountsData.new || 0,
      });
    }
  }, [contactCountsData, setCounts]);

  const activeFilterCount =
    ((filterFromStore.status && filterFromStore.status.length > 0) ? 1 : 0) +
    ((filterFromStore.assignedTeams && filterFromStore.assignedTeams.length > 0) ? 1 : 0) +
    ((filterFromStore.assignedUserIds && filterFromStore.assignedUserIds.length > 0) ? 1 : 0) +
    ((filterFromStore.labels && filterFromStore.labels.length > 0) ? 1 : 0) +
    (filterFromStore.lifecycle ? 1 : 0) +
    ((filterFromStore.phone && filterFromStore.phone !== "all") ? 1 : 0);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const listBgColor = isDark ? Colors.dark.bg : Colors.light.bg;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
      }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: Colors.brand.blue,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "Nunito_800ExtraBold",
                fontSize: 23,
                color: "#fff",
                lineHeight: 25,
                letterSpacing: -0.5,
              }}
            >
              Inbox
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: isDark
                  ? "rgba(255,255,255,0.68)"
                  : "rgba(255,255,255,0.72)",
                marginTop: 2,
              }}
            >
              {contactCounts.newCount} {contactCounts.newCount === 1 ? "conversation needs" : "conversations need"} attention
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <RefreshButton />
            <InboxButtons activeFilterCount={activeFilterCount} />
          </View>
        </View>

        {/* Tab Filters */}
        <View
          style={{
            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              gap: 8,
            }}
          >
            <Pressable onPress={() => setActiveTab("Open")} style={{ flex: 1 }}>
              <TabIcon
                Icon={Sparkles}
                focused={activeTab === "Open"}
                label="Open"
                count={contactCounts.openCount}
              />
            </Pressable>

            {activeTab === "Open" && (
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "#27272a" : "#f3f4f6",
                  padding: 2,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isDark ? "#3f3f46" : "#e5e7eb",
                }}
              >
                <Pressable
                  onPress={() => setFilter({ ...filterFromStore, assignedUserIds: [] })}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: !isMine ? (isDark ? "#3f3f46" : "#fff") : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Nunito_700Bold",
                      color: !isMine
                        ? (isDark ? "#fff" : "#111827")
                        : (isDark ? "#a1a1aa" : "#6b7280"),
                    }}
                  >
                    Everyone
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (userId) {
                      setFilter({ ...filterFromStore, assignedUserIds: [userId] });
                    }
                  }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: isMine ? (isDark ? "#3f3f46" : "#fff") : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Nunito_700Bold",
                      color: isMine
                        ? (isDark ? "#fff" : "#111827")
                        : (isDark ? "#a1a1aa" : "#6b7280"),
                    }}
                  >
                    Mine
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable onPress={() => setActiveTab("Closed")} style={{ flex: 1 }}>
              <TabIcon
                Icon={CircleCheckBig}
                focused={activeTab === "Closed"}
                label="Closed"
                count={contactCounts.closedCount}
              />
            </Pressable>

            <Pressable onPress={() => setActiveTab("All")} style={{ flex: 1 }}>
              <TabIcon
                Icon={InboxIcon}
                focused={activeTab === "All"}
                label="All"
                count={contactCounts.allCount}
              />
            </Pressable>
          </ScrollView>
        </View>

        <View className="flex-1" style={{ backgroundColor: listBgColor }}>
          <InboxContentWrapper
            activeTab={activeTab}
            searchTerm={searchTerm}
            renderInboxContent={renderInboxContent}
            isDark={isDark}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Wrapper to prevent re-rendering list background layout issues
const InboxContentWrapper = React.memo(function InboxContentWrapper({
  renderInboxContent,
  isDark,
}: {
  activeTab: string;
  searchTerm: string;
  renderInboxContent: () => React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }}>
      {renderInboxContent()}
    </View>
  );
});
