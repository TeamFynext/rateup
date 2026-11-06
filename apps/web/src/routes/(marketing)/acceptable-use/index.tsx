import { createFileRoute } from "@tanstack/react-router";

import AcceptableUsePage from "@/components/HomePage/pages/Legal/AcceptableUse.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

export const Route = createFileRoute("/(marketing)/acceptable-use/")({
  component: AcceptableUse,
  head: () => buildPageHead("/acceptable-use"),
});

function AcceptableUse() {
  return (
    <Layout>
      <AcceptableUsePage />
    </Layout>
  );
}
