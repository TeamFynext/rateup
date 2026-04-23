import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ChatHeader from "@/components/chatDisplay/ChatHeader";
import ChatFooter from "@/components/chatDisplay/ChatFooter";
import ChatBody from "@/components/chatDisplay/ChatBody";
import {
  useChatAssignStatusStore,
  useContactIdStore,
  useSessionActiveStore,
} from "@/utils/store";

const ChatDisplay = () => {
  const {
    id,
    name,
    phone,
    waAssignStatus: initialStatus,
    lastReceivedMessageTimeStamp,
    sessionActive,
  } = useLocalSearchParams();

  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus,
  );

  const setSelectedContactId = useContactIdStore(
    (state) => state.setSelectedContactId,
  );

  const setIsSessionActive = useSessionActiveStore(
    (state) => state.setIsSessionActive,
  );

  // Set contactId and session state immediately
  useEffect(() => {
    //@ts-ignore
    setSelectedContactId(id);
    //@ts-ignore
    setIsSessionActive(sessionActive);
  }, [id, sessionActive]);

  useEffect(() => {
    if (id) {
      //@ts-ignore
      setWaAssignStatus(initialStatus);
    }
  }, [id]);

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={{ flex: 1 }}
      >
        <ChatHeader
          id={id}
          name={name}
          phone={phone}
          lastReceivedMessageTimeStamp={lastReceivedMessageTimeStamp}
        />

        <ChatBody id={id} />

        <ChatFooter id={id} />
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatDisplay;
