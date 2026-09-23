import { z } from "zod";
import { pageQuerySchema, searchTextSchema } from "../staff.schema.js";

/**
 * - `active`: a subscription that has not run out.
 * - `expired`: one that has.
 * - `no_plan`: no subscription row at all.
 * - `paused`: paused by the customer (`Org.isPaused`), which staff only read.
 * - `paid`: an active subscription on a tier that carries a price.
 * - `suspended`: switched off by RateUp staff (`Org.suspendedAt`), which `paused` is not.
 */
export const ORG_STATUSES = [
  "active",
  "expired",
  "no_plan",
  "paused",
  "paid",
  "suspended",
] as const;
export type OrgStatusFilter = (typeof ORG_STATUSES)[number];

export const ORG_SORTS = ["created", "name", "expires", "conversations"] as const;

export const orgListQuerySchema = pageQuerySchema.extend({
  q: searchTextSchema,
  status: z.enum(ORG_STATUSES).optional(),
  planId: z.uuid().optional(),
  /** Active subscriptions ending within this many days. */
  expiringInDays: z.coerce.number().int().min(1).max(365).optional(),
  /** Orgs created within this many days. */
  createdWithinDays: z.coerce.number().int().min(1).max(3650).optional(),
  sort: z.enum(ORG_SORTS).default("created"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type OrgListQuery = z.infer<typeof orgListQuerySchema>;
