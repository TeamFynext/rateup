import { beforeEach, describe, expect, test, vi } from "vitest";

// A stand-in for prisma's known-request error so the handlers' `instanceof`
// branches can be exercised without loading the real client. It has to be
// declared inside the factory: vi.mock is hoisted above every other statement.
vi.mock("../../../generated/prisma/client.js", () => ({
  ContactGroupType: { NORMAL: "NORMAL", LOYALTY: "LOYALTY" },
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

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./contact.service.js", () => ({
  addCustomField: vi.fn(),
  bulkUpdateWaMessageAssignStatus: vi.fn(),
  createContact: vi.fn(),
  createMultipleContacts: vi.fn(),
  deleteContactById: vi.fn(),
  deleteCustomField: vi.fn(),
  deleteManyContacts: vi.fn(),
  getContactById: vi.fn(),
  getContactsByOrgId: vi.fn(),
  getCustomFields: vi.fn(),
  getExistingContactCountByPhno: vi.fn(),
  updateContactById: vi.fn(),
  updateContactLabelsById: vi.fn(),
  updateCustomField: vi.fn(),
  updateLifecycleStageofContacts: vi.fn(),
}));

vi.mock("./contactImport.service.js", () => ({
  startContactImport: vi.fn(),
  getContactImportStatus: vi.fn(),
}));
vi.mock("./contact.utils.js", () => ({
  createLCustomer: vi.fn(),
  handlePostRegisterAction: vi.fn(),
}));

vi.mock("../loyalty/settings/settings.service.js", () => ({
  getLoyaltyWaCommandByType: vi.fn(),
}));
vi.mock("../loyalty/richText.js", () => ({
  renderReplyText: vi.fn((content: unknown) => `rendered:${String(content)}`),
}));
vi.mock("../loyalty/messaging/send.js", () => ({
  sendLoyalty: vi.fn(),
}));

vi.mock("../../utils/prisma.js", () => ({
  default: { contact: { findMany: vi.fn() } },
}));

vi.mock("hucre", () => ({ write: vi.fn().mockResolvedValue(Buffer.from("sheet")) }));

import prisma from "../../utils/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { write } from "hucre";
import {
  addCustomField,
  bulkUpdateWaMessageAssignStatus,
  createContact,
  createMultipleContacts,
  deleteContactById,
  deleteCustomField,
  deleteManyContacts,
  getContactById,
  getContactsByOrgId,
  getCustomFields,
  getExistingContactCountByPhno,
  updateContactById,
  updateContactLabelsById,
  updateCustomField,
  updateLifecycleStageofContacts,
} from "./contact.service.js";
import { createLCustomer } from "./contact.utils.js";
import { getContactImportStatus, startContactImport } from "./contactImport.service.js";
import { sendLoyalty } from "../loyalty/messaging/send.js";
import { getLoyaltyWaCommandByType } from "../loyalty/settings/settings.service.js";
import { ContactNotFoundError } from "./contact.errors.js";
import {
  addCustomFieldHandler,
  bulkUpdateWaMessageAssignStatusHandler,
  createContactHandler,
  createMultipleContactsHandler,
  deleteContactByIdHandler,
  deleteCustomFieldHandler,
  deleteManyContactsHandler,
  exportContactHandler,
  getAllContactsHandler,
  getContactByIdHandler,
  getCustomFieldHandler,
  importCSVContactsHandler,
  getContactImportStatusHandler,
  updateContactByIdHandler,
  updateContactLabelsByIdHandler,
  updateCustomFieldHandler,
  updateLifecycleStageofContactsHandler,
} from "./contact.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

const db = prisma as unknown as { contact: Record<string, Mock> };

/// The mocked prisma known-request error class, as the handlers see it.
const FakePrismaKnownError = (Prisma as any).PrismaClientKnownRequestError as new (
  code: string,
) => Error;

function reply() {
  const rep: any = {
    code: vi.fn(() => rep),
    status: vi.fn(() => rep),
    send: vi.fn(() => rep),
    header: vi.fn(() => rep),
  };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, userId: USER, params: {}, query: {}, body: {}, ...over };
}

