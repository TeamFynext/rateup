import { Tabs } from "expo-router";


export default function InboxTabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="all" options={{ title: "All" }} />
      <Tabs.Screen name="new" options={{ title: "New" }} />
      <Tabs.Screen name="assigned" options={{ title: "Assigned" }} />
      <Tabs.Screen name="unassigned" options={{ title: "Unassigned" }} />
      <Tabs.Screen name="assignedToMe" options={{ title: "Assigned To Me" }} />
      <Tabs.Screen name="closed" options={{ title: "Closed" }} />
    </Tabs>
  );
}
