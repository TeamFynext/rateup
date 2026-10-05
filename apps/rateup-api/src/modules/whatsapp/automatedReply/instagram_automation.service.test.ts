import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waAutomatedReplyMessage: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  excludeFields: vi.fn(),
}));

vi.mock("./instagram_automatedReply.service.js", () => ({
  createOrUpdateInstagramAutomationMessage: vi.fn(),
  logInstagramAutomationAction: vi.fn(),
  wasInstagramAutomationSentRecently: vi.fn(),
}));

vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({
  // Identity, so assertions read against the text the node actually carried.
  parseToWhatsAppFormat: vi.fn((s: string) => s),
}));

vi.mock("../instagram/instagram_messaging.service.js", () => ({
  doesUserFollowInstagramAccount: vi.fn(),
  sendInstagramGenericTemplate: vi.fn(),
  sendInstagramImage: vi.fn(),
  sendInstagramPrivateReply: vi.fn(),
  sendInstagramProductTemplate: vi.fn(),
  sendInstagramQuickReply: vi.fn(),
  sendInstagramTextMessage: vi.fn(),
}));

vi.mock("../../../utils/upload/s3Upload.js", () => ({
  getFileUrlFromKey: vi.fn((key: string) => `https://cdn/${key}`),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import {
  createOrUpdateInstagramAutomationMessage,
  logInstagramAutomationAction,
  wasInstagramAutomationSentRecently,
} from "./instagram_automatedReply.service.js";
import {
  doesUserFollowInstagramAccount,
  sendInstagramGenericTemplate,
  sendInstagramImage,
  sendInstagramPrivateReply,
  sendInstagramProductTemplate,
  sendInstagramQuickReply,
  sendInstagramTextMessage,
} from "../instagram/instagram_messaging.service.js";
import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  handleInstagramUserResponse,
  processNextInstagramNode,
  startInstagramAutomationFlow,
} from "./instagram_automation.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  waAutomatedReplyMessage: {
    findFirst: Mock;
    findMany: Mock;
    findUnique: Mock;
    update: Mock;
    updateMany: Mock;
  };
};

const m = {
  track: createOrUpdateInstagramAutomationMessage as unknown as Mock,
  logAction: logInstagramAutomationAction as unknown as Mock,
  sentRecently: wasInstagramAutomationSentRecently as unknown as Mock,
  sendText: sendInstagramTextMessage as unknown as Mock,
  sendImage: sendInstagramImage as unknown as Mock,
  sendQuickReply: sendInstagramQuickReply as unknown as Mock,
  sendGeneric: sendInstagramGenericTemplate as unknown as Mock,
  sendProduct: sendInstagramProductTemplate as unknown as Mock,
  sendPrivateReply: sendInstagramPrivateReply as unknown as Mock,
  follows: doesUserFollowInstagramAccount as unknown as Mock,
};

const IGS_ID = "igs-1";
const IBA_ID = "iba-1";
const ORG_ID = "org-1";

/** Build an automation from a node list and the edges between them. */
function flow(nodes: any[], edges: any[] = [], overrides: Record<string, unknown> = {}) {
  return {
    id: "ig-auto-1",
    orgId: ORG_ID,
    name: "Flow",
    matchData: { json: { nodes, edges } },
    ...overrides,
  } as any;
}

const START = { id: "start", type: "startNode", data: {} };
const END = { id: "end", type: "endNode", data: {} };
const textNode = (id: string, body = "Hello there") => ({ id, type: "textNode", data: { body } });
const edge = (source: string, target: string, sourceHandle?: string) => ({
  source,
  target,
  sourceHandle,
});

function run(automation: any, nodeId: string, commentId?: string) {
  return processNextInstagramNode(IGS_ID, automation, nodeId, ORG_ID, "msg-1", IBA_ID, commentId);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.waAutomatedReplyMessage.findFirst.mockResolvedValue(null);
  db.waAutomatedReplyMessage.findMany.mockResolvedValue([]);
  db.waAutomatedReplyMessage.findUnique.mockResolvedValue(null);
  db.waAutomatedReplyMessage.update.mockResolvedValue({});
  db.waAutomatedReplyMessage.updateMany.mockResolvedValue({ count: 1 });
  m.track.mockResolvedValue({ id: "msg-1" });
  m.logAction.mockResolvedValue({});
  m.sentRecently.mockResolvedValue(false);
});

