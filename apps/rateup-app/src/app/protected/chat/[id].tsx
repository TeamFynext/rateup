import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform, View, useColorScheme } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ChatHeader from "@/components/chatDisplay/ChatHeader";
import ChatFooter from "@/components/chatDisplay/ChatFooter";
import ChatBody from "@/components/chatDisplay/ChatBody";
import {
  useChatAssignStatusStore,
  useContactIdStore,
  useSessionActiveStore,
} from "@/utils/store";
import { Colors } from "@/constants/colors";

const ChatDisplay = () => {
  const params = useLocalSearchParams();

  // Normalize parameters from useLocalSearchParams (which are typed as string | string[] | undefined)
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const name = Array.isArray(params.name) ? params.name[0] : params.name || "";
  const phone = Number(Array.isArray(params.phone) ? params.phone[0] : params.phone || 0);
  const initialStatus = Array.isArray(params.waAssignStatus) ? params.waAssignStatus[0] : params.waAssignStatus || "";
  const lastReceivedMessageTimeStamp = Array.isArray(params.lastReceivedMessageTimeStamp) ? params.lastReceivedMessageTimeStamp[0] : params.lastReceivedMessageTimeStamp || "";
  const sessionActive = (Array.isArray(params.sessionActive) ? params.sessionActive[0] : params.sessionActive) === "true";

  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus,
  );

  const setSelectedContactId = useContactIdStore(
    (state) => state.setSelectedContactId,
  );

  const setIsSessionActive = useSessionActiveStore(
    (state) => state.setIsSessionActive,
  );

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Set contactId and session state immediately
  useEffect(() => {
    setSelectedContactId(id);
    setIsSessionActive(sessionActive);
  }, [id, sessionActive]);

  useEffect(() => {
    if (id) {
      setWaAssignStatus(initialStatus);
    }
  }, [id, initialStatus]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
      }}
    >
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
