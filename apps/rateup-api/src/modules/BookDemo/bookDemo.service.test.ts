import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { bookDemo: { create: vi.fn() } },
  excludeFields: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { createBookDemo, type BookDemoInput } from "./bookDemo.service.js";
import { createBookDemoInputSchema } from "./bookDemo.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const createMock = (prisma as unknown as { bookDemo: { create: Mock } }).bookDemo.create;

/** The shape createBookDemo declares it wants. */
const INPUT: BookDemoInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  workEmail: "ada@example.com",
  phoneNumber: "15550001234",
  companyName: "Analytical Engines Ltd",
  teamSize: "11-50",
  preferredTime: "Weekday mornings",
  primaryUseCase: "WhatsApp inbox",
  additionalInfo: "None",
};

beforeEach(() => {
  vi.clearAllMocks();
  createMock.mockResolvedValue({ id: "demo-1", ...INPUT });
});

describe("createBookDemo", () => {
  test("stores the request and reports what it wrote", async () => {
    await expect(createBookDemo(INPUT)).resolves.toEqual({
      success: true,
      data: { id: "demo-1", ...INPUT },
    });
    expect(createMock.mock.calls[0][0]).toEqual({ data: INPUT });
  });

  test("reports failure rather than throwing when the write fails", async () => {
    createMock.mockRejectedValue(new Error("db down"));

    await expect(createBookDemo(INPUT)).resolves.toEqual({
      success: false,
      error: "Failed to create BookDemo entry",
    });
  });
});

describe("createBookDemo - whether anything can reach it", () => {
  // NOTE: pins current behaviour. createBookDemo is the only thing in
  // bookDemo.service.ts and nothing imports it — bookDemoHandler queues two emails
  // and returns, and never touches the database. So a demo request exists only as
  // an email; if the notification queue drops it, or the inbox rule files it wrong,
  // the lead is gone with no record anywhere. There is a BookDemo table sitting
  // empty (prisma/schema.prisma:2576). See issues.txt 16.3.
  test("is never called by the handler that receives demo requests", async () => {
    const controller = await import("./bookDemo.controller.js");

    expect(Object.keys(controller)).toEqual(["bookDemoHandler", "partnerDataHandler"]);
    expect(createMock).not.toHaveBeenCalled();
  });

  // NOTE: and it could not be wired up as it stands. The fields createBookDemo
  // requires and the fields the route accepts have almost nothing in common — the
  // route collects a single `name`, a `businessName`, a `phone` and an optional
  // `message`; the table wants firstName, lastName, phoneNumber, companyName,
  // teamSize, preferredTime, primaryUseCase and additionalInfo, all required. The
  // service and the table describe a booking form that the API no longer offers.
  // See issues.txt 16.3.
  test("wants fields the demo route does not collect", async () => {
    const accepted = Object.keys(createBookDemoInputSchema.shape);
    const required = Object.keys(INPUT);

    expect(accepted).toEqual(["name", "workEmail", "businessName", "phone", "message"]);
    expect(required.filter((field) => accepted.includes(field))).toEqual(["workEmail"]);
  });
});
