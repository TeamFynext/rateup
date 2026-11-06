import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../workers/bullmq/queues/index.js", () => ({ notificationQueue: { add: vi.fn() } }));

vi.mock("../../utils/prisma.js", () => ({
  default: { bookDemo: { create: vi.fn() } },
}));

import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../workers/bullmq/queues/index.js";
import { bookDemoHandler, formatPreferredTime, partnerDataHandler } from "./bookDemo.controller.js";
import { createBookDemoInputSchema, createPartnerDataInputSchema } from "./bookDemo.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { bookDemo: Record<string, Mock> };
const queue = notificationQueue.add as unknown as Mock;

/** The five fields the demo form actually collects. */
const demo = {
  name: "Ann Smith",
  workEmail: "ann@example.test",
  businessName: "Example Co",
  phone: "15550001234",
  message: "I would like a demo please",
};

const partner = {
  fullName: "Ann Smith",
  workEmail: "ann@example.test",
  phone: "15550001234",
  companyName: "Example Co",
  website: "example.test",
  country: "India",
  businessType: "Agency",
  companySize: "11-50",
  yearsInBusiness: "3",
  whyPartner: "Shared customers",
  services: ["Reviews", "Loyalty"],
  referralVolume: "10-20",
  managesClients: "yes",
  apiExperience: "yes",
  canOnboard: "yes",
};

function makeReply() {
  const rep: any = { status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.status.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

function makeRequest(body: unknown) {
  return { body } as any;
}

/** The email payload of the nth queued notification job. */
function queued(n: number) {
  return queue.mock.calls[n][1].emailData;
}

const ROOT_MAIL = process.env.ROOT_ORG_MAIL_ID;

beforeEach(() => {
  vi.clearAllMocks();
  queue.mockResolvedValue({ id: "job-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.ROOT_ORG_MAIL_ID = "sales@rateup.test";
});

afterEach(() => {
  if (ROOT_MAIL === undefined) delete process.env.ROOT_ORG_MAIL_ID;
  else process.env.ROOT_ORG_MAIL_ID = ROOT_MAIL;
});

// ===========================================================================
// bookDemoHandler
// ===========================================================================

describe("bookDemoHandler — what reaches the queue", () => {
  test("queues exactly two notifications: one inbound, one confirmation", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(queue).toHaveBeenCalledTimes(2);
    expect(queue.mock.calls.map((c) => c[0])).toEqual(["notification", "notification"]);
  });

  test("sends the inbound alert to the configured org mailbox", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(queued(0).to).toBe("sales@rateup.test");
  });

  test("falls back to hello@rateup.app when no org mailbox is configured", async () => {
    delete process.env.ROOT_ORG_MAIL_ID;

    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(queued(0).to).toBe("hello@rateup.app");
  });

  test("names the requester in the inbound subject", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(queued(0).subject).toBe("New Demo Request from Ann Smith");
  });

  test("carries every submitted field into the inbound alert", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    for (const value of Object.values(demo)) {
      expect(queued(0).text).toContain(value);
      expect(queued(0).html).toContain(value);
    }
  });

  test("sends the confirmation to the address the requester gave", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(queued(1).to).toBe(demo.workEmail);
    expect(queued(1).subject).toBe("RateUp - Demo Booked Successfully");
  });

  // The confirmation repeats the booking back to the requester, minus their own email.
  test("repeats the booking details in the confirmation", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(queued(1).html).toContain(demo.name);
    expect(queued(1).html).toContain(demo.businessName);
    expect(queued(1).html).toContain(demo.phone);
    expect(queued(1).html).toContain(demo.message);
  });

  test("prints the preferred slot with the time in am/pm", async () => {
    await bookDemoHandler(
      makeRequest({ ...demo, preferredDate: "2026-09-01", preferredTime: "14:30" }),
      makeReply(),
    );

    expect(queued(0).text).toContain("2026-09-01 at 2:30 PM");
    expect(queued(1).text).toContain("2026-09-01 at 2:30 PM");
  });

  test("prints the date alone when only a date was picked", async () => {
    await bookDemoHandler(makeRequest({ ...demo, preferredDate: "2026-09-01" }), makeReply());

    expect(queued(0).text).toContain("2026-09-01");
    // No time was given, so the slot must not carry the " at <time>" half.
    expect(queued(0).text).not.toContain("2026-09-01 at");
  });

  test("says there is no preference when neither was picked", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(queued(0).text).toContain("Preferred slot");
    expect(queued(0).text).toContain("No preference");
    expect(queued(1).text).toContain("No preference");
  });

  // The old string templates printed "Message: N/A"; the block is simply left out now.
  test("leaves the message block out of both mails when none was left", async () => {
    await bookDemoHandler(makeRequest({ ...demo, message: undefined }), makeReply());

    expect(queued(0).text).not.toContain("What they wrote");
    expect(queued(1).text).not.toContain("Your note");
  });

  test("treats an empty message the same as a missing one", async () => {
    await bookDemoHandler(makeRequest({ ...demo, message: "" }), makeReply());

    expect(queued(0).text).not.toContain("What they wrote");
  });
});

