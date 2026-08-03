import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.FRONTEND_URL = "https://app.test.example";
});

vi.mock("../../utils/prisma.js", () => ({
  default: { ticketComment: { create: vi.fn(), delete: vi.fn() } },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/redisConnection.js", () => ({ notificationQueue: { add: vi.fn() } }));
vi.mock("../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({ sendTextMessage: vi.fn() }));
vi.mock("../contact/contact.service.js", () => ({ getContactByPhoneNumberAndOrgId: vi.fn() }));
vi.mock("../loyalty/util.js", () => ({ parsePhoneforWa: vi.fn((p: string) => p) }));
vi.mock("../../utils/checkSession.js", () => ({ checkSession: vi.fn() }));
vi.mock("../../utils/permissions.js", () => ({
  requireFeature: vi.fn((f) => Object.assign(vi.fn(), { feature: f })),
  TeamFeature: { tickets: "tickets" },
}));
vi.mock("./ticketColumn/column.route.js", () => ({ columnRoutes: vi.fn() }));
vi.mock("./ticketCard/card.route.js", () => ({ cardRoutes: vi.fn() }));
vi.mock("./ticketBoard/board.route.js", () => ({ boardRoutes: vi.fn() }));
vi.mock("./ticketBoardLabel/ticketlabel.route.js", () => ({ default: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { notificationQueue } from "../../utils/redisConnection.js";
import { sendTextMessage } from "../whatsapp/whatsappSurvey/wasurvey.service.js";
import { getContactByPhoneNumberAndOrgId } from "../contact/contact.service.js";
import { parsePhoneforWa } from "../loyalty/util.js";
import {
  createComment,
  deleteComment,
  sendTicketAssignedEmail,
  sendTicketAssignedWaMessage,
  sendTicketCreateEmail,
  sendTicketCreateWaMessage,
} from "./ticket.service.js";
import { createCommentHandler, deleteCommentHandler } from "./ticket.controller.js";
import { ticketRoutes } from "./ticket.route.js";
import {
  createCommentRequestSchema,
  createTicketRequestSchema,
  idParamsSchema,
  updateStatusRequestSchema,
  updateTicketRequestSchema,
} from "./ticket.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { ticketComment: Record<string, Mock> };

const USER = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";
const OWN_CARD = "3f8a1e2c-5b7d-4c9e-8a1b-2d3e4f5a6b7c";
const VICTIM_CARD = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const COMMENT = "7c6b5a4f-3e2d-4b1a-9c8d-7e6f5a4b3c2d";

const NOW = new Date(2026, 6, 29, 12, 0, 0).getTime();

const notify = {
  phone: "919876543210",
  orgId: ORG,
  board_name: "Support",
  column_name: "To Do",
  id: OWN_CARD,
  ticketId: "TKT-42",
};

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // clearAllMocks keeps implementations but drops queued values.
  db.ticketComment.create.mockResolvedValue({ id: COMMENT, text: "hi" });
  db.ticketComment.delete.mockResolvedValue({ id: COMMENT });
  (notificationQueue.add as unknown as Mock).mockResolvedValue({ id: "job-1" });
  (sendTextMessage as unknown as Mock).mockResolvedValue(undefined);
  (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValue(null);
  (parsePhoneforWa as unknown as Mock).mockImplementation((p: string) => p);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// createComment — the card comes from the body, not the path
// ===========================================================================

describe("createComment", () => {
  test("stores the comment against the card and author", async () => {
    await createComment({ ticketCardId: OWN_CARD, msg: "hi" }, USER);

    expect(db.ticketComment.create).toHaveBeenCalledWith({
      data: { text: "hi", createdById: USER, ticketCardId: OWN_CARD },
    });
  });

  // NOTE: the route is POST /:id/comment, but nothing reads request.params.id —
  // the target card is request.body.ticketCardId. The path parameter is inert.
  test("the handler ignores the path id entirely", async () => {
    const rep = reply();

    await createCommentHandler(
      {
        params: { id: OWN_CARD },
        body: { ticketCardId: VICTIM_CARD, msg: "planted" },
        userId: USER,
      } as never,
      rep,
    );

    expect(db.ticketComment.create.mock.calls[0][0].data.ticketCardId).toBe(VICTIM_CARD);
    expect(answer(rep).code).toBe(201);
  });

  // NOTE: the route's access check is commented out (ticket.route.ts:28) and
  // there is nothing else — no board lookup, no membership test, no org.
  test("nothing resolves the card's board before writing", async () => {
    await createComment({ ticketCardId: VICTIM_CARD, msg: "planted" }, USER);

    expect(db.ticketComment.create).toHaveBeenCalledOnce();
  });

  test("never consults the session org", async () => {
    const req: any = {
      params: { id: OWN_CARD },
      body: { ticketCardId: VICTIM_CARD, msg: "x" },
      userId: USER,
      get user() {
        throw new Error("request.user was read");
      },
    };

    await expect(createCommentHandler(req, reply())).resolves.toBeUndefined();
  });

  // NOTE: the comment is attributed to the caller's own user id, so a planted
  // comment carries a real name and email when the card is read back.
  test("attributes the comment to the caller", async () => {
    await createComment({ ticketCardId: VICTIM_CARD, msg: "x" }, USER);

    expect(db.ticketComment.create.mock.calls[0][0].data.createdById).toBe(USER);
  });

  test("the body schema puts no bound on the message", () => {
    expect(createCommentRequestSchema.safeParse({ ticketCardId: OWN_CARD, msg: "" }).success).toBe(
      true,
    );
    expect(
      createCommentRequestSchema.safeParse({ ticketCardId: OWN_CARD, msg: "x".repeat(100_000) })
        .success,
    ).toBe(true);
  });

  test("the body schema accepts any string as the card id", () => {
    expect(
      createCommentRequestSchema.safeParse({ ticketCardId: "not-a-uuid", msg: "x" }).success,
    ).toBe(true);
  });

  // NOTE: nothing checks the card exists, so a bad id reaches the database and
  // comes back as a foreign-key error.
  test("a card that does not exist surfaces as a 500 carrying the driver message", async () => {
    db.ticketComment.create.mockRejectedValueOnce(
      new Error("Foreign key constraint failed on the field: `ticketCardId`"),
    );
    const rep = reply();

    await createCommentHandler(
      {
        params: { id: OWN_CARD },
        body: { ticketCardId: VICTIM_CARD, msg: "x" },
        userId: USER,
      } as never,
      rep,
    );

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body.message).toContain("ticketCardId");
  });
});

// ===========================================================================
// deleteComment — the module's one ownership check
// ===========================================================================

describe("deleteComment", () => {
  // NOTE: the counter-example. createdById is in the where, so a comment can
  // only be deleted by its author.
  test("constrains the delete to the caller's own comment", async () => {
    await deleteComment(COMMENT, USER);

    expect(db.ticketComment.delete).toHaveBeenCalledWith({
      where: { id: COMMENT, createdById: USER },
    });
  });

  test("answers 204 with no body", async () => {
    const rep = reply();

    await deleteCommentHandler({ params: { id: COMMENT }, userId: USER } as never, rep);

    expect(answer(rep)).toEqual({ code: 204, body: undefined });
  });

  // NOTE: createdById is not part of any unique constraint, so it rides along
  // as a filter — a miss raises P2025, which the handler turns into a 500. A
  // caller cannot tell "not yours" from "does not exist" from "server broke".
  test("someone else's comment answers 500, not 403", async () => {
    db.ticketComment.delete.mockRejectedValueOnce(
      Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }),
    );
    const rep = reply();

    await deleteCommentHandler({ params: { id: COMMENT }, userId: USER } as never, rep);

    expect(answer(rep).code).toBe(500);
    expect(answer(rep).body.message).toContain("Record to delete does not exist");
  });

  // NOTE: the delete route declares no schema at all, so the id reaches Prisma
  // as whatever string the path carried.
  test("a non-uuid id reaches the query unvalidated", async () => {
    await deleteComment("not-a-uuid", USER);

    expect(db.ticketComment.delete.mock.calls[0][0].where.id).toBe("not-a-uuid");
  });
});

// ===========================================================================
// The WhatsApp notifications
// ===========================================================================

describe("the WhatsApp ticket notifications", () => {
  interface ContactFixture {
    id: string;
    phone: string;
    orgId: string;
    lastReceivedMessageTimeStamp: Date | null;
  }

  const contact = (over: Record<string, unknown> = {}) => {
    const base: ContactFixture = {
      id: "c-1",
      phone: notify.phone,
      orgId: ORG,
      lastReceivedMessageTimeStamp: null,
    };
    return { ...base, ...over };
  };

  // NOTE: the recipient is a staff member, but the lookup is against the
  // Contact table — so the notification only sends when that person's phone
  // also exists as a customer contact of the same org.
  test("aborts when the staff member is not also a contact", async () => {
    await sendTicketAssignedWaMessage(notify);

    expect(getContactByPhoneNumberAndOrgId).toHaveBeenCalledWith(notify.phone, ORG);
    expect(sendTextMessage).not.toHaveBeenCalled();
  });

  // NOTE: lastReceivedMessageTimeStamp records when the org last received a
  // message FROM that number — dashboard.service.ts:20 counts it as the active
  // 24-hour window. This guard aborts while that window is OPEN and proceeds
  // once it has CLOSED, which is the inverse of the WhatsApp free-form rule.
  test("refuses to send inside the twenty-four hour window", async () => {
    (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValueOnce(
      contact({ lastReceivedMessageTimeStamp: new Date(NOW - 2 * 60 * 60 * 1000) }),
    );

    await sendTicketAssignedWaMessage(notify);

    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(log.trace).toHaveBeenCalled();
  });

  test("sends once the window has closed", async () => {
    (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValueOnce(
      contact({ lastReceivedMessageTimeStamp: new Date(NOW - 30 * 60 * 60 * 1000) }),
    );

    await sendTicketAssignedWaMessage(notify);

    expect(sendTextMessage).toHaveBeenCalledOnce();
  });

  test("sends to a contact that has never messaged the org at all", async () => {
    (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValueOnce(contact());

    await sendTicketCreateWaMessage(notify);

    expect(sendTextMessage).toHaveBeenCalledOnce();
  });

  test("the boundary of exactly twenty-four hours sends", async () => {
    (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValueOnce(
      contact({ lastReceivedMessageTimeStamp: new Date(NOW - 24 * 60 * 60 * 1000) }),
    );

    await sendTicketAssignedWaMessage(notify);

    expect(sendTextMessage).toHaveBeenCalledOnce();
  });

  test("aborts when the phone cannot be parsed, before touching the database", async () => {
    (parsePhoneforWa as unknown as Mock).mockReturnValueOnce(null);

    await sendTicketAssignedWaMessage(notify);

    expect(getContactByPhoneNumberAndOrgId).not.toHaveBeenCalled();
    expect(sendTextMessage).not.toHaveBeenCalled();
  });

  test("marks the send as exempt from the conversation limit", async () => {
    (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValueOnce(contact());

    await sendTicketAssignedWaMessage(notify);

    expect((sendTextMessage as unknown as Mock).mock.calls[0][3]).toBe(true);
  });

  test("both notification bodies name the board, column and ticket", async () => {
    (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValue(contact());

    await sendTicketAssignedWaMessage(notify);
    await sendTicketCreateWaMessage(notify);

    for (const call of (sendTextMessage as unknown as Mock).mock.calls) {
      expect(call[2]).toContain("Support");
      expect(call[2]).toContain("To Do");
      expect(call[2]).toContain("TKT-42");
    }
  });

  // NOTE: the link in the WhatsApp body is a hardcoded rateup.app URL while the
  // email builds its link from FRONTEND_URL — the two disagree in any
  // environment that is not production.
  test("the WhatsApp link is hardcoded while the email link is configured", async () => {
    (getContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValueOnce(contact());

    await sendTicketAssignedWaMessage(notify);
    await sendTicketAssignedEmail({ ...notify, email: "staff@example.test" });

    expect((sendTextMessage as unknown as Mock).mock.calls[0][2]).toContain(
      "https://rateup.app/dashboard/tickets/",
    );
    const html = (notificationQueue.add as unknown as Mock).mock.calls[0][1].emailData.html;
    expect(html).toContain("https://app.test.example/dashboard/tickets/");
  });
});

// ===========================================================================
// The email notifications
// ===========================================================================

describe("the email ticket notifications", () => {
  test("queues one notification job per email", async () => {
    await sendTicketAssignedEmail({ ...notify, email: "staff@example.test" });

    expect(notificationQueue.add).toHaveBeenCalledOnce();
    const job = (notificationQueue.add as unknown as Mock).mock.calls[0][1];
    expect(job.emailData.to).toBe("staff@example.test");
    expect(job.emailData.subject).toContain("Ticket Assigned");
  });

  test("the created-ticket mail uses its own subject", async () => {
    await sendTicketCreateEmail({ ...notify, email: "staff@example.test" });

    expect((notificationQueue.add as unknown as Mock).mock.calls[0][1].emailData.subject).toBe(
      "Ticket Created",
    );
  });

  // NOTE: the plain-text part of the created-ticket mail says the ticket was
  // assigned to the recipient, which is not what happened.
  test("the created-ticket text part claims an assignment", async () => {
    await sendTicketCreateEmail({ ...notify, email: "staff@example.test" });

    expect((notificationQueue.add as unknown as Mock).mock.calls[0][1].emailData.text).toContain(
      "has been assigned to you",
    );
  });

  // NOTE: a queue failure is rethrown with the error concatenated onto a
  // string, discarding the original stack — the same shape as issues.txt 22.4.
  test("a queue failure rethrows a stringified error", async () => {
    (notificationQueue.add as unknown as Mock).mockRejectedValueOnce(new Error("redis down"));

    await expect(
      sendTicketAssignedEmail({ ...notify, email: "staff@example.test" }),
    ).rejects.toThrow("Email sending failed. E:Error: redis down");
  });

  test("the failure propagates to the caller rather than being swallowed", async () => {
    (notificationQueue.add as unknown as Mock).mockRejectedValueOnce(new Error("redis down"));

    await expect(
      sendTicketCreateEmail({ ...notify, email: "staff@example.test" }),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// The schemas
// ===========================================================================

describe("ticket.schema", () => {
  // NOTE: six of the eight exported schemas have no importer anywhere in src.
  // They describe a ticket with a status, a teamId and an assignedToId — a
  // model the module never implements; what it actually stores is kanban cards.
  test("only the comment and id schemas are wired to a route", async () => {
    const { srv, routes } = fakeServer();

    await ticketRoutes(srv);

    const schemas = routes.map((r) => r.opts?.schema?.body).filter(Boolean);
    expect(schemas).toEqual([createCommentRequestSchema]);
  });

  test("the dead create schema requires fields no route accepts", () => {
    expect(
      createTicketRequestSchema.safeParse({
        title: "x",
        priority: "LOW",
        teamId: "t",
        assignedToId: "u",
        firstComment: "c",
      }).success,
    ).toBe(true);
  });

  // NOTE: the dead status schema takes the caller's role from the request body.
  // Nothing uses it, but it records an intent worth not reviving.
  test("the dead status schema reads the caller's role from the body", () => {
    const parsed = updateStatusRequestSchema.safeParse({ status: "CLOSED", role: "SUPER_ADMIN" });

    expect(parsed.success).toBe(true);
    expect((parsed as any).data.role).toBe("SUPER_ADMIN");
  });

  test("the dead status schema rejects a role outside its two", () => {
    expect(updateStatusRequestSchema.safeParse({ status: "CLOSED", role: "MEMBER" }).success).toBe(
      false,
    );
  });

  test("the dead update schema carries a denormalised assignee name", () => {
    expect(
      updateTicketRequestSchema.safeParse({ assignedToId: "u", assignedToName: "Ann" }).success,
    ).toBe(true);
  });

  test("the id params schema accepts any string, not a uuid", () => {
    expect(idParamsSchema.safeParse({ id: "not-a-uuid" }).success).toBe(true);
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

function fakeServer() {
  const routes: any[] = [];
  const hooks: any[] = [];
  const registered: any[] = [];
  const srv: any = {
    addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
    register: vi.fn((plugin, opts) => registered.push({ plugin, opts })),
    get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
    post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
    put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
    delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
  };
  return { srv, routes, hooks, registered };
}

describe("ticketRoutes", () => {
  test("adds checkSession and the tickets feature gate to the whole tree", async () => {
    const { srv, hooks } = fakeServer();

    await ticketRoutes(srv);

    expect(hooks).toHaveLength(2);
    expect(hooks.map((h) => h.name)).toEqual(["preHandler", "preHandler"]);
  });

  test("registers the four subtrees", async () => {
    const { srv, registered } = fakeServer();

    await ticketRoutes(srv);

    expect(registered.map((r) => r.opts?.prefix)).toEqual([
      undefined,
      "boards",
      "columns",
      "cards",
    ]);
  });

  // NOTE: the label subtree is registered with no prefix, so its routes land at
  // the ticket root — which is why it declares its own /boards/... paths.
  test("the label subtree takes no prefix", async () => {
    const { srv, registered } = fakeServer();

    await ticketRoutes(srv);

    expect(registered[0].opts).toBeUndefined();
  });

  test("registers exactly two comment routes", async () => {
    const { srv, routes } = fakeServer();

    await ticketRoutes(srv);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /:id/comment",
      "DELETE /:id/comment",
    ]);
  });

  // NOTE: every other route file in the module puts a verify*Access preHandler
  // on anything with a path id. Here it is present as a comment and absent as
  // code.
  test("the create route's access check is commented out", async () => {
    const { srv, routes } = fakeServer();

    await ticketRoutes(srv);

    const create = routes.find((r) => r.method === "POST");
    expect(create.opts.preHandler).toBeUndefined();
    expect(Object.keys(create.opts)).toEqual(["schema"]);
  });

  test("the delete route declares no options at all", async () => {
    const { srv, routes } = fakeServer();

    await ticketRoutes(srv);

    const del = routes.find((r) => r.method === "DELETE");
    expect(del.opts).toBe(deleteCommentHandler);
    expect(del.handler).toBeUndefined();
  });

  test("neither comment route validates its path parameter", async () => {
    const { srv, routes } = fakeServer();

    await ticketRoutes(srv);

    for (const r of routes) {
      expect(r.opts?.schema?.params).toBeUndefined();
    }
  });
});
