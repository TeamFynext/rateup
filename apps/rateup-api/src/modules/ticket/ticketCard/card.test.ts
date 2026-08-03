import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    ticketCard: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticketColumn: { findUnique: vi.fn() },
    ticketBoard: { findFirst: vi.fn(), findUnique: vi.fn() },
    ticketBoardLabel: { findMany: vi.fn() },
    ticketActivity: { create: vi.fn(), findMany: vi.fn() },
    contact: { findUnique: vi.fn(), findFirst: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    teamMember: { findFirst: vi.fn(), findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock("../ticket.service.js", () => ({
  sendTicketAssignedEmail: vi.fn(),
  sendTicketAssignedWaMessage: vi.fn(),
  sendTicketCreateEmail: vi.fn(),
  sendTicketCreateWaMessage: vi.fn(),
}));
vi.mock("../../notification/notification.service.js", () => ({ getNotificationSettings: vi.fn() }));
vi.mock("../../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: {
    TICKET_CREATED: "new_ticket",
    TICKET_CARD_MOVED: "ticket_card_moved",
    TICKET_ASSIGNEE_UPDATED: "ticket_assignee_updated",
  },
}));
vi.mock("../../../utils/redisConnection.js", () => ({ notificationQueue: { add: vi.fn() } }));
vi.mock("../../../utils/commonUtils.js", () => ({ getShortUrlId: vi.fn(() => "TKT-1") }));
vi.mock("../../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { sendTicketCreateEmail } from "../ticket.service.js";
import { addZapierTriggerToQueue } from "../../integrations/external/zapier/zapier.service.js";
import {
  createCard,
  deleteCard,
  getCardById,
  getCardTeamMembersById,
  moveCard,
  reorderCards,
  updateCard,
} from "./card.service.js";
import { createCardHandler, getAllCardsHandler, reorderCardsHandler } from "./card.controller.js";
import { verifyCardAccess } from "./card.auth.js";
import { cardRoutes } from "./card.route.js";
import { columnIdParamsSchema, updateCardRequestSchema } from "./card.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as Record<string, any>;

const USER = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";
const CARD = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const OWN_COLUMN = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";
const VICTIM_COLUMN = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const VICTIM_CONTACT = "9f8e7d6c-5b4a-4392-8172-6a5b4c3d2e1f";
const OWN_CONTACT = "0d1c2b3a-4f5e-4a6b-8c7d-9e0f1a2b3c4d";
const VICTIM_BOARD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BOARD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

function request(over: any = {}) {
  return {
    log: { error: vi.fn() },
    userId: USER,
    user: { userId: USER, orgId: ORG },
    ...over,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued values.
  db.ticketCard.create.mockResolvedValue({
    id: CARD,
    title: "T",
    ticketId: "TKT-1",
    ticketColumnId: OWN_COLUMN,
    // The create always runs with `include: { labels: ... }`, so the row carries
    // the join rows that createCard flattens into a plain label list.
    labels: [],
  });
  db.ticketCard.findFirst.mockResolvedValue(null);
  db.ticketCard.findMany.mockResolvedValue([]);
  db.ticketCard.findUnique.mockResolvedValue(null);
  db.ticketCard.update.mockResolvedValue({ id: CARD, ticketColumnId: OWN_COLUMN });
  db.ticketCard.delete.mockResolvedValue({ id: CARD });
  db.ticketColumn.findUnique.mockResolvedValue({ ticketBoardId: BOARD, title: "To Do" });
  db.ticketBoard.findFirst.mockResolvedValue({
    id: BOARD,
    title: "Support",
    notificationRecipients: [],
  });
  db.ticketBoardLabel.findMany.mockResolvedValue([]);
  db.ticketActivity.create.mockResolvedValue({ id: "act-1" });
  db.ticketActivity.findMany.mockResolvedValue([]);
  db.contact.findUnique.mockResolvedValue(null);
  db.contact.findFirst.mockResolvedValue(null);
  db.user.findUnique.mockResolvedValue(null);
  db.user.findMany.mockResolvedValue([]);
  db.teamMember.findFirst.mockResolvedValue({ userId: USER });
  db.teamMember.findMany.mockResolvedValue([{ userId: USER }]);
  db.ticketBoard.findUnique.mockResolvedValue({ teams: [{ teamId: "own-team" }] });
  db.$queryRaw.mockResolvedValue([]);
  db.$executeRaw.mockResolvedValue(1);
  db.$transaction.mockImplementation(async (fn: any) => fn(db));
});

// ===========================================================================
// Creating a card on a column you cannot see
// ===========================================================================

describe("createCard", () => {
  // NOTE: POST /create carries no preHandler (card.route.ts:30-41) and the
  // column comes from the body, so nothing establishes that the caller can
  // reach the board this column belongs to.
  test("takes the target column from the body without checking access", async () => {
    await createCard({
      title: "T",
      ticketColumnId: VICTIM_COLUMN,
      type: "CUSTOM",
      orgId: ORG,
      userId: USER,
    } as never);

    expect(db.ticketCard.create.mock.calls[0][0].data.ticketColumnId).toBe(VICTIM_COLUMN);
    expect(db.teamMember.findFirst).not.toHaveBeenCalled();
  });

  test("the handler passes the body's column through untouched", async () => {
    const rep = reply();

    await createCardHandler(
      request({ body: { title: "T", ticketColumnId: VICTIM_COLUMN, type: "CUSTOM" } }),
      rep,
    );

    expect(db.ticketCard.create.mock.calls[0][0].data.ticketColumnId).toBe(VICTIM_COLUMN);
    expect(answer(rep).code).toBe(201);
  });

  // NOTE: the org stamped on the notifications and the Zapier event is the
  // CALLER's, taken from their session — not the org that owns the board.
  test("uses the caller's org for the events raised on another org's board", async () => {
    db.ticketBoard.findFirst.mockResolvedValueOnce({
      id: BOARD,
      title: "Victim Support",
      ticketCreatedEmail: true,
      notificationRecipients: [
        { user: { id: "victim-user", email: "staff@victim.test", phone: "1" } },
      ],
    });

    await createCard({
      title: "T",
      ticketColumnId: VICTIM_COLUMN,
      type: "CUSTOM",
      orgId: ORG,
      userId: USER,
    } as never);

    expect((sendTicketCreateEmail as unknown as Mock).mock.calls[0][0]).toMatchObject({
      email: "staff@victim.test",
      orgId: ORG,
    });
    expect((addZapierTriggerToQueue as unknown as Mock).mock.calls[0][2]).toBe(ORG);
  });

  // NOTE: labels ARE checked against the card's board — the one ownership
  // check in the module, and the counter-example to the rest.
  test("refuses labels that belong to another board", async () => {
    db.ticketBoardLabel.findMany.mockResolvedValueOnce([
      { id: "l-1", ticketBoardId: "some-other-board" },
    ]);

    await expect(
      createCard({
        title: "T",
        ticketColumnId: OWN_COLUMN,
        type: "CUSTOM",
        orgId: ORG,
        labelIds: ["l-1"],
      } as never),
    ).rejects.toThrow("Invalid labelIds for this board");
  });

  test("refuses a label id that does not resolve", async () => {
    db.ticketBoardLabel.findMany.mockResolvedValueOnce([]);

    await expect(
      createCard({
        title: "T",
        ticketColumnId: OWN_COLUMN,
        type: "CUSTOM",
        orgId: ORG,
        labelIds: ["l-1"],
      } as never),
    ).rejects.toThrow("Invalid labelIds for this board");
  });

  // Assignees used not to be checked the way labels are: any user id was written,
  // and on update the newly assigned users were emailed and messaged about a board
  // they cannot open. They must be on one of the board's teams now.
  test("refuses an assignee who is not on one of the board's teams", async () => {
    db.teamMember.findMany.mockResolvedValueOnce([]);

    await expect(
      createCard({
        title: "T",
        ticketColumnId: OWN_COLUMN,
        type: "CUSTOM",
        orgId: ORG,
        assignees: [{ assigneeId: "an-outsider" }],
      } as never),
    ).rejects.toThrow(/members of this board/);

    expect(db.ticketCard.create).not.toHaveBeenCalled();
  });

  test("accepts an assignee who is on one of them", async () => {
    db.teamMember.findMany.mockResolvedValueOnce([{ userId: USER }]);

    await createCard({
      title: "T",
      ticketColumnId: OWN_COLUMN,
      type: "CUSTOM",
      orgId: ORG,
      assignees: [{ assigneeId: USER }],
    } as never);

    expect(db.ticketCard.create.mock.calls[0][0].data.assignees).toEqual({
      create: [{ assigneeId: USER }],
    });
  });

  test("places the card at the end of the column", async () => {
    db.ticketCard.findFirst.mockResolvedValueOnce({ order: 4 });

    await createCard({
      title: "T",
      ticketColumnId: OWN_COLUMN,
      type: "CUSTOM",
      orgId: ORG,
    } as never);

    expect(db.ticketCard.create.mock.calls[0][0].data.order).toBe(5);
  });

  test("defaults the priority to MEDIUM", async () => {
    await createCard({
      title: "T",
      ticketColumnId: OWN_COLUMN,
      type: "CUSTOM",
      orgId: ORG,
    } as never);

    expect(db.ticketCard.create.mock.calls[0][0].data.priority).toBe("MEDIUM");
  });

  test("logs an ADDED_CARD activity", async () => {
    await createCard({
      title: "T",
      ticketColumnId: OWN_COLUMN,
      type: "CUSTOM",
      orgId: ORG,
      userId: USER,
    } as never);

    expect(db.ticketActivity.create.mock.calls[0][0].data).toMatchObject({
      type: "ADDED_CARD",
      userId: USER,
    });
  });

  // A column that does not exist used to make the service resolve undefined, which
  // the handler sent as a 201 with an empty body — the caller was told a card had
  // been created that does not exist.
  test("answers 400 for a column that does not exist", async () => {
    db.ticketColumn.findUnique.mockResolvedValueOnce(null);
    const rep = reply();

    await createCardHandler(
      request({ body: { title: "T", ticketColumnId: VICTIM_COLUMN, type: "CUSTOM" } }),
      rep,
    );

    expect(db.ticketCard.create).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 400, body: { message: "That column does not exist" } });
  });
});

