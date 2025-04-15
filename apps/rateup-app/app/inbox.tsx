import { View, Text, ScrollView } from 'react-native'
import React, { useState } from 'react'
import Inbox from '@/src/components/inbox'
import { WaMessageAssignStatus } from '@/src/api/inbox/types'
import SearchBar from '@/src/components/inboxSearchBar'

const inbox = () => {
  const [query,setQuery] = useState("")
  return (
    <View>
      <SearchBar/>
      <Inbox filter={{waMessageAssignStatus:WaMessageAssignStatus.NEW}}/>
    </View>
  )
}

export default inbox