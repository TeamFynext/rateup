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

vi.mock("./contactLabel.service.js", () => ({
  assignLabelsToContact: vi.fn(),
  assignLabelsToContacts: vi.fn(),
  createContactLabel: vi.fn(),
  deleteContactLabel: vi.fn(),
  getContactLabelById: vi.fn(),
  getContactLabelsByOrgId: vi.fn(),
  getContactsWithLabels: vi.fn(),
  updateContactLabel: vi.fn(),
}));

import { Prisma } from "../../../../generated/prisma/client.js";
import {
  assignLabelsToContact,
  assignLabelsToContacts,
  createContactLabel,
  deleteContactLabel,
  getContactLabelById,
  getContactLabelsByOrgId,
  getContactsWithLabels,
  updateContactLabel,
} from "./contactLabel.service.js";
import {
  assignLabelsToContactHandler,
  assignLabelsToContactsHandler,
  createContactLabelHandler,
  deleteContactLabelHandler,
  getAllContactLabelsHandler,
  getContactLabelByIdHandler,
  getContactsWithLabelsHandler,
  updateContactLabelHandler,
} from "./contactLabel.controller.js";

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

describe("createContactLabelHandler", () => {
  test("creates the label against the caller's org", async () => {
    (createContactLabel as Mock).mockResolvedValue({ id: "l1", name: "VIP" });
    const rep = reply();

    await createContactLabelHandler(request({ body: { name: "VIP" } }), rep);

    expect(createContactLabel).toHaveBeenCalledWith(ORG, { name: "VIP" });
    expect(answer(rep)).toEqual({ code: 201, body: { id: "l1", name: "VIP" } });
  });

  test("reports a duplicate label name as a 409", async () => {
    (createContactLabel as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await createContactLabelHandler(request({ body: { name: "VIP" } }), rep);

    expect(answer(rep)).toEqual({
      code: 409,
      body: { error: "Label with this name already exists" },
    });
  });

  test("reports an unexpected failure as a 500", async () => {
    (createContactLabel as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await createContactLabelHandler(request({ body: { name: "VIP" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });

  // Only P2002 was handled inside the prisma branch; any other prisma error fell
  // off the end of the handler having sent nothing, which fastify turns into an
  // empty 200 — so a foreign-key violation read as success. Same shape as
  test("answers a non-duplicate prisma error with a 500", async () => {
    (createContactLabel as Mock).mockRejectedValue(new FakePrismaKnownError("P2003"));
    const rep = reply();

    await createContactLabelHandler(request({ body: { name: "VIP" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

describe("getAllContactLabelsHandler", () => {
  test("lists the caller's org", async () => {
    (getContactLabelsByOrgId as Mock).mockResolvedValue([{ id: "l1" }]);
    const rep = reply();

    await getAllContactLabelsHandler(request(), rep);

    expect(getContactLabelsByOrgId).toHaveBeenCalledWith(ORG);
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "l1" }] });
  });

  test("reports a failure as a 500", async () => {
    (getContactLabelsByOrgId as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getAllContactLabelsHandler(request(), rep);

    expect(answer(rep).code).toBe(500);
  });
});

describe("getContactLabelByIdHandler", () => {
  test("fetches the label within the caller's org", async () => {
    (getContactLabelById as Mock).mockResolvedValue({ id: "l1" });
    const rep = reply();

    await getContactLabelByIdHandler(request({ params: { labelId: "l1" } }), rep);

    expect(getContactLabelById).toHaveBeenCalledWith("l1", ORG);
    expect(answer(rep)).toEqual({ code: 200, body: { id: "l1" } });
  });

  // The org scoping turns another org's label into a clean 404 rather than a leak.
  test("answers 404 for a label the org cannot see", async () => {
    (getContactLabelById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getContactLabelByIdHandler(request({ params: { labelId: "l-other-org" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Label not found" } });
  });
});

describe("updateContactLabelHandler", () => {
  test("updates the label within the caller's org", async () => {
    (updateContactLabel as Mock).mockResolvedValue({ id: "l1" });
    const rep = reply();

    await updateContactLabelHandler(
      request({ params: { labelId: "l1" }, body: { name: "New" } }),
      rep,
    );

    expect(updateContactLabel).toHaveBeenCalledWith("l1", ORG, { name: "New" });
    expect(answer(rep).code).toBe(200);
  });

  test("reports a name clash as a 409", async () => {
    (updateContactLabel as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await updateContactLabelHandler(request({ params: { labelId: "l1" } }), rep);

    expect(answer(rep).code).toBe(409);
  });

  test("reports a label that does not exist as a 404", async () => {
    (updateContactLabel as Mock).mockRejectedValue(new FakePrismaKnownError("P2025"));
    const rep = reply();

    await updateContactLabelHandler(request({ params: { labelId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Label not found" } });
  });

  test("answers any other prisma error with a 500", async () => {
    (updateContactLabel as Mock).mockRejectedValue(new FakePrismaKnownError("P2003"));
    const rep = reply();

    await updateContactLabelHandler(request({ params: { labelId: "l1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

describe("deleteContactLabelHandler", () => {
  test("deletes the label within the caller's org", async () => {
    (deleteContactLabel as Mock).mockResolvedValue({ id: "l1" });
    const rep = reply();

    await deleteContactLabelHandler(request({ params: { labelId: "l1" } }), rep);

    expect(deleteContactLabel).toHaveBeenCalledWith("l1", ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("reports a label that does not exist as a 404", async () => {
    (deleteContactLabel as Mock).mockRejectedValue(new FakePrismaKnownError("P2025"));
    const rep = reply();

    await deleteContactLabelHandler(request({ params: { labelId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Label not found" } });
  });

  test("reports an unexpected failure as a 500", async () => {
    (deleteContactLabel as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await deleteContactLabelHandler(request({ params: { labelId: "l1" } }), rep);

    expect(answer(rep).code).toBe(500);
  });
});

describe("assignLabelsToContactHandler", () => {
  test("assigns the labels and answers with the refreshed contact", async () => {
    (assignLabelsToContact as Mock).mockResolvedValue({ id: "c1" });
    const rep = reply();

    await assignLabelsToContactHandler(
      request({ params: { contactId: "c1" }, body: { labelIds: ["l1"] } }),
      rep,
    );

    expect(assignLabelsToContact).toHaveBeenCalledWith("c1", ["l1"], ORG);
    expect(answer(rep)).toEqual({ code: 200, body: { id: "c1" } });
  });

  // NOTE: the 404 arrives only after the service has already cleared the
  // contact's labels — the write is not undone.
  test("answers 404 for a contact it could not read back", async () => {
    (assignLabelsToContact as Mock).mockResolvedValue(null);
    const rep = reply();

    await assignLabelsToContactHandler(
      request({ params: { contactId: "c-other-org" }, body: { labelIds: [] } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Contact not found" } });
  });

  test("reports a failure as a 500", async () => {
    (assignLabelsToContact as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await assignLabelsToContactHandler(
      request({ params: { contactId: "c1" }, body: { labelIds: [] } }),
      rep,
    );

    expect(answer(rep).code).toBe(500);
  });
});

describe("assignLabelsToContactsHandler", () => {
  test("passes both id lists and the caller's org", async () => {
    (assignLabelsToContacts as Mock).mockResolvedValue(undefined);
    const rep = reply();

    await assignLabelsToContactsHandler(
      request({ body: { contactIds: ["c1", "c2"], labelIds: ["l1"] } }),
      rep,
    );

    expect(assignLabelsToContacts).toHaveBeenCalledWith(["c1", "c2"], ["l1"], ORG);
  });

  // NOTE: the service returns nothing, so the success answer is always empty.
  test("answers 200 with an empty body", async () => {
    (assignLabelsToContacts as Mock).mockResolvedValue(undefined);
    const rep = reply();

    await assignLabelsToContactsHandler(
      request({ body: { contactIds: ["c1"], labelIds: ["l1"] } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 200, body: undefined });
  });

  test("reports a failure as a 500", async () => {
    (assignLabelsToContacts as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await assignLabelsToContactsHandler(request({ body: {} }), rep);

    expect(answer(rep).code).toBe(500);
  });
});

describe("getContactsWithLabelsHandler", () => {
  test("splits the comma-separated label ids from the query", async () => {
    (getContactsWithLabels as Mock).mockResolvedValue([]);

    await getContactsWithLabelsHandler(request({ query: { labelIds: "l1,l2" } }), reply());

    expect(getContactsWithLabels).toHaveBeenCalledWith(ORG, ["l1", "l2"]);
  });

  test("passes no filter when the query has no label ids", async () => {
    (getContactsWithLabels as Mock).mockResolvedValue([]);

    await getContactsWithLabelsHandler(request({ query: {} }), reply());

    expect(getContactsWithLabels).toHaveBeenCalledWith(ORG, undefined);
  });

  // NOTE: the underlying query names a relation Contact does not have, so this
  // endpoint answers 500 whenever a label filter is supplied.
  test("reports the filtered lookup's failure as a 500", async () => {
    (getContactsWithLabels as Mock).mockRejectedValue(new Error("Unknown field contactLabels"));
    const rep = reply();

    await getContactsWithLabelsHandler(request({ query: { labelIds: "l1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});
