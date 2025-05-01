import React, { useState } from "react";
import { View, Text } from "react-native";
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

import { useContactCounts } from "@/src/api/inbox/contacts.query";

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
            className={
              focused
                ? "text-white text-[12px] font-bold"
                : "text-white text-[10px] font-bold"
            }
          >
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

// Create a generic tab screen
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
    if (!isFocused) return null;

    return (
      <View className="h-full bg-white">
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
    refetch,
  } = useContactCounts();

  return (
    <View className="flex-1 flex-col">
      <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

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
            width: 85,
          },
          tabBarIndicatorStyle: { backgroundColor: "transparent" },
          tabBarLabelStyle: { fontWeight: "500", fontSize: 12, margin: -3 },
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
          component={createTabScreen("usermessages", "UnAssigned", searchTerm)}
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
    </View>
  );
}