describe("startInstagramAutomationFlow", () => {
  test("starts tracking the user at the flow's start node", async () => {
    await startInstagramAutomationFlow(IGS_ID, flow([START]), ORG_ID, IBA_ID);

    expect(m.track).toHaveBeenCalledWith({
      igsId: IGS_ID,
      automationId: "ig-auto-1",
      orgId: ORG_ID,
      currentNode: "start",
      status: "inProgress",
    });
  });

  test("records that the automation started", async () => {
    await startInstagramAutomationFlow(IGS_ID, flow([START]), ORG_ID, IBA_ID);

    expect(m.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ response: { action: "automation_started", startNode: "start" } }),
    );
  });

  test("runs straight on into the node after the start", async () => {
    const automation = flow([START, textNode("t1")], [edge("start", "t1")]);

    await startInstagramAutomationFlow(IGS_ID, automation, ORG_ID, IBA_ID);

    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "Hello there", ORG_ID, IBA_ID);
  });

  test("does nothing when the automation has no start node", async () => {
    await startInstagramAutomationFlow(IGS_ID, flow([textNode("t1")]), ORG_ID, IBA_ID);

    expect(m.track).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });

  // The once-a-day throttle moved to rules with the sendOnceIn24Hours column, so the
  // flow engine no longer consults the recent-send log at all — not even when a caller
  // still passes the old flag.
  test("never consults the recent-send log", async () => {
    m.sentRecently.mockResolvedValue(true);

    await startInstagramAutomationFlow(
      IGS_ID,
      flow([START], [], { sendOnceIn24Hours: true }),
      ORG_ID,
      IBA_ID,
    );

    expect(m.sentRecently).not.toHaveBeenCalled();
    expect(m.track).toHaveBeenCalled();
  });

  // Still not rethrown — one broken automation must not disturb the webhook that
  // triggered it — but the tracking row is marked so the flow is queryable. The marker
  // is `paused`: WaAutomationProgressStatus has no `failed` value, so a crash is told
  // apart from a deliberate wait for input by the accompanying error log.
  test("marks the tracking row paused rather than only logging", async () => {
    const automation = flow([START]);
    m.track.mockRejectedValue(new Error("db down"));

    await expect(
      startInstagramAutomationFlow(IGS_ID, automation, ORG_ID, IBA_ID),
    ).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith({
      where: { phone: IGS_ID, waAutomatedReplyId: automation.id },
      data: { status: "paused" },
    });
  });

  // The marker is best-effort: failing to write it must not mask the original error.
  test("does not throw when the stopped marker itself cannot be written", async () => {
    m.track.mockRejectedValue(new Error("db down"));
    db.waAutomatedReplyMessage.updateMany.mockRejectedValue(new Error("db still down"));

    await expect(
      startInstagramAutomationFlow(IGS_ID, flow([START]), ORG_ID, IBA_ID),
    ).resolves.toBeUndefined();
  });
});

