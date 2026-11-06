import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waAutomatedReplyMessage: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
  excludeFields: vi.fn(),
}));

vi.mock("./instagram_automatedReply.service.js", () => ({
  createOrUpdateMetaFlowRun: vi.fn(),
  logMetaFlowAction: vi.fn(),
}));

vi.mock("../whatsappSurvey/wasurvey.utils.js", () => ({
  // Identity, so assertions read against the text the node actually carried.
  parseToWhatsAppFormat: vi.fn((s: string) => s),
}));

vi.mock("../instagram/instagram_messaging.service.js", () => ({
  doesUserFollowInstagramAccount: vi.fn(),
  sendInstagramPrivateReply: vi.fn(),
  sendInstagramProductTemplate: vi.fn(),
}));

vi.mock("../meta/sendApiMessages.js", () => ({
  sendSendApiAudio: vi.fn(),
  sendSendApiFile: vi.fn(),
  sendSendApiGenericTemplate: vi.fn(),
  sendSendApiImage: vi.fn(),
  sendSendApiQuickReply: vi.fn(),
  sendSendApiText: vi.fn(),
  sendSendApiVideo: vi.fn(),
}));

vi.mock("../../contact/contact.service.js", () => ({
  getOrCreateContactByIgsId: vi.fn(),
  getOrCreateContactByPsid: vi.fn(),
}));

vi.mock("./assignNode.service.js", () => ({ runAssignNode: vi.fn() }));

vi.mock("../../../utils/upload/s3Upload.js", () => ({
  getFileUrlFromKey: vi.fn((key: string) => `https://cdn/${key}`),
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import {
  createOrUpdateMetaFlowRun,
  logMetaFlowAction,
} from "./instagram_automatedReply.service.js";
import {
  doesUserFollowInstagramAccount,
  sendInstagramPrivateReply,
  sendInstagramProductTemplate,
} from "../instagram/instagram_messaging.service.js";
import {
  sendSendApiAudio,
  sendSendApiFile,
  sendSendApiGenericTemplate,
  sendSendApiImage,
  sendSendApiQuickReply,
  sendSendApiText,
  sendSendApiVideo,
} from "../meta/sendApiMessages.js";
import {
  getOrCreateContactByIgsId,
  getOrCreateContactByPsid,
} from "../../contact/contact.service.js";
import { runAssignNode } from "./assignNode.service.js";
import { log } from "../../../utils/logger.js";
import { parseToWhatsAppFormat } from "../whatsappSurvey/wasurvey.utils.js";
import { PlatformType } from "../../../generated/prisma/enums.js";
import {
  handleMetaFlowUserResponse,
  processNextMetaFlowNode,
  startMetaFlow,
} from "./metaFlow.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  $transaction: Mock;
  waAutomatedReplyMessage: {
    deleteMany: Mock;
    findFirst: Mock;
    findMany: Mock;
    findUnique: Mock;
    update: Mock;
    updateMany: Mock;
  };
};

const m = {
  track: createOrUpdateMetaFlowRun as unknown as Mock,
  logAction: logMetaFlowAction as unknown as Mock,
  sendText: sendSendApiText as unknown as Mock,
  sendImage: sendSendApiImage as unknown as Mock,
  sendVideo: sendSendApiVideo as unknown as Mock,
  sendAudio: sendSendApiAudio as unknown as Mock,
  sendFile: sendSendApiFile as unknown as Mock,
  sendQuickReply: sendSendApiQuickReply as unknown as Mock,
  sendGeneric: sendSendApiGenericTemplate as unknown as Mock,
  sendProduct: sendInstagramProductTemplate as unknown as Mock,
  sendPrivateReply: sendInstagramPrivateReply as unknown as Mock,
  follows: doesUserFollowInstagramAccount as unknown as Mock,
  contactByIgsId: getOrCreateContactByIgsId as unknown as Mock,
  contactByPsid: getOrCreateContactByPsid as unknown as Mock,
  assign: runAssignNode as unknown as Mock,
};

const IGS_ID = "igs-1";
const IBA_ID = "iba-1";
const ORG_ID = "org-1";
const IG = { platform: PlatformType.INSTAGRAM, accountId: IBA_ID } as const;

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
const textNode = (id: string, body = "Hello there") => ({
  id,
  type: "textNode",
  data: { body },
});
const edge = (source: string, target: string, sourceHandle?: string) => ({
  source,
  target,
  sourceHandle,
});

function run(automation: any, nodeId: string, commentId?: string) {
  return processNextMetaFlowNode(IGS_ID, automation, nodeId, ORG_ID, "msg-1", IG, commentId);
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
});

describe("startMetaFlow", () => {
  test("starts tracking the user at the flow's start node", async () => {
    await startMetaFlow(IGS_ID, flow([START]), ORG_ID, IG);

    expect(m.track).toHaveBeenCalledWith({
      recipientId: IGS_ID,
      automationId: "ig-auto-1",
      orgId: ORG_ID,
      currentNode: "start",
      status: "inProgress",
    });
  });

  test("records that the automation started", async () => {
    await startMetaFlow(IGS_ID, flow([START]), ORG_ID, IG);

    expect(m.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        response: { action: "automation_started", startNode: "start" },
      }),
    );
  });

  test("runs straight on into the node after the start", async () => {
    const automation = flow([START, textNode("t1")], [edge("start", "t1")]);

    await startMetaFlow(IGS_ID, automation, ORG_ID, IG);

    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Hello there");
  });

  test("does nothing when the automation has no start node", async () => {
    await startMetaFlow(IGS_ID, flow([textNode("t1")]), ORG_ID, IG);

    expect(m.track).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });

  // Still not rethrown — one broken automation must not disturb the webhook that
  // triggered it — but the tracking row is marked so the flow is queryable. The marker
  // is `paused`: WaAutomationProgressStatus has no `failed` value, so a crash is told
  // apart from a deliberate wait for input by the accompanying error log.
  test("marks the tracking row paused rather than only logging", async () => {
    const automation = flow([START]);
    m.track.mockRejectedValue(new Error("db down"));

    await expect(startMetaFlow(IGS_ID, automation, ORG_ID, IG)).resolves.toBeUndefined();
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

    await expect(startMetaFlow(IGS_ID, flow([START]), ORG_ID, IG)).resolves.toBeUndefined();
  });
});

