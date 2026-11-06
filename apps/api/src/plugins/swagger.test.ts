import { describe, expect, test, vi } from "vitest";

vi.mock("../config.js", () => ({ swaggerConfig: {} }));

import { buildPartnerSpec } from "./swagger.js";

const full = {
  openapi: "3.0.0",
  info: { title: "Rateup API", version: "1.0.0" },
  tags: [{ name: "Contacts", description: "Contacts, looked up by id or phone" }],
  paths: {
    "/api/external/v2/contacts": { get: { tags: ["Contacts"] } },
    "/api/external/v1/{orgId}/contacts": { get: { tags: ["Contacts"] } },
    "/api/external/v1/{orgId}/campaigns": { get: { tags: ["Campaign"] } },
    "/api/inbox/conversations": { get: { tags: ["Inbox"] } },
  },
};

describe("buildPartnerSpec", () => {
  test("v2 holds only v2 paths", () => {
    const spec = buildPartnerSpec(full, "v2");
    expect(Object.keys(spec.paths)).toEqual(["/api/external/v2/contacts"]);
    expect(spec.info.title).toBe("RateUp Partner API v2");
    expect(spec.tags).toEqual([full.tags[0]]);
  });

  test("v1 holds only v1 paths and keeps tags the catalogue does not describe", () => {
    const spec = buildPartnerSpec(full, "v1");
    expect(Object.keys(spec.paths).sort()).toEqual([
      "/api/external/v1/{orgId}/campaigns",
      "/api/external/v1/{orgId}/contacts",
    ]);
    expect(spec.tags).toEqual([full.tags[0], { name: "Campaign" }]);
    expect(spec.info.version).toBe("1");
  });

  test("dashboard routes never leak into a partner document", () => {
    for (const version of ["v1", "v2"] as const) {
      expect(Object.keys(buildPartnerSpec(full, version).paths)).not.toContain(
        "/api/inbox/conversations",
      );
    }
  });
});
