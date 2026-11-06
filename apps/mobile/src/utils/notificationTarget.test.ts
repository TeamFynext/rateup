import { describe, expect, it } from "vitest";

import { inboxTabFromWeb, resolveNotificationTarget, targetFromPath } from "./notificationTarget";

describe("inboxTabFromWeb", () => {
  it.each([
    ["assigned", "Mine"],
    ["mine", "Mine"],
    ["unassigned", "New"],
    ["new", "New"],
    ["starred", "Favourites"],
    ["favourites", "Favourites"],
    ["open", "Open"],
    ["closed", "Closed"],
    ["all", "All"],
    ["Assigned", "Mine"],
  ])("maps ?tab=%s to %s", (tab, expected) => {
    expect(inboxTabFromWeb(tab)).toBe(expected);
  });

  it("has no mobile tab for mentions, spam or unknown values", () => {
    expect(inboxTabFromWeb("mentions")).toBeUndefined();
    expect(inboxTabFromWeb("spam")).toBeUndefined();
    expect(inboxTabFromWeb("bogus")).toBeUndefined();
    expect(inboxTabFromWeb(null)).toBeUndefined();
  });
});

describe("targetFromPath", () => {
  it("opens the chat named by an inbox path, old or new tab", () => {
    expect(targetFromPath("/dashboard/inbox?tab=assigned&contactId=c-1")).toEqual({
      kind: "chat",
      contactId: "c-1",
    });
    expect(targetFromPath("/dashboard/inbox?tab=mine&contactId=c%2F2")).toEqual({
      kind: "chat",
      contactId: "c/2",
    });
  });

  it("opens an inbox tab when there is no contact", () => {
    expect(targetFromPath("/dashboard/inbox?tab=unassigned")).toEqual({
      kind: "inbox",
      tab: "New",
    });
    expect(targetFromPath("/dashboard/inbox?tab=new")).toEqual({ kind: "inbox", tab: "New" });
    expect(targetFromPath("/dashboard/inbox?tab=starred")).toEqual({
      kind: "inbox",
      tab: "Favourites",
    });
    expect(targetFromPath("/dashboard/inbox?tab=mentions")).toEqual({
      kind: "inbox",
      tab: undefined,
    });
  });

  it("opens calls from the new and the old web path", () => {
    expect(targetFromPath("/dashboard/inbox/calls")).toEqual({ kind: "calls" });
    expect(targetFromPath("/dashboard/whatsapp/calls?filter=missed")).toEqual({ kind: "calls" });
  });

  it("opens an order from the new and the old web path", () => {
    expect(targetFromPath("/dashboard/commerce/orders/o-1")).toEqual({
      kind: "order",
      orderId: "o-1",
    });
    expect(targetFromPath("/dashboard/whatsapp/orders/o-2")).toEqual({
      kind: "order",
      orderId: "o-2",
    });
    expect(targetFromPath("/dashboard/commerce/orders")).toBeNull();
  });

  it("accepts a full URL", () => {
    expect(targetFromPath("https://app.rateup.app/dashboard/inbox/calls#x")).toEqual({
      kind: "calls",
    });
  });

  it.each([
    "/dashboard/campaigns/cmp-1",
    "/dashboard/campaign/cmp-1",
    "/dashboard/pipelines?p=p-1",
    "/dashboard/pipeline?p=p-1",
    "/dashboard/settings/profile",
    "/dashboard/settings/account",
    "/dashboard/automation/rules",
    "/dashboard/loyalty/approvals",
    "/dashboard",
    "",
  ])("has no app screen for %s", (path) => {
    expect(targetFromPath(path)).toBeNull();
  });
});

describe("resolveNotificationTarget", () => {
  it("keeps opening the chat for legacy wa_message pushes", () => {
    expect(resolveNotificationTarget({ type: "wa_message", contactId: "c-1" })).toEqual({
      kind: "chat",
      contactId: "c-1",
    });
    expect(resolveNotificationTarget({ type: "wa_message" })).toBeNull();
  });

  it("opens the chat for an inbox event even without a path", () => {
    expect(
      resolveNotificationTarget({ type: "notification", event: "inbox.mention", contactId: "c-1" }),
    ).toEqual({ kind: "chat", contactId: "c-1" });
  });

  it("follows the path for other events", () => {
    expect(
      resolveNotificationTarget({
        type: "notification",
        event: "commerce.order.created",
        path: "/dashboard/commerce/orders/o-1",
      }),
    ).toEqual({ kind: "order", orderId: "o-1" });
    expect(
      resolveNotificationTarget({
        type: "notification",
        event: "campaign.completed",
        path: "/dashboard/campaigns/cmp-1",
      }),
    ).toBeNull();
  });

  it("ignores unknown push types", () => {
    expect(resolveNotificationTarget({ type: "wa_call", contactId: "c-1" })).toBeNull();
    expect(resolveNotificationTarget(undefined)).toBeNull();
  });
});
