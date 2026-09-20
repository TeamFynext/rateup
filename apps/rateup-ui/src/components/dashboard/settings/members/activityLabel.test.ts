import { describe, expect, test } from "vitest";

import { describeActivity } from "./activityLabel.ts";

describe("describeActivity", () => {
  test("reads an action route as a sentence about the module", () => {
    expect(
      describeActivity("POST", "/api/campaign/3f2a1b4c-1111-4222-8333-444455556666/send"),
    ).toMatchObject({
      title: "Sent campaigns",
      module: "Campaigns",
    });
  });

  test("reads a resource route by its verb and last static segment", () => {
    expect(describeActivity("PUT", "/api/contact/custom-fields/9")).toMatchObject({
      title: "Updated custom fields",
      module: "Contacts",
    });
    expect(describeActivity("DELETE", "/api/team/member?teamId=x&userId=y")).toMatchObject({
      title: "Deleted member",
      module: "Teams",
      detail: "DELETE /api/team/member",
    });
  });

  test("falls back to the module name for a bare collection route", () => {
    expect(describeActivity("POST", "/api/contact").title).toBe("Created contacts");
  });

  test("keeps the raw request for the detail line", () => {
    expect(describeActivity("post", "/api/org/members/abc/permissions").detail).toBe(
      "POST /api/org/members/abc/permissions",
    );
  });
});
