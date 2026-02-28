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
import {
  UserCheck,
  Sparkles,
  User,
  CircleCheckBig,
  InboxIcon,
} from "lucide-react-native";
import { useContactCounts } from "@/src/api/inbox/contacts/contacts.query";
import InboxButtons from "@/src/components/inbox/InboxButtons";
import { useChatFilterStore } from "@/src/utils/store";
import Inbox from "@/src/components/inbox/inbox";
import SearchBar from "@/src/components/inbox/inboxSearchBar";
import { colors } from "@/src/constants/constants";

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
    ? colors["primary-blue"]
    : isDark
      ? colors["gray-900"]
      : colors["gray-100"];
  const textColor = focused ? "white" : isDark ? "white" : colors["gray-700"];
  return (
    <View
      className="relative px-4 py-1.5 rounded-full flex flex-row items-center gap-1"
      style={{ backgroundColor }}
    >
      <Icon color={textColor} size={16} />
      <View className="flex flex-row items-center gap-1">
        <Text style={{ color: textColor }} className="font-semibold text-sm">
          {label}
        </Text>
        <Text style={{ color: textColor }} className="font-semibold text-sm">
          {count && count > 0 && `(${count})`}
        </Text>
      </View>
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
  const tabBg = isDark ? colors["slate-950"] : "white";

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row px-4 bg-primaryBlue py-6 justify-between">
          <View className="flex-row items-start justify-center gap-2">
            <View>
              <Text className="text-white text-xl font-bold">Inbox</Text>
              <Text className="text-white text-sm">
                You have {contactCounts.new} new chats.
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <InboxButtons activeFilterCount={activeFilterCount} />
          </View>
        </View>
        <View style={{ height: 48 }}>
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
        <View className="flex-1">{renderInboxContent()}</View>
      </KeyboardAvoidingView>
    </View>
  );
}
