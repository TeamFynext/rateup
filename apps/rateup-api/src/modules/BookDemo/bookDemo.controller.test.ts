import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/redisConnection.js", () => ({
  notificationQueue: { add: vi.fn() },
}));
vi.mock("../../utils/constants/constants.js", () => ({ rateupLogo: "https://cdn/logo.png" }));

import { notificationQueue } from "../../utils/redisConnection.js";
import { bookDemoHandler, partnerDataHandler } from "./bookDemo.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const queueAdd = (notificationQueue as unknown as { add: Mock }).add;

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

  // NOTE: pins current behaviour. The image host comes from a NEXT_PUBLIC_ variable
  // — a frontend naming convention — read inside the API. When it is not set on the
  // API's own environment the src becomes the literal string "undefined/images/...".
  // See issues.txt 16.5.
  test("writes the word undefined into the image urls when the host is not set", async () => {
    delete process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL;

    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(1).html).toContain("undefined/images/email/website_logo.png");
  });

  test("sends an empty plain-text alternative", async () => {
    await bookDemoHandler(request(demoBody()), reply());

    expect(queuedEmail(1).text).toBe("");
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

  test("answers 500 when the notification queue is unreachable", async () => {
    queueAdd.mockRejectedValue(new Error("redis is down"));
    const rep = reply();

    await bookDemoHandler(request(demoBody()), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep)).toEqual({
      success: false,
      message: "Something went wrong while booking a demo.",
    });
  });

  // NOTE: pins current behaviour. The internal notification is queued first, so a
  // failure queueing the requester's confirmation answers 500 — telling the
  // requester their booking failed — while the sales team has already been sent the
  // lead and will contact them. Nothing records which of the two went out.
  // See issues.txt 16.4.
  test("has already told the sales team when the confirmation fails to queue", async () => {
    queueAdd.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("redis is down"));
    const rep = reply();

    await bookDemoHandler(request(demoBody()), rep);

    expect(queuedEmail(0).to).toBe("sales@rateup.app");
    expect(rep.status).toHaveBeenCalledWith(500);
  });
});

describe("bookDemoHandler - what a submitter can put in the email", () => {
  // NOTE: pins current behaviour, and this is the serious one. Every field is
  // interpolated into an HTML email body with no escaping. POST /api/bookdemo is
  // registered with no checkSession and no rate limit (bookDemo.route.ts,
  // registerRoutes.ts:124), so anyone on the internet can put arbitrary markup into
  // an email that lands in the sales team's inbox. See issues.txt 16.1.
  test("puts markup from the name straight into the internal email", async () => {
    await bookDemoHandler(
      request(demoBody({ name: '<a href="https://evil.example/login">Reset your password</a>' })),
      reply(),
    );

    expect(queuedEmail(0).html).toContain('<a href="https://evil.example/login">');
    expect(queuedEmail(0).html).not.toContain("&lt;a href");
  });

  // NOTE: the same absence of escaping on the confirmation, which is the worse
  // half: the recipient is an address the submitter chose, the branding is
  // RateUp's, and the body carries their markup. That is an unauthenticated way to
  // send RateUp-branded mail carrying arbitrary content to any address.
  // See issues.txt 16.1.
  test("puts markup from the message into the RateUp-branded confirmation", async () => {
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
    expect(html).toContain("<h1>Your account is suspended</h1>");
    expect(html).toContain('<a href="https://evil.example">');
  });

  // NOTE: the schema sets a minimum length on message and no maximum, so a single
  // request can push an arbitrarily large payload through the queue and into two
  // emails. There is no rate limit on the route either. See issues.txt 16.2.
  test("accepts a message of any size and queues it twice", async () => {
    const huge = "x".repeat(200_000);

    await bookDemoHandler(request(demoBody({ message: huge })), reply());

    expect(queuedEmail(0).html).toContain(huge);
    expect(queuedEmail(1).html).toContain(huge);
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

  // NOTE: the same unescaped interpolation as the demo form, on a route that is
  // equally unauthenticated. This one only reaches the internal inbox, since there
  // is no confirmation email. See issues.txt 16.1.
  test("puts markup from the company name straight into the email", async () => {
    await partnerDataHandler(
      request(partnerBody({ companyName: "<script>alert(1)</script>" })),
      reply(),
    );

    expect(queuedEmail(0).html).toContain("<script>alert(1)</script>");
  });

  // NOTE: services is joined without a guard. The route schema requires an array,
  // so this is only reachable by a caller that bypasses validation — but the
  // function is exported and has no guard of its own. See issues.txt 16.5.
  test("throws when handed services that are not a list", async () => {
    const rep = reply();

    await partnerDataHandler(request(partnerBody({ services: "Implementation" })), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
