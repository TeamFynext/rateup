import { Tabs } from "expo-router";

export default function InboxLayout(){
    return (
        <Tabs
        screenOptions={{
            headerShown:false
        }}>
            <Tabs.Screen 
            name="New"
            />
            <Tabs.Screen 
            name="Assigned"
            />
            <Tabs.Screen 
            name="UnAssigned"
            />
            <Tabs.Screen 
            name="Closed"
            />
        </Tabs>
    )
}