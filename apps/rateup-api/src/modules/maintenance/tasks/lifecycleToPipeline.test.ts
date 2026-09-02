import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));

import { leadRowForContact, type PlaceableBoard } from "./placeLeadsFromLifecycles.js";
import { stagesFromLifecycles } from "./seedPipelines.js";
import { buildStageLookup, resolveStage } from "./stageLookup.js";

/** Shorthand for a lifecycle row; only the four fields the seeder reads. */
function life(
  name: string,
  category: "active" | "won" | "lost",
  ordering = 0,
  color: string | null = "#ffffff",
) {
  return { name, category, ordering, color };
}

describe("building board columns from an org's lifecycles", () => {
  test("keeps the lifecycle names verbatim", () => {
    const { stages } = stagesFromLifecycles([
      life("new lead", "active"),
      life("better", "won"),
      life("lost man", "lost"),
    ]);

    expect(stages.map((stage) => stage.name)).toEqual(["new lead", "better", "lost man"]);
  });

  // Real data has two lifecycles both sitting at `ordering: 0`, one active and
  // one lost. Ordering on that field alone would put Lost in the middle of the
  // funnel and break the ties at random.
  test("orders by category first, so open work comes before won and lost", () => {
    const { stages } = stagesFromLifecycles([
      life("lost man", "lost", 0),
      life("new lead", "active", 0),
      life("better", "won", 1),
    ]);

    expect(stages.map((stage) => stage.status)).toEqual(["OPEN", "WON", "LOST"]);
    expect(stages.map((stage) => stage.order)).toEqual([0, 1, 2]);
  });

  test("re-indexes order from zero rather than copying `ordering`", () => {
    const { stages } = stagesFromLifecycles([
      life("a", "active", 7),
      life("b", "active", 9),
      life("c", "active", 9),
    ]);

    // Won and Lost are appended after these three, so the run continues 3, 4.
    expect(stages.map((stage) => stage.order)).toEqual([0, 1, 2, 3, 4]);
    expect(stages.slice(0, 3).map((stage) => stage.name)).toEqual(["a", "b", "c"]);
  });

  test("maps each category onto the matching stage status", () => {
    const { stages } = stagesFromLifecycles([
      life("a", "active"),
      life("w", "won"),
      life("l", "lost"),
    ]);

    expect(stages.map((stage) => [stage.name, stage.status])).toEqual([
      ["a", "OPEN"],
      ["w", "WON"],
      ["l", "LOST"],
    ]);
  });

  // Lifecycle colours default to #ffffff, which is not a colour on a white board.
  test("falls back to the palette when the lifecycle colour is white", () => {
    const { stages } = stagesFromLifecycles([life("a", "active", 0, "#ffffff")]);

    expect(stages[0].color).not.toBe("#ffffff");
  });

  test("keeps a colour the org actually chose", () => {
    const { stages } = stagesFromLifecycles([life("a", "active", 0, "#DD2A7B")]);

    expect(stages[0].color).toBe("#DD2A7B");
  });

  test("spreads probability across the open columns and pins the closing ones", () => {
    const { stages } = stagesFromLifecycles([
      life("a", "active", 0),
      life("b", "active", 1),
      life("c", "active", 2),
      life("w", "won"),
      life("l", "lost"),
    ]);

    expect(stages.map((stage) => stage.probability)).toEqual([25, 50, 75, 100, 0]);
  });

  test("only open columns can rot", () => {
    const { stages } = stagesFromLifecycles([life("a", "active"), life("w", "won")]);

    expect(stages[0].rottingDays).toBeGreaterThan(0);
    expect(stages[1].rottingDays).toBe(0);
  });

  // A board with no closing column cannot close a lead at all: `closeLead` looks
  // for the first column of that status and finds none.
  test("appends a Won column when the org has no won lifecycle", () => {
    const { stages, added } = stagesFromLifecycles([life("a", "active"), life("l", "lost")]);

    expect(added.won).toBe(true);
    expect(stages.at(-1)).toMatchObject({ name: "Won", status: "WON", probability: 100 });
  });

  test("appends a Lost column when the org has no lost lifecycle", () => {
    const { stages, added } = stagesFromLifecycles([life("a", "active"), life("w", "won")]);

    expect(added.lost).toBe(true);
    expect(stages.at(-1)).toMatchObject({ name: "Lost", status: "LOST", probability: 0 });
  });

  test("adds both when the org has only open lifecycles", () => {
    const { stages, added } = stagesFromLifecycles([life("a", "active")]);

    expect(added).toEqual({ won: true, lost: true });
    expect(stages.map((stage) => stage.status)).toEqual(["OPEN", "WON", "LOST"]);
    expect(stages.map((stage) => stage.order)).toEqual([0, 1, 2]);
  });

  // One org in the data has nothing but won and lost lifecycles. That board is
  // legal but has no entry point, so nothing appends an open column for it —
  // worth knowing rather than silently inventing a funnel the org never had.
  test("leaves a board with no open column alone", () => {
    const { stages, added } = stagesFromLifecycles([life("w", "won"), life("l", "lost")]);

    expect(added).toEqual({ won: false, lost: false });
    expect(stages.some((stage) => stage.status === "OPEN")).toBe(false);
  });
});

const T = (iso: string) => new Date(iso);