describe("processNextInstagramNode - walking the flow", () => {
  test("does nothing without a node id", async () => {
    await run(flow([START]), "");

    expect(m.sendText).not.toHaveBeenCalled();
  });

  test("does nothing for a node id the flow does not contain", async () => {
    await run(flow([START]), "ghost");

    expect(log.error).toHaveBeenCalled();
    expect(m.sendText).not.toHaveBeenCalled();
  });

  test("does nothing when the automation carries no nodes at all", async () => {
    await run({ id: "a", matchData: {} } as any, "start");

    expect(m.sendText).not.toHaveBeenCalled();
  });

  test("moves the tracked position on as it walks", async () => {
    const automation = flow([START, textNode("t1")], [edge("start", "t1")]);

    await run(automation, "start");

    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith({
      where: { phone: IGS_ID, waAutomatedReplyId: "ig-auto-1" },
      data: { currentNode: "t1" },
    });
  });

  test("marks the flow complete at an end node with nothing after it", async () => {
    await run(flow([END]), "end");

    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith({
      where: { phone: IGS_ID, waAutomatedReplyId: "ig-auto-1" },
      data: { status: "completed" },
    });
  });

  test("marks the flow complete after a node with no outgoing edge", async () => {
    await run(flow([textNode("t1")]), "t1");

    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith({
      where: { phone: IGS_ID, waAutomatedReplyId: "ig-auto-1" },
      data: { status: "completed" },
    });
  });

  test("follows every branch out of a node", async () => {
    const automation = flow(
      [START, textNode("t1", "one"), textNode("t2", "two")],
      [edge("start", "t1"), edge("start", "t2")],
    );

    await run(automation, "start");

    expect(m.sendText).toHaveBeenCalledTimes(2);
  });

  test("warns but keeps going for a node type it does not know", async () => {
    const automation = flow(
      [{ id: "x", type: "mysteryNode", data: {} }, textNode("t1")],
      [edge("x", "t1")],
    );

    await run(automation, "x");

    expect(log.warn).toHaveBeenCalled();
    expect(m.sendText).toHaveBeenCalled();
  });

  // A flow that half-ran is no longer indistinguishable from one that finished: the
  // failure is still not rethrown, but the tracking row is marked paused.
  test("marks the tracking row paused when a node fails mid-flow", async () => {
    const automation = flow([textNode("t1")]);
    m.logAction.mockRejectedValue(new Error("db down"));

    await expect(run(automation, "t1")).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith({
      where: { phone: IGS_ID, waAutomatedReplyId: automation.id },
      data: { status: "paused" },
    });
  });

  test("still does not throw when the stopped marker cannot be written either", async () => {
    m.logAction.mockRejectedValue(new Error("db down"));
    db.waAutomatedReplyMessage.updateMany.mockRejectedValue(new Error("db down"));

    await expect(run(flow([textNode("t1")]), "t1")).resolves.toBeUndefined();
  });
});

describe("processNextInstagramNode - sending each node type", () => {
  test("sends a text node's body", async () => {
    await run(flow([textNode("t1", "Welcome!")]), "t1");

    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "Welcome!", ORG_ID, IBA_ID);
  });

  test("falls back to a greeting when a text node has no body", async () => {
    await run(flow([{ id: "t1", type: "textNode", data: {} }]), "t1");

    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "Hello!", ORG_ID, IBA_ID);
  });

  test("sends an image node through the CDN url", async () => {
    const node = { id: "i1", type: "imageNode", data: { link: "key-1", caption: "Look" } };

    await run(flow([node]), "i1");

    expect(m.sendImage).toHaveBeenCalledWith(IGS_ID, "https://cdn/key-1", ORG_ID, IBA_ID, "Look");
  });

  test("skips an image node with no image", async () => {
    await run(flow([{ id: "i1", type: "imageNode", data: {} }]), "i1");

    expect(m.sendImage).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  test("sends a quick reply node's options", async () => {
    const node = {
      id: "q1",
      type: "instagramQuickReplyNode",
      data: { text: "Pick one", quick_replies: [{ id: "opt-a", title: "A" }] },
    };

    await run(flow([node]), "q1");

    expect(m.sendQuickReply).toHaveBeenCalledWith(
      IGS_ID,
      "Pick one",
      [{ id: "opt-a", title: "A", payload: "opt-a" }],
      ORG_ID,
      IBA_ID,
    );
  });

  test("sends plain text when a quick reply node has no options", async () => {
    const node = { id: "q1", type: "instagramQuickReplyNode", data: { text: "Pick one" } };

    await run(flow([node]), "q1");

    expect(m.sendQuickReply).not.toHaveBeenCalled();
    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "Pick one", ORG_ID, IBA_ID);
  });

  test("uses a template button's id as its payload so the branch can be matched", async () => {
    const node = {
      id: "g1",
      type: "instagramGenericTemplateNode",
      data: {
        elements: [{ title: "Card", buttons: [{ type: "postback", id: "btn-a", title: "Buy" }] }],
      },
    };

    await run(flow([node]), "g1");

    expect(m.sendGeneric.mock.calls[0][1][0].buttons[0].payload).toBe("btn-a");
  });

  test("skips a generic template node with no cards", async () => {
    await run(flow([{ id: "g1", type: "instagramGenericTemplateNode", data: {} }]), "g1");

    expect(m.sendGeneric).not.toHaveBeenCalled();
  });

  test("sends a product template node's products", async () => {
    const node = { id: "p1", type: "instagramProductTemplateNode", data: { productIds: ["p-1"] } };

    await run(flow([node]), "p1");

    expect(m.sendProduct).toHaveBeenCalledWith(IGS_ID, ["p-1"], ORG_ID, IBA_ID);
  });

  test("accepts a single product given as an object", async () => {
    const node = {
      id: "p1",
      type: "instagramProductTemplateNode",
      data: { product: { id: "p-9" } },
    };

    await run(flow([node]), "p1");

    expect(m.sendProduct).toHaveBeenCalledWith(IGS_ID, ["p-9"], ORG_ID, IBA_ID);
  });

  test.each([
    ["a story reply node", "instagramStoryReplyNode"],
    ["an ice breaker node", "instagramIceBreakerNode"],
  ])("sends nothing for %s", async (_name, type) => {
    await run(flow([{ id: "n1", type, data: {} }]), "n1");

    expect(m.sendText).not.toHaveBeenCalled();
    expect(m.logAction.mock.calls[0][0].response.messageSent).toBe(false);
  });
});

