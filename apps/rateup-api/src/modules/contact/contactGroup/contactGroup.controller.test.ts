import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../generated/prisma/client.js", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./contactGroup.service.js", () => ({
  addExistingContactsToGroup: vi.fn(),
  addExistingContactsToMultipleGroups: vi.fn(),
  addNewContactsToGroup: vi.fn(),
  createContactGroup: vi.fn(),
  deleteContactGroup: vi.fn(),
  deleteManyContactGroups: vi.fn(),
  getContactGroupById: vi.fn(),
  getContactGroupsByContactId: vi.fn(),
  getContactGroupsByOrgId: vi.fn(),
  getContactGroupsByTeamId: vi.fn(),
  getContactsByContactGroupIdWithPagination: vi.fn(),
  removeContactsFromGroup: vi.fn(),
  updateContactGroup: vi.fn(),
  updateContactGroupsForContact: vi.fn(),
}));

vi.mock("../contact.service.js", () => ({
  createMultipleContacts: vi.fn(),
  importCSVContacts: vi.fn(),
}));

import { Prisma } from "../../../../generated/prisma/client.js";
import {
  addExistingContactsToGroup,
  addExistingContactsToMultipleGroups,
  addNewContactsToGroup,
  createContactGroup,
  deleteContactGroup,
  deleteManyContactGroups,
  getContactGroupById,
  getContactGroupsByContactId,
  getContactGroupsByOrgId,
  getContactGroupsByTeamId,
  getContactsByContactGroupIdWithPagination,
  removeContactsFromGroup,
  updateContactGroup,
  updateContactGroupsForContact,
} from "./contactGroup.service.js";
import { createMultipleContacts, importCSVContacts } from "../contact.service.js";
import { ContactGroupNotFoundError } from "./contactGroup.errors.js";
import {
  addExistingContactsToGroupHandler,
  addExistingContactsToMultipleGroupsHandler,
  addNewContactsfromCSVToGroupHandler,
  addNewContactsToGroupHandler,
  createContactGroupHandler,
  deleteContactGroupHandler,
  deleteManyContactGroupsHandler,
  getContactGroupsByContactIdHandler,
  getContactGroupsHandler,
  getContactsByContactGroupIdHandler,
  removeContactsFromGroupHandler,
  updateContactGroupHandler,
  updateContactGroupsForContactHandler,
} from "./contactGroup.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";

const FakePrismaKnownError = (Prisma as any).PrismaClientKnownRequestError as new (
  code: string,
) => Error;

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, params: {}, query: {}, body: {}, ...over };
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// getContactGroupsHandler — one endpoint, three lookups
// ===========================================================================

