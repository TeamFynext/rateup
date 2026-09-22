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
  // The cashier's step store persists the open customer's phone number.
  "rateup:loyalty:cashier:step",
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
    // The cashier's cached customer lookups hold names, numbers and balances, so they are
    // account data and go with the rest.
    //
    // Its **outbox is deliberately not cleared.** A pending row is a customer who paid at
    // the counter; silently discarding one on sign-out is the one failure this whole
    // mechanism exists to prevent. That is also why it lives in its own database rather
    // than a table in `chat_contacts_db`, whose clear is a blunt `DELETE`. Callers that
    // want to warn before signing out with work outstanding can ask
    // `pendingCashierWrites()`.
    clearCashierCustomerCache(),
    AsyncStorage.multiRemove(ACCOUNT_STORAGE_KEYS),
  ]);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Failed to clear local account data on sign-out:", result.reason);
    }
  });
}

/**
 * Clears the cashier's cached lookups, org by org.
 *
 * Sign-out does not know which org the cache belongs to by the time this runs, so it drops
 * every row. The outbox is untouched.
 */
async function clearCashierCustomerCache(): Promise<void> {
  const { getOutboxDB } = await import("./cashierOutbox/db");
  const db = await getOutboxDB();
  await db.runAsync("DELETE FROM customer_cache");
}

/**
 * How many counter writes have not reached the server, across every org on this device.
 *
 * Sign-out should ask before discarding a session that still has work outstanding — the
 * rows survive, but they can only be sent by whoever is signed in to that org.
 */
export async function pendingCashierWrites(): Promise<number> {
  try {
    const { getOutboxDB } = await import("./cashierOutbox/db");
    const db = await getOutboxDB();
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM outbox WHERE status IN ('pending', 'unresolved', 'needs_review')",
    );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}
