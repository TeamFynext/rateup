import type { TFunction } from "i18next";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import type { OnboardingState, OnboardingStep } from "@/backend/loyalty/onboarding.api";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { formatMoney, formatPoints, singularPoints } from "../giveback/format";

/**
 * The one-line summaries on the Program page's section cards. Rewards has its own page and
 * no card here.
 *
 * Pure so it can be tested: everything it reads is handed in. Each line is the sentence a
 * merchant would read out loud about that part of the programme; the tags carry the
 * things that need chasing.
 */

export type SectionKey = OnboardingStep;

export interface SummaryTag {
  label: string;
  tone: "neutral" | "accent" | "warning" | "success";
}

export interface SectionSummary {
  key: SectionKey;
  title: string;
  caption: string;
  line: string;
  tags: SummaryTag[];
  /** Something on this section needs the merchant's attention. */
  attention?: boolean;
}

export interface SummaryInput {
  t: TFunction;
  state: OnboardingState;
  dashboard: LoyaltyDashboardStats | undefined;
  giveback: GivebackResult;
  /** Loyalty WhatsApp templates still awaiting Meta. */
}

export function buildSectionSummaries({
  t,
  state,
  dashboard,
  giveback,
}: SummaryInput): SectionSummary[] {
  const program = state.program;
  const pointsName = program?.currencyName ?? "Points";
  const point = singularPoints(pointsName);
  const symbol = program?.currencySymbol ?? "₹";
  const code = program?.currencyCode ?? "INR";
  const money = (amount: number) => formatMoney(amount, code, symbol);
  const { rules, tiers } = state.saved;

  /* ── profile ── */
  const basicsParts = [
    t("Points called {points}", { points: pointsName }),
    `${symbol} ${code}`,
    program?.averageOrderValue != null
      ? t("{spend} a visit", { spend: money(Number(program.averageOrderValue)) })
      : t("typical spend not set"),
    program?.logoUrl ? t("logo set") : t("no logo yet"),
  ];
  if (program?.timezone) basicsParts.push(program.timezone);

  /* ── earning ── */
  const active = rules.filter((r) => r.status !== "inactive");
  const defaultRule = active.find((r) => r.isDefault) ?? active[0];
  const extras = active.filter((r) => r !== defaultRule);
  const offCount = rules.length - active.length;
  const perOrder = giveback.pointsPerOrder;
  const earningLine = defaultRule
    ? perOrder !== null
      ? t("{rate} per {symbol}1 spent — about {perOrder} a visit", {
          rate: formatPoints(
            Number(defaultRule.pointsPerUnit) * Number(defaultRule.multiplier),
            point,
          ),
          symbol,
          perOrder: formatPoints(Math.floor(perOrder), pointsName),
        })
      : t("{rate} per {symbol}1 spent", {
          rate: formatPoints(
            Number(defaultRule.pointsPerUnit) * Number(defaultRule.multiplier),
            point,
          ),
          symbol,
        })
    : t("No default rule — customers earn nothing yet");
  const earningTags: SummaryTag[] = extras.map((rule) => ({
    label:
      Number(rule.multiplier) !== 1
        ? `${rule.name} · ${Number(rule.multiplier)}×`
        : (rule.bonusPoints ?? 0) > 0
          ? `${rule.name} · +${rule.bonusPoints} ${t("flat")}`
          : rule.name,
    tone: "neutral",
  }));
  if (offCount > 0) {
    earningTags.push({
      label: t("{count} rule off", { count: offCount }),
      tone: "warning",
    });
  }

  /* ── tiers ── */
  const tiersOn = program?.tiersEnabled ?? true;
  const tierSplit = dashboard?.tierDistribution.filter((tier) => tier.id !== null) ?? [];
  const tiersLine = !tiersOn
    ? t("Everyone earns the base rate")
    : tierSplit.length
      ? tierSplit.map((tier) => `${tier.name} ${tier.value.toLocaleString()}`).join(" · ")
      : tiers.length
        ? tiers
            .map(
              (tier) =>
                `${tier.name} · ${money(Number(tier.threshold))} · ${Number(tier.pointsMultiplier)}×`,
            )
            .join(" · ")
        : t("No tiers yet");

  return [
    {
      key: "profile",
      title: t("Profile"),
      caption: t("Name, brand, contact, hours"),
      line: basicsParts.join(" · "),
      tags: [],
    },
    {
      key: "earning",
      title: t("Earning"),
      caption: t("How {points} are given out", { points: pointsName }),
      line: earningLine,
      tags: earningTags,
      attention: !defaultRule,
    },
    {
      key: "tiers",
      title: t("Tiers"),
      caption: tiersOn
        ? t("On · {count} tiers", { count: tiers.length })
        : t("Off · one flat rate"),
      line: tiersLine,
      tags: [],
    },
  ];
}
