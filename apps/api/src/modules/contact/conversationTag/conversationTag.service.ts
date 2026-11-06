import prisma from "../../../utils/prisma.js";
import {
  CreateConversationTagSchema,
  UpdateConversationTagSchema,
} from "./conversationTag.schema.js";

/** Flattens prisma's `_count` into the flat `conversationCount` the API returns. */
function withCount<T extends { _count?: { conversationTags: number } }>(tag: T) {
  const { _count, ...rest } = tag;
  return { ...rest, conversationCount: _count?.conversationTags ?? 0 };
}

export async function createConversationTag(orgId: string, data: CreateConversationTagSchema) {
  const tag = await prisma.conversationTag.create({
    data: { ...data, orgId },
  });
  return { ...tag, conversationCount: 0 };
}

export async function getConversationTagsByOrgId(orgId: string) {
  const tags = await prisma.conversationTag.findMany({
    where: { orgId },
    include: { _count: { select: { conversationTags: true } } },
    orderBy: { createdAt: "asc" },
  });
  return tags.map(withCount);
}

export async function getConversationTagById(tagId: string, orgId: string) {
  const tag = await prisma.conversationTag.findFirst({
    where: { id: tagId, orgId },
    include: { _count: { select: { conversationTags: true } } },
  });
  return tag ? withCount(tag) : null;
}

export async function updateConversationTag(
  tagId: string,
  orgId: string,
  data: UpdateConversationTagSchema,
) {
  const tag = await prisma.conversationTag.update({
    where: { id: tagId, orgId },
    data,
    include: { _count: { select: { conversationTags: true } } },
  });
  return withCount(tag);
}

export async function deleteConversationTag(tagId: string, orgId: string) {
  // The map rows cascade with the tag, so detaching first would only cost a round trip.
  return prisma.conversationTag.delete({ where: { id: tagId, orgId } });
}

/** The tags currently on one conversation, in the org's own tag order. */
export async function getTagsForConversation(conversationId: string, orgId: string) {
  const owned = await prisma.conversation.findFirst({
    where: { id: conversationId, contact: { orgId } },
    select: { id: true },
  });
  if (!owned) return null;

  const rows = await prisma.conversationTagMap.findMany({
    where: { conversationId, tag: { orgId } },
    include: { tag: true },
    orderBy: { tag: { createdAt: "asc" } },
  });
  return rows.map((row) => row.tag);
}

/**
 * Replaces the conversation's whole tag set, the same way contact labels are
 * assigned. Tags from another org are dropped rather than rejected, so a stale
 * client cannot leak one org's vocabulary into another's ticket.
 *
 * Returns `null` when the conversation does not belong to `orgId`, so the caller
 * can answer 404 rather than silently succeeding.
 */
export async function assignTagsToConversation(
  conversationId: string,
  tagIds: string[],
  orgId: string,
) {
  // `Conversation.orgId` is denormalized and nullable on pre-v2 rows, so ownership
  // is checked through the contact, which is always populated.
  const owned = await prisma.conversation.findFirst({
    where: { id: conversationId, contact: { orgId } },
    select: { id: true },
  });
  if (!owned) return null;

  const validTagIds = tagIds.length
    ? (
        await prisma.conversationTag.findMany({
          where: { id: { in: tagIds }, orgId },
          select: { id: true },
        })
      ).map((tag) => tag.id)
    : [];

  await prisma.$transaction([
    prisma.conversationTagMap.deleteMany({
      where: { conversationId, tagId: { notIn: validTagIds } },
    }),
    prisma.conversationTagMap.createMany({
      data: validTagIds.map((tagId) => ({ conversationId, tagId })),
      skipDuplicates: true,
    }),
  ]);

  return getTagsForConversation(conversationId, orgId);
}
