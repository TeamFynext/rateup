import { describe, expect, it } from "vitest";

import {
  AUTOMATION_TEMPLATES,
  TEMPLATE_CATEGORIES,
  templateFormValues,
} from "@/components/dashboard/automation/automation-templates.ts";
import { buildRuleSentence } from "@/components/dashboard/automation/rule-sentence.ts";
import { ShopifyEvents } from "@/types/enums.ts";

import type { CreateRuleInput } from "../schema.ts";
import { actionChannelProblem, createRuleSchema, DEFAULT_RULE_VALUES } from "../schema.ts";
import { blockerFor, stepFor } from "./step-blockers.ts";

const complete: CreateRuleInput = {
  ...DEFAULT_RULE_VALUES,
  name: "Refund requests",
  whatsappSettingsPhoneIds: ["phone-1"],
  groups: [
    {
      operator: "OR",
      conditions: [{ field: "MESSAGE_BODY", operator: "CONTAINS", value: "refund" }],
    },
  ],
  actions: [{ type: "ASSIGN_TEAM", value: "team-1" }],
};

describe("blockerFor", () => {
  it("lets a complete rule through every step", () => {
    for (const step of ["trigger", "conditions", "actions", "review"] as const) {
      expect(blockerFor(step, complete)).toBeNull();
    }
  });

  it("asks for an account on the trigger step only", () => {
    const rule = { ...complete, whatsappSettingsPhoneIds: [] };
    expect(blockerFor("trigger", rule)).toBe("Tick at least one account to continue");
    expect(blockerFor("conditions", rule)).toBeNull();
  });

  it("needs a condition for a message trigger, even while later steps are unfinished", () => {
    const rule = { ...complete, name: "", groups: [] };
    expect(blockerFor("conditions", rule)).toMatch(/at least one condition/);
  });

  it("names the duplicated condition and the unfinished action", () => {
    const duplicate = {
      ...complete,
      groups: [
        {
          operator: "OR",
          conditions: [
            { field: "MESSAGE_BODY", operator: "CONTAINS", value: "refund" },
            { field: "MESSAGE_BODY", operator: "CONTAINS", value: "refund" },
          ],
        },
      ],
    };
    expect(blockerFor("conditions", duplicate)).toBe("Remove the repeated condition");

    const unfinished = { ...complete, actions: [{ type: "ATTACH_LABEL", value: "" }] };
    expect(blockerFor("actions", unfinished)).toBe("Finish the “Attach Label” action");
  });

  it("asks which business hours when the limit is on", () => {
    const rule = {
      ...complete,
      options: { ...complete.options, businessHours: { enabled: true } },
    };
    expect(blockerFor("review", rule)).toBe("Pick which business hours");
  });
});

describe("stepFor", () => {
  it("sends option fields to the step that shows them", () => {
    expect(stepFor(["options", "shopifyEvent"])).toBe("trigger");
    expect(stepFor(["groups", 0, "conditions", 1, "value"])).toBe("conditions");
    expect(stepFor(["actions", 2, "value", "templateId"])).toBe("actions");
    expect(stepFor(["name"])).toBe("review");
  });
});

describe("templates", () => {
  it("only fail on the ids the author has to pick (actions, a stage)", () => {
    for (const template of AUTOMATION_TEMPLATES) {
      const values = {
        ...templateFormValues(template),
        whatsappSettingsPhoneIds: ["account-1"],
      };
      const parsed = createRuleSchema.safeParse(values);
      const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path[0]);
      expect(
        paths.every((head) => head === "actions" || head === "groups"),
        template.id,
      ).toBe(true);
    }
  });
});

describe("buildRuleSentence", () => {
  const known = new Map([
    ["team:team-1", "Support"],
    ["account:phone-1", "+1 555 0100"],
  ]);
  const names = (kind: string, id: string) => known.get(`${kind}:${id}`);

  it("reads a finished rule as one sentence", () => {
    const text = buildRuleSentence(complete, names)
      .map((part) => part.text)
      .join(" ")
      .replace(/ ([,.])/g, "$1");
    expect(text).toBe(
      "When a customer messages you on +1 555 0100 and it mentions “refund”, assign to Support.",
    );
  });

  it("marks what is still missing", () => {
    const parts = buildRuleSentence(
      { ...complete, actions: [{ type: "ASSIGN_TEAM", value: "" }] },
      names,
    );
    expect(parts.find((part) => part.step === "actions")?.role).toBe("missing");
  });
});

describe("rules on several channels", () => {
  const multi: CreateRuleInput = {
    ...complete,
    platform: "WHATSAPP",
    platforms: ["WHATSAPP", "FACEBOOK"],
    whatsappSettingsPhoneIds: ["phone-1", "page-1"],
  };
  const platformOf = new Map([
    ["phone-1", "WHATSAPP"],
    ["page-1", "FACEBOOK"],
  ]);

  it("passes when every channel has an account", () => {
    expect(blockerFor("trigger", multi, platformOf)).toBeNull();
  });

  it("asks for an account on a channel that has none ticked", () => {
    const rule = { ...multi, whatsappSettingsPhoneIds: ["phone-1"] };
    expect(blockerFor("trigger", rule, platformOf)).toBe(
      "Tick a Messenger account, or turn Messenger off",
    );
  });

  it("names the action a channel cannot run", () => {
    const rule: CreateRuleInput = {
      ...multi,
      actions: [{ type: "SEND_TEMPLATE", value: { templateId: "t", variableMapping: [] } }],
    };
    expect(blockerFor("actions", rule, platformOf)).toBe("“Send Template” can't run on Messenger");
  });

  it("keeps store events to one channel", () => {
    const rule: CreateRuleInput = {
      ...multi,
      triggerEvent: "SHOPIFY_EVENT",
      groups: [],
      options: { ...multi.options, shopifyEvent: ShopifyEvents.ORDERS_CREATE },
    };
    expect(blockerFor("trigger", rule, platformOf)).toMatch(/one channel/);
  });
});

describe("template catalogue", () => {
  it("gives every template a unique id and a known category", () => {
    const ids = AUTOMATION_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of AUTOMATION_TEMPLATES) {
      expect(TEMPLATE_CATEGORIES.map((c) => c.value)).toContain(template.category);
    }
  });

  it("keeps templates that run everywhere free of single-channel actions", () => {
    for (const template of AUTOMATION_TEMPLATES.filter((t) => t.everyChannel)) {
      const values = templateFormValues(template, DEFAULT_RULE_VALUES, [
        "WHATSAPP",
        "INSTAGRAM",
        "FACEBOOK",
      ]);
      for (const action of values.actions) {
        expect(actionChannelProblem(action.type, values.platforms), template.id).toBeNull();
      }
    }
  });
});
