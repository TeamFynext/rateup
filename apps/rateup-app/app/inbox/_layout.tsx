import { View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const InboxLayout = () => {
  return (
    <Stack screenOptions={
        {headerShown:false}
    }>
        <Stack.Screen
        name='AddContact'        
        />
        <Stack.Screen
        name='InboxTabs'        
        />
        <Stack.Screen
        name='Filters'        
        />
    </Stack>
  )
}

export default InboxLayout