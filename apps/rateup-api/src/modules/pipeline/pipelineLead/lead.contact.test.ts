import { beforeEach, describe, expect, test, vi } from "vitest";

const contact = { findMany: vi.fn() };

vi.mock("../../../utils/prisma.js", () => ({ default: { contact } }));

const createContact = vi.fn();
vi.mock("../../contact/contact.service.js", () => ({
  createContact: (...args: unknown[]) => createContact(...args),
}));

const { resolveContactForLead } = await import("./lead.contact.js");

const ORG = "org-1";

beforeEach(() => {
  vi.clearAllMocks();
  contact.findMany.mockResolvedValue([]);
  createContact.mockResolvedValue({ id: "contact-new" });
});

describe("the contact behind a manually added lead", () => {
  test("creates one when the number is unknown", async () => {
    const resolved = await resolveContactForLead(
      ORG,
      "+91 98765 43210",
      "Ritu Bansal",
      "ritu@example.com",
    );

    expect(resolved).toEqual({ contactId: "contact-new", created: true });
    // Stored the way the rest of Rateup stores a number: digits, no `+`.
    expect(createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG,
        name: "Ritu Bansal",
        phone: "919876543210",
        email: "ritu@example.com",
      }),
      undefined,
      {},
    );
  });

  test("passes an import's quiet flag on, so the new contact fires no triggers", async () => {
    await resolveContactForLead(ORG, "919876543210", "Ritu", null, { quiet: true });

    expect(createContact).toHaveBeenCalledWith(expect.anything(), undefined, { quiet: true });
  });

  test("links the existing contact instead of duplicating them", async () => {
    contact.findMany.mockResolvedValue([{ id: "contact-1", phone: "919876543210" }]);

    // Typed without the country code the contact was saved with.
    const resolved = await resolveContactForLead(ORG, "9876543210", "Ritu");

    expect(resolved).toEqual({ contactId: "contact-1", created: false });
    expect(createContact).not.toHaveBeenCalled();
  });

  test("ignores a stored number too short to mean one person", async () => {
    contact.findMany.mockResolvedValue([{ id: "contact-junk", phone: "43210" }]);

    const resolved = await resolveContactForLead(ORG, "+919876543210", "Ritu");

    expect(resolved).toEqual({ contactId: "contact-new", created: true });
  });

  test("neither matches nor creates on a number too short to be one", async () => {
    expect(await resolveContactForLead(ORG, "12345", "Ritu")).toBeNull();
    expect(contact.findMany).not.toHaveBeenCalled();
    expect(createContact).not.toHaveBeenCalled();
  });

  test("keeps the lead when the contact book refuses", async () => {
    createContact.mockRejectedValue(new Error("nope"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await resolveContactForLead(ORG, "919876543210", "Ritu")).toBeNull();
    logged.mockRestore();
  });
});
