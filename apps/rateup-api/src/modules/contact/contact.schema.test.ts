import { describe, expect, test } from "vitest";

import { updateContactSchema } from "./contact.schema.js";

/**
 * The contact form posts `""` for any field the user emptied. These fields land in columns that
 * either reject a blank outright (`lifecycleId` is a uuid) or would store a meaningless one
 * (`external_id` is half of a unique index), so the schema normalises before Prisma sees it.
 */
describe("updateContactSchema", () => {
  test("normalises a blank lifecycleId to null", () => {
    expect(updateContactSchema.parse({ lifecycleId: "" }).lifecycleId).toBeNull();
  });

  test("keeps a real lifecycleId", () => {
    const lifecycleId = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

    expect(updateContactSchema.parse({ lifecycleId }).lifecycleId).toBe(lifecycleId);
  });

  test("rejects a lifecycleId that is neither a uuid nor blank", () => {
    expect(() => updateContactSchema.parse({ lifecycleId: "not-a-uuid" })).toThrow();
  });

  test("an omitted field stays undefined so a partial update does not clear it", () => {
    const parsed = updateContactSchema.parse({ name: "Ann" });

    expect(parsed.lifecycleId).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.external_id).toBeUndefined();
  });

  test("carries the contact-form fields through instead of stripping them", () => {
    const parsed = updateContactSchema.parse({
      email: "ann@example.com",
      dob: "1990-04-02T00:00:00.000Z",
      external_id: "crm-7",
    });

    expect(parsed.email).toBe("ann@example.com");
    expect(parsed.dob).toEqual(new Date("1990-04-02T00:00:00.000Z"));
    expect(parsed.external_id).toBe("crm-7");
  });

  test("normalises a blank email or external_id to null", () => {
    const parsed = updateContactSchema.parse({ email: "", external_id: "" });

    expect(parsed.email).toBeNull();
    expect(parsed.external_id).toBeNull();
  });
});
