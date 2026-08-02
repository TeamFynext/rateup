import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/redisConnection.js", () => ({
  notificationQueue: { add: vi.fn() },
}));
vi.mock("../../utils/constants/constants.js", () => ({
  rateupLogo: "https://cdn/logo.png",
  webImagesBaseUrl: () =>
    process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL?.replace(/\/+$/, "") ?? "",
}));
vi.mock("./bookDemo.service.js", () => ({ createBookDemo: vi.fn() }));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { notificationQueue } from "../../utils/redisConnection.js";
import { createBookDemo } from "./bookDemo.service.js";
import { bookDemoHandler, partnerDataHandler } from "./bookDemo.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const queueAdd = (notificationQueue as unknown as { add: Mock }).add;
const createDemo = createBookDemo as unknown as Mock;

/** A valid demo request, as the route schema would have accepted it. */
function demoBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ada Lovelace",
    workEmail: "ada@example.com",
    businessName: "Analytical Engines Ltd",
    phone: "15550001234",
    message: "Keen to see the WhatsApp inbox",
    ...overrides,
  } as any;
}

/** A valid partner enquiry. */
function partnerBody(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Ada Lovelace",
    workEmail: "ada@example.com",
    phone: "15550001234",
    companyName: "Analytical Engines Ltd",
    website: "https://example.com",
    country: "India",
    businessType: "Agency",
    companySize: "11-50",
    yearsInBusiness: "5",
    whyPartner: "Our clients keep asking for WhatsApp",
    services: ["Implementation", "Support"],
    referralVolume: "10-20",
    managesClients: "Yes",
    apiExperience: "Yes",
    canOnboard: "Yes",
    ...overrides,
  } as any;
}

function request(body: unknown): any {
  return { body };
}

function reply() {
  const rep: any = { status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

/** The email payload of the nth queued notification. */
function queuedEmail(index = 0) {
  return queueAdd.mock.calls[index][1].emailData;
}

function sent(rep: any) {
  return rep.send.mock.calls[0][0];
}

const originalEnv = {
  ROOT_ORG_MAIL_ID: process.env.ROOT_ORG_MAIL_ID,
  NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL: process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL,
};

beforeEach(() => {
  vi.clearAllMocks();
  queueAdd.mockResolvedValue(undefined);
  createDemo.mockResolvedValue({ id: "demo-1" });
  process.env.ROOT_ORG_MAIL_ID = "sales@rateup.app";
  process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL = "https://cdn.example.com";
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("bookDemoHandler - the internal notification", () => {
  test("queues a notification to the address the org set", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(0).to).toBe("sales@rateup.app");
    expect(queueAdd.mock.calls[0][0]).toBe("notification");
  });

  test("falls back to the RateUp inbox when no address is configured", async () => {
    delete process.env.ROOT_ORG_MAIL_ID;

    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(0).to).toBe("hello@rateup.app");
  });

  test("names the requester in the subject", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(0).subject).toBe("New Demo Request from Ada Lovelace");
  });

  test("carries every detail the requester gave, in both text and html", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    const { text, html } = queuedEmail(0);
    for (const body of [text, html]) {
      expect(body).toContain("Ada Lovelace");
      expect(body).toContain("Analytical Engines Ltd");
      expect(body).toContain("15550001234");
      expect(body).toContain("Keen to see the WhatsApp inbox");
      expect(body).toContain("ada@example.com");
    }
  });

  test("says N/A for a request that carried no message", async () => {
    await bookDemoHandler(request(demoBody({ message: undefined })), reply());

    expect(queuedEmail(0).text).toContain("Message: N/A");
    expect(queuedEmail(0).html).toContain("N/A");
  });
});

describe("bookDemoHandler - the record it keeps", () => {
  // A demo request used to exist only as an email: bookDemoHandler queued two and
  // returned, never touching the database, while createBookDemo sat with no callers
  // and the BookDemo table sat empty. A dropped queue job lost the lead outright.
  // See issues.txt 16.3.
  test("records the request before queueing anything", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(createDemo).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      workEmail: "ada@example.com",
      businessName: "Analytical Engines Ltd",
      phone: "15550001234",
      message: "Keen to see the WhatsApp inbox",
    });
    expect(createDemo.mock.invocationCallOrder[0]).toBeLessThan(
      queueAdd.mock.invocationCallOrder[0],
    );
  });

  // The emails are the faster path to the sales team, so a database that is down
  // must not also cost the lead its notification.
  test("still queues both emails when it could not record the request", async () => {
    createDemo.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await bookDemoHandler(request(demoBody()), rep);

    expect(queueAdd).toHaveBeenCalledTimes(2);
    expect(rep.status).toHaveBeenCalledWith(200);
  });
});