describe("processNextInstagramNode - replying to a comment", () => {
  test("answers the comment privately rather than messaging the user", async () => {
    await run(flow([textNode("t1", "Thanks!")]), "t1", "comment-1");

    expect(m.sendPrivateReply).toHaveBeenCalledWith("comment-1", "Thanks!", IBA_ID, ORG_ID, IGS_ID);
    expect(m.sendText).not.toHaveBeenCalled();
  });

  test("only uses the comment for the first message in the flow", async () => {
    const automation = flow(
      [textNode("t1", "First"), textNode("t2", "Second")],
      [edge("t1", "t2")],
    );

    await run(automation, "t1", "comment-1");

    expect(m.sendPrivateReply).toHaveBeenCalledTimes(1);
    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "Second", ORG_ID, IBA_ID);
  });

  // An image cannot be a private reply, so a text stand-in goes out first.
  test("sends a text stand-in before an image when replying to a comment", async () => {
    const node = { id: "i1", type: "imageNode", data: { link: "key-1", caption: "Look" } };

    await run(flow([node]), "i1", "comment-1");

    expect(m.sendPrivateReply).toHaveBeenCalledWith("comment-1", "Look", IBA_ID, ORG_ID, IGS_ID);
    expect(m.sendImage).toHaveBeenCalled();
  });

  test("uses a generic thank-you when the image node has no caption", async () => {
    const node = { id: "i1", type: "imageNode", data: { link: "key-1" } };

    await run(flow([node]), "i1", "comment-1");

    expect(m.sendPrivateReply).toHaveBeenCalledWith(
      "comment-1",
      "Thanks for your comment!",
      IBA_ID,
      ORG_ID,
      IGS_ID,
    );
  });
});

