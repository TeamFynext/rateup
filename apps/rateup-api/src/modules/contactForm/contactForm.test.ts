import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { contactForm: { create: vi.fn() } },
}));

vi.mock("../../utils/redisConnection.js", () => ({
  notificationQueue: { add: vi.fn() },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../utils/redisConnection.js";
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

  // The branch used to return the STRING "Error", which the controller then sent
  // back as successful data — so a bot could detect the honeypot with a single
  // pair of requests. It returns null now and the handler answers the same body
  // either way. See issues.txt 22.2.
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

  // The row is committed first and the queue write happens after, with no
  // transaction — so a Redis outage used to report the whole submission as failed
  // while the message sat stored and unseen, and the visitor sent it again. The
  // submission is kept and the queue failure is logged with the row's id.
  // See issues.txt 22.4.
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

  // prisma.create either resolves with a row or rejects, so the `if (user)` guard
  // that used to wrap the notification could never be false. See issues.txt 22.5.
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
  test("puts the three fields into the message", () => {
    const html = emailBodyContactForm("Ann", "ann@example.test", "hello there");

    expect(html).toContain("Ann");
    expect(html).toContain("ann@example.test");
    expect(html).toContain("hello there");
  });

  // Every field used to be interpolated raw. The submitter controls all three and
  // the route is unauthenticated, so the visitor chose the markup that landed in
  // the RateUp team's inbox: working links, remote images that report when the
  // mail is opened, or content styled to look like the rest of the message. Same
  // defect as the BookDemo mailer, issues.txt 16.1/16.2. See issues.txt 22.3.
  test("escapes the submitter's markup instead of rendering it", () => {
    const html = emailBodyContactForm(
      '<a href="https://evil.test">Click here</a>',
      "ann@example.test",
      '<img src="https://evil.test/pixel.png">',
    );

    expect(html).not.toContain('<a href="https://evil.test">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;");
  });

  test("escapes angle brackets and quotes in every field", () => {
    const html = emailBodyContactForm("</li></ul><h1>Injected", "a@b.test", 'it\'s "quoted"');

    expect(html).not.toContain("</li></ul><h1>Injected");
    expect(html).toContain("&lt;/li&gt;&lt;/ul&gt;&lt;h1&gt;Injected");
    expect(html).toContain("&#39;");
    expect(html).toContain("&quot;quoted&quot;");
  });

  test("leaves the template's own markup alone", () => {
    const html = emailBodyContactForm("Ann", "ann@example.test", "hello");

    expect(html).toContain("<li><strong>Name:</strong> Ann</li>");
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

  // A tripped honeypot used to be answered with `{ success: true, data: "Error" }`
  // while a real submission got an object, so two requests told a bot which field
  // was the trap. Both answer identically now. See issues.txt 22.2.
  test("answers a tripped honeypot exactly as it answers a real submission", async () => {
    const clean = reply();
    const trapped = reply();

    await createContactMsgHandler({ body: submission } as any, clean);
    await createContactMsgHandler({ body: { ...submission, address: "bot" } } as any, trapped);

    expect(answer(trapped)).toEqual(answer(clean));
    expect(db.contactForm.create).toHaveBeenCalledTimes(1);
  });

  // The catch used to send the raw error text to a caller this module never
  // authenticates, so a database failure leaked the table and column names.
  // See issues.txt 22.6.
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

  // The row is stored by then, so telling the visitor it failed only produced a
  // duplicate. See issues.txt 22.4.
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

  // There used to be no upper bound on any field, so one request could store an
  // arbitrarily large string and put it into an email. See issues.txt 22.7.
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

  // The route used to carry no preHandler of any kind, leaving the honeypot as the
  // module's only abuse control. It is limited per IP now, like the other public
  // marketing forms. See issues.txt 22.7.
  test("rate limits the submission per IP", async () => {
    const server: any = { post: vi.fn(), addHook: vi.fn(), register: vi.fn() };

    await contactFormPublicRoutes(server);

    expect(server.addHook).not.toHaveBeenCalled();
    const options = server.post.mock.calls[0][1];
    expect(options.preHandler).toBeTypeOf("function");
    expect(Object.keys(options).sort()).toEqual(["preHandler", "schema"]);
  });

  // NOTE: STILL OPEN. Nothing in registerRoutes.ts mounts this plugin, so the
  // endpoint does not exist at runtime — every fix above is latent until somebody
  // wires it up, which is now a one-line change. See issues.txt 22.1.
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
