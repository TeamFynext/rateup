import React from "react";
import { View } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import SearchBar from "@/src/components/inboxSearchBar";
import Inbox from "@/src/components/inbox";
import { useIsFocused } from "@react-navigation/native";

// Icons
import { MessageSquareText, UserX, UserCheck, CircleUser, MessageSquareOff, MessageSquareMore } from 'lucide-react-native';

const Tab = createMaterialTopTabNavigator();

// Common wrapper to add background when focused
function TabIcon({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) {
  return (
    <View
      style={{
        padding:6,
        borderRadius: 20,
        backgroundColor: focused ? "#00993333" : "transparent",
      }}
    >
      <Icon color={color} size={25} />
    </View>
  );
}

// Create a generic tab screen
function createTabScreen(messageType: string, waMessageAssignStatus?: "New" | "Assigned" | "UnAssigned" | "Closed" | "AssignedToMe") {
  return function Screen() {
    const isFocused = useIsFocused();
    if (!isFocused) return null;

    return (
      <View className="h-full bg-white">
        <Inbox messageType={messageType} waMessageAssignStatus={waMessageAssignStatus} />
      </View>
    );
  };
}

export default function InboxLayout() {
  return (
    <View className="flex-1 flex-col">
      <SearchBar />

      <Tab.Navigator
      tabBarPosition="top"
        screenOptions={{
          lazy: true,
          tabBarScrollEnabled: true,
          tabBarActiveTintColor: "#009987",
          tabBarInactiveTintColor: "#000",
          tabBarItemStyle: {
            width: 85
          },    
          tabBarIndicatorStyle: { backgroundColor: "transparent" },
          tabBarLabelStyle: { fontWeight: "500", fontSize: 12 ,margin:-3},
          tabBarStyle: {
            backgroundColor: "#EBF7F5",
          },
          tabBarShowIcon: true,
          tabBarBounces: true,
        }}
      >
        <Tab.Screen 
          name="New" 
          component={createTabScreen("usermessages", "New")}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={MessageSquareText} color={color} focused={focused} />
            ),
          }}
        />
        <Tab.Screen 
          name="Assigned" 
          component={createTabScreen("usermessages", "Assigned")}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={UserCheck} color={color} focused={focused} />
            ),
          }}
        />
        <Tab.Screen 
          name="UnAssigned" 
          component={createTabScreen("usermessages", "UnAssigned")}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={UserX} color={color} focused={focused} />
            ),
          }}
        />
        <Tab.Screen 
          name="Closed" 
          component={createTabScreen("usermessages", "Closed")}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={MessageSquareOff} color={color} focused={focused} />
            ),
          }}
        />
        <Tab.Screen 
          name="Assigned To Me" 
          component={createTabScreen("usermessages", "AssignedToMe")}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={CircleUser} color={color} focused={focused} />
            ),
          }}
        />
        <Tab.Screen 
          name="All" 
          component={createTabScreen("all")}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={MessageSquareMore} color={color} focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}
