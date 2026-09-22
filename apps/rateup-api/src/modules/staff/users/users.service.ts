import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { usersMatchingDigits } from "../staff.lookup.js";
import {
  asPhoneDigits,
  asUuid,
  pageArgs,
  pageQuerySchema,
  searchTextSchema,
} from "../staff.schema.js";

export const USER_STATUSES = ["active", "paused", "inactive"] as const;

export const userListQuerySchema = pageQuerySchema.extend({
  q: searchTextSchema,
  status: z.enum(USER_STATUSES).optional(),
  sort: z.enum(["created", "email", "lastLogin"]).default("created"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/** Orgs shown per user row; the rest are a count. */
const ORGS_PER_ROW = 3;

async function userListWhere(query: UserListQuery): Promise<Prisma.UserWhereInput> {
  const and: Prisma.UserWhereInput[] = [];
  if (query.q) {
    const id = asUuid(query.q);
    if (id) {
      and.push({ id });
    } else {
      const text = { contains: query.q, mode: "insensitive" as const };
      const or: Prisma.UserWhereInput[] = [{ email: text }, { name: text }];
      const digits = asPhoneDigits(query.q);
      if (digits) {
        const ids = await usersMatchingDigits(digits, 200);
        if (ids.length) or.push({ id: { in: ids } });
      }
      and.push({ OR: or });
    }
  }
  switch (query.status) {
    case "active":
      and.push({ active: true, isPaused: { not: true } });
      break;
    case "paused":
      and.push({ isPaused: true });
      break;
    case "inactive":
      and.push({ active: false });
      break;
  }
  return and.length ? { AND: and } : {};
}

function userListOrder(query: UserListQuery): Prisma.UserOrderByWithRelationInput[] {
  switch (query.sort) {
    case "email":
      return [{ email: query.order }];
    case "lastLogin":
      return [{ lastLoggedInAt: { sort: query.order, nulls: "last" } }, { id: "asc" }];
    default:
      return [{ createdAt: query.order }, { id: "asc" }];
  }
}

export async function listUsers(query: UserListQuery) {
  const where = await userListWhere(query);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: userListOrder(query),
      ...pageArgs(query),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profilePhoto: true,
        active: true,
        isPaused: true,
        deletedAt: true,
        createdAt: true,
        lastLoggedInAt: true,
        _count: { select: { orgMember: true } },
        orgMember: {
          take: ORGS_PER_ROW,
          orderBy: { createdAt: "asc" },
          select: { org: { select: { id: true, name: true, ownerId: true } } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    data: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.profilePhoto,
      active: user.active,
      paused: Boolean(user.isPaused),
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoggedInAt,
      orgCount: user._count.orgMember,
      orgs: user.orgMember.map(({ org }) => ({
        id: org.id,
        name: org.name,
        isOwner: org.ownerId === user.id,
      })),
    })),
  };
}
