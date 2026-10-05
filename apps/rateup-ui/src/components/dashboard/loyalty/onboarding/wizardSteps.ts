import {
  IconBrandWhatsapp,
  IconBuildingStore,
  IconCoins,
  IconCrown,
  IconGift,
  IconRocket,
  type Icon,
} from "@tabler/icons-react";

import { WIZARD_STEP_IDS, type WizardStep } from "./wizardStepIds.ts";

export const WIZARD_STEPS = WIZARD_STEP_IDS;
export type { WizardStep };

/** The three brand accents a step may wear. Mapped to classes in one place: `StepIconChip`. */
export type StepTone = "blue" | "amber" | "green";

export interface StepMeta {
  icon: Icon;
  /** Rough time to finish, shown as a chip so the whole wizard reads as a ten-minute job. */
  minutes: number;
  tone: StepTone;
}

/**
 * Icon, estimated time and accent per step. Labels stay with the page so they go through
 * `t()` there; this is the part that never changes with locale.
 */
export const STEP_META: Record<WizardStep, StepMeta> = {
  profile: { icon: IconBuildingStore, minutes: 2, tone: "blue" },
  earning: { icon: IconCoins, minutes: 1, tone: "blue" },
  tiers: { icon: IconCrown, minutes: 1, tone: "amber" },
  rewards: { icon: IconGift, minutes: 3, tone: "blue" },
  messages: { icon: IconBrandWhatsapp, minutes: 2, tone: "green" },
  launch: { icon: IconRocket, minutes: 1, tone: "blue" },
};
