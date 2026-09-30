import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { contact: { findUnique: vi.fn() } },
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

// One HubSpot account's API, as the job's client sees it.
const client = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
vi.mock("./hubspot.auth.js", () => ({ hubSpotClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import {
  findLinkByRateupId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import {
  handleHubSpotContactEvent,
  hubSpotContactIdFor,
  HUBSPOT_CONTACT_UPSERT,
  HUBSPOT_JOB_OPTIONS,
  processHubSpotContactJob,
  toHubSpotContactProperties,
} from "./hubspot.contacts.js";

type Mock = ReturnType<typeof vi.fn>;
const findContact = prisma.contact.findUnique as unknown as Mock;
const findLink = findLinkByRateupId as unknown as Mock;
const addJob = integrationTriggerQueue.add as unknown as Mock;

const LINK = { integrationId: "int-1", entityType: "contact" };

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: "org-1",
    credential: {
      access_token: "at",
      refresh_token: "rt",
      portalId: 4401,
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

const PROPERTIES = {
  firstname: "Asha",
  lastname: "Nair",
  email: "asha@example.com",
  phone: "+919876543210",
};

const job = (contactId = "c-1") => ({
  integrationName: "hubspot",
  triggerKey: HUBSPOT_CONTACT_UPSERT,
  orgId: "org-1",
  data: { contactId },
});

const searchFinds = (...results: ({ id: string; properties: object } | null)[]) => {
  for (const result of results) {
    client.post.mockResolvedValueOnce({ data: { results: result ? [result] : [] } });
  }
};

const httpError = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } });

beforeEach(() => {
  vi.clearAllMocks();
  findContact.mockResolvedValue(contact());
  findLink.mockResolvedValue(null);
});

describe("a RateUp contact, as HubSpot properties", () => {
  test("splits the name at the first space, lower-cases the email and adds the +", () => {
    expect(toHubSpotContactProperties(contact())).toEqual(PROPERTIES);
  });

  test("a one-word name is the first name alone", () => {
    expect(toHubSpotContactProperties(contact({ name: "Asha" }))).toMatchObject({
      firstname: "Asha",
      lastname: undefined,
    });
  });

  test("with neither email nor phone there is nothing HubSpot could find again", () => {
    expect(toHubSpotContactProperties(contact({ email: null, phone: " " }))).toBeNull();
  });
});

describe("contact events", () => {
  const context = { orgId: "org-1", integration: integration() };

  test("a new contact is queued by id, with retries for HubSpot's rate limit", async () => {
    await handleHubSpotContactEvent({ type: "contact.created", contact: contact() }, context);

    expect(addJob).toHaveBeenCalledWith(
      "hubspot-contact-upsert",
      expect.objectContaining({
        integrationName: "hubspot",
        triggerKey: HUBSPOT_CONTACT_UPSERT,
        data: { contactId: "c-1" },
        rateupContactId: "c-1",
      }),
      HUBSPOT_JOB_OPTIONS,
    );
  });

  test("an edit is queued only when name, email or phone changed", async () => {
    await handleHubSpotContactEvent(
      { type: "contact.updated", contact: contact(), changed: ["status", "lifecycle"] },
      context,
    );
    expect(addJob).not.toHaveBeenCalled();

    await handleHubSpotContactEvent(
      { type: "contact.updated", contact: contact(), changed: ["details"] },
      context,
    );
    expect(addJob).toHaveBeenCalledTimes(1);
  });

  test("deleting a contact forgets the link and leaves the HubSpot contact", async () => {
    await handleHubSpotContactEvent({ type: "contact.deleted", contact: contact() }, context);

    expect(removeLink).toHaveBeenCalledWith(LINK, "c-1");
    expect(addJob).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
  });
});

describe("sending a contact", () => {
  test("nothing is sent while the switch is off", async () => {
    await expect(
      processHubSpotContactJob(integration({ syncContacts: false }), job()),
    ).resolves.toBe("sync_off");
    expect(findContact).not.toHaveBeenCalled();
  });

  test("a contact deleted since it was queued is skipped", async () => {
    findContact.mockResolvedValue(null);
    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("contact_gone");
  });

  test("a contact with neither email nor phone is skipped", async () => {
    findContact.mockResolvedValue(contact({ email: null, phone: null }));
    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("nothing_to_send");
    expect(client.post).not.toHaveBeenCalled();
  });

  test("a linked contact is updated in place", async () => {
    findLink.mockResolvedValue({ externalId: "501", lastSyncHash: "older" });

    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("updated");
    expect(client.patch).toHaveBeenCalledWith("/crm/v3/objects/contacts/501", {
      properties: PROPERTIES,
    });
    expect(recordLink).toHaveBeenCalledWith(LINK, {
      rateupId: "c-1",
      externalId: "501",
      payload: PROPERTIES,
    });
  });

  test("a push identical to the last one makes no call", async () => {
    findLink.mockResolvedValue({ externalId: "501", lastSyncHash: hashSyncPayload(PROPERTIES) });

    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("unchanged");
    expect(client.patch).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
  });

  test("a linked contact deleted in HubSpot is matched or created again", async () => {
    findLink.mockResolvedValue({ externalId: "501", lastSyncHash: "older" });
    client.patch.mockRejectedValueOnce(httpError(404));
    searchFinds(null, null);
    client.post.mockResolvedValueOnce({ data: { id: "777" } });

    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("created");
    expect(removeLink).toHaveBeenCalledWith(LINK, "c-1");
    expect(recordLink).toHaveBeenCalledWith(LINK, expect.objectContaining({ externalId: "777" }));
  });

  test("looks by email first, and links a match filling only what HubSpot has empty", async () => {
    searchFinds({
      id: "601",
      properties: { firstname: "Asha K", lastname: "", email: "asha@example.com", phone: null },
    });

    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("linked");
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post.mock.calls[0][1].filterGroups[0].filters[0]).toEqual({
      propertyName: "email",
      operator: "EQ",
      value: "asha@example.com",
    });
    expect(client.patch).toHaveBeenCalledWith("/crm/v3/objects/contacts/601", {
      properties: { lastname: "Nair", phone: "+919876543210" },
    });
    expect(recordLink).toHaveBeenCalledWith(LINK, {
      rateupId: "c-1",
      externalId: "601",
      payload: PROPERTIES,
    });
  });

  test("then by phone, and a match with nothing empty is linked without an update", async () => {
    searchFinds(null, {
      id: "602",
      properties: {
        firstname: "A",
        lastname: "N",
        email: "old@example.com",
        phone: "+919876543210",
      },
    });

    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("linked");
    expect(client.post.mock.calls[1][1].filterGroups[0].filters[0]).toMatchObject({
      propertyName: "phone",
      value: "+919876543210",
    });
    expect(client.patch).not.toHaveBeenCalled();
  });

  test("nobody matching is created", async () => {
    searchFinds(null, null);
    client.post.mockResolvedValueOnce({ data: { id: "701" } });

    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("created");
    expect(client.post).toHaveBeenLastCalledWith("/crm/v3/objects/contacts", {
      properties: PROPERTIES,
    });
    expect(recordLink).toHaveBeenCalledWith(LINK, expect.objectContaining({ externalId: "701" }));
  });

  test("losing a race to create the same email links the contact that won", async () => {
    searchFinds(null, null);
    client.post.mockRejectedValueOnce(
      httpError(409, { message: "Contact already exists. Existing ID: 888" }),
    );

    await expect(processHubSpotContactJob(integration(), job())).resolves.toBe("linked");
    expect(recordLink).toHaveBeenCalledWith(LINK, expect.objectContaining({ externalId: "888" }));
  });

  test("any other HubSpot error fails the job, so it is retried", async () => {
    client.post.mockRejectedValueOnce(httpError(429));
    await expect(processHubSpotContactJob(integration(), job())).rejects.toThrow("HTTP 429");
    expect(recordLink).not.toHaveBeenCalled();
  });
});

describe("the HubSpot contact for a deal", () => {
  test("a linked contact is used as it is, with no call", async () => {
    findLink.mockResolvedValue({ externalId: "501", lastSyncHash: "older" });
    await expect(hubSpotContactIdFor(integration(), client as never, contact())).resolves.toBe(
      "501",
    );
    expect(client.post).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
  });

  test("otherwise matched or created and linked, even with the contacts switch off", async () => {
    searchFinds(null, null);
    client.post.mockResolvedValueOnce({ data: { id: "701" } });

    await expect(
      hubSpotContactIdFor(integration({ syncContacts: false }), client as never, contact()),
    ).resolves.toBe("701");
    expect(recordLink).toHaveBeenCalledWith(LINK, expect.objectContaining({ externalId: "701" }));
  });

  test("a contact with neither email nor phone has none", async () => {
    await expect(
      hubSpotContactIdFor(integration(), client as never, contact({ email: null, phone: null })),
    ).resolves.toBeNull();
  });
});
