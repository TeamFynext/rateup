import { formatMoney, formatPoints } from "../giveback/format.ts";

/**
 * The welcome reply, written from the programme the merchant just built.
 *
 * The Messages step is the last one before review, so by the time it mounts the earning
 * rules and the rewards are already saved. Seeding the join reply from them beats the
 * preset's generic sentence: the customer is told the actual earn rate and the actual
 * rewards, and the merchant sees their own numbers read back in plain English.
 *
 * English, deliberately — the preset replies this sits beside come from the API in English
 * too, and a half-translated set of five replies would read worse than a consistent one.
 * It is seed text: the merchant edits it in the step, in their own words.
 */

/** How many conditional rules and rewards make it into the message before it gets long. */
const MAX_EXTRA_RULES = 2;
const MAX_REWARDS = 4;

export interface JoinMessageEarningRule {
  name: string;
  status?: "active" | "inactive";
  pointsPerUnit: number;
  multiplier: number;
  bonusPoints: number;
  allowedDays: string[];
  minPurchaseAmount?: number;
  isDefault: boolean;
}

export interface JoinMessageReward {
  name: string;
  pointsCost: number;
}

export interface JoinMessageInput {
  programName: string;
  pointsName: string;
  currencySymbol: string;
  currencyCode: string;
  /** Points paid for signing up, from the Rewards step. 0 means none. */
  signupBonus: number;
  rules: JoinMessageEarningRule[];
  rewards: JoinMessageReward[];
  /** The keyword that checks a balance, so the closing line names the real one. */
  balanceKeyword: string;
}

export function buildJoinReplyText(input: JoinMessageInput): string {
  const blocks: string[] = [`Welcome to ${input.programName}! 🎉 You're in.`];

  const earning = earningLines(input);
  if (earning.length > 0) {
    blocks.push(["How you earn:", ...earning.map(bullet)].join("\n"));
  }

  const rewards = rewardLines(input);
  if (rewards.length > 0) {
    blocks.push(
      [`What you can get with your ${input.pointsName}:`, ...rewards.map(bullet)].join("\n"),
    );
  }

  const keyword = input.balanceKeyword.trim().toUpperCase();
  if (keyword) {
    blocks.push(`Reply ${keyword} any time to check your balance.`);
  }

  return blocks.join("\n\n");
}

function bullet(line: string): string {
  return `• ${line}`;
}

function earningLines(input: JoinMessageInput): string[] {
  const { pointsName, currencyCode, currencySymbol, signupBonus } = input;
  const active = input.rules.filter((rule) => rule.status !== "inactive");
  // The default rule is the one that applies to an ordinary purchase; the rest are
  // conditional and only make sense described against it.
  const base = active.find((rule) => rule.isDefault) ?? active[0];
  const oneUnit = formatMoney(1, currencyCode, currencySymbol);
  const lines: string[] = [];

  if (base) {
    const rate = effectiveRate(base);
    if (rate > 0) {
      lines.push(`${formatPoints(rate, pointsName)} for every ${oneUnit} you spend`);
    }
    if (base.bonusPoints > 0) {
      lines.push(`${formatPoints(base.bonusPoints, pointsName)} on every visit`);
    }
  }

  let extras = 0;
  for (const rule of active) {
    if (rule === base || extras >= MAX_EXTRA_RULES) continue;
    const line = describeExtraRule(rule, base, input);
    if (!line) continue;
    lines.push(line);
    extras += 1;
  }

  if (signupBonus > 0) {
    lines.push(`${formatPoints(signupBonus, pointsName)} to start you off`);
  }

  return lines;
}

/**
 * What a conditional rule adds, relative to the base rate — "2× Points on Sat and Sun"
 * rather than a second absolute rate the customer has to compare for themselves.
 */
function describeExtraRule(
  rule: JoinMessageEarningRule,
  base: JoinMessageEarningRule | undefined,
  { pointsName, currencyCode, currencySymbol }: JoinMessageInput,
): string | null {
  const rate = effectiveRate(rule);
  const baseRate = base ? effectiveRate(base) : 0;
  const parts: string[] = [];

  if (rate > 0 && baseRate > 0 && rate !== baseRate) {
    const times = round2(rate / baseRate);
    parts.push(
      times > 1
        ? `${times}× ${pointsName}`
        : `${formatPoints(rate, pointsName)} per ${formatMoney(1, currencyCode, currencySymbol)}`,
    );
  } else if (rate > 0 && baseRate === 0) {
    parts.push(
      `${formatPoints(rate, pointsName)} per ${formatMoney(1, currencyCode, currencySymbol)}`,
    );
  }

  if (rule.bonusPoints > 0) {
    parts.push(`${formatPoints(rule.bonusPoints, pointsName)} extra`);
  }

  // A rule that changes nothing the customer would notice is not worth a line.
  if (parts.length === 0) return null;

  const conditions: string[] = [];
  if (rule.allowedDays.length > 0 && rule.allowedDays.length < 7) {
    conditions.push(`on ${describeDays(rule.allowedDays)}`);
  }
  if (rule.minPurchaseAmount && rule.minPurchaseAmount > 0) {
    conditions.push(
      `on orders over ${formatMoney(rule.minPurchaseAmount, currencyCode, currencySymbol)}`,
    );
  }

  return [parts.join(" and "), ...conditions].join(" ");
}

function rewardLines(input: JoinMessageInput): string[] {
  // Cheapest first: the reward a new member could actually reach is the one worth naming.
  const sorted = [...input.rewards].sort((a, b) => a.pointsCost - b.pointsCost);
  const shown = sorted.slice(0, MAX_REWARDS);
  const lines = shown.map(
    (reward) => `${reward.name} — ${formatPoints(reward.pointsCost, input.pointsName)}`,
  );

  const rest = sorted.length - shown.length;
  if (rest > 0) lines.push(`…and ${rest} more`);
  return lines;
}

/** Points per currency unit once the rule's own multiplier is applied. */
function effectiveRate(rule: JoinMessageEarningRule): number {
  return round2(rule.pointsPerUnit * (rule.multiplier > 0 ? rule.multiplier : 1));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Day codes as the API stores them, in week order whatever order they were picked in. */
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function describeDays(days: string[]): string {
  const labels = DAY_ORDER.filter((day) => days.includes(day)).map((day) => DAY_LABELS[day]);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
