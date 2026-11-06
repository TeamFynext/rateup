import { describe, expect, it } from "vitest";

import {
  conflictValue,
  contactName,
  genderText,
  identityBadge,
  identityLabel,
  orientPair,
} from "./contactIdentity";

describe("identityLabel", () => {
  it("adds a plus to a phone and never shows a raw Instagram id", () => {
    expect(identityLabel({ kind: "PHONE", value: "919400651372" })).toBe("+919400651372");
    expect(identityLabel({ kind: "IG_SCOPED", value: "1784", username: "acme" })).toBe("@acme");
    expect(identityLabel({ kind: "IG_SCOPED", value: "1784" })).toBe("Instagram user");
  });
});

describe("identityBadge", () => {
  it("names the platform and the account", () => {
    expect(
      identityBadge({
        kind: "IG_SCOPED",
        channel: { id: "c", platform: "INSTAGRAM", name: null, username: "acme.store" },
      }),
    ).toBe("Instagram · @acme.store");
  });

  it("falls back to the kind without a channel", () => {
    expect(identityBadge({ kind: "EMAIL", channel: null })).toBe("Email");
  });
});

describe("contactName", () => {
  it("prefers the name, then the WhatsApp name, then the phone", () => {
    expect(contactName({ name: null, phone: "9190", email: null, whatsappUserName: "Ravi" })).toBe(
      "Ravi",
    );
    expect(contactName({ name: null, phone: "9190", email: null })).toBe("+9190");
    expect(contactName(null)).toBe("Unnamed contact");
  });
});

describe("conflictValue", () => {
  it("resolves a lifecycle id to its name and formats a birthday", () => {
    const lifecycles = [{ id: "l1", name: "Lead" }];
    expect(
      conflictValue({ field: "lifecycleId", label: "", source: "l1", target: null }, "source", {
        lifecycles,
      }),
    ).toBe("Lead");
    expect(
      conflictValue({ field: "lifecycleId", label: "", source: "l1", target: null }, "target", {
        lifecycles,
      }),
    ).toBe("—");
    expect(
      conflictValue(
        { field: "dob", label: "", source: "1990-04-02T00:00:00.000Z", target: null },
        "source",
        { lifecycles },
      ),
    ).toMatch(/Apr 1990/);
  });
});

describe("orientPair", () => {
  it("keeps the older contact", () => {
    expect(
      orientPair({ id: "new", createdAt: "2026-02-01" }, { id: "old", createdAt: "2025-01-01" }),
    ).toEqual({ sourceId: "new", targetId: "old" });
    expect(
      orientPair({ id: "old", createdAt: "2025-01-01" }, { id: "new", createdAt: "2026-02-01" }),
    ).toEqual({ sourceId: "new", targetId: "old" });
  });
});

describe("genderText", () => {
  it("reads a stored enum as a word", () => {
    expect(genderText("FEMALE")).toBe("Female");
    expect(genderText(null)).toBeNull();
  });
});
