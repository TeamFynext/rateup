import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { contactForm: { create: vi.fn() } },
}));

vi.mock("../../utils/redisConnection.js", () => ({
  notificationQueue: { add: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../utils/redisConnection.js";
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

  // NOTE: pins current behaviour. The honeypot branch returns the STRING
  // "Error", not an error — so the controller treats it as a successful create
  // and answers 201 with `{ success: true, data: "Error" }`. A bot can therefore
  // detect the honeypot with a single pair of requests: a clean submission
  // returns an object, a tripped one returns the literal string "Error". A
  // honeypot that announces itself is not a honeypot. See issues.txt 22.2.
  test("returns the literal string Error rather than throwing", async () => {
    expect(await createMsg({ ...submission, address: "bot" } as any)).toBe("Error");
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

  // NOTE: pins current behaviour. The row is committed first and the queue write
  // happens after, with no transaction and no compensation — so a Redis outage
  // leaves the message stored and unseen while the visitor is told the
  // submission failed and is likely to send it again.
  // See issues.txt 22.4.
  test("keeps the stored row when the notification cannot be queued", async () => {
    (notificationQueue.add as unknown as Mock).mockRejectedValue(new Error("redis down"));

    await expect(createMsg(submission as any)).rejects.toThrow(/Email sending failed/);
    expect(db.contactForm.create).toHaveBeenCalled();
  });

  // NOTE: the rethrow concatenates the caught value onto a string, so the
  // original error's stack is discarded and the message becomes
  // "Email sending failed. E:Error: redis down". See issues.txt 22.4.
  test("discards the original error's stack when it rethrows", async () => {
    const cause = new Error("redis down");
    (notificationQueue.add as unknown as Mock).mockRejectedValue(cause);

    await expect(createMsg(submission as any)).rejects.toThrow(
      "Email sending failed. E:Error: redis down",
    );
    await expect(createMsg(submission as any)).rejects.not.toBe(cause);
  });

  // NOTE: prisma.create either resolves with a row or rejects, so `if (user)` can
  // never be false — the email is not actually conditional on anything.
  // See issues.txt 22.5.
  test("the guard around the email can never be false", async () => {
    db.contactForm.create.mockResolvedValue({ id: "msg-1" });

    await createMsg(submission as any);

    expect(notificationQueue.add).toHaveBeenCalled();
  });
});

// ===========================================================================
// The email body
// ===========================================================================

describe("emailBodyContactForm", () => {
  test("puts the three fields into the message", () => {
    const html = emailBodyContactForm("Ann", "ann@example.test", "hello there");

    expect(html).toContain("Ann");
    expect(html).toContain("ann@example.test");
    expect(html).toContain("hello there");
  });

  // NOTE: pins current behaviour. Every field is interpolated into the HTML
  // unescaped. The submitter controls all three, and this module's only route is
  // (or would be — see 22.1) unauthenticated, so a visitor chooses the markup
  // that lands in the RateUp team's inbox: working links, remote images that
  // report when the mail is opened, or content styled to look like the rest of
  // the message. Same defect as the BookDemo mailer, issues.txt 16.2.
  // See issues.txt 22.3.
  test("interpolates the submitter's markup into the email unescaped", () => {
    const html = emailBodyContactForm(
      '<a href="https://evil.test">Click here</a>',
      "ann@example.test",
      '<img src="https://evil.test/pixel.png">',
    );

    expect(html).toContain('<a href="https://evil.test">Click here</a>');
    expect(html).toContain('<img src="https://evil.test/pixel.png">');
  });

  test("does not escape angle brackets or quotes anywhere", () => {
    const html = emailBodyContactForm("</li></ul><h1>Injected", "a@b.test", "x");

    expect(html).toContain("</li></ul><h1>Injected");
    expect(html).not.toContain("&lt;");
  });
});

// ===========================================================================
// The handler
// ===========================================================================

describe("createContactMsgHandler", () => {
  test("answers 201 with the stored row", async () => {
    const rep = reply();

    await createContactMsgHandler({ body: submission } as any, rep);

    expect(answer(rep)).toEqual({
      code: 201,
      body: { success: true, data: { id: "msg-1", ...submission } },
    });
  });

  // NOTE: the honeypot's "Error" string arrives here as an ordinary success
  // value, so a bot that trips the honeypot is told the submission worked — and
  // is handed the word "Error" as its data. See issues.txt 22.2.
  test("reports a tripped honeypot as a successful submission", async () => {
    const rep = reply();

    await createContactMsgHandler({ body: { ...submission, address: "bot" } } as any, rep);

    expect(answer(rep)).toEqual({ code: 201, body: { success: true, data: "Error" } });
  });

  // NOTE: the catch sends the raw error message to a caller this module never
  // authenticates, so a database or Redis failure leaks its text — including the
  // "Email sending failed. E:..." wrapper and whatever the driver put in it.
  // See issues.txt 22.6.
  test("leaks the raw error message to the caller", async () => {
    db.contactForm.create.mockRejectedValue(
      new Error('relation "ContactForm" does not exist at character 13'),
    );
    const rep = reply();

    await createContactMsgHandler({ body: submission } as any, rep);

    expect(answer(rep)).toEqual({
      code: 500,
      body: {
        success: false,
        message: 'relation "ContactForm" does not exist at character 13',
      },
    });
  });

  test("reports a failed notification as a 500 even though the row was stored", async () => {
    (notificationQueue.add as unknown as Mock).mockRejectedValue(new Error("redis down"));
    const rep = reply();

    await createContactMsgHandler({ body: submission } as any, rep);

    expect(answer(rep).code).toBe(500);
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

  // NOTE: no upper bound on any field. The message goes into an unbounded text
  // column and, unescaped, into an email (22.3). See issues.txt 22.7.
  test("puts no upper bound on the message length", () => {
    expect(
      createContactMessageInputSchema.safeParse({ ...submission, message: "x".repeat(200_000) })
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

  // NOTE: no checkSession, no rate limit, no captcha and no preHandler of any
  // kind — the honeypot (22.2) is the only abuse control the module has, and it
  // announces itself. See issues.txt 22.7.
  test("adds no hook, no preHandler and no rate limit", async () => {
    const server: any = { post: vi.fn(), addHook: vi.fn(), register: vi.fn() };

    await contactFormPublicRoutes(server);

    expect(server.addHook).not.toHaveBeenCalled();
    expect(server.register).not.toHaveBeenCalled();
    const options = server.post.mock.calls[0][1];
    expect(options).not.toHaveProperty("preHandler");
    expect(options).not.toHaveProperty("config");
    expect(Object.keys(options)).toEqual(["schema"]);
  });

  test("validates the body with the contact-message schema", async () => {
    const server: any = { post: vi.fn() };

    await contactFormPublicRoutes(server);

    expect(server.post.mock.calls[0][1].schema.body).toBe(createContactMessageInputSchema);
  });
});
