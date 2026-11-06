import { createFileRoute } from "@tanstack/react-router";

import DpaPage from "@/components/HomePage/pages/Legal/Dpa.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/dpa/")({
  component: Dpa,
  head: () => buildPageHead("/dpa"),
});

function Dpa() {
  return (
    <Layout>
      <DpaPage />
    </Layout>
  );
}