// ===========================================================================
// updateCard — the contact link
// ===========================================================================

describe("updateCard", () => {
  const previous = (over: any = {}) => ({
    assignees: [],
    attachments: [],
    contactId: null,
    title: "T",
    description: "d",
    priority: "MEDIUM",
    labels: [],
    deadline: null,
    checklists: null,
    ticketColumn: { ticketBoardId: BOARD },
    ...over,
  });

  // contactId used to be written straight through, while the labelIds beside it were
  // checked against the card's board — so a user could link a contact from any
  // organisation to a card on their own board and read that contact's name, phone,
  // consent and last-message timestamp back out of the card.
  test("refuses a contact from another organisation", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous());
    db.contact.findFirst.mockResolvedValueOnce(null);

    await expect(
      updateCard(CARD, { id: CARD, contactId: VICTIM_CONTACT } as never, USER, ORG),
    ).rejects.toThrow(/does not belong to this organisation/);

    expect(db.ticketCard.update).not.toHaveBeenCalled();
  });

  test("checks the contact against the caller's own org", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous());
    db.contact.findFirst.mockResolvedValueOnce({ id: OWN_CONTACT });

    await updateCard(CARD, { id: CARD, contactId: OWN_CONTACT } as never, USER, ORG);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({ id: OWN_CONTACT, orgId: ORG });
    expect(db.ticketCard.update.mock.calls[0][0].data.contactId).toBe(OWN_CONTACT);
  });

  test("the read side returns the linked contact's phone and consent", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce({
      id: CARD,
      waAutomatedReplyMessageId: null,
      labels: [],
    });

    await getCardById(CARD);

    expect(db.ticketCard.findUnique.mock.calls[0][0].include.contact.select).toEqual({
      id: true,
      name: true,
      phone: true,
      lastReceivedMessageTimeStamp: true,
      consent: true,
    });
  });

  test("the schema accepts any uuid as the contact id", () => {
    expect(updateCardRequestSchema.safeParse({ id: CARD, contactId: VICTIM_CONTACT }).success).toBe(
      true,
    );
  });

  test("labels are still checked against the card's own board", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous());
    db.ticketBoardLabel.findMany.mockResolvedValueOnce([{ id: "l-1", ticketBoardId: "elsewhere" }]);

    await expect(
      updateCard(CARD, { id: CARD, labelIds: ["l-1"] } as never, USER, ORG),
    ).rejects.toThrow("Invalid labelIds for this board");
  });

  test("a null labelIds clears every label", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous());

    await updateCard(CARD, { id: CARD, labelIds: null } as never, USER, ORG);

    expect(db.ticketCard.update.mock.calls[0][0].data.labels).toEqual({ deleteMany: {} });
  });

  // Assignees were replaced wholesale with no membership check, and the newly
  // assigned were then emailed and messaged.
  test("refuses assignees who are not on the board's teams", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous());
    db.teamMember.findMany.mockResolvedValueOnce([]);

    await expect(
      updateCard(CARD, { id: CARD, assignedToIds: ["an-outsider"] } as never, USER, ORG),
    ).rejects.toThrow(/members of this board/);

    expect(db.ticketCard.update).not.toHaveBeenCalled();
  });

  test("replaces them wholesale once they check out", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous());
    db.teamMember.findMany.mockResolvedValueOnce([{ userId: USER }]);

    await updateCard(CARD, { id: CARD, assignedToIds: [USER] } as never, USER, ORG);

    expect(db.ticketCard.update.mock.calls[0][0].data.assignees).toEqual({
      deleteMany: {},
      createMany: { skipDuplicates: true, data: [{ assigneeId: USER }] },
    });
  });

  test("only logs an edit when a tracked field actually changed", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous({ title: "T" }));

    await updateCard(CARD, { id: CARD, title: "T" } as never, USER, ORG);

    expect(
      db.ticketActivity.create.mock.calls.filter((c: any) => c[0].data.type === "EDITED_CARD"),
    ).toHaveLength(0);
  });

  test("logs a priority change with both values", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous({ priority: "LOW" }));

    await updateCard(CARD, { id: CARD, priority: "HIGH" } as never, USER, ORG);

    const activity = db.ticketActivity.create.mock.calls.find(
      (c: any) => c[0].data.type === "CHANGED_PRIORITY",
    );
    expect(activity[0].data.details).toEqual({ fromPriority: "LOW", toPriority: "HIGH" });
  });

  test("records each added attachment key separately", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(previous({ attachments: ["old"] }));

    await updateCard(
      CARD,
      { id: CARD, attachments: ["old", "new-1", "new-2"] } as never,
      USER,
      ORG,
    );

    const added = db.ticketActivity.create.mock.calls.filter(
      (c: any) => c[0].data.type === "ADDED_ATTACHMENT",
    );
    expect(added.map((c: any) => c[0].data.details.key)).toEqual(["new-1", "new-2"]);
  });
});

