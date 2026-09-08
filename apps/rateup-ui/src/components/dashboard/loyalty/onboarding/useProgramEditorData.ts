import { useMemo, useState } from "react";

import type {
  LoyaltyPreset,
  LoyaltyPresetKey,
  OnboardingState,
} from "@/backend/loyalty/onboarding.api";
import { useLoyaltyOnboardingState, useLoyaltyPresets } from "@/backend/loyalty/onboarding.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";

import { buildGivebackContext, type GivebackContext } from "./givebackContext.ts";
import {
  buildBasicsDefaults,
  buildEarningDefaults,
  buildMessagesDefaults,
  buildRewardsDefaults,
  buildSuggestedJoinText,
  buildTiersDefaults,
} from "./programDefaults.ts";
import type {
  BasicsFormInput,
  EarningFormInput,
  MessagesFormInput,
  RewardsFormInput,
  TiersFormInput,
} from "./schemas.ts";

export interface ProgramEditorData {
  state: OnboardingState;
  preset: LoyaltyPreset;
  presets: LoyaltyPreset[];
  selectedKey: LoyaltyPresetKey;
  setPresetKeyOverride: (key: LoyaltyPresetKey) => void;
  /** The whole programme's giveback input, assembled once. */
  giveback: GivebackContext;
  currencySymbol: string;
  pointsName: string;
  hasWhatsappChannel: boolean;
  /** The welcome reply as the current earning rules and rewards would write it. */
  suggestedJoinText: string;
  /** Per event type, what the dispatcher fills `{{1}}`, `{{2}}` … with, in order. */
  eventParams: Record<string, readonly string[]>;
  defaults: {
    basics: BasicsFormInput;
    earning: EarningFormInput;
    tiers: TiersFormInput;
    rewards: RewardsFormInput;
    messages: MessagesFormInput;
  };
}

/**
 * Everything the step forms need, for the wizard and for the Program page alike.
 *
 * `state` and `preset` are stable react-query references between refetches, so the memos
 * survive the re-renders a keystroke causes — which is what keeps the giveback panels'
 * own memos from recomputing on every character typed.
 */
export function useProgramEditorData(): { data: ProgramEditorData | null; isLoading: boolean } {
  const { data: presetData, isLoading: presetsLoading } = useLoyaltyPresets();
  const { data: state, isLoading: stateLoading } = useLoyaltyOnboardingState();
  const { data: waSettings } = useWaSettings();
  const [presetKeyOverride, setPresetKeyOverride] = useState<LoyaltyPresetKey | null>(null);

  const presets = presetData?.presets ?? [];
  const selectedKey: LoyaltyPresetKey =
    presetKeyOverride ?? state?.presetKey ?? presetData?.suggestedPresetKey ?? "generic";
  const preset = presets.find((p) => p.key === selectedKey) ?? presets[0];

  const data = useMemo<ProgramEditorData | null>(() => {
    if (!state || !preset) return null;
    const program = state.program;
    return {
      state,
      preset,
      presets,
      selectedKey,
      setPresetKeyOverride,
      giveback: buildGivebackContext(state, preset),
      currencySymbol: program?.currencySymbol ?? "₹",
      pointsName: program?.currencyName ?? preset.basics.currencyName,
      hasWhatsappChannel: Boolean(waSettings?.length),
      suggestedJoinText: buildSuggestedJoinText(state, preset),
      eventParams: Object.fromEntries(
        preset.eventTemplates.map((template) => [template.eventType, template.params]),
      ),
      defaults: {
        basics: buildBasicsDefaults(state, preset),
        earning: buildEarningDefaults(state, preset),
        tiers: buildTiersDefaults(state, preset),
        rewards: buildRewardsDefaults(state, preset),
        messages: buildMessagesDefaults(state, preset),
      },
    };
  }, [state, preset, presets, selectedKey, waSettings]);

  return { data, isLoading: presetsLoading || stateLoading };
}
