import { View } from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import ChatHeader from "@/src/components/chatDisplay/ChatHeader";
import ChatFooter from "@/src/components/chatDisplay/ChatFooter";
import ChatBody from "@/src/components/chatDisplay/ChatBody";
import { useMarkMessageAsRead } from "@/src/api/inbox/contacts.query";

const ChatDisplay = () => {
  const {
    id,
    name,
    phone,
    waAssignStatus: initialStatus,
  } = useLocalSearchParams();
  const [assignStatus, setAssignStatus] = useState(initialStatus);

  const { mutate: markRead } = useMarkMessageAsRead();

  useEffect(() => {
    if (id) {
      //@ts-ignore
      markRead(id);
    }
  }, [id]);

  return (
    <View className="flex justify-between h-full">
      {/* @ts-ignore */}
      <ChatHeader id={id} name={name} phone={phone} />

      {/* @ts-ignore */}
      <ChatBody id={id} />

      <ChatFooter
        // @ts-ignore
        waAssignStatus={assignStatus}
        //@ts-ignore
        setWaAssignStatus={setAssignStatus}
        //@ts-ignore
        id={id}
      />
    </View>
  );
};

export default ChatDisplay;