describe("processNextMetaFlowNode - walking the flow", () => {
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

describe("processNextMetaFlowNode - sending each node type", () => {
  test("sends a text node's body", async () => {
    await run(flow([textNode("t1", "Welcome!")]), "t1");

    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Welcome!");
  });

  test("falls back to a greeting when a text node has no body", async () => {
    await run(flow([{ id: "t1", type: "textNode", data: {} }]), "t1");

    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Hello!");
  });

  test("sends an image node through the CDN url", async () => {
    const node = {
      id: "i1",
      type: "imageNode",
      data: { link: "key-1", caption: "Look" },
    };

    await run(flow([node]), "i1");

    expect(m.sendImage).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "https://cdn/key-1", "Look");
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

    expect(m.sendQuickReply).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Pick one", [
      { id: "opt-a", title: "A", payload: "opt-a" },
    ]);
  });

  test("sends plain text when a quick reply node has no options", async () => {
    const node = {
      id: "q1",
      type: "instagramQuickReplyNode",
      data: { text: "Pick one" },
    };

    await run(flow([node]), "q1");

    expect(m.sendQuickReply).not.toHaveBeenCalled();
    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Pick one");
  });

  test("uses a template button's id as its payload so the branch can be matched", async () => {
    const node = {
      id: "g1",
      type: "instagramGenericTemplateNode",
      data: {
        elements: [
          {
            title: "Card",
            buttons: [{ type: "postback", id: "btn-a", title: "Buy" }],
          },
        ],
      },
    };

    await run(flow([node]), "g1");

    expect(m.sendGeneric.mock.calls[0][3][0].buttons[0].payload).toBe("btn-a");
  });

  test("skips a generic template node with no cards", async () => {
    await run(flow([{ id: "g1", type: "instagramGenericTemplateNode", data: {} }]), "g1");

    expect(m.sendGeneric).not.toHaveBeenCalled();
  });

  test("sends a product template node's products", async () => {
    const node = {
      id: "p1",
      type: "instagramProductTemplateNode",
      data: { productIds: ["p-1"] },
    };

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

describe("processNextMetaFlowNode - replying to a comment", () => {
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
    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Second");
  });

  // An image cannot be a private reply, so a text stand-in goes out first.
  test("sends a text stand-in before an image when replying to a comment", async () => {
    const node = {
      id: "i1",
      type: "imageNode",
      data: { link: "key-1", caption: "Look" },
    };

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

describe("processNextMetaFlowNode - waiting for the user", () => {
  /** The update that parks the flow, if one was made. */
  const parked = () =>
    db.waAutomatedReplyMessage.update.mock.calls.find(([arg]) => arg.data.response?.waitingAt)?.[0];

  test("asks a text input node's question and waits there for the answer", async () => {
    const automation = flow(
      [{ id: "in1", type: "textInputNode", data: { question: "Your email?" } }, textNode("t1")],
      [edge("in1", "t1")],
    );

    await run(automation, "in1");

    expect(m.sendText).toHaveBeenCalledExactlyOnceWith(IG, IGS_ID, ORG_ID, "Your email?");
    expect(parked()).toMatchObject({
      where: { id: "msg-1" },
      data: { currentNode: "in1" },
    });
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
      data: {
        text: "Pick",
        quick_replies: [{ id: "a" }],
        elements: [{ title: "Card" }],
      },
    };
    const automation = flow([node, textNode("t1")], [edge("q1", "t1")]);

    await run(automation, "q1");

    expect(parked()).toMatchObject({
      data: { currentNode: "q1", status: "inProgress" },
    });
    expect(m.sendText).not.toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Hello there");
  });

  test("finishes rather than waits at a choice with no branches", async () => {
    const node = {
      id: "q1",
      type: "instagramQuickReplyNode",
      data: { quick_replies: [] },
    };

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

    expect(m.sendQuickReply.mock.calls[0][4][0].payload).toBe("qr_0");
  });
});

describe("processNextMetaFlowNode - follow check", () => {
  const followCheck = { id: "f1", type: "instagramFollowCheckNode", data: {} };
  const unlockFlow = flow(
    [followCheck, textNode("link", "Here's your link"), textNode("nudge", "Follow us first")],
    [edge("f1", "link", "following"), edge("f1", "nudge", "notFollowing")],
  );

  test("unlocks the following branch for a follower", async () => {
    m.follows.mockResolvedValue(true);

    await run(unlockFlow, "f1");

    expect(m.follows).toHaveBeenCalledWith(IGS_ID, IBA_ID);
    expect(m.sendText).toHaveBeenCalledExactlyOnceWith(IG, IGS_ID, ORG_ID, "Here's your link");
  });

  test("nudges someone who does not follow yet", async () => {
    m.follows.mockResolvedValue(false);

    await run(unlockFlow, "f1");

    expect(m.sendText).toHaveBeenCalledExactlyOnceWith(IG, IGS_ID, ORG_ID, "Follow us first");
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

describe("processNextMetaFlowNode - pausing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("parks the flow and marks it paused", async () => {
    const node = {
      id: "p1",
      type: "pauseNode",
      data: { duration: 5, unit: "minutes" },
    };

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

describe("handleMetaFlowUserResponse", () => {
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
      waAutomatedReply: {
        id: "ig-auto-1",
        matchData: { json: { nodes, edges } },
      },
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
    await expect(handleMetaFlowUserResponse(IGS_ID, "hello", ORG_ID, IG)).resolves.toBe(false);
  });

  test("looks only at in-progress automations on this channel for this user", async () => {
    await handleMetaFlowUserResponse(IGS_ID, "hello", ORG_ID, IG);

    expect(db.waAutomatedReplyMessage.findMany.mock.calls[0][0].where).toMatchObject({
      phone: IGS_ID,
      orgId: ORG_ID,
      status: "inProgress",
      waAutomatedReply: { platform: PlatformType.INSTAGRAM },
    });
  });

  test("reports nothing when the tracked node no longer exists in the flow", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("ghost", [START])]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "hello", ORG_ID, IG)).resolves.toBe(false);
  });

  // Meta refuses to message a user 24h after their last message, so the wait has lapsed.
  test("ignores a wait older than Meta's messaging window", async () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", yesNo, yesNoEdges, { waitingAt: stale }),
    ]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "Yes", ORG_ID, IG)).resolves.toBe(false);
  });

  test("ignores a flow that is not waiting", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("q1", yesNo, yesNoEdges, {})]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "Yes", ORG_ID, IG)).resolves.toBe(false);
  });

  test("answers the flow that most recently started waiting", async () => {
    const older = waitingAt("q1", yesNo, yesNoEdges, {
      waitingAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    const newer = { ...waitingAt("q1", yesNo, yesNoEdges), id: "msg-2" };
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([older, newer]);

    await handleMetaFlowUserResponse(IGS_ID, "Yes", ORG_ID, IG, "opt-yes");

    expect(db.waAutomatedReplyMessage.update.mock.calls[0][0].where).toEqual({
      id: "msg-2",
    });
  });

  test("records what the user said", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("in1", [{ id: "in1", type: "textInputNode", data: {} }]),
    ]);

    await handleMetaFlowUserResponse(IGS_ID, "my answer", ORG_ID, IG);

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

    await expect(handleMetaFlowUserResponse(IGS_ID, "a@b.com", ORG_ID, IG)).resolves.toBe(true);

    expect(db.waAutomatedReplyMessage.update.mock.calls[0][0].data.response).toEqual({
      answers: { name: "Ada", email: "a@b.com" },
    });
    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Hello there");
  });

  test("finishes the flow when the answered question is the last step", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("in1", [{ id: "in1", type: "textInputNode", data: { variableName: "email" } }]),
    ]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "a@b.com", ORG_ID, IG)).resolves.toBe(true);

    expect(db.waAutomatedReplyMessage.update.mock.calls[0][0].data).toMatchObject({
      status: "completed",
    });
  });

  test("takes the branch matching the button the user tapped", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("q1", yesNo, yesNoEdges)]);

    const result = await handleMetaFlowUserResponse(IGS_ID, "Yes", ORG_ID, IG, "opt-yes");

    expect(result).toBe(true);
    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "You said yes");
    expect(m.sendText).not.toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "You said no");
  });

  test("treats typing a choice's title as tapping it", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("q1", yesNo, yesNoEdges)]);

    await expect(handleMetaFlowUserResponse(IGS_ID, " no ", ORG_ID, IG)).resolves.toBe(true);
    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "You said no");
  });

  test("takes the button branch of a generic template card", async () => {
    const card = {
      id: "g1",
      type: "instagramGenericTemplateNode",
      data: {
        elements: [{ title: "Card", buttons: [{ type: "postback", title: "Buy" }] }],
      },
    };
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("g1", [card, textNode("t1", "Great")], [edge("g1", "t1", "btn_0_0")]),
    ]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "Buy", ORG_ID, IG, "btn_0_0")).resolves.toBe(
      true,
    );
    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "Great");
  });

  // An edge with no sourceHandle is the catch-all branch out of a choice node.
  test("takes an unlabelled branch for typed text that matches no choice", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", [quickReply, textNode("t1", "Anything")], [edge("q1", "t1")]),
    ]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "whatever", ORG_ID, IG)).resolves.toBe(true);
  });

  // A stale button or a persistent-menu tap is not an answer to this question.
  test("leaves a button from elsewhere to the rules, even with a catch-all branch", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", [quickReply, textNode("t1", "Anything")], [edge("q1", "t1")]),
    ]);

    await expect(
      handleMetaFlowUserResponse(IGS_ID, "Menu", ORG_ID, IG, "MENU_PAYLOAD"),
    ).resolves.toBe(false);
    expect(db.waAutomatedReplyMessage.update).not.toHaveBeenCalled();
  });

  test("reports nothing when no branch matches the reply", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([
      waitingAt("q1", yesNo, [edge("q1", "yes", "opt-yes")]),
    ]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "maybe", ORG_ID, IG)).resolves.toBe(false);
  });

  test("reports nothing for a node that was not waiting on the user", async () => {
    db.waAutomatedReplyMessage.findMany.mockResolvedValue([waitingAt("t1", [textNode("t1")])]);

    await expect(handleMetaFlowUserResponse(IGS_ID, "hello", ORG_ID, IG)).resolves.toBe(false);
  });

  test("reports nothing rather than throwing when the lookup fails", async () => {
    db.waAutomatedReplyMessage.findMany.mockRejectedValue(new Error("db down"));

    await expect(handleMetaFlowUserResponse(IGS_ID, "hello", ORG_ID, IG)).resolves.toBe(false);
    expect(log.error).toHaveBeenCalled();
  });
});

