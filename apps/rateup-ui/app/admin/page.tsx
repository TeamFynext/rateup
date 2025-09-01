"use client";

import { useRouter } from "next/navigation";

import { Stack } from "@mantine/core";
import { useTranslations } from "next-intl";

import { RateupButtonPrimary } from "../../components/Button/RateupButtons";

export default function Page() {
  const router = useRouter();
  const translations = useTranslations();
  return (
    <Stack style={{ maxWidth: " 300px" }}>
      <h1>{translations("Admin Dashboard")}</h1>

      <RateupButtonPrimary
        title={translations("Manage User Access")}
        onClick={() => router.push("/admin/subscriptions")}
        size="md"
      />

      <RateupButtonPrimary
        title={translations("Manage Razorpay Plans")}
        size="md"
        onClick={() => router.push("/admin/razorpay")}
      />
    </Stack>
  );
}
