import { View, Text } from 'react-native'
import React from 'react'
import AddContactScreen from '@/src/components/inbox/AddContacts'
import { useAuth } from '@/src/context/AuthContext'

const addContact = () => {
  const {userId} = useAuth()
  console.log("USERID FROM ADD CONTACTS:",userId)
  return (
    <View>
      <AddContactScreen/>
    </View>
  )
}

export default addContact