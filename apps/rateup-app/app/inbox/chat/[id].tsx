import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import { useLocalSearchParams } from 'expo-router'
import ChatHeader from '@/src/components/chatDisplay/ChatHeader'
import ChatFooter from '@/src/components/chatDisplay/ChatFooter'
import ChatBody from '@/src/components/chatDisplay/ChatBody'
import { markMessageAsRead } from '@/src/api/inbox/contacts'

const ChatDisplay = () => {
    const {id,name, phone, waAssignStatus} = useLocalSearchParams();

    useEffect(() => {
      async function MarkRead(){
        try{
          //@ts-ignore
          await markMessageAsRead(id)
        }catch(err){
          console.log(err)
        }
      }

      MarkRead()
    },[id])

  return (
    <View className='flex justify-between h-full'>
      {/* @ts-ignore */}
      <ChatHeader id={id} name={name} phone={phone}/>

      {/* @ts-ignore */}
      <ChatBody id={id}/>

      {/* @ts-ignore */}
      <ChatFooter waAssignStatus={waAssignStatus} id={id}/>
    </View>
  )
}

export default ChatDisplay