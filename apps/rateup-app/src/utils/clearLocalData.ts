import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "@/config/queryClient";
import { useContactsStore, useMessagesStore } from "@/store/inboxStore";
import {
  useChatAssignStatusStore,
  useLiveMessages,
  useMediaStore,
  useMessageStore,
  useOpenChatStore,
  useSelectedContactStore,
  useSelectedTabStore,
  useSessionActiveStore,
} from "@/utils/store";

/**
 * Every AsyncStorage key that belongs to the signed-in account.
 *
 * `inbox-selected-contact` and `selected-contact-message-key` are the two
 * zustand `persist` store names; removing the key is how you reset a persisted
 * store from outside React. `cachedUserId` / `cachedOrgId` are AuthContext's
 * offline fallback — left behind, a new sign-in that cannot reach the details
 * endpoint would adopt the previous account's identity.
 *
 * Deliberately excluded: the theme preference and the browser id, which are
 * device settings rather than account data.
 */
const ACCOUNT_STORAGE_KEYS = [
  "accessToken",
  "cachedUserId",
  "cachedOrgId",
  "inbox-selected-contact",
  "selected-contact-message-key",
];

/**
 * Wipe every trace of the signed-in account from the device.
 *
 * Sign-out previously dropped only the access token, so the SQLite cache
 * survived it. Nothing in that schema is scoped to a user or an org: contacts
 * are keyed by contact id and the filter table by a key built purely from the
 * visible filter controls, so the next account produced an identical filter key
 * and hydrated the previous account's contacts straight off disk.
 *
 * Clearing SQLite alone is not enough. The in-memory contacts store short
 * circuits when it already holds rows for a filter key, so stale contacts would
 * still be served from memory for the lifetime of the JS context. Both layers
 * have to go, along with the React Query cache that backs the same screens.
 *
 * Never throws: a failure to clear one layer must not prevent the rest of
 * sign-out from running, since a half-cleared device is the state this exists
 * to prevent. Failures are logged and swallowed.
 */
export async function clearLocalUserData() {
  // In-memory first, and synchronously, so no screen can re-render against
  // stale data while the awaited disk clears are still in flight.
  try {
    useContactsStore.setState({
      contactsById: new Map(),
      contactsByFilter: {},
      selectedContact: null,
      currentFilterKey: null,
      currentUser: null,
    });
    useMessagesStore.setState({
      messagesByKey: new Map(),
      selectedKey: null,
      isLoading: false,
    });
    useSelectedContactStore.setState({ selectedContact: null });
    useOpenChatStore.setState({ openChatId: null });
    useMessageStore.setState({ messages: {} });
    useLiveMessages.setState({ messages: [] });
    useMediaStore.setState({ media: [], selectedMedia: null });
    useChatAssignStatusStore.setState({ waAssignStatus: "" });
    useSelectedTabStore.setState({ selectedTab: "Open" });
    useSessionActiveStore.setState({ isSessionActive: true });
  } catch (error) {
    console.error("Failed to reset in-memory stores on sign-out:", error);
  }

  // Cached server responses back the same screens as the stores above.
  try {
    queryClient.cancelQueries();
    queryClient.clear();
  } catch (error) {
    console.error("Failed to clear the query cache on sign-out:", error);
  }

  const results = await Promise.allSettled([
    // Imported lazily: pulling the SQLite module in at app start would open the
    // database on a path that only the inbox needs.
    import("./sqlite").then((m) => m.clearAllContactsFromDB()),
    AsyncStorage.multiRemove(ACCOUNT_STORAGE_KEYS),
  ]);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Failed to clear local account data on sign-out:", result.reason);
    }
  });
}