describe("processNextMetaFlowNode - media and assignment", () => {
  test("sends a video node with its caption", async () => {
    const node = {
      id: "v1",
      type: "videoNode",
      data: { link: "vid-1", caption: "Watch" },
    };

    await run(flow([node]), "v1");

    expect(m.sendVideo).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "https://cdn/vid-1", "Watch");
  });

  test("sends a document (PDF) on Instagram as a file attachment", async () => {
    await run(flow([{ id: "d1", type: "documentNode", data: { link: "doc-1" } }]), "d1");
    expect(m.sendFile).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "https://cdn/doc-1");
  });

  test("sends an audio node", async () => {
    await run(flow([{ id: "a1", type: "audioNode", data: { link: "aud-1" } }]), "a1");

    expect(m.sendAudio).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "https://cdn/aud-1");
  });

  test("assigns the Instagram contact found by igsId", async () => {
    m.contactByIgsId.mockResolvedValue({ contact: { id: "contact-1" } });
    const data = { assign: { teamId: "team-1", choice: "all" } };

    await run(flow([{ id: "as1", type: "assignNode", data }]), "as1");

    expect(m.contactByIgsId).toHaveBeenCalledWith(IGS_ID, ORG_ID, undefined, true);
    expect(m.assign).toHaveBeenCalledWith(data, "contact-1", ORG_ID, "ig-auto-1");
  });
});

