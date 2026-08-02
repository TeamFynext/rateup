import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../whatsappSurvey/wasurvey.utils.js", () => ({ downloadAndUpload: vi.fn() }));

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { PlatformType } from "../../../../../generated/prisma/enums.js";
import { downloadAndUpload } from "../../whatsappSurvey/wasurvey.utils.js";
import {
  deriveConversationSubject,
  extractMentions,
  handleWaReceivedImages,
  isSessionExpired,
  returnAppropriateTimeStamp,
} from "./wamessage.utils.js";

// No dayjs.extend here on purpose: wamessage.utils.ts registers utc itself now. This
// file used to have to do it, which hid the fact that the module threw
// "utc is not a function" when loaded on its own.
type Mock = ReturnType<typeof vi.fn>;

// dayjs is a singleton and this module imports others that also extend it, so a passing
// timestamp test does not prove the module registers the plugin itself. Assert the
// registration directly, so removing it fails here rather than in production the first
// time a leaner entrypoint (a worker, a script) loads this module alone.
describe("dayjs plugin registration", () => {
  test("registers the utc plugin itself rather than relying on another module", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/modules/whatsapp/inbox/message/wamessage.utils.ts", "utf8"),
    );

    expect(source).toContain(".utc()");
    expect(source).toContain('import utc from "dayjs/plugin/utc.js"');
    expect(source).toContain("dayjs.extend(utc)");
  });
});

const downloadAndUploadMock = downloadAndUpload as unknown as Mock;

/** A WhatsApp inbound webhook body, trimmed to what these helpers read. */
function waReceive(message: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    exchangeProcess: "receive",
    receive: { messages: [message], ...extra },
  } as any;
}

/** Instagram and Facebook deliver one `message` on the event itself. */
function igReceive(message: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { exchangeProcess: "receive", receive: { message, ...extra } } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleWaReceivedImages", () => {
  test("uploads the inbound image and puts the stored link on the message", async () => {
    downloadAndUploadMock.mockResolvedValue("stored-image-1");
    const body = waReceive({ type: "image", image: { id: "wa-media-1", caption: "A photo" } });

    const result: any = await handleWaReceivedImages(body, "org-1");

    expect(downloadAndUploadMock).toHaveBeenCalledWith("org-1", "wa-media-1");
    expect(result.receive.messages[0].image).toEqual({
      id: "wa-media-1",
      caption: "A photo",
      link: "stored-image-1",
    });
  });

  test("keeps the rest of the message intact", async () => {
    downloadAndUploadMock.mockResolvedValue("stored-image-1");
    const body = waReceive(
      { type: "image", image: { id: "wa-media-1" }, from: "15550001", id: "msg-1" },
      { contacts: [{ wa_id: "15550001" }] },
    );

    const result: any = await handleWaReceivedImages(body, "org-1");

    expect(result.receive.messages[0]).toMatchObject({ from: "15550001", id: "msg-1" });
    expect(result.receive.contacts).toEqual([{ wa_id: "15550001" }]);
  });

  test("leaves a non-image message alone", async () => {
    const body = waReceive({ type: "text", text: { body: "hello" } });

    const result = await handleWaReceivedImages(body, "org-1");

    expect(result).toBe(body);
    expect(downloadAndUploadMock).not.toHaveBeenCalled();
  });

  test("leaves an outbound message alone", async () => {
    const body = { exchangeProcess: "send", send: {} } as any;

    const result = await handleWaReceivedImages(body, "org-1");

    expect(result).toBe(body);
    expect(downloadAndUploadMock).not.toHaveBeenCalled();
  });
});

