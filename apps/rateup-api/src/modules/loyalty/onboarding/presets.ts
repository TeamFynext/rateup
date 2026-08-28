import { LoyaltyEventType, LoyaltyTemplateTypes } from "../../../types/enums.js";
import { LoyaltyPointRewardSubType, LoyaltyRewardType } from "../../../types/loyalty.js";
import type { TierConfiguration } from "../../../types/loyalty.js";
import { LoyaltyRewardStatus } from "../rewards/reward.schema.js";

/**
 * Business-type starter packs for the guided setup wizard. Each pack is a complete,
 * coherent loyalty programme the user can accept wholesale or edit step by step.
 *
 * These live on the server, not in the UI, so the wizard's preview and the rows it
 * actually writes can never drift apart.
 */

export const LOYALTY_PRESET_KEYS = ["cafe", "retail", "salon", "gym", "generic"] as const;

export type LoyaltyPresetKey = (typeof LOYALTY_PRESET_KEYS)[number];

export interface PresetEarningRule {
  name: string;
  description: string;
  pointsPerUnit: number;
  multiplier?: number;
  bonusPoints?: number;
  allowedDays?: string[];
  isDefault: boolean;
  priority: number;
}

export interface PresetReward {
  name: string;
  description: string;
  pointsCost: number;
  rewardType: LoyaltyRewardType;
  /**
   * Must be a valid `LoyaltyRewardValue` — the discriminated union in
   * `rewards/reward.schema.ts`. An empty object passes the schema's permissive
   * `z.record` fallback but leaves the reward unredeemable.
   */
  rewardValue: Record<string, unknown>;
}

/**
 * An inbound keyword the customer texts, answered with plain text — no Meta template
 * approval needed, so these work the moment the programme is activated.
 *
 * Only the five types the inbound switch in `settings.service.ts` actually dispatches
 * are listed here; the remaining `LoyaltyTemplateTypes` members name outbound
 * notifications and would be dead config as commands.
 *
 * `text` placeholders are positional and type-specific:
 *   PointInformation  {{1}} current points, {{2}} points redeemed, {{3}} lifetime points
 *   Referral          {{1}} referral code,  {{2}} join link
 *   CustomerRemoval / CustomerRegistration / RewardsIssued  take no variables
 */
export interface PresetCommand {
  type: LoyaltyTemplateTypes;
  requestMessage: string;
  text: string;
}

/**
 * An outbound notification. These become real Meta templates and must be approved
 * before they can send, so the wizard submits them and moves on.
 *
 * `params` documents the positional variables `loyaltyWaDispatcher.ts` supplies for
 * that event — the body text must use exactly that many `{{n}}` placeholders.
 */
export interface PresetEventTemplate {
  eventType: LoyaltyEventType;
  templateName: string;
  body: string;
  params: string[];
}

export interface LoyaltyPreset {
  key: LoyaltyPresetKey;
  label: string;
  description: string;
  /** Lowercased `Org.onboarding.industry` values that should preselect this pack. */
  matchIndustries: string[];
  basics: {
    currencyName: string;
    signupBonus: number;
    referralBonus: number;
    refereeBonus: number;
  };
  earningRules: PresetEarningRule[];
  tiersEnabled: boolean;
  tiers: TierConfiguration[];
  rewards: PresetReward[];
  commands: PresetCommand[];
  eventTemplates: PresetEventTemplate[];
}

const WEEKEND = ["saturday", "sunday"];

/**
 * Shared across every pack: the variable contracts are fixed by the dispatcher and the
 * inbound handlers, so only the wording differs per business and that is not worth
 * five near-identical copies.
 */
function commonCommands(programNoun: string): PresetCommand[] {
  return [
    {
      type: LoyaltyTemplateTypes.CustomerRegistration,
      requestMessage: "join",
      text: `Welcome to our ${programNoun}! You're all set — reply POINTS any time to check your balance.`,
    },
    {
      type: LoyaltyTemplateTypes.PointInformation,
      requestMessage: "points",
      text: "You have {{1}} points available.\nRedeemed so far: {{2}}\nEarned all time: {{3}}",
    },
    {
      type: LoyaltyTemplateTypes.RewardsIssued,
      requestMessage: "rewards",
      text: "Here's what you can redeem right now:",
    },
    {
      type: LoyaltyTemplateTypes.Referral,
      requestMessage: "refer",
      text: "Share the love! Your referral code is {{1}}.\nSend a friend this link: {{2}}",
    },
    {
      type: LoyaltyTemplateTypes.CustomerRemoval,
      requestMessage: "stop",
      text: "You've been removed from our loyalty programme. Reply JOIN any time to come back.",
    },
  ];
}

