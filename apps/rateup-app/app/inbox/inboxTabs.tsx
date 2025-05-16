import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import SearchBar from "@/src/components/inbox/InboxSearchBar";
import Inbox from "@/src/components/inbox/Inbox";
import { useIsFocused } from "@react-navigation/native";

import {
  MessageSquareText,
  UserX,
  UserCheck,
  CircleUser,
  MessageSquareOff,
  MessageSquareMore,
} from "lucide-react-native";

import { useContactCounts } from "@/src/api/inbox/contacts/contacts.query";
import InboxButtons from "@/src/components/inbox/InboxButtons";
import { useSelectedTabStore } from "@/src/utils/store";

const Tab = createMaterialTopTabNavigator();

function TabIcon({
  Icon,
  color,
  focused,
  count,
}: {
  Icon: any;
  color: string;
  focused: boolean;
  count: number;
}) {
  return (
    <View
      className="relative p-1.5 rounded-full"
      style={{ backgroundColor: focused ? "#00993333" : "transparent" }}
    >
      <Icon color={color} size={25} />
      {count > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] justify-center items-center px-1">
          <Text
            className={`text-white font-bold ${
              focused ? "text-[12px]" : "text-[10px]"
            }`}
          >
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

function createTabScreen(
  messageType: string,
  waMessageAssignStatus?:
    | "New"
    | "Assigned"
    | "UnAssigned"
    | "Closed"
    | "AssignedToMe",
  searchTerm?: string
) {
  return function Screen() {
    const isFocused = useIsFocused();
      const setSelectedTab = useSelectedTabStore((state) => state.setSelectedTab);
      useEffect(() => {
      if (isFocused) {
        setSelectedTab(waMessageAssignStatus ?? "All")
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="bg-rateUpGreen20 flex-row justify-center items-center p-4">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <InboxButtons />
        </View>

        <Tab.Navigator
          tabBarPosition="top"
          screenOptions={{
            lazy: true,
            tabBarPressOpacity: 1,
            tabBarPressColor: "transparent",
            tabBarScrollEnabled: true,
            tabBarActiveTintColor: "#009987",
            tabBarInactiveTintColor: "#000",
            tabBarItemStyle: {
              width: "auto",
            },
            tabBarIndicatorStyle: { backgroundColor: "transparent" },
            tabBarLabelStyle: {
              fontWeight: "medium",
              fontSize: 11,
              marginTop: -2,
              textAlign: "center",
            },
            tabBarStyle: {
              backgroundColor: "#EBF7F5",
            },
            tabBarShowIcon: true,
            tabBarBounces: false,
          }}
        >
          <Tab.Screen
            name="New"
            component={createTabScreen("usermessages", "New", searchTerm)}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={MessageSquareText}
                  color={color}
                  focused={focused}
                  count={contactCounts.new}
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
                />
              ),
            }}
          />
          <Tab.Screen
            name="UnAssigned"
            component={createTabScreen(
              "usermessages",
              "UnAssigned",
              searchTerm
            )}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={UserX}
                  color={color}
                  focused={focused}
                  count={contactCounts.unassigned}
                />
              ),
            }}
          />
          <Tab.Screen
            name="Closed"
            component={createTabScreen("usermessages", "Closed", searchTerm)}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={MessageSquareOff}
                  color={color}
                  focused={focused}
                  count={contactCounts.closed}
                />
              ),
            }}
          />
          <Tab.Screen
            name="Assigned To Me"
            component={createTabScreen(
              "usermessages",
              "AssignedToMe",
              searchTerm
            )}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={CircleUser}
                  color={color}
                  focused={focused}
                  count={contactCounts.assignedToMe}
                />
              ),
            }}
          />
          <Tab.Screen
            name="All"
            component={createTabScreen("all", undefined, searchTerm)}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  Icon={MessageSquareMore}
                  color={color}
                  focused={focused}
                  count={contactCounts.all}
                />
              ),
            }}
          />
        </Tab.Navigator>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
