import { beforeEach, describe, expect, test, vi } from "vitest";

// The cache sits between the handlers and the service. Here it is a straight
// pass-through, so these tests keep describing the handlers; the cache itself is
// covered in src/utils/cache.test.ts.
vi.mock("../../../utils/cache.js", () => ({
  withCache: vi.fn((_key: string, _ttl: number, load: () => Promise<unknown>) => load()),
  cacheKeyFor: vi.fn(() => "test-key"),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../utils/auditLog.js", () => ({ recordAuditEvent: vi.fn() }));

vi.mock("./conversation.service.js", () => ({
  deleteConversation: vi.fn(),
  deleteConversations: vi.fn(),
  getAvargeResponseTimeofTodyaInEveryHour: vi.fn(),
  getConversationOnAccountDistribution: vi.fn(),
  getConversationOverview: vi.fn(),
  getConversationsByContactId: vi.fn(),
  getOverAllQuickStatsOfConversations: vi.fn(),
  getResolvedCountandTotalCountofDailyInLastNDays: vi.fn(),
  getStaffConverSationMetrics: vi.fn(),
  getStaffDetailedConversationAnalytics: vi.fn(),
  getTeamDetailedMetrics: vi.fn(),
  getTeamOverview: vi.fn(),
  updateConversation: vi.fn(),
}));

import { recordAuditEvent } from "../../../utils/auditLog.js";
import { cacheKeyFor } from "../../../utils/cache.js";
import {
  deleteConversation,
  deleteConversations,
  getAvargeResponseTimeofTodyaInEveryHour,
  getConversationOnAccountDistribution,
  getConversationOverview,
  getConversationsByContactId,
  getOverAllQuickStatsOfConversations,
  getResolvedCountandTotalCountofDailyInLastNDays,
  getStaffConverSationMetrics,
  getStaffDetailedConversationAnalytics,
  getTeamDetailedMetrics,
  getTeamOverview,
  updateConversation,
} from "./conversation.service.js";
import {
  deleteConversationHandler,
  deleteConversationsHandler,
  getAverageConversationResponseTimeHandler,
  getConversationOnAccountDistributionHandler,
  getConversationOverviewHandler,
  getConversationsByContactIdHandler,
  getOverAllQuickStatsOfConversationsHandler,
  getResolvedConversationStatsHandler,
  getStaffConverSationMetricsHandler,
  getStaffDetailedConversationAnalyticsHandler,
  getTeamDetailedMetricsHandler,
  getTeamOverviewHandler,
  updateConversationHandler,
} from "./conversation.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-4111-8111-111111111111";

function reply() {
  const rep: any = {
    code: vi.fn(() => rep),
    status: vi.fn(() => rep),
    send: vi.fn(() => rep),
  };
  return rep;
}

function request(over: Record<string, unknown> = {}): any {
  return { user: { orgId: ORG }, params: {}, query: {}, body: {}, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getConversationsByContactIdHandler", () => {
  test("scopes the ticket history to the caller's org", async () => {
    (getConversationsByContactId as Mock).mockResolvedValue([{ id: "conv-1" }]);
    const rep = reply();

    await getConversationsByContactIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(getConversationsByContactId).toHaveBeenCalledWith(ORG, "c1");
    expect(rep.send).toHaveBeenCalledWith([{ id: "conv-1" }]);
  });

  test("reports a failure as a 500", async () => {
    (getConversationsByContactId as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getConversationsByContactIdHandler(request({ params: { contactId: "c1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteConversationHandler", () => {
  const ticket = {
    id: "conv-1",
    number: 12,
    contactId: "c1",
    contactName: "Ada",
    contactPhone: "+100",
  };

  test("records who the deleted conversation belonged to", async () => {
    (deleteConversation as Mock).mockResolvedValue({
      id: "conv-1",
      contactId: "c1",
      ticket,
      deletedMessages: 4,
      remainingConversations: false,
    });
    const rep = reply();
    const req = request({ params: { conversationId: "conv-1" } });

    await deleteConversationHandler(req, rep);

    expect(recordAuditEvent).toHaveBeenCalledWith(req, "Conversation deleted", {
      ticket: "#12",
      contact: "Ada",
      contactPhone: "+100",
      contactId: "c1",
      conversationId: "conv-1",
      messagesDeleted: 4,
    });
  });

  test("a ticket the org does not own is a 404, and nothing is logged", async () => {
    (deleteConversation as Mock).mockResolvedValue(null);
    const rep = reply();

    await deleteConversationHandler(request({ params: { conversationId: "conv-1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(404);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  test("reports a failure as a 500", async () => {
    (deleteConversation as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await deleteConversationHandler(request({ params: { conversationId: "conv-1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteConversationsHandler", () => {
  test("logs one entry naming every contact in the batch", async () => {
    (deleteConversations as Mock).mockResolvedValue({
      conversationIds: ["conv-1", "conv-2"],
      contactIds: ["c1", "c2"],
      tickets: [
        { id: "conv-1", number: 1, contactId: "c1", contactName: "Ada", contactPhone: "+100" },
        { id: "conv-2", number: 2, contactId: "c2", contactName: null, contactPhone: "+200" },
      ],
      deletedConversations: 2,
      deletedMessages: 9,
    });
    const rep = reply();
    const req = request({ body: { conversationIds: ["conv-1", "conv-2"] } });

    await deleteConversationsHandler(req, rep);

    expect(recordAuditEvent).toHaveBeenCalledWith(req, "2 conversations deleted", {
      conversations: [
        {
          ticket: "#1",
          contact: "Ada",
          contactPhone: "+100",
          contactId: "c1",
          conversationId: "conv-1",
        },
        {
          // No name on the contact, so the phone stands in for it.
          ticket: "#2",
          contact: "+200",
          contactPhone: "+200",
          contactId: "c2",
          conversationId: "conv-2",
        },
      ],
      messagesDeleted: 9,
    });
  });

  test("a selection that deleted nothing writes no entry", async () => {
    (deleteConversations as Mock).mockResolvedValue({
      conversationIds: [],
      contactIds: [],
      tickets: [],
      deletedConversations: 0,
      deletedMessages: 0,
    });
    const rep = reply();

    await deleteConversationsHandler(request({ body: { conversationIds: ["conv-1"] } }), rep);

    expect(recordAuditEvent).not.toHaveBeenCalled();
    expect(rep.send).toHaveBeenCalled();
  });
});

describe("updateConversationHandler", () => {
  test("updates the conversation within the caller's org", async () => {
    (updateConversation as Mock).mockResolvedValue({ id: "conv-1" });
    const rep = reply();

    await updateConversationHandler(
      request({ params: { conversationId: "conv-1" }, body: { subject: "Refund" } }),
      rep,
    );

    expect(updateConversation).toHaveBeenCalledWith("conv-1", ORG, { subject: "Refund" });
    expect(rep.send).toHaveBeenCalledWith({ id: "conv-1" });
  });

  test("reports a failure as a 500", async () => {
    (updateConversation as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await updateConversationHandler(request({ params: { conversationId: "conv-1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(rep.send.mock.calls[0][0]).toEqual({
      error: "An error occurred while updating the conversation.",
    });
  });
});

describe("getConversationOverviewHandler", () => {
  test("splits the comma-separated date range", async () => {
    (getConversationOverview as Mock).mockResolvedValue({ totalConversations: 3 });

    await getConversationOverviewHandler(
      request({ query: { dateRange: "2026-01-01,2026-01-31" } }),
      reply(),
    );

    expect(getConversationOverview).toHaveBeenCalledWith(ORG, ["2026-01-01", "2026-01-31"], null);
  });

  test("passes an empty range when the query has none", async () => {
    (getConversationOverview as Mock).mockResolvedValue({});

    await getConversationOverviewHandler(request({ query: {} }), reply());

    expect(getConversationOverview).toHaveBeenCalledWith(ORG, [], null);
  });

  test("scopes to a team and keys the cache on it", async () => {
    const team = "22222222-2222-4222-8222-222222222222";
    (getConversationOverview as Mock).mockResolvedValue({});

    await getConversationOverviewHandler(request({ query: { teamId: team } }), reply());

    expect(getConversationOverview).toHaveBeenCalledWith(ORG, [], team);
    expect(cacheKeyFor).toHaveBeenCalledWith(
      expect.any(String),
      ORG,
      "conversation:overview",
      expect.objectContaining({ teamId: team }),
    );
  });

  test('reads teamId "all" as every team', async () => {
    (getConversationOverview as Mock).mockResolvedValue({});

    await getConversationOverviewHandler(request({ query: { teamId: "all" } }), reply());

    expect(getConversationOverview).toHaveBeenCalledWith(ORG, [], null);
  });

  test("reports a failure as a 500", async () => {
    (getConversationOverview as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getConversationOverviewHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("getResolvedConversationStatsHandler", () => {
  test("passes the org, the day count and the range through", async () => {
    (getResolvedCountandTotalCountofDailyInLastNDays as Mock).mockResolvedValue([]);

    await getResolvedConversationStatsHandler(
      request({ query: { days: 30, dateRange: "2026-01-01,2026-01-31" } }),
      reply(),
    );

    expect(getResolvedCountandTotalCountofDailyInLastNDays).toHaveBeenCalledWith(
      ORG,
      30,
      ["2026-01-01", "2026-01-31"],
      null,
    );
  });

  test("reports a failure as a 500", async () => {
    (getResolvedCountandTotalCountofDailyInLastNDays as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getResolvedConversationStatsHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("getAverageConversationResponseTimeHandler", () => {
  test("passes the date key alongside the range", async () => {
    (getAvargeResponseTimeofTodyaInEveryHour as Mock).mockResolvedValue([]);

    await getAverageConversationResponseTimeHandler(
      request({ query: { dateKey: "today", dateRange: "2026-01-01,2026-01-02" } }),
      reply(),
    );

    expect(getAvargeResponseTimeofTodyaInEveryHour).toHaveBeenCalledWith(
      ORG,
      "today",
      ["2026-01-01", "2026-01-02"],
      null,
    );
  });

  test("forwards an empty range rather than refusing the request", async () => {
    (getAvargeResponseTimeofTodyaInEveryHour as Mock).mockResolvedValue([]);
    const rep = reply();

    await getAverageConversationResponseTimeHandler(request({ query: {} }), rep);

    expect(getAvargeResponseTimeofTodyaInEveryHour).toHaveBeenCalledWith(ORG, "", [], null);
    expect(rep.status).not.toHaveBeenCalled();
  });

  test("reports a failure as a 500", async () => {
    (getAvargeResponseTimeofTodyaInEveryHour as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getAverageConversationResponseTimeHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("getConversationOnAccountDistributionHandler", () => {
  test("passes the org and the range", async () => {
    (getConversationOnAccountDistribution as Mock).mockResolvedValue([]);

    await getConversationOnAccountDistributionHandler(
      request({ query: { dateRange: "2026-01-01,2026-01-31" } }),
      reply(),
    );

    expect(getConversationOnAccountDistribution).toHaveBeenCalledWith(
      ORG,
      ["2026-01-01", "2026-01-31"],
      null,
    );
  });

  test("reports a failure as a 500", async () => {
    (getConversationOnAccountDistribution as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getConversationOnAccountDistributionHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("getOverAllQuickStatsOfConversationsHandler", () => {
  test("answers with the org's quick stats", async () => {
    (getOverAllQuickStatsOfConversations as Mock).mockResolvedValue({ resolved: 4 });
    const rep = reply();

    await getOverAllQuickStatsOfConversationsHandler(request(), rep);

    expect(getOverAllQuickStatsOfConversations).toHaveBeenCalledWith(ORG, null);
    expect(rep.send).toHaveBeenCalledWith({ resolved: 4 });
  });

  test("reports a failure as a 500", async () => {
    (getOverAllQuickStatsOfConversations as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getOverAllQuickStatsOfConversationsHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("getStaffConverSationMetricsHandler", () => {
  test("passes the org and the range", async () => {
    (getStaffConverSationMetrics as Mock).mockResolvedValue([]);

    await getStaffConverSationMetricsHandler(
      request({ query: { dateRange: "2026-01-01,2026-01-31" } }),
      reply(),
    );

    expect(getStaffConverSationMetrics).toHaveBeenCalledWith(
      ORG,
      ["2026-01-01", "2026-01-31"],
      null,
    );
  });

  test("reports a failure as a 500", async () => {
    (getStaffConverSationMetrics as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getStaffConverSationMetricsHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("getStaffDetailedConversationAnalyticsHandler", () => {
  test("passes the org, the staff id and the day count", async () => {
    (getStaffDetailedConversationAnalytics as Mock).mockResolvedValue({});

    await getStaffDetailedConversationAnalyticsHandler(
      request({ params: { staffId: "u1" }, query: { days: 30 } }),
      reply(),
    );

    expect(getStaffDetailedConversationAnalytics).toHaveBeenCalledWith(ORG, "u1", 30);
  });

  test("defaults an undefined day count to a 30-day window", async () => {
    (getStaffDetailedConversationAnalytics as Mock).mockResolvedValue({});

    await getStaffDetailedConversationAnalyticsHandler(
      request({ params: { staffId: "u1" }, query: {} }),
      reply(),
    );

    expect(getStaffDetailedConversationAnalytics).toHaveBeenCalledWith(ORG, "u1", 30);
  });

  test("reports a failure as a 500", async () => {
    (getStaffDetailedConversationAnalytics as Mock).mockRejectedValue(new RangeError("bad date"));
    const rep = reply();

    await getStaffDetailedConversationAnalyticsHandler(request({ params: { staffId: "u1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(rep.send.mock.calls[0][0]).toEqual({
      error: "An error occurred while fetching the staff detailed analytics.",
    });
  });
});

describe("getTeamOverviewHandler", () => {
  test("passes the org and the range", async () => {
    (getTeamOverview as Mock).mockResolvedValue([]);

    await getTeamOverviewHandler(
      request({ query: { dateRange: "2026-01-01,2026-01-31" } }),
      reply(),
    );

    expect(getTeamOverview).toHaveBeenCalledWith(ORG, ["2026-01-01", "2026-01-31"], null);
  });

  test("reports a failure as a 500", async () => {
    (getTeamOverview as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getTeamOverviewHandler(request(), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("getTeamDetailedMetricsHandler", () => {
  test("passes the path team id straight through alongside the caller's org", async () => {
    (getTeamDetailedMetrics as Mock).mockResolvedValue({});

    await getTeamDetailedMetricsHandler(
      request({ params: { teamId: "t-other-org" }, query: { days: 30 } }),
      reply(),
    );

    expect(getTeamDetailedMetrics).toHaveBeenCalledWith("t-other-org", ORG, 30);
  });

  // Fixed: an omitted `days` used to be forwarded as `undefined`, which the
  // service turned into an Invalid Date. The handler now defaults it to a
  // 30-day window instead.
  test("defaults an undefined day count to a 30-day window", async () => {
    (getTeamDetailedMetrics as Mock).mockResolvedValue({});

    await getTeamDetailedMetricsHandler(request({ params: { teamId: "t1" }, query: {} }), reply());

    expect(getTeamDetailedMetrics).toHaveBeenCalledWith("t1", ORG, 30);
  });

  test("reports a failure as a 500", async () => {
    (getTeamDetailedMetrics as Mock).mockRejectedValue(new Error("boom"));
    const rep = reply();

    await getTeamDetailedMetricsHandler(request({ params: { teamId: "t1" } }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});
