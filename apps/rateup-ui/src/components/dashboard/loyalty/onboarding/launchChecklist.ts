import type { TFunction } from "i18next";

import type { OnboardingState } from "@/backend/loyalty/onboarding.api";

import type { WizardStep } from "./wizardSteps.ts";

export type ChecklistStatus = "done" | "todo" | "optional";

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  status: ChecklistStatus;
  /** Where "Edit" goes. */
  step: WizardStep;
  /** Set when the fix lives outside the wizard — the button becomes a link there instead. */
  link?: "channels";
}

/**
 * What the Launch screen reads back before Activate. Pure, so the statuses are tested on
 * fixtures: "done" is something saved, "todo" blocks a sensible launch, "optional" is a
 * choice the merchant made (a flat programme) or can fix later (no channel yet).
 */
export function buildLaunchChecklist(
  state: OnboardingState,
  hasWhatsappChannel: boolean,
  t: TFunction,
): ChecklistItem[] {
  const { program, counts, saved } = state;
  const pointsName = program?.currencyName ?? t("Points");
  const vipRewards = saved.rewards.filter((r) => (r.availableForTiers ?? []).length > 0).length;

  return [
    {
      id: "profile",
      label: t("Venue & branding"),
      detail: program?.logoUrl
        ? t("{name}, logo and colour set", { name: program.name })
        : program
          ? t("{name} — no logo yet, the poster uses your colour", { name: program.name })
          : t("Not saved yet"),
      status: program ? "done" : "todo",
      step: "profile",
    },
    {
      id: "earning",
      label: t("Earning rule"),
      detail:
        counts.rules > 0
          ? t("Customers earn {points} on every purchase", { points: pointsName })
          : t("Nothing is earned yet"),
      status: counts.rules > 0 ? "done" : "todo",
      step: "earning",
    },
    {
      id: "tiers",
      label: t("Tiers"),
      detail: !program
        ? t("Not saved yet")
        : program.tiersEnabled
          ? counts.tiers >= 2
            ? t("{count} tiers, with a qualification window", { count: counts.tiers })
            : t("Tiers are on but none is saved above Member")
          : t("Off — one flat programme for everyone"),
      status: !program
        ? "todo"
        : program.tiersEnabled
          ? counts.tiers >= 2
            ? "done"
            : "todo"
          : "optional",
      step: "tiers",
    },
    {
      id: "rewards",
      label: t("Rewards"),
      detail:
        counts.rewards > 0
          ? vipRewards > 0
            ? t("{count} rewards, {vip} of them VIP-only", {
                count: counts.rewards,
                vip: vipRewards,
              })
            : t("{count} rewards for everyone", { count: counts.rewards })
          : t("Nothing to redeem yet"),
      status: counts.rewards > 0 ? "done" : "todo",
      step: "rewards",
    },
    {
      id: "messages",
      label: t("WhatsApp messages"),
      detail:
        counts.commands > 0
          ? t("{count} keyword replies, {triggers} notifications", {
              count: counts.commands,
              triggers: counts.triggers,
            })
          : t("No replies written yet"),
      status: counts.commands > 0 ? "done" : "todo",
      step: "messages",
    },
    {
      id: "channel",
      label: t("WhatsApp channel"),
      detail: hasWhatsappChannel
        ? t("Connected — the join QR opens a chat with your keyword ready to send")
        : t("Not connected — the join QR can only be made once a number is connected"),
      // Activation still goes ahead without it, but the poster cannot exist, so it is
      // flagged rather than left as a quiet optional.
      status: hasWhatsappChannel ? "done" : "todo",
      step: "messages",
      link: "channels",
    },
  ];
}
