import React from "react";
import { View, Text } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import SearchBar from "@/src/components/inboxSearchBar";
import Inbox from "@/src/components/inbox";
import { WaMessageAssignStatus } from "@/src/api/inbox/types";
import { FullWindowOverlay } from "react-native-screens";

const Tab = createMaterialTopTabNavigator();

function New() {
  return (
    <View className="h-full bg-white">
      <Inbox filter={{waMessageAssignStatus:WaMessageAssignStatus.NEW}}/>
    </View>
  );
}

function Assigned() {
  return (
    <View className="h-full bg-white">
      <Inbox filter={{waMessageAssignStatus:WaMessageAssignStatus.ASSIGNED}}/>
    </View>
  );
}

function UnAssigned() {
  return (
    <View className="h-full bg-white">
      <Inbox filter={{waMessageAssignStatus:WaMessageAssignStatus.UNASSIGNED}}/>
    </View>
  );
}

function Closed() {
  return (
    <View className="h-full bg-white">
      <Inbox filter={{waMessageAssignStatus:WaMessageAssignStatus.CLOSED}}/>
    </View>
  );
}

export default function InboxLayout() {
  return (
    <View className="flex-1">
      <SearchBar />

      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: false,
          tabBarActiveTintColor:"#009987",
          tabBarInactiveTintColor:"#000",
          tabBarIndicatorStyle: { backgroundColor: "#000" },
          tabBarLabelStyle: { fontWeight: "bold"},
          tabBarStyle:{
            backgroundColor:"#EBF7F5",
          },
          tabBarItemStyle:{
            
          }
        }}
      >
        <Tab.Screen name="New" component={New} />
        <Tab.Screen name="Assigned" component={Assigned} />
        <Tab.Screen name="UnAssigned" component={UnAssigned} />
        <Tab.Screen name="Closed" component={Closed} />
      </Tab.Navigator>
    </View>
  );
}
