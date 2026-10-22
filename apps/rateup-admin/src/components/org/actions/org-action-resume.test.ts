import { describe, expect, it } from "vitest";

import {
  grantPacksDraft,
  ORG_ACTION_RESUME_KINDS,
  orgActionFromIntent,
  orgActionStepUp,
  planDraft,
  readDraft,
  readLimitsDraft,
} from "./org-action-resume";

describe("org action step-up round trip", () => {
  it("reopens the same action with its fields", () => {
    const intent = orgActionStepUp(
      "org_1",
      { kind: "plan" },
      { planId: "p", expiry: "2027-01-01", keepCaps: false },
    );
    expect(intent.path).toBe("/orgs/org_1");
    expect(ORG_ACTION_RESUME_KINDS).toContain(intent.kind);
    expect(orgActionFromIntent(intent)).toEqual({ kind: "plan" });
    expect(readDraft(intent, "plan", planDraft)).toEqual({
      planId: "p",
      expiry: "2027-01-01",
      keepCaps: false,
    });
  });

  it("keeps the pack being revoked", () => {
    const intent = orgActionStepUp("org_1", {
      kind: "revoke-pack",
      addonId: "addon_9",
      label: "Active contact pack",
    });
    expect(orgActionFromIntent(intent)).toEqual({
      kind: "revoke-pack",
      addonId: "addon_9",
      label: "Active contact pack",
    });
  });

  it("covers every guarded org action", () => {
    for (const kind of ["expiry", "limits", "grant-packs", "suspend", "unsuspend"] as const) {
      expect(orgActionFromIntent(orgActionStepUp("org_1", { kind }))).toEqual({ kind });
    }
  });

  it("does not hand one dialog's draft to another, or a malformed one to anyone", () => {
    const plan = orgActionStepUp("org_1", { kind: "plan" }, { planId: "p" });
    expect(readDraft(plan, "plan", planDraft)).toBeNull();
    const packs = orgActionStepUp("org_1", { kind: "grant-packs" }, { kind: "X", quantity: 2 });
    expect(readDraft(packs, "grant-packs", grantPacksDraft)).toBeNull();
    expect(readLimitsDraft(plan)).toBeNull();
  });

  it("ignores intents that are not org actions", () => {
    expect(
      orgActionFromIntent({ path: "/orgs/org_1", kind: "delete-org", id: "org_1" }),
    ).toBeNull();
    expect(orgActionFromIntent(null)).toBeNull();
  });
});