describe("bookDemoHandler — the reply", () => {
  test("answers 200 with a confirmation message", async () => {
    const rep = makeReply();

    await bookDemoHandler(makeRequest(demo), rep);

    const { code, body } = answer(rep);
    expect(code).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain("received");
  });

  test("answers 500 when the queue rejects, rather than propagating", async () => {
    queue.mockRejectedValue(new Error("redis down"));
    const rep = makeReply();

    await expect(bookDemoHandler(makeRequest(demo), rep)).resolves.toBeDefined();
    expect(answer(rep)).toEqual({
      code: 500,
      body: { success: false, message: "Something went wrong while booking a demo." },
    });
  });

  // The confirmation is queued after the inbound alert and is not rolled back, so a
  // failure on the second job leaves the team notified while the requester is told the
  // booking failed.
  test("still answers 500 when only the confirmation fails to queue", async () => {
    queue.mockResolvedValueOnce({ id: "job-1" }).mockRejectedValueOnce(new Error("redis down"));
    const rep = makeReply();

    await bookDemoHandler(makeRequest(demo), rep);

    expect(answer(rep).code).toBe(500);
    expect(queue).toHaveBeenCalledTimes(2);
  });

  test("logs the failure", async () => {
    const cause = new Error("redis down");
    queue.mockRejectedValue(cause);

    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(console.error).toHaveBeenCalledWith("Error handling demo booking:", cause);
  });
});

