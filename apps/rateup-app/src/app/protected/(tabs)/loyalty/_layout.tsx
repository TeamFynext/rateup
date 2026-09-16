import { Stack } from "expo-router";
import React from "react";

/** The loyalty tab's own stack, matching the `flows` and `inbox` groups. */
export default function LoyaltyLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
