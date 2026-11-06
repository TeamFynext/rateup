import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/redisConnection.js", () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import connection from "../../../utils/redisConnection.js";
import { appendFlowResponses, clearFlowResponses, getFlowResponses } from "./flowState.js";

type Mock = ReturnType<typeof vi.fn>;
const redis = connection as unknown as { get: Mock; set: Mock; del: Mock };

const TOKEN = "v1.abc.def";
const KEY = `flow_responses:${TOKEN}`;

beforeEach(() => {
  vi.clearAllMocks();
  redis.get.mockResolvedValue(null);
  redis.set.mockResolvedValue("OK");
  redis.del.mockResolvedValue(1);
});

describe("getFlowResponses", () => {
  test("returns an empty list when the run has no state yet", async () => {
    await expect(getFlowResponses(TOKEN)).resolves.toEqual([]);
    expect(redis.get).toHaveBeenCalledWith(KEY);
  });

  test("returns the stored answers", async () => {
    redis.get.mockResolvedValue(JSON.stringify([{ questionId: "q1" }]));

    await expect(getFlowResponses(TOKEN)).resolves.toEqual([{ questionId: "q1" }]);
  });

  // Losing a half-written key should cost the run its answers, not throw inside
  // the Meta webhook — Meta retries on a 5xx and the respondent sees an error.
  test("discards unreadable state rather than throwing", async () => {
    redis.get.mockResolvedValue("{not json");

    await expect(getFlowResponses(TOKEN)).resolves.toEqual([]);
  });

  test("discards state that is not a list", async () => {
    redis.get.mockResolvedValue(JSON.stringify({ questionId: "q1" }));

    await expect(getFlowResponses(TOKEN)).resolves.toEqual([]);
  });
});

describe("appendFlowResponses", () => {
  test("merges this screen's answers onto what was already collected", async () => {
    redis.get.mockResolvedValue(JSON.stringify([{ questionId: "q1" }]));

    const merged = await appendFlowResponses(TOKEN, [{ questionId: "q2" }]);

    expect(merged).toEqual([{ questionId: "q1" }, { questionId: "q2" }]);
    expect(redis.set.mock.calls[0]?.[1]).toBe(
      JSON.stringify([{ questionId: "q1" }, { questionId: "q2" }]),
    );
  });

  test("expires in-progress answers after 24h", async () => {
    await appendFlowResponses(TOKEN, [{ questionId: "q1" }]);

    expect(redis.set).toHaveBeenCalledWith(KEY, expect.any(String), "EX", 24 * 60 * 60);
  });

  // Navigating back to a screen re-posts its fields; the duplicate is kept here
  // and collapsed by removeDuplicateResponses when the run ends.
  test("keeps a re-answered question so the later answer can win", async () => {
    redis.get.mockResolvedValue(JSON.stringify([{ questionId: "q1", response: "first" }]));

    const merged = await appendFlowResponses(TOKEN, [{ questionId: "q1", response: "second" }]);

    expect(merged).toHaveLength(2);
  });
});

describe("clearFlowResponses", () => {
  test("drops the run's state", async () => {
    await clearFlowResponses(TOKEN);

    expect(redis.del).toHaveBeenCalledWith(KEY);
  });
});
