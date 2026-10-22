import { createFileRoute } from "@tanstack/react-router";

import SubprocessorsPage from "@/components/HomePage/pages/Legal/Subprocessors.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/subprocessors/")({
  component: Subprocessors,
  head: () => buildPageHead("/subprocessors"),
});

function Subprocessors() {
  return (
    <Layout>
      <SubprocessorsPage />
    </Layout>
  );
}
