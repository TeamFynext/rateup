import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/logger.js", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("../merge/suggestions.service.js", () => ({ suggestMerge: vi.fn() }));

const { identitiesFromContact, legacyPhone } = await import("./identity.service.js");
const { reachFor } = await import("./reach.js");

describe("legacyPhone", () => {
  test("a real number is a phone", () => {
    expect(legacyPhone({ phone: "919188346187" })).toBe("919188346187");
  });

  test("an Instagram id copied into phone is not", () => {
    expect(legacyPhone({ phone: "1660876185146676", igsId: "1660876185146676" })).toBeNull();
  });

  test("anything over 15 digits is not, even without the matching id", () => {
    expect(legacyPhone({ phone: "1660876185146676" })).toBeNull();
  });

  test("a Messenger id or a BSUID in phone is not", () => {
    expect(legacyPhone({ phone: "123456789", psid: "123456789" })).toBeNull();
    expect(legacyPhone({ phone: "IN.1684570989242773" })).toBeNull();
  });
});

describe("identitiesFromContact", () => {
  test("an Instagram contact gets its Instagram id, not a phone", () => {
    const kinds = identitiesFromContact({
      phone: "1660876185146676",
      igsId: "1660876185146676",
    }).map((row) => row.kind);
    expect(kinds).toEqual(["IG_SCOPED"]);
  });
});

describe("reachFor", () => {
  test("no phone and no BSUID means no WhatsApp", () => {
    expect(reachFor({ phone: null, bsuids: [] }, "bp1")).toEqual({
      reachable: false,
      reason: "NO_WHATSAPP",
    });
  });
});

