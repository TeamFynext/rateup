import { describe, expect, test } from "vitest";

import { decodeLeadCursor, encodeLeadCursor } from "./lead.cursor.js";
import { leadWhere, rottingSql } from "./lead.filters.js";
import type { ListLeadsQuerySchema } from "./lead.schema.js";

const PIPELINE = "33333333-3333-4333-8333-333333333333";
const ASSIGNEE = "88888888-8888-4888-8888-888888888888";
const STAGE = "44444444-4444-4444-8444-444444444444";
const USER = "11111111-1111-1111-1111-111111111111";

function query(patch: Partial<ListLeadsQuerySchema> = {}): ListLeadsQuerySchema {
  return { pipelineId: PIPELINE, limit: 50, filter: "open", ...patch };
}

const ctx = { userId: USER, rottingEnabled: true };

describe("lead cursors", () => {
  test("round trips a row", () => {
    const stageEnteredAt = new Date("2026-09-01T10:20:30.000Z");
    const cursor = decodeLeadCursor(encodeLeadCursor({ stageEnteredAt, id: STAGE }));

    expect(cursor).toEqual({ t: "2026-09-01T10:20:30.000Z", id: STAGE });
  });

  test("no cursor is undefined, a broken one is null", () => {
    expect(decodeLeadCursor(undefined)).toBeUndefined();
    // Distinguishing the two is what lets the handler answer 400 for a mangled
    // cursor instead of silently serving page one.
    expect(decodeLeadCursor("not-base64-json")).toBeNull();
    expect(decodeLeadCursor(Buffer.from('{"t":"nope","id":"x"}').toString("base64url"))).toBeNull();
  });
});

describe("leadWhere", () => {
  test("always scopes to the pipeline, and binds it as a parameter", () => {
    const where = leadWhere(query(), ctx);

    expect(where.sql).toContain('l."pipelineId"');
    expect(where.values).toContain(PIPELINE);
  });

  test('"open" adds no status predicate — the view means every lead', () => {
    // Won and lost are included on purpose: hiding them made the Lost column
    // read as empty under the default view.
    expect(leadWhere(query({ filter: "open" }), ctx).sql).not.toContain("status");
  });

  test("won and lost narrow to one outcome", () => {
    expect(leadWhere(query({ filter: "won" }), ctx).sql).toContain("'WON'");
    expect(leadWhere(query({ filter: "lost" }), ctx).sql).toContain("'LOST'");
  });

  test('"mine" matches the caller through the assignee join', () => {
    const where = leadWhere(query({ filter: "mine" }), ctx);

    expect(where.sql).toContain('"LeadAssignee"');
    expect(where.values).toContain(USER);
  });

  test('"noactivity" asks for open leads with no incomplete task', () => {
    const where = leadWhere(query({ filter: "noactivity" }), ctx);

    expect(where.sql).toContain("NOT EXISTS");
    expect(where.sql).toContain('"LeadTask"');
  });

  test("rotting collapses to false when the board has the check off", () => {
    expect(rottingSql(false).sql.trim()).toBe("false");
    expect(rottingSql(true).sql).toContain('"rottingDays"');

    // So the filter is a real no-match rather than an unbounded scan.
    expect(
      leadWhere(query({ filter: "rotting" }), { ...ctx, rottingEnabled: false }).sql,
    ).toContain("false");
  });

  test("facets stack, each as a bound parameter", () => {
    const where = leadWhere(
      query({ stageId: STAGE, assigneeId: ASSIGNEE, source: "WHATSAPP" }),
      ctx,
    );

    expect(where.values).toEqual(expect.arrayContaining([PIPELINE, STAGE, ASSIGNEE, "WHATSAPP"]));
    expect(where.sql.match(/AND/g)?.length).toBeGreaterThanOrEqual(3);
  });

  test("search is a bound ILIKE over name, company and phone", () => {
    const where = leadWhere(query({ search: "acme" }), ctx);

    expect(where.sql).toContain("ILIKE");
    expect(where.sql).toContain("company");
    expect(where.sql).toContain("REPLACE(l.phone");
    expect(where.values).toContain("%acme%");
  });

  test("a typed number matches however it is spaced", () => {
    // The column has its spaces stripped in SQL; the term is stripped here, so
    // "98 76" finds a lead stored as "9876" and vice versa. The leading `+`
    // goes too, since the board stores a number without one.
    expect(leadWhere(query({ search: "+91 98 76" }), ctx).values).toContain("%919876%");
  });

  test("wildcards a user typed are escaped, not honoured", () => {
    // Otherwise "50%" reads as "50 followed by anything" and matches the board.
    expect(leadWhere(query({ search: "50%_x" }), ctx).values).toContain("%50\\%\\_x%");
  });
});
