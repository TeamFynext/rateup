import React, { useEffect } from "react";
import { Platform, View, useColorScheme } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useLocalSearchParams } from "expo-router";
import ChatHeader from "@/components/chatDisplay/ChatHeader";
import ChatFooter from "@/components/chatDisplay/ChatFooter";
import ChatBody from "@/components/chatDisplay/ChatBody";
import {
  useChatAssignStatusStore,
  useSelectedContactStore,
  useSessionActiveStore,
} from "@/utils/store";
import { Colors } from "@/constants/colors";

const ChatDisplay = () => {
  const params = useLocalSearchParams();

  // Pull all details from the global selected contact store instead of URL params
  const selectedContact = useSelectedContactStore((state) => state.selectedContact);

  const id = Array.isArray(params.id) ? params.id[0] : params.id || selectedContact?.id || "";
  const name = selectedContact?.name || selectedContact?.whatsappUserName || "";
  const phone = Number(selectedContact?.phone) || 0;
  const initialStatus = selectedContact?.waMessageAssignStatus || "";
  const lastReceivedMessageTimeStamp = selectedContact?.lastReceivedMessageTimeStamp || "";
  const sessionActive = selectedContact?.sessionActive || false;

  const setWaAssignStatus = useChatAssignStatusStore(
    (state) => state.setWaAssignStatus,
  );

  const setIsSessionActive = useSessionActiveStore(
    (state) => state.setIsSessionActive,
  );

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Set session state immediately
  useEffect(() => {
    setIsSessionActive(sessionActive);
  }, [sessionActive]);

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
        behavior={"padding"}
        keyboardVerticalOffset={20}
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
