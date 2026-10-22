import { createFileRoute } from "@tanstack/react-router";

import RefundPolicyPage from "@/components/HomePage/pages/Legal/RefundPolicy.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/refund-policy/")({
  component: RefundPolicy,
  head: () => buildPageHead("/refund-policy"),
});

function RefundPolicy() {
  return (
    <Layout>
      <RefundPolicyPage />
    </Layout>
  );
}
