function getSampleSubscriptionFeatures(count: number): SubscriptionFeatures {
  return {
    team: {
      count: { max: count },
      teamMember: { count: { max: count }, active: true },
      active: true,
    },
    webSurvey: {
      count: { monthlyResponseLimit: 1000 },
      active: true,
      encryption: { active: true },
      googleReview: { active: true },
      emailNotification: { active: true },
      htmlCodePage: { active: true },
      webhook: {
        active: false,
      },
    },
    whatsapp: {
      active: true,
      activeContacts: { active: true, count: { max: 1000 } },
      campaignCredits: { active: true, count: { max: 5000 } },
    },
    ai: {
      count: { completionTokens: 12000, promptTokens: 120000 },
      active: false,
    },
  };
}
export const SampleSubscriptionFeatures = getSampleSubscriptionFeatures(10);

// TODO: check if Math.infinity is a good idea or use null value for unlimited
export const UnlimitedAccess = getSampleSubscriptionFeatures(10000);

export function getFreeSubscriptionFeatures(
  overrides?: Partial<SubscriptionFeatures>,
): SubscriptionFeatures {
  const base = {
    team: {
      count: { max: 1 },
      teamMember: { count: { max: 1 }, active: true },
      active: true,
    },
    webSurvey: {
      count: { monthlyResponseLimit: 100 },
      active: true,
      encryption: { active: false },
      googleReview: { active: false },
      emailNotification: { active: false },
      htmlCodePage: { active: false },
      webhook: {
        active: false,
      },
    },
    whatsapp: {
      active: true,
      activeContacts: { active: true, count: { max: 100 } },
      // Campaigns are open on Free so a free account can see what it would upgrade for;
      // the credit allowance is the throttle rather than the gate.
      campaignCredits: { active: true, count: { max: 500 } },
      campaign: { active: true },
      loyalty: { active: false },
      referrals: { active: false },
      // The shop (Commerce) is open on Free; selling is how a free account grows into a paid one.
      catalog: { active: true },
    },
    ai: { count: { completionTokens: 0, promptTokens: 0 }, active: false },
  };

  return {
    ...base,
    ...overrides,
  };
}

export const FreePlanSubscriptionFeatures = getFreeSubscriptionFeatures();

/**
 * The paid tiers. Every tier gets the full inbox, automations, templates, flows,
 * chatbots, campaigns, loyalty and the Meta Business Agent; they differ only by counts.
 *
 * Rateup does not resell messages or AI: Meta bills the customer's own WABA for both, so
 * the allowances here (active contacts, campaign credits) only decide which tier an org
 * needs. AI token counts are bookkeeping; nothing enforces them.
 */
function getPaidSubscriptionFeatures({
  teams,
  users,
  activeContacts,
  campaignCredits,
  formSubmissions,
}: {
  teams: number;
  users: number;
  activeContacts: number;
  campaignCredits: number;
  formSubmissions: number;
}): SubscriptionFeatures {
  return {
    team: {
      count: { max: teams },
      teamMember: { count: { max: users }, active: true },
      active: true,
    },
    webSurvey: {
      count: { monthlyResponseLimit: formSubmissions },
      active: true,
      encryption: { active: true },
      googleReview: { active: true },
      emailNotification: { active: true },
      htmlCodePage: { active: true },
      webhook: { active: true },
    },
    whatsapp: {
      active: true,
      activeContacts: { active: true, count: { max: activeContacts } },
      campaignCredits: { active: true, count: { max: campaignCredits } },
      campaign: { active: true },
      loyalty: { active: true },
      referrals: { active: true },
      catalog: { active: true },
    },
    ai: { count: { completionTokens: 0, promptTokens: 0 }, active: true },
  };
}

/**
 * The paid ladder: Starter (PLUS) → Growth (PRO) → Scale (MAX). Each step is about 5x
 * the allowance for about 3x the price, so upgrading beats stacking packs.
 */
export function getPlusSubscriptionFeatures(
  overrides?: Partial<SubscriptionFeatures>,
): SubscriptionFeatures {
  return {
    ...getPaidSubscriptionFeatures({
      teams: 2,
      users: 5,
      activeContacts: 1_000,
      campaignCredits: 10_000,
      formSubmissions: 5_000,
    }),
    ...overrides,
  };
}

export function getProSubscriptionFeatures(
  overrides?: Partial<SubscriptionFeatures>,
): SubscriptionFeatures {
  return {
    ...getPaidSubscriptionFeatures({
      teams: 5,
      users: 15,
      activeContacts: 5_000,
      campaignCredits: 50_000,
      formSubmissions: 20_000,
    }),
    ...overrides,
  };
}

export function getMaxSubscriptionFeatures(
  overrides?: Partial<SubscriptionFeatures>,
): SubscriptionFeatures {
  return {
    ...getPaidSubscriptionFeatures({
      teams: 15,
      users: 50,
      activeContacts: 25_000,
      campaignCredits: 250_000,
      formSubmissions: 50_000,
    }),
    ...overrides,
  };
}

