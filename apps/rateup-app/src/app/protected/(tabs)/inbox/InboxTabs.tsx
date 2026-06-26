import React, { useState } from "react";
import {
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  UserCheck,
  Sparkles,
  User,
  CircleCheckBig,
  InboxIcon,
} from "lucide-react-native";
import { useContactCounts } from "@/api/inbox/contacts/contacts.query";
import InboxButtons from "@/components/inbox/InboxButtons";
import { useChatFilterStore } from "@/utils/store";
import Inbox from "@/components/inbox/inbox";
import SearchBar from "@/components/inbox/inboxSearchBar";
import RefreshButton from "@/components/inbox/RefreshButton";
import { Colors } from "@/constants/colors";

type IconType = React.ComponentType<any>;

function TabIcon({
  Icon,
  focused,
  count,
  label,
}: {
  Icon: IconType;
  focused: boolean;
  count?: number;
  label: string;
}) {
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
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth,
        borderColor,
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
      {count !== undefined && count > 0 && (
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
  const [activeTab, setActiveTab] = useState<
    "New" | "Assigned" | "Mine" | "Closed" | "All"
  >("New");

  const renderInboxContent = () => {
    switch (activeTab) {
      case "New":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus="UnAssigned"
            searchTerm={searchTerm}
          />
        );

      case "Assigned":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus="Assigned"
            searchTerm={searchTerm}
          />
        );

      case "Mine":
        return (
          <Inbox
            messageType="all"
            waMessageAssignStatus="mine"
            searchTerm={searchTerm}
          />
        );

      case "Closed":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus="Addressed"
            searchTerm={searchTerm}
          />
        );

      case "All":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus={null}
            searchTerm={searchTerm}
          />
        );

      default:
        return null;
    }
  };

  const {
    data: contactCounts = {
      all: 0,
      assigned: 0,
      assignedToMe: 0,
      closed: 0,
      new: 0,
      sent: 0,
      unassigned: 0,
    },
  } = useContactCounts();

  const filterFromStore = useChatFilterStore((state) => state.filter);
  const activeFilterCount =
    (filterFromStore.campaigns.length > 0 ? 1 : 0) +
    (filterFromStore.contactGroups.length > 0 ? 1 : 0) +
    (filterFromStore.tags.length > 0 ? 1 : 0);

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
              {contactCounts.new} {contactCounts.new === 1 ? "conversation needs" : "conversations need"} attention
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
              paddingHorizontal: 16,
              alignItems: "center",
              gap: 8,
            }}
          >
            <Pressable onPress={() => setActiveTab("New")}>
              <TabIcon
                Icon={Sparkles}
                focused={activeTab === "New"}
                label="New"
                count={contactCounts.unassigned}
              />
            </Pressable>

            <Pressable onPress={() => setActiveTab("Assigned")}>
              <TabIcon
                Icon={UserCheck}
                focused={activeTab === "Assigned"}
                label="Assigned"
                count={contactCounts.assigned}
              />
            </Pressable>

            <Pressable onPress={() => setActiveTab("Mine")}>
              <TabIcon
                Icon={User}
                focused={activeTab === "Mine"}
                label="Mine"
                count={contactCounts.assignedToMe}
              />
            </Pressable>

            <Pressable onPress={() => setActiveTab("Closed")}>
              <TabIcon
                Icon={CircleCheckBig}
                focused={activeTab === "Closed"}
                label="Closed"
              />
            </Pressable>

            <Pressable onPress={() => setActiveTab("All")}>
              <TabIcon
                Icon={InboxIcon}
                focused={activeTab === "All"}
                label="All"
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
