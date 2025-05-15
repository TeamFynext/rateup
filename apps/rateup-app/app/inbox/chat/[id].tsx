import { View } from "react-native";
import React, { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import ChatHeader from "@/src/components/chatDisplay/ChatHeader";
import ChatFooter from "@/src/components/chatDisplay/ChatFooter";
import ChatBody from "@/src/components/chatDisplay/ChatBody";
import { useChatAssignStatusStore, useContactIdStore, useSessionActiveStore } from "@/src/utils/store";

const ChatDisplay = () => {
  const {
    id,
    name,
    phone,
    waAssignStatus: initialStatus,
    lastReceivedMessageTimeStamp,
    sessionActive
  } = useLocalSearchParams();
  
  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus
  );
  console.log(sessionActive);

  const setSelectedContactId = useContactIdStore(
    (contactId) => contactId.setSelectedContactId
  );

  const setIsSessionActive = useSessionActiveStore(
    (session) => session.setIsSessionActive
  )
  //@ts-ignore
  setSelectedContactId(id);
  //@ts-ignore
  setIsSessionActive(sessionActive)

  useEffect(() => {
    if (id) {
      //@ts-ignore
      setWaAssignStatus(initialStatus);
    }
  }, [id]);

  return (
    <View className="flex justify-between h-full">
      {/* @ts-ignore */}
      <ChatHeader id={id} name={name} phone={phone} lastReceivedMessageTimeStamp={lastReceivedMessageTimeStamp} />
      
      {/* @ts-ignore */}
      <ChatBody id={id} />

      {/* @ts-ignore */}
      <ChatFooter id={id}/>
    </View>
  );
};

export default ChatDisplay;
