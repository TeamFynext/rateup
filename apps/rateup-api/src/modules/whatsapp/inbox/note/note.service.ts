import { PlatformType, type Prisma } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import type { Actor } from "../../../../authz/actor.js";
import { HttpError } from "../../../../utils/http.js";
import { notify } from "../../../notification/notify.js";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller.js";
import { getLastCreatedConversationForContact } from "../../../contact/conversation/conversation.service.js";

export const noteInclude = {
  author: { select: { name: true, profilePhoto: true } },
  deletedBy: { select: { id: true, name: true } },
  mentions: { select: { mentionedUser: { select: { id: true, name: true } } } },
} satisfies Prisma.InboxNoteInclude;
type NoteRow = Prisma.InboxNoteGetPayload<{ include: typeof noteInclude }>;

/**
 * A note as the thread carries it: the message fields both clients already render a
 * note bubble from, plus `kind` so they can tell it from customer traffic.
 */
export interface ThreadNote {
  kind: "NOTE";
  id: string;
  messageId: string;
  contactId: string;
  conversationId: string;
  createdAt: Date;
  waCreatedAt: Date;
  sendBy: string | null;
  sender: { name: string | null; profilePhoto: string | null } | null;
  sourcePlatform: typeof PlatformType.INTERNAL;
  sourceIdentifier: "internal";
  deletedAt: Date | null;
  readUsers: string[];
  stats: { failed: string; sent: string; delivered: string; read: string };
  messageBody: {
    exchangeProcess: "privateNote";
    privateNote: {
      text: { body: string };
      triggeredByUser: { id: string; name: string } | null;
      mentionedUser: { id: string; name: string }[];
      editedAt?: string;
      deletedBy?: { id: string; name: string };
    };
  };
}

export function noteToThreadItem(note: NoteRow): ThreadNote {
  return {
    kind: "NOTE",
    id: note.id,
    messageId: note.clientId ?? note.id,
    contactId: note.contactId,
    conversationId: note.conversationId,
    createdAt: note.createdAt,
    waCreatedAt: note.createdAt,
    sendBy: note.authorId,
    sender: note.author,
    sourcePlatform: PlatformType.INTERNAL,
    sourceIdentifier: "internal",
    deletedAt: note.deletedAt,
    readUsers: [],
    stats: { failed: "", sent: "", delivered: "", read: "" },
    messageBody: {
      exchangeProcess: "privateNote",
      privateNote: {
        text: { body: note.body },
        triggeredByUser: note.authorId
          ? { id: note.authorId, name: note.author?.name ?? "" }
          : null,
        mentionedUser: note.mentions.map(({ mentionedUser: u }) => ({
          id: u.id,
          name: u.name ?? "",
        })),
        ...(note.editedAt && { editedAt: note.editedAt.toISOString() }),
        ...(note.deletedBy && {
          deletedBy: { id: note.deletedBy.id, name: note.deletedBy.name ?? "" },
        }),
      },
    },
  };
}

/**
 * The notes of a thread whose time falls in [from, before); a null bound is open.
 * Without a ticket, every ticket's notes for the contact.
 */
export async function getThreadNotes({
  contactId,
  orgId,
  conversationId,
  from,
  before,
}: {
  contactId: string;
  orgId: string;
  conversationId?: string | null;
  from: Date | null;
  before: Date | null;
}): Promise<ThreadNote[]> {
  const notes = await prisma.inboxNote.findMany({
    where: {
      contactId,
      orgId,
      ...(conversationId && { conversationId }),
      ...((from || before) && {
        createdAt: { ...(from && { gte: from }), ...(before && { lt: before }) },
      }),
    },
    include: noteInclude,
    orderBy: { createdAt: "desc" },
  });
  return notes.map(noteToThreadItem);
}

/** Where a thread cursor sits in time, for a cursor handed out while notes were messages. */
export async function findNoteTime(id: string): Promise<Date | null> {
  const note = await prisma.inboxNote.findUnique({ where: { id }, select: { createdAt: true } });
  return note?.createdAt ?? null;
}

