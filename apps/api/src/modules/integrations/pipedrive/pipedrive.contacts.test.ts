import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { contact: { findUnique: vi.fn() } },
}));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: { set: vi.fn(), del: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../shared/entityLink.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/entityLink.js")>()),
  findLinkByRateupId: vi.fn(),
  recordLink: vi.fn(),
  removeLink: vi.fn(),
}));

// One Pipedrive company's API, as the job's client sees it.
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("./pipedrive.client.js", () => ({ pipedriveClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import redisConnection from "../../../utils/redisConnection.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import {
  findLinkByRateupId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import {
  editedPerson,
  handlePipedriveContactEvent,
  PIPEDRIVE_CONTACT_UPSERT,
  PIPEDRIVE_JOB_OPTIONS,
  PipedriveContactBusyError,
  pipedrivePersonIdFor,
  processPipedriveContactJob,
  toPipedrivePersonFields,
} from "./pipedrive.contacts.js";

type Mock = ReturnType<typeof vi.fn>;
const findContact = prisma.contact.findUnique as unknown as Mock;
const findLink = findLinkByRateupId as unknown as Mock;
const addJob = integrationTriggerQueue.add as unknown as Mock;
const redis = redisConnection as unknown as Record<"set" | "del", Mock>;

const LINK = { integrationId: "int-1", entityType: "contact" };

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: "org-1",
    credential: {
      access_token: "at",
      refresh_token: "rt",
      apiDomain: "https://acme.pipedrive.com",
      companyId: 9100,
      syncContacts: true,
      ...credential,
    },
  }) as never;

const contact = (over: Record<string, unknown> = {}) => ({
  id: "c-1",
  orgId: "org-1",
  name: "Asha  Nair",
  email: " Asha@Example.com ",
  phone: "919876543210",
  ...over,
});

const FIELDS = { name: "Asha Nair", email: "asha@example.com", phone: "+919876543210" };

const job = (contactId = "c-1") => ({
  integrationName: "pipedrive",
  triggerKey: PIPEDRIVE_CONTACT_UPSERT,
  orgId: "org-1",
  data: { contactId },
});

/** The search answers: what each `fields` search finds, in order. */
const searchFinds = (byField: Partial<Record<"email" | "phone", number>>) => {
  client.get.mockImplementation(async (url: string, options?: { params?: { fields?: string } }) => {
    if (url === "/v2/persons/search") {
      const id = byField[options?.params?.fields as "email" | "phone"];
      return { data: { data: { items: id ? [{ item: { id } }] : [] } } };
    }
    return { data: { data: persons.get(url) } };
  });
};
const persons = new Map<string, unknown>();

beforeEach(() => {
  vi.clearAllMocks();
  persons.clear();
  findContact.mockResolvedValue(contact());
  findLink.mockResolvedValue(null);
  redis.set.mockResolvedValue("OK");
  client.post.mockResolvedValue({ data: { data: { id: 501 } } });
  client.patch.mockResolvedValue({ data: {} });
  searchFinds({});
});

describe("a contact as person fields", () => {
  test("lower-cases the email, adds + to the phone and tidies the name", () => {
    expect(toPipedrivePersonFields(contact())).toEqual(FIELDS);
  });

  test("a contact with no name is named by its email, then its phone", () => {
    expect(toPipedrivePersonFields(contact({ name: " " }))?.name).toBe("asha@example.com");
    expect(toPipedrivePersonFields(contact({ name: null, email: null }))?.name).toBe(
      "+919876543210",
    );
  });

  test("a contact with neither email nor phone is not sent", () => {
    expect(toPipedrivePersonFields(contact({ email: null, phone: "" }))).toBeNull();
  });
});

describe("contact events", () => {
  const context = { orgId: "org-1", integration: integration() } as never;

  test("a new contact queues a push with only its id", async () => {
    await handlePipedriveContactEvent(
      { type: "contact.created", contact: { id: "c-1" } } as never,
      context,
    );
    expect(addJob).toHaveBeenCalledWith(
      "pipedrive-contact-upsert",
      expect.objectContaining({ integrationName: "pipedrive", data: { contactId: "c-1" } }),
      PIPEDRIVE_JOB_OPTIONS,
    );
  });

  test("an edit that leaves the details alone sends nothing", async () => {
    await handlePipedriveContactEvent(
      { type: "contact.updated", contact: { id: "c-1" }, changed: ["lifecycle"] } as never,
      context,
    );
    expect(addJob).not.toHaveBeenCalled();
  });

  test("a deleted contact only loses its link", async () => {
    await handlePipedriveContactEvent(
      { type: "contact.deleted", contact: { id: "c-1" } } as never,
      context,
    );
    expect(removeLink).toHaveBeenCalledWith(LINK, "c-1");
    expect(addJob).not.toHaveBeenCalled();
  });
});

describe("sending a contact", () => {
  test("nothing is sent with the switch off", async () => {
    expect(await processPipedriveContactJob(integration({ syncContacts: false }), job())).toBe(
      "sync_off",
    );
    expect(client.get).not.toHaveBeenCalled();
  });

  test("a contact from another org is not sent", async () => {
    findContact.mockResolvedValue(contact({ orgId: "org-2" }));
    expect(await processPipedriveContactJob(integration(), job())).toBe("contact_gone");
  });

  test("someone Pipedrive lacks is created, with the phone as mobile, and linked", async () => {
    expect(await processPipedriveContactJob(integration(), job())).toBe("created");

    expect(client.get).toHaveBeenCalledWith("/v2/persons/search", {
      params: { term: "asha@example.com", fields: "email", exact_match: true, limit: 1 },
    });
    expect(client.post).toHaveBeenCalledWith("/v2/persons", {
      name: "Asha Nair",
      emails: [{ value: "asha@example.com", primary: true, label: "work" }],
      phones: [{ value: "+919876543210", primary: true, label: "mobile" }],
    });
    expect(recordLink).toHaveBeenCalledWith(LINK, {
      rateupId: "c-1",
      externalId: "501",
      payload: FIELDS,
    });
  });

  test("a match by phone is linked, filling only the email it lacks", async () => {
    searchFinds({ phone: 77 });
    persons.set("/v2/persons/77", {
      id: 77,
      name: "A. Nair",
      emails: [],
      phones: [{ value: "+919876543210", primary: true }],
    });

    expect(await processPipedriveContactJob(integration(), job())).toBe("linked");

    expect(client.patch).toHaveBeenCalledWith("/v2/persons/77", {
      emails: [{ value: "asha@example.com", primary: true, label: "work" }],
    });
    expect(client.post).not.toHaveBeenCalled();
    expect(recordLink).toHaveBeenCalledWith(LINK, expect.objectContaining({ externalId: "77" }));
  });

  test("a full match is linked without an edit", async () => {
    searchFinds({ email: 77 });
    persons.set("/v2/persons/77", {
      id: 77,
      emails: [{ value: "asha@example.com" }],
      phones: [{ value: "+44 20 0000" }],
    });

    expect(await processPipedriveContactJob(integration(), job())).toBe("linked");
    expect(client.patch).not.toHaveBeenCalled();
  });

  test("a linked contact that has not changed is skipped", async () => {
    findLink.mockResolvedValue({ externalId: "77", lastSyncHash: hashSyncPayload(FIELDS) });

    expect(await processPipedriveContactJob(integration(), job())).toBe("unchanged");
    expect(client.get).not.toHaveBeenCalled();
  });

  test("a linked contact's edit keeps the person's other emails and phones", async () => {
    findLink.mockResolvedValue({ externalId: "77", lastSyncHash: "old" });
    persons.set("/v2/persons/77", {
      id: 77,
      emails: [
        { value: "old@example.com", primary: true, label: "work" },
        { value: "ASHA@example.com", primary: false, label: "home" },
      ],
      phones: [{ value: "+1 555 0100", primary: true, label: "work" }],
    });

    expect(await processPipedriveContactJob(integration(), job())).toBe("updated");

    expect(client.patch).toHaveBeenCalledWith("/v2/persons/77", {
      name: "Asha Nair",
      emails: [
        { value: "asha@example.com", primary: true, label: "work" },
        { value: "old@example.com", primary: false, label: "work" },
      ],
      phones: [
        { value: "+919876543210", primary: true, label: "mobile" },
        { value: "+1 555 0100", primary: false, label: "work" },
      ],
    });
  });

  test("a person deleted in Pipedrive is matched or created again", async () => {
    findLink.mockResolvedValue({ externalId: "77", lastSyncHash: "old" });
    persons.set("/v2/persons/77", { id: 77, is_deleted: true });

    expect(await processPipedriveContactJob(integration(), job())).toBe("created");
    expect(removeLink).toHaveBeenCalledWith(LINK, "c-1");
  });

  test("a contact another job is sending waits for a retry, and the lock is released", async () => {
    redis.set.mockResolvedValueOnce(null);
    await expect(processPipedriveContactJob(integration(), job())).rejects.toBeInstanceOf(
      PipedriveContactBusyError,
    );
    expect(client.post).not.toHaveBeenCalled();

    await processPipedriveContactJob(integration(), job());
    expect(redis.del).toHaveBeenCalledWith("pipedrive:contact-lock:int-1:c-1");
  });

  test("a failed push still releases the lock", async () => {
    client.post.mockRejectedValue(new Error("429"));
    await expect(processPipedriveContactJob(integration(), job())).rejects.toThrow("429");
    expect(redis.del).toHaveBeenCalledOnce();
  });
});

describe("the person behind a deal", () => {
  test("the linked person, without a search", async () => {
    findLink.mockResolvedValue({ externalId: "77" });
    expect(await pipedrivePersonIdFor(integration(), client as never, contact())).toBe(77);
    expect(client.get).not.toHaveBeenCalled();
  });

  test("otherwise a match or a new person", async () => {
    expect(await pipedrivePersonIdFor(integration(), client as never, contact())).toBe(501);
  });

  test("none for a contact with neither email nor phone", async () => {
    expect(
      await pipedrivePersonIdFor(
        integration(),
        client as never,
        contact({ email: null, phone: null }),
      ),
    ).toBeNull();
  });
});

test("an edit of a person with no emails or phones yet just sets them", () => {
  expect(editedPerson(FIELDS, { id: 1 })).toEqual({
    name: "Asha Nair",
    emails: [{ value: "asha@example.com", primary: true, label: "work" }],
    phones: [{ value: "+919876543210", primary: true, label: "mobile" }],
  });
});
