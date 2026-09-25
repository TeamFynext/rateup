import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import { buildContactSchema, contactFormDefaults, toFormValues } from "./contact-form-schema.ts";

const t = ((key: string) => key) as unknown as TFunction;
const valid = { ...contactFormDefaults, name: "Ann", phone: "+919876543210" };

describe("contact form schema", () => {
  test("a saved contact's null address becomes an empty field", () => {
    expect(toFormValues({ id: "c1", address: null }).address).toBe("");
    expect(toFormValues({ id: "c1", address: "12 MG Road" }).address).toBe("12 MG Road");
  });

  test("email is optional but must be well-formed when given", () => {
    const schema = buildContactSchema(t);
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, email: "ann@example.com" }).success).toBe(true);

    const result = schema.safeParse({ ...valid, email: "ann@" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["email"]);
  });
});
