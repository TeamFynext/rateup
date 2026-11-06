import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { bookDemo: { create: vi.fn() } },
}));

import prisma from "../../utils/prisma.js";
import { createBookDemo, BookDemoInput } from "./bookDemo.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { bookDemo: Record<string, Mock> };

/** The nine columns BookDemo requires. All of them are non-null in the schema. */
const input: BookDemoInput = {
  firstName: "Ann",
  lastName: "Smith",
  workEmail: "ann@example.test",
  phoneNumber: "15550001234",
  companyName: "Example Co",
  teamSize: "11-50",
  preferredTime: "Weekday mornings",
  primaryUseCase: "Collecting reviews",
  additionalInfo: "None",
};

const created = { id: "demo-1", ...input, createdAt: new Date(0), updatedAt: new Date(0) };

beforeEach(() => {
  vi.clearAllMocks();
  db.bookDemo.create.mockResolvedValue(created);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createBookDemo", () => {
  test("stores the submission exactly as given", async () => {
    await createBookDemo(input);

    expect(db.bookDemo.create).toHaveBeenCalledWith({ data: input });
  });

  // `data` is passed straight through, so anything the caller adds reaches Prisma. The
  // route never calls this function, so the zod body schema is not a guard here — a
  // future caller is the only thing standing between an extra key and a Prisma error.
  test("passes the caller's object through untouched, extra keys and all", async () => {
    await createBookDemo({ ...input, source: "landing-page" } as BookDemoInput);

    expect(db.bookDemo.create.mock.calls[0][0].data).toHaveProperty("source", "landing-page");
  });

  test("returns the created row on success", async () => {
    await expect(createBookDemo(input)).resolves.toEqual({ success: true, data: created });
  });

  // A failure is swallowed into a result object rather than thrown, so a caller that
  // ignores `success` cannot tell a stored demo from a lost one.
  test("reports failure instead of throwing when the insert fails", async () => {
    db.bookDemo.create.mockRejectedValue(new Error("db down"));

    await expect(createBookDemo(input)).resolves.toEqual({
      success: false,
      error: "Failed to create BookDemo entry",
    });
  });

  test("carries no data field on the failure result", async () => {
    db.bookDemo.create.mockRejectedValue(new Error("db down"));

    const result = await createBookDemo(input);

    expect(result).not.toHaveProperty("data");
  });

  test("logs the underlying error so the lost submission is traceable", async () => {
    const cause = new Error("db down");
    db.bookDemo.create.mockRejectedValue(cause);

    await createBookDemo(input);

    expect(console.error).toHaveBeenCalledWith("Error creating BookDemo:", cause);
  });
});
