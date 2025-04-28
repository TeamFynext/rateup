import { View, Text } from 'react-native'
import React from 'react'
import AddContactScreen from '@/src/components/inbox/AddContacts'
import { useAuth } from '@/src/context/AuthContext'

const addContact = () => {
  return (
      <AddContactScreen/>
  )
}

export default addContact