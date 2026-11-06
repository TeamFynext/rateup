import { describe, expect, test } from "vitest";

import {
  findBiginStageMapping,
  isStaleContactLinkError,
  isStaleRecordIdError,
  resolveCrmLeadStatus,
} from "./zoho.types.js";

const QUALIFIED = { stageId: "stage-q", stageName: "Qualified", biginStageName: "Qualification" };
const WON = { stageId: "stage-w", stageName: "Won", biginStageName: "Closed Won" };
/** Configured before the migration, and the Update Center could not resolve it. */
const UNRESOLVED = { lifecycleId: "life-x", lifecycleName: "Old stage", biginStageName: "Nurture" };

describe("finding the Bigin stage for a trigger", () => {
  test("matches the pipeline column the lead moved to", () => {
    expect(findBiginStageMapping([QUALIFIED, WON], { stageId: "stage-w" })).toBe(WON);
  });

  // The contact write paths still enqueue this trigger with a lifecycle rather
  // than a stage, so those keep resolving.
  test("falls back to the lifecycle when the trigger carries no stage", () => {
    const mapping = findBiginStageMapping([QUALIFIED, UNRESOLVED], { lifecycleId: "life-x" });
    expect(mapping).toBe(UNRESOLVED);
  });

  test("prefers the stage when the trigger carries both", () => {
    const mapping = findBiginStageMapping([QUALIFIED, UNRESOLVED], {
      stageId: "stage-q",
      lifecycleId: "life-x",
    });
    expect(mapping).toBe(QUALIFIED);
  });

  // The bug this function exists for: `m.stageId === data.stageId` is true for
  // any entry without a stageId when the trigger has none either, so an
  // unrelated Bigin stage would be stamped onto the deal.
  test("does not match an unmapped entry when the trigger carries neither key", () => {
    expect(findBiginStageMapping([UNRESOLVED], {})).toBeUndefined();
  });

  test("does not let a stage-less entry answer a stage lookup", () => {
    expect(findBiginStageMapping([UNRESOLVED], { stageId: "stage-q" })).toBeUndefined();
  });

  test("an unmapped column resolves to nothing", () => {
    expect(findBiginStageMapping([QUALIFIED], { stageId: "stage-unmapped" })).toBeUndefined();
  });
});

describe("finding the Zoho CRM lead status for a column", () => {
  const MAPPED = { stageId: "stage-q", stageName: "Qualified", zohoLeadStatus: "Contacted" };
  const OTHER = { stageId: "stage-w", stageName: "Won", zohoLeadStatus: "Junk Lead" };
  const BY_LIFECYCLE = { lifecycleId: "life-x", lifecycleName: "Customer", zohoLeadStatus: "Won" };

  test("returns the status the org mapped, not the column's own name", () => {
    expect(
      resolveCrmLeadStatus([MAPPED, OTHER], { stageId: "stage-q", stageName: "Qualified" }),
    ).toBe("Contacted");
  });

  // The contact write paths still describe the move by lifecycle.
  test("resolves a lifecycle the same way", () => {
    const status = resolveCrmLeadStatus([MAPPED, BY_LIFECYCLE], {
      lifecycleId: "life-x",
      lifecycleName: "Customer",
    });
    expect(status).toBe("Won");
  });

  // The bug: `Lead_Status` is a Zoho picklist, so a column the org never mapped
  // is a value Zoho rejects. Better to leave the CRM lead's status alone.
  test("a mapped board with an unmapped column pushes nothing", () => {
    expect(
      resolveCrmLeadStatus([MAPPED], { stageId: "stage-new", stageName: "New Lead" }),
    ).toBeNull();
  });

  test("a mapped entry with no Zoho status on it pushes nothing", () => {
    expect(resolveCrmLeadStatus([{ stageId: "stage-q" }], { stageId: "stage-q" })).toBeNull();
  });

  // An org that never opened the mapping dialog keeps the behaviour it has
  // always had, rather than silently losing a sync that works for it.
  test("falls back to the column's name when nothing is configured", () => {
    expect(resolveCrmLeadStatus([], { stageId: "stage-q", stageName: "Qualified" })).toBe(
      "Qualified",
    );
    expect(resolveCrmLeadStatus([], { lifecycleName: "Customer" })).toBe("Customer");
  });

  test("an unconfigured board with a nameless column still pushes nothing", () => {
    expect(resolveCrmLeadStatus([], { stageId: "stage-q" })).toBeNull();
  });
});

describe("spotting a Bigin contact link that no longer resolves", () => {
  const axiosError = (rows: unknown) => ({
    isAxiosError: true,
    response: { data: { data: rows } },
  });

  test("recognises the rejection Bigin sends for a deleted contact", () => {
    expect(
      isStaleContactLinkError(
        axiosError([
          {
            code: "INVALID_DATA",
            details: { api_name: "id", json_path: "$.data[0].Contact_Name.id" },
          },
        ]),
      ),
    ).toBe(true);
  });

  // INVALID_DATA is Bigin's answer to any bad field. Retrying without the
  // contact only helps for the contact link, so everything else must still throw.
  test("leaves an unrelated INVALID_DATA alone", () => {
    expect(
      isStaleContactLinkError(
        axiosError([
          { code: "INVALID_DATA", details: { api_name: "Stage", json_path: "$.data[0].Stage" } },
        ]),
      ),
    ).toBe(false);
  });

  test("ignores anything that is not an axios failure", () => {
    expect(isStaleContactLinkError(new Error("socket hang up"))).toBe(false);
    expect(isStaleContactLinkError(undefined)).toBe(false);
  });
});

describe("spotting a Bigin record that has been deleted", () => {
  // Shaped differently from a field rejection: a bare error object, because the
  // request never got as far as validating fields.
  test("recognises the rejection for an id in the URL", () => {
    expect(
      isStaleRecordIdError({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            code: "INVALID_DATA",
            details: { resource_path_index: 1 },
            message: "the id given seems to be invalid",
          },
        },
      }),
    ).toBe(true);
  });

  test("treats a 404 as the same thing", () => {
    expect(isStaleRecordIdError({ isAxiosError: true, response: { status: 404, data: {} } })).toBe(
      true,
    );
  });

  // A field-level INVALID_DATA is the contact-link case, handled separately —
  // recreating the deal would not fix it.
  test("does not claim a field rejection", () => {
    expect(
      isStaleRecordIdError({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            data: [{ code: "INVALID_DATA", details: { json_path: "$.data[0].Contact_Name.id" } }],
          },
        },
      }),
    ).toBe(false);
  });

  test("ignores anything that is not an axios failure", () => {
    expect(isStaleRecordIdError(new Error("socket hang up"))).toBe(false);
  });
});