// ===========================================================================
// moveCard — the target column
// ===========================================================================

describe("moveCard", () => {
  beforeEach(() => {
    db.ticketCard.findUnique.mockResolvedValue({
      ticketColumnId: OWN_COLUMN,
      order: 0,
      title: "T",
      ticketColumn: { title: "To Do" },
    });
  });

  // verifyCardAccess checks the board the card is CURRENTLY on; the destination used
  // to be written with no lookup, so a card — with its checklists, attachments,
  // comments and linked contact — could be moved onto any board on the platform.
  test("refuses a destination board the caller is not on", async () => {
    db.ticketColumn.findUnique.mockResolvedValueOnce({ ticketBoardId: VICTIM_BOARD });
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: "victim-team" }] });
    db.teamMember.findFirst.mockResolvedValueOnce(null);

    await expect(moveCard(CARD, VICTIM_COLUMN, USER, ORG)).rejects.toThrow(/destination board/);
    expect(db.ticketCard.update).not.toHaveBeenCalled();
  });

  test("resolves the destination column's board before moving", async () => {
    await moveCard(CARD, VICTIM_COLUMN, USER, ORG);

    expect(db.ticketColumn.findUnique).toHaveBeenCalled();
    expect(db.ticketCard.update.mock.calls[0][0].data.ticketColumnId).toBe(VICTIM_COLUMN);
  });

  test("returns null for a card that does not exist", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce(null);

    await expect(moveCard(CARD, OWN_COLUMN, USER, ORG)).resolves.toBeNull();
    expect(db.ticketCard.update).not.toHaveBeenCalled();
  });

  test("appends to the end of the target column when no order is given", async () => {
    db.ticketCard.findFirst.mockResolvedValueOnce({ order: 7 });

    await moveCard(CARD, VICTIM_COLUMN, USER, ORG);

    expect(db.ticketCard.update.mock.calls[0][0].data.order).toBe(8);
  });

  test("closes the gap in the source column when the column changed", async () => {
    await moveCard(CARD, VICTIM_COLUMN, USER, ORG);

    const sql = db.$executeRaw.mock.calls[0][0].join("?");
    expect(sql).toContain(`SET "order" = "order" - 1`);
    expect(sql).toContain(`"ticketColumnId" =`);
  });

  // Only the first statement used to cast its bound column id to ::uuid; the other
  // three relied on the driver inferring the type of a uuid comparison, and the one
  // explicit cast is evidence somebody hit that and fixed it in one place.
  test("every raw statement casts its bound id", async () => {
    await moveCard(CARD, VICTIM_COLUMN, USER, ORG, 2);

    for (const call of db.$executeRaw.mock.calls) {
      expect(call[0].join("?")).toContain("::uuid");
    }
  });

  test("raises the Zapier moved event only on a column change", async () => {
    await moveCard(CARD, VICTIM_COLUMN, USER, ORG);
    expect(addZapierTriggerToQueue).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    db.ticketCard.findUnique.mockResolvedValue({
      ticketColumnId: OWN_COLUMN,
      order: 0,
      title: "T",
      ticketColumn: { title: "To Do" },
    });
    db.ticketCard.update.mockResolvedValue({ id: CARD, ticketColumnId: OWN_COLUMN });
    db.ticketActivity.create.mockResolvedValue({ id: "a" });
    db.$executeRaw.mockResolvedValue(1);

    await moveCard(CARD, OWN_COLUMN, USER, ORG, 3);
    expect(addZapierTriggerToQueue).not.toHaveBeenCalled();
  });

  test("logs a MOVED_CARD activity naming both columns", async () => {
    await moveCard(CARD, VICTIM_COLUMN, USER, ORG);

    const activity = db.ticketActivity.create.mock.calls.find(
      (c: any) => c[0].data.type === "MOVED_CARD",
    );
    expect(activity[0].data.details).toMatchObject({
      fromColumnId: OWN_COLUMN,
      toColumnId: VICTIM_COLUMN,
    });
  });
});