describe("processNextInstagramNode - waiting for the user", () => {
  /** The update that parks the flow, if one was made. */
  const parked = () =>
    db.waAutomatedReplyMessage.update.mock.calls.find(([arg]) => arg.data.response?.waitingAt)?.[0];

  test("asks a text input node's question and waits there for the answer", async () => {
    const automation = flow(
      [{ id: "in1", type: "textInputNode", data: { question: "Your email?" } }, textNode("t1")],
      [edge("in1", "t1")],
    );

    await run(automation, "in1");

    expect(m.sendText).toHaveBeenCalledExactlyOnceWith(IGS_ID, "Your email?", ORG_ID, IBA_ID);
    expect(parked()).toMatchObject({ where: { id: "msg-1" }, data: { currentNode: "in1" } });
  });

  test("asks the question as the private reply when the flow came from a comment", async () => {
    const automation = flow([{ id: "in1", type: "textInputNode", data: { question: "Email?" } }]);

    await run(automation, "in1", "comment-1");

    expect(m.sendPrivateReply).toHaveBeenCalledWith("comment-1", "Email?", IBA_ID, ORG_ID, IGS_ID);
    expect(m.sendText).not.toHaveBeenCalled();
  });

  test("keeps answers already collected when it parks again", async () => {
    db.waAutomatedReplyMessage.findUnique.mockResolvedValue({
      response: { answers: { name: "Ada" } },
    });

    await run(flow([{ id: "in1", type: "textInputNode", data: { question: "Q" } }]), "in1");

    expect(parked().data.response.answers).toEqual({ name: "Ada" });
  });

  test.each([
    ["a quick reply node", "instagramQuickReplyNode"],
    ["a generic template node", "instagramGenericTemplateNode"],
  ])("waits at %s instead of walking past it", async (_name, type) => {
    const node = {
      id: "q1",
      type,
      data: { text: "Pick", quick_replies: [{ id: "a" }], elements: [{ title: "Card" }] },
    };
    const automation = flow([node, textNode("t1")], [edge("q1", "t1")]);

    await run(automation, "q1");

    expect(parked()).toMatchObject({ data: { currentNode: "q1", status: "inProgress" } });
    expect(m.sendText).not.toHaveBeenCalledWith(IGS_ID, "Hello there", ORG_ID, IBA_ID);
  });

  test("finishes rather than waits at a choice with no branches", async () => {
    const node = { id: "q1", type: "instagramQuickReplyNode", data: { quick_replies: [] } };

    await run(flow([node]), "q1");

    expect(parked()).toBeUndefined();
    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "completed" } }),
    );
  });

  // node.tsx in rateup-ui names a handle `qr_<index>` when the option has no id.
  test("sends the same payload the builder used as the branch handle", async () => {
    const node = {
      id: "q1",
      type: "instagramQuickReplyNode",
      data: { text: "Pick", quick_replies: [{ title: "Yes" }] },
    };

    await run(flow([node, textNode("t1")], [edge("q1", "t1", "qr_0")]), "q1");

    expect(m.sendQuickReply.mock.calls[0][2][0].payload).toBe("qr_0");
  });
});

describe("processNextInstagramNode - follow check", () => {
  const followCheck = { id: "f1", type: "instagramFollowCheckNode", data: {} };
  const unlockFlow = flow(
    [followCheck, textNode("link", "Here's your link"), textNode("nudge", "Follow us first")],
    [edge("f1", "link", "following"), edge("f1", "nudge", "notFollowing")],
  );

  test("unlocks the following branch for a follower", async () => {
    m.follows.mockResolvedValue(true);

    await run(unlockFlow, "f1");

    expect(m.follows).toHaveBeenCalledWith(IGS_ID, IBA_ID);
    expect(m.sendText).toHaveBeenCalledExactlyOnceWith(IGS_ID, "Here's your link", ORG_ID, IBA_ID);
  });

  test("nudges someone who does not follow yet", async () => {
    m.follows.mockResolvedValue(false);

    await run(unlockFlow, "f1");

    expect(m.sendText).toHaveBeenCalledExactlyOnceWith(IGS_ID, "Follow us first", ORG_ID, IBA_ID);
  });

  test("finishes the flow when the taken branch leads nowhere", async () => {
    m.follows.mockResolvedValue(true);

    await run(flow([followCheck], [edge("f1", "nudge", "notFollowing")]), "f1");

    expect(m.sendText).not.toHaveBeenCalled();
    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "completed" } }),
    );
  });
});

describe("processNextInstagramNode - pausing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("parks the flow and marks it paused", async () => {
    const node = { id: "p1", type: "pauseNode", data: { duration: 5, unit: "minutes" } };

    await run(flow([node], [edge("p1", "t1")]), "p1");

    expect(db.waAutomatedReplyMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { status: "paused" },
    });
  });

  test("does not walk on while still paused", async () => {
    const automation = flow(
      [{ id: "p1", type: "pauseNode", data: { duration: 5, unit: "minutes" } }, textNode("t1")],
      [edge("p1", "t1")],
    );

    await run(automation, "p1");

    expect(m.sendText).not.toHaveBeenCalled();
  });

  test.each([
    ["seconds", "seconds", 30, 30_000],
    ["minutes", "minutes", 5, 300_000],
    ["hours", "hours", 2, 7_200_000],
  ])("waits the right time for a pause in %s", async (_name, unit, duration, expectedMs) => {
    const node = { id: "p1", type: "pauseNode", data: { duration, unit } };
    const automation = flow([node, textNode("t1")], [edge("p1", "t1")]);

    await run(automation, "p1");
    await vi.advanceTimersByTimeAsync(expectedMs - 1);
    expect(m.sendText).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(m.sendText).toHaveBeenCalled();
  });

  test("resumes the flow once the pause elapses", async () => {
    const automation = flow(
      [{ id: "p1", type: "pauseNode", data: { duration: 1, unit: "seconds" } }, textNode("t1")],
      [edge("p1", "t1")],
    );

    await run(automation, "p1");
    await vi.advanceTimersByTimeAsync(1000);

    expect(db.waAutomatedReplyMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { status: "inProgress" },
    });
    expect(m.sendText).toHaveBeenCalled();
  });
});

