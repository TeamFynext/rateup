import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useIsFocused } from "@react-navigation/native";

import { UserCheck, Sparkles, User, CircleCheckBig } from "lucide-react-native";

import { useContactCounts } from "@/src/api/inbox/contacts/contacts.query";
import InboxButtons from "@/src/components/inbox/InboxButtons";
import { useChatFilterStore, useSelectedTabStore } from "@/src/utils/store";
import Inbox from "@/src/components/inbox/inbox";
import SearchBar from "@/src/components/inbox/inboxSearchBar";
import { colors } from "@/src/constants/constants";

const Tab = createMaterialTopTabNavigator();

function TabIcon({
  Icon,
  color,
  focused,
  count,
  label,
}: {
  Icon: any;
  color: string;
  focused: boolean;
  count?: number;
  label: string;
}) {
  return (
    <View
      className="relative px-4 py-1.5 rounded-full flex flex-row items-center gap-1"
      style={{ backgroundColor: focused ? colors["primary-blue"] : colors["gray-100"] }}
    >
      <Icon color={focused? "white" : colors["gray-700"] } size={18} />
      <View className="flex flex-row items-center gap-1">
        <Text
          style={{ color: focused ? "white" : colors["gray-700"] }}
          className="font-semibold text-lg"
        >
          {label}
        </Text>
        {count && count > 0 && (
          <Text style={{ color: focused ? "white" : colors["gray-700"] }} className="font-semibold text-lg">({count})</Text>
        )}
      </View>
    </View>
  );
}

function createTabScreen(
  messageType: string,
  waMessageAssignStatus?:
    | "New"
    | "Assigned"
    | "UnAssigned"
    | "Addressed"
    | "mine",
  searchTerm?: string
) {
  return function Screen() {
    const isFocused = useIsFocused();
    const setSelectedTab = useSelectedTabStore((state) => state.setSelectedTab);
    useEffect(() => {
      if (isFocused) {
        setSelectedTab(waMessageAssignStatus ?? "All");
      }
    }, [isFocused]);
    if (!isFocused) return null;

    return (
      <View className="flex-1 bg-white">
        <Inbox
          messageType={messageType}
          waMessageAssignStatus={waMessageAssignStatus}
          searchTerm={searchTerm}
        />
      </View>
    );
  };
}

export default function InboxLayout() {
  const [searchTerm, setSearchTerm] = useState("");
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="bg-rateUpGreen20 flex-row justify-center items-center p-4">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <InboxButtons activeFilterCount={activeFilterCount} />
        </View>
        <Tab.Navigator
          tabBarPosition="top"
          screenOptions={{
            lazy: true,
            tabBarPressOpacity: 1,
            tabBarPressColor: "transparent",
            tabBarScrollEnabled: true,
            swipeEnabled: true,
            tabBarItemStyle: {
              width: "auto",
            },
            tabBarShowLabel: false,
            tabBarIndicatorStyle: { backgroundColor: "transparent" },
            tabBarLabelStyle: {
              fontWeight: "medium",
              fontSize: 11,
              marginTop: -2,
              textAlign: "center",
            },
            tabBarShowIcon: true,
            tabBarBounces: false,
          }}
        >
          <Tab.Screen
            name="New"
            component={createTabScreen(
              "usermessages",
              "UnAssigned",
              searchTerm
            )}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={Sparkles}
                  color={color}
                  focused={focused}
                  count={contactCounts.new}
                  label="New"
                />
              ),
            }}
          />
          <Tab.Screen
            name="Assigned"
            component={createTabScreen("usermessages", "Assigned", searchTerm)}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={UserCheck}
                  color={color}
                  focused={focused}
                  count={contactCounts.assigned}
                  label="Assigned"
                />
              ),
            }}
          />
          <Tab.Screen
            name="Assigned To Me"
            component={createTabScreen("all", "mine", searchTerm)}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={User}
                  color={color}
                  focused={focused}
                  count={contactCounts.assignedToMe}
                  label="Mine"
                />
              ),
            }}
          />
          <Tab.Screen
            name="Closed"
            component={createTabScreen("usermessages", "Addressed", searchTerm)}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={CircleCheckBig}
                  color={color}
                  focused={focused}
                  label="Closed"
                />
              ),
            }}
          />
        </Tab.Navigator>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