// ===========================================================================
// reorderCards — the unguarded bulk write
// ===========================================================================

describe("reorderCards", () => {
  // NOTE: PUT /reorder carries no preHandler and the service takes bare card
  // ids, so nothing anywhere establishes which board these cards are on.
  test("updates cards by id alone, with no board condition", async () => {
    db.ticketCard.findUnique.mockResolvedValue({ order: 0 });

    await reorderCards([{ id: CARD, order: 5 }]);

    expect(db.ticketCard.update.mock.calls[0][0]).toEqual({
      where: { id: CARD },
      data: { order: 5 },
    });
  });

  test("skips a card whose order already matches", async () => {
    db.ticketCard.findUnique.mockResolvedValue({ order: 5 });

    const res = await reorderCards([{ id: CARD, order: 5 }]);

    expect(db.ticketCard.update).not.toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  test("ignores a card that does not exist rather than failing", async () => {
    db.ticketCard.findUnique.mockResolvedValue(null);

    await expect(reorderCards([{ id: CARD, order: 5 }])).resolves.toEqual([]);
  });

  test("runs the whole batch in one transaction", async () => {
    db.ticketCard.findUnique.mockResolvedValue({ order: 0 });

    await reorderCards([{ id: CARD, order: 1 }]);

    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  test("the handler passes the body's card list straight through", async () => {
    db.ticketCard.findUnique.mockResolvedValue({ order: 0 });
    const rep = reply();

    await reorderCardsHandler(request({ body: { cards: [{ id: CARD, order: 9 }] } }), rep);

    expect(db.ticketCard.update.mock.calls[0][0].where).toEqual({ id: CARD });
    expect(answer(rep).code).toBe(200);
  });
});

// ===========================================================================
// deleteCard and the activity trail
// ===========================================================================

describe("deleteCard", () => {
  test("deletes the card by id", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce({ title: "T", ticketColumnId: OWN_COLUMN });

    await deleteCard(CARD, USER);

    expect(db.ticketCard.delete).toHaveBeenCalledWith({ where: { id: CARD } });
  });

  // NOTE: the card is read "for activity log" and no activity is ever written,
  // and the userId parameter is unused — a deletion leaves no trace of who did
  // it, while every other operation on a card logs one.
  test("writes no activity record for the deletion", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce({ title: "T", ticketColumnId: OWN_COLUMN });

    await deleteCard(CARD, USER);

    expect(db.ticketActivity.create).not.toHaveBeenCalled();
  });

  test("returns null without deleting when the card is gone", async () => {
    await expect(deleteCard(CARD, USER)).resolves.toBeNull();
    expect(db.ticketCard.delete).not.toHaveBeenCalled();
  });
});

describe("getCardTeamMembersById", () => {
  test("binds the card id as a uuid and selects no email", async () => {
    await getCardTeamMembersById(CARD);

    const [strings, ...values] = db.$queryRaw.mock.calls[0];
    const sql = strings.join("?");
    expect(sql).toContain("::uuid");
    expect(sql).not.toContain("email");
    expect(values).toEqual([CARD]);
  });
});

// ===========================================================================
// verifyCardAccess
// ===========================================================================

describe("verifyCardAccess", () => {
  test("walks card to column to board and checks membership", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce({ ticketColumnId: OWN_COLUMN });
    db.ticketColumn.findUnique.mockResolvedValueOnce({ ticketBoardId: BOARD });
    db.ticketBoard.findUnique = vi.fn().mockResolvedValueOnce({ teams: [{ teamId: "t-1" }] });
    db.teamMember.findFirst.mockResolvedValueOnce({ id: "tm-1" });
    const rep = reply();

    await verifyCardAccess(request({ params: { id: CARD } }), rep);

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBe(USER);
    expect(rep.code).not.toHaveBeenCalled();
  });

  test("404s a card that does not exist", async () => {
    const rep = reply();

    await verifyCardAccess(request({ params: { id: CARD } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Card not found" } });
  });

  test("403s a caller who is not on the board", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce({ ticketColumnId: OWN_COLUMN });
    db.ticketColumn.findUnique.mockResolvedValueOnce({ ticketBoardId: BOARD });
    db.ticketBoard.findUnique.mockResolvedValueOnce({ teams: [{ teamId: "t-1" }] });
    db.teamMember.findFirst.mockResolvedValueOnce(null);
    const rep = reply();

    await verifyCardAccess(request({ params: { id: CARD } }), rep);

    expect(answer(rep)).toEqual({
      code: 403,
      body: { message: "You don't have access to this card" },
    });
  });

  // NOTE: it reads request.userId, which checkSession does set — the correct
  // property, unlike the label controller.
  test("reads the session property that exists", async () => {
    db.ticketCard.findUnique.mockResolvedValueOnce({ ticketColumnId: OWN_COLUMN });
    db.ticketColumn.findUnique.mockResolvedValueOnce({ ticketBoardId: BOARD });
    db.ticketBoard.findUnique = vi.fn().mockResolvedValueOnce({ teams: [{ teamId: "t-1" }] });

    await verifyCardAccess(request({ params: { id: CARD } }), reply());

    expect(db.teamMember.findFirst.mock.calls[0][0].where.userId).toBeDefined();
  });
});

// ===========================================================================
// The by-column listing route
// ===========================================================================

describe("the cards-by-column route", () => {
  // NOTE: the route path is /column/:columnId but the params schema requires a
  // field named ticketColumnId, so Fastify's validation of every request to
  // this route fails before any handler or preHandler runs.
  test("the params schema names a field the route path does not provide", () => {
    expect(columnIdParamsSchema.safeParse({ columnId: OWN_COLUMN }).success).toBe(false);
    expect(columnIdParamsSchema.safeParse({ ticketColumnId: OWN_COLUMN }).success).toBe(true);
  });

  test("the handler reads the name the schema uses, not the one the path binds", async () => {
    const rep = reply();

    await getAllCardsHandler(request({ params: { columnId: OWN_COLUMN } }), rep);

    // ticketColumnId is undefined, so the query filters on nothing.
    expect(db.ticketCard.findMany.mock.calls[0][0].where).toEqual({ ticketColumnId: undefined });
    expect(answer(rep).code).toBe(200);
  });

  // The path used to bind ":columnId" while the schema, the handler and
  // verifyColumnAccess all expect "ticketColumnId", so every request to this route
  // failed validation before reaching any of them.
  test("the route binds the parameter name the schema and handler use", async () => {
    const { srv, routes } = fakeServer();

    await cardRoutes(srv);

    expect(routes.find((r) => r.url === "/column/:columnId")).toBeUndefined();
    const byColumn = routes.find((r) => r.url === "/column/:ticketColumnId");
    expect(byColumn.opts.schema.params).toBe(columnIdParamsSchema);
    expect(byColumn.opts.preHandler).toBeDefined();
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

function fakeServer() {
  const routes: any[] = [];
  const hooks: any[] = [];
  const srv: any = {
    addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  return { srv, routes, hooks };
}

describe("cardRoutes", () => {
  test("adds a second checkSession on top of the parent's", async () => {
    const { srv, hooks } = fakeServer();

    await cardRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("preHandler");
  });

  test("guards the by-id routes with verifyCardAccess", async () => {
    const { srv, routes } = fakeServer();

    await cardRoutes(srv);

    const guarded = routes.filter((r) => r.opts?.preHandler?.includes(verifyCardAccess));
    expect(guarded.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET /:id",
      "GET /:id/team-members",
      "PUT /:id",
      "PUT /:id/move",
      "DELETE /:id",
      "GET /:id/activities",
    ]);
  });

  // Create and reorder take their target from the BODY, and used to be exactly the
  // two routes with no access check — so any authenticated user could add a card to
  // any column on the platform, or shuffle any board.
  test("guards create and reorder from the body instead", async () => {
    const { srv, routes } = fakeServer();

    await cardRoutes(srv);

    const open = routes.filter((r) => !r.opts?.preHandler);
    expect(open).toEqual([]);
  });

  test("no route declares a role requirement", async () => {
    const { srv, routes } = fakeServer();

    await cardRoutes(srv);

    for (const r of routes) {
      expect(JSON.stringify(r.opts?.preHandler ?? [])).not.toContain("role");
    }
  });
});
