import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    contact: { findFirst: vi.fn() },
    conversation: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    inboxNote: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("../../../notification/notify.js", () => ({ notify: vi.fn() }));
vi.mock("../../../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler: vi.fn() }));
vi.mock("../../../contact/conversation/conversation.service.js", () => ({
  getLastCreatedConversationForContact: vi.fn(),
}));
vi.mock("../../../../../generated/prisma/client.js", () => ({
  PlatformType: { INTERNAL: "INTERNAL" },
}));

import prisma from "../../../../utils/prisma.js";
import { notify } from "../../../notification/notify.js";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller.js";
import { getLastCreatedConversationForContact } from "../../../contact/conversation/conversation.service.js";
import type { Actor } from "../../../../authz/actor.js";
import {
  createNote,
  deleteNote,
  editNote,
  getThreadNotes,
  noteToThreadItem,
} from "./note.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  contact: { findFirst: Mock };
  conversation: { findFirst: Mock };
  user: { findUnique: Mock; findMany: Mock };
  inboxNote: { create: Mock; findFirst: Mock; update: Mock; findMany: Mock };
};

const CREATED = new Date(Date.UTC(2026, 8, 29, 10, 0));

function noteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-1",
    orgId: "org-1",
    conversationId: "conv-1",
    contactId: "contact-1",
    authorId: "user-1",
    author: { name: "Asha", profilePhoto: null },
    body: "please call back",
    clientId: "wamid.tmp",
    createdAt: CREATED,
    editedAt: null,
    deletedAt: null,
    deletedById: null,
    deletedBy: null,
    mentions: [],
    ...overrides,
  };
}

function actor(userId: string, permissions: string[] = []): Actor {
  return { userId, can: (p: string) => permissions.includes(p) } as unknown as Actor;
}

const input = {
  orgId: "org-1",
  contactId: "contact-1",
  conversationId: "conv-1",
  authorId: "user-1",
  text: "please call back",
};

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findFirst.mockResolvedValue({ id: "contact-1", name: "Ravi" });
  db.conversation.findFirst.mockResolvedValue({ id: "conv-1" });
  db.user.findUnique.mockResolvedValue({ id: "user-1", name: "Asha" });
  db.user.findMany.mockResolvedValue([]);
  db.inboxNote.create.mockResolvedValue(noteRow());
  db.inboxNote.findFirst.mockResolvedValue(noteRow());
  // A delete's nested `mentions` write is not the row's mention list; it comes back empty.
  db.inboxNote.update.mockImplementation(async ({ data }) => noteRow({ ...data, mentions: [] }));
});

describe("noteToThreadItem", () => {
  test("dresses a note in the message shape the thread renders", () => {
    const item = noteToThreadItem(
      noteRow({ mentions: [{ mentionedUser: { id: "user-9", name: "Ben" } }] }) as never,
    );

    expect(item).toMatchObject({
      kind: "NOTE",
      id: "note-1",
      messageId: "wamid.tmp",
      waCreatedAt: CREATED,
      sourcePlatform: "INTERNAL",
      sender: { name: "Asha", profilePhoto: null },
      messageBody: {
        exchangeProcess: "privateNote",
        privateNote: {
          text: { body: "please call back" },
          triggeredByUser: { id: "user-1", name: "Asha" },
          mentionedUser: [{ id: "user-9", name: "Ben" }],
        },
      },
    });
  });

  test("falls back to its own id when the composer sent none", () => {
    expect(noteToThreadItem(noteRow({ clientId: null }) as never).messageId).toBe("note-1");
  });
});

describe("getThreadNotes", () => {
  test("reads one ticket's notes inside the page's time window", async () => {
    db.inboxNote.findMany.mockResolvedValue([]);
    const from = new Date(Date.UTC(2026, 8, 1));
    const before = new Date(Date.UTC(2026, 8, 2));

    await getThreadNotes({
      contactId: "contact-1",
      orgId: "org-1",
      conversationId: "conv-1",
      from,
      before,
    });

    expect(db.inboxNote.findMany.mock.calls[0][0].where).toEqual({
      contactId: "contact-1",
      orgId: "org-1",
      conversationId: "conv-1",
      createdAt: { gte: from, lt: before },
    });
  });
});