/// The first `.code(n)` and the first `.send(x)` of a reply, as a pair.
function answer(rep: any) {
  return {
    code: rep.code.mock.calls[0]?.[0] ?? rep.status.mock.calls[0]?.[0],
    body: rep.send.mock.calls[0]?.[0],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getLoyaltyWaCommandByType as Mock).mockResolvedValue(null);
  (getExistingContactCountByPhno as Mock).mockResolvedValue(0);
  db.contact.findMany.mockResolvedValue([]);
  (write as Mock).mockResolvedValue(Buffer.from("sheet"));
});

// ===========================================================================
// createContactHandler
// ===========================================================================

describe("createContactHandler", () => {
  const body = { name: "Ann", phone: "919876543210", source: "MANUAL" };

  test("refuses a phone number that is not real", async () => {
    const rep = reply();

    await createContactHandler(request({ body: { ...body, phone: "12" } }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Phone number is not valid" } });
    expect(createContact).not.toHaveBeenCalled();
  });

  test("creates an ordinary contact against the session org", async () => {
    (createContact as Mock).mockResolvedValue({ id: "c1" });
    const rep = reply();

    await createContactHandler(request({ body }), rep);

    expect(createContact).toHaveBeenCalledWith({ ...body, orgId: ORG }, USER);
    expect(answer(rep)).toEqual({ code: 201, body: { id: "c1" } });
  });

  // Zapier calls this handler without a session and passes the org in the query.
  test("falls back to the query org when there is no session user", async () => {
    (createContact as Mock).mockResolvedValue({ id: "c1" });

    await createContactHandler(
      request({ user: undefined, body, query: { orgId: "org-zapier" } }),
      reply(),
    );

    expect(createContact).toHaveBeenCalledWith({ ...body, orgId: "org-zapier" }, USER);
  });

  test("a loyalty source goes through the loyalty customer path", async () => {
    (createLCustomer as Mock).mockResolvedValue({ id: "c1", name: "Ann", phone: "919876543210" });
    const rep = reply();

    await createContactHandler(request({ body: { ...body, source: "LOYALTY" } }), rep);

    expect(createLCustomer).toHaveBeenCalled();
    expect(createContact).not.toHaveBeenCalled();
    expect(answer(rep)).toEqual({
      code: 201,
      body: { id: "c1", name: "Ann", phone: "919876543210" },
    });
  });

  // A contact created here has usually never messaged the business, so the reply goes
  // through the session-aware sender: the template when the window is closed, the reply's
  // own text when it happens to be open.
  test("sends the registration reply through the session-aware sender", async () => {
    (createLCustomer as Mock).mockResolvedValue({ id: "c1", name: "Ann", phone: "919876543210" });
    (getLoyaltyWaCommandByType as Mock).mockResolvedValue({
      responseType: "Template",
      waTemplateId: "t1",
      content: "Hi {{1}}",
    });

    await createContactHandler(request({ body: { ...body, source: "LOYALTY" } }), reply());

    expect(sendLoyalty).toHaveBeenCalledWith({
      orgId: ORG,
      to: { contactId: expect.any(String) },
      intent: { kind: "notify" },
      message: {
        key: "keyword:registration",
        text: "rendered:Hi {{1}}",
        artefacts: { WHATSAPP: { waTemplateId: "t1", params: ["Ann"] } },
      },
    });
  });

  test("a text-only reply is still offered, for an open window", async () => {
    (createLCustomer as Mock).mockResolvedValue({ id: "c1", name: "Ann", phone: "919876543210" });
    (getLoyaltyWaCommandByType as Mock).mockResolvedValue({
      responseType: "Text",
      waTemplateId: null,
      content: "Hi {{1}}",
    });

    await createContactHandler(request({ body: { ...body, source: "LOYALTY" } }), reply());

    expect((sendLoyalty as Mock).mock.calls[0][0].message).toEqual({
      key: "keyword:registration",
      text: "rendered:Hi {{1}}",
    });
  });

  test("reports a duplicate contact as a 400", async () => {
    (createContact as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await createContactHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Contact already exist" } });
  });

  test("reports an unexpected failure as a 500", async () => {
    (createContact as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await createContactHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });

  test("answers a non-duplicate prisma error with a 500", async () => {
    (createContact as Mock).mockRejectedValue(new FakePrismaKnownError("P2003"));
    const rep = reply();

    await createContactHandler(request({ body }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });

  test("does not reply a second time when the loyalty welcome message fails", async () => {
    (createLCustomer as Mock).mockResolvedValue({ id: "c1", name: "Ann", phone: "919876543210" });
    (getLoyaltyWaCommandByType as Mock).mockRejectedValue(new Error("meta down"));
    const rep = reply();
    rep.sent = false;
    rep.send.mockImplementation(() => {
      rep.sent = true;
      return rep;
    });

    await createContactHandler(request({ body: { ...body, source: "LOYALTY" } }), rep);

    expect(rep.code.mock.calls.map((c: any[]) => c[0])).toEqual([201]);
  });
});

// ===========================================================================
// the rest of the contact handlers
// ===========================================================================

describe("createMultipleContactsHandler", () => {
  test("imports the contacts and answers 201", async () => {
    (createMultipleContacts as Mock).mockResolvedValue([{ id: "c1" }]);
    const rep = reply();

    await createMultipleContactsHandler(
      request({ body: [{ name: "Ann", phone: "9190001", source: "CSV" }] }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 201, body: [{ id: "c1" }] });
  });

  test("refuses an import in which every contact already exists", async () => {
    (getExistingContactCountByPhno as Mock).mockResolvedValue(2);
    const rep = reply();

    await createMultipleContactsHandler(
      request({
        body: [
          { name: "A", phone: "9190001", source: "CSV" },
          { name: "B", phone: "9190002", source: "CSV" },
        ],
      }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "All contacts already exist" } });
    expect(createMultipleContacts).not.toHaveBeenCalled();
  });

  test("passes a service failure's message through to the client", async () => {
    (createMultipleContacts as Mock).mockRejectedValue(new Error("column overflow"));
    const rep = reply();

    await createMultipleContactsHandler(
      request({ body: [{ name: "A", phone: "9190001", source: "CSV" }] }),
      rep,
    );

    expect(answer(rep).body).toEqual({ error: "column overflow" });
  });
});

describe("getAllContactsHandler", () => {
  test("lists the caller's org with the request's paging", async () => {
    (getContactsByOrgId as Mock).mockResolvedValue({ users: [], totalCount: 0 });
    const rep = reply();

    await getAllContactsHandler(request({ query: { page: 1 } }), rep);

    expect(getContactsByOrgId).toHaveBeenCalledWith(ORG, { page: 1 });
    expect(answer(rep)).toEqual({ code: 200, body: { users: [], totalCount: 0 } });
  });

  test("reports a failure as a 500", async () => {
    (getContactsByOrgId as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getAllContactsHandler(request(), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

describe("getContactByIdHandler", () => {
  test("fetches within the caller's org", async () => {
    (getContactById as Mock).mockResolvedValue({ id: "c1" });
    const rep = reply();

    await getContactByIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(getContactById).toHaveBeenCalledWith("c1", ORG);
    expect(answer(rep)).toEqual({ code: 200, body: { id: "c1" } });
  });

  // A contact another org owns reports as absent, and absent is a 404 — the two
  // are indistinguishable from outside, which is the point.
  test("answers 404 for a contact that does not exist", async () => {
    (getContactById as Mock).mockResolvedValue(null);
    const rep = reply();

    await getContactByIdHandler(request({ params: { contactId: "nope" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Contact not found" } });
  });
});

describe("deleteContactByIdHandler", () => {
  test("deletes within the caller's org", async () => {
    (deleteContactById as Mock).mockResolvedValue({ id: "c1" });
    const rep = reply();

    await deleteContactByIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(deleteContactById).toHaveBeenCalledWith("c1", ORG);
    expect(answer(rep).code).toBe(200);
  });

  test("answers 404 when the delete matched no contact of the caller's", async () => {
    (deleteContactById as Mock).mockRejectedValue(new FakePrismaKnownError("P2025"));
    const rep = reply();

    await deleteContactByIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Contact not found" } });
  });

  test("reports a failed delete as a 500", async () => {
    (deleteContactById as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await deleteContactByIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});

describe("updateContactByIdHandler", () => {
  test("passes the body and the acting user through", async () => {
    (updateContactById as Mock).mockResolvedValue({ id: "c1" });
    const rep = reply();

    await updateContactByIdHandler(
      request({ params: { contactId: "c1" }, body: { name: "Ann" } }),
      rep,
    );

    expect(updateContactById).toHaveBeenCalledWith("c1", ORG, { name: "Ann" }, USER);
    expect(answer(rep)).toEqual({ code: 200, body: { id: "c1" } });
  });

  test("reports a phone clash as a 400", async () => {
    (updateContactById as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await updateContactByIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Contact already exist" } });
  });

  test("answers a missing-row prisma error with a 404", async () => {
    (updateContactById as Mock).mockRejectedValue(new FakePrismaKnownError("P2025"));
    const rep = reply();

    await updateContactByIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Contact not found" } });
  });
});

describe("updateContactLabelsByIdHandler", () => {
  test("moves the contact to the requested lifecycle", async () => {
    (updateContactLabelsById as Mock).mockResolvedValue({ id: "c1" });
    const rep = reply();

    await updateContactLabelsByIdHandler(
      request({ params: { contactId: "c1" }, body: { lifecycleId: "lc-1" } }),
      rep,
    );

    expect(updateContactLabelsById).toHaveBeenCalledWith("c1", ORG, "lc-1");
    expect(answer(rep).code).toBe(200);
  });

  test("tolerates a body with no lifecycle at all", async () => {
    (updateContactLabelsById as Mock).mockResolvedValue({ id: "c1" });

    await updateContactLabelsByIdHandler(
      request({ params: { contactId: "c1" }, body: undefined }),
      reply(),
    );

    expect(updateContactLabelsById).toHaveBeenCalledWith("c1", ORG, undefined);
  });
});

describe("deleteManyContactsHandler", () => {
  test("forwards the id list straight to the service", async () => {
    (deleteManyContacts as Mock).mockResolvedValue({ count: 2 });
    const rep = reply();

    await deleteManyContactsHandler(request({ body: { contactIds: ["c1", "c2"] } }), rep);

    expect(deleteManyContacts).toHaveBeenCalledWith(["c1", "c2"], ORG);
    expect(answer(rep)).toEqual({ code: 200, body: { count: 2 } });
  });
});

// ===========================================================================
// importCSVContactsHandler
// ===========================================================================

describe("importCSVContactsHandler", () => {
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
  const options = () => (startContactImport as Mock).mock.calls[0][1];
  const queued = { status: "queued", jobId: "contact-import-1", total: 1 };

  test("refuses a file type that is not a spreadsheet", async () => {
    const rep = reply();

    await importCSVContactsHandler(
      request({ file: vi.fn().mockResolvedValue(upload({}, "application/pdf")) }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "This file type is not permitted." } });
    expect(startContactImport).not.toHaveBeenCalled();
  });

  test("collects the tag fields in order", async () => {
    (startContactImport as Mock).mockResolvedValue(queued);

    await importCSVContactsHandler(
      request({
        file: vi
          .fn()
          .mockResolvedValue(
            upload({ "tags[0]": { value: "tier" }, "tags[1]": { value: "city" } }),
          ),
      }),
      reply(),
    );

    expect(options().tags).toEqual(["tier", "city"]);
    expect(options().orgId).toBe(ORG);
  });

  test("only the literal string true turns on update-existing", async () => {
    (startContactImport as Mock).mockResolvedValue(queued);

    await importCSVContactsHandler(
      request({ file: vi.fn().mockResolvedValue(upload({ update: { value: "yes" } })) }),
      reply(),
    );

    expect(options().updateExisting).toBe(false);
  });

  test("update-existing is honoured when the field says true", async () => {
    (startContactImport as Mock).mockResolvedValue(queued);

    await importCSVContactsHandler(
      request({ file: vi.fn().mockResolvedValue(upload({ update: { value: "true" } })) }),
      reply(),
    );

    expect(options().updateExisting).toBe(true);
  });

  test("a header row is assumed unless the field explicitly says false", async () => {
    (startContactImport as Mock).mockResolvedValue(queued);

    await importCSVContactsHandler(
      request({ file: vi.fn().mockResolvedValue(upload({ hasHeaderRow: { value: "false" } })) }),
      reply(),
    );

    expect(options().hasHeaderRow).toBe(false);
  });

  test("passes no group id — this endpoint imports into no group", async () => {
    (startContactImport as Mock).mockResolvedValue(queued);

    await importCSVContactsHandler(request({ file: vi.fn().mockResolvedValue(upload()) }), reply());

    expect(options().contactGroupId).toBeUndefined();
  });

  test("turns a validation result into a 400 carrying the bad rows", async () => {
    (startContactImport as Mock).mockResolvedValue({
      status: "error",
      data: [{ name: "x" }],
      message: "No valid contacts were found in the file.",
    });
    const rep = reply();

    await importCSVContactsHandler(request({ file: vi.fn().mockResolvedValue(upload()) }), rep);

    expect(answer(rep)).toEqual({
      code: 400,
      body: {
        error: "VALIDATION_ERR",
        data: [{ name: "x" }],
        message: "No valid contacts were found in the file.",
      },
    });
  });

  test("answers a queued import with 202 and the job to poll", async () => {
    (startContactImport as Mock).mockResolvedValue(queued);
    const rep = reply();

    await importCSVContactsHandler(request({ file: vi.fn().mockResolvedValue(upload()) }), rep);

    expect(answer(rep)).toEqual({ code: 202, body: queued });
  });
});

describe("getContactImportStatusHandler", () => {
  test("answers 404 for a job that is gone or belongs to another org", async () => {
    (getContactImportStatus as Mock).mockResolvedValue(null);
    const rep = reply();

    await getContactImportStatusHandler(request({ params: { jobId: "contact-import-1" } }), rep);

    expect(getContactImportStatus).toHaveBeenCalledWith("contact-import-1", ORG);
    expect(answer(rep).code).toBe(404);
  });

  test("returns the status as read", async () => {
    (getContactImportStatus as Mock).mockResolvedValue({ state: "running", processed: 1000 });
    const rep = reply();

    await getContactImportStatusHandler(request({ params: { jobId: "contact-import-1" } }), rep);

    expect(answer(rep)).toEqual({ code: 200, body: { state: "running", processed: 1000 } });
  });
});

// ===========================================================================
// custom field handlers
// ===========================================================================

describe("custom field handlers", () => {
  test("lists the org's fields", async () => {
    (getCustomFields as Mock).mockResolvedValue([{ id: "f1" }]);
    const rep = reply();

    await getCustomFieldHandler(request(), rep);

    expect(getCustomFields).toHaveBeenCalledWith(ORG);
    expect(answer(rep)).toEqual({ code: 200, body: [{ id: "f1" }] });
  });

  test("falls back to an empty tag list when the lookup yields nothing", async () => {
    (getCustomFields as Mock).mockResolvedValue(null);
    const rep = reply();

    await getCustomFieldHandler(request(), rep);

    expect(answer(rep).body).toEqual({ contactTags: [] });
  });

  test("creates a field against the caller's org", async () => {
    (addCustomField as Mock).mockResolvedValue({ id: "f1" });
    const rep = reply();

    await addCustomFieldHandler(request({ body: { slug: "tier", name: "Tier" } }), rep);

    expect(addCustomField).toHaveBeenCalledWith(ORG, { slug: "tier", name: "Tier" });
    expect(answer(rep).code).toBe(200);
  });

  test("reports a duplicate field slug as a 409", async () => {
    (addCustomField as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await addCustomFieldHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 409, body: { message: "Field already exists" } });
  });

  test("reports any other create failure as a 500", async () => {
    (addCustomField as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await addCustomFieldHandler(request({ body: {} }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error creating field" } });
  });

  test("updates a field within the caller's org", async () => {
    (updateCustomField as Mock).mockResolvedValue({ id: "f1" });
    const rep = reply();

    await updateCustomFieldHandler(
      request({ params: { fieldId: "f1" }, body: { name: "Tier" } }),
      rep,
    );

    expect(updateCustomField).toHaveBeenCalledWith(ORG, "f1", { name: "Tier" });
    expect(answer(rep).code).toBe(200);
  });

  test("reports a duplicate on update as a 409", async () => {
    (updateCustomField as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await updateCustomFieldHandler(request({ params: { fieldId: "f1" } }), rep);

    expect(answer(rep).code).toBe(409);
  });

  test("deletes a field within the caller's org", async () => {
    (deleteCustomField as Mock).mockResolvedValue({ id: "f1" });
    const rep = reply();

    await deleteCustomFieldHandler(request({ params: { fieldId: "f1" } }), rep);

    expect(deleteCustomField).toHaveBeenCalledWith(ORG, "f1");
    expect(answer(rep).code).toBe(200);
  });

  test("reports a failed delete as a 500", async () => {
    (deleteCustomField as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await deleteCustomFieldHandler(request({ params: { fieldId: "f1" } }), rep);

    expect(answer(rep)).toEqual({ code: 500, body: { message: "Error deleting field" } });
  });
});

// ===========================================================================
// exportContactHandler
// ===========================================================================

describe("exportContactHandler", () => {
  test("refuses a format the writer does not support", async () => {
    const rep = reply();

    await exportContactHandler(request({ body: { format: "pdf" } }), rep);

    expect(answer(rep).code).toBe(400);
    expect(db.contact.findMany).not.toHaveBeenCalled();
  });

  test("defaults to xlsx when no format is asked for", async () => {
    const rep = reply();

    await exportContactHandler(request({ body: {} }), rep);

    expect((write as Mock).mock.calls[0][0].format).toBe("xlsx");
    expect(rep.header).toHaveBeenCalledWith(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  test("honours an explicit ods request", async () => {
    const rep = reply();

    await exportContactHandler(request({ body: { format: "ods" } }), rep);

    expect((write as Mock).mock.calls[0][0].format).toBe("ods");
    expect(rep.header.mock.calls[1][1]).toMatch(/\.ods"$/);
  });

  test("refuses to export when the session carries no org", async () => {
    const rep = reply();

    await exportContactHandler(request({ user: {} }), rep);

    expect(answer(rep)).toEqual({ code: 400, body: { error: "orgId is required" } });
  });

  test("exports id, name and phone by default", async () => {
    db.contact.findMany.mockResolvedValueOnce([{ id: "c1", name: "Ann", phone: "9190001" }]);
    const rep = reply();

    await exportContactHandler(request({ body: {} }), rep);

    const sheet = (write as Mock).mock.calls[0][0].sheets[0];
    expect(sheet.columns.map((c: any) => c.key)).toEqual(["id", "name", "phone"]);
    expect(sheet.data).toEqual([{ id: "c1", name: "Ann", phone: "9190001" }]);
  });

  test("only ever reads the caller's own org", async () => {
    await exportContactHandler(request({ body: {} }), reply());

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
  });

  test("keeps paging until a page comes back empty", async () => {
    db.contact.findMany
      .mockResolvedValueOnce([{ id: "c1", name: "A" }])
      .mockResolvedValueOnce([{ id: "c2", name: "B" }])
      .mockResolvedValueOnce([]);

    await exportContactHandler(request({ body: { fields: ["id", "name"] } }), reply());

    expect(db.contact.findMany).toHaveBeenCalledTimes(3);
    expect(db.contact.findMany.mock.calls[1][0].cursor).toEqual({ id: "c1" });
    expect(db.contact.findMany.mock.calls[1][0].skip).toBe(1);
    expect((write as Mock).mock.calls[0][0].sheets[0].data).toHaveLength(2);
  });

  test("flattens a custom field onto the exported row", async () => {
    db.contact.findMany.mockResolvedValueOnce([
      { id: "c1", customFields: [{ value: "gold", field: { name: "Tier" } }] },
    ]);

    await exportContactHandler(request({ body: { fields: ["id", "Tier"] } }), reply());

    expect((write as Mock).mock.calls[0][0].sheets[0].data).toEqual([{ id: "c1", Tier: "gold" }]);
  });

  test("leaves a requested custom field blank when the contact has no value", async () => {
    db.contact.findMany.mockResolvedValueOnce([{ id: "c1", customFields: [] }]);

    await exportContactHandler(request({ body: { fields: ["id", "Tier"] } }), reply());

    expect((write as Mock).mock.calls[0][0].sheets[0].data).toEqual([{ id: "c1", Tier: "" }]);
  });

  test("asks prisma for the nested custom field values only when some are requested", async () => {
    await exportContactHandler(request({ body: { fields: ["id", "name"] } }), reply());

    expect(db.contact.findMany.mock.calls[0][0].select).not.toHaveProperty("customFields");
  });

  test("formats createdAt for a spreadsheet reader", async () => {
    db.contact.findMany.mockResolvedValueOnce([
      { id: "c1", createdAt: new Date("2026-03-04T09:05:00.000Z") },
    ]);

    await exportContactHandler(request({ body: { fields: ["id", "createdAt"] } }), reply());

    expect((write as Mock).mock.calls[0][0].sheets[0].data[0].createdAt).toMatch(
      /^04-03-2026 \d{2}:\d{2} (AM|PM)$/,
    );
  });

  test("names the download after the org", async () => {
    const rep = reply();

    await exportContactHandler(request({ body: {} }), rep);

    expect(rep.header.mock.calls[1]).toEqual([
      "Content-Disposition",
      `attachment; filename="contacts_${ORG}.xlsx"`,
    ]);
  });

  test("lets a database failure escape the handler", async () => {
    db.contact.findMany.mockRejectedValue(new Error("connection lost"));

    await expect(exportContactHandler(request({ body: {} }), reply())).rejects.toThrow(
      "connection lost",
    );
  });
});

// ===========================================================================
// lifecycle + bulk status
// ===========================================================================

describe("updateLifecycleStageofContactsHandler", () => {
  test("moves the listed contacts to the path lifecycle", async () => {
    (updateLifecycleStageofContacts as Mock).mockResolvedValue(undefined);
    const rep = reply();

    await updateLifecycleStageofContactsHandler(
      request({ params: { lifecycleId: "lc-1" }, body: { contactIds: ["c1"] } }),
      rep,
    );

    expect(updateLifecycleStageofContacts).toHaveBeenCalledWith("lc-1", ORG, ["c1"]);
    expect(rep.send).toHaveBeenCalledWith(undefined);
  });

  test("reports a failure as a 500", async () => {
    (updateLifecycleStageofContacts as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await updateLifecycleStageofContactsHandler(
      request({ params: { lifecycleId: "lc-1" }, body: { contactIds: ["c1"] } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });

  test("answers 404 for a lifecycle the org does not have", async () => {
    (updateLifecycleStageofContacts as Mock).mockRejectedValue(
      new ContactNotFoundError("Lifecycle lc-1 not found"),
    );
    const rep = reply();

    await updateLifecycleStageofContactsHandler(
      request({ params: { lifecycleId: "lc-1" }, body: { contactIds: ["c1"] } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 404, body: { error: "Lifecycle lc-1 not found" } });
  });
});

describe("bulkUpdateWaMessageAssignStatusHandler", () => {
  test("passes every part of the request through and reports the count", async () => {
    (bulkUpdateWaMessageAssignStatus as Mock).mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    const rep = reply();

    await bulkUpdateWaMessageAssignStatusHandler(
      request({
        body: {
          contactIds: ["c1", "c2"],
          waMessageAssignStatus: "CLOSED",
          messageId: "m1",
          resolutionResult: "RESOLVED",
        },
      }),
      rep,
    );

    expect(bulkUpdateWaMessageAssignStatus).toHaveBeenCalledWith(
      ["c1", "c2"],
      ORG,
      "CLOSED",
      USER,
      "m1",
      "RESOLVED",
    );
    expect(answer(rep)).toEqual({
      code: 200,
      body: {
        message: "Contacts updated successfully",
        updatedCount: 2,
        contacts: [{ id: "c1" }, { id: "c2" }],
      },
    });
  });

  test("reports success with a zero count when nothing matched", async () => {
    (bulkUpdateWaMessageAssignStatus as Mock).mockResolvedValue([]);
    const rep = reply();

    await bulkUpdateWaMessageAssignStatusHandler(
      request({ body: { contactIds: ["nope"], waMessageAssignStatus: "CLOSED" } }),
      rep,
    );

    expect(answer(rep).body.updatedCount).toBe(0);
  });

  test("reports a unique-constraint clash as a 400", async () => {
    (bulkUpdateWaMessageAssignStatus as Mock).mockRejectedValue(new FakePrismaKnownError("P2002"));
    const rep = reply();

    await bulkUpdateWaMessageAssignStatusHandler(
      request({ body: { contactIds: ["c1"], waMessageAssignStatus: "CLOSED" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 400, body: { error: "Duplicate record conflict" } });
  });

  test("reports anything else as a 500", async () => {
    (bulkUpdateWaMessageAssignStatus as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await bulkUpdateWaMessageAssignStatusHandler(
      request({ body: { contactIds: ["c1"], waMessageAssignStatus: "CLOSED" } }),
      rep,
    );

    expect(answer(rep)).toEqual({ code: 500, body: { error: "Something went wrong" } });
  });
});
