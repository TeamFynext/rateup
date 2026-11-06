// Shared helpers for the modules in `./`.
// Extracted verbatim from `EarningRulesPage.tsx`. Behaviour is unchanged.

import { z } from "zod";

import type { LoyaltyEarningRule } from "@/backend/loyalty/earningRules.api";

// Validation schemas
export const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  pointsMultiplier: z.coerce.number().min(0, "Must be a positive number"),
  threshold: z.coerce.number().min(0, "Must be a positive number"),
});

export const earningRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  priority: z.coerce.number().min(0).default(10),
  status: z.enum(["active", "inactive", "scheduled", "expired"]).default("active"),
  pointsPerUnit: z.coerce.number().min(0).default(1.0),
  multiplier: z.coerce.number().min(0).default(1.0),
  bonusPoints: z.coerce.number().min(0).default(0),
  minPurchaseAmount: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v)),
  maxPurchaseAmount: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v)),
  // UI supports these (and backend may accept them); keep permissive for date input values.
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  allowedDays: z.array(z.string()).optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  applicableToTiers: z.array(z.string()).optional(),
  isDefault: z.boolean().default(false),
});

export type TierFormValues = z.input<typeof tierSchema>;

export type EarningRuleFormValues = z.input<typeof earningRuleSchema>;

export function toDateInputValue(value?: string | null) {
  if (!value) return "";
  // Accept ISO strings; keep YYYY-MM-DD.
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function formatStatusLabel(status?: string) {
  if (!status) return "Inactive";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getRuleIcon(rule: LoyaltyEarningRule) {
  if (rule.isDefault) return "💰";
  if (rule.allowedDays?.includes("SATURDAY")) return "🌟";
  return "🎁";
}