describe("getContactGroupsHandler", () => {
  test("a contactGroupId in the query wins over everything else", async () => {
    (getContactGroupById as Mock).mockResolvedValue({ id: "g1" });
    const rep = reply();

    await getContactGroupsHandler(request({ query: { contactGroupId: "g1", teamId: "t1" } }), rep);

    expect(getContactGroupById).toHaveBeenCalledWith("g1", ORG);
    expect(getContactGroupsByTeamId).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({ code: 200, body: { id: "g1" } });
  });

  // Neither of the first two branches involved the caller's org — the org check
  // sat AFTER them, so a contactGroupId or a teamId in the query short-circuited
  // straight to an unscoped lookup and never reached it.
  test("a teamId in the query is scoped to the caller's org", async () => {
    (getContactGroupsByTeamId as Mock).mockResolvedValue([]);

    await getContactGroupsHandler(request({ query: { teamId: "t-other-org" } }), reply());

    expect(getContactGroupsByTeamId).toHaveBeenCalledWith("t-other-org", ORG);
  });

  test("answers 404 for a group belonging to another org", async () => {
    (getContactGroupById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getContactGroupsHandler(request({ query: { contactGroupId: "g-other-org" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Contact group not found" } });
  });

  // The org check now runs before every branch, not just the fallback.
  test("refuses a by-id lookup when the session carries no org", async () => {
    const rep = reply();

    await getContactGroupsHandler(request({ user: {}, query: { contactGroupId: "g1" } }), rep);

    expect(answer(rep)).toEqual({ code: 403, body: { message: "Not authorized" } });
    expect(getContactGroupById).not.toHaveBeenCalled();
  });

  test("falls back to listing the caller's own org", async () => {
    (getContactGroupsByOrgId as Mock).mockResolvedValue([{ id: "g1" }]);
    const rep = reply();

    await getContactGroupsHandler(request({ query: { type: "NORMAL" } }), rep);

    expect(getContactGroupsByOrgId).toHaveBeenCalledWith(ORG, "NORMAL");
    expect(answer(rep).code).toBe(200);
  });

  test("refuses the fallback when the session carries no org", async () => {
    const rep = reply();

    await getContactGroupsHandler(request({ user: {} }), rep);

    expect(answer(rep)).toEqual({ code: 403, body: { message: "Not authorized" } });
  });

  test("reports a failure as a 500", async () => {
    (getContactGroupsByOrgId as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getContactGroupsHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

describe("getContactsByContactGroupIdHandler", () => {
  test("passes the group id and the paging through", async () => {
    (getContactsByContactGroupIdWithPagination as Mock).mockResolvedValue({
      group: [],
      totalCount: 0,
    });
    const rep = reply();

    await getContactsByContactGroupIdHandler(
      request({ params: { contactGroupId: "g1" }, query: { page: 1 } }),
      rep,
    );

    expect(getContactsByContactGroupIdWithPagination).toHaveBeenCalledWith("g1", ORG, {
      page: 1,
    });
    expect(answer(rep).code).toBe(200);
  });

  test("reports a failure as a 500", async () => {
    (getContactsByContactGroupIdWithPagination as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getContactsByContactGroupIdHandler(request({ params: { contactGroupId: "g1" } }), rep);

    expect(answer(rep).code).toBe(500);
  });
});

// ===========================================================================
// create / update / delete
// ===========================================================================

describe("createContactGroupHandler", () => {
  test("creates the group from the body and answers 201", async () => {
    (createContactGroup as Mock).mockResolvedValue({ id: "g1" });
    const rep = reply();

    await createContactGroupHandler(request({ body: { name: "VIPs", teamId: "t1" } }), rep);

    expect(createContactGroup).toHaveBeenCalledWith({ name: "VIPs", teamId: "t1" }, ORG);
    expect(answer(rep)).toEqual({ code: 201, body: { id: "g1" } });
  });

  // The duplicate branch had no `return` and the generic 500 sat outside the `if`,
  // so a name clash sent the helpful message and then a second, generic 500 on the
  // same reply — which fastify rejects as FST_ERR_REP_ALREADY_SENT, filling the log
  // on an ordinary user mistake. It also answered 500 for a name clash where the
  // label controller beside it uses 409.
  test("answers a duplicate group name once, as a 409", async () => {
    (createContactGroup as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await createContactGroupHandler(request({ body: { name: "VIPs" } }), rep);

    expect(rep.send).toHaveBeenCalledTimes(1);
    expect(answer(rep)).toEqual({
      code: 409,
      body: { error: "Contact group with this name already exist in the provided team" },
    });
  });

  test("reports any other failure as a single 500", async () => {
    (createContactGroup as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await createContactGroupHandler(request({ body: {} }), rep);

    expect(rep.send).toHaveBeenCalledTimes(1);
    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

describe("updateContactGroupHandler", () => {
  test("updates the group named in the path", async () => {
    (updateContactGroup as Mock).mockResolvedValue({ id: "g1" });
    const rep = reply();

    await updateContactGroupHandler(
      request({ params: { contactGroupId: "g1" }, body: { name: "New" } }),
      rep,
    );

    expect(updateContactGroup).toHaveBeenCalledWith("g1", ORG, { name: "New" });
    expect(answer(rep).code).toBe(200);
  });

  test("reports a failure as a 500", async () => {
    (updateContactGroup as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await updateContactGroupHandler(request({ params: { contactGroupId: "g1" } }), rep);

    expect(answer(rep).code).toBe(500);
  });
});

describe("deleteContactGroupHandler", () => {
  test("deletes the group named in the path", async () => {
    (deleteContactGroup as Mock).mockResolvedValue({ id: "g1" });
    const rep = reply();

    await deleteContactGroupHandler(request({ params: { contactGroupId: "g1" } }), rep);

    expect(deleteContactGroup).toHaveBeenCalledWith("g1", ORG);
    expect(answer(rep).code).toBe(200);
  });
});

describe("deleteManyContactGroupsHandler", () => {
  test("forwards the id list straight to the service", async () => {
    (deleteManyContactGroups as Mock).mockResolvedValue({ count: 2 });
    const rep = reply();

    await deleteManyContactGroupsHandler(request({ body: { contactGroupIds: ["g1", "g2"] } }), rep);

    expect(deleteManyContactGroups).toHaveBeenCalledWith(["g1", "g2"], ORG);
    expect(answer(rep)).toEqual({ code: 200, body: { count: 2 } });
  });
});

// ===========================================================================
// membership
// ===========================================================================

describe("addExistingContactsToGroupHandler", () => {
  test("passes the ids, the customer flag and the caller's org", async () => {
    (addExistingContactsToGroup as Mock).mockResolvedValue(undefined);
    const rep = reply();

    await addExistingContactsToGroupHandler(
      request({
        params: { contactGroupId: "g1" },
        body: { contactIds: ["c1"], isCustomer: true },
      }),
      rep,
    );

    expect(addExistingContactsToGroup).toHaveBeenCalledWith("g1", ["c1"], true, ORG);
    expect(answer(rep).code).toBe(200);
  });

  // A group that is not the caller's reports as absent, and absent is a 404 —
  // indistinguishable from one that never existed.
  test("reports a missing group as a 404", async () => {
    (addExistingContactsToGroup as Mock).mockRejectedValue(
      new ContactGroupNotFoundError("Contact group not found"),
    );
    const rep = reply();

    await addExistingContactsToGroupHandler(request({ params: { contactGroupId: "g1" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Contact group not found" } });
  });
});

describe("addNewContactsToGroupHandler", () => {
  test("creates the contacts first and then maps them into the group", async () => {
    const order: string[] = [];
    (createMultipleContacts as Mock).mockImplementation(async () => order.push("create"));
    (addNewContactsToGroup as Mock).mockImplementation(async () => order.push("map"));
    const body = [{ name: "Ann", phone: "919876543210" }];

    await addNewContactsToGroupHandler(
      request({ params: { contactGroupId: "g1" }, body }),
      reply(),
    );

    expect(order).toEqual(["create", "map"]);
    expect(createMultipleContacts).toHaveBeenCalledWith(body, ORG);
    expect(addNewContactsToGroup).toHaveBeenCalledWith("g1", body, ORG);
  });

  // addNewContactsToGroup returned nothing, so the success answer was always an
  // empty body — the caller could not tell how many contacts were actually added.
  test("answers 200 with what was added", async () => {
    (createMultipleContacts as Mock).mockResolvedValue([]);
    (addNewContactsToGroup as Mock).mockResolvedValue({ added: 2, invalidPhones: 1 });
    const rep = reply();

    await addNewContactsToGroupHandler(
      request({ params: { contactGroupId: "g1" }, body: [] }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 200, body: { added: 2, invalidPhones: 1 } });
  });

  test("reports a duplicate phone as a 400", async () => {
    (createMultipleContacts as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await addNewContactsToGroupHandler(
      request({ params: { contactGroupId: "g1" }, body: [] }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Contact already exist" } });
  });

  test("reports anything else as a 500", async () => {
    (createMultipleContacts as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await addNewContactsToGroupHandler(
      request({ params: { contactGroupId: "g1" }, body: [] }),
      rep,
    );

    expect(answer(rep).code).toBe(500);
  });
});

describe("removeContactsFromGroupHandler", () => {
  test("removes the listed contacts from the group", async () => {
    (removeContactsFromGroup as Mock).mockResolvedValue({ count: 1 });
    const rep = reply();

    await removeContactsFromGroupHandler(
      request({ params: { contactGroupId: "g1" }, body: ["c1"] }),
      rep,
    );

    expect(removeContactsFromGroup).toHaveBeenCalledWith("g1", ORG, ["c1"]);
    expect(answer(rep)).toEqual({ code: 200, body: { count: 1 } });
  });

  // It used to be the one handler in the module that put the raw error text into
  // the response body. It goes through the shared replyForError now, like the rest.
  test("reports a failure without leaking the error text", async () => {
    (removeContactsFromGroup as Mock).mockRejectedValue(new Error("connection lost"));
    const rep = reply();

    await removeContactsFromGroupHandler(request({ params: { contactGroupId: "g1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

describe("addExistingContactsToMultipleGroupsHandler", () => {
  test("passes both id lists and the caller's org", async () => {
    (addExistingContactsToMultipleGroups as Mock).mockResolvedValue([]);
    const rep = reply();

    await addExistingContactsToMultipleGroupsHandler(
      request({ body: { contactIds: ["c1"], contactGroupIds: ["g1", "g2"] } }),
      rep,
    );

    expect(addExistingContactsToMultipleGroups).toHaveBeenCalledWith(["c1"], ["g1", "g2"], ORG);
    expect(answer(rep).code).toBe(200);
  });
});

// ===========================================================================
// CSV import into a group
// ===========================================================================

describe("addNewContactsfromCSVToGroupHandler", () => {
  // Real @fastify/multipart non-file parts always carry `type: "field"`
  // alongside `.value` — the handler now discriminates on it, so fixtures
  // need to match the real shape rather than a bare `{ value }`.
  function upload(fields: Record<string, unknown> = {}, mimetype = "text/csv") {
    const wrapped = Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [
        key,
        { type: "field", ...(field as Record<string, unknown>) },
      ]),
    );
    return { mimetype, fields: wrapped };
  }

  test("refuses a file type that is not a spreadsheet", async () => {
    const rep = reply();

    await addNewContactsfromCSVToGroupHandler(
      request({
        params: { contactGroupId: "g1" },
        file: vi.fn().mockResolvedValue(upload({}, "image/png")),
      }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "This file type is not permitted." } });
  });

  test("imports into the group named in the path", async () => {
    (importCSVContacts as Mock).mockResolvedValue({ status: "success", data: "ok" });
    const rep = reply();

    await addNewContactsfromCSVToGroupHandler(
      request({
        params: { contactGroupId: "g1" },
        file: vi.fn().mockResolvedValue(upload({ "tags[0]": { value: "tier" } })),
      }),
      rep,
    );

    expect(importCSVContacts).toHaveBeenCalledWith(
      expect.anything(),
      ORG,
      ["tier"],
      false,
      "g1",
      true,
    );
    expect(answer(rep).code).toBe(200);
  });

  // Unlike the top-level importer this variant never forwarded the hasHeaderRow
  // flag, so it fell to importCSVContacts's `= true` default and a headerless file
  // uploaded into a group always lost its first contact — while the same file
  // through the other endpoint imported correctly.
  test("forwards the has-header-row flag", async () => {
    (importCSVContacts as Mock).mockResolvedValue({ status: "success" });

    await addNewContactsfromCSVToGroupHandler(
      request({
        params: { contactGroupId: "g1" },
        file: vi.fn().mockResolvedValue(upload({ hasHeaderRow: { value: "false" } })),
      }),
      reply(),
    );

    expect((importCSVContacts as Mock).mock.calls[0][5]).toBe(false);
  });

  test("turns a validation result into a 400 carrying the bad rows", async () => {
    (importCSVContacts as Mock).mockResolvedValue({ status: "error", data: [{ name: "x" }] });
    const rep = reply();

    await addNewContactsfromCSVToGroupHandler(
      request({ params: { contactGroupId: "g1" }, file: vi.fn().mockResolvedValue(upload()) }),
      rep,
    );

    expect(answer(rep)).toEqual({
      code: 400,
      body: { error: "VALIDATION_ERR", data: [{ name: "x" }] },
    });
  });

  test("reports an empty spreadsheet as an internal error", async () => {
    (importCSVContacts as Mock).mockResolvedValue(undefined);
    const rep = reply();

    await addNewContactsfromCSVToGroupHandler(
      request({ params: { contactGroupId: "g1" }, file: vi.fn().mockResolvedValue(upload()) }),
      rep,
    );

    expect(answer(rep).code).toBe(500);
  });
});

// ===========================================================================
// per-contact membership
// ===========================================================================

describe("getContactGroupsByContactIdHandler", () => {
  test("scopes the lookup to the caller's org", async () => {
    (getContactGroupsByContactId as Mock).mockResolvedValue([{ id: "g1" }]);
    const rep = reply();

    await getContactGroupsByContactIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(getContactGroupsByContactId).toHaveBeenCalledWith("c1", ORG);
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "g1" }] });
  });
});

describe("updateContactGroupsForContactHandler", () => {
  test("passes both id lists and the caller's org", async () => {
    (updateContactGroupsForContact as Mock).mockResolvedValue({ added: [], removed: [] });
    const rep = reply();

    await updateContactGroupsForContactHandler(
      request({
        params: { contactId: "c1" },
        body: { addGroupIds: ["g1"], removeGroupIds: ["g2"] },
      }),
      rep,
    );

    expect(updateContactGroupsForContact).toHaveBeenCalledWith("c1", ["g1"], ["g2"], ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("treats a missing body as an empty change set", async () => {
    (updateContactGroupsForContact as Mock).mockResolvedValue({ added: [], removed: [] });

    await updateContactGroupsForContactHandler(
      request({ params: { contactId: "c1" }, body: undefined }),
      reply(),
    );

    expect(updateContactGroupsForContact).toHaveBeenCalledWith("c1", [], [], ORG);
  });

  test("reports a failure as a 500", async () => {
    (updateContactGroupsForContact as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await updateContactGroupsForContactHandler(request({ params: { contactId: "c1" } }), rep);

    expect(answer(rep).code).toBe(500);
  });
});
