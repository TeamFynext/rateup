import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useIsFocused } from "@react-navigation/native";
import {
  UserCheck,
  Sparkles,
  User,
  CircleCheckBig,
  Menu,
} from "lucide-react-native";
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
      <Icon color={textColor} size={18} />
      <View className="flex flex-row items-center gap-1">
        <Text style={{ color: textColor }} className="font-semibold text-lg">
          {label}
        </Text>
        {count && count > 0 && (
          <Text style={{ color: textColor }} className="font-semibold text-lg">
            ({count})
          </Text>
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
      <View className="flex-1 bg-white dark:bg-slate-950">
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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const tabBg = isDark ? colors["slate-950"] : "white";
  
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row px-4 bg-primaryBlue py-6 justify-between">
          <View className="flex-row items-start justify-center gap-2">
            <Menu color="white" strokeWidth={2} size={25} />
            <View>
              <Text className="text-white text-xl font-bold">Inbox</Text>
              <Text className="text-white text-sm">You may have messages.</Text>
            </View>
          </View>
          {/* <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} /> */}
          <InboxButtons activeFilterCount={activeFilterCount} />
        </View>
        <Tab.Navigator
          tabBarPosition="top"
          screenOptions={{
            sceneStyle: {
              backgroundColor: isDark ? colors["slate-950"] : "white",
            },
            lazy: true,
            tabBarPressOpacity: 1,
            tabBarPressColor: "transparent",
            tabBarScrollEnabled: true,
            swipeEnabled: true,
            tabBarStyle: {
              backgroundColor: isDark ? colors["slate-950"] : "white",
            },
            tabBarItemStyle: {
              backgroundColor: tabBg,
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
              tabBarStyle: {
                backgroundColor: isDark ? colors["slate-950"] : "white",
              },
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
              tabBarStyle: {
                backgroundColor: isDark ? colors["slate-950"] : "white",
              },
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
              tabBarStyle: {
                backgroundColor: isDark ? colors["slate-950"] : "white",
              },
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
              tabBarStyle: {
                backgroundColor: isDark ? colors["slate-950"] : "white",
              },
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
