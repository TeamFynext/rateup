// The loyalty section's sidebar rows, as data for the shared app sidebar.
//
// Eleven entries. Program and Rewards define the programme; the others run it, named after
// what the owner or staff came to do. The badges carry the things that need chasing — pending
// approvals, Meta template reviews, an unfinished feedback flow — plus the member count.

import {
  IconClock,
  IconDashboard,
  IconGift,
  IconLogs,
  IconMessage,
  IconMessageStar,
  IconPrinter,
  IconSettings,
  IconShoppingCart,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";

import type { NavEntry } from "@/components/Layout/Navbar/hooks.tsx";

import { LOYALTY_PATHS } from "./paths.ts";
import type { ProgramState } from "./program/programState.ts";

export interface LoyaltyNavInput {
  /** Passed in rather than hooked: this builds data, so it is not a component. */
  t: TFunction;
  /** Null while the state has not loaded, or the org has no programme yet. */
  programState: ProgramState | null;
  members?: number;
  pendingApprovals?: number;
  templatesPending?: number;
  /**
   * Where the feedback flow stands: "draft" until it is submitted to Meta, "pending" while
   * Meta reviews the template, "live" once it can send. Null with no flow.
   */
  feedbackState?: "draft" | "pending" | "live" | null;
  /** Highlights Program while the wizard or a full editor is open. */
  pathname?: string;
}

export function buildLoyaltyNavItems({
  t,
  programState,
  members,
  pendingApprovals,
  templatesPending,
  feedbackState,
  pathname,
}: LoyaltyNavInput): NavEntry[] {
  const badge =
    programState === "live"
      ? { badge: t("Live"), badgeTone: "success" as const }
      : programState === "paused"
        ? { badge: t("Paused"), badgeTone: "warning" as const }
        : programState === "draft"
          ? { badge: t("Draft"), badgeTone: "neutral" as const }
          : {};

  const inProgramEditors =
    pathname?.startsWith(LOYALTY_PATHS.onboarding) ||
    pathname?.startsWith(LOYALTY_PATHS.programAdvanced);

  return [
    { title: t("Overview"), url: LOYALTY_PATHS.overview, icon: IconDashboard },
    { title: t("Cashier"), url: LOYALTY_PATHS.cashier, icon: IconShoppingCart },
    { title: t("Customers"), url: LOYALTY_PATHS.customers, icon: IconUsers, count: members },
    {
      title: t("Program"),
      url: LOYALTY_PATHS.program,
      icon: IconStar,
      ...badge,
      ...(inProgramEditors ? { isActive: true } : {}),
    },
    { title: t("Rewards"), url: LOYALTY_PATHS.rewards, icon: IconGift },
    { title: t("Activity"), url: LOYALTY_PATHS.activity, icon: IconLogs, count: pendingApprovals },
    // Messages carries the template library as a tab, so the Meta reviews are chased there.
    {
      title: t("Messages"),
      url: LOYALTY_PATHS.messages,
      icon: IconMessage,
      count: templatesPending,
    },
    // Beside Messages, because the two halves of one message: Messages is what it says,
    // Reminders is when it goes. Everything with a schedule to set lives here — birthdays,
    // anniversaries, a quiet member, points and rewards about to lapse, VIP at risk.
    {
      title: t("Reminders"),
      url: LOYALTY_PATHS.reminders,
      icon: IconClock,
    },
    // A feedback flow that exists but cannot send yet is the one loyalty step that is easy
    // to forget about; the chip says which half is outstanding.
    {
      title: t("Feedback"),
      url: LOYALTY_PATHS.feedback,
      icon: IconMessageStar,
      ...(feedbackState === "draft"
        ? { badge: t("Draft"), badgeTone: "neutral" as const }
        : feedbackState === "pending"
          ? { badge: t("Awaiting Meta"), badgeTone: "warning" as const }
          : {}),
    },
    // What goes on the counter and the table: the join QR card and the rewards brochure.
    { title: t("Materials"), url: LOYALTY_PATHS.materials, icon: IconPrinter },
    { title: t("Settings"), url: LOYALTY_PATHS.settings, icon: IconSettings },
  ];
}
