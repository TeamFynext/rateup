import { describe, expect, test } from "vitest";

import { missingAddressField, requiredAddressFields } from "./addressRules.js";

const full = {
  name: "Asha",
  line1: "12 MG Road",
  city: "Kochi",
  region: "Kerala",
  postalCode: "682016",
  country: "IN",
};

describe("a delivery address", () => {
  test("is complete with name, street, city, state, PIN and country in India", () => {
    expect(missingAddressField(full)).toBeNull();
  });

  test.each(["name", "line1", "city", "region", "postalCode", "country"] as const)(
    "is missing %s when it is blank",
    (field) => {
      expect(missingAddressField({ ...full, [field]: "  " })).toBe(field);
    },
  );

  test("needs no postal code in the UAE", () => {
    expect(requiredAddressFields("AE")).not.toContain("postalCode");
    expect(
      missingAddressField({
        name: "Omar",
        line1: "Villa 4",
        city: "Dubai",
        region: "Dubai",
        country: "AE",
      }),
    ).toBeNull();
  });

  test("needs no state where addresses don't carry one", () => {
    expect(requiredAddressFields("SG")).not.toContain("region");
    expect(requiredAddressFields("SG")).toContain("postalCode");
  });

  test("asks for the country before anything that depends on it", () => {
    expect(missingAddressField(null)).toBe("name");
    expect(missingAddressField({ name: "A", line1: "1", city: "X" })).toBe("country");
  });
});
