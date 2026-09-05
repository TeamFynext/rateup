import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { org: { findUnique: vi.fn() } },
}));

vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { sendSupportEmail } from "./support-user.service.js";
import { sendSupportEmailHandler } from "./support-user.controller.js";
import { supportEmailSchema } from "./support-user.schema.js";
import { supportUserWebhookRoutes } from "./suport-user.webhook.route.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { org: Record<string, Mock> };
const queue = notificationQueue.add as unknown as Mock;

const submission = {
  name: "Ann Smith",
  email: "ann@example.test",
  message: "My order never arrived",
};

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function answer(rep: any) {
  return { code: rep.code.mock.calls[0]?.[0], body: rep.send.mock.calls[0]?.[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.org.findUnique.mockResolvedValue({
    name: "Cafe Aroma",
    owner: { email: "owner@cafe.test" },
  });
  queue.mockResolvedValue({ id: "job-1" });
});

describe("sendSupportEmail", () => {
  test("queues a notification to the org owner", async () => {
    const delivered = await sendSupportEmail(submission as any, "org-1");

    expect(delivered).toBe(true);
    expect(db.org.findUnique).toHaveBeenCalledWith({
      where: { id: "org-1" },
      select: { name: true, owner: { select: { email: true } } },
    });
    const [, job] = queue.mock.calls[0];
    expect(job.emailData.to).toBe("owner@cafe.test");
    expect(job.emailData.subject).toContain("Ann Smith");
  });

  test("renders the visitor's message into the mail body", async () => {
    await sendSupportEmail(submission as any, "org-1");

    const [, job] = queue.mock.calls[0];
    expect(job.emailData.html).toContain("My order never arrived");
    expect(job.emailData.html).toContain("Cafe Aroma");
  });

  test("escapes markup in the message rather than rendering it", async () => {
    await sendSupportEmail({ ...submission, message: "<script>alert(1)</script>" } as any, "org-1");

    const [, job] = queue.mock.calls[0];
    expect(job.emailData.html).not.toContain("<script>alert(1)</script>");
    expect(job.emailData.html).toContain("&lt;script&gt;");
  });

  test("swallows a submission that filled in the honeypot, sending nothing", async () => {
    const delivered = await sendSupportEmail({ ...submission, address: "bot" } as any, "org-1");

    expect(delivered).toBe(true);
    expect(queue).not.toHaveBeenCalled();
  });

  test("reports failure when the org owner has no address", async () => {
    db.org.findUnique.mockResolvedValue({ name: "Cafe Aroma", owner: null });

    const delivered = await sendSupportEmail(submission as any, "org-1");

    expect(delivered).toBe(false);
    expect(queue).not.toHaveBeenCalled();
  });

  test("reports failure when the org does not exist", async () => {
    db.org.findUnique.mockResolvedValue(null);

    expect(await sendSupportEmail(submission as any, "missing")).toBe(false);
  });
});

describe("sendSupportEmailHandler", () => {
  test("accepts a queued submission with 202", async () => {
    const rep = reply();

    await sendSupportEmailHandler(
      { body: submission, user: { orgId: "org-1" } } as any,
      rep as any,
    );

    expect(answer(rep)).toEqual({ code: 202, body: { success: true } });
  });

  test("answers 503 when there is nowhere to deliver", async () => {
    db.org.findUnique.mockResolvedValue(null);
    const rep = reply();

    await sendSupportEmailHandler(
      { body: submission, user: { orgId: "org-1" } } as any,
      rep as any,
    );

    expect(answer(rep).code).toBe(503);
  });

  test("answers 500 when the queue rejects", async () => {
    queue.mockRejectedValue(new Error("redis down"));
    const rep = reply();

    await sendSupportEmailHandler(
      { body: submission, user: { orgId: "org-1" } } as any,
      rep as any,
    );

    expect(answer(rep)).toEqual({
      code: 500,
      body: { success: false, message: "Something went wrong" },
    });
  });
});

describe("the /email route", () => {
  test("rate limits before it checks the token", async () => {
    const server: any = { post: vi.fn(), get: vi.fn() };

    await supportUserWebhookRoutes(server);

    const emailRoute = server.post.mock.calls.find((call: any[]) => call[0] === "/email");
    expect(emailRoute).toBeDefined();
    expect(emailRoute[1].preHandler).toHaveLength(2);
    expect(emailRoute[1].schema.body).toBe(supportEmailSchema);
  });
});

describe("supportEmailSchema", () => {
  test("rejects a message that is not an email address", () => {
    expect(supportEmailSchema.safeParse({ ...submission, email: "nope" }).success).toBe(false);
  });

  test("rejects an empty message", () => {
    expect(supportEmailSchema.safeParse({ ...submission, message: "" }).success).toBe(false);
  });

  test("rejects a message beyond 5000 characters", () => {
    expect(supportEmailSchema.safeParse({ ...submission, message: "x".repeat(5001) }).success).toBe(
      false,
    );
  });

  test("accepts a clean submission", () => {
    expect(supportEmailSchema.safeParse(submission).success).toBe(true);
  });
});