describe("bookDemoHandler - the confirmation to the requester", () => {
  test("queues a second notification to the address they gave", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(queueAdd).toHaveBeenCalledTimes(2);
    expect(queuedEmail(1).to).toBe("ada@example.com");
    expect(queuedEmail(1).subject).toBe("RateUp - Demo Booked Successfully");
  });

  test("greets them by name and repeats their booking details", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    const { html } = queuedEmail(1);
    expect(html).toContain("Hello, Ada Lovelace");
    expect(html).toContain("Analytical Engines Ltd");
    expect(html).toContain("15550001234");
  });

  test("does not repeat their email address back to them", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(1).html).not.toContain("ada@example.com");
  });

  test("carries the RateUp logo and the current year", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    const { html } = queuedEmail(1);
    expect(html).toContain("https://cdn/logo.png");
    expect(html).toContain(String(new Date().getFullYear()));
  });

  test("builds the social icon urls from the configured image host", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(1).html).toContain("https://cdn.example.com/images/email/linkedin_logo.png");
  });

  // The image host comes from a NEXT_PUBLIC_ variable — a frontend naming
  // convention — read inside the API, and it was interpolated into an UNQUOTED src
  // attribute. On an instance without it set, the src rendered as the literal
  // string "undefined/images/...". There is no image worth rendering without a
  // host, so the block is omitted rather than emitted broken. See issues.txt 16.5.
  test("omits the social icons rather than writing undefined into their urls", async () => {
    delete process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL;

    await bookDemoHandler(request(demoBody()), reply());

    const { html } = queuedEmail(1);
    expect(html).not.toContain("undefined/images");
    expect(html).not.toContain("website_logo.png");
  });

  test("quotes the src attribute, so a host with a space cannot break out of it", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(1).html).toContain('src="https://cdn.example.com/images/email/');
  });

  // A client that prefers text/plain used to be shown a blank message.
  // See issues.txt 16.8.
  test("sends a plain-text alternative that carries the booking details", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    const { text } = queuedEmail(1);
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("Analytical Engines Ltd");
    expect(text).toContain("Keen to see the WhatsApp inbox");
  });
});

describe("bookDemoHandler - what the caller is told", () => {
  test("answers 200 and confirms the request was received", async () => {
    const rep = reply();

    await bookDemoHandler(request(demoBody()), rep);

    expect(rep.status).toHaveBeenCalledWith(200);
    expect(sent(rep)).toEqual({
      success: true,
      message: "Your demo request has been received. We’ll contact you soon!",
    });
  });

  // The internal notification is what reaches a human, so failing to queue it is
  // still a failure the requester should hear about.
  test("answers 500 when the internal notification cannot be queued", async () => {
    queueAdd.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await bookDemoHandler(request(demoBody()), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep)).toEqual({
      success: false,
      message: "Something went wrong while booking a demo.",
    });
  });

  // The internal notification is queued first, so a failure queueing the
  // requester's own confirmation used to answer 500 — telling them their booking
  // failed — while the sales team had already been sent the lead and would contact
  // them. It is best-effort now, and logged. See issues.txt 16.4.
  test("still confirms the booking when only the confirmation fails to queue", async () => {
    queueAdd.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("redis is down"));
    const rep = reply();

    await bookDemoHandler(request(demoBody()), rep);

    expect(queuedEmail(0).to).toBe("sales@rateup.app");
    expect(rep.status).toHaveBeenCalledWith(200);
  });
});

