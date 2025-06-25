import { View, Text } from 'react-native'
import React from 'react'
import { useLocalSearchParams } from 'expo-router'

const FlowResponseById = () => {
    const {flowresponse} = useLocalSearchParams();
    console.log(flowresponse);
  return (
    <View>
      <Text>FlowResponseById</Text>
    </View>
  )
}

export default FlowResponseById