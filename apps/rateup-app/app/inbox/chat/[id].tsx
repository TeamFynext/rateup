import { View } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import ChatHeader from "@/src/components/chatDisplay/ChatHeader";
import ChatFooter from "@/src/components/chatDisplay/ChatFooter";
import ChatBody from "@/src/components/chatDisplay/ChatBody";
import { useMarkMessageAsRead } from "@/src/api/inbox/contacts/contacts.query";
import { useChatAssignStatusStore } from "@/src/utils/store";

const ChatDisplay = () => {
  const {
    id,
    name,
    phone,
    waAssignStatus: initialStatus,
  } = useLocalSearchParams();

  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus
  );

  const { mutate: markRead } = useMarkMessageAsRead();

  useEffect(() => {
    if (id) {
      //@ts-ignore
      markRead(id);
      //@ts-ignore
      setWaAssignStatus(initialStatus);
    }
  }, [id]);

  return (
    <View className="flex justify-between h-full">
      {/* @ts-ignore */}
      <ChatHeader id={id} name={name} phone={phone} />

      {/* @ts-ignore */}
      <ChatBody id={id} />

      {/* @ts-ignore */}
      <ChatFooter id={id} />
    </View>
  );
};

export default ChatDisplay;