// A refused send (outside the 24-hour window, say) used to be logged and walked past.
describe("processNextMetaFlowNode - a send Meta refuses", () => {
  test("stops the flow at that step and marks it paused", async () => {
    m.sendText.mockRejectedValueOnce(new Error("outside the messaging window"));
    const automation = flow(
      [textNode("t1", "First"), textNode("t2", "Second")],
      [edge("t1", "t2")],
    );

    await expect(run(automation, "t1")).resolves.toBeUndefined();

    expect(m.sendText).toHaveBeenCalledTimes(1);
    expect(db.waAutomatedReplyMessage.updateMany).toHaveBeenCalledWith({
      where: { phone: IGS_ID, waAutomatedReplyId: automation.id },
      data: { status: "paused" },
    });
  });
});

describe("Messenger flows", () => {
  const PSID = "psid-1";
  const MESSENGER = {
    platform: PlatformType.FACEBOOK,
    accountId: "page-1",
  } as const;
  const runMessenger = (automation: any, nodeId: string, commentId?: string) =>
    processNextMetaFlowNode(PSID, automation, nodeId, ORG_ID, "msg-1", MESSENGER, commentId);

  test("sends a document as a file on Messenger", async () => {
    await runMessenger(flow([{ id: "d1", type: "documentNode", data: { link: "doc-1" } }]), "d1");
    expect(m.sendFile).toHaveBeenCalledWith(MESSENGER, PSID, ORG_ID, "https://cdn/doc-1");
    expect(m.sendText).not.toHaveBeenCalled();
  });

  test("sends a document's caption as a text right after the file", async () => {
    await runMessenger(
      flow([
        {
          id: "d1",
          type: "documentNode",
          data: { link: "doc-1", caption: "Your invoice" },
        },
      ]),
      "d1",
    );
    expect(m.sendFile).toHaveBeenCalledWith(MESSENGER, PSID, ORG_ID, "https://cdn/doc-1");
    expect(m.sendText).toHaveBeenCalledWith(MESSENGER, PSID, ORG_ID, "Your invoice");
    expect(m.sendFile.mock.invocationCallOrder[0]).toBeLessThan(
      m.sendText.mock.invocationCallOrder[0]!,
    );
  });

  test("sends text, quick replies and cards on the Messenger channel", async () => {
    const quickReply = {
      id: "q1",
      type: "instagramQuickReplyNode",
      data: { text: "Pick", quick_replies: [{ id: "a", title: "A" }] },
    };
    const card = {
      id: "g1",
      type: "instagramGenericTemplateNode",
      data: { elements: [{ title: "Card" }] },
    };

    await runMessenger(flow([textNode("t1", "Hi")]), "t1");
    await runMessenger(flow([quickReply]), "q1");
    await runMessenger(flow([card]), "g1");

    expect(m.sendText).toHaveBeenCalledWith(MESSENGER, PSID, ORG_ID, "Hi");
    expect(m.sendQuickReply.mock.calls[0][0]).toBe(MESSENGER);
    expect(m.sendGeneric.mock.calls[0][0]).toBe(MESSENGER);
  });

  test.each([
    ["a follow check", { id: "n1", type: "instagramFollowCheckNode", data: {} }],
    [
      "a product template",
      {
        id: "n1",
        type: "instagramProductTemplateNode",
        data: { productIds: ["p"] },
      },
    ],
  ])("skips %s and carries on", async (_name, node) => {
    await runMessenger(flow([node, textNode("t1", "Next")], [edge("n1", "t1")]), "n1");

    expect(m.follows).not.toHaveBeenCalled();
    expect(m.sendProduct).not.toHaveBeenCalled();
    expect(m.sendText).toHaveBeenCalledWith(MESSENGER, PSID, ORG_ID, "Next");
  });

  test("never sends a private reply, even if handed a comment id", async () => {
    await runMessenger(flow([textNode("t1", "Hi")]), "t1", "comment-1");

    expect(m.sendPrivateReply).not.toHaveBeenCalled();
    expect(m.sendText).toHaveBeenCalledWith(MESSENGER, PSID, ORG_ID, "Hi");
  });

  test("assigns the contact found by psid", async () => {
    m.contactByPsid.mockResolvedValue({ contact: { id: "contact-2" } });

    await runMessenger(flow([{ id: "as1", type: "assignNode", data: {} }]), "as1");

    expect(m.contactByPsid).toHaveBeenCalledWith(PSID, ORG_ID, undefined, true);
    expect(m.contactByIgsId).not.toHaveBeenCalled();
    expect(m.assign).toHaveBeenCalledWith({}, "contact-2", ORG_ID, "ig-auto-1");
  });

  test("resumes only Messenger flows", async () => {
    await handleMetaFlowUserResponse(PSID, "hello", ORG_ID, MESSENGER);

    expect(db.waAutomatedReplyMessage.findMany.mock.calls[0][0].where).toMatchObject({
      phone: PSID,
      waAutomatedReply: { platform: PlatformType.FACEBOOK },
    });
  });
});

