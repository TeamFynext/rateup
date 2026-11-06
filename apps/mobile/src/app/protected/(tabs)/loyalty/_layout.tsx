import { Stack } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSubscription } from "@/api/subscription/subscription.query";
import { PlanUpgradeRequired } from "@/components/common/PlanUpgradeRequired";
import { SubscriptionFeaturePathName } from "../../../../../enums";
import { hasFeature } from "@/utils/subscription";

/**
 * The loyalty tab's own stack, matching the `flows` and `inbox` groups.
 *
 * It is also where the plan gate sits. Loyalty is a Plus-and-above capability: the server
 * refuses every route under `/api/loyalty` without `whatsapp.loyalty`
 * (see `loyalty.routes.ts`), and until now the app did not know that — the cashier screen
 * opened on a Free plan, every request came back 403, and the counter saw raw server text
 * with no idea what to do about it. Gating the whole stack rather than the one screen means
 * anything added to this tab later inherits it.
 *
 * The tab itself stays in the tab bar on purpose, mirroring the web: a feature nobody can
 * see is a feature nobody upgrades for.
 */
export default function LoyaltyLayout() {
  const { data: subscription, isPending } = useSubscription();

  // Judged only once the subscription has arrived. Testing an undefined subscription would
  // fail closed and flash the upgrade screen at paying customers on every cold start.
  if (
    !isPending &&
    subscription &&
    !hasFeature(subscription, SubscriptionFeaturePathName.WhatsappLoyalty)
  ) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PlanUpgradeRequired feature="Loyalty" />
      </SafeAreaView>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
