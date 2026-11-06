import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    conversation: { findFirst: vi.fn() },
    conversationTag: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    conversationTagMap: { createMany: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

import prisma from "../../../utils/prisma.js";
import {
  assignTagsToConversation,
  createConversationTag,
  deleteConversationTag,
  getConversationTagById,
  getConversationTagsByOrgId,
  getTagsForConversation,
  updateConversationTag,
} from "./conversationTag.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  conversation: Record<string, Mock>;
  conversationTag: Record<string, Mock>;
  conversationTagMap: Record<string, Mock>;
  $transaction: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const CONVERSATION = "22222222-2222-4222-8222-222222222222";
const TAG_A = "33333333-3333-4333-8333-333333333333";
const TAG_B = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  vi.clearAllMocks();
  db.conversation.findFirst.mockResolvedValue({ id: CONVERSATION });
  db.conversationTag.findMany.mockResolvedValue([]);
  db.conversationTag.findFirst.mockResolvedValue(null);
  db.conversationTagMap.findMany.mockResolvedValue([]);
});

describe("createConversationTag", () => {
  test("creates the tag against the caller's org", async () => {
    db.conversationTag.create.mockResolvedValue({ id: TAG_A, name: "Bug Report", orgId: ORG });

    const tag = await createConversationTag(ORG, { name: "Bug Report", color: "#dc2626" });

    expect(db.conversationTag.create).toHaveBeenCalledWith({
      data: { name: "Bug Report", color: "#dc2626", orgId: ORG },
    });
    // A brand new tag is on nothing yet, so the count is reported rather than omitted.
    expect(tag.conversationCount).toBe(0);
  });
});

describe("getConversationTagsByOrgId", () => {
  test("lists the org's tags in creation order with their usage counts", async () => {
    db.conversationTag.findMany.mockResolvedValue([
      { id: TAG_A, name: "Bug Report", orgId: ORG, _count: { conversationTags: 3 } },
    ]);

    const tags = await getConversationTagsByOrgId(ORG);

    const call = db.conversationTag.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ orgId: ORG });
    expect(call.orderBy).toEqual({ createdAt: "asc" });
    // `_count` is prisma's shape; the API flattens it before it leaves the service.
    expect(tags).toEqual([{ id: TAG_A, name: "Bug Report", orgId: ORG, conversationCount: 3 }]);
  });
});

describe("getConversationTagById", () => {
  test("scopes the lookup to the org and returns null when it misses", async () => {
    expect(await getConversationTagById(TAG_A, ORG)).toBeNull();
    expect(db.conversationTag.findFirst.mock.calls[0][0].where).toEqual({ id: TAG_A, orgId: ORG });
  });
});

describe("updateConversationTag / deleteConversationTag", () => {
  test("both scope the write to the org", async () => {
    db.conversationTag.update.mockResolvedValue({ id: TAG_A, _count: { conversationTags: 1 } });
    await updateConversationTag(TAG_A, ORG, { name: "Escalated" });
    expect(db.conversationTag.update.mock.calls[0][0].where).toEqual({ id: TAG_A, orgId: ORG });

    await deleteConversationTag(TAG_A, ORG);
    expect(db.conversationTag.delete).toHaveBeenCalledWith({ where: { id: TAG_A, orgId: ORG } });
  });
});

describe("getTagsForConversation", () => {
  test("returns null when the conversation is not the caller's", async () => {
    db.conversation.findFirst.mockResolvedValue(null);

    expect(await getTagsForConversation(CONVERSATION, ORG)).toBeNull();
    expect(db.conversationTagMap.findMany).not.toHaveBeenCalled();
  });

  test("ownership is checked through the contact, not the denormalized orgId", async () => {
    await getTagsForConversation(CONVERSATION, ORG);

    // `Conversation.orgId` is nullable on pre-v2 rows, so it cannot carry the check.
    expect(db.conversation.findFirst.mock.calls[0][0].where).toEqual({
      id: CONVERSATION,
      contact: { orgId: ORG },
    });
  });
});

describe("assignTagsToConversation", () => {
  test("returns null without writing when the conversation is not the caller's", async () => {
    db.conversation.findFirst.mockResolvedValue(null);

    expect(await assignTagsToConversation(CONVERSATION, [TAG_A], ORG)).toBeNull();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("drops tag ids belonging to another org rather than attaching them", async () => {
    // Only TAG_A comes back from the org-scoped lookup; TAG_B is someone else's.
    db.conversationTag.findMany.mockResolvedValue([{ id: TAG_A }]);

    await assignTagsToConversation(CONVERSATION, [TAG_A, TAG_B], ORG);

    expect(db.conversationTagMap.createMany).toHaveBeenCalledWith({
      data: [{ conversationId: CONVERSATION, tagId: TAG_A }],
      skipDuplicates: true,
    });
    expect(db.conversationTagMap.deleteMany).toHaveBeenCalledWith({
      where: { conversationId: CONVERSATION, tagId: { notIn: [TAG_A] } },
    });
  });

  test("an empty selection detaches every tag on the conversation", async () => {
    await assignTagsToConversation(CONVERSATION, [], ORG);

    // `notIn: []` matches every row, which is exactly "remove them all".
    expect(db.conversationTagMap.deleteMany).toHaveBeenCalledWith({
      where: { conversationId: CONVERSATION, tagId: { notIn: [] } },
    });
    // No lookup is needed when nothing was asked for.
    expect(db.conversationTag.findMany).not.toHaveBeenCalled();
  });

  test("the delete and the insert go out in one transaction", async () => {
    db.conversationTag.findMany.mockResolvedValue([{ id: TAG_A }]);

    await assignTagsToConversation(CONVERSATION, [TAG_A], ORG);

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$transaction.mock.calls[0][0]).toHaveLength(2);
  });
});
