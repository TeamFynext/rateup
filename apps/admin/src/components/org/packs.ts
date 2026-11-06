import type { OrgUsage, PackKind } from "@/api/orgs.api";
import { formatNumber } from "@/lib/format";

/** Mirrors ADDONS in the API's subscription catalog. */
export const PACK_KINDS: Record<
  PackKind,
  { label: string; unit: string; unitsPerPack: number; validDays: number }
> = {
  ACTIVE_CONTACTS: {
    label: "Active contact pack",
    unit: "active contacts",
    unitsPerPack: 1_000,
    validDays: 30,
  },
  CAMPAIGN_CREDITS: {
    label: "Campaign credit pack",
    unit: "campaign credits",
    unitsPerPack: 10_000,
    validDays: 90,
  },
};

type Pack = OrgUsage["packs"][number];

/** What a pack adds: contacts for a contact pack, credits spent of granted for a credit pack. */
export function packAllowance(pack: Pack): string {
  const kind = PACK_KINDS[pack.kind];
  if (pack.kind === "CAMPAIGN_CREDITS") {
    const granted = pack.creditsGranted ?? pack.quantity * kind.unitsPerPack;
    return `${formatNumber(pack.creditsUsed)} of ${formatNumber(granted)} credits used`;
  }
  return `+${formatNumber(pack.quantity * kind.unitsPerPack)} ${kind.unit}`;
}
