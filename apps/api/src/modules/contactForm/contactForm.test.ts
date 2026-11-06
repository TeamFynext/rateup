import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { contactForm: { create: vi.fn() } },
}));

vi.mock("../../workers/bullmq/queues/index.js", () => ({ notificationQueue: { add: vi.fn() } }));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../workers/bullmq/queues/index.js";
import { log } from "../../utils/logger.js";
import { emailBodyContactForm } from "../../utils/email/emailBodyContactForm.js";
import { createMsg } from "./contact.service.js";
import { createContactMsgHandler } from "./contact.controller.js";
import { contactFormPublicRoutes } from "./contact.public.route.js";
import { createContactMessageInputSchema } from "./contact.schema.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as { contactForm: Record<string, Mock> };

const submission = {
  name: "Ann Smith",
  email: "ann@example.test",
  message: "I would like a demo please",
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
  db.contactForm.create.mockResolvedValue({ id: "msg-1", ...submission });
  (notificationQueue.add as unknown as Mock).mockResolvedValue({ id: "job-1" });
});

// ===========================================================================
// The honeypot
// ===========================================================================

describe("createMsg — the honeypot", () => {
  test("stores a submission that left the honeypot empty", async () => {
    await createMsg(submission as any);

    expect(db.contactForm.create).toHaveBeenCalledWith({ data: submission });
  });

  test("treats an absent honeypot field as clean", async () => {
    await createMsg({ ...submission, address: undefined } as any);

    expect(db.contactForm.create).toHaveBeenCalled();
  });

  test("treats an empty honeypot string as clean", async () => {
    await createMsg({ ...submission, address: "" } as any);

    expect(db.contactForm.create).toHaveBeenCalled();
  });

  test("refuses before writing anything when the honeypot is filled", async () => {
    await createMsg({ ...submission, address: "123 Fake St" } as any);

    expect(db.contactForm.create).not.toHaveBeenCalled();
    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  test("catches even a single space in the honeypot", async () => {
    await createMsg({ ...submission, address: " " } as any);

    expect(db.contactForm.create).not.toHaveBeenCalled();
  });

  test("returns null rather than a value the caller can echo", async () => {
    expect(await createMsg({ ...submission, address: "bot" } as any)).toBeNull();
  });
});

// ===========================================================================
// createMsg — the write and the notification
// ===========================================================================

describe("createMsg — the write and the email", () => {
  test("stores only the three declared fields", async () => {
    await createMsg({ ...submission, address: "" } as any);

    expect(db.contactForm.create.mock.calls[0][0].data).toEqual({
      name: "Ann Smith",
      email: "ann@example.test",
      message: "I would like a demo please",
    });
  });

  test("queues one notification carrying the message", async () => {
    await createMsg(submission as any);

    expect(notificationQueue.add).toHaveBeenCalledWith("notification", {
      emailData: expect.objectContaining({
        subject: "New Message in Rateup Website Contact Form",
        text: "You have received new contact message from ann@example.test",
      }),
    });
  });

  test("sends to the configured root address", async () => {
    const original = process.env.ROOT_ORG_MAIL_ID;
    process.env.ROOT_ORG_MAIL_ID = "ops@example.test";

    await createMsg(submission as any);

    expect((notificationQueue.add as unknown as Mock).mock.calls[0][1].emailData.to).toBe(
      "ops@example.test",
    );

    process.env.ROOT_ORG_MAIL_ID = original;
  });

  test("falls back to a hard-coded address when none is configured", async () => {
    const original = process.env.ROOT_ORG_MAIL_ID;
    delete process.env.ROOT_ORG_MAIL_ID;

    await createMsg(submission as any);

    expect((notificationQueue.add as unknown as Mock).mock.calls[0][1].emailData.to).toBe(
      "hello@rateup.app",
    );

    process.env.ROOT_ORG_MAIL_ID = original;
  });

  test("returns the stored row", async () => {
    expect(await createMsg(submission as any)).toEqual({ id: "msg-1", ...submission });
  });

  test("lets a failed write escape without queueing anything", async () => {
    db.contactForm.create.mockRejectedValue(new Error("connection lost"));

    await expect(createMsg(submission as any)).rejects.toThrow("connection lost");
    expect(notificationQueue.add).not.toHaveBeenCalled();
  });

  test("keeps the submission when the notification cannot be queued", async () => {
    (notificationQueue.add as unknown as Mock).mockRejectedValue(new Error("redis down"));

    expect(await createMsg(submission as any)).toEqual({ id: "msg-1", ...submission });
    expect(db.contactForm.create).toHaveBeenCalled();
  });

  test("logs the queue failure with the id of the row that was stored", async () => {
    (notificationQueue.add as unknown as Mock).mockRejectedValue(new Error("redis down"));

    await createMsg(submission as any);

    expect((log.error as unknown as Mock).mock.calls[0][0]).toMatchObject({
      contactFormId: "msg-1",
    });
  });

  test("queues the email with no guard standing between it and the write", async () => {
    db.contactForm.create.mockResolvedValue({ id: "msg-1" });

    await createMsg(submission as any);

    expect(notificationQueue.add).toHaveBeenCalled();
  });
});

// ===========================================================================
// The email body
// ===========================================================================

describe("emailBodyContactForm", () => {
  test("puts the three fields into the message", async () => {
    const html = await emailBodyContactForm("Ann", "ann@example.test", "hello there");

    expect(html).toContain("Ann");
    expect(html).toContain("ann@example.test");
    expect(html).toContain("hello there");
  });

  test("escapes the submitter's markup instead of rendering it", async () => {
    const html = await emailBodyContactForm(
      '<a href="https://evil.test">Click here</a>',
      "ann@example.test",
      '<img src="https://evil.test/pixel.png">',
    );

    expect(html).not.toContain('<a href="https://evil.test">');
    expect(html).not.toContain('<img src="https://evil.test/pixel.png">');
    expect(html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;");
  });

  test("escapes angle brackets and quotes in every field", async () => {
    const html = await emailBodyContactForm("</li></ul><h1>Injected", "a@b.test", 'it\'s "quoted"');

    expect(html).not.toContain("</li></ul><h1>Injected");
    expect(html).toContain("&lt;/li&gt;&lt;/ul&gt;&lt;h1&gt;Injected");
    expect(html).toContain("&#x27;");
    expect(html).toContain("&quot;quoted&quot;");
  });

  test("labels each captured field", async () => {
    const html = await emailBodyContactForm("Ann", "ann@example.test", "hello");

    expect(html).toContain("Name");
    expect(html).toContain("Email");
    // The React template heads the message block "What they wrote", not "Message".
    expect(html).toContain("What they wrote");
  });
});

// ===========================================================================
// The handler
// ===========================================================================

describe("createContactMsgHandler", () => {
  test("answers 201 and echoes nothing back", async () => {
    const rep = reply();

    await createContactMsgHandler({ body: submission } as any, rep);

    expect(answer(rep)).toEqual({ code: 201, body: { success: true } });
  });

  test("answers a tripped honeypot exactly as it answers a real submission", async () => {
    const clean = reply();
    const trapped = reply();

    await createContactMsgHandler({ body: submission } as any, clean);
    await createContactMsgHandler({ body: { ...submission, address: "bot" } } as any, trapped);

    expect(answer(trapped)).toEqual(answer(clean));
    expect(db.contactForm.create).toHaveBeenCalledTimes(1);
  });

  test("answers a failure with a fixed message", async () => {
    db.contactForm.create.mockRejectedValue(
      new Error('relation "ContactForm" does not exist at character 13'),
    );
    const rep = reply();

    await createContactMsgHandler({ body: submission } as any, rep);

    expect(answer(rep)).toEqual({
      code: 500,
      body: { success: false, message: "Something went wrong" },
    });
    expect(log.error).toHaveBeenCalled();
  });

  test("still reports success when only the notification failed", async () => {
    (notificationQueue.add as unknown as Mock).mockRejectedValue(new Error("redis down"));
    const rep = reply();

    await createContactMsgHandler({ body: submission } as any, rep);

    expect(answer(rep)).toEqual({ code: 201, body: { success: true } });
    expect(db.contactForm.create).toHaveBeenCalled();
  });

  test("replies exactly once on the failure path", async () => {
    db.contactForm.create.mockRejectedValue(new Error("boom"));
    const rep = reply();

    await createContactMsgHandler({ body: submission } as any, rep);

    expect(rep.send).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// The schema and the route
// ===========================================================================

describe("createContactMessageInputSchema", () => {
  test("accepts a well-formed submission", () => {
    expect(createContactMessageInputSchema.safeParse(submission).success).toBe(true);
  });

  test("requires a name of at least three characters", () => {
    const res = createContactMessageInputSchema.safeParse({ ...submission, name: "Jo" });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe("Name must be at least 3 characters long");
  });

  test("requires a message of at least five characters", () => {
    const res = createContactMessageInputSchema.safeParse({ ...submission, message: "hi" });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe("Message must be at least 5 characters long");
  });

  test("requires a parseable email address", () => {
    expect(
      createContactMessageInputSchema.safeParse({ ...submission, email: "not-an-email" }).success,
    ).toBe(false);
  });

  test("keeps the honeypot optional", () => {
    expect(createContactMessageInputSchema.safeParse({ ...submission, address: "x" }).success).toBe(
      true,
    );
  });

  test("bounds the message, the name and the honeypot", () => {
    expect(
      createContactMessageInputSchema.safeParse({ ...submission, message: "x".repeat(200_000) })
        .success,
    ).toBe(false);
    expect(
      createContactMessageInputSchema.safeParse({ ...submission, name: "x".repeat(101) }).success,
    ).toBe(false);
    expect(
      createContactMessageInputSchema.safeParse({ ...submission, address: "x".repeat(201) })
        .success,
    ).toBe(false);
  });

  test("still accepts a message of ordinary length", () => {
    expect(
      createContactMessageInputSchema.safeParse({ ...submission, message: "x".repeat(5000) })
        .success,
    ).toBe(true);
  });
});

describe("contactFormPublicRoutes", () => {
  test("registers exactly one POST and nothing else", async () => {
    const server: any = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      addHook: vi.fn(),
      register: vi.fn(),
    };

    await contactFormPublicRoutes(server);

    expect(server.post).toHaveBeenCalledTimes(1);
    expect(server.post.mock.calls[0][0]).toBe("/");
    expect(server.get).not.toHaveBeenCalled();
  });

  test("rate limits the submission per IP", async () => {
    const server: any = { post: vi.fn(), addHook: vi.fn(), register: vi.fn() };

    await contactFormPublicRoutes(server);

    expect(server.addHook).not.toHaveBeenCalled();
    const options = server.post.mock.calls[0][1];
    expect(options.preHandler).toBeTypeOf("function");
    expect(Object.keys(options).sort()).toEqual(["preHandler", "schema"]);
  });

  test("is not registered anywhere in registerRoutes", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/registerRoutes.ts", "utf8"),
    );

    expect(source).not.toContain("contactFormPublicRoutes");
  });

  test("validates the body with the contact-message schema", async () => {
    const server: any = { post: vi.fn() };

    await contactFormPublicRoutes(server);

    expect(server.post.mock.calls[0][1].schema.body).toBe(createContactMessageInputSchema);
  });
});
