import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const InboxLayout = () => {
  return (
    <Stack screenOptions={
        {headerShown:false}
    }>
        <Stack.Screen
        name='addContact'        
        />
        <Stack.Screen
        name='inboxTabs'        
        />
        <Stack.Screen
        name='filters'        
        />
    </Stack>
  )
}

export default InboxLayout