/** Ids come from the client, so only this org's people can be mentioned. */
async function resolveMentions(orgId: string, ids: string[] | undefined) {
  if (!ids?.length) return [];
  return prisma.user.findMany({
    where: { id: { in: ids }, orgMember: { some: { orgId } } },
    select: { id: true, name: true },
  });
}

async function broadcastNote(orgId: string, note: ThreadNote) {
  // "main" only: a webchat contact's other socket is the customer's widget.
  await sendViaWstoOrgHandler(
    orgId,
    {
      type: "inbox_note",
      inbox_note: { contactId: note.contactId, conversationId: note.conversationId, message: note },
    },
    "main",
  );
}

export async function createNote({
  orgId,
  contactId,
  conversationId,
  authorId,
  text,
  mentionedUserIds,
  clientId,
}: {
  orgId: string;
  contactId: string;
  /** Old app builds send none; they get the contact's newest ticket. */
  conversationId?: string;
  authorId: string | undefined;
  text: string;
  mentionedUserIds?: string[];
  clientId?: string;
}) {
  if (!text.trim()) throw new HttpError("A note needs some text", 400);
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: { id: true, name: true },
  });
  if (!contact) throw new HttpError("Contact not found", 404);

  const ticket = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, contactId },
        select: { id: true },
      })
    : await getLastCreatedConversationForContact(contactId);
  if (!ticket) throw new HttpError("Conversation not found", 404);

  const [author, mentioned] = await Promise.all([
    authorId
      ? prisma.user.findUnique({ where: { id: authorId }, select: { id: true, name: true } })
      : null,
    resolveMentions(orgId, mentionedUserIds),
  ]);

  const note = await prisma.inboxNote.create({
    data: {
      orgId,
      contactId,
      conversationId: ticket.id,
      authorId: author?.id ?? null,
      body: text,
      clientId,
      mentions: {
        create: mentioned.map((user) => ({
          orgId,
          contactId,
          conversationId: ticket.id,
          mentionedUserId: user.id,
        })),
      },
    },
    include: noteInclude,
  });

  if (mentioned.length) {
    await notify({
      event: "inbox.mentioned",
      orgId,
      audience: { kind: "users", userIds: mentioned.map((user) => user.id) },
      data: {
        contactId: contact.id,
        contactName: contact.name ?? "",
        ...(author?.name && { byName: author.name }),
      },
      actorUserId: author?.id,
    });
  }

  const item = noteToThreadItem(note);
  await broadcastNote(orgId, item);
  return item;
}

async function findLiveNote(noteId: string, orgId: string) {
  const note = await prisma.inboxNote.findFirst({ where: { id: noteId, orgId } });
  if (!note) throw new HttpError("Note not found", 404);
  if (note.deletedAt) throw new HttpError("This note was deleted", 409);
  return note;
}

/** Only the author rewrites a note: it is signed with their name. */
export async function editNote(noteId: string, orgId: string, userId: string, text: string) {
  if (!text.trim()) throw new HttpError("A note needs some text", 400);
  const note = await findLiveNote(noteId, orgId);
  if (note.authorId !== userId) throw new HttpError("Only the author can edit a note", 403);

  const edited = await prisma.inboxNote.update({
    where: { id: note.id },
    data: { body: text, editedAt: new Date() },
    include: noteInclude,
  });
  const item = noteToThreadItem(edited);
  await broadcastNote(orgId, item);
  return item;
}

/** The author, or anyone who manages the inbox. The text goes; who removed it stays. */
export async function deleteNote(noteId: string, orgId: string, actor: Actor) {
  const userId = actor.userId;
  if (!userId) throw new HttpError("Notes are deleted by a person", 403);
  const note = await findLiveNote(noteId, orgId);
  if (note.authorId !== userId && !actor.can("inbox.manage")) {
    throw new HttpError("You can only delete your own notes", 403);
  }

  const deleted = await prisma.inboxNote.update({
    where: { id: note.id },
    data: {
      body: "",
      deletedAt: new Date(),
      deletedById: userId,
      mentions: { deleteMany: {} },
    },
    include: noteInclude,
  });
  const item = noteToThreadItem(deleted);
  await broadcastNote(orgId, item);
  return item;
}
