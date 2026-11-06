import { createFileRoute } from "@tanstack/react-router";

import TermsOfServicePage from "@/components/HomePage/pages/TermsOfService/index.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/terms-of-service/")({
  component: TermsOfService,
  head: () => buildPageHead("/terms-of-service"),
});

function TermsOfService() {
  return (
    <Layout>
      <TermsOfServicePage />
    </Layout>
  );
}