function commonEventTemplates(): PresetEventTemplate[] {
  return [
    {
      eventType: LoyaltyEventType.POINTS_ISSUED,
      templateName: "loyalty_points_issued",
      body: "Hi {{1}}, you just earned {{2}} points. Your balance is now {{3}}.",
      params: ["customer name", "points earned", "balance after"],
    },
    {
      eventType: LoyaltyEventType.REWARD_REDEEMED,
      templateName: "loyalty_reward_redeemed",
      body: "Hi {{1}}, your reward {{2}} is confirmed. Show code {{3}} to redeem it. ({{4}} points used)",
      params: ["customer name", "reward name", "redemption code", "points spent"],
    },
    {
      eventType: LoyaltyEventType.TIER_UPGRADED,
      templateName: "loyalty_tier_upgraded",
      body: "Congratulations {{1}} — you've reached {{2}}! Enjoy your new benefits.",
      params: ["customer name", "new tier"],
    },
    {
      eventType: LoyaltyEventType.BIRTHDAY,
      templateName: "loyalty_birthday",
      body: "Happy birthday, {{1}}! Here's a little something from us — drop in and enjoy.",
      params: ["customer name"],
    },
  ];
}

/**
 * Tier thresholds and point costs are expressed in the programme's own currency and are
 * NOT converted when the user picks a different one — a pack tuned for one currency will
 * read oddly in another, which is why every number stays editable in the wizard.
 */
