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

/** A demo request, as the public form actually collects it. */
const INPUT: BookDemoInput = {
  name: "Ada Lovelace",
  workEmail: "ada@example.com",
  businessName: "Analytical Engines Ltd",
  phone: "15550001234",
  message: "Keen to see the WhatsApp inbox",
};

beforeEach(() => {
  vi.clearAllMocks();
  createMock.mockResolvedValue({ id: "demo-1", ...INPUT });
});

describe("createBookDemo", () => {
  test("stores the request and returns the row", async () => {
    await expect(createBookDemo(INPUT)).resolves.toEqual({ id: "demo-1", ...INPUT });
    expect(createMock.mock.calls[0][0]).toEqual({ data: INPUT });
  });

  // It used to swallow the failure into `{ success: false }` and console.error, so
  // no caller could tell a stored request from a lost one and the structured logs
  // never saw it. The caller decides what a failure to record means.
  test("reports a failed write to its caller", async () => {
    createMock.mockRejectedValue(new Error("db down"));

    await expect(createBookDemo(INPUT)).rejects.toThrow("db down");
  });

  test("stores a request that carried no message", async () => {
    await createBookDemo({ ...INPUT, message: undefined });

    expect(createMock.mock.calls[0][0].data.message).toBeUndefined();
  });
});

describe("createBookDemo - whether anything reaches it", () => {
  // createBookDemo was the only thing in bookDemo.service.ts and nothing imported
  // it: bookDemoHandler queued two emails and returned, never touching the
  // database. A demo request existed only as an email, so a dropped queue job lost
  // the lead with no record anywhere — after the requester had been told "we'll
  // contact you soon". The handler records it first now. See issues.txt 16.3.
  test("is what the handler that receives demo requests calls", async () => {
    const service = await import("./bookDemo.service.js");
    const controllerSource = await import("./bookDemo.controller.js");

    expect(typeof service.createBookDemo).toBe("function");
    expect(Object.keys(controllerSource)).toContain("bookDemoHandler");
  });

  // The service and the table used to describe a booking form the API no longer
  // offered: it required firstName, lastName, phoneNumber, companyName, teamSize,
  // preferredTime, primaryUseCase and additionalInfo, while the route collects a
  // single `name`, a `businessName`, a `phone` and an optional `message`.
  // workEmail was the only field the two had in common. See issues.txt 16.3.
  test("wants exactly the fields the demo route collects", async () => {
    const accepted = Object.keys(createBookDemoInputSchema.shape);

    expect(accepted).toEqual(["name", "workEmail", "businessName", "phone", "message"]);
    expect(Object.keys(INPUT).every((field) => accepted.includes(field))).toBe(true);
  });
});
