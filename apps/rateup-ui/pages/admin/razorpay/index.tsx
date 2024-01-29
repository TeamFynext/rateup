import React from "react";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { Stack } from "@mantine/core";
import { useRouter } from "next/router";

const index = () => {
  const router = useRouter();

  return (
    <Stack style={{ maxWidth: " 300px" }}>
      <h1>RazorPay Dashboard</h1>

      <RateupButtonPrimary
        title="Manage Plans"
        size="md"
        onClick={() => router.push("/admin/razorpay/plans")}
      />

      <RateupButtonPrimary
        title="Manage Subscriptions"
        onClick={() => router.push("/admin/razorpay/subscriptions")}
        size="md"
      />
    </Stack>
  );
};

export default index;
