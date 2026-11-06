import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * createResponse's de-duplication path. A WhatsApp Flow endpoint that saves the
 * answers and then fails to answer Meta gets the whole `data_exchange` request
 * retried, so the same submission arrives twice.
 */

vi.mock("../../utils/prisma.js", () => ({
  default: {
    surveyResponse: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    surveyTeamMap: { findFirst: vi.fn() },
    contact: { findFirst: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { createResponse } from "./response.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  surveyResponse: { create: Mock; findUnique: Mock; findFirst: Mock };
};
const KEY = "v1.token.signature";
const EXISTING = {
  id: "resp-existing",
  platform: "WHATSAPP",
  surveyTeamMap: { team: { orgId: "org-1" } },
};
const CREATED = {
  id: "resp-new",
  platform: "WHATSAPP",
  surveyTeamMap: { team: { orgId: "org-1" } },
};

function input(overrides: Record<string, unknown> = {}) {
  return {
    surveyTeamMapId: "stm-1",
    responses: [{ questionId: "q1" }],
    language: "en",
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.surveyResponse.findUnique.mockResolvedValue(null);
  db.surveyResponse.create.mockResolvedValue(CREATED);
});

describe("createResponse idempotency", () => {
  test("files the submission when the key has not been seen", async () => {
    const result = await createResponse(input({ idempotencyKey: KEY }));

    expect(db.surveyResponse.create).toHaveBeenCalledTimes(1);
    expect(db.surveyResponse.create.mock.calls[0][0].data.idempotencyKey).toBe(KEY);
    expect(result).toBe(CREATED);
  });

  test("returns the original row instead of filing a retry twice", async () => {
    db.surveyResponse.findUnique.mockResolvedValue(EXISTING);

    const result = await createResponse(input({ idempotencyKey: KEY }));

    expect(result).toBe(EXISTING);
    expect(db.surveyResponse.create).not.toHaveBeenCalled();
    expect(db.surveyResponse.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idempotencyKey: KEY } }),
    );
  });

  // Two retries racing: the loser of the unique index reads back the winner's row.
  test("recovers the winner's row when the insert loses the unique index", async () => {
    db.surveyResponse.create.mockRejectedValue({ code: "P2002" });
    db.surveyResponse.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(EXISTING);

    await expect(createResponse(input({ idempotencyKey: KEY }))).resolves.toBe(EXISTING);
  });

  test("rethrows a constraint violation that is not the idempotency key", async () => {
    db.surveyResponse.create.mockRejectedValue({ code: "P2002" });
    db.surveyResponse.findUnique.mockResolvedValue(null);

    await expect(createResponse(input({ idempotencyKey: KEY }))).rejects.toMatchObject({
      code: "P2002",
    });
  });

  test("rethrows an unrelated database error", async () => {
    db.surveyResponse.create.mockRejectedValue(new Error("connection reset"));

    await expect(createResponse(input({ idempotencyKey: KEY }))).rejects.toThrow(
      "connection reset",
    );
  });

  // Web responses and legacy phone-token flow runs have no natural key; they
  // must never be de-duplicated against each other.
  test("skips the lookup entirely when no key is given", async () => {
    await createResponse(input());

    expect(db.surveyResponse.findUnique).not.toHaveBeenCalled();
    expect(db.surveyResponse.create).toHaveBeenCalledTimes(1);
  });
});