describe("handleInstagramUserResponse", () => {
  const recently = () => new Date(Date.now() - 60_000).toISOString();

  function waitingAt(
    currentNode: string,
    nodes: any[],
    edges: any[] = [],
    response: Record<string, unknown> = { waitingAt: recently() },
  ) {
    return {
      id: "msg-1",
      currentNode,
      response,
      waAutomatedReply: { id: "ig-auto-1", matchData: { json: { nodes, edges } } },
    };
  }

  const quickReply = {
    id: "q1",
    type: "instagramQuickReplyNode",
    data: {
      quick_replies: [
        { id: "opt-yes", title: "Yes" },
        { id: "opt-no", title: "No" },
      ],
    },
  };
  const yesNo = [quickReply, textNode("yes", "You said yes"), textNode("no", "You said no")];
  const yesNoEdges = [edge("q1", "yes", "opt-yes"), edge("q1", "no", "opt-no")];

  test("reports nothing to do when the user has no automation running", async () => {
    await expect(handleInstagramUserResponse(IGS_ID, "hello", ORG_ID, IBA_ID)).resolves.toBe(false);
  });

  test("looks only at in-progress Instagram automations for this user", async () => {
    await handleInstagramUserResponse(IGS_ID, "hello", ORG_ID, IBA_ID);

    expect(db.waAutomatedReplyMessage.findMany.mock.calls[0][0].where).toMatchObject({
      phone: IGS_ID,
      orgId: ORG_ID,
      status: "inProgress",
      waAutomatedReply: { platform: PlatformType.INSTAGRAM },
    });
  });

  test("reports nothing when the tracked node no longer exists in the flow", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("ghost", [START])]);

    await expect(handleInstagramUserResponse(IGS_ID, "hello", ORG_ID, IBA_ID)).resolves.toBe(false);
  });

  // Meta refuses to message a user 24h after their last message, so the wait has lapsed.
  test("ignores a wait older than Meta's messaging window", async () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", yesNo, yesNoEdges, { waitingAt: stale }),
    ]);

    await expect(handleInstagramUserResponse(IGS_ID, "Yes", ORG_ID, IBA_ID)).resolves.toBe(false);
  });

  test("ignores a flow that is not waiting", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("q1", yesNo, yesNoEdges, {})]);

    await expect(handleInstagramUserResponse(IGS_ID, "Yes", ORG_ID, IBA_ID)).resolves.toBe(false);
  });

  test("answers the flow that most recently started waiting", async () => {
    const older = waitingAt("q1", yesNo, yesNoEdges, {
      waitingAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    const newer = { ...waitingAt("q1", yesNo, yesNoEdges), id: "msg-2" };
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([older, newer]);

    await handleInstagramUserResponse(IGS_ID, "Yes", ORG_ID, IBA_ID, "opt-yes");

    expect(db.waAutomatedReplyMessage.update.mock.calls[0][0].where).toEqual({ id: "msg-2" });
  });

  test("records what the user said", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("in1", [{ id: "in1", type: "textInputNode", data: {} }]),
    ]);

    await handleInstagramUserResponse(IGS_ID, "my answer", ORG_ID, IBA_ID);

    expect(m.logAction.mock.calls[0][0].response).toMatchObject({
      action: "user_response",
      message: "my answer",
      nodeType: "textInputNode",
    });
  });

  test("stores a text input answer and carries on to the next node", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt(
        "in1",
        [{ id: "in1", type: "textInputNode", data: { variableName: "email" } }, textNode("t1")],
        [edge("in1", "t1")],
        { waitingAt: recently(), answers: { name: "Ada" } },
      ),
    ]);

    await expect(handleInstagramUserResponse(IGS_ID, "a@b.com", ORG_ID, IBA_ID)).resolves.toBe(
      true,
    );

    expect(db.waAutomatedReplyMessage.update.mock.calls[0][0].data.response).toEqual({
      answers: { name: "Ada", email: "a@b.com" },
    });
    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "Hello there", ORG_ID, IBA_ID);
  });

  test("finishes the flow when the answered question is the last step", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("in1", [{ id: "in1", type: "textInputNode", data: { variableName: "email" } }]),
    ]);

    await expect(handleInstagramUserResponse(IGS_ID, "a@b.com", ORG_ID, IBA_ID)).resolves.toBe(
      true,
    );

    expect(db.waAutomatedReplyMessage.update.mock.calls[0][0].data).toMatchObject({
      status: "completed",
    });
  });

  test("takes the branch matching the button the user tapped", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("q1", yesNo, yesNoEdges)]);

    const result = await handleInstagramUserResponse(IGS_ID, "Yes", ORG_ID, IBA_ID, "opt-yes");

    expect(result).toBe(true);
    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "You said yes", ORG_ID, IBA_ID);
    expect(m.sendText).not.toHaveBeenCalledWith(IGS_ID, "You said no", ORG_ID, IBA_ID);
  });

  test("treats typing a choice's title as tapping it", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("q1", yesNo, yesNoEdges)]);

    await expect(handleInstagramUserResponse(IGS_ID, " no ", ORG_ID, IBA_ID)).resolves.toBe(true);
    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "You said no", ORG_ID, IBA_ID);
  });

  test("takes the button branch of a generic template card", async () => {
    const card = {
      id: "g1",
      type: "instagramGenericTemplateNode",
      data: { elements: [{ title: "Card", buttons: [{ type: "postback", title: "Buy" }] }] },
    };
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("g1", [card, textNode("t1", "Great")], [edge("g1", "t1", "btn_0_0")]),
    ]);

    await expect(
      handleInstagramUserResponse(IGS_ID, "Buy", ORG_ID, IBA_ID, "btn_0_0"),
    ).resolves.toBe(true);
    expect(m.sendText).toHaveBeenCalledWith(IGS_ID, "Great", ORG_ID, IBA_ID);
  });

  // An edge with no sourceHandle is the catch-all branch out of a choice node.
  test("takes an unlabelled branch for typed text that matches no choice", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", [quickReply, textNode("t1", "Anything")], [edge("q1", "t1")]),
    ]);

    await expect(handleInstagramUserResponse(IGS_ID, "whatever", ORG_ID, IBA_ID)).resolves.toBe(
      true,
    );
  });

  // A stale button or a persistent-menu tap is not an answer to this question.
  test("leaves a button from elsewhere to the rules, even with a catch-all branch", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", [quickReply, textNode("t1", "Anything")], [edge("q1", "t1")]),
    ]);

    await expect(
      handleInstagramUserResponse(IGS_ID, "Menu", ORG_ID, IBA_ID, "MENU_PAYLOAD"),
    ).resolves.toBe(false);
    expect(db.waAutomatedReplyMessage.update).not.toHaveBeenCalled();
  });

  test("reports nothing when no branch matches the reply", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", yesNo, [edge("q1", "yes", "opt-yes")]),
    ]);

    await expect(handleInstagramUserResponse(IGS_ID, "maybe", ORG_ID, IBA_ID)).resolves.toBe(false);
  });

  test("reports nothing for a node that was not waiting on the user", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("t1", [textNode("t1")])]);

    await expect(handleInstagramUserResponse(IGS_ID, "hello", ORG_ID, IBA_ID)).resolves.toBe(false);
  });

  test("reports nothing rather than throwing when the lookup fails", async () => {
    db.waAutomatedReplyMessage.findMany.mockRejectedValue(new Error("db down"));

    await expect(handleInstagramUserResponse(IGS_ID, "hello", ORG_ID, IBA_ID)).resolves.toBe(false);
    expect(log.error).toHaveBeenCalled();
  });
});
