import { Stack } from "@mantine/core";
import { RateupButtonPrimary } from "../../components/Button/RateupButtons";
import { useRouter } from "next/router";

export default function Page() {
  const router = useRouter();

  return (
    <Stack style={{ maxWidth: " 300px" }}>
      <h1>Admin Dashboard</h1>

      <RateupButtonPrimary
        title="Manage User Access"
        onClick={() => router.push("/admin/subscriptions")}
        size="md"
      />

      <RateupButtonPrimary
        title="Manage Razorpay Plans"
        size="md"
        onClick={() => router.push("/admin/razorpay")}
      />
    </Stack>
  );
}
