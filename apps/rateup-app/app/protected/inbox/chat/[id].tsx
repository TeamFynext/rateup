import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ChatHeader from "@/src/components/chatDisplay/ChatHeader";
import ChatFooter from "@/src/components/chatDisplay/ChatFooter";
import ChatBody from "@/src/components/chatDisplay/ChatBody";
import {
  useChatAssignStatusStore,
  useContactIdStore,
  useSessionActiveStore,
} from "@/src/utils/store";
import { SafeAreaView } from "react-native-safe-area-context";

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
    (state) => state.setWaAssignStatus
  );

  const setSelectedContactId = useContactIdStore(
    (state) => state.setSelectedContactId
  );

  const setIsSessionActive = useSessionActiveStore(
    (state) => state.setIsSessionActive
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // adjust offset if needed
        style={{ flex: 1 }}
      >
        {/* @ts-ignore */}
        <ChatHeader id={id} name={name} phone={phone}
          lastReceivedMessageTimeStamp={lastReceivedMessageTimeStamp}
        />

        {/* @ts-ignore */}
        <ChatBody id={id} />

        {/* @ts-ignore */}
        <ChatFooter id={id} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatDisplay;