// The builder saves bodies, questions and captions as rich-text documents. They used to be
// read only when they were plain strings, so a text node sent "Hello!" and a question
// node sent nothing.
describe("processNextMetaFlowNode - rich-text fields", () => {
  const doc = { type: "doc", content: [{ type: "paragraph" }] };
  const parse = parseToWhatsAppFormat as unknown as Mock;

  beforeEach(() => {
    parse.mockImplementation((value: unknown) =>
      typeof value === "string" ? value : "From the document",
    );
  });

  test("sends a text node's rich-text body", async () => {
    await run(flow([{ id: "t1", type: "textNode", data: { body: doc } }]), "t1");

    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "From the document");
  });

  test("asks a question saved as rich text", async () => {
    await run(flow([{ id: "in1", type: "textInputNode", data: { question: doc } }]), "in1");

    expect(m.sendText).toHaveBeenCalledWith(IG, IGS_ID, ORG_ID, "From the document");
  });

  test("sends an image's rich-text caption", async () => {
    await run(flow([{ id: "i1", type: "imageNode", data: { link: "k", caption: doc } }]), "i1");

    expect(m.sendImage).toHaveBeenCalledWith(
      IG,
      IGS_ID,
      ORG_ID,
      "https://cdn/k",
      "From the document",
    );
  });
});