describe("createNote", () => {
  test("refuses a contact from another org", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    await expect(createNote(input)).rejects.toMatchObject({ statusCode: 404 });
    expect(db.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "contact-1", orgId: "org-1" } }),
    );
    expect(db.inboxNote.create).not.toHaveBeenCalled();
  });

  test("refuses a ticket that is not the contact's", async () => {
    db.conversation.findFirst.mockResolvedValue(null);

    await expect(createNote(input)).rejects.toMatchObject({ statusCode: 404 });
    expect(db.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "conv-1", contactId: "contact-1" } }),
    );
  });

  test("puts a note with no ticket on the contact's newest one", async () => {
    (getLastCreatedConversationForContact as Mock).mockResolvedValue({ id: "conv-9" });

    await createNote({ ...input, conversationId: undefined });

    expect(db.inboxNote.create.mock.calls[0][0].data.conversationId).toBe("conv-9");
  });

  test("refuses a note with only whitespace", async () => {
    await expect(createNote({ ...input, text: "  " })).rejects.toMatchObject({ statusCode: 400 });
  });

  test("mentions only people in the org, on the note's ticket, and notifies them", async () => {
    db.user.findMany.mockResolvedValue([{ id: "user-9", name: "Ben" }]);

    await createNote({ ...input, mentionedUserIds: ["user-9", "outsider"] });

    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-9", "outsider"] }, orgMember: { some: { orgId: "org-1" } } },
      select: { id: true, name: true },
    });
    expect(db.inboxNote.create.mock.calls[0][0].data.mentions.create).toEqual([
      {
        orgId: "org-1",
        contactId: "contact-1",
        conversationId: "conv-1",
        mentionedUserId: "user-9",
      },
    ]);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "inbox.mentioned",
        audience: { kind: "users", userIds: ["user-9"] },
      }),
    );
  });

  test("notifies no one for a note that mentions nobody", async () => {
    await createNote(input);

    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  test("tells the org's inbox sockets, never a webchat widget", async () => {
    await createNote(input);

    expect(sendViaWstoOrgHandler).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        type: "inbox_note",
        inbox_note: expect.objectContaining({ contactId: "contact-1", conversationId: "conv-1" }),
      }),
      "main",
    );
  });
});

describe("editNote", () => {
  test("lets the author rewrite their note", async () => {
    const note = await editNote("note-1", "org-1", "user-1", "call after 5");

    expect(db.inboxNote.update.mock.calls[0][0].data).toMatchObject({ body: "call after 5" });
    expect(note.messageBody.privateNote.editedAt).toBeDefined();
    expect(sendViaWstoOrgHandler).toHaveBeenCalled();
  });

  test("refuses anyone else", async () => {
    await expect(editNote("note-1", "org-1", "user-2", "x")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test("refuses a note of another org", async () => {
    db.inboxNote.findFirst.mockResolvedValue(null);

    await expect(editNote("note-1", "org-2", "user-1", "x")).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(db.inboxNote.findFirst).toHaveBeenCalledWith({
      where: { id: "note-1", orgId: "org-2" },
    });
  });

  test("refuses a deleted note", async () => {
    db.inboxNote.findFirst.mockResolvedValue(noteRow({ deletedAt: CREATED }));

    await expect(editNote("note-1", "org-1", "user-1", "x")).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe("deleteNote", () => {
  test("clears the text and the note's mentions, keeping who removed it", async () => {
    await deleteNote("note-1", "org-1", actor("user-1"));

    expect(db.inboxNote.update.mock.calls[0][0].data).toMatchObject({
      body: "",
      deletedById: "user-1",
      mentions: { deleteMany: {} },
    });
  });

  test("lets an inbox manager remove someone else's note", async () => {
    await deleteNote("note-1", "org-1", actor("user-2", ["inbox.manage"]));

    expect(db.inboxNote.update).toHaveBeenCalled();
  });

  test("refuses anyone else", async () => {
    await expect(deleteNote("note-1", "org-1", actor("user-2"))).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(db.inboxNote.update).not.toHaveBeenCalled();
  });
});