function contact(over: Partial<Parameters<typeof leadRowForContact>[0]> = {}) {
  return {
    id: "contact-1",
    orgId: "org-1",
    name: "Aditi",
    phone: "+91",
    email: null,
    source: "whatsapp",
    createdAt: T("2026-01-01"),
    lastReceivedMessageTimeStamp: null,
    lastSentMessageTimeStamp: null,
    Lifecycle: { name: "new lead" },
    ...over,
  };
}

const board: PlaceableBoard = {
  id: "board-1",
  stages: [
    { id: "s-open", name: "new lead", status: "OPEN" },
    { id: "s-won", name: "better", status: "WON" },
  ],
};

describe("placing a classified contact on the matching column", () => {
  test("matches the lifecycle to the column of the same name", () => {
    const row = leadRowForContact(contact(), board);

    expect(row).toMatchObject({ stageId: "s-open", pipelineId: "board-1", contactId: "contact-1" });
  });

  // The seeder copies names verbatim, but casing and stray spaces should not
  // decide whether a contact reaches the board.
  test("ignores case and surrounding space", () => {
    const row = leadRowForContact(contact({ Lifecycle: { name: "  NEW Lead " } }), board);

    expect(row).toMatchObject({ stageId: "s-open" });
  });

  // A lifecycle renamed after seeding has no column. Guessing one would put the
  // contact somewhere nobody chose, so it is reported instead.
  test("reports a lifecycle with no column rather than guessing", () => {
    expect(leadRowForContact(contact({ Lifecycle: { name: "ghost" } }), board)).toBe("unmatched");
  });

  test("reports a contact whose org has no board", () => {
    expect(leadRowForContact(contact(), undefined)).toBe("no-pipeline");
  });

  test("takes the lead's status from the column it lands on", () => {
    const row = leadRowForContact(contact({ Lifecycle: { name: "better" } }), board);

    expect(row).toMatchObject({ status: "WON" });
    expect(row).not.toMatchObject({ closedAt: null });
  });

  test("leaves an open lead unclosed", () => {
    expect(leadRowForContact(contact(), board)).toMatchObject({ status: "OPEN", closedAt: null });
  });

  test("derives the channel from the contact's source", () => {
    expect(leadRowForContact(contact({ source: "instagram" }), board)).toMatchObject({
      source: "INSTAGRAM",
      channel: "INSTAGRAM",
    });
  });

  // MANUAL would claim a person typed the lead in, which nobody did — but there
  // is no better enum value for a contact whose source we cannot name.
  test("falls back to MANUAL with no channel for an unknown source", () => {
    expect(leadRowForContact(contact({ source: "carrier-pigeon" }), board)).toMatchObject({
      source: "MANUAL",
      channel: "NONE",
    });
  });

  // Rotting is measured from `lastActivityAt`. Stamping "now" would make every
  // migrated lead look freshly worked and hide the stalled ones.
  test("dates the lead from the contact's last real touch", () => {
    const row = leadRowForContact(
      contact({ lastReceivedMessageTimeStamp: T("2026-06-01"), createdAt: T("2026-01-01") }),
      board,
    );

    expect(row).toMatchObject({
      lastActivityAt: T("2026-06-01"),
      stageEnteredAt: T("2026-06-01"),
    });
  });

  test("falls back through last sent, then creation, when never received", () => {
    expect(
      leadRowForContact(contact({ lastSentMessageTimeStamp: T("2026-03-01") }), board),
    ).toMatchObject({ lastActivityAt: T("2026-03-01") });

    expect(leadRowForContact(contact(), board)).toMatchObject({
      lastActivityAt: T("2026-01-01"),
    });
  });

  test("names an unnamed contact rather than writing an empty lead", () => {
    expect(leadRowForContact(contact({ name: null }), board)).toMatchObject({
      name: "Unnamed contact",
    });
  });

  // Nobody opened these by hand and no team has claimed them.
  test("leaves the lead unowned and unteamed", () => {
    expect(leadRowForContact(contact(), board)).toMatchObject({ teamId: null, ownerId: null });
  });
});

describe("resolving a stored lifecycle reference to a column", () => {
  const lifecycles = [
    { id: "lc-new", name: "new lead" },
    { id: "lc-won", name: "better" },
  ];
  const stages = [
    { id: "st-new", name: "new lead" },
    { id: "st-won", name: "better" },
  ];
  const lookup = buildStageLookup(lifecycles, stages);

  test("resolves by lifecycle id", () => {
    expect(resolveStage(lookup, "lc-new")).toEqual({ stageId: "st-new", stageName: "new lead" });
  });

  // These mappings live in JSON with no foreign key, so a deleted lifecycle
  // leaves an id pointing at nothing. The name saved beside it is the fallback.
  test("falls back to the stored name when the id is dangling", () => {
    expect(resolveStage(lookup, "lc-deleted", "better")).toEqual({
      stageId: "st-won",
      stageName: "better",
    });
  });

  test("gives up rather than guessing when neither matches", () => {
    expect(resolveStage(lookup, "lc-gone", "no such stage")).toBeNull();
  });

  test("ignores case and space in the fallback name", () => {
    expect(resolveStage(lookup, undefined, "  NEW Lead ")).toMatchObject({ stageId: "st-new" });
  });

  test("skips a lifecycle with no column of that name", () => {
    const partial = buildStageLookup([...lifecycles, { id: "lc-x", name: "ghost" }], stages);

    expect(partial.byId.has("lc-x")).toBe(false);
    expect(partial.byId.size).toBe(2);
  });
});