/**
 * Enterprise is sales-led with contracted terms, so every count is effectively
 * unlimited. UNLIMITED_COUNT follows the existing sentinel convention (a large
 * number rather than null/Infinity) so every `>= max` comparison keeps working.
 */
export const UNLIMITED_COUNT = 10_000_000;

/**
 * Whether an allowance should be treated as uncapped rather than as a very large cap.
 *
 * Enterprise is invoiced on the usage it actually runs, so its figure is a sentinel, not
 * a ceiling anyone should be measured against — a contracted customer must never have a
 * send refused because a placeholder ran out.
 *
 * The comparison is against UNLIMITED_COUNT itself rather than a lower round number, and
 * that is load-bearing: any threshold below it is a trap for whoever next raises a paid
 * tier's limit. A Max plan bumped to the threshold would silently stop being metered —
 * no enforcement, no warning, no banner, and nothing failing to say so. `paid tiers stay
 * below the unlimited sentinel` in subscription.data.test.ts holds that line, so the
 * mistake surfaces as a failing test rather than as unmetered usage in production.
 */
export function isUnlimitedAllowance(max: number | null | undefined): boolean {
  return (max ?? 0) >= UNLIMITED_COUNT;
}

export function getEnterpriseSubscriptionFeatures(
  overrides?: Partial<SubscriptionFeatures>,
): SubscriptionFeatures {
  return {
    ...getPaidSubscriptionFeatures({
      teams: UNLIMITED_COUNT,
      users: UNLIMITED_COUNT,
      activeContacts: UNLIMITED_COUNT,
      campaignCredits: UNLIMITED_COUNT,
      formSubmissions: UNLIMITED_COUNT,
    }),
    ...overrides,
  };
}

/**
 * The allowances a contract can cap, as paths into the features blob.
 *
 * Enterprise ships every one of these as the unlimited sentinel; a negotiated deal caps
 * some of them. They are listed rather than walked so that a new count added to the blob
 * is an explicit decision here, not something silently treated as contractable.
 */
const CONTRACTABLE_ALLOWANCES = [
  ["whatsapp", "activeContacts", "count", "max"],
  ["whatsapp", "campaignCredits", "count", "max"],
  ["webSurvey", "count", "monthlyResponseLimit"],
  ["team", "count", "max"],
  ["team", "teamMember", "count", "max"],
] as const;

function readPath(source: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (node, key) =>
      typeof node === "object" && node !== null
        ? (node as Record<string, unknown>)[key]
        : undefined,
    source,
  );
}

function writePath(target: Record<string, unknown>, path: readonly string[], value: unknown) {
  let node = target;
  for (const key of path.slice(0, -1)) {
    const next = node[key];
    node[key] = typeof next === "object" && next !== null ? { ...(next as object) } : {};
    node = node[key] as Record<string, unknown>;
  }
  node[path[path.length - 1]] = value;
}

/**
 * Whether an org carries a contracted cap: a real number where its tier is uncapped.
 *
 * Only Enterprise can be in this state. Nothing writes a lower allowance onto an
 * unlimited tier by accident — the catalog hands out the sentinel — so a number there is
 * always someone having agreed a ceiling with the customer.
 */
export function hasContractedCap(tier: unknown, stored: unknown): boolean {
  return CONTRACTABLE_ALLOWANCES.some((path) => {
    const tierMax = readPath(tier, path);
    const orgMax = readPath(stored, path);
    return (
      typeof tierMax === "number" &&
      isUnlimitedAllowance(tierMax) &&
      typeof orgMax === "number" &&
      !isUnlimitedAllowance(orgMax) &&
      orgMax > 0
    );
  });
}

/**
 * The tier's features with the org's contracted caps kept.
 *
 * Enterprise is unlimited by default, but a deal can put a ceiling on an individual
 * account, and that ceiling is stored on the subscription because it belongs to that
 * customer rather than to the tier. Anything that re-applies the catalog therefore has to
 * carry it across, or a routine refresh would hand a capped account unlimited volume back
 * and nothing would say so. Everything else — feature gates, the copy, the counts the
 * contract did not touch — still comes from the tier.
 */
export function withContractedCaps<T>(tier: T, stored: unknown): T {
  const next = structuredClone(tier) as Record<string, unknown>;

  for (const path of CONTRACTABLE_ALLOWANCES) {
    const tierMax = readPath(tier, path);
    const orgMax = readPath(stored, path);
    if (
      typeof tierMax === "number" &&
      isUnlimitedAllowance(tierMax) &&
      typeof orgMax === "number" &&
      !isUnlimitedAllowance(orgMax) &&
      orgMax > 0
    ) {
      writePath(next, path, orgMax);
    }
  }

  return next as T;
}