// A chatbot started from a Facebook comment runs under a stand-in until its first message,
// the private reply, names the person; then the run is filed under their Messenger id.
describe("a Messenger chatbot started from a Page comment", () => {
  const STAND_IN = "fb_comment:comment-1";
  const onComment = () =>
    ({
      platform: PlatformType.FACEBOOK,
      accountId: "page-1",
      pendingComment: { commentId: "comment-1" },
    }) as {
      platform: "FACEBOOK";
      accountId: string;
      pendingComment: { commentId: string; recipientId?: string };
    };
  /** Meta answering the private reply, as the real sender records it on the channel. */
  const replyReaches = (psid = "psid-9") =>
    m.sendText.mockImplementation(async (channel: any) => {
      if (channel.pendingComment && !channel.pendingComment.recipientId) {
        channel.pendingComment.recipientId = psid;
      }
    });

  // clearAllMocks keeps implementations; each test here decides whether the reply reaches.
  beforeEach(() => {
    m.sendText.mockResolvedValue({ message_id: "m" });
  });

  test("files the run under the person the reply reached", async () => {
    replyReaches();
    const automation = flow([START, textNode("t1", "Hi!")], [edge("start", "t1")]);

    await startMetaFlow(STAND_IN, automation, ORG_ID, onComment());

    expect(db.waAutomatedReplyMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { phone: "psid-9" },
    });
  });

  // Their reply must find this run, not one left over from an earlier visit.
  test("clears that person's earlier run of the same chatbot", async () => {
    replyReaches();
    const automation = flow([START, textNode("t1")], [edge("start", "t1")]);

    await startMetaFlow(STAND_IN, automation, ORG_ID, onComment());

    expect(db.waAutomatedReplyMessage.deleteMany).toHaveBeenCalledWith({
      where: {
        phone: "psid-9",
        waAutomatedReplyId: automation.id,
        orgId: ORG_ID,
        NOT: { id: "msg-1" },
      },
    });
  });

  test("leaves the run alone when the reply reached nobody", async () => {
    const automation = flow([START, textNode("t1")], [edge("start", "t1")]);

    await startMetaFlow(STAND_IN, automation, ORG_ID, onComment());

    expect(db.waAutomatedReplyMessage.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: expect.anything() } }),
    );
  });

  test("leaves an ordinary Messenger run alone", async () => {
    const automation = flow([START, textNode("t1")], [edge("start", "t1")]);

    await startMetaFlow("psid-1", automation, ORG_ID, {
      platform: PlatformType.FACEBOOK,
      accountId: "page-1",
    });

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  // A private reply cannot carry media, as on Instagram.
  test("answers the comment in text before media", async () => {
    const node = {
      id: "i1",
      type: "imageNode",
      data: { link: "key-1", caption: "Our menu" },
    };
    const channel = onComment();

    await processNextMetaFlowNode(STAND_IN, flow([node]), "i1", ORG_ID, "msg-1", channel);

    expect(m.sendText).toHaveBeenCalledWith(channel, STAND_IN, ORG_ID, "Our menu");
    expect(m.sendText.mock.invocationCallOrder[0]).toBeLessThan(
      m.sendImage.mock.invocationCallOrder[0],
    );
  });
});
