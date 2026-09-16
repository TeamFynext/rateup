/**
 * Prisma rows → the partner API's wire shapes.
 *
 * Explicit mappers rather than spreading rows into a response, for two reasons that both
 * bite silently. Several loyalty columns are Prisma `Decimal` (`totalSpend`, `threshold`,
 * `pointsMultiplier`, `purchaseAmount`) and serialise as objects, not numbers, unless they
 * are converted here. And a spread is how the old surface came to publish the whole of
 * Contact — allowlisting each field is what keeps a new inbox column from silently becoming
 * part of a public contract.
 */

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null;

type AnyRow = Record<string, unknown>;

export function presentTierRef(tier: AnyRow | null | undefined) {
  if (!tier) return null;
  return { name: String(tier.name ?? ""), color: (tier.color as string | null) ?? null };
}

export function presentMember(account: AnyRow) {
  const contact = (account.contact ?? {}) as AnyRow;
  return {
    name: (contact.name as string | null) ?? null,
    phone: (contact.phone as string | null) ?? null,
    email: (contact.email as string | null) ?? null,
    cardCode: (account.cardCode as string | null) ?? null,
    cardSentAt: iso(account.cardSentAt),
    status: String(account.status ?? "active"),
    referralCode: (account.referralCode as string | null) ?? null,
    points: {
      current: num(account.currentPoints),
      lifetime: num(account.lifetimePoints),
    },
    totalSpend: num(account.totalSpend),
    tier: presentTierRef(account.currentTier as AnyRow | null),
    joinedAt: iso(account.createdAt) ?? new Date(0).toISOString(),
  };
}

export function presentReward(reward: AnyRow, tierNamesById?: Map<string, string>) {
  const stock = reward.stockQuantity as number | null;
  return {
    code: String(reward.code ?? reward.id ?? ""),
    name: String(reward.name ?? ""),
    description: (reward.description as string | null) ?? null,
    pointsCost: num(reward.pointsCost),
    rewardType: String(reward.rewardType ?? ""),
    rewardValue: reward.rewardValue ?? null,
    stockRemaining:
      stock === null || stock === undefined ? null : stock - num(reward.stockRedeemed),
    // Tier ids mean nothing outside RateUp; publish the names.
    availableForTiers: ((reward.availableForTiers as string[] | null) ?? []).map(
      (id) => tierNamesById?.get(id) ?? id,
    ),
  };
}

export function presentTier(tier: AnyRow) {
  return {
    name: String(tier.name ?? ""),
    threshold: num(tier.threshold),
    pointsMultiplier: num(tier.pointsMultiplier),
    color: (tier.color as string | null) ?? null,
    benefitsDescription: (tier.benefitsDescription as string | null) ?? null,
    priority: num(tier.priority),
  };
}

export function presentEarningRule(rule: AnyRow) {
  return {
    name: String(rule.name ?? ""),
    pointsPerUnit: num(rule.pointsPerUnit),
    multiplier: num(rule.multiplier),
    bonusPoints: num(rule.bonusPoints),
    minPurchaseAmount:
      rule.minPurchaseAmount === null || rule.minPurchaseAmount === undefined
        ? null
        : num(rule.minPurchaseAmount),
    maxPurchaseAmount:
      rule.maxPurchaseAmount === null || rule.maxPurchaseAmount === undefined
        ? null
        : num(rule.maxPurchaseAmount),
    validFrom: iso(rule.validFrom),
    validUntil: iso(rule.validUntil),
    isDefault: Boolean(rule.isDefault),
  };
}

export function presentProgram(program: AnyRow) {
  return {
    name: (program.name as string | null) ?? null,
    businessName: (program.businessName as string | null) ?? null,
    status: String(program.status ?? ""),
    currency: {
      name: String(program.currencyName ?? "points"),
      symbol: String(program.currencySymbol ?? ""),
    },
    defaultCountryCode: String(program.defaultCountryCode ?? ""),
    signupBonus: num(program.signupBonus),
    tiersEnabled: Boolean(program.tiersEnabled),
    tierQualificationWindowMonths: (program.tierQualificationWindowMonths as number | null) ?? null,
  };
}

export function presentTransaction(row: AnyRow) {
  const meta = (row.metadata ?? {}) as AnyRow;
  return {
    transactionId: String(row.id ?? ""),
    type: String(row.transactionType ?? ""),
    source: String(row.source ?? ""),
    points: num(row.points),
    balanceAfter: num(row.balanceAfter),
    description: (row.description as string | null) ?? null,
    purchaseAmount:
      row.purchaseAmount === null || row.purchaseAmount === undefined
        ? null
        : num(row.purchaseAmount),
    // `referenceId` is where the order number lives now; metadata is the older shape.
    orderId: (row.referenceId as string | null) ?? (meta.orderId as string | null) ?? null,
    idempotencyKey: (row.idempotencyKey as string | null) ?? null,
    createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export interface VoucherView {
  code: string;
  kind: "redemption" | "issued_reward";
  status: string;
  valid: boolean;
  invalidReason: string | null;
  reward: { code: string | null; name: string; rewardType: string };
  member: ReturnType<typeof presentMember> | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string | null;
}

/** A coupon bought with points. */
export function presentRedemptionVoucher(
  redemption: AnyRow,
  opts: { valid: boolean; invalidReason?: string | null } = { valid: true },
): VoucherView {
  const reward = (redemption.reward ?? {}) as AnyRow;
  const account = redemption.account as AnyRow | undefined;
  return {
    code: String(redemption.redemptionCode ?? ""),
    kind: "redemption",
    status: String(redemption.status ?? ""),
    valid: opts.valid,
    invalidReason: opts.invalidReason ?? null,
    reward: {
      code: (reward.code as string | null) ?? null,
      name: String(reward.name ?? ""),
      rewardType: String(reward.rewardType ?? ""),
    },
    member: account ? presentMember(account) : null,
    expiresAt: iso(redemption.expiresAt),
    usedAt: iso(redemption.usedAt),
    createdAt: iso(redemption.createdAt),
  };
}

/** A gift handed out without spending points. */
export function presentAssignedVoucher(
  assigned: AnyRow,
  opts: { valid: boolean; invalidReason?: string | null } = { valid: true },
): VoucherView {
  const reward = (assigned.reward ?? {}) as AnyRow;
  const account = assigned.account as AnyRow | undefined;
  return {
    code: String(assigned.shortCode ?? ""),
    kind: "issued_reward",
    status: String(assigned.status ?? ""),
    valid: opts.valid,
    invalidReason: opts.invalidReason ?? null,
    reward: {
      code: (reward.code as string | null) ?? null,
      name: String(reward.name ?? ""),
      rewardType: String(reward.rewardType ?? ""),
    },
    member: account ? presentMember(account) : null,
    expiresAt: null,
    usedAt: iso(assigned.redeemedAt),
    createdAt: iso(assigned.assignedAt),
  };
}