describe("bookDemoHandler — persistence", () => {
  test("does not store the request anywhere", async () => {
    await bookDemoHandler(makeRequest(demo), makeReply());

    expect(db.bookDemo.create).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// partnerDataHandler
// ===========================================================================

describe("partnerDataHandler", () => {
  test("queues one notification and sends the applicant nothing back", async () => {
    await partnerDataHandler(makeRequest(partner), makeReply());

    expect(queue).toHaveBeenCalledTimes(1);
    expect(queued(0).to).toBe("sales@rateup.test");
  });

  test("falls back to hello@rateup.app when no org mailbox is configured", async () => {
    delete process.env.ROOT_ORG_MAIL_ID;

    await partnerDataHandler(makeRequest(partner), makeReply());

    expect(queued(0).to).toBe("hello@rateup.app");
  });

  test("names the applicant in the subject", async () => {
    await partnerDataHandler(makeRequest(partner), makeReply());

    expect(queued(0).subject).toBe("New Partner Inquiry from Ann Smith");
  });

  test("flattens the services list into a readable line", async () => {
    await partnerDataHandler(makeRequest(partner), makeReply());

    expect(queued(0).text).toContain("Reviews, Loyalty");
    expect(queued(0).html).toContain("Reviews, Loyalty");
  });

  test("carries every submitted field into the alert", async () => {
    await partnerDataHandler(makeRequest(partner), makeReply());

    for (const [key, value] of Object.entries(partner)) {
      if (key === "services") continue;
      expect(queued(0).text).toContain(value as string);
    }
  });

  test("answers 200 on success", async () => {
    const rep = makeReply();

    await partnerDataHandler(makeRequest(partner), rep);

    expect(answer(rep)).toEqual({
      code: 200,
      body: { success: true, message: "Partner inquiry submitted successfully" },
    });
  });

  test("answers 500 when the queue rejects", async () => {
    queue.mockRejectedValue(new Error("redis down"));
    const rep = makeReply();

    await partnerDataHandler(makeRequest(partner), rep);

    expect(answer(rep)).toEqual({
      code: 500,
      body: { success: false, message: "Internal server error" },
    });
  });

  // `services.join` runs before the try block can help — an absent array throws a
  // TypeError that the catch turns into a 500 rather than a 400. The zod body schema on
  // the route is what keeps this unreachable in production.
  test("answers 500, not a crash, when services is missing", async () => {
    const rep = makeReply();

    await expect(
      partnerDataHandler(makeRequest({ ...partner, services: undefined }), rep),
    ).resolves.toBeDefined();
    expect(answer(rep).code).toBe(500);
  });
});

// ===========================================================================
// formatPreferredTime
// ===========================================================================

describe("formatPreferredTime", () => {
  test.each([
    ["09:00", "9:00 AM"],
    ["09:30", "9:30 AM"],
    ["11:30", "11:30 AM"],
    ["12:00", "12:00 PM"],
    ["12:30", "12:30 PM"],
    ["13:00", "1:00 PM"],
    ["19:00", "7:00 PM"],
    ["00:15", "12:15 AM"],
  ])("renders %s as %s", (input, expected) => {
    expect(formatPreferredTime(input)).toBe(expected);
  });
});

// ===========================================================================
// The body schemas guarding both routes
// ===========================================================================

describe("createBookDemoInputSchema", () => {
  test("accepts a complete submission", () => {
    expect(createBookDemoInputSchema.safeParse(demo).success).toBe(true);
  });

  test("treats the message as optional", () => {
    const { message: _omitted, ...withoutMessage } = demo;

    expect(createBookDemoInputSchema.safeParse(withoutMessage).success).toBe(true);
  });

  test("rejects a one-character name", () => {
    expect(createBookDemoInputSchema.safeParse({ ...demo, name: "A" }).success).toBe(false);
  });

  test("rejects a one-character business name", () => {
    expect(createBookDemoInputSchema.safeParse({ ...demo, businessName: "A" }).success).toBe(false);
  });

  test("rejects an address that is not an email", () => {
    expect(createBookDemoInputSchema.safeParse({ ...demo, workEmail: "ann" }).success).toBe(false);
  });

  test("rejects a phone number shorter than ten digits", () => {
    expect(createBookDemoInputSchema.safeParse({ ...demo, phone: "123456789" }).success).toBe(
      false,
    );
  });

  test("rejects a phone number longer than twenty characters", () => {
    expect(createBookDemoInputSchema.safeParse({ ...demo, phone: "1".repeat(21) }).success).toBe(
      false,
    );
  });

  test("accepts a preferred date and time", () => {
    expect(
      createBookDemoInputSchema.safeParse({
        ...demo,
        preferredDate: "2026-09-01",
        preferredTime: "14:30",
      }).success,
    ).toBe(true);
  });

  test("treats the preferred date and time as optional", () => {
    expect(createBookDemoInputSchema.safeParse(demo).success).toBe(true);
  });

  test("rejects a preferred date that is not YYYY-MM-DD", () => {
    expect(
      createBookDemoInputSchema.safeParse({ ...demo, preferredDate: "01/09/2026" }).success,
    ).toBe(false);
  });

  test("rejects a preferred time that is not HH:mm", () => {
    expect(createBookDemoInputSchema.safeParse({ ...demo, preferredTime: "2:30 PM" }).success).toBe(
      false,
    );
  });
});

describe("createPartnerDataInputSchema", () => {
  test("accepts a complete inquiry", () => {
    expect(createPartnerDataInputSchema.safeParse(partner).success).toBe(true);
  });

  test("requires at least one service", () => {
    expect(createPartnerDataInputSchema.safeParse({ ...partner, services: [] }).success).toBe(
      false,
    );
  });

  test.each([
    "website",
    "country",
    "businessType",
    "companySize",
    "yearsInBusiness",
    "whyPartner",
    "referralVolume",
    "managesClients",
    "apiExperience",
    "canOnboard",
  ])("rejects an empty %s", (field) => {
    expect(createPartnerDataInputSchema.safeParse({ ...partner, [field]: "" }).success).toBe(false);
  });
});
