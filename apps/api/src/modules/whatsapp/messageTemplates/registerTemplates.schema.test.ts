import { describe, expect, test } from "vitest";

import { registerTemplatesInDbBodySchema } from "./wa_templates.schema.js";

// A template as Meta's /message_templates (and so GET /templates/unregistered) returns it.
const metaTemplate = {
  id: "1234567890",
  name: "order_confirm",
  language: "en_US",
  status: "APPROVED",
  category: "UTILITY",
  parameter_format: "POSITIONAL",
  components: [
    { type: "BODY", text: "Confirm order {{1}}?", example: { body_text: [["#42"]] } },
    {
      type: "BUTTONS",
      buttons: [
        { type: "QUICK_REPLY", text: "Yes" },
        { type: "QUICK_REPLY", text: "No" },
      ],
    },
  ],
};

describe("registerTemplatesInDbBodySchema", () => {
  test("accepts Meta's template with its accept button, keeping Meta's other fields", () => {
    const parsed = registerTemplatesInDbBodySchema.parse([
      { data: metaTemplate, acceptButton: "Yes" },
    ]);
    expect(parsed[0]!.data).toMatchObject({ parameter_format: "POSITIONAL" });
  });

  test.each([
    ["an empty list", []],
    [
      "a template without an id",
      [{ data: { ...metaTemplate, id: undefined }, acceptButton: "Yes" }],
    ],
    [
      "components that are not a list",
      [{ data: { ...metaTemplate, components: "x" }, acceptButton: "Yes" }],
    ],
    ["a bare object", { data: metaTemplate }],
  ])("refuses %s", (_label, body) => {
    expect(registerTemplatesInDbBodySchema.safeParse(body).success).toBe(false);
  });
});
