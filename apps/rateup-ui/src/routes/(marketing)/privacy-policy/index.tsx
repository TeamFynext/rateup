
import { createFileRoute } from "@tanstack/react-router";

import { pageMetadata } from "@/lib/metadata.ts";
import PrivacyPolicyPage from "@/components/HomePage/pages/PrivacyPolicy/index.tsx";
import HomePageFooter from "@/components/RateupHomePage/helpers/HomePageFooter.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";

export const Route = createFileRoute("/(marketing)/privacy-policy/")({
  component: PrivacyPolicy,
  head: () => ({
    meta: [pageMetadata["/privacy-policy"]],
  }),
});


function PrivacyPolicy() {
  return (
    <Layout>
      <PrivacyPolicyPage />
      <HomePageFooter />
    </Layout>
  );
}
