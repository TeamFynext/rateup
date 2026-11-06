import { beforeEach, describe, expect, test, vi } from "vitest";
import { create } from "zustand";

// The store's native and network dependencies: SQLite, AsyncStorage (persist), the API.
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
}));
vi.mock("../utils/sqlite", () => ({
  deleteMessageFromIDB: vi.fn(async () => {}),
  loadContactIdsForFilter: vi.fn(async () => []),
  loadRowsFromDB: vi.fn(async () => new Map()),
  removeContactsFromDB: vi.fn(async () => {}),
  saveContactIdsForFilter: vi.fn(async () => {}),
  saveContactsToDB: vi.fn(async () => {}),
  saveContactToDB: vi.fn(async () => {}),
  saveMessagesToIDB: vi.fn(async () => {}),
}));
vi.mock("@/api/inbox/contacts/contacts.api", () => ({ markMessageAsRead: vi.fn(async () => {}) }));
vi.mock("../utils/chatbox_utils", () => ({ isInboxSessionExpired: () => false }));
vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn(), log: vi.fn() } }));
const selectedContactStore = create<{ selectedContact: any }>(() => ({ selectedContact: null }));
const openChatStore = create<{ openChatId: string | null }>(() => ({ openChatId: null }));
vi.mock("../utils/store", () => ({
  useSelectedContactStore: selectedContactStore,
  useOpenChatStore: openChatStore,
}));

const { getRowKey, makeFilterKey, resolveRowKey, useContactsStore } = await import("./inboxStore");

const FILTER = { messageType: "usermessages", status: [] as string[] };
const FILTER_KEY = makeFilterKey(FILTER);

/** One inbox row: a contact's ticket, as the list endpoint returns it. */
function row(contactId: string, conversationId: string | null, platform: string, at: string) {
  return {
    id: contactId,
    conversationId,
    waMessageAssignStatus: "UNASSIGNED",
    conversationLastMessageAt: at,
    lastMessage: { id: `${conversationId}-m`, sourcePlatform: platform, waCreatedAt: at },
    unReadMessageCount: 0,
  };
}

async function load(rows: any[]) {
  const store = useContactsStore.getState();
  store.setFilter(FILTER);
  await store.addContactsForFilter(FILTER_KEY, rows, false, true);
}

const listed = () =>
  (useContactsStore.getState().contactsByFilter[FILTER_KEY] ?? []).map((key) =>
    useContactsStore.getState().contactsById.get(key),
  );

beforeEach(() => {
  useContactsStore.setState({
    contactsById: new Map(),
    contactsByFilter: {},
    currentFilterKey: null,
  });
  selectedContactStore.setState({ selectedContact: null });
  openChatStore.setState({ openChatId: null });
});

describe("inbox rows are keyed by ticket", () => {
  test("getRowKey is the ticket, else the contact", () => {
    expect(getRowKey({ id: "c1", conversationId: "t1" })).toBe("t1");
    expect(getRowKey({ id: "c1", conversationId: null })).toBe("c1");
    expect(getRowKey({ id: "c1" })).toBe("c1");
  });

  test("a contact's WhatsApp and Instagram tickets both stay in the list", async () => {
    await load([
      row("c1", "wa-ticket", "WHATSAPP", "2026-11-06T10:00:00Z"),
      row("c1", "ig-ticket", "INSTAGRAM", "2026-11-06T09:00:00Z"),
      row("c2", "webchat-ticket", "WEBCHAT", "2026-11-06T08:00:00Z"),
    ]);
    expect(listed().map((r) => r.lastMessage.sourcePlatform)).toEqual([
      "WHATSAPP",
      "INSTAGRAM",
      "WEBCHAT",
    ]);
  });

  test("an update naming a ticket lands on that ticket's row only", async () => {
    await load([
      row("c1", "wa-ticket", "WHATSAPP", "2026-11-06T10:00:00Z"),
      row("c1", "ig-ticket", "INSTAGRAM", "2026-11-06T09:00:00Z"),
    ]);
    useContactsStore
      .getState()
      .updateContactById("c1", (c) => ({ ...c, unReadMessageCount: 3 }), true, "ig-ticket");
    const { contactsById } = useContactsStore.getState();
    expect(contactsById.get("ig-ticket").unReadMessageCount).toBe(3);
    expect(contactsById.get("wa-ticket").unReadMessageCount).toBe(0);
  });

  test("an unknown ticket resolves to nothing, so the socket handler adds it", async () => {
    await load([row("c1", "wa-ticket", "WHATSAPP", "2026-11-06T10:00:00Z")]);
    expect(resolveRowKey(useContactsStore.getState(), "c1", "new-ig-ticket")).toBeNull();
  });

  test("a contact id alone resolves to the opened row, else the open, newest ticket", async () => {
    await load([
      {
        ...row("c1", "closed-ticket", "WHATSAPP", "2026-11-06T11:00:00Z"),
        waMessageAssignStatus: "CLOSED",
      },
      row("c1", "ig-ticket", "INSTAGRAM", "2026-11-06T09:00:00Z"),
      row("c1", "wa-ticket", "WHATSAPP", "2026-11-06T10:00:00Z"),
    ]);
    const state = useContactsStore.getState();
    expect(resolveRowKey(state, "c1")).toBe("wa-ticket");
    selectedContactStore.setState({ selectedContact: state.contactsById.get("ig-ticket") });
    expect(resolveRowKey(state, "c1")).toBe("ig-ticket");
  });

  test("a row cached under the contact id gives way to the server's ticket rows", async () => {
    useContactsStore.setState({
      contactsById: new Map([["c1", row("c1", "wa-ticket", "WHATSAPP", "2026-11-06T10:00:00Z")]]),
      contactsByFilter: { [FILTER_KEY]: ["c1"] },
    });
    await load([
      row("c1", "wa-ticket", "WHATSAPP", "2026-11-06T10:00:00Z"),
      row("c1", "ig-ticket", "INSTAGRAM", "2026-11-06T09:00:00Z"),
    ]);
    const { contactsById, contactsByFilter } = useContactsStore.getState();
    expect(contactsById.has("c1")).toBe(false);
    expect(contactsByFilter[FILTER_KEY]).toEqual(["wa-ticket", "ig-ticket"]);
  });

  test("deleting a contact removes every one of its ticket rows", async () => {
    await load([
      row("c1", "wa-ticket", "WHATSAPP", "2026-11-06T10:00:00Z"),
      row("c1", "ig-ticket", "INSTAGRAM", "2026-11-06T09:00:00Z"),
      row("c2", "other", "WHATSAPP", "2026-11-06T08:00:00Z"),
    ]);
    await useContactsStore.getState().deleteContactsByIds(["c1"]);
    expect(listed().map((r) => r.id)).toEqual(["c2"]);
  });
});
