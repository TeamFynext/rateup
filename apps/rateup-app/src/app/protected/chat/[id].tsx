import React, { useEffect } from "react";
import { View, useColorScheme } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useLocalSearchParams } from "expo-router";
import dayjs from "dayjs";
import ChatHeader from "@/components/chatDisplay/ChatHeader";
import ChatFooter from "@/components/chatDisplay/ChatFooter";
import ChatBody from "@/components/chatDisplay/ChatBody";
import {
  useChatAssignStatusStore,
  useOpenChatStore,
  useSelectedContactStore,
  useSessionActiveStore,
} from "@/utils/store";
import { useContactById } from "@/api/inbox/contacts/contacts.query";
import { useContactsStore } from "@/store/inboxStore";
import { Colors } from "@/constants/colors";

const ChatDisplay = () => {
  const params = useLocalSearchParams();

  // Pull all details from the global selected contact store instead of URL params
  const selectedContact = useSelectedContactStore((state) => state.selectedContact);
  const setSelectedContact = useSelectedContactStore((state) => state.setSelectedContact);

  const id = Array.isArray(params.id) ? params.id[0] : params.id || selectedContact?.id || "";

  // The store is populated by the inbox row that was tapped, so every other way
  // into this screen — a notification deep link, and any cold start on this
  // route — arrives with it empty or holding the *previous* contact, and the
  // header renders blank or, worse, someone else's name. Refetch by id whenever
  // the store does not already describe this route's contact.
  const needsHydration = !!id && selectedContact?.id !== id;
  const { data: fetchedContact } = useContactById(needsHydration ? id : "");

  useEffect(() => {
    if (!needsHydration || !fetchedContact) return;
    // `/api/contact/:id` returns the bare Contact row, which has no session flag;
    // it is derived from the 24h WhatsApp reply window exactly as the inbox does.
    const sessionActive = fetchedContact.lastReceivedMessageTimeStamp
      ? dayjs(fetchedContact.lastReceivedMessageTimeStamp).add(24, "hour").diff(dayjs(), "minute") >
        0
      : false;
    setSelectedContact({ ...fetchedContact, sessionActive });
  }, [needsHydration, fetchedContact, setSelectedContact]);

  // Clear the unread badge on open, the way rateup-ui does it from
  // `setSelectedContact`. Placed on the route rather than on the inbox row's
  // onPress so a chat reached by notification deep link clears too — the app has
  // an entry point the web does not.
  useEffect(() => {
    if (!id) return;
    useContactsStore.getState().resetUnreadForContact(id);
  }, [id]);

  // Publish which chat is on screen, and — the part that matters — clear it on
  // unmount. The inbox reads this to decide whether an arriving message should
  // raise a badge; without the cleanup it would think this chat is still open
  // for the rest of the session.
  useEffect(() => {
    if (!id) return;
    const { setOpenChatId } = useOpenChatStore.getState();
    setOpenChatId(id);
    return () => setOpenChatId(null);
  }, [id]);

  // Only trust the store while it actually describes this route's contact.
  // Reading it unconditionally would render the previously opened chat's name and
  // phone for the duration of the fetch above — showing one customer's details
  // over another's conversation.
  const contact = selectedContact?.id === id ? selectedContact : undefined;

  const name = contact?.name || contact?.whatsappUserName || "";
  const phone = Number(contact?.phone) || 0;
  const initialStatus = contact?.waMessageAssignStatus || "";
  const lastReceivedMessageTimeStamp = contact?.lastReceivedMessageTimeStamp || "";
  const sessionActive = contact?.sessionActive || false;

  const setWaAssignStatus = useChatAssignStatusStore((state) => state.setWaAssignStatus);

  const setIsSessionActive = useSessionActiveStore((state) => state.setIsSessionActive);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Set session state immediately
  useEffect(() => {
    setIsSessionActive(sessionActive);
  }, [sessionActive, setIsSessionActive]);

  useEffect(() => {
    if (id) {
      setWaAssignStatus(initialStatus);
    }
  }, [id, initialStatus, setWaAssignStatus]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
      }}
    >
      <KeyboardAvoidingView behavior={"padding"} keyboardVerticalOffset={20} style={{ flex: 1 }}>
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
