import { describe, expect, test } from "vitest";

import {
  budgetText,
  canHandBack,
  findThreadNumber,
  isMetaAiMessage,
  reasonLabel,
  threadState,
} from "./metaAgentThread";

describe("threadState", () => {
  test("uses the recorded owner, else UNKNOWN once Meta AI has replied", () => {
    expect(threadState({ metaAgentThreadOwner: "STAFF" })).toBe("STAFF");
    expect(threadState({ metaAgentThreadOwner: null, metaAgentInvolved: true })).toBe("UNKNOWN");
    expect(threadState({ metaAgentThreadOwner: null })).toBeNull();
    expect(threadState(null)).toBeNull();
  });

  test("only a staff or unknown thread with a phone can be handed back", () => {
    expect(canHandBack("STAFF", "919188346187")).toBe(true);
    expect(canHandBack("UNKNOWN", "+91 91883")).toBe(true);
    expect(canHandBack("AI", "919188346187")).toBe(false);
    expect(canHandBack("STAFF", null)).toBe(false);
  });
});

describe("reasonLabel", () => {
  test("words known reasons and passes others through", () => {
    expect(reasonLabel("customer_request")).toBe("The customer asked for a person");
    expect(reasonLabel("something_new")).toBe("something_new");
    expect(reasonLabel(null)).toBeNull();
  });
});

describe("findThreadNumber", () => {
  const numbers = [
    { id: "a", phone: "+91 90000 00001", phoneId: "p1" },
    { id: "b", phone: "919000000002", phoneId: "p2" },
  ];

  test("matches Meta's phone id first, then the channel number", () => {
    expect(findThreadNumber(numbers, { metadata: { phone_number_id: "p2" } })?.id).toBe("b");
    expect(
      findThreadNumber(numbers, { lastMessage: { sourceIdentifier: "919000000001" } })?.id,
    ).toBe("a");
  });

  test("falls back to the only number, never guesses between several", () => {
    expect(findThreadNumber([numbers[0]], {})?.id).toBe("a");
    expect(findThreadNumber(numbers, {})).toBeUndefined();
  });
});

describe("isMetaAiMessage", () => {
  test("recognises Meta AI's originator tag", () => {
    const tagged = (tag: unknown) => ({ messageBody: { send: { biz_opaque_callback_data: tag } } });
    expect(isMetaAiMessage(tagged('{"originator":"bizai"}'))).toBe(true);
    expect(isMetaAiMessage(tagged('{"originator":"other"}'))).toBe(false);
    expect(isMetaAiMessage(tagged("not json"))).toBe(false);
    expect(isMetaAiMessage({ messageBody: { send: {} } })).toBe(false);
  });
});

describe("budgetText", () => {
  test("reads a cap as a sentence", () => {
    expect(budgetText({ unit_type: "ai_turn", time_window: "seven_days", max_budget: 50 })).toBe(
      "50 AI replies per conversation, rolling 7 days",
    );
  });
});