describe("returnAppropriateTimeStamp", () => {
  test("converts a WhatsApp unix timestamp to UTC", async () => {
    const body = waReceive({ type: "text", timestamp: "1700000000" });

    const result = await returnAppropriateTimeStamp(body, PlatformType.WHATSAPP);

    expect(result).toBe(dayjs.unix(1700000000).utc().format());
    expect(result).toContain("2023-11-14");
  });

  test.each([
    ["Instagram", PlatformType.INSTAGRAM],
    ["Facebook", PlatformType.FACEBOOK],
  ])("reads the %s millisecond timestamp as an ISO string", async (_name, platform) => {
    const body = igReceive({ text: "hi" }, { timestamp: 1700000000000 });

    const result = await returnAppropriateTimeStamp(body, platform);

    expect(result).toBe("2023-11-14T22:13:20.000Z");
  });

  test("stamps outbound messages with the current time", async () => {
    const body = { exchangeProcess: "send", send: {} } as any;

    const result = await returnAppropriateTimeStamp(body, PlatformType.WHATSAPP);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// The WhatsApp 24-hour session window. The unit is "day": "D" normalises to "date",
// which dayjs's diff() has no case for, so the comparison used to fall through to raw
// milliseconds and anything older than 1ms read as expired.
describe("isSessionExpired", () => {
  test("reports a conversation from over a day ago as expired", () => {
    expect(isSessionExpired(dayjs().subtract(25, "hour").toDate())).toBe(true);
  });

  test("reports a conversation from well inside the window as still open", () => {
    expect(isSessionExpired(dayjs().subtract(23, "hour").toDate())).toBe(false);
  });

  test("reports a conversation from milliseconds ago as still open", () => {
    expect(isSessionExpired(new Date(Date.now() - 5))).toBe(false);
  });

  test("treats exactly 24 hours as expired", () => {
    expect(isSessionExpired(dayjs().subtract(24, "hour").toDate())).toBe(true);
  });

  test("reports a future timestamp as not expired", () => {
    expect(isSessionExpired(new Date(Date.now() + 60_000))).toBe(false);
  });

  test("reports no expiry for a conversation the customer never started", () => {
    expect(isSessionExpired(undefined as any)).toBeFalsy();
  });
});

describe("deriveConversationSubject - what it refuses to title", () => {
  test.each([
    ["an outbound message", { exchangeProcess: "send", send: {} }],
    ["an internal note", { exchangeProcess: "internal", internal: {} }],
    ["a private note", { exchangeProcess: "privateNote", privateNote: {} }],
  ])("returns null for %s", (_name, body) => {
    expect(deriveConversationSubject(body as any)).toBeNull();
  });

  test("returns null when the event carries no payload", () => {
    expect(deriveConversationSubject({ exchangeProcess: "receive" } as any)).toBeNull();
  });

  test("returns null when the payload carries no message", () => {
    expect(
      deriveConversationSubject({ exchangeProcess: "receive", receive: {} } as any),
    ).toBeNull();
  });

  test("returns null for a message type with nothing to say", () => {
    expect(deriveConversationSubject(waReceive({ type: "system" }))).toBeNull();
  });
});

describe("deriveConversationSubject - titles taken from what the customer wrote", () => {
  test("uses the WhatsApp text body", () => {
    expect(
      deriveConversationSubject(waReceive({ type: "text", text: { body: "My order is late" } })),
    ).toBe("My order is late");
  });

  test("uses the plain string text Instagram and Facebook send", () => {
    expect(deriveConversationSubject(igReceive({ text: "My order is late" }))).toBe(
      "My order is late",
    );
  });

  test.each([
    ["image", "image"],
    ["video", "video"],
    ["document", "document"],
  ])("falls back to the %s caption", (_name, kind) => {
    const body = waReceive({ type: kind, [kind]: { id: "m1", caption: "Broken on arrival" } });

    expect(deriveConversationSubject(body)).toBe("Broken on arrival");
  });

  test.each([
    ["a tapped button", { button_reply: { title: "Track my order" } }],
    ["a chosen list item", { list_reply: { title: "Track my order" } }],
    ["a submitted flow", { nfm_reply: { name: "Track my order" } }],
  ])("uses the label from %s", (_name, interactive) => {
    const body = waReceive({ type: "interactive", interactive });

    expect(deriveConversationSubject(body)).toBe("Track my order");
  });

  test("uses a shared location's name, then its address", () => {
    expect(
      deriveConversationSubject(
        waReceive({ type: "location", location: { name: "Acme HQ", address: "1 Main St" } }),
      ),
    ).toBe("Acme HQ");
    expect(
      deriveConversationSubject(
        waReceive({ type: "location", location: { address: "1 Main St" } }),
      ),
    ).toBe("1 Main St");
  });

  test("uses an order's note and a quick-reply button's text", () => {
    expect(
      deriveConversationSubject(waReceive({ type: "order", order: { text: "2x Widget" } })),
    ).toBe("2x Widget");
    expect(
      deriveConversationSubject(waReceive({ type: "button", button: { text: "Yes please" } })),
    ).toBe("Yes please");
  });

  test("prefers what was typed over a caption on the same message", () => {
    const body = waReceive({
      type: "image",
      text: { body: "Typed words" },
      image: { caption: "Caption words" },
    });

    expect(deriveConversationSubject(body)).toBe("Typed words");
  });
});

describe("deriveConversationSubject - tidying the title", () => {
  test("collapses runs of whitespace and newlines onto one line", () => {
    const body = waReceive({ type: "text", text: { body: "  My   order\n\nis   late  " } });

    expect(deriveConversationSubject(body)).toBe("My order is late");
  });

  test("keeps a title that is exactly at the limit whole", () => {
    const exactly60 = "a".repeat(60);
    const body = waReceive({ type: "text", text: { body: exactly60 } });

    expect(deriveConversationSubject(body)).toBe(exactly60);
  });

  test("cuts a long title on a word boundary rather than mid-word", () => {
    const body = waReceive({
      type: "text",
      text: {
        body: "My order arrived completely broken and I would like a replacement sent urgently",
      },
    });

    const subject = deriveConversationSubject(body)!;

    expect(subject.endsWith("…")).toBe(true);
    expect(subject.length).toBeLessThanOrEqual(61);
    expect(subject).toBe("My order arrived completely broken and I would like a…");
  });

  test("cuts mid-word when the text has no early word boundary", () => {
    const body = waReceive({ type: "text", text: { body: "z".repeat(80) } });

    expect(deriveConversationSubject(body)).toBe(`${"z".repeat(60)}…`);
  });

  test("does not leave a trailing space before the ellipsis", () => {
    const body = waReceive({ type: "text", text: { body: `${"word ".repeat(20)}end` } });

    expect(deriveConversationSubject(body)).not.toContain(" …");
  });

  test("falls through to the type label when the text is only whitespace", () => {
    const body = waReceive({ type: "image", text: { body: "   " }, image: { id: "m1" } });

    expect(deriveConversationSubject(body)).toBe("Photo");
  });
});

describe("deriveConversationSubject - titles for messages with no words", () => {
  test.each([
    ["image", "Photo"],
    ["video", "Video"],
    ["audio", "Voice message"],
    ["voice", "Voice message"],
    ["document", "Document"],
    ["file", "Document"],
    ["sticker", "Sticker"],
    ["share", "Shared post"],
    ["reel", "Reel"],
    ["ig_reel", "Reel"],
    ["story_mention", "Story mention"],
    ["location", "Location"],
    ["contacts", "Contact"],
    ["order", "Order"],
    ["template", "Template message"],
  ])("labels a bare %s message as %s", (type, expected) => {
    expect(deriveConversationSubject(waReceive({ type }))).toBe(expected);
  });

  test("reads the media kind off an Instagram attachment", () => {
    const body = igReceive({ attachments: [{ type: "image" }] });

    expect(deriveConversationSubject(body)).toBe("Photo");
  });

  test("returns null for a media kind it has no label for", () => {
    expect(deriveConversationSubject(waReceive({ type: "unsupported_kind" }))).toBeNull();
  });
});

describe("extractMentions", () => {
  test("pulls a single mention without its @", () => {
    expect(extractMentions("hey @alice can you look")).toEqual(["alice"]);
  });

  test("pulls every mention in order", () => {
    expect(extractMentions("@alice and @bob please")).toEqual(["alice", "bob"]);
  });

  test("accepts dots, underscores and digits in a handle", () => {
    expect(extractMentions("@alice.smith_2 ping")).toEqual(["alice.smith_2"]);
  });

  test("matches a mention at the very start and after a newline", () => {
    expect(extractMentions("@alice\n@bob")).toEqual(["alice", "bob"]);
  });

  test("ignores an address embedded in an email", () => {
    expect(extractMentions("mail alice@acme.com about it")).toEqual([]);
  });

  test("returns an empty list when nobody is mentioned", () => {
    expect(extractMentions("no one here")).toEqual([]);
  });

  test("returns an empty list for empty text", () => {
    expect(extractMentions("")).toEqual([]);
  });
});
