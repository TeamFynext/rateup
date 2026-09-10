import type { TFunction } from "i18next";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import type { OnboardingState } from "@/backend/loyalty/onboarding.api";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { formatPoints } from "../giveback/format";
import { roundNice } from "../giveback/suggestPointsCost";
import { LOYALTY_PATHS } from "../paths.ts";
import type { ProgramProgress } from "../program/programProgress.ts";
import type { ProgramState } from "../program/programState.ts";

/**
 * "What to do next" on the Overview: a handful of rule-based nudges, each naming the
 * number that triggered it and linking into the page where it is fixed. Pure, so it is
 * tested on fixtures rather than eyeballed.
 */

export type SuggestionTarget =
  | {
      to: typeof LOYALTY_PATHS.program;
      search: { section: "profile" | "earning" | "tiers" | "rewards" | "messages" };
    }
  | { to: typeof LOYALTY_PATHS.messages; search: { tab: "automatic" | "replies" | "templates" } }
  | { to: typeof LOYALTY_PATHS.settings }
  | { to: typeof LOYALTY_PATHS.onboarding };

export interface Suggestion {
  id: string;
  /** 1 = blocks the programme, 2 = money on the table, 3 = tidy-up. */
  severity: 1 | 2 | 3;
  title: string;
  body: string;
  cta: string;
  target: SuggestionTarget;
}

export interface SuggestionInput {
  t: TFunction;
  programState: ProgramState;
  pointsName: string;
  state: OnboardingState;
  dashboard: LoyaltyDashboardStats | undefined;
  giveback: GivebackResult;
  progress: ProgramProgress;
  templatesPending: number;
  hasWhatsappChannel: boolean;
}

const MAX_SUGGESTIONS = 3;

export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  const { t, programState, pointsName, state, dashboard, giveback, progress, templatesPending } =
    input;
  const out: Suggestion[] = [];
  const live = programState !== "draft";
  const rules = state.saved.rules.filter((r) => r.status !== "inactive");
  const liveRewards = state.saved.rewards.filter((r) => !r.status || r.status === "ACTIVE");

  if (!input.hasWhatsappChannel) {
    out.push({
      id: "wa_not_connected",
      severity: 1,
      title: t("WhatsApp is not connected"),
      body: t(
        "{points} still work — customers just won't be told about them until a channel is connected.",
        { points: pointsName },
      ),
      cta: t("Connect WhatsApp in Settings"),
      target: { to: LOYALTY_PATHS.settings },
    });
  }

  if (live && !rules.some((r) => r.isDefault)) {
    out.push({
      id: "no_default_rule",
      severity: 1,
      title: t("Customers earn nothing right now"),
      body: t("There is no default earning rule, so a purchase awards no {points}.", {
        points: pointsName,
      }),
      cta: t("Open Program › Earning"),
      target: { to: LOYALTY_PATHS.program, search: { section: "earning" } },
    });
  }

  if (!live && !progress.steps.find((s) => s.id === "messages")?.done) {
    out.push({
      id: "draft_messages",
      severity: 1,
      title: t("Write your remaining messages"),
      body: t(
        "Meta approval takes a few hours, so submitting them now means they are ready when you activate.",
      ),
      cta: t("Continue setup"),
      target: { to: LOYALTY_PATHS.onboarding },
    });
  }

  if (templatesPending > 0) {
    out.push({
      id: "templates_pending",
      severity: 2,
      title: t("{count} messages are still waiting on Meta", { count: templatesPending }),
      body: t(
        "Inside a 24-hour chat the text still goes out; outside one nothing sends until Meta approves.",
      ),
      cta: t("Open Messages"),
      target: { to: LOYALTY_PATHS.messages, search: { tab: "templates" } },
    });
  }

  if (live && liveRewards.length === 0) {
    out.push({
      id: "no_rewards",
      severity: 2,
      title: t("There is nothing to redeem"),
      body: t("Customers can earn {points} but have nothing to aim at.", { points: pointsName }),
      cta: t("Open Program › Rewards"),
      target: { to: LOYALTY_PATHS.program, search: { section: "rewards" } },
    });
  }

  const affordability = dashboard?.rewardsAffordability;
  const members = dashboard?.metrics.totalMembers ?? 0;
  if (
    live &&
    affordability?.cheapestRewardCost &&
    affordability.membersBelowCheapestReward !== null &&
    members >= 20 &&
    affordability.membersBelowCheapestReward / members > 0.5
  ) {
    const target = giveback.pointsPerOrder ? roundNice(giveback.pointsPerOrder * 3) : null;
    out.push({
      id: "cheap_reward",
      severity: 2,
      title: target
        ? t("Add a reward under {cost}", { cost: formatPoints(target, pointsName) })
        : t("Add a cheaper reward"),
      body: t(
        "{below} of {members} members have fewer {points} than your cheapest reward ({cost}), so most of your program is invisible to them.",
        {
          below: affordability.membersBelowCheapestReward.toLocaleString(),
          members: members.toLocaleString(),
          points: pointsName,
          cost: formatPoints(affordability.cheapestRewardCost, pointsName),
        },
      ),
      cta: t("Open Program › Rewards"),
      target: { to: LOYALTY_PATHS.program, search: { section: "rewards" } },
    });
  }

  if (live && state.program?.tiersEnabled && members >= 50) {
    const tiers = (dashboard?.tierDistribution ?? []).filter((tier) => tier.id !== null);
    const top = [...tiers].sort((a, b) => (b.threshold ?? 0) - (a.threshold ?? 0))[0];
    if (top && top.threshold && top.value / members < 0.02) {
      out.push({
        id: "tiny_tier",
        severity: 3,
        title: t("{tier} has {count} members — lower the threshold", {
          tier: top.name,
          count: top.value,
        }),
        body: t(
          "At {threshold} lifetime spend, {tier} is out of reach for almost everyone. Around {suggested} would give more members something to climb towards.",
          {
            threshold: top.threshold.toLocaleString(),
            tier: top.name,
            suggested: roundNice(top.threshold * 0.55).toLocaleString(),
          },
        ),
        cta: t("Open Program › Tiers"),
        target: { to: LOYALTY_PATHS.program, search: { section: "tiers" } },
      });
    }
  }

  if (!live) {
    out.push({
      id: "print_qr",
      severity: 3,
      title: t("Print the join QR for the counter"),
      body: t(
        "Members join fastest from a card next to the till. The QR is ready before the program is.",
      ),
      cta: t("Open Settings"),
      target: { to: LOYALTY_PATHS.settings },
    });
  }

  return out.sort((a, b) => a.severity - b.severity).slice(0, MAX_SUGGESTIONS);
}