describe("attachIdentity without a channel", () => {
  test("matches the id already recorded under its channel instead of adding a copy", async () => {
    const prisma = (await import("../../../utils/prisma.js")).default as unknown as Record<
      string,
      unknown
    >;
    const update = vi.fn(async () => ({}));
    const create = vi.fn();
    prisma.contactIdentity = {
      findMany: vi.fn(async () => [
        { id: "scoped", contactId: "c1", scope: "channel-1", verified: true },
      ]),
      update,
      create,
      count: vi.fn(async () => 1),
    };
    const { attachIdentity } = await import("./identity.service.js");
    const result = await attachIdentity("org", "c1", {
      kind: "IG_SCOPED",
      value: "1660876185146676",
      source: "IMPORT",
    });
    expect(result).toEqual({ status: "updated", identityId: "scoped" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("replaceColumnIdentity", () => {
  test("an edited phone replaces the old identity and becomes the primary", async () => {
    const prisma = (await import("../../../utils/prisma.js")).default as unknown as Record<
      string,
      unknown
    >;
    const deleteMany = vi.fn(async () => ({ count: 1 }));
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const update = vi.fn(async () => ({}));
    prisma.contactIdentity = {
      deleteMany,
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 1),
      create: vi.fn(async () => ({ id: "new" })),
      updateMany,
      update,
    };
    prisma.$transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops));
    const { replaceColumnIdentity } = await import("./identity.service.js");

    await replaceColumnIdentity("org", "c1", "phone", "919188346187", "919000000001");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { orgId: "org", contactId: "c1", kind: "PHONE", scope: "", value: "919188346187" },
    });
    expect(update).toHaveBeenCalledWith({ where: { id: "new" }, data: { isPrimary: true } });
  });

  test("an unchanged value touches nothing", async () => {
    const { replaceColumnIdentity } = await import("./identity.service.js");
    const prisma = (await import("../../../utils/prisma.js")).default as unknown as {
      contactIdentity: { deleteMany: ReturnType<typeof vi.fn> };
    };
    prisma.contactIdentity.deleteMany.mockClear();
    await replaceColumnIdentity("org", "c1", "email", "A@x.com", "a@x.com");
    expect(prisma.contactIdentity.deleteMany).not.toHaveBeenCalled();
  });
});

describe("updateManualIdentity", () => {
  async function setup(identity: Record<string, unknown>, holder: string | null = null) {
    const prisma = (await import("../../../utils/prisma.js")).default as unknown as Record<
      string,
      unknown
    >;
    const update = vi.fn(async () => ({}));
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const contactUpdate = vi.fn(async () => ({}));
    const tx = {
      contactIdentity: {
        update,
        updateMany,
        findFirst: vi.fn(async () => ({ id: identity.id, value: "919000000001", isPrimary: true })),
      },
      contact: { update: contactUpdate },
    };
    prisma.contactIdentity = {
      findFirst: vi.fn(async (args: { where: { id?: string } }) =>
        args.where.id ? identity : holder ? { contactId: holder } : null,
      ),
    };
    prisma.contact = { findFirst: vi.fn(async () => null) };
    prisma.$transaction = vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx));
    const { updateManualIdentity } = await import("./identity.service.js");
    return { updateManualIdentity, update, updateMany, contactUpdate };
  }

  const phone = { id: "i1", kind: "PHONE", value: "919188346187", contactId: "c1" };

  test("a second number can be corrected and made the main one", async () => {
    const { updateManualIdentity, update, updateMany, contactUpdate } = await setup(phone);
    const result = await updateManualIdentity("org", "c1", "i1", {
      value: "+91 90000 00001",
      isPrimary: true,
    });
    expect(result).toEqual({ status: "ok" });
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPrimary: false } }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "i1" },
        data: expect.objectContaining({ value: "919000000001", isPrimary: true }),
      }),
    );
    expect(contactUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { phone: "919000000001" },
    });
  });

  test("a platform id is never edited by hand", async () => {
    const { updateManualIdentity } = await setup({ ...phone, kind: "WA_BSUID" });
    expect(await updateManualIdentity("org", "c1", "i1", { value: "x" })).toEqual({
      status: "not_editable",
    });
  });

  test("a value another contact holds is refused", async () => {
    const { updateManualIdentity } = await setup(phone, "c2");
    expect(await updateManualIdentity("org", "c1", "i1", { value: "919000000001" })).toEqual({
      status: "owned_by_other",
      ownerContactId: "c2",
    });
  });

  test("a value that is not a phone is refused", async () => {
    const { updateManualIdentity } = await setup(phone);
    expect(await updateManualIdentity("org", "c1", "i1", { value: "12" })).toEqual({
      status: "invalid",
    });
  });
});

describe("suggestFromProvidedDetails", () => {
  test("a webchat visitor who typed another contact's phone raises a suggestion, never a merge", async () => {
    const prisma = (await import("../../../utils/prisma.js")).default as unknown as Record<
      string,
      unknown
    >;
    prisma.contactIdentity = {
      findFirst: vi.fn(async (args: { where: { kind: string } }) =>
        args.where.kind === "PHONE" ? { contactId: "whatsapp-contact" } : null,
      ),
    };
    prisma.contact = { findFirst: vi.fn(async () => null) };
    const { suggestMerge } = await import("../merge/suggestions.service.js");
    vi.mocked(suggestMerge).mockClear();
    const { suggestFromProvidedDetails } = await import("./identity.service.js");

    await suggestFromProvidedDetails("org", "webchat-contact", {
      phone: "+91 91883 46187",
      email: "not-an-email",
    });

    expect(suggestMerge).toHaveBeenCalledTimes(1);
    expect(suggestMerge).toHaveBeenCalledWith("org", "webchat-contact", "whatsapp-contact", {
      reason: "CUSTOMER_PROVIDED",
      detail: "919188346187",
    });
  });

  test("a visitor id that is no phone or email is left alone", async () => {
    const { suggestMerge } = await import("../merge/suggestions.service.js");
    vi.mocked(suggestMerge).mockClear();
    const { suggestFromProvidedDetails } = await import("./identity.service.js");
    await suggestFromProvidedDetails("org", "webchat-contact", { phone: "visitor-8f3a" });
    expect(suggestMerge).not.toHaveBeenCalled();
  });
});
