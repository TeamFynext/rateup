import React from "react";
import { Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Sparkles } from "lucide-react-native";

import { getInboxRowTheme } from "@/constants/inboxDesign";
import type { AccessDenialReason } from "@/utils/subscription";

/**
 * Shown in place of a screen the org has no subscription for.
 *
 * The mobile counterpart of the web's `plan-upgrade-required.tsx`, and deliberately not a
 * copy of it. The web ends at a button to `/dashboard/settings/billing`; this screen states
 * the situation and stops there. Nobody buys a plan from the till — the person holding this
 * phone is usually a cashier, not the person who pays — so a call to action here would be
 * aimed at someone who cannot act on it. Plans are handled on the web dashboard by whoever
 * owns the account.
 *
 * It still distinguishes the two refusals the server distinguishes (`AccessDenialReason`):
 * a subscription that never covered this, and one that has run out.
 */
export function PlanUpgradeRequired({
  feature,
  reason = "subscription",
}: Readonly<{
  /** What was being reached, e.g. "Loyalty". Named in the heading. */
  feature?: string;
  reason?: AccessDenialReason;
}>) {
  const { colorScheme } = useColorScheme();
  const t = getInboxRowTheme(colorScheme === "dark");

  const expired = reason === "subscription_expired";

  const heading = expired
    ? "This subscription has ended"
    : feature
      ? `No subscription for ${feature}`
      : "No subscription";

  const body = expired
    ? "Nothing has been lost — the data is exactly where it was left. The subscription needs renewing before this can be used again."
    : feature
      ? `This account's plan does not include ${feature}.`
      : "This account's plan does not include this feature.";

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        paddingHorizontal: 24,
        backgroundColor: t.pageBg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Sparkles size={28} color={t.warm} />
        <Text
          style={{
            fontFamily: "InstrumentSans_600SemiBold",
            fontSize: 20,
            color: t.fg1,
            flexShrink: 1,
          }}
        >
          {heading}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: "InstrumentSans_400Regular",
          fontSize: 15,
          lineHeight: 22,
          textAlign: "center",
          color: t.fg3,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
