import { createFileRoute } from "@tanstack/react-router";

import PrivacyPolicyPage from "@/components/HomePage/pages/PrivacyPolicy/index.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/privacy-policy/")({
  component: PrivacyPolicy,
  head: () => buildPageHead("/privacy-policy"),
});

function PrivacyPolicy() {
  return (
    <Layout>
      <PrivacyPolicyPage />
    </Layout>
  );
}
