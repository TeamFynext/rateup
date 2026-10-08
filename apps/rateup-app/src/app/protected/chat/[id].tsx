import React, { useEffect, useState } from "react";
import { View, useColorScheme } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { loadContactFromDB } from "@/utils/sqlite";
import { Colors } from "@/constants/colors";
import { isSessionWindowOpen } from "@/utils/sessionWindow";
import KeyboardAvoider from "@/components/common/KeyboardAvoider";

/**
 * `/api/contact/:id` and the cached row both return a bare Contact, which carries no
 * session flag. Derived from the 24h reply window, the same way the inbox does; at worst
 * the template-only footer shows for a moment, never a free-form composer on a closed
 * session.
 */
const deriveSessionActive = isSessionWindowOpen;

const ChatDisplay = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Pull all details from the global selected contact store instead of URL params
  const selectedContact = useSelectedContactStore((state) => state.selectedContact);
  const setSelectedContact = useSelectedContactStore((state) => state.setSelectedContact);

  const id = Array.isArray(params.id) ? params.id[0] : params.id || selectedContact?.id || "";

  // The store is populated by the inbox row that was tapped, so every other way
  // into this screen — a notification deep link, and any cold start on this
  // route — arrives with it empty or holding the *previous* contact.
  //
  // Captured once, at mount, and deliberately not recomputed: the cache
  // hydration below seeds the very store this reads, so a live check would flip
  // to false the moment the cached row lands and switch the network fetch off,
  // pinning the screen to stale data for as long as it stayed open.
  // Held in state with a lazy initialiser rather than a ref: a ref read during render is
  // not safe under concurrent rendering, and the initialiser gives the same capture-once
  // behaviour while actually evaluating the store lookup only on the first render.
  const [arrivedWithoutContact] = useState(
    () => useSelectedContactStore.getState().selectedContact?.id !== id,
  );
  const { data: fetchedContact, isError: contactFetchFailed } = useContactById(
    arrivedWithoutContact ? id : "",
  );

  // Paint from the last inbox sync while the request is in flight. The row is
  // already on disk for any contact the inbox has loaded, so a notification tap
  // shows the real header immediately instead of a blank one. A miss — fresh
  // install, a contact never listed, or the first open after a sign-out cleared
  // the cache — simply falls through to the fetch, exactly as before.
  useEffect(() => {
    if (!id || !arrivedWithoutContact) return;
    let cancelled = false;

    loadContactFromDB(id)
      .then((cached) => {
        if (cancelled || !cached) return;
        // The fetch may have resolved while we were reading disk. Cached data is
        // older by definition, so it must never land on top of a fresh row.
        if (useSelectedContactStore.getState().selectedContact?.id === id) return;
        setSelectedContact({ ...cached, sessionActive: deriveSessionActive(cached) });
      })
      .catch((error) => {
        // A cache miss is not a failure worth surfacing; the fetch still runs.
        console.error("Failed to read the cached contact:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [id, arrivedWithoutContact, setSelectedContact]);

  // The network result always wins, including over anything seeded above.
  useEffect(() => {
    if (!fetchedContact) return;
    setSelectedContact({ ...fetchedContact, sessionActive: deriveSessionActive(fetchedContact) });
  }, [fetchedContact, setSelectedContact]);

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
      {/* The footer pads the bottom safe area; that padding goes behind the keyboard so
          the composer sits right on it, as in WhatsApp, on every phone. */}
      <KeyboardAvoider bottomInset={insets.bottom}>
        <ChatHeader
          id={id}
          name={name}
          phone={phone}
          lastReceivedMessageTimeStamp={lastReceivedMessageTimeStamp}
          // Neither the cache nor the request has produced this contact yet.
          // Not gated on the request still being in flight: on failure we stop
          // waiting and let the header fall back to the phone number rather
          // than pulse forever.
          loading={!contact && !contactFetchFailed}
        />

        <ChatBody id={id} />

        <ChatFooter id={id} />
      </KeyboardAvoider>
    </View>
  );
};

export default ChatDisplay;