export const LOYALTY_PRESETS: Record<LoyaltyPresetKey, LoyaltyPreset> = {
  cafe: {
    key: "cafe",
    label: "Cafe & Restaurant",
    description:
      "Frequent small purchases. Rewards land quickly to keep people coming back, with a weekend bonus to fill quieter shifts.",
    matchIndustries: ["cafe", "restaurant", "food", "food & beverage", "bakery", "coffee"],
    basics: { currencyName: "Beans", signupBonus: 50, referralBonus: 100, refereeBonus: 50 },
    earningRules: [
      {
        name: "Standard Earning",
        description: "1 bean for every unit spent.",
        pointsPerUnit: 1,
        isDefault: true,
        priority: 0,
      },
      {
        name: "Weekend Double Beans",
        description: "Double beans on Saturdays and Sundays.",
        pointsPerUnit: 1,
        multiplier: 2,
        allowedDays: WEEKEND,
        isDefault: false,
        priority: 10,
      },
    ],
    tiersEnabled: true,
    tiers: [
      {
        name: "Regular",
        threshold: 0,
        multiplier: 1,
        color: "#CD7F32",
        benefits_description: "Earn beans on every order",
      },
      {
        name: "Local",
        threshold: 2500,
        multiplier: 1.25,
        color: "#94A3B8",
        benefits_description: "25% more beans, plus early access to seasonal drinks",
      },
      {
        name: "Insider",
        threshold: 10000,
        multiplier: 1.5,
        color: "#EAB308",
        benefits_description: "50% more beans, free birthday treat, priority ordering",
      },
    ],
    rewards: [
      {
        name: "Free Coffee",
        description: "Any regular hot drink, on the house.",
        pointsCost: 100,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.FREE_ITEM,
          item_name: "Regular hot drink",
          quantity: 1,
        },
      },
      {
        name: "Free Pastry",
        description: "Pick any pastry from the counter.",
        pointsCost: 150,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.FREE_ITEM,
          item_name: "Pastry",
          quantity: 1,
        },
      },
      {
        name: "10% Off Your Bill",
        description: "10% off your next visit.",
        pointsCost: 250,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 10,
          max_discount_amount: null,
        },
      },
    ],
    commands: commonCommands("coffee club"),
    eventTemplates: commonEventTemplates(),
  },

  retail: {
    key: "retail",
    label: "Retail & Store",
    description:
      "Larger, less frequent baskets. A slower earn rate with higher-value rewards, and tiers that recognise annual spend.",
    matchIndustries: ["retail", "store", "ecommerce", "e-commerce", "shop", "fashion", "grocery"],
    basics: { currencyName: "Points", signupBonus: 100, referralBonus: 250, refereeBonus: 100 },
    earningRules: [
      {
        name: "Standard Earning",
        description: "1 point for every unit spent.",
        pointsPerUnit: 1,
        isDefault: true,
        priority: 0,
      },
    ],
    tiersEnabled: true,
    tiers: [
      {
        name: "Bronze",
        threshold: 0,
        multiplier: 1,
        color: "#CD7F32",
        benefits_description: "Earn points on every purchase",
      },
      {
        name: "Silver",
        threshold: 10000,
        multiplier: 1.25,
        color: "#94A3B8",
        benefits_description: "25% more points and early access to sales",
      },
      {
        name: "Gold",
        threshold: 30000,
        multiplier: 1.5,
        color: "#EAB308",
        benefits_description: "50% more points, free returns, birthday reward",
      },
      {
        name: "Platinum",
        threshold: 75000,
        multiplier: 2,
        color: "#CBD5E1",
        benefits_description: "Double points, dedicated support, exclusive drops",
      },
    ],
    rewards: [
      {
        name: "Cash Off Your Order",
        description: "A flat discount on your next order.",
        pointsCost: 500,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: { type: LoyaltyPointRewardSubType.DISCOUNT_FIXED, amount: 500 },
      },
      {
        name: "10% Off",
        description: "10% off your next purchase.",
        pointsCost: 750,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 10,
          max_discount_amount: null,
        },
      },
      {
        name: "20% Off",
        description: "20% off your next purchase.",
        pointsCost: 1500,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 20,
          max_discount_amount: null,
        },
      },
    ],
    commands: commonCommands("rewards programme"),
    eventTemplates: commonEventTemplates(),
  },

  salon: {
    key: "salon",
    label: "Salon & Spa",
    description:
      "Appointment-based, high value per visit. Rewards are services rather than discounts, which protects your margin.",
    matchIndustries: ["salon", "spa", "beauty", "barber", "wellness", "nails"],
    basics: { currencyName: "Points", signupBonus: 100, referralBonus: 300, refereeBonus: 150 },
    earningRules: [
      {
        name: "Standard Earning",
        description: "1 point for every unit spent on services and products.",
        pointsPerUnit: 1,
        isDefault: true,
        priority: 0,
      },
      {
        name: "Midweek Bonus",
        description: "Double points on quieter midweek appointments.",
        pointsPerUnit: 1,
        multiplier: 2,
        allowedDays: ["tuesday", "wednesday"],
        isDefault: false,
        priority: 10,
      },
    ],
    tiersEnabled: true,
    tiers: [
      {
        name: "Guest",
        threshold: 0,
        multiplier: 1,
        color: "#CD7F32",
        benefits_description: "Earn points on every appointment",
      },
      {
        name: "Regular",
        threshold: 15000,
        multiplier: 1.25,
        color: "#94A3B8",
        benefits_description: "25% more points and priority booking",
      },
      {
        name: "VIP",
        threshold: 40000,
        multiplier: 1.5,
        color: "#EAB308",
        benefits_description: "50% more points, complimentary birthday treatment",
      },
    ],
    rewards: [
      {
        name: "Complimentary Add-On",
        description: "A free add-on treatment with your next appointment.",
        pointsCost: 500,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.FREE_ITEM,
          item_name: "Add-on treatment",
          quantity: 1,
        },
      },
      {
        name: "15% Off Any Service",
        description: "15% off a single service.",
        pointsCost: 1000,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 15,
          max_discount_amount: null,
        },
      },
      {
        name: "Free Signature Treatment",
        description: "One signature treatment, on us.",
        pointsCost: 3000,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.FREE_ITEM,
          item_name: "Signature treatment",
          quantity: 1,
        },
      },
    ],
    commands: commonCommands("loyalty club"),
    eventTemplates: commonEventTemplates(),
  },

  gym: {
    key: "gym",
    label: "Gym & Fitness",
    description:
      "Membership-led, so the programme rewards showing up rather than spending. Referrals are weighted heavily.",
    matchIndustries: ["gym", "fitness", "sports", "yoga", "studio", "health"],
    basics: { currencyName: "Points", signupBonus: 200, referralBonus: 500, refereeBonus: 200 },
    earningRules: [
      {
        name: "Standard Earning",
        description: "1 point for every unit spent on membership and extras.",
        pointsPerUnit: 1,
        isDefault: true,
        priority: 0,
      },
      {
        name: "Check-In Bonus",
        description: "A flat bonus every time a visit is recorded.",
        pointsPerUnit: 0,
        bonusPoints: 10,
        isDefault: false,
        priority: 10,
      },
    ],
    tiersEnabled: true,
    tiers: [
      {
        name: "Starter",
        threshold: 0,
        multiplier: 1,
        color: "#CD7F32",
        benefits_description: "Earn points on membership and classes",
      },
      {
        name: "Committed",
        threshold: 12000,
        multiplier: 1.25,
        color: "#94A3B8",
        benefits_description: "25% more points and a free guest pass each month",
      },
      {
        name: "Elite",
        threshold: 36000,
        multiplier: 1.5,
        color: "#EAB308",
        benefits_description: "50% more points, free PT session, priority class booking",
      },
    ],
    rewards: [
      {
        name: "Guest Day Pass",
        description: "Bring a friend in for the day.",
        pointsCost: 300,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.FREE_ITEM,
          item_name: "Guest day pass",
          quantity: 1,
        },
      },
      {
        name: "Free Personal Training Session",
        description: "One session with a trainer.",
        pointsCost: 1500,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.FREE_ITEM,
          item_name: "Personal training session",
          quantity: 1,
        },
      },
      {
        name: "10% Off Membership Renewal",
        description: "10% off your next renewal.",
        pointsCost: 2500,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 10,
          max_discount_amount: null,
        },
      },
    ],
    commands: commonCommands("member rewards"),
    eventTemplates: commonEventTemplates(),
  },

  generic: {
    key: "generic",
    label: "Something else",
    description:
      "A straightforward starting point: earn one point per unit spent, three tiers, and a simple discount ladder. Edit anything that doesn't fit.",
    matchIndustries: [],
    basics: { currencyName: "Points", signupBonus: 100, referralBonus: 200, refereeBonus: 100 },
    earningRules: [
      {
        name: "Standard Earning",
        description: "1 point for every unit spent.",
        pointsPerUnit: 1,
        isDefault: true,
        priority: 0,
      },
    ],
    tiersEnabled: true,
    tiers: [
      {
        name: "Bronze",
        threshold: 0,
        multiplier: 1,
        color: "#CD7F32",
        benefits_description: "Earn points on every purchase",
      },
      {
        name: "Silver",
        threshold: 5000,
        multiplier: 1.25,
        color: "#94A3B8",
        benefits_description: "25% more points on everything",
      },
      {
        name: "Gold",
        threshold: 15000,
        multiplier: 1.5,
        color: "#EAB308",
        benefits_description: "50% more points and a birthday reward",
      },
    ],
    rewards: [
      {
        name: "5% Off",
        description: "5% off your next purchase.",
        pointsCost: 250,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 5,
          max_discount_amount: null,
        },
      },
      {
        name: "10% Off",
        description: "10% off your next purchase.",
        pointsCost: 500,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 10,
          max_discount_amount: null,
        },
      },
      {
        name: "20% Off",
        description: "20% off your next purchase.",
        pointsCost: 1000,
        rewardType: LoyaltyRewardType.POINT,
        rewardValue: {
          type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE,
          percentage: 20,
          max_discount_amount: null,
        },
      },
    ],
    commands: commonCommands("loyalty programme"),
    eventTemplates: commonEventTemplates(),
  },
};

/** Rewards are written as ACTIVE — the casing every loyalty read path filters on. */
export const PRESET_REWARD_STATUS = LoyaltyRewardStatus.ACTIVE;

export function isLoyaltyPresetKey(value: string): value is LoyaltyPresetKey {
  return (LOYALTY_PRESET_KEYS as readonly string[]).includes(value);
}

/**
 * Picks the pack whose `matchIndustries` covers the org's self-reported industry.
 * That value lives in the `Org.onboarding` JSON blob (written by the signup wizard),
 * is free text, and is frequently absent — so this only ever suggests a default the
 * user can override, and falls back to the generic pack.
 */
export function suggestPresetKey(industry: unknown): LoyaltyPresetKey {
  if (typeof industry !== "string") return "generic";
  const needle = industry.trim().toLowerCase();
  if (!needle) return "generic";

  for (const key of LOYALTY_PRESET_KEYS) {
    const preset = LOYALTY_PRESETS[key];
    if (preset.matchIndustries.some((m) => needle === m || needle.includes(m))) {
      return key;
    }
  }
  return "generic";
}
