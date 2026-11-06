import { describe, expect, test } from "vitest";

import { WaMessageAssignStatus } from "../../../../types/enums.js";
import { NOT_SPAM_EVENT } from "../../constants.js";
import { internalEventSentence } from "./internalEvent.js";

const admin = { id: "u1", name: "Admin" };
const sara = { id: "u2", name: "Sara" };
const leo = { id: "u3", name: "Leo" };
const automation = { id: null, name: "RateUp" };

function say(over: Partial<Parameters<typeof internalEventSentence>[0]>) {
  return internalEventSentence({
    status: undefined,
    actor: admin,
    added: [],
    removed: [],
    fallback: "did something",
    ...over,
  });
}

describe("internalEventSentence", () => {
  test("taking a chat yourself does not name you twice", () => {
    expect(say({ status: WaMessageAssignStatus.ASSIGNED, actor: admin, added: [admin] })).toBe(
      "Admin took this chat",
    );
  });

  test("assigning to someone else names both", () => {
    expect(say({ status: WaMessageAssignStatus.ASSIGNED, added: [sara] })).toBe(
      "Admin assigned this chat to Sara",
    );
    expect(say({ status: WaMessageAssignStatus.ASSIGNED, added: [sara, leo] })).toBe(
      "Admin assigned this chat to Sara and Leo",
    );
  });

  test("leaving a chat reads as leaving, not as being revoked", () => {
    expect(say({ status: WaMessageAssignStatus.UNASSIGNED, actor: sara, removed: [sara] })).toBe(
      "Sara left this chat",
    );
    expect(say({ status: WaMessageAssignStatus.UNASSIGNED, removed: [sara] })).toBe(
      "Admin removed Sara from this chat",
    );
    // An unassign sends its people through `added`; only a reassignment splits the sides.
    expect(say({ status: WaMessageAssignStatus.UNASSIGNED, added: [sara] })).toBe(
      "Admin removed Sara from this chat",
    );
  });

  test("a reassignment says where the chat went", () => {
    expect(say({ status: "REASSIGNED", removed: [sara], added: [leo] })).toBe(
      "Admin moved this chat from Sara to Leo",
    );
  });

  test("a half-reassignment does not leave a dangling from or to", () => {
    expect(say({ status: "REASSIGNED", added: [leo] })).toBe("Admin assigned this chat to Leo");
    expect(say({ status: "REASSIGNED", removed: [sara] })).toBe(
      "Admin removed Sara from this chat",
    );
  });

  test("the automation actor is never named — the sentence goes passive instead", () => {
    expect(say({ status: WaMessageAssignStatus.CLOSED, actor: automation })).toBe(
      "Closed automatically",
    );
    expect(say({ status: WaMessageAssignStatus.ASSIGNED, actor: automation, added: [sara] })).toBe(
      "Assigned to Sara automatically",
    );
  });

  test("status changes read as verbs, not as marking a label", () => {
    expect(say({ status: WaMessageAssignStatus.CLOSED })).toBe("Admin closed this chat");
    expect(say({ status: WaMessageAssignStatus.RESOLVED })).toBe("Admin resolved this chat");
    expect(say({ status: WaMessageAssignStatus.UNRESOLVED })).toBe("Admin reopened this chat");
  });

  test("spam stays about the contact, because that is what it marks", () => {
    expect(say({ status: WaMessageAssignStatus.SPAM })).toBe("Admin marked this contact as spam");
    expect(say({ status: NOT_SPAM_EVENT })).toBe("Admin marked this contact as not spam");
  });

  test("an unknown status falls back to the old fragment with the actor in front", () => {
    expect(say({ status: "SOMETHING_NEW" })).toBe("Admin did something");
    expect(say({ status: "SOMETHING_NEW", actor: null })).toBe("did something");
  });
});
