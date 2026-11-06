import { useMemo, useState } from "react";

import type {
  LoyaltyPreset,
  LoyaltyPresetKey,
  OnboardingState,
} from "@/backend/loyalty/onboarding.api";
import { useLoyaltyOnboardingState, useLoyaltyPresets } from "@/backend/loyalty/onboarding.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { useUser } from "@/context/UserContext.tsx";

import { pickJoinKeyword, pickWhatsappNumber } from "../joinLink.ts";
import { buildGivebackContext, type GivebackContext } from "./givebackContext.ts";
import {
  buildEarningDefaults,
  buildMessagesDefaults,
  buildProfileDefaults,
  buildRewardsDefaults,
  buildSuggestedJoinText,
  buildVipTierDefaults,
} from "./programDefaults.ts";
import type {
  EarningFormInput,
  MessagesFormInput,
  ProfileFormInput,
  RewardsFormInput,
  VipTierFormInput,
} from "./schemas.ts";
import { findVipTier } from "./vipTier.ts";

export interface ProgramEditorData {
  state: OnboardingState;
  /**
   * The starter pack in play: what the wizard's profile step has picked, else what the
   * programme was saved with, else the server's guess from the org's industry.
   */
  preset: LoyaltyPreset;
  /** Every pack, for the profile step's "what kind of business" picker. */
  presets: LoyaltyPreset[];
  selectedPresetKey: LoyaltyPresetKey;
  /** Pick a pack before the profile is saved; the save writes it to the programme. */
  selectPreset: (key: LoyaltyPresetKey) => void;
  /** The whole programme's giveback input, assembled once. */
  giveback: GivebackContext;
  currencySymbol: string;
  pointsName: string;
  hasWhatsappChannel: boolean;
  /** Digits of the connected WhatsApp number the join QR opens; null until one is connected. */
  whatsappNumber: string | null;
  /** The keyword the QR pre-types — the saved "joining" reply's trigger word. */
  joinKeyword: string;
  /** The saved top tier the VIP-only starter rewards are gated on, once the tiers step has run. */
  vipTier: { id: string; name: string; color: string } | undefined;
  /** Every saved tier above the base, lowest first — one reward band each. Empty when tiers are off. */
  upperTiers: Array<{ id: string; name: string; color: string; threshold: number }>;
  /** The welcome reply as the current earning rules and rewards would write it. */
  suggestedJoinText: string;
  /** Per event type, what the dispatcher fills `{{1}}`, `{{2}}` … with, in order. */
  eventParams: Record<string, readonly string[]>;
  defaults: {
    profile: ProfileFormInput;
    earning: EarningFormInput;
    tiers: VipTierFormInput;
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
  const { user } = useUser();

  // Local until the profile step saves it; then `state.presetKey` carries the same value.
  const [presetKeyOverride, setPresetKeyOverride] = useState<LoyaltyPresetKey | null>(null);

  const presets = presetData?.presets ?? [];
  const selectedKey: LoyaltyPresetKey =
    presetKeyOverride ?? state?.presetKey ?? presetData?.suggestedPresetKey ?? "generic";
  const preset = presets.find((p) => p.key === selectedKey) ?? presets[0];

  // Only the fields the profile step prefills from — a narrower dependency than `user`,
  // whose reference changes with presence and websocket traffic.
  const orgName = user?.orgName;
  const orgPhone = user?.orgPhone;
  const orgLogoKey = user?.orgLogo;
  const userName = user?.userName;
  const email = user?.email;

  const data = useMemo<ProgramEditorData | null>(() => {
    if (!state || !preset) return null;
    const program = state.program;
    const vip = program?.tiersEnabled ? findVipTier(state.saved.tiers) : undefined;
    const upperTiers = program?.tiersEnabled
      ? state.saved.tiers
          .filter((tier) => Number(tier.threshold) > 0)
          .map((tier) => ({
            id: tier.id,
            name: tier.name,
            color: tier.color,
            threshold: Number(tier.threshold),
          }))
          .sort((a, b) => a.threshold - b.threshold)
      : [];
    return {
      state,
      preset,
      presets,
      selectedPresetKey: selectedKey,
      selectPreset: setPresetKeyOverride,
      giveback: buildGivebackContext(state, preset),
      currencySymbol: program?.currencySymbol ?? "₹",
      pointsName: program?.currencyName ?? preset.basics.currencyName,
      hasWhatsappChannel: Boolean(waSettings?.length),
      whatsappNumber: pickWhatsappNumber(waSettings, program?.whatsappSettingsId),
      joinKeyword: pickJoinKeyword(state.saved.commands, preset.commands),
      vipTier: vip ? { id: vip.id, name: vip.name, color: vip.color } : undefined,
      upperTiers,
      suggestedJoinText: buildSuggestedJoinText(state, preset),
      eventParams: Object.fromEntries(
        preset.eventTemplates.map((template) => [template.eventType, template.params]),
      ),
      defaults: {
        profile: buildProfileDefaults(state, preset, {
          orgName,
          orgPhone,
          orgLogoKey,
          userName,
          email,
        }),
        earning: buildEarningDefaults(state, preset),
        tiers: buildVipTierDefaults(state, preset),
        rewards: buildRewardsDefaults(state, preset, vip?.id),
        messages: buildMessagesDefaults(state, preset),
      },
    };
  }, [
    state,
    preset,
    presets,
    selectedKey,
    waSettings,
    orgName,
    orgPhone,
    orgLogoKey,
    userName,
    email,
  ]);

  return { data, isLoading: presetsLoading || stateLoading };
}
