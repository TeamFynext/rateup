import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./inbox.idb.ts", () => ({
  clearAllContactsFromDB: vi.fn(),
  clearAllMessagesFromIDB: vi.fn(),
  deleteMessagesFromIDB: vi.fn(),
  loadContactIdsForFilter: vi.fn(async () => []),
  loadContactsFromDB: vi.fn(async () => []),
  patchMessageInIDB: vi.fn(),
  removeContactsFromDB: vi.fn(),
  saveContactIdsForFilter: vi.fn(),
  saveContactsToDB: vi.fn(),
  saveContactToDB: vi.fn(),
  saveMessagesToIDB: vi.fn(),
}));

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";

import { deleteMessagesFromIDB } from "./inbox.idb.ts";
import { useMessagesStore } from "./inbox.store.ts";

const KEY = "conv-1_all";

function line(id: string, messageId: string, at = "2026-09-29T19:12:00.000Z") {
  return {
    id,
    messageId,
    waCreatedAt: at,
    sourcePlatform: "INTERNAL",
    sourceIdentifier: "internal",
    messageBody: { exchangeProcess: "internal" },
  } as unknown as WaGetMessagesBody;
}

const ids = () =>
  useMessagesStore
    .getState()
    .messagesByKey.get(KEY)
    ?.messages.map((m) => m.id);

beforeEach(() => {
  useMessagesStore.setState({ messagesByKey: new Map() });
  vi.clearAllMocks();
});

describe("mergeMessages", () => {
  test("replaces the composer's placeholder with the stored row it names", () => {
    const store = useMessagesStore.getState();
    store.addMessage(KEY, line("wamid.tmp", "wamid.tmp"));

    store.mergeMessages(KEY, [line("row-uuid", "wamid.tmp")]);

    expect(ids()).toEqual(["row-uuid"]);
    expect(deleteMessagesFromIDB).toHaveBeenCalledWith(KEY, ["wamid.tmp"]);
  });

  // Webchat once minted one messageId for a whole thread; real rows stay apart by id.
  test("keeps stored rows that share a messageId", () => {
    const store = useMessagesStore.getState();
    store.mergeMessages(KEY, [line("row-1", "shared")]);

    store.mergeMessages(KEY, [line("row-2", "shared", "2026-09-29T19:13:00.000Z")]);

    expect(ids()).toEqual(["row-2", "row-1"]);
  });
});