describe("bookDemoHandler - what a submitter can put in the email", () => {
  // The serious one. Every field was interpolated into an HTML email body with no
  // escaping, and POST /api/bookdemo carries no checkSession — so anyone on the
  // internet could put arbitrary markup into an email landing in the sales team's
  // inbox. See issues.txt 16.1.
  test("escapes markup from the name in the internal email", async () => {
    await bookDemoHandler(
      request(demoBody({ name: '<a href="https://evil.example/login">Reset your password</a>' })),
      reply(),
    );

    const { html } = queuedEmail(0);
    expect(html).not.toContain('<a href="https://evil.example/login">');
    expect(html).toContain("&lt;a href=&quot;https://evil.example/login&quot;&gt;");
  });

  // The worse half: the recipient is an address the submitter chose, the branding
  // is RateUp's, and the body carried their markup — an unauthenticated way to send
  // convincing RateUp-branded mail with attacker-chosen content to any address,
  // from RateUp's own sending domain. See issues.txt 16.1.
  test("escapes markup from the message in the RateUp-branded confirmation", async () => {
    await bookDemoHandler(
      request(
        demoBody({
          workEmail: "victim@example.com",
          message:
            '</div><h1>Your account is suspended</h1><a href="https://evil.example">Fix it</a>',
        }),
      ),
      reply(),
    );

    const { to, html } = queuedEmail(1);
    expect(to).toBe("victim@example.com");
    expect(html).not.toContain("<h1>Your account is suspended</h1>");
    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain("&lt;h1&gt;Your account is suspended&lt;/h1&gt;");
  });

  // The plain-text half is not markup, so it carries the value as typed.
  test("leaves the plain-text alternative unescaped", async () => {
    await bookDemoHandler(request(demoBody({ name: "Ada & Co <Ltd>" })), reply());

    expect(queuedEmail(0).text).toContain("Ada & Co <Ltd>");
  });

  // The schema set a minimum length on message and no maximum, so a single request
  // could push an arbitrarily large payload through the queue and duplicate it into
  // both emails. The route is rate limited per IP as well. See issues.txt 16.2.
  test("caps the length of the free-text message", async () => {
    const { createBookDemoInputSchema } = await import("./bookDemo.schema.js");

    const result = createBookDemoInputSchema.safeParse(demoBody({ message: "x".repeat(200_000) }));

    expect(result.success).toBe(false);
  });

  test("accepts a message of an ordinary length", async () => {
    const { createBookDemoInputSchema } = await import("./bookDemo.schema.js");

    expect(createBookDemoInputSchema.safeParse(demoBody()).success).toBe(true);
  });
});

describe("partnerDataHandler", () => {
  test("queues one notification to the org's address", async () => {
    await partnerDataHandler(request(partnerBody()), reply());

    expect(queueAdd).toHaveBeenCalledTimes(1);
    expect(queuedEmail(0).to).toBe("sales@rateup.app");
    expect(queuedEmail(0).subject).toBe("New Partner Inquiry from Ada Lovelace");
  });

  test("falls back to the RateUp inbox when no address is configured", async () => {
    delete process.env.ROOT_ORG_MAIL_ID;

    await partnerDataHandler(request(partnerBody()), reply());

    expect(queuedEmail(0).to).toBe("hello@rateup.app");
  });

  test("carries every answer the enquirer gave", async () => {
    await partnerDataHandler(request(partnerBody()), reply());

    const { text, html } = queuedEmail(0);
    for (const body of [text, html]) {
      expect(body).toContain("Analytical Engines Ltd");
      expect(body).toContain("https://example.com");
      expect(body).toContain("Our clients keep asking for WhatsApp");
      expect(body).toContain("11-50");
    }
  });

  test("lists the chosen services as a comma-separated line", async () => {
    await partnerDataHandler(request(partnerBody()), reply());

    expect(queuedEmail(0).text).toContain("Services: Implementation, Support");
    expect(queuedEmail(0).html).toContain("Implementation, Support");
  });

  test("sends no confirmation to the enquirer, unlike the demo form", async () => {
    await partnerDataHandler(request(partnerBody({ workEmail: "ada@example.com" })), reply());

    expect(queueAdd.mock.calls.every((c) => c[1].emailData.to === "sales@rateup.app")).toBe(true);
  });

  test("answers 200 and confirms the enquiry was submitted", async () => {
    const rep = reply();

    await partnerDataHandler(request(partnerBody()), rep);

    expect(rep.status).toHaveBeenCalledWith(200);
    expect(sent(rep)).toEqual({
      success: true,
      message: "Partner inquiry submitted successfully",
    });
  });

  test("answers 500 when the notification queue is unreachable", async () => {
    queueAdd.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await partnerDataHandler(request(partnerBody()), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep)).toEqual({ success: false, message: "Internal server error" });
  });

  // The same unescaped interpolation as the demo form, on an equally
  // unauthenticated route. This one only reaches the internal inbox, since there is
  // no confirmation email. See issues.txt 16.1.
  test("escapes markup from the company name", async () => {
    await partnerDataHandler(
      request(partnerBody({ companyName: "<script>alert(1)</script>" })),
      reply(),
    );

    const { html } = queuedEmail(0);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  // services was joined without a guard. The route schema requires an array, so
  // this was only reachable by a caller bypassing validation — but the handler is
  // exported and had no guard of its own. See issues.txt 16.5.
  test("copes with services that are not a list", async () => {
    const rep = reply();

    await partnerDataHandler(request(partnerBody({ services: "Implementation" })), rep);

    expect(rep.status).toHaveBeenCalledWith(200);
    expect(queuedEmail(0).text).toContain("Services: Implementation");
  });
});
