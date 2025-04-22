import { View, Text } from 'react-native'
import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import ChatHeader from '@/src/components/chatDisplay/ChatHeader'
import ChatFooter from '@/src/components/chatDisplay/ChatFooter'

const ChatDisplay = () => {
    const {id,name, phone, waAssignStatus} = useLocalSearchParams()    
  return (
    <View className='flex justify-between h-full'>
      {/* @ts-ignore */}
      <ChatHeader id={id} name={name} phone={phone}/>
      {/* @ts-ignore */}
      <ChatFooter waAssignStatus={waAssignStatus} id={id}/>
    </View>
  )
}

export default ChatDisplay